package com.uber.passenger;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

/**
 * Uber 乘客端應用程式 - 現代化手機風格 UI
 */
public class PassengerApp extends Application {
    
    // 模擬手機尺寸
    private static final int WINDOW_WIDTH = 400;
    private static final int WINDOW_HEIGHT = 780;
    
    @Override
    public void start(Stage primaryStage) {
        try {
            MainController controller = new MainController();
            Scene scene = new Scene(controller.getRoot(), WINDOW_WIDTH, WINDOW_HEIGHT);
            
            // 不使用樣式表，直接在控制器中設置樣式
            // 樣式已經在 Theme 類中設置
            
            primaryStage.setTitle("Uber");
            primaryStage.setScene(scene);
            primaryStage.setResizable(false);
            primaryStage.setOnCloseRequest(e -> {
                controller.shutdown();
            });
            primaryStage.show();
        } catch (Exception e) {
            System.err.println("啟動失敗: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("啟動失敗: " + e.getMessage(), e);
        }
    }
    
    public static void main(String[] args) {
        launch(args);
    }
}
