package com.uber.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Builder;

import java.time.Instant;

/**
 * 乘客模型
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Rider {
    private String riderId;    // 手機號碼作為 ID
    private String name;
    private String phone;
    private Location location; // 初始位置 (用於 Demo 設置)
    private Instant createdAt;
}
