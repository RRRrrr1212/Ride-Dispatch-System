package com.uber.service;

import com.uber.exception.BusinessException;
import com.uber.model.Passenger;
import com.uber.repository.PassengerRepository;
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
public class PassengerService {
    
    private final PassengerRepository passengerRepository;
    
    public Passenger createPassenger(String passengerId, String name, String phone) {
        if (passengerRepository.findById(passengerId).isPresent()) {
            throw new BusinessException("PASSENGER_ALREADY_EXISTS", "乘客編號已存在");
        }
        
        Passenger passenger = Passenger.builder()
                .passengerId(passengerId)
                .name(name)
                .phone(phone)
                .createdAt(Instant.now())
                .build();
        
        passengerRepository.save(passenger);
        log.info("Passenger created: {}", passengerId);
        return passenger;
    }
    
    public Passenger getPassenger(String passengerId) {
        return passengerRepository.findById(passengerId)
                .orElseThrow(() -> new BusinessException("PASSENGER_NOT_FOUND", "找不到指定的乘客"));
    }
    
    public List<Passenger> getAllPassengers() {
        return passengerRepository.findAll();
    }
}
