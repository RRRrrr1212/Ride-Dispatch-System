package com.uber.passenger;

import com.uber.client.api.ApiClient;
import com.uber.client.api.ApiResponse;
import com.uber.client.model.*;
import com.uber.client.util.Theme;
import com.uber.client.util.UIUtils;
import javafx.animation.*;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.effect.DropShadow;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Rectangle;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.util.Duration;

/**
 * 乘客端主控制器 - Uber 風格現代 UI
 */
public class MainController {
    
    private final StackPane root;
    private final ApiClient apiClient;
    private final String passengerId;
    
    private Order currentOrder;
    private Timeline pollingTimeline;
    private VehicleType selectedVehicleType = VehicleType.STANDARD;
    
    // Views
    private BorderPane homeView;
    private BorderPane orderView;
    
    // Home View Components
    private TextField pickupXField;
    private TextField pickupYField;
    private TextField dropoffXField;
    private TextField dropoffYField;
    private Label estimatedFareLabel;
    private Button createOrderBtn;
    private VBox standardCard, premiumCard, xlCard;
    
    // Order View Components
    private Label orderStatusLabel;
    private Label driverInfoLabel;
    private Label pickupLabel;
    private Label dropoffLabel;
    private Label fareLabel;
    private HBox progressBox;
    private Button cancelBtn;
    private Button backBtn;
    
    public MainController() {
        this.apiClient = new ApiClient();
        this.passengerId = "passenger-" + System.currentTimeMillis() % 1000;
        this.root = new StackPane();
        
        initUI();
        showHomeView();
    }
    
    public StackPane getRoot() {
        return root;
    }
    
    private void initUI() {
        root.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        createHomeView();
        createOrderView();
    }
    
    // ============================================
    // 首頁視圖 - Uber 風格
    // ============================================
    
    private void createHomeView() {
        homeView = new BorderPane();
        homeView.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 頂部導航列
        HBox navbar = createNavbar();
        homeView.setTop(navbar);
        
        // 地圖區域 + 底部面板
        VBox mainContent = new VBox(0);
        
        // 地圖視覺化區域
        StackPane mapArea = createMapArea();
        
        // 底部面板（可滑動）
        ScrollPane bottomSheet = createBottomSheet();
        VBox.setVgrow(bottomSheet, Priority.ALWAYS);
        
        mainContent.getChildren().addAll(mapArea, bottomSheet);
        homeView.setCenter(mainContent);
    }
    
    private HBox createNavbar() {
        HBox navbar = new HBox();
        navbar.setStyle(Theme.getNavbarStyle());
        navbar.setAlignment(Pos.CENTER_LEFT);
        navbar.setPrefHeight(56);
        navbar.setPadding(new Insets(0, 20, 0, 20));
        
        // Logo
        Label logo = new Label("Uber");
        logo.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 24));
        logo.setTextFill(Color.WHITE);
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        // 用戶按鈕
        Button userBtn = new Button("👤 登入");
        userBtn.setStyle("""
            -fx-background-color: transparent;
            -fx-text-fill: white;
            -fx-font-size: 14px;
            -fx-cursor: hand;
            """);
        
        navbar.getChildren().addAll(logo, spacer, userBtn);
        return navbar;
    }
    
    private StackPane createMapArea() {
        StackPane mapArea = new StackPane();
        mapArea.setPrefHeight(280);
        mapArea.setMinHeight(280);
        mapArea.setMaxHeight(280);
        
        // 地圖背景漸層
        mapArea.setStyle("""
            -fx-background-color: linear-gradient(to bottom, 
                #1a1a2e 0%, 
                #16213e 50%, 
                #0f0f23 100%);
            """);
        
        // 模擬地圖網格
        VBox gridOverlay = new VBox(20);
        gridOverlay.setAlignment(Pos.CENTER);
        gridOverlay.setOpacity(0.3);
        
        for (int i = 0; i < 5; i++) {
            HBox row = new HBox(20);
            row.setAlignment(Pos.CENTER);
            for (int j = 0; j < 8; j++) {
                Circle dot = new Circle(2, Color.web("#4a4a6a"));
                row.getChildren().add(dot);
            }
            gridOverlay.getChildren().add(row);
        }
        
        // 地圖標記
        VBox markers = new VBox(10);
        markers.setAlignment(Pos.CENTER);
        
        Label mapIcon = new Label("📍");
        mapIcon.setFont(Font.font(48));
        
        Label mapHint = new Label("拖動地圖選擇位置");
        mapHint.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        mapHint.setFont(Font.font("Microsoft JhengHei", 14));
        
        markers.getChildren().addAll(mapIcon, mapHint);
        
        mapArea.getChildren().addAll(gridOverlay, markers);
        return mapArea;
    }
    
    private ScrollPane createBottomSheet() {
        VBox content = new VBox(20);
        content.setStyle(Theme.getBottomSheetStyle());
        content.setPadding(new Insets(24, 20, 40, 20));
        
        // 拖動把手
        HBox handle = new HBox();
        handle.setAlignment(Pos.CENTER);
        Rectangle handleBar = new Rectangle(40, 4);
        handleBar.setArcWidth(4);
        handleBar.setArcHeight(4);
        handleBar.setFill(Color.web("#444444"));
        handle.getChildren().add(handleBar);
        handle.setPadding(new Insets(0, 0, 16, 0));
        
        // 標題區域
        VBox titleBox = new VBox(4);
        Label greeting = new Label("🚕 開始搭乘");
        greeting.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 24));
        greeting.setTextFill(Color.WHITE);
        
        Label subtitle = new Label("隨時隨地，安全出行");
        subtitle.setFont(Font.font("Microsoft JhengHei", 14));
        subtitle.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        titleBox.getChildren().addAll(greeting, subtitle);
        
        // 地點輸入區域
        VBox locationInputs = createLocationInputs();
        
        // 車種選擇區域
        VBox vehicleSelection = createVehicleSelection();
        
        // 預估車資區域
        HBox fareRow = createFareRow();
        
        // 叫車按鈕
        createOrderBtn = new Button("🚕 確認叫車");
        createOrderBtn.setMaxWidth(Double.MAX_VALUE);
        createOrderBtn.setStyle(Theme.getPrimaryButtonStyle());
        createOrderBtn.setOnAction(e -> createOrder());
        
        content.getChildren().addAll(
            handle,
            titleBox,
            locationInputs,
            vehicleSelection,
            fareRow,
            createOrderBtn
        );
        
        // 滾動面板 - 修復滑動問題
        ScrollPane scrollPane = new ScrollPane(content);
        scrollPane.setFitToWidth(true);
        scrollPane.setHbarPolicy(ScrollPane.ScrollBarPolicy.NEVER);
        scrollPane.setVbarPolicy(ScrollPane.ScrollBarPolicy.AS_NEEDED);
        scrollPane.setStyle("""
            -fx-background-color: #141414;
            -fx-background: #141414;
            """);
        
        // 添加輸入監聽器
        setupInputListeners();
        
        return scrollPane;
    }
    
    private VBox createLocationInputs() {
        VBox container = new VBox(12);
        
        // 上車地點
        VBox pickupBox = new VBox(8);
        HBox pickupHeader = new HBox(8);
        pickupHeader.setAlignment(Pos.CENTER_LEFT);
        
        Circle pickupDot = new Circle(6, Color.web(Theme.UBER_GREEN));
        Label pickupLabel = new Label("上車地點");
        pickupLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        pickupLabel.setFont(Font.font("Microsoft JhengHei", 12));
        pickupHeader.getChildren().addAll(pickupDot, pickupLabel);
        
        HBox pickupInputRow = new HBox(12);
        pickupInputRow.setAlignment(Pos.CENTER_LEFT);
        
        pickupXField = createCoordInput("X 座標");
        pickupYField = createCoordInput("Y 座標");
        pickupXField.setText("20");
        pickupYField.setText("30");
        
        pickupInputRow.getChildren().addAll(
            createCoordWrapper("X", pickupXField),
            createCoordWrapper("Y", pickupYField)
        );
        
        pickupBox.getChildren().addAll(pickupHeader, pickupInputRow);
        
        // 連接線
        VBox connector = new VBox(2);
        connector.setAlignment(Pos.CENTER_LEFT);
        connector.setPadding(new Insets(0, 0, 0, 3));
        for (int i = 0; i < 3; i++) {
            Circle dot = new Circle(2, Color.web("#444444"));
            connector.getChildren().add(dot);
        }
        
        // 下車地點
        VBox dropoffBox = new VBox(8);
        HBox dropoffHeader = new HBox(8);
        dropoffHeader.setAlignment(Pos.CENTER_LEFT);
        
        Rectangle dropoffSquare = new Rectangle(12, 12);
        dropoffSquare.setFill(Color.web(Theme.ERROR));
        dropoffSquare.setArcWidth(3);
        dropoffSquare.setArcHeight(3);
        Label dropoffLabel = new Label("下車地點");
        dropoffLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        dropoffLabel.setFont(Font.font("Microsoft JhengHei", 12));
        dropoffHeader.getChildren().addAll(dropoffSquare, dropoffLabel);
        
        HBox dropoffInputRow = new HBox(12);
        dropoffInputRow.setAlignment(Pos.CENTER_LEFT);
        
        dropoffXField = createCoordInput("X 座標");
        dropoffYField = createCoordInput("Y 座標");
        dropoffXField.setText("60");
        dropoffYField.setText("80");
        
        dropoffInputRow.getChildren().addAll(
            createCoordWrapper("X", dropoffXField),
            createCoordWrapper("Y", dropoffYField)
        );
        
        dropoffBox.getChildren().addAll(dropoffHeader, dropoffInputRow);
        
        container.getChildren().addAll(pickupBox, connector, dropoffBox);
        return container;
    }
    
    private TextField createCoordInput(String placeholder) {
        TextField field = new TextField();
        field.setPromptText(placeholder);
        field.setPrefWidth(100);
        field.setStyle(Theme.getInputStyle());
        return field;
    }
    
    private HBox createCoordWrapper(String label, TextField field) {
        HBox wrapper = new HBox(8);
        wrapper.setAlignment(Pos.CENTER_LEFT);
        
        Label lbl = new Label(label);
        lbl.setTextFill(Color.web(Theme.TEXT_TERTIARY));
        lbl.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        lbl.setMinWidth(20);
        
        HBox.setHgrow(field, Priority.ALWAYS);
        wrapper.getChildren().addAll(lbl, field);
        return wrapper;
    }
    
    private VBox createVehicleSelection() {
        VBox container = new VBox(12);
        
        Label title = new Label("選擇車種");
        title.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        
        HBox cards = new HBox(12);
        cards.setAlignment(Pos.CENTER);
        
        standardCard = createVehicleCard("🚗", "菁英", "$15/km", VehicleType.STANDARD, true);
        premiumCard = createVehicleCard("🚘", "尊榮", "$25/km", VehicleType.PREMIUM, false);
        xlCard = createVehicleCard("🚐", "大型", "$30/km", VehicleType.XL, false);
        
        HBox.setHgrow(standardCard, Priority.ALWAYS);
        HBox.setHgrow(premiumCard, Priority.ALWAYS);
        HBox.setHgrow(xlCard, Priority.ALWAYS);
        
        cards.getChildren().addAll(standardCard, premiumCard, xlCard);
        container.getChildren().addAll(title, cards);
        return container;
    }
    
    private VBox createVehicleCard(String emoji, String name, String price, VehicleType type, boolean selected) {
        VBox card = new VBox(8);
        card.setAlignment(Pos.CENTER);
        card.setPadding(new Insets(16, 12, 16, 12));
        card.setStyle(selected ? Theme.getSelectedCardStyle() : Theme.getUnselectedCardStyle());
        
        Label emojiLabel = new Label(emoji);
        emojiLabel.setFont(Font.font(28));
        
        Label nameLabel = new Label(name);
        nameLabel.setTextFill(Color.WHITE);
        nameLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        
        Label priceLabel = new Label(price);
        priceLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        priceLabel.setFont(Font.font("Microsoft JhengHei", 12));
        
        card.getChildren().addAll(emojiLabel, nameLabel, priceLabel);
        
        // 點擊選擇
        card.setOnMouseClicked(e -> selectVehicleType(type));
        
        return card;
    }
    
    private void selectVehicleType(VehicleType type) {
        selectedVehicleType = type;
        
        standardCard.setStyle(type == VehicleType.STANDARD ? 
            Theme.getSelectedCardStyle() : Theme.getUnselectedCardStyle());
        premiumCard.setStyle(type == VehicleType.PREMIUM ? 
            Theme.getSelectedCardStyle() : Theme.getUnselectedCardStyle());
        xlCard.setStyle(type == VehicleType.XL ? 
            Theme.getSelectedCardStyle() : Theme.getUnselectedCardStyle());
        
        calculateEstimate();
    }
    
    private HBox createFareRow() {
        HBox row = new HBox();
        row.setAlignment(Pos.CENTER_LEFT);
        row.setPadding(new Insets(16, 20, 16, 20));
        row.setStyle(Theme.getCardStyle());
        
        VBox labelBox = new VBox(4);
        Label fareTitle = new Label("預估車資");
        fareTitle.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        fareTitle.setFont(Font.font("Microsoft JhengHei", 14));
        
        Label fareNote = new Label("包含基本費 + 里程費");
        fareNote.setTextFill(Color.web(Theme.TEXT_TERTIARY));
        fareNote.setFont(Font.font("Microsoft JhengHei", 12));
        labelBox.getChildren().addAll(fareTitle, fareNote);
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        estimatedFareLabel = new Label("$--");
        estimatedFareLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        estimatedFareLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 28));
        
        row.getChildren().addAll(labelBox, spacer, estimatedFareLabel);
        return row;
    }
    
    private void setupInputListeners() {
        pickupXField.textProperty().addListener((o, old, n) -> calculateEstimate());
        pickupYField.textProperty().addListener((o, old, n) -> calculateEstimate());
        dropoffXField.textProperty().addListener((o, old, n) -> calculateEstimate());
        dropoffYField.textProperty().addListener((o, old, n) -> calculateEstimate());
    }
    
    // ============================================
    // 訂單視圖 - Uber 風格
    // ============================================
    
    private void createOrderView() {
        orderView = new BorderPane();
        orderView.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 頂部導航列
        HBox navbar = createOrderNavbar();
        orderView.setTop(navbar);
        
        // 主內容 - 可滑動
        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setFitToWidth(true);
        scrollPane.setHbarPolicy(ScrollPane.ScrollBarPolicy.NEVER);
        scrollPane.setStyle("-fx-background-color: " + Theme.BG_BLACK + "; -fx-background: " + Theme.BG_BLACK + ";");
        
        VBox content = new VBox(20);
        content.setPadding(new Insets(24, 20, 40, 20));
        content.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 狀態卡片
        VBox statusCard = createStatusCard();
        
        // 進度條
        progressBox = createProgressBar();
        
        // 司機資訊卡片
        VBox driverCard = createDriverCard();
        
        // 路線資訊卡片
        VBox routeCard = createRouteCard();
        
        // 車資卡片
        VBox fareCard = createFareCard();
        
        // 按鈕區域
        VBox buttonArea = createOrderButtons();
        
        content.getChildren().addAll(
            statusCard,
            progressBox,
            driverCard,
            routeCard,
            fareCard,
            buttonArea
        );
        
        scrollPane.setContent(content);
        orderView.setCenter(scrollPane);
    }
    
    private HBox createOrderNavbar() {
        HBox navbar = new HBox();
        navbar.setStyle(Theme.getNavbarStyle());
        navbar.setAlignment(Pos.CENTER_LEFT);
        navbar.setPrefHeight(56);
        navbar.setPadding(new Insets(0, 20, 0, 20));
        
        Button backNavBtn = new Button("← 返回");
        backNavBtn.setStyle("""
            -fx-background-color: transparent;
            -fx-text-fill: white;
            -fx-font-size: 16px;
            -fx-cursor: hand;
            """);
        backNavBtn.setOnAction(e -> {
            if (currentOrder == null || 
                currentOrder.getStatus() == OrderStatus.COMPLETED ||
                currentOrder.getStatus() == OrderStatus.CANCELLED) {
                showHomeView();
            }
        });
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        Label title = new Label("訂單詳情");
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 18));
        title.setTextFill(Color.WHITE);
        
        navbar.getChildren().addAll(backNavBtn, spacer, title, spacer);
        return navbar;
    }
    
    private VBox createStatusCard() {
        VBox card = new VBox(12);
        card.setAlignment(Pos.CENTER);
        card.setStyle(Theme.getCardStyle());
        card.setPadding(new Insets(24));
        
        Label statusTitle = new Label("訂單狀態");
        statusTitle.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        statusTitle.setFont(Font.font("Microsoft JhengHei", 14));
        
        orderStatusLabel = new Label("等待中...");
        orderStatusLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 28));
        orderStatusLabel.setTextFill(Color.web(Theme.WARNING));
        
        card.getChildren().addAll(statusTitle, orderStatusLabel);
        return card;
    }
    
    private HBox createProgressBar() {
        HBox box = new HBox(0);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(8, 0, 8, 0));
        
        // Will be updated by updateTripProgress
        return box;
    }
    
    private VBox createDriverCard() {
        VBox card = new VBox(12);
        card.setStyle(Theme.getCardStyle());
        
        Label title = new Label("🚗 司機資訊");
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        title.setTextFill(Color.WHITE);
        
        driverInfoLabel = new Label("等待司機接單...");
        driverInfoLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        driverInfoLabel.setFont(Font.font("Microsoft JhengHei", 14));
        driverInfoLabel.setWrapText(true);
        
        card.getChildren().addAll(title, driverInfoLabel);
        return card;
    }
    
    private VBox createRouteCard() {
        VBox card = new VBox(16);
        card.setStyle(Theme.getCardStyle());
        
        Label title = new Label("📍 路線資訊");
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        title.setTextFill(Color.WHITE);
        
        VBox routeDetails = new VBox(12);
        
        HBox pickupRow = new HBox(12);
        pickupRow.setAlignment(Pos.CENTER_LEFT);
        Circle pickupDot = new Circle(6, Color.web(Theme.UBER_GREEN));
        pickupLabel = new Label("上車: --");
        pickupLabel.setTextFill(Color.WHITE);
        pickupLabel.setFont(Font.font("Microsoft JhengHei", 14));
        pickupRow.getChildren().addAll(pickupDot, pickupLabel);
        
        // 連接線
        VBox connector = new VBox(2);
        connector.setPadding(new Insets(0, 0, 0, 3));
        for (int i = 0; i < 2; i++) {
            Circle dot = new Circle(2, Color.web("#444444"));
            connector.getChildren().add(dot);
        }
        
        HBox dropoffRow = new HBox(12);
        dropoffRow.setAlignment(Pos.CENTER_LEFT);
        Rectangle dropoffSquare = new Rectangle(12, 12);
        dropoffSquare.setFill(Color.web(Theme.ERROR));
        dropoffSquare.setArcWidth(3);
        dropoffSquare.setArcHeight(3);
        dropoffLabel = new Label("下車: --");
        dropoffLabel.setTextFill(Color.WHITE);
        dropoffLabel.setFont(Font.font("Microsoft JhengHei", 14));
        dropoffRow.getChildren().addAll(dropoffSquare, dropoffLabel);
        
        routeDetails.getChildren().addAll(pickupRow, connector, dropoffRow);
        card.getChildren().addAll(title, routeDetails);
        return card;
    }
    
    private VBox createFareCard() {
        VBox card = new VBox(8);
        card.setAlignment(Pos.CENTER);
        card.setStyle(Theme.getCardStyle());
        card.setPadding(new Insets(20));
        
        Label title = new Label("💰 車資");
        title.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        title.setFont(Font.font("Microsoft JhengHei", 14));
        
        fareLabel = new Label("$--");
        fareLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 32));
        fareLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        
        card.getChildren().addAll(title, fareLabel);
        return card;
    }
    
    private VBox createOrderButtons() {
        VBox box = new VBox(12);
        
        cancelBtn = new Button("❌ 取消訂單");
        cancelBtn.setMaxWidth(Double.MAX_VALUE);
        cancelBtn.setStyle(Theme.getDangerButtonStyle());
        cancelBtn.setOnAction(e -> cancelOrder());
        
        backBtn = new Button("🏠 返回首頁");
        backBtn.setMaxWidth(Double.MAX_VALUE);
        backBtn.setStyle(Theme.getSecondaryButtonStyle());
        backBtn.setVisible(false);
        backBtn.setManaged(false);
        backBtn.setOnAction(e -> {
            currentOrder = null;
            showHomeView();
        });
        
        box.getChildren().addAll(cancelBtn, backBtn);
        return box;
    }
    
    // ============================================
    // 更新方法
    // ============================================
    
    private void updateTripProgress(OrderStatus status) {
        progressBox.getChildren().clear();
        
        int step = switch (status) {
            case PENDING -> 1;
            case ACCEPTED -> 2;
            case ONGOING -> 3;
            case COMPLETED -> 4;
            case CANCELLED -> 0;
        };
        
        String[] labels = {"建立", "接單", "行駛", "完成"};
        
        for (int i = 0; i < 4; i++) {
            boolean active = i < step;
            boolean current = i == step - 1;
            
            // 進度點
            VBox stepBox = new VBox(4);
            stepBox.setAlignment(Pos.CENTER);
            
            Circle circle = new Circle(current ? 14 : 10);
            if (current) {
                circle.setFill(Color.web(Theme.UBER_GREEN));
                circle.setEffect(new DropShadow(10, Color.web(Theme.UBER_GREEN)));
            } else if (active) {
                circle.setFill(Color.web(Theme.UBER_GREEN));
            } else {
                circle.setFill(Color.web("#363636"));
            }
            
            Label lbl = new Label(labels[i]);
            lbl.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 11));
            lbl.setTextFill(active ? Color.WHITE : Color.web(Theme.TEXT_TERTIARY));
            
            stepBox.getChildren().addAll(circle, lbl);
            progressBox.getChildren().add(stepBox);
            
            // 連接線
            if (i < 3) {
                Region line = new Region();
                line.setPrefWidth(40);
                line.setPrefHeight(3);
                line.setMinWidth(40);
                line.setStyle("-fx-background-color: " + (i < step - 1 ? Theme.UBER_GREEN : "#363636") + ";");
                
                HBox lineWrapper = new HBox(line);
                lineWrapper.setAlignment(Pos.CENTER);
                lineWrapper.setPadding(new Insets(0, 4, 16, 4));
                progressBox.getChildren().add(lineWrapper);
            }
        }
    }
    
    // ============================================
    // 視圖切換
    // ============================================
    
    private void showHomeView() {
        stopPolling();
        root.getChildren().clear();
        root.getChildren().add(homeView);
        calculateEstimate();
    }
    
    private void showOrderView() {
        root.getChildren().clear();
        root.getChildren().add(orderView);
        startPolling();
    }
    
    // ============================================
    // 計算預估車資
    // ============================================
    
    private void calculateEstimate() {
        try {
            double pickupX = Double.parseDouble(pickupXField.getText());
            double pickupY = Double.parseDouble(pickupYField.getText());
            double dropoffX = Double.parseDouble(dropoffXField.getText());
            double dropoffY = Double.parseDouble(dropoffYField.getText());
            
            double distance = Math.sqrt(Math.pow(dropoffX - pickupX, 2) + Math.pow(dropoffY - pickupY, 2));
            
            double baseFare = switch (selectedVehicleType) {
                case STANDARD -> 50;
                case PREMIUM -> 80;
                case XL -> 100;
            };
            
            double perKm = switch (selectedVehicleType) {
                case STANDARD -> 15;
                case PREMIUM -> 25;
                case XL -> 30;
            };
            
            double minFare = switch (selectedVehicleType) {
                case STANDARD -> 70;
                case PREMIUM -> 120;
                case XL -> 150;
            };
            
            double fare = Math.max(baseFare + distance * perKm, minFare);
            estimatedFareLabel.setText(String.format("$%.0f", fare));
            
        } catch (NumberFormatException e) {
            estimatedFareLabel.setText("$--");
        }
    }
    
    // ============================================
    // API 操作
    // ============================================
    
    private void createOrder() {
        try {
            double pickupX = Double.parseDouble(pickupXField.getText());
            double pickupY = Double.parseDouble(pickupYField.getText());
            double dropoffX = Double.parseDouble(dropoffXField.getText());
            double dropoffY = Double.parseDouble(dropoffYField.getText());
            
            // 驗證座標
            if (pickupX < 0 || pickupX > 100 || pickupY < 0 || pickupY > 100 ||
                dropoffX < 0 || dropoffX > 100 || dropoffY < 0 || dropoffY > 100) {
                UIUtils.showError("錯誤", "座標必須在 0-100 範圍內");
                return;
            }
            
            if (pickupX == dropoffX && pickupY == dropoffY) {
                UIUtils.showError("錯誤", "上車地點和下車地點不可相同");
                return;
            }
            
            Location pickup = new Location(pickupX, pickupY);
            Location dropoff = new Location(dropoffX, dropoffY);
            
            createOrderBtn.setDisable(true);
            createOrderBtn.setText("建立中...");
            
            apiClient.createOrder(passengerId, pickup, dropoff, selectedVehicleType)
                .whenComplete((response, error) -> {
                    Platform.runLater(() -> {
                        createOrderBtn.setDisable(false);
                        createOrderBtn.setText("🚕 確認叫車");
                        
                        if (error != null) {
                            UIUtils.showError("連線錯誤", "無法連接伺服器: " + error.getMessage());
                            return;
                        }
                        
                        if (response.isSuccess()) {
                            currentOrder = response.getData();
                            updateOrderView();
                            showOrderView();
                        } else {
                            UIUtils.showError("建立失敗", response.getErrorMessage());
                        }
                    });
                });
                
        } catch (NumberFormatException e) {
            UIUtils.showError("錯誤", "請輸入有效的座標數值");
        }
    }
    
    private void cancelOrder() {
        if (currentOrder == null) return;
        
        UIUtils.showConfirm("確認取消", "確定要取消此訂單嗎？\n可能會產生取消費用。")
            .thenAccept(confirmed -> {
                if (confirmed) {
                    cancelBtn.setDisable(true);
                    
                    apiClient.cancelOrder(currentOrder.getOrderId(), passengerId, "乘客取消")
                        .whenComplete((response, error) -> {
                            Platform.runLater(() -> {
                                cancelBtn.setDisable(false);
                                
                                if (error != null) {
                                    UIUtils.showError("連線錯誤", error.getMessage());
                                    return;
                                }
                                
                                if (response.isSuccess()) {
                                    currentOrder = response.getData();
                                    updateOrderView();
                                    UIUtils.showInfo("已取消", "訂單已成功取消");
                                } else {
                                    UIUtils.showError("取消失敗", response.getErrorMessage());
                                }
                            });
                        });
                }
            });
    }
    
    private void updateOrderView() {
        if (currentOrder == null) return;
        
        OrderStatus status = currentOrder.getStatus();
        
        // 更新狀態
        orderStatusLabel.setText(status.getDisplayName());
        orderStatusLabel.setTextFill(Color.web(status.getColor()));
        
        // 更新進度
        updateTripProgress(status);
        
        // 更新司機資訊
        if (currentOrder.getDriverId() != null) {
            String driverInfo = String.format(
                "司機: %s\n電話: %s\n車牌: %s",
                currentOrder.getDriverName() != null ? currentOrder.getDriverName() : currentOrder.getDriverId(),
                currentOrder.getDriverPhone() != null ? currentOrder.getDriverPhone() : "未知",
                currentOrder.getVehiclePlate() != null ? currentOrder.getVehiclePlate() : "未知"
            );
            driverInfoLabel.setText(driverInfo);
            driverInfoLabel.setTextFill(Color.WHITE);
        } else {
            driverInfoLabel.setText("等待司機接單...");
            driverInfoLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        }
        
        // 更新路線
        pickupLabel.setText("上車: " + currentOrder.getPickupLocation());
        dropoffLabel.setText("下車: " + currentOrder.getDropoffLocation());
        
        // 更新車資
        Double fare = currentOrder.getActualFare() != null ? 
            currentOrder.getActualFare() : currentOrder.getEstimatedFare();
        fareLabel.setText(fare != null ? String.format("$%.0f", fare) : "$--");
        
        // 更新取消按鈕
        boolean canCancel = status == OrderStatus.PENDING || status == OrderStatus.ACCEPTED;
        cancelBtn.setVisible(canCancel);
        cancelBtn.setManaged(canCancel);
        
        // 完成或取消時顯示返回按鈕
        boolean isFinished = status == OrderStatus.COMPLETED || status == OrderStatus.CANCELLED;
        backBtn.setVisible(isFinished);
        backBtn.setManaged(isFinished);
        
        if (isFinished) {
            stopPolling();
        }
    }
    
    // ============================================
    // 輪詢
    // ============================================
    
    private void startPolling() {
        if (pollingTimeline != null) {
            pollingTimeline.stop();
        }
        
        pollingTimeline = new Timeline(new KeyFrame(Duration.seconds(1), e -> pollOrderStatus()));
        pollingTimeline.setCycleCount(Timeline.INDEFINITE);
        pollingTimeline.play();
    }
    
    private void stopPolling() {
        if (pollingTimeline != null) {
            pollingTimeline.stop();
            pollingTimeline = null;
        }
    }
    
    private void pollOrderStatus() {
        if (currentOrder == null) return;
        
        apiClient.getOrder(currentOrder.getOrderId())
            .whenComplete((response, error) -> {
                Platform.runLater(() -> {
                    if (error == null && response.isSuccess()) {
                        currentOrder = response.getData();
                        updateOrderView();
                    }
                });
            });
    }
    
    public void shutdown() {
        stopPolling();
    }
}
