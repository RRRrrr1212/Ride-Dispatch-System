package com.uber.controller;

import com.uber.dto.ApiResponse;
import com.uber.model.*;
import com.uber.repository.*;
import com.uber.service.AuditService;
import com.uber.service.DriverService;
import com.uber.service.FareService;
import com.uber.service.OrderService;
import com.uber.service.PassengerService;
import com.uber.service.RiderService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 管理員 API Controller
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    
    private final OrderService orderService;
    private final DriverService driverService;
    private final PassengerService passengerService;
    private final RiderService riderService;
    private final AuditService auditService;
    private final FareService fareService;
    private final OrderRepository orderRepository;
    private final DriverRepository driverRepository;
    private final AuditLogRepository auditLogRepository;
    private final RiderRepository riderRepository;
    
    /**
     * 取得所有訂單 (支援分頁和狀態篩選)
     */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String passengerId,
            @RequestParam(required = false) String driverId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        List<Order> orders = orderService.getAllOrders();
        
        // 默認按時間倒序排列 (最新的在前)
        orders.sort((o1, o2) -> {
            if (o1.getCreatedAt() == null) return 1;
            if (o2.getCreatedAt() == null) return -1;
            return o2.getCreatedAt().compareTo(o1.getCreatedAt());
        });
        
        // 狀態篩選
        if (status != null && !status.isEmpty()) {
            try {
                OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
                orders = orders.stream()
                        .filter(o -> o.getStatus() == orderStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                // 無效的狀態參數，忽略篩選
            }
        }

        // 乘客 ID 篩選
        if (passengerId != null && !passengerId.isEmpty()) {
            orders = orders.stream()
                    .filter(o -> passengerId.equals(o.getPassengerId()))
                    .collect(Collectors.toList());
        }

        // 司機 ID 篩選
        if (driverId != null && !driverId.isEmpty()) {
            orders = orders.stream()
                    .filter(o -> driverId.equals(o.getDriverId()))
                    .collect(Collectors.toList());
        }
        
        int totalElements = orders.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        
        // 分頁
        int start = page * size;
        int end = Math.min(start + size, orders.size());
        List<Order> pagedOrders = start < orders.size() 
                ? orders.subList(start, end) 
                : List.of();
        
        // 轉換為 API 回應格式
        List<Map<String, Object>> orderList = pagedOrders.stream()
                .map(this::buildOrderSummary)
                .collect(Collectors.toList());
        
        Map<String, Object> pagination = new HashMap<>();
        pagination.put("page", page);
        pagination.put("size", size);
        pagination.put("totalElements", totalElements);
        pagination.put("totalPages", totalPages);
        
        Map<String, Object> response = new HashMap<>();
        response.put("orders", orderList);
        response.put("pagination", pagination);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 取得單一訂單詳情
     */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOrderDetail(
            @PathVariable String orderId) {
        Order order = orderService.getOrder(orderId);
        return ResponseEntity.ok(ApiResponse.success(buildOrderDetail(order)));
    }
    
    /**
     * 取得所有司機
     */
    @GetMapping("/drivers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllDrivers(
            @RequestParam(required = false) String status) {
        List<Driver> drivers = driverService.getAllDrivers();
        
        // 狀態篩選
        if (status != null && !status.isEmpty()) {
            try {
                DriverStatus driverStatus = DriverStatus.valueOf(status.toUpperCase());
                drivers = drivers.stream()
                        .filter(d -> d.getStatus() == driverStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                // 無效的狀態參數，忽略篩選
            }
        }
        
        List<Map<String, Object>> driverList = drivers.stream()
                .map(this::buildDriverSummary)
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("drivers", driverList);
        response.put("count", driverList.size());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 創建司機帳號
     */
    @PostMapping("/drivers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDriver(@RequestBody CreateDriverRequest request) {
        Driver driver = driverService.registerDriver(
                request.getDriverId(), 
                request.getName(), 
                request.getPhone(), 
                request.getVehiclePlate(), 
                request.getVehicleType());
        
        return ResponseEntity.ok(ApiResponse.success(buildDriverSummary(driver)));
    }
    
    /**
     * 創建乘客帳號
     */
    @PostMapping("/passengers")
    public ResponseEntity<ApiResponse<Passenger>> createPassenger(@RequestBody CreatePassengerRequest request) {
        Passenger passenger = passengerService.createPassenger(
                request.getPassengerId(), 
                request.getName(), 
                request.getPhone());
        
        return ResponseEntity.ok(ApiResponse.success(passenger));
    }
    
    /**
     * 取得 Audit Log
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) String action) {
        
        List<AuditLog> logs;
        if (orderId != null && !orderId.isEmpty()) {
            logs = auditService.getLogsByOrderId(orderId);
        } else {
            logs = auditService.getAllLogs();
        }
        
        // Action 篩選
        if (action != null && !action.isEmpty()) {
            logs = logs.stream()
                    .filter(log -> log.getAction().equalsIgnoreCase(action))
                    .collect(Collectors.toList());
        }
        
        List<Map<String, Object>> logList = logs.stream()
                .map(this::buildAuditLogResponse)
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logList);
        response.put("count", logList.size());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 取得搶單統計 (H2 驗證用)
     */
    @GetMapping("/accept-stats/{orderId}")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getAcceptStats(@PathVariable String orderId) {
        Map<String, Long> stats = auditService.getAcceptStats(orderId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
    
    /**
     * 取得所有費率
     */
    @GetMapping("/rate-plans")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRatePlans() {
        List<RatePlan> ratePlans = fareService.getAllRatePlans();
        
        List<Map<String, Object>> ratePlanList = ratePlans.stream()
                .map(this::buildRatePlanResponse)
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("ratePlans", ratePlanList);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 更新費率
     */
    @PutMapping("/rate-plans/{vehicleType}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateRatePlan(
            @PathVariable VehicleType vehicleType,
            @RequestBody RatePlan ratePlan) {
        RatePlan updated = fareService.updateRatePlan(vehicleType, ratePlan);
        
        Map<String, Object> response = buildRatePlanResponse(updated);
        response.put("updatedAt", Instant.now());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 系統統計數據
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemStats() {
        List<Order> allOrders = orderService.getAllOrders();
        List<Driver> allDrivers = driverService.getAllDrivers();
        
        long pendingCount = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.PENDING).count();
        long acceptedCount = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.ACCEPTED).count();
        long ongoingCount = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.ONGOING).count();
        long completedCount = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.COMPLETED).count();
        long cancelledCount = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.CANCELLED).count();
        
        double totalRevenue = allOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.COMPLETED)
                .mapToDouble(Order::getActualFare)
                .sum();
        
        long onlineDrivers = allDrivers.stream().filter(d -> d.getStatus() == DriverStatus.ONLINE).count();
        long busyDrivers = allDrivers.stream().filter(d -> d.isBusy()).count();
        
        Map<String, Object> orderStats = new HashMap<>();
        orderStats.put("total", allOrders.size());
        orderStats.put("pending", pendingCount);
        orderStats.put("accepted", acceptedCount);
        orderStats.put("ongoing", ongoingCount);
        orderStats.put("completed", completedCount);
        orderStats.put("cancelled", cancelledCount);
        
        Map<String, Object> driverStats = new HashMap<>();
        driverStats.put("total", allDrivers.size());
        driverStats.put("online", onlineDrivers);
        driverStats.put("busy", busyDrivers);
        
        Map<String, Object> response = new HashMap<>();
        response.put("orders", orderStats);
        response.put("drivers", driverStats);
        response.put("totalRevenue", Math.round(totalRevenue * 100.0) / 100.0);
        response.put("generatedAt", Instant.now());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    // ========== 乘客管理 API ==========
    
    /**
     * 取得所有乘客
     */
    @GetMapping("/riders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllRiders() {
        List<Rider> riders = riderService.getAllRiders();
        
        List<Map<String, Object>> riderList = riders.stream()
                .map(this::buildRiderSummary)
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("riders", riderList);
        response.put("count", riderList.size());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 建立乘客帳號
     */
    @PostMapping("/riders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRider(@RequestBody CreateRiderRequest request) {
        Rider rider = riderService.createRider(
                request.getRiderId(),
                request.getName(),
                request.getPhone());
        
        return ResponseEntity.ok(ApiResponse.success(buildRiderSummary(rider)));
    }
    
    /**
     * 取得單一乘客
     */
    @GetMapping("/riders/{riderId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRider(@PathVariable String riderId) {
        Rider rider = riderService.getRider(riderId);
        return ResponseEntity.ok(ApiResponse.success(buildRiderSummary(rider)));
    }
    
    /**
     * 刪除乘客
     */
    @DeleteMapping("/riders/{riderId}")
    public ResponseEntity<ApiResponse<String>> deleteRider(@PathVariable String riderId) {
        riderService.deleteRider(riderId);
        return ResponseEntity.ok(ApiResponse.success("乘客已刪除"));
    }
    
    // ========== 位置設置 API (Demo 用途) ==========
    
    /**
     * 設置司機初始位置
     * 
     * 錯誤預防：
     * - 司機不存在
     * - 司機正在忙碌中（有進行中的訂單）
     */
    @PutMapping("/drivers/{driverId}/location")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setDriverLocation(
            @PathVariable String driverId,
            @RequestBody SetLocationRequest request) {
        
        // 取得司機
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new com.uber.exception.BusinessException(
                        "DRIVER_NOT_FOUND", "司機不存在", 404));
        
        // 錯誤預防：檢查司機是否正在忙碌
        if (driver.isBusy()) {
            throw new com.uber.exception.BusinessException(
                    "DRIVER_BUSY", 
                    "司機正在行程中，無法更改位置。請等待當前行程完成後再試。", 
                    409);
        }
        
        // 額外檢查：確認沒有任何進行中的訂單
        List<Order> activeOrders = orderRepository.findByDriverId(driverId).stream()
                .filter(o -> o.getStatus() == OrderStatus.ACCEPTED || 
                           o.getStatus() == OrderStatus.ONGOING)
                .collect(Collectors.toList());
        
        if (!activeOrders.isEmpty()) {
            throw new com.uber.exception.BusinessException(
                    "DRIVER_HAS_ACTIVE_ORDER", 
                    "司機有進行中的訂單 (" + activeOrders.get(0).getOrderId() + ")，無法更改位置。", 
                    409);
        }
        
        // 設置位置
        Location newLocation = new Location(request.getLat(), request.getLng(), request.getAddress());
        driver.setLocation(newLocation);
        driver.setLastUpdatedAt(Instant.now());
        driverRepository.save(driver);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("driverId", driverId);
        response.put("location", newLocation);
        response.put("updatedAt", Instant.now());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 設置乘客初始位置
     * 
     * 錯誤預防：
     * - 乘客不存在
     * - 乘客有進行中的訂單（PENDING、ACCEPTED、ONGOING）
     */
    @PutMapping("/riders/{riderId}/location")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setRiderLocation(
            @PathVariable String riderId,
            @RequestBody SetLocationRequest request) {
        
        // 取得乘客
        Rider rider = riderRepository.findById(riderId)
                .orElseThrow(() -> new com.uber.exception.BusinessException(
                        "RIDER_NOT_FOUND", "乘客不存在", 404));
        
        // 錯誤預防：檢查乘客是否有進行中的訂單
        List<Order> activeOrders = orderRepository.findByPassengerId(riderId).stream()
                .filter(o -> o.getStatus() == OrderStatus.PENDING || 
                           o.getStatus() == OrderStatus.ACCEPTED || 
                           o.getStatus() == OrderStatus.ONGOING)
                .collect(Collectors.toList());
        
        if (!activeOrders.isEmpty()) {
            Order activeOrder = activeOrders.get(0);
            String statusText = switch (activeOrder.getStatus()) {
                case PENDING -> "等待接單中";
                case ACCEPTED -> "司機已接單，正在前往";
                case ONGOING -> "行程進行中";
                default -> activeOrder.getStatus().name();
            };
            throw new com.uber.exception.BusinessException(
                    "RIDER_HAS_ACTIVE_ORDER", 
                    "乘客有進行中的訂單（" + statusText + "），無法更改位置。請先取消訂單或等待行程完成。", 
                    409);
        }
        
        // 設置位置
        Location newLocation = new Location(request.getLat(), request.getLng(), request.getAddress());
        rider.setLocation(newLocation);
        riderRepository.save(rider);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("riderId", riderId);
        response.put("location", newLocation);
        response.put("updatedAt", Instant.now());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 取得司機的位置設置狀態（是否可以更改）
     */
    @GetMapping("/drivers/{driverId}/location-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDriverLocationStatus(
            @PathVariable String driverId) {
        
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new com.uber.exception.BusinessException(
                        "DRIVER_NOT_FOUND", "司機不存在", 404));
        
        boolean canSetLocation = !driver.isBusy();
        String reason = null;
        
        if (driver.isBusy()) {
            reason = "司機正在行程中";
        } else {
            // 額外檢查進行中的訂單
            List<Order> activeOrders = orderRepository.findByDriverId(driverId).stream()
                    .filter(o -> o.getStatus() == OrderStatus.ACCEPTED || 
                               o.getStatus() == OrderStatus.ONGOING)
                    .collect(Collectors.toList());
            
            if (!activeOrders.isEmpty()) {
                canSetLocation = false;
                reason = "有進行中的訂單";
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("driverId", driverId);
        response.put("canSetLocation", canSetLocation);
        response.put("currentLocation", driver.getLocation());
        if (reason != null) {
            response.put("reason", reason);
        }
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 取得乘客的位置設置狀態（是否可以更改）
     * 
     * 詳細檢查邏輯：
     * 1. 檢查乘客是否存在
     * 2. 檢查是否有 PENDING/ACCEPTED/ONGOING 狀態的訂單
     * 3. 返回詳細的診斷資訊
     */
    @GetMapping("/riders/{riderId}/location-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRiderLocationStatus(
            @PathVariable String riderId) {
        
        Rider rider = riderRepository.findById(riderId)
                .orElseThrow(() -> new com.uber.exception.BusinessException(
                        "RIDER_NOT_FOUND", "乘客不存在", 404));
        
        // 從 Repository 重新載入最新數據，確保不是使用過期的緩存
        List<Order> allRiderOrders = orderRepository.findByPassengerId(riderId);
        
        // 嚴格篩選：只檢查真正進行中的訂單狀態
        List<Order> activeOrders = allRiderOrders.stream()
                .filter(o -> o.getStatus() != null)
                .filter(o -> o.getStatus() == OrderStatus.PENDING || 
                           o.getStatus() == OrderStatus.ACCEPTED || 
                           o.getStatus() == OrderStatus.ONGOING)
                .collect(Collectors.toList());
        
        boolean canSetLocation = activeOrders.isEmpty();
        String reason = null;
        
        Map<String, Object> response = new HashMap<>();
        response.put("riderId", riderId);
        response.put("canSetLocation", canSetLocation);
        response.put("currentLocation", rider.getLocation());
        
        // 增加診斷資訊
        response.put("totalOrdersFound", allRiderOrders.size());
        response.put("activeOrdersCount", activeOrders.size());
        
        if (!activeOrders.isEmpty()) {
            Order activeOrder = activeOrders.get(0);
            reason = "有進行中的訂單 (" + switch (activeOrder.getStatus()) {
                case PENDING -> "等待接單";
                case ACCEPTED -> "司機前往中";
                case ONGOING -> "行程中";
                default -> activeOrder.getStatus().name();
            } + ")";
            response.put("reason", reason);
            
            // 返回活動訂單的詳細資訊，方便診斷
            List<Map<String, Object>> activeOrderDetails = activeOrders.stream()
                    .map(o -> {
                        Map<String, Object> detail = new HashMap<>();
                        detail.put("orderId", o.getOrderId());
                        detail.put("status", o.getStatus().name());
                        detail.put("createdAt", o.getCreatedAt());
                        detail.put("driverId", o.getDriverId());
                        return detail;
                    })
                    .collect(Collectors.toList());
            response.put("activeOrders", activeOrderDetails);
        }
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 強制取消乘客的所有殘留訂單（管理員工具）
     * 
     * 用於處理因系統異常而未正確關閉的訂單
     */
    @PostMapping("/riders/{riderId}/force-cancel-orders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> forceCancelRiderOrders(
            @PathVariable String riderId) {
        
        // 驗證乘客存在
        Rider rider = riderRepository.findById(riderId)
                .orElseThrow(() -> new com.uber.exception.BusinessException(
                        "RIDER_NOT_FOUND", "乘客不存在", 404));
        
        // 找出所有進行中的訂單
        List<Order> activeOrders = orderRepository.findByPassengerId(riderId).stream()
                .filter(o -> o.getStatus() != null)
                .filter(o -> o.getStatus() == OrderStatus.PENDING || 
                           o.getStatus() == OrderStatus.ACCEPTED || 
                           o.getStatus() == OrderStatus.ONGOING)
                .collect(Collectors.toList());
        
        List<String> cancelledOrderIds = new ArrayList<>();
        
        for (Order order : activeOrders) {
            String previousStatus = order.getStatus().name();
            
            // 強制取消訂單
            order.setStatus(OrderStatus.CANCELLED);
            order.setCancelledAt(Instant.now());
            order.setCancelledBy("ADMIN_FORCE");
            orderRepository.save(order);
            
            // 如果有指派的司機，釋放司機
            if (order.getDriverId() != null) {
                driverRepository.findById(order.getDriverId()).ifPresent(driver -> {
                    driver.setBusy(false);
                    driver.setCurrentOrderId(null);
                    driverRepository.save(driver);
                });
            }
            
            // 記錄審計日誌
            auditService.logSuccess(
                order.getOrderId(),
                "ADMIN_FORCE_CANCEL",
                "ADMIN",
                "admin",
                previousStatus,
                OrderStatus.CANCELLED.name()
            );
            
            cancelledOrderIds.add(order.getOrderId());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("riderId", riderId);
        response.put("cancelledCount", cancelledOrderIds.size());
        response.put("cancelledOrderIds", cancelledOrderIds);
        response.put("timestamp", Instant.now());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    // ========== 資料管理 API ==========
    
    /**
     * 清除所有資料
     */
    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearAllData() {
        // 清除所有資料
        orderRepository.deleteAll();
        driverRepository.deleteAll();
        auditLogRepository.deleteAll();
        riderRepository.deleteAll();
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "所有資料已清除");
        response.put("clearedAt", Instant.now());
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    // DTOs
    @Data
    static class CreateDriverRequest {
        private String driverId;
        private String name;
        private String phone;
        private String vehiclePlate;
        private VehicleType vehicleType;
    }
    
    @Data
    static class CreatePassengerRequest {
        private String passengerId;
        private String name;
        private String phone;
    }
    
    @Data
    static class CreateRiderRequest {
        private String riderId;
        private String name;
        private String phone;
    }
    
    @Data
    static class SetLocationRequest {
        private double lat;  // 緯度
        private double lng;  // 經度
        private String address; // 地址名稱 (可選)
    }
    
    // ========== 私有方法 ==========
    
    private Map<String, Object> buildRiderSummary(Rider rider) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("riderId", rider.getRiderId());
        summary.put("name", rider.getName());
        summary.put("phone", rider.getPhone());
        summary.put("location", rider.getLocation());
        summary.put("createdAt", rider.getCreatedAt());
        return summary;
    }
    
    private Map<String, Object> buildOrderSummary(Order order) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("orderId", order.getOrderId());
        summary.put("passengerId", order.getPassengerId());
        summary.put("status", order.getStatus().name());
        summary.put("vehicleType", order.getVehicleType().name());
        summary.put("createdAt", order.getCreatedAt());
        
        // 加入地點資訊，讓列表也能顯示地址
        summary.put("pickupLocation", order.getPickupLocation());
        summary.put("dropoffLocation", order.getDropoffLocation());
        summary.put("estimatedFare", order.getEstimatedFare());
        
        if (order.getDriverId() != null) {
            summary.put("driverId", order.getDriverId());
        }
        if (order.getActualFare() != null && order.getActualFare() > 0) {
            summary.put("fare", order.getActualFare());
        }
        if (order.getCompletedAt() != null) {
            summary.put("completedAt", order.getCompletedAt());
        }
        if (order.getCancelledAt() != null) {
            summary.put("cancelledAt", order.getCancelledAt());
        }
        
        return summary;
    }
    
    private Map<String, Object> buildOrderDetail(Order order) {
        Map<String, Object> detail = buildOrderSummary(order);
        detail.put("pickupLocation", order.getPickupLocation());
        detail.put("dropoffLocation", order.getDropoffLocation());
        detail.put("estimatedFare", order.getEstimatedFare());
        detail.put("distance", order.getDistance());
        
        if (order.getAcceptedAt() != null) {
            detail.put("acceptedAt", order.getAcceptedAt());
        }
        if (order.getStartedAt() != null) {
            detail.put("startedAt", order.getStartedAt());
        }
        if (order.getDuration() != null && order.getDuration() > 0) {
            detail.put("duration", order.getDuration());
        }
        if (order.getCancelFee() != null && order.getCancelFee() > 0) {
            detail.put("cancelFee", order.getCancelFee());
        }
        if (order.getCancelledBy() != null) {
            detail.put("cancelledBy", order.getCancelledBy());
        }
        
        return detail;
    }
    
    private Map<String, Object> buildDriverSummary(Driver driver) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("driverId", driver.getDriverId());
        summary.put("name", driver.getName());
        summary.put("status", driver.getStatus().name());
        summary.put("vehicleType", driver.getVehicleType().name());
        summary.put("busy", driver.isBusy());
        
        if (driver.getPhone() != null) {
            summary.put("phone", driver.getPhone());
        }
        if (driver.getVehiclePlate() != null) {
            summary.put("vehiclePlate", driver.getVehiclePlate());
        }
        if (driver.getLocation() != null) {
            summary.put("location", driver.getLocation());
        }
        if (driver.getCurrentOrderId() != null) {
            summary.put("currentOrderId", driver.getCurrentOrderId());
        }
        summary.put("lastUpdatedAt", driver.getLastUpdatedAt());
        
        return summary;
    }
    
    private Map<String, Object> buildAuditLogResponse(AuditLog log) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", log.getId());
        response.put("timestamp", log.getTimestamp());
        response.put("orderId", log.getOrderId());
        response.put("action", log.getAction());
        response.put("actorType", log.getActorType());
        response.put("actorId", log.getActorId());
        response.put("previousState", log.getPreviousState());
        response.put("newState", log.getNewState());
        response.put("success", log.isSuccess());
        
        if (log.getFailureReason() != null) {
            response.put("failureReason", log.getFailureReason());
        }
        
        return response;
    }
    
    private Map<String, Object> buildRatePlanResponse(RatePlan ratePlan) {
        Map<String, Object> response = new HashMap<>();
        response.put("vehicleType", ratePlan.getVehicleType().name());
        response.put("baseFare", ratePlan.getBaseFare());
        response.put("perKmRate", ratePlan.getPerKmRate());
        response.put("perMinRate", ratePlan.getPerMinRate());
        response.put("minFare", ratePlan.getMinFare());
        response.put("cancelFee", ratePlan.getCancelFee());
        return response;
    }
}
