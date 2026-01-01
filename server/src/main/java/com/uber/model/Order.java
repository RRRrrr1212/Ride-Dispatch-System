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
    private Integer duration; // 分鐘
    
    private Instant createdAt;
    private Instant acceptedAt;
    private Instant startedAt;
    private Instant completedAt;
    private Instant cancelledAt;
    
    // 指派的司機 ID (訂單建立時會自動配對最近的司機，只有該司機能看到此訂單)
    private String assignedDriverId;
    
    private String cancelledBy;
    private Double cancelFee;
}
