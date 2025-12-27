package com.uber.admin;

import com.uber.client.util.Theme;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

/**
 * Uber 管理後台應用程式 - 現代化儀表板風格
 */
public class AdminApp extends Application {
    
    private static final int WINDOW_WIDTH = 1280;
    private static final int WINDOW_HEIGHT = 800;
    
    @Override
    public void start(Stage primaryStage) {
        MainController controller = new MainController();
        Scene scene = new Scene(controller.getRoot(), WINDOW_WIDTH, WINDOW_HEIGHT);
        
        // 應用樣式表
        scene.getStylesheets().add("data:text/css," + 
            Theme.getBaseStyles().replace("\n", " ").replace("\\s+", " "));
        
        primaryStage.setTitle("Uber Admin Console");
        primaryStage.setScene(scene);
        primaryStage.setMinWidth(1024);
        primaryStage.setMinHeight(700);
        primaryStage.setOnCloseRequest(e -> {
            controller.shutdown();
        });
        primaryStage.show();
    }
    
    public static void main(String[] args) {
        launch(args);
    }
}
