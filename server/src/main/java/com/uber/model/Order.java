package com.uber.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 訂單實體
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Order {
    
    private String orderId;
    private String passengerId;
    private String riderName;
    private String driverId;
    
    private OrderStatus status;
    private VehicleType vehicleType;
    
    private Location pickupLocation;
    private Location dropoffLocation;
    
    private Double estimatedFare;
    private Double actualFare;
    private Double distance;
    private Integer duration; // 分鐘
    private Double driverEarnings; // 平台分帳後司機收入
    private Instant createdAt;
    private Instant acceptedAt;
    private Instant startedAt;
    private Instant completedAt;
    private Instant cancelledAt;
    
    // 預派給司機ID (訂單建立時嘗試預先匹配最近司機，只有該司機能接受此訂單)
    private String assignedDriverId;
    
    private String cancelledBy;
    private Double cancelFee;
    
    // 司機詳情資訊 (供客戶端顯示)
    private String driverName;
    private String driverPhone;
    private String vehiclePlate;
    private Location driverLocation;
    
    // 路徑 JSON (供顯示行程路徑用)
    private String routePathJson;
}
