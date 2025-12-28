package com.uber.repository;

import com.uber.model.Rider;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 乘客儲存庫 - 記憶體實作
 */
@Repository
public class RiderRepository {
    
    private final Map<String, Rider> riders = new ConcurrentHashMap<>();
    
    public Rider save(Rider rider) {
        riders.put(rider.getRiderId(), rider);
        return rider;
    }
    
    public Optional<Rider> findById(String riderId) {
        return Optional.ofNullable(riders.get(riderId));
    }
    
    public List<Rider> findAll() {
        return new ArrayList<>(riders.values());
    }
    
    public void deleteById(String riderId) {
        riders.remove(riderId);
    }
    
    public void deleteAll() {
        riders.clear();
    }
    
    public boolean existsById(String riderId) {
        return riders.containsKey(riderId);
    }
    
    public long count() {
        return riders.size();
    }
}
