package com.uber.repository;

import com.uber.model.Driver;
import com.uber.model.DriverStatus;
import com.uber.model.VehicleType;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 司機儲存庫 (In-Memory + JSON Persistent)
 */
@Repository
public class DriverRepository {
    
    private final Map<String, Driver> drivers = new ConcurrentHashMap<>();
    private static final String FILE_NAME = "drivers.json";

    public DriverRepository() {
        loadData();
    }

    private void loadData() {
        List<Driver> data = com.uber.util.JsonFileUtil.loadFromFile(FILE_NAME, new com.fasterxml.jackson.core.type.TypeReference<List<Driver>>() {});
        data.forEach(item -> drivers.put(item.getDriverId(), item));
    }

    private void saveData() {
        com.uber.util.JsonFileUtil.saveToFile(FILE_NAME, new ArrayList<>(drivers.values()));
    }
    
    public Driver save(Driver driver) {
        drivers.put(driver.getDriverId(), driver);
        saveData();
        return driver;
    }
    
    public Optional<Driver> findById(String driverId) {
        return Optional.ofNullable(drivers.get(driverId));
    }
    
    public List<Driver> findAll() {
        return List.copyOf(drivers.values());
    }
    
    public List<Driver> findAvailableDrivers(VehicleType vehicleType) {
        return drivers.values().stream()
                .filter(d -> d.getStatus() == DriverStatus.ONLINE)
                .filter(d -> !d.isBusy())
                .filter(d -> d.getVehicleType() == vehicleType)
                .collect(Collectors.toList());
    }
    
    public List<Driver> findOnlineDrivers() {
        return drivers.values().stream()
                .filter(d -> d.getStatus() == DriverStatus.ONLINE)
                .collect(Collectors.toList());
    }
    
    public void deleteAll() {
        drivers.clear();
        saveData();
    }
    
    public int count() {
        return drivers.size();
    }
}
