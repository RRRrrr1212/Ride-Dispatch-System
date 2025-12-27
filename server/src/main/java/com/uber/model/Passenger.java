package com.uber.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 乘客實體
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Passenger {
    private String passengerId;
    private String name;
    private String phone;
    private Instant createdAt;
}
