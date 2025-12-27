package com.uber.client.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 座標位置
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Location {
    private double x;
    private double y;
    private String address;
    
    public Location(double x, double y) {
        this.x = x;
        this.y = y;
    }
    
    @Override
    public String toString() {
        return address != null ? address : String.format("(%.1f, %.1f)", x, y);
    }
}
