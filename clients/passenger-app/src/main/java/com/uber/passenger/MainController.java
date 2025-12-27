package com.uber.passenger;

import com.uber.client.api.ApiClient;
import com.uber.client.model.*;
import com.uber.client.util.SimulatedMap;
import com.uber.client.util.Theme;
import javafx.animation.*;
import javafx.application.Platform;
import javafx.beans.binding.Bindings;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.geometry.Side;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.util.Duration;

public class MainController {
    
    private final StackPane root;
    private final ApiClient apiClient;
    private String passengerId;
    
    // 狀態管理
    private SimulatedMap map;
    private boolean isSelectingPickup = true; // true: 正在選上車點, false: 選下車點
    private boolean isInLocationSelectionMode = false;
    
    // 數據模型
    private final double[] pickupLocation = new double[]{25.0, 35.0};
    private final double[] dropoffLocation = new double[]{0.0, 0.0};
    private VehicleType selectedVehicleType = VehicleType.STANDARD;
    private Order currentOrder;
    private Timeline pollingTimeline;
    
    // UI 元件引用
    private StackPane loginView;
    private StackPane mainView;
    private VBox bottomSheet;
    private TextField pickupInput;
    private TextField dropoffInput;
    private Label estimatedFareLabel;
    private Button confirmLocationBtn;
    private VBox vehicleSelectionBox;
    private Button requestRideBtn;
    
    // 模擬地址
    private String pickupAddress = "正在獲取位置...";
    private String dropoffAddress = "";

    public MainController() {
        this.apiClient = new ApiClient();
        this.root = new StackPane();
        this.root.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        initLoginView();
        // 初始只顯示登入頁面
        root.getChildren().add(loginView);
    }
    
    public StackPane getRoot() { return root; }
    
    public void shutdown() {
        if (pollingTimeline != null) pollingTimeline.stop();
    }
    
    // ==========================================
    // 1. 登入視圖
    // ==========================================
    
    private void initLoginView() {
        loginView = new StackPane();
        loginView.setStyle("-fx-background-color: Black;");
        
        VBox content = new VBox(30);
        content.setAlignment(Pos.CENTER);
        content.setPadding(new Insets(40));
        
        Label logo = new Label("Uber");
        logo.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 48));
        logo.setTextFill(Color.WHITE);
        
        VBox inputGroup = new VBox(10);
        Label phoneLabel = new Label("輸入您的手機號碼");
        phoneLabel.setTextFill(Color.WHITE);
        phoneLabel.setFont(Font.font("Microsoft JhengHei", 16));
        
        TextField phoneField = new TextField();
        phoneField.setPromptText("0912-345-678");
        phoneField.setStyle("""
            -fx-background-color: #2A2A2A;
            -fx-text-fill: white;
            -fx-font-size: 18px;
            -fx-padding: 15;
            -fx-background-radius: 8;
        """);
        
        Button loginBtn = new Button("繼續");
        loginBtn.setStyle(Theme.getPrimaryButtonStyle());
        loginBtn.setMaxWidth(Double.MAX_VALUE);
        loginBtn.setOnAction(e -> {
            if (!phoneField.getText().isEmpty()) {
                performLogin(phoneField.getText());
            }
        });
        
        inputGroup.getChildren().addAll(phoneLabel, phoneField);
        content.getChildren().addAll(logo, inputGroup, loginBtn);
        
        loginView.getChildren().add(content);
    }
    
    private void performLogin(String phone) {
        // 模擬登入
        this.passengerId = "passenger-" + phone;
        
        // 切換到主畫面
        initMainView();
        root.getChildren().clear();
        root.getChildren().add(mainView);
    }
    
    // ==========================================
    // 2. 主視圖 (地圖 + UI)
    // ==========================================
    
    private void initMainView() {
        mainView = new StackPane();
        
        // 1. 底層地圖
        map = new SimulatedMap();
        
        // 監聽地圖移動，更新地址顯示
        map.centerXProperty().addListener((obs, old, val) -> updateAddressFromMap());
        map.centerYProperty().addListener((obs, old, val) -> updateAddressFromMap());
        
        // 設定初始位置
        map.setCenter(pickupLocation[0], pickupLocation[1]);
        
        // 2. 地圖中心標記 (大頭針)
        Label pin = new Label("📍");
        pin.setFont(Font.font(48));
        pin.setPickOnBounds(false); // 讓點擊穿透到地圖
        pin.setTranslateY(-24); // 讓針尖對準中心
        
        // 3. UI 層
        BorderPane uiLayer = new BorderPane();
        uiLayer.setPickOnBounds(false); // 讓空白處點擊穿透到地圖
        
        // 頂部導航
        HBox navbar = createNavbar();
        uiLayer.setTop(navbar);
        
        // 底部面板
        bottomSheet = createBottomSheet();
        uiLayer.setBottom(bottomSheet);
        
        // 4. "確認位置" 按鈕 (僅在選點模式顯示)
        confirmLocationBtn = new Button("確認位置");
        confirmLocationBtn.setStyle(Theme.getPrimaryButtonStyle());
        confirmLocationBtn.setMaxWidth(200);
        confirmLocationBtn.setVisible(false);
        confirmLocationBtn.setOnAction(e -> confirmLocationSelection());
        
        StackPane.setAlignment(confirmLocationBtn, Pos.BOTTOM_CENTER);
        StackPane.setMargin(confirmLocationBtn, new Insets(0, 0, 100, 0));
        
        mainView.getChildren().addAll(map, pin, uiLayer, confirmLocationBtn);
    }
    
    private HBox createNavbar() {
        HBox navbar = new HBox();
        navbar.setPadding(new Insets(15, 20, 15, 20));
        
        Button menuBtn = new Button("☰");
        menuBtn.setStyle("-fx-background-color: white; -fx-background-radius: 20; -fx-min-width: 40; -fx-min-height: 40; -fx-font-size: 18; -fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.2), 5, 0, 0, 2);");
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        Label logo = new Label("Uber");
        logo.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 20));
        logo.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.5), 2, 0, 0, 1);");
        logo.setTextFill(Color.WHITE);
        
        navbar.getChildren().addAll(menuBtn, spacer, logo);
        return navbar;
    }
    
    private VBox createBottomSheet() {
        VBox sheet = new VBox(15);
        sheet.setPadding(new Insets(20));
        sheet.setStyle("-fx-background-color: " + Theme.BG_CARD + "; -fx-background-radius: 20 20 0 0; -fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.3), 10, 0, 0, -5);");
        sheet.setMaxHeight(400);
        
        // 裝飾性把手
        Region handle = new Region();
        handle.setMinSize(40, 4);
        handle.setMaxSize(40, 4);
        handle.setStyle("-fx-background-color: #444; -fx-background-radius: 2;");
        StackPane handleContainer = new StackPane(handle);
        handleContainer.setPadding(new Insets(0, 0, 10, 0));
        
        // 上車/下車 輸入框容器
        VBox locationBox = new VBox(10);
        
        // 上車點
        HBox pickupRow = new HBox(10);
        pickupRow.setAlignment(Pos.CENTER_LEFT);
        Circle pickupDot = new Circle(4, Color.web(Theme.UBER_GREEN));
        pickupInput = new TextField();
        pickupInput.setPromptText("設定上車地點");
        pickupInput.setText(pickupAddress);
        pickupInput.setEditable(false); // 只能通過地圖選擇
        pickupInput.setStyle(getInputStyle());
        HBox.setHgrow(pickupInput, Priority.ALWAYS);
        // 點擊進入選點模式
        pickupInput.setOnMouseClicked(e -> startLocationSelection(true));
        pickupRow.getChildren().addAll(pickupDot, pickupInput);
        
        // 連接線
        Line connector = new Line(0, 0, 0, 10);
        connector.setStroke(Color.GRAY);
        connector.setStrokeWidth(1);
        VBox connectorBox = new VBox(connector);
        connectorBox.setPadding(new Insets(0, 0, 0, 4));
        
        // 下車點
        HBox dropoffRow = new HBox(10);
        dropoffRow.setAlignment(Pos.CENTER_LEFT);
        Circle dropoffDot = new Circle(4, Color.WHITE); // 方塊用圓形代替
        dropoffInput = new TextField();
        dropoffInput.setPromptText("去哪裡？");
        dropoffInput.setStyle(getInputStyle());
        dropoffInput.setEditable(false);
        HBox.setHgrow(dropoffInput, Priority.ALWAYS);
        dropoffInput.setOnMouseClicked(e -> startLocationSelection(false));
        dropoffRow.getChildren().addAll(dropoffDot, dropoffInput);
        
        locationBox.getChildren().addAll(pickupRow, dropoffRow);
        
        // 車種選擇 (隱藏直到選好地點)
        vehicleSelectionBox = createVehicleSelection();
        vehicleSelectionBox.setVisible(false);
        vehicleSelectionBox.setManaged(false);
        
        // 叫車按鈕
        requestRideBtn = new Button("確認叫車");
        requestRideBtn.setStyle(Theme.getPrimaryButtonStyle());
        requestRideBtn.setMaxWidth(Double.MAX_VALUE);
        requestRideBtn.setVisible(false);
        requestRideBtn.setManaged(false);
        requestRideBtn.setOnAction(e -> requestRide());
        
        sheet.getChildren().addAll(handleContainer, locationBox, vehicleSelectionBox, requestRideBtn);
        return sheet;
    }
    
    private VBox createVehicleSelection() {
        VBox box = new VBox(15);
        
        Label title = new Label("選擇車種");
        title.setTextFill(Color.WHITE);
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        
        HBox types = new HBox(10);
        types.setAlignment(Pos.CENTER);
        
        VBox standard = createVehicleCard("🚗", "菁英", VehicleType.STANDARD);
        VBox premium = createVehicleCard("🚘", "尊榮", VehicleType.PREMIUM);
        VBox xl = createVehicleCard("🚐", "大型", VehicleType.XL);
        
        types.getChildren().addAll(standard, premium, xl);
        
        estimatedFareLabel = new Label("預估金額:計算中...");
        estimatedFareLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        estimatedFareLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 18));
        estimatedFareLabel.setAlignment(Pos.CENTER);
        estimatedFareLabel.setMaxWidth(Double.MAX_VALUE);
        
        box.getChildren().addAll(title, types, estimatedFareLabel);
        return box;
    }
    
    private VBox createVehicleCard(String emoji, String name, VehicleType type) {
        VBox card = new VBox(5);
        card.setAlignment(Pos.CENTER);
        card.setPadding(new Insets(10));
        card.setMinWidth(80);
        card.setStyle("-fx-background-color: #333; -fx-background-radius: 8; -fx-cursor: hand;");
        
        Label icon = new Label(emoji);
        icon.setFont(Font.font(24));
        Label typeName = new Label(name);
        typeName.setTextFill(Color.WHITE);
        
        card.getChildren().addAll(icon, typeName);
        
        // 點擊事件
        card.setOnMouseClicked(e -> {
            selectedVehicleType = type;
            calculateEstimate();
            // 簡單的高亮效果
            card.setStyle("-fx-background-color: #444; -fx-border-color: " + Theme.UBER_GREEN + "; -fx-border-radius: 8; -fx-background-radius: 8;");
            // 重置其他卡片樣式 (簡化處理)
            ((HBox)card.getParent()).getChildren().forEach(node -> {
                if (node != card) node.setStyle("-fx-background-color: #333; -fx-background-radius: 8; -fx-cursor: hand;");
            });
        });
        
        return card;
    }
    
    private String getInputStyle() {
        return "-fx-background-color: #333; -fx-text-fill: white; -fx-padding: 10; -fx-background-radius: 5;";
    }
    
    // ==========================================
    // 3. 邏輯處理
    // ==========================================
    
    // 進入選點模式
    private void startLocationSelection(boolean isPickup) {
        isSelectingPickup = isPickup;
        isInLocationSelectionMode = true;
        
        // 隱藏 Bottom Sheet (移出螢幕)
        TranslateTransition tt = new TranslateTransition(Duration.millis(300), bottomSheet);
        tt.setToY(400); // 往下移
        tt.play();
        
        // 顯示確認按鈕
        confirmLocationBtn.setVisible(true);
        confirmLocationBtn.setText(isPickup ? "確認上車地點" : "確認下車地點");
        
        // 移動地圖到上次選擇的位置
        double[] target = isPickup ? pickupLocation : dropoffLocation;
        if (target[0] != 0 || target[1] != 0) {
            map.setCenter(target[0], target[1]);
        }
        
        updateAddressFromMap();
    }
    
    // 確認選點
    private void confirmLocationSelection() {
        isInLocationSelectionMode = false;
        
        // 保存座標
        if (isSelectingPickup) {
            pickupLocation[0] = map.getCenterX();
            pickupLocation[1] = map.getCenterY();
            pickupAddress = generateAddress(pickupLocation[0], pickupLocation[1]);
            pickupInput.setText(pickupAddress);
            
            // 自動進入下車點選擇 (如果是剛設完上車點且下車點未設)
            if (dropoffLocation[0] == 0 && dropoffLocation[1] == 0) {
                // startLocationSelection(false); 
                // 這裡為了演示簡單，讓用戶手動點下車點
            }
        } else {
            dropoffLocation[0] = map.getCenterX();
            dropoffLocation[1] = map.getCenterY();
            dropoffAddress = generateAddress(dropoffLocation[0], dropoffLocation[1]);
            dropoffInput.setText(dropoffAddress);
        }
        
        // 顯示 Bottom Sheet
        TranslateTransition tt = new TranslateTransition(Duration.millis(300), bottomSheet);
        tt.setToY(0);
        tt.play();
        
        confirmLocationBtn.setVisible(false);
        
        // 如果兩點都設好了，顯示車種選單
        if (pickupLocation[0] != 0 && dropoffLocation[0] != 0 && dropoffLocation[1] != 0) {
            vehicleSelectionBox.setVisible(true);
            vehicleSelectionBox.setManaged(true);
            requestRideBtn.setVisible(true);
            requestRideBtn.setManaged(true);
            calculateEstimate();
        }
    }
    
    private void updateAddressFromMap() {
        if (!isInLocationSelectionMode) return;
        
        double x = map.getCenterX();
        double y = map.getCenterY();
        String address = generateAddress(x, y);
        
        // 可以顯示個浮動的提示框顯示當前地址
    }
    
    private String generateAddress(double x, double y) {
        // 生成虛擬地址，讓數字看起來像街道號
        int street = (int) Math.abs(x) + 1;
        int no = (int) Math.abs(y) + 1;
        String district = (x + y) > 50 ? "信義區" : "大安區";
        return String.format("%s 第 %d 街 %d 號", district, street, no);
    }
    
    private void calculateEstimate() {
        if (pickupLocation[0] == 0 || dropoffLocation[0] == 0) return;
        
        double dist = Math.sqrt(Math.pow(pickupLocation[0] - dropoffLocation[0], 2) + 
                               Math.pow(pickupLocation[1] - dropoffLocation[1], 2));
        
        double base = switch(selectedVehicleType) {
            case STANDARD -> 50;
            case PREMIUM -> 100;
            case XL -> 150;
        };
        double perKm = switch(selectedVehicleType) {
            case STANDARD -> 15;
            case PREMIUM -> 25;
            case XL -> 30;
        };
        
        double fare = base + dist * perKm;
        estimatedFareLabel.setText(String.format("預估金額: $%.0f", fare));
    }
    
    private void requestRide() {
        Location pLoc = new Location(pickupLocation[0], pickupLocation[1]);
        pLoc.setAddress(pickupAddress);
        
        Location dLoc = new Location(dropoffLocation[0], dropoffLocation[1]);
        dLoc.setAddress(dropoffAddress);
        
        requestRideBtn.setDisable(true);
        requestRideBtn.setText("正在呼叫司機...");
        
        // 直接使用 apiClient.createOrder
        apiClient.createOrder(passengerId, pLoc, dLoc, selectedVehicleType)
            .whenComplete((res, err) -> {
                Platform.runLater(() -> {
                    if (err != null || !res.isSuccess()) {
                        System.err.println("Order creation failed: " + (err != null ? err.getMessage() : res.getErrorMessage()));
                        new Alert(Alert.AlertType.ERROR, "叫車失敗: " + (res != null ? res.getErrorMessage() : "網路錯誤")).show();
                        requestRideBtn.setDisable(false);
                        requestRideBtn.setText("確認叫車");
                    } else {
                        currentOrder = res.getData();
                        showWaitingView();
                    }
                });
            });
    }
    
    private void showWaitingView() {
        // 簡單切換等待畫面
        VBox waitingBox = new VBox(20);
        waitingBox.setAlignment(Pos.CENTER);
        waitingBox.setStyle("-fx-background-color: rgba(0,0,0,0.8);");
        
        Label status = new Label("正在為您尋找司機...");
        status.setTextFill(Color.WHITE);
        status.setFont(Font.font(20));
        
        ProgressIndicator pi = new ProgressIndicator();
        
        waitingBox.getChildren().addAll(status, pi);
        mainView.getChildren().add(waitingBox);
        
        startPolling();
    }
    
    private void startPolling() {
        pollingTimeline = new Timeline(new KeyFrame(Duration.seconds(2), e -> {
            if (currentOrder != null) {
                apiClient.getOrder(currentOrder.getOrderId()).whenComplete((res, err) -> {
                    if (res != null && res.isSuccess()) {
                        Platform.runLater(() -> checkOrderStatus(res.getData()));
                    }
                });
            }
        }));
        pollingTimeline.setCycleCount(Timeline.INDEFINITE);
        pollingTimeline.play();
    }
    
    private void checkOrderStatus(Order order) {
        if (order.getStatus() == OrderStatus.ACCEPTED) {
            // 司機已接單，顯示司機資訊...
            // 這裡為了簡化，直接 Alert 提示
            if (currentOrder.getStatus() != OrderStatus.ACCEPTED) {
                new Alert(Alert.AlertType.INFORMATION, "司機已接單！").show();
            }
            currentOrder = order;
        }
    }
}
