package com.uber.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;

/**
 * 訂單實體
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    
    private String orderId;
    private String passengerId;
    private String driverId;
    
    private OrderStatus status;
    private VehicleType vehicleType;
    
    private Location pickupLocation;
    private Location dropoffLocation;
    
    private Double estimatedFare;
    private Double actualFare;
    private Double distance;
    private Integer duration; // 實際行程時長（分鐘）- 完成時使用 estimatedDuration
    private Integer estimatedDuration; // 預估行程時長（分鐘）- startTrip 時計算
    
    private Instant createdAt;
    private Instant acceptedAt;
    private Instant startedAt;
    private Instant completedAt;
    private Instant cancelledAt;
    
    private String cancelledBy;
    private Double cancelFee;
}
