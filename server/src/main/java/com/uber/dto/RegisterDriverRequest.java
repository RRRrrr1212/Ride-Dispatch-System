package com.uber.dto;

import com.uber.model.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 司機註冊請求 DTO
 */
@Data
public class RegisterDriverRequest {
    
    @NotBlank(message = "司機 ID 不可為空")
    private String driverId;
    
    @NotBlank(message = "姓名不可為空")
    private String name;
    
    private String phone;
    
    private String vehiclePlate;
    
    @NotNull(message = "車種不可為空")
    private VehicleType vehicleType;
}
