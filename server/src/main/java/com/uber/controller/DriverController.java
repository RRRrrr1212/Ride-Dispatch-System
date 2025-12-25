package com.uber.controller;

import com.uber.dto.ApiResponse;
import com.uber.dto.DriverOnlineRequest;
import com.uber.model.Driver;
import com.uber.model.Location;
import com.uber.model.Order;
import com.uber.service.DriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 司機 API Controller
 */
@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {
    
    private final DriverService driverService;
    
    /**
     * 司機上線
     */
    @PutMapping("/{driverId}/online")
    public ResponseEntity<ApiResponse<Driver>> goOnline(
            @PathVariable String driverId,
            @Valid @RequestBody DriverOnlineRequest request) {
        Driver driver = driverService.goOnline(driverId, request.getLocation());
        return ResponseEntity.ok(ApiResponse.success(driver));
    }
    
    /**
     * 司機下線
     */
    @PutMapping("/{driverId}/offline")
    public ResponseEntity<ApiResponse<Driver>> goOffline(@PathVariable String driverId) {
        Driver driver = driverService.goOffline(driverId);
        return ResponseEntity.ok(ApiResponse.success(driver));
    }
    
    /**
     * 更新位置
     */
    @PutMapping("/{driverId}/location")
    public ResponseEntity<ApiResponse<Driver>> updateLocation(
            @PathVariable String driverId,
            @RequestBody Location location) {
        Driver driver = driverService.updateLocation(driverId, location);
        return ResponseEntity.ok(ApiResponse.success(driver));
    }
    
    /**
     * 取得可接訂單列表
     */
    @GetMapping("/{driverId}/offers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOffers(@PathVariable String driverId) {
        List<Order> offers = driverService.getOffers(driverId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "offers", offers,
                "count", offers.size()
        )));
    }
    
    /**
     * 取得司機資訊
     */
    @GetMapping("/{driverId}")
    public ResponseEntity<ApiResponse<Driver>> getDriver(@PathVariable String driverId) {
        Driver driver = driverService.getDriver(driverId);
        return ResponseEntity.ok(ApiResponse.success(driver));
    }
    
    /**
     * 取得所有司機
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Driver>>> getAllDrivers() {
        List<Driver> drivers = driverService.getAllDrivers();
        return ResponseEntity.ok(ApiResponse.success(drivers));
    }
}
