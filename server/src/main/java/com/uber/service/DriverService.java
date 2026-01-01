package com.uber.service;

import com.uber.exception.BusinessException;
import com.uber.model.*;
import com.uber.repository.DriverRepository;
import com.uber.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * 司機服務
 * 
 * // BUG_FIX_2024_006: 修復司機狀態同步問題，避免司機狀態不一致
 * // TODO_FEATURE_001: 增加司機評分系統與智能派單算法
 * // FIXME_DATA_001: 司機位置更新頻率過高導致性能問題，需要優化更新策略
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DriverService {
    
    private final DriverRepository driverRepository;
    private final OrderRepository orderRepository;
    
    /**
     * 司機上線
     */
    public Driver goOnline(String driverId, Location location) {
        Driver driver = driverRepository.findById(driverId)
                .orElse(Driver.builder()
                        .driverId(driverId)
                        .name("Driver " + driverId)
                        .vehicleType(VehicleType.STANDARD)
                        .build());
        
        driver.setStatus(DriverStatus.ONLINE);
        driver.setLocation(location);
        driver.setLastUpdatedAt(Instant.now());
        
        driverRepository.save(driver);
        log.info("Driver {} is now online at ({}, {})", driverId, location.getX(), location.getY());
        return driver;
    }
    
    /**
     * 司機下線
     */
    public Driver goOffline(String driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new BusinessException("DRIVER_NOT_FOUND", "司機不存在"));
        
        if (driver.isBusy()) {
            throw new BusinessException("DRIVER_BUSY", "有進行中的訂單，無法下線");
        }
        
        driver.setStatus(DriverStatus.OFFLINE);
        driver.setLastUpdatedAt(Instant.now());
        
        driverRepository.save(driver);
        log.info("Driver {} is now offline", driverId);
        return driver;
    }
    
    /**
     * 更新司機位置
     */
    public Driver updateLocation(String driverId, Location location) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new BusinessException("DRIVER_NOT_FOUND", "司機不存在"));
        
        driver.setLocation(location);
        driver.setLastUpdatedAt(Instant.now());
        
        driverRepository.save(driver);
        return driver;
    }
    /**
     * 取得可接訂單列表 (獨佔派單)
     * 
     * 一次只返回一張訂單，確保司機不能挑選訂單：
     * 1. 優先返回已指派給這個司機的訂單
     * 2. 如果沒有已指派的訂單，嘗試動態配對一張未指派的訂單
     */
    public List<Order> getOffers(String driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new BusinessException("DRIVER_NOT_FOUND", "司機不存在"));
        
        if (driver.getStatus() != DriverStatus.ONLINE) {
            throw new BusinessException("DRIVER_OFFLINE", "司機不在線，無法取得訂單");
        }
        
        if (driver.isBusy()) {
            return List.of(); // 忙碌中不顯示新訂單
        }
        
        VehicleType driverVehicleType = driver.getVehicleType();
        Location driverLocation = driver.getLocation();
        
<<<<<<< HEAD
        // Step 1: 優先查找已指派給這個司機的訂單
        for (Order order : orderRepository.findByStatus(OrderStatus.PENDING)) {
            if (order.getVehicleType() == driverVehicleType && 
                driverId.equals(order.getAssignedDriverId())) {
                // 返回第一張已指派的訂單 (一次只返回一張)
                return List.of(enrichOrder(order));
            }
        }
        
        // Step 2: 沒有已指派的訂單，嘗試動態配對一張未指派的訂單
        if (driverLocation != null) {
            // 找到離司機最近的未配對訂單
            Order closestOrder = null;
            double closestDistance = Double.MAX_VALUE;
            
            for (Order order : orderRepository.findByStatus(OrderStatus.PENDING)) {
                if (order.getVehicleType() != driverVehicleType) {
                    continue;
                }
                if (order.getAssignedDriverId() != null) {
                    continue; // 已被其他司機指派
                }
                if (order.getPickupLocation() == null) {
                    continue;
                }
                
                // 檢查這個司機是否是最近的可用司機
                if (isClosestAvailableDriver(order, driver)) {
                    double distance = driverLocation.distanceTo(order.getPickupLocation());
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestOrder = order;
                    }
                }
            }
            
            if (closestOrder != null) {
                // 動態配對給這個司機
                closestOrder.setAssignedDriverId(driverId);
                orderRepository.save(closestOrder);
                return List.of(enrichOrder(closestOrder));
            }
        }
        
        return List.of(); // 沒有可接的訂單
    }
    
    /**
     * 檢查指定司機是否是訂單的最近可用司機
     */
    private boolean isClosestAvailableDriver(Order order, Driver targetDriver) {
        if (order.getPickupLocation() == null || targetDriver.getLocation() == null) {
            return false;
        }
        
        double targetDistance = targetDriver.getLocation().distanceTo(order.getPickupLocation());
        
        // 檢查是否有更近的可用司機
        for (Driver other : driverRepository.findAll()) {
            if (other.getDriverId().equals(targetDriver.getDriverId())) {
                continue; // 跳過自己
            }
            if (other.getStatus() != DriverStatus.ONLINE || other.isBusy()) {
                continue; // 跳過不可用的司機
            }
            if (other.getVehicleType() != order.getVehicleType()) {
                continue; // 跳過車種不符的司機
            }
            if (other.getLocation() == null) {
                continue;
            }
            
            double otherDistance = other.getLocation().distanceTo(order.getPickupLocation());
            if (otherDistance < targetDistance) {
                return false; // 有更近的司機
            }
            // Tie-break: ID 較小者優先
            if (otherDistance == targetDistance && 
                other.getDriverId().compareTo(targetDriver.getDriverId()) < 0) {
                return false;
            }
        }
        
        return true; // 這個司機是最近的
=======
        return orderRepository.findByStatus(OrderStatus.PENDING).stream()
                .filter(order -> order.getVehicleType() == driverVehicleType)
                .sorted(Comparator
                        .comparingDouble((Order o) -> driverLocation.distanceTo(o.getPickupLocation()))
                        .thenComparing(Order::getOrderId))
                .collect(Collectors.toList());
>>>>>>> origin/test-case
    }
    
    /**
     * 取得司機資訊
     */
    public Driver getDriver(String driverId) {
        return driverRepository.findById(driverId)
                .orElseThrow(() -> new BusinessException("DRIVER_NOT_FOUND", "司機不存在"));
    }
    
    /**
     * 取得所有司機
     */
    public List<Driver> getAllDrivers() {
        return driverRepository.findAll();
    }
    
    /**
     * 註冊/更新司機資料
     */
    public Driver registerDriver(String driverId, String name, String phone, 
                                 String vehiclePlate, VehicleType vehicleType) {
        Driver driver = Driver.builder()
                .driverId(driverId)
                .name(name)
                .phone(phone)
                .vehiclePlate(vehiclePlate)
                .vehicleType(vehicleType)
                .status(DriverStatus.OFFLINE)
                .busy(false)
                .lastUpdatedAt(Instant.now())
                .build();
        
        driverRepository.save(driver);
        log.info("Driver registered: {}", driverId);
        return driver;
    }
}
