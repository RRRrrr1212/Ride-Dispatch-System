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
    private TextField loginDriverIdField;
    
    // Register Components
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
    
    // 司機位置 (預設台中市)
    // 注意：SimulatedMap 使用 (Lon, Lat) 作為 (X, Y)
    // 這裡我們定義 currentLon, currentLat 對應 map X, Y
    private double currentLon = 120.6469; // Map X
    private double currentLat = 24.1618;  // Map Y
    
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
        map.setCenter(currentLon, currentLat);
        
        // 監聽地圖移動 (更新本地座標)
        map.centerXProperty().addListener((obs, old, val) -> {
            // Map CenterX is Lon
            if (currentMode == ViewMode.LOGIN) {
                currentLon = val.doubleValue();
                currentLat = map.getCenterY();
                updateLocationPreview();
            }
        });
        map.centerYProperty().addListener((obs, old, val) -> {
            // Map CenterY is Lat
            if (currentMode == ViewMode.LOGIN) {
                currentLat = val.doubleValue();
                currentLon = map.getCenterX();
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
        
        // 使用 TabPane 分換 登入/註冊
        TabPane tabPane = new TabPane();
        tabPane.setStyle("-fx-background-color: rgba(18, 18, 18, 0.95); -fx-background-radius: 10;");
        tabPane.setMaxWidth(360);
        
        // Tab 1: 登入
        Tab loginTab = new Tab("登入");
        loginTab.setClosable(false);
        loginTab.setContent(createLoginContent());
        
        // Tab 2: 註冊
        Tab registerTab = new Tab("註冊");
        registerTab.setClosable(false);
        registerTab.setContent(createRegisterContent());
        
        tabPane.getTabs().addAll(loginTab, registerTab);
        
        StackPane.setAlignment(tabPane, Pos.CENTER);
        scrollPane.setContent(new StackPane(tabPane)); // Centering
        
        contentLayer.getChildren().addAll(pin, scrollPane);
        
        // 初始更新預覽
        updateLocationPreview();
    }
    
    private VBox createLoginContent() {
        VBox content = new VBox(20);
        content.setPadding(new Insets(30));
        content.setAlignment(Pos.CENTER);
        
        Label title = new Label("歡迎回來");
        title.setTextFill(Color.WHITE);
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 24));
        
        loginDriverIdField = createInput("driver-500", "請輸入司機編號");
        
        Button loginBtn = new Button("登入並上線");
        loginBtn.setStyle(Theme.getPrimaryButtonStyle());
        loginBtn.setMaxWidth(Double.MAX_VALUE);
        loginBtn.setOnAction(e -> performLogin());
        
        content.getChildren().addAll(title, label("司機編號"), loginDriverIdField, loginBtn);
        return content;
    }
    
    private VBox createRegisterContent() {
        VBox form = new VBox(15);
        form.setPadding(new Insets(20));
        
        Label title = new Label("成為合作駕駛");
        title.setTextFill(Color.WHITE);
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 24));
        
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
        locationPreviewLabel = new Label("X: --, Y: --");
        locationPreviewLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        locationPreviewLabel.setFont(Font.font(14));
        locBox.getChildren().addAll(locTitle, locationPreviewLabel);
        
        // 註冊按鈕
        registerBtn = new Button("註冊並上線");
        registerBtn.setStyle(Theme.getPrimaryButtonStyle());
        registerBtn.setMaxWidth(Double.MAX_VALUE);
        registerBtn.setOnAction(e -> registerDriver());
        
        form.getChildren().addAll(
            title, 
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
        return form;
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
            // 更新其他按鈕樣式
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
        if (locationPreviewLabel != null) {
            locationPreviewLabel.setText(String.format("Lat: %.4f  Lon: %.4f", currentLat, currentLon));
        }
    }
    
    // ==========================================
    // 2. 註冊/登入邏輯
    // ==========================================
    
    private void performLogin() {
        String driverId = loginDriverIdField.getText();
        if (driverId.isEmpty()) return;
        
        // 這裡模擬登入：直接嘗試上線
        apiClient.getDriver(driverId).whenComplete((res, err) -> {
            Platform.runLater(() -> {
                if (res != null && res.isSuccess()) {
                    currentDriver = res.getData();
                    // 成功獲取資料，嘗試上線
                    goOnline();
                } else {
                    UIUtils.showError("登入失敗", "找不到此司機編號");
                }
            });
        });
    }
    
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
        Location loc = new Location(currentLat, currentLon);
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
            Location loc = new Location(currentLat, currentLon);
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
    
    @SuppressWarnings("unchecked")
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
            double dist = calculateDistance(pickup.get("x"), pickup.get("y"));
            Label distLbl = new Label(String.format("距離您 %.1f km", dist));
            distLbl.setTextFill(Color.WHITE);
            Label fare = new Label("預估行程費: $" + offer.get("fare"));
            fare.setTextFill(Color.web(Theme.UBER_GREEN));
            
            info.getChildren().addAll(distLbl, fare);
            
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
        // 簡單計算
        double dLat = tx - currentLat;
        double dLon = ty - currentLon;
        return Math.sqrt(dLat*dLat + dLon*dLon) * 111.0; 
    }
    
    private void acceptOrder(String orderId) {
        apiClient.acceptOrder(orderId, currentDriver.getDriverId()).thenAccept(res -> {
            Platform.runLater(() -> {
                if (res.isSuccess()) {
                    currentOrder = res.getData();
                    showTripView();
                    // 立即開始模擬前往 "上車點"
                    startMovementSimulation(currentOrder.getPickupLocation());
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
        
        // 顯示乘客上車點地址
        Label addrLabel = new Label("目的地: " + currentOrder.getPickupLocation().getAddress());
        addrLabel.setTextFill(Color.LIGHTGRAY);
        
        tripActionBtn = new Button("抵達上車點"); // 簡化
        tripActionBtn.setText("開始行程");
        tripActionBtn.setStyle(Theme.getPrimaryButtonStyle());
        tripActionBtn.setMaxWidth(Double.MAX_VALUE);
        tripActionBtn.setOnAction(e -> handleTripAction());
        
        tripUi.getChildren().addAll(tripStatusLabel, addrLabel, tripActionBtn);
        
        BorderPane layout = new BorderPane();
        layout.setBottom(tripUi);
        layout.setPickOnBounds(false);
        
        contentLayer.getChildren().add(layout);
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
            default:
                break; // 忽略 PENDING 或其他狀態
        }
    }
    
    private void handleTripAction() {
        if (currentOrder.getStatus() == OrderStatus.ACCEPTED) {
            // 接到乘客 -> 開始行程 (前往目的地)
            apiClient.startTrip(currentOrder.getOrderId(), currentDriver.getDriverId())
                .thenAccept(res -> Platform.runLater(() -> {
                     updateTripView();
                     startMovementSimulation(currentOrder.getDropoffLocation()); // 開始模擬移動到下車點
                }));
        } else if (currentOrder.getStatus() == OrderStatus.ONGOING) {
            // 完成行程
            apiClient.completeTrip(currentOrder.getOrderId(), currentDriver.getDriverId())
                .thenAccept(res -> Platform.runLater(() -> {
                    updateTripView();
                    stopMovementSimulation();
                }));
        }
    }

    // 模擬移動相關
    private Timeline movementTimeline;
    
    private void startMovementSimulation(Location target) {
        if (movementTimeline != null) movementTimeline.stop();
        
        // 簡單模擬：每秒往目標移動一點點
        movementTimeline = new Timeline(new KeyFrame(Duration.seconds(1), e -> {
            // Target Location (Lat, Lon) ? Server Location is (X=Lat, Y=Lon) or (Lon, Lat)? 
            // Previous confusion: Server Location is generic.
            // Let's assume target X, Y matches currentLon, currentLat Logic.
            // If server location is (Lat, Lon) - usually X=Lat, Y=Lon in this project sadly.
            // But we need to check how it's saved.
            // Passenger saved pickupLocation[0] as Lat, [1] as Lon.
            // So target.getX() is Lat, target.getY() is Lon.
            
            // Wait, currentLon is Map X. currentLat is Map Y.
            // We need to move currentLon towards target.getY() (Lon)
            // and currentLat towards target.getX() (Lat)
            
            double dLon = target.getY() - currentLon;
            double dLat = target.getX() - currentLat;
            
            // Re-verify Passenger confirmLocationSelection:
            // "pickupLocation[0] = currentLat; pickupLocation[1] = currentLon;"
            // "Location pLoc = new Location(pickupLocation[0], pickupLocation[1]);"
            // So pLoc.x = Lat, pLoc.y = Lon.
            
            // Correct logic:
            // Move currentLon (X) -> pLoc.y
            // Move currentLat (Y) -> pLoc.x
            
            double dist = Math.sqrt(dLat*dLat + dLon*dLon);
            
            if (dist < 0.0005) { // 到達
                stopMovementSimulation();
                return;
            }
            
            // 移動步長
            double step = 0.001; 
            currentLon += (dLon / dist) * step;
            currentLat += (dLat / dist) * step;
            
            // 更新本地地圖 (Lon, Lat)
            map.setCenter(currentLon, currentLat);
            updateLocationPreview(); 
            
            // 更新後端位置 (Lat, Lon)
            if (currentDriver != null) {
                // Server expects Location(x=Lat, y=Lon)
                apiClient.goOnline(currentDriver.getDriverId(), new Location(currentLat, currentLon));
            }
        }));
        movementTimeline.setCycleCount(Timeline.INDEFINITE);
        movementTimeline.play();
    }
    
    private void stopMovementSimulation() {
        if (movementTimeline != null) movementTimeline.stop();
    }
    
    public void shutdown() {
        stopPolling();
    }
}
