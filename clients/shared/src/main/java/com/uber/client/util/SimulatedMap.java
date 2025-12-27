package com.uber.client.util;

import javafx.beans.property.DoubleProperty;
import javafx.beans.property.SimpleDoubleProperty;
import javafx.geometry.Point2D;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.paint.CycleMethod;
import javafx.scene.paint.LinearGradient;
import javafx.scene.paint.Stop;
import javafx.scene.shape.StrokeLineCap;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * 模擬地圖元件 - 提供真實的地圖拖曳體驗
 * 自動生成城市街道網格，支援平移
 */
public class SimulatedMap extends Pane {
    
    private final Canvas canvas;
    private final DoubleProperty centerX = new SimpleDoubleProperty(50.0); // 地圖中心對應的虛擬 X 座標
    private final DoubleProperty centerY = new SimpleDoubleProperty(50.0); // 地圖中心對應的虛擬 Y 座標
    
    private double lastMouseX;
    private double lastMouseY;
    private boolean isDragging = false;
    
    // 預先生成的街道數據
    private final List<Street> streets = new ArrayList<>();
    
    // 虛擬世界尺寸
    private static final double WORLD_SCALE = 20.0; // 每個座標單位對應的像素
    
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
            isDragging = true;
            this.setCursor(javafx.scene.Cursor.CLOSED_HAND);
        });
        
        canvas.setOnMouseDragged(e -> {
            if (isDragging) {
                double dx = e.getX() - lastMouseX;
                double dy = e.getY() - lastMouseY;
                
                // 移動地圖中心 (反向移動)
                // dx 像素 -> dx / SCALE 座標單位
                centerX.set(centerX.get() - dx / WORLD_SCALE);
                centerY.set(centerY.get() - dy / WORLD_SCALE);
                
                lastMouseX = e.getX();
                lastMouseY = e.getY();
                draw();
            }
        });
        
        canvas.setOnMouseReleased(e -> {
            isDragging = false;
            this.setCursor(javafx.scene.Cursor.DEFAULT);
        });
    }
    
    private void generateStreets() {
        Random rand = new Random(12345); // 固定種子，保證每次地圖一樣
        
        // 生成水平街道
        for (int y = -500; y <= 500; y += 10 + rand.nextInt(5)) {
            double width = rand.nextBoolean() ? 4 : 2; // 主幹道 vs 小路
            streets.add(new Street(true, y, width));
        }
        
        // 生成垂直街道
        for (int x = -500; x <= 500; x += 10 + rand.nextInt(5)) {
            double width = rand.nextBoolean() ? 4 : 2;
            streets.add(new Street(false, x, width));
        }
    }
    
    public void draw() {
        GraphicsContext gc = canvas.getGraphicsContext2D();
        double w = getWidth();
        double h = getHeight();
        
        // 1. 繪製背景 (深色城市夜景)
        gc.setFill(Color.web("#121212")); // 非常深的灰色
        gc.fillRect(0, 0, w, h);
        
        // 2. 座標轉換
        // 螢幕中心 (w/2, h/2) 對應 (centerX, centerY)
        // 螢幕座標 (sx, sy) -> 世界座標 (wx, wy)
        // wx = centerX + (sx - w/2) / SCALE
        
        double currentCx = centerX.get();
        double currentCy = centerY.get();
        Point2D offset = new Point2D(w / 2 - currentCx * WORLD_SCALE, h / 2 - currentCy * WORLD_SCALE);
        
        // 3. 繪製街道
        gc.setLineCap(StrokeLineCap.BUTT);
        
        for (Street street : streets) {
            if (street.isHorizontal) {
                // 水平線: y 是固定的世界座標
                double screenY = street.pos * WORLD_SCALE + offset.getY();
                
                // 優化：只繪製可見區域
                if (screenY >= -10 && screenY <= h + 10) {
                    gc.setStroke(street.width > 3 ? Color.web("#2c2c2c") : Color.web("#1f1f1f"));
                    gc.setLineWidth(street.width);
                    gc.strokeLine(0, screenY, w, screenY);
                }
            } else {
                // 垂直線
                double screenX = street.pos * WORLD_SCALE + offset.getX();
                
                if (screenX >= -10 && screenX <= w + 10) {
                    gc.setStroke(street.width > 3 ? Color.web("#2c2c2c") : Color.web("#1f1f1f"));
                    gc.setLineWidth(street.width);
                    gc.strokeLine(screenX, 0, screenX, h);
                }
            }
        }
        
        // 4. 繪製一些隨機建築區塊 (增加真實感)
        // 這裡可以根據簡單算法填充街區顏色
        
        // 5. 繪製虛擬GPS精度圈效果
        if (isDragging) {
            // 這種效果讓移動時更有動感
        }
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
    
    private static class Street {
        boolean isHorizontal;
        double pos; // 座標位置
        double width;
        
        public Street(boolean isHorizontal, double pos, double width) {
            this.isHorizontal = isHorizontal;
            this.pos = pos;
            this.width = width;
        }
    }
}
