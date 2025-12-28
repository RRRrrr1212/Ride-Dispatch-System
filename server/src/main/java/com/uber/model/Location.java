package com.uber.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

/**
 * 2D 座標位置
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Location {
    private double x;
    private double y;
    private String address;
    
    public Location(double x, double y) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * 使用 Haversine 公式計算兩點間的球面距離（公里）
     * x = 緯度 (latitude), y = 經度 (longitude)
     */
    public double distanceTo(Location other) {
        final double R = 6371.0; // 地球半徑（公里）
        
        double lat1 = Math.toRadians(this.x);
        double lat2 = Math.toRadians(other.x);
        double dLat = Math.toRadians(other.x - this.x);
        double dLon = Math.toRadians(other.y - this.y);
        
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(lat1) * Math.cos(lat2) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c; // 回傳公里數
    }
}
