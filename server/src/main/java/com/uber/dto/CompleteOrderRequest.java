package com.uber.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 完成行程請求 DTO
 */
@Data
public class CompleteOrderRequest {
    
    @NotNull(message = "司機 ID 不可為空")
    private String driverId;
    
    /**
     * 模擬的行程時間（分鐘）
     * 由前端根據動畫模擬時間計算並傳入
     * 如果為 null，後端將使用實際時間差計算
     */
    private Integer simulatedDuration;
}
