package com.uber.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 訂單清理排程任務
 * 
 * 定期檢查並清理超時的訂單，確保系統不會有卡住的訂單。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderCleanupScheduler {
    
    private final OrderService orderService;
    
    /**
     * 每分鐘執行一次訂單清理
     * 
     * 使用 fixedRate 而非 fixedDelay，確保即使上次執行時間較長，
     * 下次執行也會在固定間隔後開始。
     */
    @Scheduled(fixedRate = 60000) // 每 60 秒執行一次
    public void cleanupStaleOrders() {
        try {
            int cleaned = orderService.cleanupStaleOrders();
            if (cleaned > 0) {
                log.info("排程任務：清理了 {} 筆超時訂單", cleaned);
            }
        } catch (Exception e) {
            log.error("排程任務執行失敗", e);
        }
    }
}
