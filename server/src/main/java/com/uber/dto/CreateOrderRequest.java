package com.uber.dto;

import com.uber.model.Location;
import com.uber.model.VehicleType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 建立訂單請求 DTO
 */
@Data
public class CreateOrderRequest {
    
    @NotNull(message = "乘客 ID 不可為空")
    private String passengerId;
    
    @NotNull(message = "上車地點不可為空")
    private Location pickupLocation;
    
    @NotNull(message = "下車地點不可為空")
    private Location dropoffLocation;
    
    @NotNull(message = "車種不可為空")
    private VehicleType vehicleType;
}
