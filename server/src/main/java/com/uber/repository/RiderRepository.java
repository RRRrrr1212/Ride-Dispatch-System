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
    private static final String FILE_NAME = "riders.json";
    
    public RiderRepository() {
        loadData();
    }

    private void loadData() {
        List<Rider> data = com.uber.util.JsonFileUtil.loadFromFile(FILE_NAME, new com.fasterxml.jackson.core.type.TypeReference<List<Rider>>() {});
        data.forEach(item -> riders.put(item.getRiderId(), item));
    }

    private void saveData() {
        com.uber.util.JsonFileUtil.saveToFile(FILE_NAME, new ArrayList<>(riders.values()));
    }
    
    public Rider save(Rider rider) {
        riders.put(rider.getRiderId(), rider);
        saveData();
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
        saveData();
    }
    
    public void deleteAll() {
        riders.clear();
        saveData();
    }
    
    public boolean existsById(String riderId) {
        return riders.containsKey(riderId);
    }
    
    public long count() {
        return riders.size();
    }
}
