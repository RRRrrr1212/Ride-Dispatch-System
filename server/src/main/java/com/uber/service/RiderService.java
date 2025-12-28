package com.uber.service;

import com.uber.exception.BusinessException;
import com.uber.model.Rider;
import com.uber.repository.RiderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * 乘客服務
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RiderService {
    
    private final RiderRepository riderRepository;
    
    /**
     * 建立乘客帳號
     */
    public Rider createRider(String riderId, String name, String phone) {
        if (riderRepository.existsById(riderId)) {
            throw new BusinessException("RIDER_EXISTS", "乘客帳號已存在", 409);
        }
        
        Rider rider = Rider.builder()
                .riderId(riderId)
                .name(name)
                .phone(phone)
                .createdAt(Instant.now())
                .build();
        
        riderRepository.save(rider);
        log.info("Rider registered: {}", riderId);
        return rider;
    }
    
    /**
     * 取得所有乘客
     */
    public List<Rider> getAllRiders() {
        return riderRepository.findAll();
    }
    
    /**
     * 取得單一乘客
     */
    public Rider getRider(String riderId) {
        return riderRepository.findById(riderId)
                .orElseThrow(() -> new BusinessException("RIDER_NOT_FOUND", "乘客不存在", 404));
    }
    
    /**
     * 刪除乘客
     */
    public void deleteRider(String riderId) {
        if (!riderRepository.existsById(riderId)) {
            throw new BusinessException("RIDER_NOT_FOUND", "乘客不存在", 404);
        }
        riderRepository.deleteById(riderId);
        log.info("Rider deleted: {}", riderId);
    }
    
    /**
     * 檢查乘客是否存在
     */
    public boolean exists(String riderId) {
        return riderRepository.existsById(riderId);
    }
    
    /**
     * 清除所有乘客
     */
    public void deleteAll() {
        riderRepository.deleteAll();
    }
}
