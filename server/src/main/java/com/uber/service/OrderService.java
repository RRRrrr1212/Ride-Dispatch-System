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
 * // BUG_FIX_2024_001: 修復訂單狀態轉換併發問題，使用 ReentrantLock 確保 accept 操作的原子性
 * // BUG_FIX_2024_002: 修復距離計算精度問題，改用更精確的地理距離算法
 * // TODO_PERF_001: 優化批量訂單處理性能，考慮引入異步處理機制
 * // FIXME_ARCH_001: OrderService 類別過於複雜，需要重構拆分為多個專門服務
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final DriverRepository driverRepository;
    private final AuditService auditService;
    private final FareService fareService;
    
    // 用於 accept 操作的鎖
    private final ReentrantLock acceptLock = new ReentrantLock();
    
    /**
     * 建立叫車請求
     * 
     * 自動配對：訂單建立時會自動找到最近的司機並指派給他
     */
    public Order createOrder(String passengerId, Location pickup, 
                            Location dropoff, VehicleType vehicleType) {
        // 驗證上下車點不可相同
        if (pickup.getX() == dropoff.getX() && pickup.getY() == dropoff.getY()) {
            throw new BusinessException("INVALID_REQUEST", "上車地點與下車地點不可相同");
        }
        
        double distance = pickup.distanceTo(dropoff);
        double estimatedFare = fareService.calculateEstimatedFare(vehicleType, distance);
        
        // 自動配對：找到最近的可用司機
        String assignedDriverId = findBestDriverId(pickup, vehicleType);
        if (assignedDriverId != null) {
            log.info("Order auto-assigned to driver: {}", assignedDriverId);
        } else {
            log.warn("No available driver found for order with vehicleType: {}", vehicleType);
        }
        
        Order order = Order.builder()
                .orderId(UUID.randomUUID().toString())
                .passengerId(passengerId)
                .status(OrderStatus.PENDING)
                .vehicleType(vehicleType)
                .pickupLocation(pickup)
                .dropoffLocation(dropoff)
                .estimatedFare(estimatedFare)
                .distance(distance)
                .assignedDriverId(assignedDriverId)  // 設定指派的司機
                .createdAt(Instant.now())
                .build();
        
        orderRepository.save(order);
        
        auditService.logSuccess(order.getOrderId(), "CREATE", "PASSENGER", 
                passengerId, null, "PENDING");
        
        log.info("Order created: {} (assigned to: {})", order.getOrderId(), assignedDriverId);
        return enrichOrder(order);
    }
    
    /**
     * 找到最佳匹配司機（最近且可用的司機）
     * 
     * @return 最佳司機 ID，若無則返回 null
     */
    private String findBestDriverId(Location pickupLocation, VehicleType requiredType) {
        return driverRepository.findAll().stream()
                // 篩選條件: ONLINE 且非 Busy
                .filter(driver -> driver.getStatus() == DriverStatus.ONLINE)
                .filter(driver -> !driver.isBusy())
                // 篩選車種
                .filter(driver -> driver.getVehicleType() == requiredType)
                // 檢查是否有位置資訊
                .filter(driver -> driver.getLocation() != null)
                // 按距離排序
                .min((d1, d2) -> {
                    double dist1 = d1.getLocation().distanceTo(pickupLocation);
                    double dist2 = d2.getLocation().distanceTo(pickupLocation);
                    int cmp = Double.compare(dist1, dist2);
                    return cmp != 0 ? cmp : d1.getDriverId().compareTo(d2.getDriverId());
                })
                .map(Driver::getDriverId)
                .orElse(null);
    }
    
    /**
     * 司機接單
     * // BUG_FIX_2024_003: 修復多個司機同時接單導致的競態條件問題
     * // TODO_SECURITY_001: 增加司機接單權限驗證，防止未授權的接單操作
     * 
     * 使用 ReentrantLock 確保同一時間只有一位司機能成功接單 (H2: 併發安全)
     */
    public Order acceptOrder(String orderId, String driverId) {
        // BUG_FIX_2024_001: 使用 ReentrantLock 防止併發接單問題
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
            
            // 檢查是否為被指派的司機 (獨佔派單)
            if (order.getAssignedDriverId() != null && !driverId.equals(order.getAssignedDriverId())) {
                auditService.logFailure(orderId, "ACCEPT", "DRIVER", 
                        driverId, "PENDING", "NOT_ASSIGNED_DRIVER");
                throw new BusinessException("NOT_ASSIGNED_DRIVER", "此訂單未指派給您", 403);
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
            return order;
            
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
        return order;
    }
    
    /**
     * 完成行程 (使用實際時間計算 duration)
     */
    public Order completeTrip(String orderId, String driverId) {
        return completeTrip(orderId, driverId, null);
    }
    
    /**
     * 完成行程 (支援模擬時間)
     * 
     * @param orderId 訂單 ID
     * @param driverId 司機 ID
     * @param simulatedDuration 前端傳入的模擬行程時間（分鐘），若為 null 則使用實際時間
     */
    public Order completeTrip(String orderId, String driverId, Integer simulatedDuration) {
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
        
        // 計算行程時間：優先使用前端傳入的模擬時間，否則使用實際時間差
        Instant endTime = Instant.now();
        int duration;
        if (simulatedDuration != null && simulatedDuration > 0) {
            duration = simulatedDuration;
            log.info("Using simulated duration: {} minutes for order {}", duration, orderId);
        } else {
            Instant startTime = order.getStartedAt();
            duration = (int) ((endTime.toEpochMilli() - startTime.toEpochMilli()) / 60000);
            log.info("Using actual duration: {} minutes for order {}", duration, orderId);
        }
        // 確保至少為 1 分鐘
        duration = Math.max(1, duration);
        
        double fare = fareService.calculateFare(
                order.getVehicleType(), 
                order.getDistance(), 
                duration
        );
        
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(endTime);
        order.setDuration(duration);
        order.setActualFare(fare);
        orderRepository.save(order);
        
        // 釋放司機
        driverRepository.findById(driverId).ifPresent(driver -> {
            driver.setBusy(false);
            driver.setCurrentOrderId(null);
            driverRepository.save(driver);
        });
        
        auditService.logSuccess(orderId, "COMPLETE", "DRIVER", 
                driverId, "ONGOING", "COMPLETED");
        
        log.info("Trip completed for order {}, fare: {}", orderId, fare);
        return order;
    }
    
    /**
     * 司機拒絕訂單 (重新配對給下一個司機)
     * 
     * @param orderId 訂單 ID
     * @param driverId 拒絕的司機 ID
     * @return 更新後的訂單
     */
    public Order declineOrder(String orderId, String driverId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "訂單不存在"));
        
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessException("INVALID_STATE", "只有待接訂單可以拒絕");
        }
        
        // 確認是被指派的司機才能拒絕
        if (!driverId.equals(order.getAssignedDriverId())) {
            throw new BusinessException("NOT_ASSIGNED_DRIVER", "您不是此訂單的指派司機", 403);
        }
        
        // 找到下一個最近的可用司機 (排除拒絕的司機)
        String nextDriverId = findNextBestDriverId(order.getPickupLocation(), order.getVehicleType(), driverId);
        
        if (nextDriverId != null) {
            order.setAssignedDriverId(nextDriverId);
            log.info("Order {} reassigned from {} to {}", orderId, driverId, nextDriverId);
        } else {
            // 沒有其他可用司機，清除指派 (訂單將持續等待)
            order.setAssignedDriverId(null);
            log.warn("No other driver available for order {}, waiting for new drivers", orderId);
        }
        
        orderRepository.save(order);
        
        auditService.logSuccess(orderId, "DECLINE", "DRIVER", 
                driverId, "PENDING", "PENDING");
        
        return enrichOrder(order);
    }
    
    /**
     * 找到下一個最佳匹配司機（排除指定司機）
     */
    private String findNextBestDriverId(Location pickupLocation, VehicleType requiredType, String excludeDriverId) {
        return driverRepository.findAll().stream()
                .filter(driver -> driver.getStatus() == DriverStatus.ONLINE)
                .filter(driver -> !driver.isBusy())
                .filter(driver -> driver.getVehicleType() == requiredType)
                .filter(driver -> driver.getLocation() != null)
                .filter(driver -> !driver.getDriverId().equals(excludeDriverId)) // 排除拒絕的司機
                .min((d1, d2) -> {
                    double dist1 = d1.getLocation().distanceTo(pickupLocation);
                    double dist2 = d2.getLocation().distanceTo(pickupLocation);
                    int cmp = Double.compare(dist1, dist2);
                    return cmp != 0 ? cmp : d1.getDriverId().compareTo(d2.getDriverId());
                })
                .map(Driver::getDriverId)
                .orElse(null);
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
        
        // 驗證只有訂單擁有者可以取消
        if (!cancelledBy.equals(order.getPassengerId())) {
            throw new BusinessException("FORBIDDEN", "您無權取消此訂單", 403);
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
        return order;
    }
    
    /**
     * 查詢訂單
     */
    public Order getOrder(String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "訂單不存在"));
    }
    
    /**
     * 取得所有待派單訂單
     */
    public java.util.List<Order> getPendingOrders() {
        return orderRepository.findByStatus(OrderStatus.PENDING);
    }
    
    /**
     * 取得所有訂單
     */
    public java.util.List<Order> getAllOrders() {
        return orderRepository.findAll();
    }
    
    /**
     * 清理超時未接單的訂單
     */
    public int cleanupStaleOrders() {
        // 找出超過 5 分鐘未被接單的 PENDING 訂單
        Instant fiveMinutesAgo = Instant.now().minusSeconds(300);
        var staleOrders = orderRepository.findAll().stream()
                .filter(order -> order.getStatus() == OrderStatus.PENDING)
                .filter(order -> order.getCreatedAt().isBefore(fiveMinutesAgo))
                .toList();
        
        // 自動取消這些訂單
        for (Order order : staleOrders) {
            order.setStatus(OrderStatus.CANCELLED);
            order.setCancelledAt(Instant.now());
            order.setCancelledBy("SYSTEM");
            orderRepository.save(order);
            
            auditService.logSuccess(
                    order.getOrderId(),
                    "ORDER_AUTO_CANCELLED", 
                    "SYSTEM",
                    "SYSTEM",
                    "PENDING",
                    "CANCELLED"
            );
        }
        
        return staleOrders.size();
    }
}
