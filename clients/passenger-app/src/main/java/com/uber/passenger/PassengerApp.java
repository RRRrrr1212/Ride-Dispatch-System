package com.uber.passenger;

import com.uber.client.util.Theme;
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
        MainController controller = new MainController();
        Scene scene = new Scene(controller.getRoot(), WINDOW_WIDTH, WINDOW_HEIGHT);
        
        // 應用樣式表
        scene.getStylesheets().add("data:text/css," + 
            Theme.getBaseStyles().replace("\n", " ").replace("\\s+", " "));
        
        primaryStage.setTitle("Uber");
        primaryStage.setScene(scene);
        primaryStage.setResizable(false);
        primaryStage.setOnCloseRequest(e -> {
            controller.shutdown();
        });
        primaryStage.show();
    }
    
    public static void main(String[] args) {
        launch(args);
    }
}
