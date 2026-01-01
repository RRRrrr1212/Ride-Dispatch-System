package com.uber.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.uber.model.Location;
import com.uber.model.VehicleType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 建立叫車請求 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {
    
    @NotNull(message = "乘客 ID 不可為空")
    private String passengerId;
    
    @NotNull(message = "上車點 X 不可為空")
    private Double pickupX;

    @NotNull(message = "上車點 Y 不可為空")
    private Double pickupY;

    @NotNull(message = "下車點 X 不可為空")
    private Double dropoffX;

    @NotNull(message = "下車點 Y 不可為空")
    private Double dropoffY;

    @NotNull(message = "車種不可為空")
    private VehicleType vehicleType;

    // 支援 nested { x, y } 物件，並回填到座標欄位
    @JsonProperty("pickupLocation")
    private void unpackPickupLocation(java.util.Map<String, Double> loc) {
        if (loc != null) {
            this.pickupX = loc.get("x");
            this.pickupY = loc.get("y");
        }
    }

    @JsonProperty("dropoffLocation")
    private void unpackDropoffLocation(java.util.Map<String, Double> loc) {
        if (loc != null) {
            this.dropoffX = loc.get("x");
            this.dropoffY = loc.get("y");
        }
    }

    // Helper: 回傳 Location 方便 service 使用
    public Location getPickupLocation() {
        if (pickupX == null || pickupY == null) {
            return null;
        }
        return new Location(pickupX, pickupY);
    }

    public Location getDropoffLocation() {
        if (dropoffX == null || dropoffY == null) {
            return null;
        }
        return new Location(dropoffX, dropoffY);
    }
}
