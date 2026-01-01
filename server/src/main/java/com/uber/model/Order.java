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
    
    @com.fasterxml.jackson.annotation.JsonProperty("orderId")
    private String orderId;
    
    @com.fasterxml.jackson.annotation.JsonProperty("passengerId")
    private String passengerId;
    
    @com.fasterxml.jackson.annotation.JsonProperty("riderName")
    private String riderName; // 乘客姓名 (Transient)
    
    @com.fasterxml.jackson.annotation.JsonProperty("driverId")
    private String driverId;
    
    @com.fasterxml.jackson.annotation.JsonProperty("driverName")
    private String driverName; // 司機姓名 (Transient)
    
    @com.fasterxml.jackson.annotation.JsonProperty("vehiclePlate")
    private String vehiclePlate; // 車牌 (Transient)
    
    @com.fasterxml.jackson.annotation.JsonProperty("status")
    private OrderStatus status;
    
    @com.fasterxml.jackson.annotation.JsonProperty("vehicleType")
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
    
    // 司機實際收入（扣除平台抽成後）
    private Double driverEarnings;
    
    // 共享路徑資料 (JSON 格式，例如 [[lat,lng],[lat,lng],...])
    private String routePathJson;
}
