package com.uber.dto;

import com.uber.model.Location;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 司機上線請求 DTO
 */
@Data
public class DriverOnlineRequest {
    
    @NotNull(message = "位置不可為空")
    private Location location;
}
