package com.uber;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 共乘叫車平台 - 主應用程式入口
 */
@SpringBootApplication
@EnableScheduling  // 啟用排程任務（訂單超時清理）
public class RideDispatchApplication {

    public static void main(String[] args) {
        SpringApplication.run(RideDispatchApplication.class, args);
    }
}
