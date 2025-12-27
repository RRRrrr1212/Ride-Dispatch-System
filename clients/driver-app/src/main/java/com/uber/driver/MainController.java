package com.uber.driver;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.uber.client.api.ApiClient;
import com.uber.client.model.*;
import com.uber.client.util.SimulatedMap;
import com.uber.client.util.Theme;
import com.uber.client.util.UIUtils;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.util.Duration;

import java.util.List;
import java.util.Map;

/**
 * 司機端主控制器 - Uber 風格現代 UI (含地圖)
 */
public class MainController {
    
    private final StackPane root;
    private final ApiClient apiClient;
    private final ObjectMapper objectMapper;
    
    private Driver currentDriver;
    private Order currentOrder;
    private Timeline pollingTimeline;
    private VehicleType selectedVehicleType = VehicleType.STANDARD;
    
    // UI 模式
    private enum ViewMode { LOGIN, DASHBOARD, ON_TRIP }
    private ViewMode currentMode = ViewMode.LOGIN;
    
    // 元件
    private SimulatedMap map;
    private StackPane contentLayer; // UI浮層
    
    // Login Components
    private TextField driverIdField;
    private TextField nameField;
    private TextField phoneField;
    private TextField vehiclePlateField;
    private Label locationPreviewLabel;
    private VBox vehicleSelectionBox;
    private Button registerBtn;
    
    // Dashboard Components
    private VBox dashboardUi;
    private ToggleButton onlineToggle;
    private VBox offersList;
    private Label statusLabel;
    
    // Trip Components
    private VBox tripUi;
    private Label tripStatusLabel;
    private Button tripActionBtn;
    
    // 司機位置
    private double currentX = 25.0;
    private double currentY = 35.0;
    
    public MainController() {
        this.apiClient = new ApiClient();
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.root = new StackPane();
        this.root.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        initUI();
    }
    
    public StackPane getRoot() { return root; }
    
    private void initUI() {
        // 1. 底層地圖
        map = new SimulatedMap();
        map.setCenter(currentX, currentY);
        
        // 監聽地圖移動 (在登入模式下更新初始位置)
        map.centerXProperty().addListener((obs, old, val) -> {
            if (currentMode == ViewMode.LOGIN) {
                currentX = val.doubleValue();
                currentY = map.getCenterY();
                updateLocationPreview();
            }
        });
        map.centerYProperty().addListener((obs, old, val) -> {
            if (currentMode == ViewMode.LOGIN) {
                currentY = val.doubleValue();
                currentX = map.getCenterX();
                updateLocationPreview();
            }
        });
        
        // 2. 內容層 (UI)
        contentLayer = new StackPane();
        contentLayer.setPickOnBounds(false); // 允許點擊穿透到地圖
        
        root.getChildren().addAll(map, contentLayer);
        
        showLoginView();
    }
    
    // ==========================================
    // 1. 登入/註冊畫面
    // ==========================================
    
    private void showLoginView() {
        currentMode = ViewMode.LOGIN;
        contentLayer.getChildren().clear();
        
        // 中間的大頭針
        Label pin = new Label("📍");
        pin.setFont(Font.font(48));
        pin.setTranslateY(-24);
        
        // 登入表單 (左側或浮動) - 手機版用全屏滾動
        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setFitToWidth(true);
        scrollPane.setStyle("-fx-background: transparent; -fx-background-color: transparent;");
        
        VBox form = new VBox(15);
        form.setPadding(new Insets(20));
        form.setStyle("-fx-background-color: rgba(18, 18, 18, 0.95); -fx-background-radius: 10;");
        form.setMaxWidth(360);
        StackPane.setAlignment(form, Pos.CENTER);
        
        Label title = new Label("司機註冊");
        title.setTextFill(Color.WHITE);
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 24));
        
        Label subTitle = new Label("開始接單賺錢");
        subTitle.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        
        // 輸入框
        driverIdField = createInput("driver-" + System.currentTimeMillis() % 1000, "司機編號");
        nameField = createInput("王司機", "姓名");
        phoneField = createInput("0912-345-678", "電話");
        vehiclePlateField = createInput("ABC-1234", "車牌號碼");
        
        // 車種選擇
        vehicleSelectionBox = createVehicleSelection();
        
        // 位置預覽
        VBox locBox = new VBox(5);
        Label locTitle = new Label("初始位置 (拖動地圖選擇)");
        locTitle.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        locationPreviewLabel = new Label("X: 25, Y: 35");
        locationPreviewLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        locationPreviewLabel.setFont(Font.font(16));
        locBox.getChildren().addAll(locTitle, locationPreviewLabel);
        
        // 註冊按鈕
        registerBtn = new Button("註冊並上線");
        registerBtn.setStyle(Theme.getPrimaryButtonStyle());
        registerBtn.setMaxWidth(Double.MAX_VALUE);
        registerBtn.setOnAction(e -> registerDriver());
        
        form.getChildren().addAll(
            title, subTitle, 
            new Separator(),
            label("司機編號"), driverIdField,
            label("姓名"), nameField,
            label("電話"), phoneField,
            label("車牌號碼"), vehiclePlateField,
            label("車種"), vehicleSelectionBox,
            new Separator(),
            locBox,
            registerBtn
        );
        
        scrollPane.setContent(new StackPane(form)); // Centering
        
        contentLayer.getChildren().addAll(pin, scrollPane);
        
        // 初始更新預覽
        updateLocationPreview();
    }
    
    private TextField createInput(String defaultVal, String prompt) {
        TextField tf = new TextField(defaultVal);
        tf.setPromptText(prompt);
        tf.setStyle("-fx-background-color: #333; -fx-text-fill: white; -fx-padding: 10; -fx-background-radius: 5;");
        return tf;
    }
    
    private Label label(String text) {
        Label l = new Label(" " + text); // icon placeholder
        l.setTextFill(Color.web(Theme.TEXT_TERTIARY));
        return l;
    }
    
    private VBox createVehicleSelection() {
        VBox box = new VBox(10);
        HBox row = new HBox(10);
        row.setAlignment(Pos.CENTER);
        
        row.getChildren().addAll(
            createVehicleOption("🚗\n菁英", VehicleType.STANDARD),
            createVehicleOption("🚘\n尊榮", VehicleType.PREMIUM),
            createVehicleOption("🚐\n大型", VehicleType.XL)
        );
        box.getChildren().add(row);
        return box;
    }
    
    private ToggleButton createVehicleOption(String text, VehicleType type) {
        ToggleButton btn = new ToggleButton(text);
        btn.setPrefSize(80, 80);
        btn.setStyle(type == selectedVehicleType ? 
            "-fx-background-color: #333; -fx-text-fill: white; -fx-border-color: " + Theme.UBER_GREEN + "; -fx-border-width: 2; -fx-border-radius: 8;" :
            "-fx-background-color: #222; -fx-text-fill: gray; -fx-background-radius: 8;");
        
        btn.setOnAction(e -> {
            selectedVehicleType = type;
            // 更新其他按鈕樣式 (簡化處理：重新構建或遍歷)
            ((HBox)btn.getParent()).getChildren().forEach(n -> {
                ToggleButton tb = (ToggleButton)n;
                boolean selected = tb == btn;
                tb.setStyle(selected ? 
                    "-fx-background-color: #333; -fx-text-fill: white; -fx-border-color: " + Theme.UBER_GREEN + "; -fx-border-width: 2; -fx-border-radius: 8;" :
                    "-fx-background-color: #222; -fx-text-fill: gray; -fx-background-radius: 8;");
            });
        });
        
        if (type == selectedVehicleType) btn.setSelected(true);
        return btn;
    }
    
    private void updateLocationPreview() {
        locationPreviewLabel.setText(String.format("X: %.1f  Y: %.1f", currentX, currentY));
    }
    
    // ==========================================
    // 2. 註冊邏輯
    // ==========================================
    
    private void registerDriver() {
        String id = driverIdField.getText();
        String name = nameField.getText();
        
        registerBtn.setDisable(true);
        registerBtn.setText("註冊中...");
        
        apiClient.registerDriver(id, name, phoneField.getText(), vehiclePlateField.getText(), selectedVehicleType)
            .whenComplete((res, err) -> {
                Platform.runLater(() -> {
                    if (err != null || !res.isSuccess()) {
                        UIUtils.showError("註冊失敗", err != null ? err.getMessage() : res.getErrorMessage());
                        registerBtn.setDisable(false);
                        registerBtn.setText("註冊並上線");
                    } else {
                        currentDriver = res.getData();
                        goOnline();
                    }
                });
            });
    }
    
    private void goOnline() {
        Location loc = new Location(currentX, currentY);
        apiClient.goOnline(currentDriver.getDriverId(), loc)
            .whenComplete((res, err) -> {
                Platform.runLater(() -> {
                    if (res != null && res.isSuccess()) {
                        currentDriver = res.getData(); // 更新狀態
                        showDashboardView();
                    } else {
                        UIUtils.showError("上線失敗", res != null ? res.getErrorMessage() : "網路錯誤");
                    }
                });
            });
    }
    
    // ==========================================
    // 3. 儀表板視圖
    // ==========================================
    
    private void showDashboardView() {
        currentMode = ViewMode.DASHBOARD;
        contentLayer.getChildren().clear();
        
        // 頂部狀態欄
        HBox topBar = new HBox(15);
        topBar.setStyle("-fx-background-color: rgba(0,0,0,0.8); -fx-padding: 15;");
        topBar.setAlignment(Pos.CENTER_LEFT);
        
        statusLabel = new Label("🟢 線上");
        statusLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        statusLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        onlineToggle = new ToggleButton("下線");
        onlineToggle.setStyle("-fx-background-color: #333; -fx-text-fill: white;");
        onlineToggle.setOnAction(e -> toggleOnlineStatus());
        
        topBar.getChildren().addAll(statusLabel, spacer, onlineToggle);
        
        // 底部接單列表
        offersList = new VBox(10);
        offersList.setPadding(new Insets(10));
        offersList.setStyle("-fx-background-color: rgba(20, 20, 20, 0.9); -fx-background-radius: 15 15 0 0;");
        offersList.setMinHeight(200);
        
        Label listTitle = new Label("尋找訂單中...");
        listTitle.setTextFill(Color.WHITE);
        offersList.getChildren().add(listTitle);
        
        // 布局
        BorderPane layout = new BorderPane();
        layout.setTop(topBar);
        layout.setBottom(offersList);
        layout.setPickOnBounds(false); // 讓中間可透視地圖
        
        // 司機車輛標記 (固定在中心)
        Label carIcon = new Label("🚘");
        carIcon.setFont(Font.font(36));
        carIcon.setTranslateY(-18);
        
        contentLayer.getChildren().addAll(layout, carIcon);
        
        startPolling();
    }
    
    private void toggleOnlineStatus() {
        if (currentDriver.getStatus() == DriverStatus.ONLINE) {
            apiClient.goOffline(currentDriver.getDriverId()).thenAccept(res -> {
                Platform.runLater(() -> {
                    if (res.isSuccess()) {
                        currentDriver = res.getData();
                        statusLabel.setText("🔴 離線");
                        statusLabel.setTextFill(Color.RED);
                        onlineToggle.setText("上線");
                        stopPolling();
                    }
                });
            });
        } else {
            Location loc = new Location(currentX, currentY);
            apiClient.goOnline(currentDriver.getDriverId(), loc).thenAccept(res -> {
                Platform.runLater(() -> {
                    if (res.isSuccess()) {
                        currentDriver = res.getData();
                        statusLabel.setText("🟢 線上");
                        statusLabel.setTextFill(Color.web(Theme.UBER_GREEN));
                        onlineToggle.setText("下線");
                        startPolling();
                    }
                });
            });
        }
    }
    
    // ==========================================
    // 4. 訂單輪詢與處理
    // ==========================================
    
    private void startPolling() {
        if (pollingTimeline != null) pollingTimeline.stop();
        pollingTimeline = new Timeline(new KeyFrame(Duration.seconds(2), e -> pollData()));
        pollingTimeline.setCycleCount(Timeline.INDEFINITE);
        pollingTimeline.play();
    }
    
    private void stopPolling() {
        if (pollingTimeline != null) pollingTimeline.stop();
    }
    
    private void pollData() {
        if (currentDriver.getStatus() != DriverStatus.ONLINE) return;
        
        if (currentOrder == null) {
            // 輪詢新訂單
            apiClient.getOffers(currentDriver.getDriverId()).thenAccept(res -> {
                Platform.runLater(() -> {
                    if (res.isSuccess() && res.getData() != null) {
                        updateOffersList(res.getData());
                    }
                });
            });
        } else {
            // 輪詢當前訂單狀態
            apiClient.getOrder(currentOrder.getOrderId()).thenAccept(res -> {
                Platform.runLater(() -> {
                    if (res.isSuccess()) {
                        currentOrder = res.getData();
                        updateTripView();
                    }
                });
            });
        }
    }
    
    private void updateOffersList(Map<String, Object> data) {
        offersList.getChildren().clear();
        Label title = new Label("附近的訂單");
        title.setTextFill(Color.WHITE);
        title.setFont(Font.font(16));
        offersList.getChildren().add(title);
        
        List<Map<String, Object>> offers = (List<Map<String, Object>>) data.get("offers");
        if (offers == null || offers.isEmpty()) {
            offersList.getChildren().add(new Label("暫無訂單..."));
            return;
        }
        
        for (Map<String, Object> offer : offers) {
            String orderId = (String) offer.get("orderId");
            Map<String, Double> pickup = (Map<String, Double>) offer.get("pickup");
            // 顯示訂單卡片
            HBox card = new HBox(10);
            card.setStyle("-fx-background-color: #333; -fx-padding: 10; -fx-background-radius: 8;");
            card.setAlignment(Pos.CENTER_LEFT);
            
            VBox info = new VBox(2);
            Label dist = new Label(String.format("距離您 %.1f km", calculateDistance(pickup.get("x"), pickup.get("y"))));
            dist.setTextFill(Color.WHITE);
            Label fare = new Label("預估行程費: $" + offer.get("fare"));
            fare.setTextFill(Color.web(Theme.UBER_GREEN));
            
            info.getChildren().addAll(dist, fare);
            
            Region spacer = new Region();
            HBox.setHgrow(spacer, Priority.ALWAYS);
            
            Button acceptBtn = new Button("接單");
            acceptBtn.setStyle("-fx-background-color: " + Theme.UBER_GREEN + "; -fx-text-fill: white;");
            acceptBtn.setOnAction(e -> acceptOrder(orderId));
            
            card.getChildren().addAll(info, spacer, acceptBtn);
            offersList.getChildren().add(card);
        }
    }
    
    private double calculateDistance(double tx, double ty) {
        return Math.sqrt(Math.pow(tx - currentX, 2) + Math.pow(ty - currentY, 2));
    }
    
    private void acceptOrder(String orderId) {
        apiClient.acceptOrder(orderId, currentDriver.getDriverId()).thenAccept(res -> {
            Platform.runLater(() -> {
                if (res.isSuccess()) {
                    currentOrder = res.getData();
                    showTripView();
                } else {
                    UIUtils.showError("接單失敗", res.getErrorMessage());
                }
            });
        });
    }
    
    // ==========================================
    // 5. 行程視圖
    // ==========================================
    
    private void showTripView() {
        currentMode = ViewMode.ON_TRIP;
        contentLayer.getChildren().clear();
        
        // 行程面板 (底部)
        tripUi = new VBox(15);
        tripUi.setPadding(new Insets(20));
        tripUi.setStyle("-fx-background-color: " + Theme.BG_CARD + "; -fx-background-radius: 20 20 0 0;");
        
        tripStatusLabel = new Label("前往接乘客");
        tripStatusLabel.setFont(Font.font(20));
        tripStatusLabel.setTextFill(Color.WHITE);
        
        tripActionBtn = new Button("抵達上車點"); // 簡化流程: 直接開始行程
        tripActionBtn.setText("開始行程");
        tripActionBtn.setStyle(Theme.getPrimaryButtonStyle());
        tripActionBtn.setMaxWidth(Double.MAX_VALUE);
        tripActionBtn.setOnAction(e -> handleTripAction());
        
        tripUi.getChildren().addAll(tripStatusLabel, tripActionBtn);
        
        BorderPane layout = new BorderPane();
        layout.setBottom(tripUi);
        layout.setPickOnBounds(false);
        
        contentLayer.getChildren().add(layout);
        
        // 在地圖上繪製導航線 (這需要訪問地圖的 Canvas，暫時省略，只更新文字)
    }
    
    private void updateTripView() {
        if (currentOrder == null) return;
        
        switch (currentOrder.getStatus()) {
            case ONGOING:
                tripStatusLabel.setText("行程中 - 前往目的地");
                tripActionBtn.setText("完成行程");
                break;
            case COMPLETED:
                UIUtils.showInfo("行程結束", "獲得車資: " + currentOrder.getActualFare());
                currentOrder = null;
                showDashboardView(); // 回到儀表板
                break;
            case CANCELLED:
                UIUtils.showInfo("訂單已取消", "乘客已取消訂單");
                currentOrder = null;
                showDashboardView();
                break;
        }
    }
    
    private void handleTripAction() {
        if (currentOrder.getStatus() == OrderStatus.ACCEPTED) {
            // 開始行程
            apiClient.startTrip(currentOrder.getOrderId(), currentDriver.getDriverId())
                .thenAccept(res -> Platform.runLater(() -> updateTripView()));
        } else if (currentOrder.getStatus() == OrderStatus.ONGOING) {
            // 完成行程
            apiClient.completeTrip(currentOrder.getOrderId(), currentDriver.getDriverId())
                .thenAccept(res -> Platform.runLater(() -> updateTripView()));
        }
    }
    
    public void shutdown() {
        stopPolling();
    }
}
