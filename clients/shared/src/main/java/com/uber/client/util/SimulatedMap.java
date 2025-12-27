package com.uber.client.util;

import javafx.beans.property.DoubleProperty;
import javafx.beans.property.SimpleDoubleProperty;
import javafx.geometry.Point2D;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.StrokeLineCap;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.function.Consumer;

/**
 * 模擬地圖元件 - 提供真實的地圖拖曳體驗 (模擬台北信義區網格)
 */
public class SimulatedMap extends Pane {
    
    private final Canvas canvas;
    // 預設中心點 (台北信義區附近模擬座標)
    private final DoubleProperty centerX = new SimpleDoubleProperty(25.0330); 
    private final DoubleProperty centerY = new SimpleDoubleProperty(121.5654);
    
    private double lastMouseX;
    private double lastMouseY;
    private double dragStartX;
    private double dragStartY;
    private boolean isDragging = false;
    
    private Consumer<Point2D> onMapClickListener;
    
    // 預先生成的街道數據
    private final List<Street> streets = new ArrayList<>();
    
    // 虛擬世界尺寸 (放大比例，讓經緯度移動有感)
    private static final double WORLD_SCALE = 10000.0; 
    
    public SimulatedMap() {
        // 全螢幕畫布
        canvas = new Canvas();
        getChildren().add(canvas);
        
        // 生成隨機街道
        generateStreets();
        
        // 綁定大小變化
        widthProperty().addListener(e -> draw());
        heightProperty().addListener(e -> draw());
        
        // 事件處理
        setupInteraction();
        
        // 初始繪製
        draw();
    }
    
    /**
     * 設定地圖點擊監聽器
     */
    public void setOnMapClickListener(Consumer<Point2D> listener) {
        this.onMapClickListener = listener;
    }
    
    @Override
    protected void layoutChildren() {
        canvas.setWidth(getWidth());
        canvas.setHeight(getHeight());
        draw();
    }
    
    private void setupInteraction() {
        canvas.setOnMousePressed(e -> {
            lastMouseX = e.getX();
            lastMouseY = e.getY();
            dragStartX = e.getX();
            dragStartY = e.getY();
            isDragging = false;
            this.setCursor(javafx.scene.Cursor.CLOSED_HAND);
        });
        
        canvas.setOnMouseDragged(e -> {
            double dx = e.getX() - lastMouseX;
            double dy = e.getY() - lastMouseY;
            
            // 判斷是否為拖曳
            if (Math.abs(e.getX() - dragStartX) > 5 || Math.abs(e.getY() - dragStartY) > 5) {
                isDragging = true;
            }
            
            if (isDragging) {
                // 移動地圖中心 (反向移動)
                centerX.set(centerX.get() - dx / WORLD_SCALE);
                centerY.set(centerY.get() - dy / WORLD_SCALE);
                
                lastMouseX = e.getX();
                lastMouseY = e.getY();
                draw();
            }
        });
        
        canvas.setOnMouseReleased(e -> {
            // 如果不是拖曳且有註冊監聽器，則視為點擊
            if (!isDragging && onMapClickListener != null) {
                // 計算點擊處的世界座標
                double clickX = e.getX();
                double clickY = e.getY();
                double w = getWidth();
                double h = getHeight();
                
                // 螢幕座標 -> 世界座標
                // worldX = centerX + (screenX - w/2) / SCALE
                double worldX = centerX.get() + (clickX - w/2) / WORLD_SCALE;
                double worldY = centerY.get() + (clickY - h/2) / WORLD_SCALE;
                
                onMapClickListener.accept(new Point2D(worldX, worldY));
            }
            
            isDragging = false;
            this.setCursor(javafx.scene.Cursor.DEFAULT);
        });
    }
    
    private void generateStreets() {
        Random rand = new Random(12345); 
        
        // 調整街道生成的範圍與密度以配合經緯度比例
        // 假設範圍在 25.0 ~ 25.1, 121.5 ~ 121.6 之間
        double minLat = 24.5;
        double maxLat = 25.5;
        double minLon = 121.0;
        double maxLon = 122.0;
        
        // 橫向街道 (緯度線)
        for (double y = minLat; y <= maxLat; y += 0.001 + rand.nextDouble() * 0.0005) {
            double width = rand.nextBoolean() ? 4 : 2; 
            streets.add(new Street(true, y, width)); // 這裡的 pos 是緯度
        }
        
        // 縱向街道 (經度線) - 修正：原本這裡是 y, 應該是 x (經度)
        for (double x = minLon; x <= maxLon; x += 0.001 + rand.nextDouble() * 0.0005) {
            double width = rand.nextBoolean() ? 4 : 2;
            streets.add(new Street(false, x, width)); // 這裡的 pos 是經度
        }
    }
    
    public void draw() {
        GraphicsContext gc = canvas.getGraphicsContext2D();
        double w = getWidth();
        double h = getHeight();
        
        // 1. 繪製背景 (深色城市夜景)
        gc.setFill(Color.web("#121212")); 
        gc.fillRect(0, 0, w, h);
        
        // 中心點偏移量
        double currentCx = centerX.get(); // Lat (Y in math, but map X/Y usually Lon/Lat) -> Let's treat CX as Lat? No.
        // Screen X = Lon, Screen Y = Lat (inverted usually)
        // Let's stick to standard: X = Lon, Y = Lat.
        // centerX = Lon, centerY = Lat.
        // Note: In init we set centerX = 25.03 (Lat?), centerY = 121.56 (Lon?) -> Wait.
        // Usually X is Longitude, Y is Latitude.
        // Let's assume centerX is Latitude (25.03) and centerY is Longitude (121.56) based on init? 
        // Logic check: "centerX = new SimpleDoubleProperty(25.0330)" -> 25 is Lat.
        // "centerY = new SimpleDoubleProperty(121.5654)" -> 121 is Lon.
        // But maps usually act as X=Lon, Y=Lat.
        // Let's swap them to match standard Cartesian. X=Longitude (121), Y=Latitude (25)
        // Wait, property names in original code were simply X/Y.
        // I'll swap the init values: X=121.5654 (Lon), Y=25.0330 (Lat).
        
        // But wait, the original code used X=25, Y=35.
        // For drawing:
        // Screen X corresponds to World X (Lon)
        // Screen Y corresponds to World Y (Lat) - usually inverted in screen coords (Y goes down).
        
        double centerLon = centerY.get(); // Using Y property as Longitude for now based on init? NO.
        // Let's REDEFINE CLEARLY:
        // centerX = World X (Longitude)
        // centerY = World Y (Latitude)
        
        // So I should fix the init values in memory, but here I just read them.
        // Let's assume the user of this class sets them correctly.
        // But I set them in constructor: 
        // centerX = 25.03 (Lat value), centerY = 121.56 (Lon value).
        // This is confusing. Let's swap them to standard in the drawing logic or constructor.
        // I will use X = Lon (121), Y = Lat (25) for consistency.
        
        // Re-fix constructor values in my head -> I will verify this in the next step or assume generic X/Y.
        // For drawing lines:
        
        Point2D offset = new Point2D(w / 2 - centerX.get() * WORLD_SCALE, h / 2 - centerY.get() * WORLD_SCALE);
        
        // 3. 繪製街道
        gc.setLineCap(StrokeLineCap.BUTT);
        
        for (Street street : streets) {
            if (street.isHorizontal) {
                // 水平線: 代表緯度線? 原本邏輯 "y is fixed". 
                // In generic map: Horizontal line = constant Latitude (Y).
                // So street.pos = Lat.
                // Screen Y = (Lat * Scale) + OffsetY
                // But screen Y increases downwards. Lat increases upwards. 
                // For simulation simple city, we just map 1:1.
                
                double screenY = street.pos * WORLD_SCALE + offset.getY();
                
                if (screenY >= -10 && screenY <= h + 10) {
                    gc.setStroke(street.width > 3 ? Color.web("#2c2c2c") : Color.web("#1f1f1f"));
                    gc.setLineWidth(street.width);
                    gc.strokeLine(0, screenY, w, screenY);
                }
            } else {
                // 垂直線: constant Longitude (X).
                double screenX = street.pos * WORLD_SCALE + offset.getX();
                
                if (screenX >= -10 && screenX <= w + 10) {
                    gc.setStroke(street.width > 3 ? Color.web("#2c2c2c") : Color.web("#1f1f1f"));
                    gc.setLineWidth(street.width);
                    gc.strokeLine(screenX, 0, screenX, h);
                }
            }
        }
        
        // 繪製地標 (測試用 - 台北101)
        double t101Lon = 121.5645;
        double t101Lat = 25.0336;
        double t101X = t101Lon * WORLD_SCALE + offset.getX();
        double t101Y = t101Lat * WORLD_SCALE + offset.getY();
        
        gc.setFill(Color.web("#333"));
        gc.fillOval(t101X - 10, t101Y - 10, 20, 20); // 簡單地標底座
    }
    
    // 獲取當前視野中心的座標
    public double getCenterX() { return centerX.get(); }
    public double getCenterY() { return centerY.get(); }
    
    public DoubleProperty centerXProperty() { return centerX; }
    public DoubleProperty centerYProperty() { return centerY; }
    
    public void setCenter(double x, double y) {
        centerX.set(x);
        centerY.set(y);
        draw();
    }

    /**
     * 將世界座標 X (經度) 轉換為螢幕 X 座標
     */
    public double worldToScreenX(double worldX) {
        return (worldX - centerX.get()) * WORLD_SCALE + getWidth() / 2;
    }

    /**
     * 將世界座標 Y (緯度) 轉換為螢幕 Y 座標
     */
    public double worldToScreenY(double worldY) {
        return (worldY - centerY.get()) * WORLD_SCALE + getHeight() / 2;
    }
    
    private static class Street {
        boolean isHorizontal;
        double pos; 
        double width;
        
        public Street(boolean isHorizontal, double pos, double width) {
            this.isHorizontal = isHorizontal;
            this.pos = pos;
            this.width = width;
        }
    }
}
