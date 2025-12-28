package com.uber.service;

import com.uber.exception.BusinessException;
import com.uber.model.*;
import com.uber.repository.DriverRepository;
import com.uber.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 訂單服務 - 核心業務邏輯
 * 
 * 重要：accept 操作使用 synchronized 確保併發安全 (H2)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final DriverRepository driverRepository;
    private final com.uber.repository.RiderRepository riderRepository;
    private final AuditService auditService;
    private final FareService fareService;
    
    // 用於 accept 操作的鎖
    private final ReentrantLock acceptLock = new ReentrantLock();
    
    /**
     * 建立叫車請求
     */
    public Order createOrder(String passengerId, Location pickup, 
                            Location dropoff, VehicleType vehicleType) {
        log.info("createOrder called with passengerId: '{}', pickup: {}, dropoff: {}", passengerId, pickup, dropoff);

        if (passengerId == null || passengerId.trim().isEmpty()) {
            log.error("Create order failed: passengerId is empty!");
            throw new BusinessException("INVALID_REQUEST", "乘客 ID 不可為空");
        }
        
        // 確保 Rider 存在於 Repository 中（用於 enrichOrder）
        // 如果不存在，從 passengerId 解析並自動建立
        if (!riderRepository.existsById(passengerId)) {
            // passengerId 格式: "rider-{phone}" 
            String phone = passengerId.startsWith("rider-") 
                ? passengerId.substring(6) 
                : passengerId;
            String defaultName = "乘客 " + phone.substring(Math.max(0, phone.length() - 4)); // 顯示末四碼
            
            com.uber.model.Rider rider = com.uber.model.Rider.builder()
                .riderId(passengerId)
                .name(defaultName)
                .phone(phone)
                .createdAt(java.time.Instant.now())
                .build();
            riderRepository.save(rider);
            log.info("Auto-created rider {} with name '{}'", passengerId, defaultName);
        }
        
        double distance = pickup.distanceTo(dropoff);
        double estimatedFare = fareService.calculateEstimatedFare(vehicleType, distance);
        
        Order order = Order.builder()
                .orderId(UUID.randomUUID().toString())
                .passengerId(passengerId)
                .status(OrderStatus.PENDING)
                .vehicleType(vehicleType)
                .pickupLocation(pickup)
                .dropoffLocation(dropoff)
                .estimatedFare(estimatedFare)
                .distance(distance)
                .createdAt(Instant.now())
                .build();
        
        orderRepository.save(order);
        
        auditService.logSuccess(order.getOrderId(), "CREATE", "PASSENGER", 
                passengerId, "NONE", "PENDING");
        
        log.info("Order created: {}", order.getOrderId());
        return enrichOrder(order);
    }
    
    /**
     * 接受訂單 (H2: 併發安全)
     * 
     * 使用 ReentrantLock 確保同一時間只有一位司機能成功接單
     */
    public Order acceptOrder(String orderId, String driverId) {
        acceptLock.lock();
        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "訂單不存在"));
            
            // H4: 冪等性 - 若同一司機已接此單，直接回傳成功
            if (order.getStatus() == OrderStatus.ACCEPTED && 
                driverId.equals(order.getDriverId())) {
                log.info("Idempotent accept - order already accepted by same driver");
                return order;
            }
            
            // 檢查狀態是否為 PENDING
            if (order.getStatus() != OrderStatus.PENDING) {
                String reason = order.getStatus() == OrderStatus.ACCEPTED 
                        ? "ORDER_ALREADY_ACCEPTED" : "INVALID_STATE";
                String message = order.getStatus() == OrderStatus.ACCEPTED 
                        ? "此訂單已被其他司機接受" : "訂單狀態不允許接單操作";
                
                auditService.logFailure(orderId, "ACCEPT", "DRIVER", 
                        driverId, order.getStatus().name(), reason);
                
                if (order.getStatus() == OrderStatus.ACCEPTED) {
                    throw new BusinessException(reason, message, 409);
                } else {
                    throw new BusinessException(reason, message);
                }
            }
            
            // 檢查司機狀態
            Driver driver = driverRepository.findById(driverId)
                    .orElseThrow(() -> new BusinessException("DRIVER_NOT_FOUND", "司機不存在"));
            
            if (driver.getStatus() != DriverStatus.ONLINE) {
                auditService.logFailure(orderId, "ACCEPT", "DRIVER", 
                        driverId, "PENDING", "DRIVER_OFFLINE");
                throw new BusinessException("DRIVER_OFFLINE", "司機不在線");
            }
            
            if (driver.isBusy()) {
                auditService.logFailure(orderId, "ACCEPT", "DRIVER", 
                        driverId, "PENDING", "DRIVER_BUSY");
                throw new BusinessException("DRIVER_BUSY", "司機正在忙碌");
            }

            // 檢查車種匹配 (修復: 菁英司機誤接尊榮訂單)
            if (driver.getVehicleType() != order.getVehicleType()) {
                 auditService.logFailure(orderId, "ACCEPT", "DRIVER", 
                        driverId, "PENDING", "VEHICLE_TYPE_MISMATCH");
                 throw new BusinessException("VEHICLE_TYPE_MISMATCH", "您的車種不符合此訂單需求");
            }
            
            // 執行接單
            order.setStatus(OrderStatus.ACCEPTED);
            order.setDriverId(driverId);
            order.setAcceptedAt(Instant.now());
            orderRepository.save(order);
            
            // 更新司機狀態
            driver.setBusy(true);
            driver.setCurrentOrderId(orderId);
            driverRepository.save(driver);
            
            auditService.logSuccess(orderId, "ACCEPT", "DRIVER", 
                    driverId, "PENDING", "ACCEPTED");
            
            
            log.info("Order {} accepted by driver {}", orderId, driverId);
            return enrichOrder(order);
            
        } finally {
            acceptLock.unlock();
        }
    }
    
    /**
     * 開始行程
     */
    public Order startTrip(String orderId, String driverId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "訂單不存在"));
        
        // H4: 冪等性
        if (order.getStatus() == OrderStatus.ONGOING) {
            return order;
        }
        
        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new BusinessException("INVALID_STATE", "訂單狀態不允許開始行程");
        }
        
        if (!driverId.equals(order.getDriverId())) {
            throw new BusinessException("NOT_ASSIGNED_DRIVER", "您不是此訂單的指派司機", 403);
        }
        
        order.setStatus(OrderStatus.ONGOING);
        order.setStartedAt(Instant.now());
        orderRepository.save(order);
        
        auditService.logSuccess(orderId, "START", "DRIVER", 
                driverId, "ACCEPTED", "ONGOING");
        
        log.info("Trip started for order {}", orderId);
        return enrichOrder(order);
    }
    
    /**
     * 完成行程
     */
    public Order completeTrip(String orderId, String driverId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "訂單不存在"));
        
        // H4: 冪等性
        if (order.getStatus() == OrderStatus.COMPLETED) {
            return order;
        }
        
        if (order.getStatus() != OrderStatus.ONGOING) {
            throw new BusinessException("INVALID_STATE", "訂單狀態不允許完成行程");
        }
        
        if (!driverId.equals(order.getDriverId())) {
            throw new BusinessException("NOT_ASSIGNED_DRIVER", "您不是此訂單的指派司機", 403);
        }
        
        // 計算實際車資
        Instant startTime = order.getStartedAt();
        Instant endTime = Instant.now();
        int duration = (int) ((endTime.toEpochMilli() - startTime.toEpochMilli()) / 60000);
        
        double fare = fareService.calculateFare(
                order.getVehicleType(), 
                order.getDistance(), 
                duration
        );
        
        // 計算司機收入（扣除 20% 平台抽成）
        double driverEarnings = Math.round(fare * 0.8 * 100.0) / 100.0;
        
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(endTime);
        order.setDuration(duration);
        order.setActualFare(fare);
        order.setDriverEarnings(driverEarnings);
        orderRepository.save(order);
        
        // 釋放司機
        driverRepository.findById(driverId).ifPresent(driver -> {
            driver.setBusy(false);
            driver.setCurrentOrderId(null);
            driverRepository.save(driver);
        });
        
        // 修正: 行程結束後，強制更新乘客位置為下車地點
        // (解決乘客端未回傳座標導致後台位置滯留的問題)
        if (order.getPassengerId() != null) {
            riderRepository.findById(order.getPassengerId()).ifPresent(rider -> {
                rider.setLocation(order.getDropoffLocation());
                riderRepository.save(rider);
                log.info("Rider {} location updated to dropoff point upon trip completion", rider.getRiderId());
            });
        }
        
        auditService.logSuccess(orderId, "COMPLETE", "DRIVER", 
                driverId, "ONGOING", "COMPLETED");
        
        log.info("Trip completed for order {}, fare: {}, driver earnings: {}", orderId, fare, driverEarnings);
        return enrichOrder(order);
    }
    
    /**
     * 取消訂單
     */
    public Order cancelOrder(String orderId, String cancelledBy) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "訂單不存在"));
        
        // H4: 冪等性
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return order;
        }
        
        if (order.getStatus() != OrderStatus.PENDING && 
            order.getStatus() != OrderStatus.ACCEPTED) {
            throw new BusinessException("INVALID_STATE", "此訂單狀態無法取消");
        }
        
        String previousState = order.getStatus().name();
        double cancelFee = 0;
        
        // 已接單取消需計算取消費
        if (order.getStatus() == OrderStatus.ACCEPTED) {
            cancelFee = fareService.getCancelFee(order.getVehicleType());
            
            // 釋放司機
            if (order.getDriverId() != null) {
                driverRepository.findById(order.getDriverId()).ifPresent(driver -> {
                    driver.setBusy(false);
                    driver.setCurrentOrderId(null);
                    driverRepository.save(driver);
                });
            }
        }
        
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(Instant.now());
        order.setCancelledBy(cancelledBy);
        order.setCancelFee(cancelFee);
        orderRepository.save(order);
        
        auditService.logSuccess(orderId, "CANCEL", "PASSENGER", 
                cancelledBy, previousState, "CANCELLED");
        
        log.info("Order {} cancelled", orderId);
        return enrichOrder(order);
    }
    
    /**
     * 查詢訂單
     */
    public Order getOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "訂單不存在"));
        return enrichOrder(order);
    }

    /**
     * 填充額外資訊 (乘客/司機資料)
     */
    public Order enrichOrder(Order order) {
        if (order == null) return null;
        
        // 填充乘客姓名
        if (order.getPassengerId() != null) {
            riderRepository.findById(order.getPassengerId())
                .ifPresent(rider -> order.setRiderName(rider.getName()));
        }
        
        // 填充司機資訊
        if (order.getDriverId() != null) {
            driverRepository.findById(order.getDriverId()).ifPresent(driver -> {
                order.setDriverName(driver.getName());
                order.setVehiclePlate(driver.getVehiclePlate());
            });
        }
        
        return order;
    }
    
    /**
     * 取得所有待派單訂單
     */
    public java.util.List<Order> getPendingOrders() {
        return orderRepository.findByStatus(OrderStatus.PENDING).stream()
                .map(this::enrichOrder)
                .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * 取得所有訂單
     */
    public java.util.List<Order> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::enrichOrder)
                .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * 更新訂單 (用於更新路徑等資料)
     */
    public void updateOrder(Order order) {
        orderRepository.save(order);
    }
    
    /**
     * 清理超時訂單 (由排程任務呼叫)
     * 
     * 規則：
     * - PENDING 超過 10 分鐘 -> 自動取消
     * - ACCEPTED 超過 15 分鐘沒開始 -> 自動取消
     * - ONGOING 超過 60 分鐘沒完成 -> 自動取消
     * 
     * @return 被清理的訂單數量
     */
    public int cleanupStaleOrders() {
        Instant now = Instant.now();
        int cleanedCount = 0;
        
        for (Order order : orderRepository.findAll()) {
            boolean shouldCancel = false;
            String reason = "";
            
            switch (order.getStatus()) {
                case PENDING:
                    // 10 分鐘沒被接單
                    if (order.getCreatedAt() != null && 
                        order.getCreatedAt().plusSeconds(10 * 60).isBefore(now)) {
                        shouldCancel = true;
                        reason = "系統自動取消：超過10分鐘未有司機接單";
                    }
                    break;
                    
                case ACCEPTED:
                    // 15 分鐘沒開始行程
                    if (order.getAcceptedAt() != null && 
                        order.getAcceptedAt().plusSeconds(15 * 60).isBefore(now)) {
                        shouldCancel = true;
                        reason = "系統自動取消：司機接單後超過15分鐘未開始行程";
                        
                        // 釋放司機
                        releaseDriver(order.getDriverId());
                    }
                    break;
                    
                case ONGOING:
                    // 60 分鐘沒完成 (異常長的行程)
                    if (order.getStartedAt() != null && 
                        order.getStartedAt().plusSeconds(60 * 60).isBefore(now)) {
                        shouldCancel = true;
                        reason = "系統自動取消：行程超過60分鐘未完成，可能異常";
                        
                        // 釋放司機
                        releaseDriver(order.getDriverId());
                    }
                    break;
                    
                default:
                    // COMPLETED 或 CANCELLED 不處理
                    break;
            }
            
            if (shouldCancel) {
                order.setStatus(OrderStatus.CANCELLED);
                order.setCancelledAt(now);
                order.setCancelledBy("SYSTEM");
                order.setCancelFee(0.0); // 系統取消不收費
                orderRepository.save(order);
                
                log.info("自動取消超時訂單: {} - {}", order.getOrderId(), reason);
                auditService.logSuccess(order.getOrderId(), "AUTO_CANCEL", "SYSTEM", "SYSTEM", order.getStatus().name(), "CANCELLED");
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            log.info("本次清理了 {} 筆超時訂單", cleanedCount);
        }
        
        return cleanedCount;
    }
    
    /**
     * 釋放司機 (取消訂單時呼叫)
     */
    private void releaseDriver(String driverId) {
        if (driverId == null) return;
        
        try {
            Driver driver = driverRepository.findById(driverId).orElse(null);
            if (driver != null) {
                driver.setStatus(DriverStatus.ONLINE);
                driver.setCurrentOrderId(null);
                driverRepository.save(driver);
            }
        } catch (Exception e) {
            log.warn("釋放司機失敗: {}", driverId, e);
        }
    }
}
