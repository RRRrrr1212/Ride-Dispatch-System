package com.uber.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 2D 搴ф?浣嶇疆
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@AllArgsConstructor
@NoArgsConstructor
public class Location {
    private double x;
    private double y;
    private String address;

    public Location(double x, double y) {
        this(x, y, null);
    }

    /**
     * 瑷堢??囧彟涓€榛炵?姝愬咕?屽?璺濋洟
     */
    public double distanceTo(Location other) {
        double dx = this.x - other.x;
        double dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
