package com.uber.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.uber.model.Order;
import com.uber.model.OrderStatus;
import com.uber.util.JsonFileUtil;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 訂單儲存庫 (In-Memory with file persistence)
 */
@Repository
public class OrderRepository {
    
    private final Map<String, Order> orders = new ConcurrentHashMap<>();
    private static final String FILE_NAME = "orders.json";
    
    public OrderRepository() {
        loadData();
    }

    private void loadData() {
        if (JsonFileUtil.isTestEnv()) {
            return;
        }
        List<Order> data = JsonFileUtil.loadFromFile(FILE_NAME, new TypeReference<List<Order>>() {});
        data.forEach(order -> orders.put(order.getOrderId(), order));
    }

    private void saveData() {
        if (JsonFileUtil.isTestEnv()) {
            return;
        }
        JsonFileUtil.saveToFile(FILE_NAME, new ArrayList<>(orders.values()));
    }
    
    public Order save(Order order) {
        orders.put(order.getOrderId(), order);
        saveData();
        return order;
    }
    
    public Optional<Order> findById(String orderId) {
        return Optional.ofNullable(orders.get(orderId));
    }
    
    public List<Order> findAll() {
        return List.copyOf(orders.values());
    }
    
    public List<Order> findByStatus(OrderStatus status) {
        return orders.values().stream()
                .filter(o -> o.getStatus() == status)
                .collect(Collectors.toList());
    }
    
    public List<Order> findByPassengerId(String passengerId) {
        return orders.values().stream()
                .filter(o -> o.getPassengerId().equals(passengerId))
                .collect(Collectors.toList());
    }
    
    public List<Order> findByDriverId(String driverId) {
        return orders.values().stream()
                .filter(o -> driverId.equals(o.getDriverId()))
                .collect(Collectors.toList());
    }
    
    public void deleteAll() {
        orders.clear();
        saveData();
    }
    
    public int count() {
        return orders.size();
    }
}
