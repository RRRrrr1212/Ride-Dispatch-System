package com.uber.controller;

import com.uber.dto.AcceptOrderRequest;
import com.uber.dto.ApiResponse;
import com.uber.dto.CreateOrderRequest;
import com.uber.model.Order;
import com.uber.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 訂單 API Controller
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    
    private final OrderService orderService;
    
    /**
     * 建立叫車請求
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Order>> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.createOrder(
                request.getPassengerId(),
                request.getPickupLocation(),
                request.getDropoffLocation(),
                request.getVehicleType()
        );
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(order));
    }
    
    /**
     * 查詢訂單
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<Order>> getOrder(@PathVariable String orderId) {
        Order order = orderService.getOrder(orderId);
        return ResponseEntity.ok(ApiResponse.success(order));
    }
    
    /**
     * 接受訂單
     */
    @PutMapping("/{orderId}/accept")
    public ResponseEntity<ApiResponse<Order>> acceptOrder(
            @PathVariable String orderId,
            @Valid @RequestBody AcceptOrderRequest request) {
        Order order = orderService.acceptOrder(orderId, request.getDriverId());
        return ResponseEntity.ok(ApiResponse.success(order));
    }
    
    /**
     * 開始行程
     */
    @PutMapping("/{orderId}/start")
    public ResponseEntity<ApiResponse<Order>> startTrip(
            @PathVariable String orderId,
            @Valid @RequestBody AcceptOrderRequest request) {
        Order order = orderService.startTrip(orderId, request.getDriverId());
        return ResponseEntity.ok(ApiResponse.success(order));
    }
    
    /**
     * 完成行程
     */
    @PutMapping("/{orderId}/complete")
    public ResponseEntity<ApiResponse<Order>> completeTrip(
            @PathVariable String orderId,
            @Valid @RequestBody AcceptOrderRequest request) {
        Order order = orderService.completeTrip(orderId, request.getDriverId());
        return ResponseEntity.ok(ApiResponse.success(order));
    }
    
    /**
     * 取消訂單
     */
    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<Order>> cancelOrder(
            @PathVariable String orderId,
            @RequestParam String cancelledBy) {
        Order order = orderService.cancelOrder(orderId, cancelledBy);
        return ResponseEntity.ok(ApiResponse.success(order));
    }
}
