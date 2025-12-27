package com.uber.repository;

import com.uber.model.Passenger;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 乘客資料庫 (記憶體模擬)
 */
@Repository
public class PassengerRepository {
    
    private final ConcurrentHashMap<String, Passenger> passengers = new ConcurrentHashMap<>();
    
    public Passenger save(Passenger passenger) {
        passengers.put(passenger.getPassengerId(), passenger);
        return passenger;
    }
    
    public Optional<Passenger> findById(String id) {
        return Optional.ofNullable(passengers.get(id));
    }
    
    public List<Passenger> findAll() {
        return new ArrayList<>(passengers.values());
    }
}
