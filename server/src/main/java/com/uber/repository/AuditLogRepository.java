package com.uber.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.uber.model.AuditLog;
import com.uber.util.JsonFileUtil;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * 審計日誌儲存庫 (In-Memory with file persistence)
 */
@Repository
public class AuditLogRepository {
    
    private final List<AuditLog> logs = new CopyOnWriteArrayList<>();
    private static final String FILE_NAME = "audit_logs.json";
    
    public AuditLogRepository() {
        loadData();
    }

    private void loadData() {
        if (JsonFileUtil.isTestEnv()) {
            return;
        }
        List<AuditLog> data = JsonFileUtil.loadFromFile(FILE_NAME, new TypeReference<List<AuditLog>>() {});
        logs.addAll(data);
    }

    private void saveData() {
        if (JsonFileUtil.isTestEnv()) {
            return;
        }
        JsonFileUtil.saveToFile(FILE_NAME, new ArrayList<>(logs));
    }
    
    public AuditLog save(AuditLog auditLog) {
        logs.add(auditLog);
        saveData();
        return auditLog;
    }
    
    public List<AuditLog> findAll() {
        return new ArrayList<>(logs);
    }
    
    public List<AuditLog> findByOrderId(String orderId) {
        return logs.stream()
                .filter(log -> orderId.equals(log.getOrderId()))
                .collect(Collectors.toList());
    }
    
    public List<AuditLog> findByAction(String action) {
        return logs.stream()
                .filter(log -> action.equals(log.getAction()))
                .collect(Collectors.toList());
    }
    
    public List<AuditLog> findByOrderIdAndAction(String orderId, String action) {
        return logs.stream()
                .filter(log -> orderId.equals(log.getOrderId()))
                .filter(log -> action.equals(log.getAction()))
                .collect(Collectors.toList());
    }
    
    public long countSuccessByOrderIdAndAction(String orderId, String action) {
        return logs.stream()
                .filter(log -> orderId.equals(log.getOrderId()))
                .filter(log -> action.equals(log.getAction()))
                .filter(AuditLog::isSuccess)
                .count();
    }
    
    public long countFailureByOrderIdAndAction(String orderId, String action) {
        return logs.stream()
                .filter(log -> orderId.equals(log.getOrderId()))
                .filter(log -> action.equals(log.getAction()))
                .filter(log -> !log.isSuccess())
                .count();
    }
    
    public void deleteAll() {
        logs.clear();
        saveData();
    }
    
    public int count() {
        return logs.size();
    }
}
