package com.uber.controller;

import com.uber.dto.ApiResponse;
import com.uber.model.AuditLog;
import com.uber.model.Order;
import com.uber.model.RatePlan;
import com.uber.model.VehicleType;
import com.uber.service.AuditService;
import com.uber.service.FareService;
import com.uber.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 管理員 API Controller
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    
    private final OrderService orderService;
    private final AuditService auditService;
    private final FareService fareService;
    
    /**
     * 取得所有訂單
     */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllOrders(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        List<Order> orders = orderService.getAllOrders();
        
        // 簡易分頁
        int start = page * size;
        int end = Math.min(start + size, orders.size());
        List<Order> pagedOrders = start < orders.size() 
                ? orders.subList(start, end) 
                : List.of();
        
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "orders", pagedOrders,
                "pagination", Map.of(
                        "page", page,
                        "size", size,
                        "totalElements", orders.size(),
                        "totalPages", (int) Math.ceil((double) orders.size() / size)
                )
        )));
    }
    
    /**
     * 取得 Audit Log
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) String action) {
        
        List<AuditLog> logs;
        if (orderId != null) {
            logs = auditService.getLogsByOrderId(orderId);
        } else {
            logs = auditService.getAllLogs();
        }
        
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "logs", logs,
                "count", logs.size()
        )));
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
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "ratePlans", ratePlans
        )));
    }
    
    /**
     * 更新費率
     */
    @PutMapping("/rate-plans/{vehicleType}")
    public ResponseEntity<ApiResponse<RatePlan>> updateRatePlan(
            @PathVariable VehicleType vehicleType,
            @RequestBody RatePlan ratePlan) {
        RatePlan updated = fareService.updateRatePlan(vehicleType, ratePlan);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }
}
