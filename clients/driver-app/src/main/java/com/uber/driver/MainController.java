package com.uber.driver;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.uber.client.api.ApiClient;
import com.uber.client.model.*;
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
import javafx.scene.shape.Rectangle;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.util.Duration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 司機端主控制器 - Uber 風格現代 UI
 */
public class MainController {
    
    private final StackPane root;
    private final ApiClient apiClient;
    private final ObjectMapper objectMapper;
    
    private Driver currentDriver;
    private Order currentOrder;
    private Timeline pollingTimeline;
    private VehicleType selectedVehicleType = VehicleType.STANDARD;
    
    // Views
    private BorderPane loginView;
    private BorderPane mainView;
    private BorderPane orderView;
    
    // Login Components
    private TextField driverIdField;
    private TextField nameField;
    private TextField phoneField;
    private TextField vehiclePlateField;
    private TextField locationXField;
    private TextField locationYField;
    private VBox standardCard, premiumCard, xlCard;
    
    // Main View Components
    private Label statusLabel;
    private Label locationLabel;
    private Label driverNameLabel;
    private ToggleButton onlineToggle;
    private VBox offersListBox;
    
    // Order View Components  
    private Label orderStatusLabel;
    private Label passengerLabel;
    private Label routeLabel;
    private Label fareLabel;
    private Button actionBtn;
    private Button cancelOrderBtn;
    
    public MainController() {
        this.apiClient = new ApiClient();
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.root = new StackPane();
        
        initUI();
        showLoginView();
    }
    
    public StackPane getRoot() {
        return root;
    }
    
    private void initUI() {
        root.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        createLoginView();
        createMainView();
        createOrderView();
    }
    
    // ============================================
    // 登入視圖
    // ============================================
    
    private void createLoginView() {
        loginView = new BorderPane();
        loginView.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 頂部導航
        HBox navbar = createNavbar("Uber Driver", null, null);
        loginView.setTop(navbar);
        
        // 主內容
        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setFitToWidth(true);
        scrollPane.setHbarPolicy(ScrollPane.ScrollBarPolicy.NEVER);
        scrollPane.setStyle("-fx-background-color: " + Theme.BG_BLACK + "; -fx-background: " + Theme.BG_BLACK + ";");
        
        VBox content = new VBox(20);
        content.setPadding(new Insets(24, 20, 40, 20));
        content.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 標題區域
        VBox titleBox = new VBox(8);
        titleBox.setAlignment(Pos.CENTER);
        
        Label icon = new Label("🚗");
        icon.setFont(Font.font(64));
        
        Label title = new Label("司機註冊");
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 28));
        title.setTextFill(Color.WHITE);
        
        Label subtitle = new Label("開始接單賺錢");
        subtitle.setFont(Font.font("Microsoft JhengHei", 16));
        subtitle.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        
        titleBox.getChildren().addAll(icon, title, subtitle);
        
        // 表單
        VBox form = createLoginForm();
        
        // 登入按鈕
        Button loginBtn = new Button("🚀 開始接單");
        loginBtn.setMaxWidth(Double.MAX_VALUE);
        loginBtn.setStyle(Theme.getPrimaryButtonStyle());
        loginBtn.setOnAction(e -> registerAndLogin());
        
        content.getChildren().addAll(titleBox, form, loginBtn);
        scrollPane.setContent(content);
        loginView.setCenter(scrollPane);
    }
    
    private VBox createLoginForm() {
        VBox form = new VBox(16);
        
        // 司機 ID
        driverIdField = createFormField("🆔 司機編號", "輸入司機 ID");
        driverIdField.setText("driver-" + (System.currentTimeMillis() % 1000));
        
        // 姓名
        nameField = createFormField("👤 姓名", "輸入姓名");
        nameField.setText("王司機");
        
        // 電話
        phoneField = createFormField("📱 電話", "輸入電話號碼");
        phoneField.setText("0912-345-678");
        
        // 車牌
        vehiclePlateField = createFormField("🚙 車牌號碼", "輸入車牌");
        vehiclePlateField.setText("ABC-1234");
        
        // 車種選擇
        VBox vehicleSection = new VBox(12);
        Label vehicleLabel = new Label("🚘 車種");
        vehicleLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        vehicleLabel.setTextFill(Color.WHITE);
        
        HBox vehicleCards = new HBox(12);
        vehicleCards.setAlignment(Pos.CENTER);
        
        standardCard = createVehicleCard("🚗", "菁英", VehicleType.STANDARD, true);
        premiumCard = createVehicleCard("🚘", "尊榮", VehicleType.PREMIUM, false);
        xlCard = createVehicleCard("🚐", "大型", VehicleType.XL, false);
        
        HBox.setHgrow(standardCard, Priority.ALWAYS);
        HBox.setHgrow(premiumCard, Priority.ALWAYS);
        HBox.setHgrow(xlCard, Priority.ALWAYS);
        
        vehicleCards.getChildren().addAll(standardCard, premiumCard, xlCard);
        vehicleSection.getChildren().addAll(vehicleLabel, vehicleCards);
        
        // 初始位置
        VBox locationSection = new VBox(12);
        Label locationLabel = new Label("📍 初始位置");
        locationLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        locationLabel.setTextFill(Color.WHITE);
        
        HBox locationInputs = new HBox(16);
        locationInputs.setAlignment(Pos.CENTER_LEFT);
        
        locationXField = new TextField("25");
        locationXField.setPrefWidth(80);
        locationXField.setStyle(Theme.getInputStyle());
        
        locationYField = new TextField("35");
        locationYField.setPrefWidth(80);
        locationYField.setStyle(Theme.getInputStyle());
        
        locationInputs.getChildren().addAll(
            createCoordLabel("X"),
            locationXField,
            createCoordLabel("Y"),
            locationYField
        );
        
        locationSection.getChildren().addAll(locationLabel, locationInputs);
        
        form.getChildren().addAll(
            createFormFieldWrapper("🆔 司機編號", driverIdField),
            createFormFieldWrapper("👤 姓名", nameField),
            createFormFieldWrapper("📱 電話", phoneField),
            createFormFieldWrapper("🚙 車牌號碼", vehiclePlateField),
            vehicleSection,
            locationSection
        );
        
        return form;
    }
    
    private TextField createFormField(String iconLabel, String placeholder) {
        TextField field = new TextField();
        field.setPromptText(placeholder);
        field.setMaxWidth(Double.MAX_VALUE);
        field.setStyle(Theme.getInputStyle());
        return field;
    }
    
    private VBox createFormFieldWrapper(String label, TextField field) {
        VBox wrapper = new VBox(8);
        Label lbl = new Label(label);
        lbl.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        lbl.setTextFill(Color.WHITE);
        wrapper.getChildren().addAll(lbl, field);
        return wrapper;
    }
    
    private Label createCoordLabel(String text) {
        Label label = new Label(text);
        label.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        label.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        return label;
    }
    
    private VBox createVehicleCard(String emoji, String name, VehicleType type, boolean selected) {
        VBox card = new VBox(8);
        card.setAlignment(Pos.CENTER);
        card.setPadding(new Insets(16, 12, 16, 12));
        card.setStyle(selected ? Theme.getSelectedCardStyle() : Theme.getUnselectedCardStyle());
        
        Label emojiLabel = new Label(emoji);
        emojiLabel.setFont(Font.font(28));
        
        Label nameLabel = new Label(name);
        nameLabel.setTextFill(Color.WHITE);
        nameLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        
        card.getChildren().addAll(emojiLabel, nameLabel);
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
    }
    
    // ============================================
    // 主視圖
    // ============================================
    
    private void createMainView() {
        mainView = new BorderPane();
        mainView.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 頂部導航
        HBox navbar = createNavbar("司機模式", "🔔", e -> {});
        mainView.setTop(navbar);
        
        // 主內容
        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setFitToWidth(true);
        scrollPane.setHbarPolicy(ScrollPane.ScrollBarPolicy.NEVER);
        scrollPane.setStyle("-fx-background-color: " + Theme.BG_BLACK + "; -fx-background: " + Theme.BG_BLACK + ";");
        
        VBox content = new VBox(20);
        content.setPadding(new Insets(20));
        content.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 司機狀態卡片
        VBox driverCard = createDriverStatusCard();
        
        // 可接訂單區域
        VBox offersSection = createOffersSection();
        VBox.setVgrow(offersSection, Priority.ALWAYS);
        
        // 登出按鈕
        Button logoutBtn = new Button("🔚 登出");
        logoutBtn.setMaxWidth(Double.MAX_VALUE);
        logoutBtn.setStyle(Theme.getDangerOutlineButtonStyle());
        logoutBtn.setOnAction(e -> logout());
        
        content.getChildren().addAll(driverCard, offersSection, logoutBtn);
        scrollPane.setContent(content);
        mainView.setCenter(scrollPane);
    }
    
    private VBox createDriverStatusCard() {
        VBox card = new VBox(16);
        card.setStyle(Theme.getCardStyle());
        card.setPadding(new Insets(20));
        
        HBox header = new HBox(16);
        header.setAlignment(Pos.CENTER_LEFT);
        
        // 頭像
        StackPane avatar = new StackPane();
        Circle avatarBg = new Circle(28, Color.web(Theme.UBER_GREEN));
        Label avatarText = new Label("👤");
        avatarText.setFont(Font.font(24));
        avatar.getChildren().addAll(avatarBg, avatarText);
        
        VBox info = new VBox(4);
        driverNameLabel = new Label("🚗 司機模式");
        driverNameLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 18));
        driverNameLabel.setTextFill(Color.WHITE);
        
        statusLabel = new Label("⚫ 離線中");
        statusLabel.setFont(Font.font("Microsoft JhengHei", 14));
        statusLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        
        locationLabel = new Label("📍 位置: --");
        locationLabel.setFont(Font.font("Microsoft JhengHei", 12));
        locationLabel.setTextFill(Color.web(Theme.TEXT_TERTIARY));
        
        info.getChildren().addAll(driverNameLabel, statusLabel, locationLabel);
        HBox.setHgrow(info, Priority.ALWAYS);
        
        // 上線切換
        onlineToggle = new ToggleButton("上線");
        onlineToggle.setStyle("""
            -fx-background-color: #242424;
            -fx-text-fill: white;
            -fx-font-size: 14px;
            -fx-font-weight: bold;
            -fx-padding: 12 24;
            -fx-background-radius: 999;
            -fx-border-color: #363636;
            -fx-border-radius: 999;
            """);
        onlineToggle.setOnAction(e -> toggleOnline());
        
        header.getChildren().addAll(avatar, info, onlineToggle);
        card.getChildren().add(header);
        
        return card;
    }
    
    private VBox createOffersSection() {
        VBox section = new VBox(16);
        
        Label title = new Label("📋 可接訂單");
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 20));
        title.setTextFill(Color.WHITE);
        
        offersListBox = new VBox(12);
        
        Label emptyLabel = new Label("📭 目前沒有可接的訂單\n請保持上線狀態等待派單");
        emptyLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        emptyLabel.setFont(Font.font("Microsoft JhengHei", 14));
        emptyLabel.setAlignment(Pos.CENTER);
        emptyLabel.setStyle("-fx-padding: 40 20;");
        offersListBox.getChildren().add(emptyLabel);
        
        section.getChildren().addAll(title, offersListBox);
        return section;
    }
    
    // ============================================
    // 訂單視圖
    // ============================================
    
    private void createOrderView() {
        orderView = new BorderPane();
        orderView.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 頂部導航
        HBox navbar = createNavbar("進行中訂單", "📍", e -> {});
        orderView.setTop(navbar);
        
        // 主內容
        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setFitToWidth(true);
        scrollPane.setHbarPolicy(ScrollPane.ScrollBarPolicy.NEVER);
        scrollPane.setStyle("-fx-background-color: " + Theme.BG_BLACK + "; -fx-background: " + Theme.BG_BLACK + ";");
        
        VBox content = new VBox(20);
        content.setPadding(new Insets(24, 20, 40, 20));
        content.setStyle("-fx-background-color: " + Theme.BG_BLACK + ";");
        
        // 狀態卡片
        VBox statusCard = createOrderStatusCard();
        
        // 乘客資訊
        VBox passengerCard = createPassengerCard();
        
        // 路線資訊
        VBox routeCard = createRouteCard();
        
        // 車資卡片
        VBox fareCard = createFareCard();
        
        // 按鈕區域
        VBox buttons = createOrderButtons();
        
        content.getChildren().addAll(statusCard, passengerCard, routeCard, fareCard, buttons);
        scrollPane.setContent(content);
        orderView.setCenter(scrollPane);
    }
    
    private VBox createOrderStatusCard() {
        VBox card = new VBox(12);
        card.setAlignment(Pos.CENTER);
        card.setStyle(Theme.getCardStyle());
        card.setPadding(new Insets(24));
        
        Label title = new Label("訂單狀態");
        title.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        title.setFont(Font.font("Microsoft JhengHei", 14));
        
        orderStatusLabel = new Label("--");
        orderStatusLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 28));
        orderStatusLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        
        card.getChildren().addAll(title, orderStatusLabel);
        return card;
    }
    
    private VBox createPassengerCard() {
        VBox card = new VBox(12);
        card.setStyle(Theme.getCardStyle());
        
        Label title = new Label("👤 乘客資訊");
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        title.setTextFill(Color.WHITE);
        
        passengerLabel = new Label("--");
        passengerLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        passengerLabel.setFont(Font.font("Microsoft JhengHei", 14));
        
        HBox actions = new HBox(12);
        Button callBtn = new Button("📱 撥打");
        callBtn.setStyle(Theme.getSecondaryButtonStyle());
        Button msgBtn = new Button("💬 訊息");
        msgBtn.setStyle(Theme.getSecondaryButtonStyle());
        actions.getChildren().addAll(callBtn, msgBtn);
        
        card.getChildren().addAll(title, passengerLabel, actions);
        return card;
    }
    
    private VBox createRouteCard() {
        VBox card = new VBox(16);
        card.setStyle(Theme.getCardStyle());
        
        Label title = new Label("📍 路線資訊");
        title.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        title.setTextFill(Color.WHITE);
        
        routeLabel = new Label("上車: --\n下車: --");
        routeLabel.setTextFill(Color.WHITE);
        routeLabel.setFont(Font.font("Microsoft JhengHei", 14));
        
        card.getChildren().addAll(title, routeLabel);
        return card;
    }
    
    private VBox createFareCard() {
        VBox card = new VBox(8);
        card.setAlignment(Pos.CENTER);
        card.setStyle(Theme.getCardStyle());
        card.setPadding(new Insets(20));
        
        Label title = new Label("💰 預估車資");
        title.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        
        fareLabel = new Label("$--");
        fareLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 32));
        fareLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        
        card.getChildren().addAll(title, fareLabel);
        return card;
    }
    
    private VBox createOrderButtons() {
        VBox box = new VBox(12);
        
        actionBtn = new Button("🚗 開始行程");
        actionBtn.setMaxWidth(Double.MAX_VALUE);
        actionBtn.setStyle(Theme.getPrimaryButtonStyle());
        actionBtn.setOnAction(e -> performAction());
        
        cancelOrderBtn = new Button("❌ 取消訂單");
        cancelOrderBtn.setMaxWidth(Double.MAX_VALUE);
        cancelOrderBtn.setStyle(Theme.getDangerOutlineButtonStyle());
        cancelOrderBtn.setOnAction(e -> cancelOrder());
        
        box.getChildren().addAll(actionBtn, cancelOrderBtn);
        return box;
    }
    
    // ============================================
    // 通用元件
    // ============================================
    
    private HBox createNavbar(String title, String rightIcon, javafx.event.EventHandler<javafx.event.ActionEvent> rightAction) {
        HBox navbar = new HBox();
        navbar.setStyle(Theme.getNavbarStyle());
        navbar.setAlignment(Pos.CENTER);
        navbar.setPrefHeight(56);
        navbar.setPadding(new Insets(0, 20, 0, 20));
        
        Region leftSpacer = new Region();
        leftSpacer.setPrefWidth(50);
        
        Label titleLabel = new Label(title);
        titleLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 18));
        titleLabel.setTextFill(Color.WHITE);
        HBox.setHgrow(titleLabel, Priority.ALWAYS);
        titleLabel.setAlignment(Pos.CENTER);
        titleLabel.setMaxWidth(Double.MAX_VALUE);
        
        Region rightSpacer = new Region();
        rightSpacer.setPrefWidth(50);
        
        if (rightIcon != null) {
            Button rightBtn = new Button(rightIcon);
            rightBtn.setStyle("""
                -fx-background-color: transparent;
                -fx-text-fill: white;
                -fx-font-size: 18px;
                -fx-cursor: hand;
                """);
            if (rightAction != null) {
                rightBtn.setOnAction(rightAction);
            }
            navbar.getChildren().addAll(leftSpacer, titleLabel, rightBtn);
        } else {
            navbar.getChildren().addAll(leftSpacer, titleLabel, rightSpacer);
        }
        
        return navbar;
    }
    
    // ============================================
    // 視圖切換
    // ============================================
    
    private void showLoginView() {
        stopPolling();
        root.getChildren().clear();
        root.getChildren().add(loginView);
    }
    
    private void showMainView() {
        root.getChildren().clear();
        root.getChildren().add(mainView);
        startPolling();
    }
    
    private void showOrderView() {
        root.getChildren().clear();
        root.getChildren().add(orderView);
    }
    
    // ============================================
    // API 操作
    // ============================================
    
    private void registerAndLogin() {
        String driverId = driverIdField.getText().trim();
        String name = nameField.getText().trim();
        String phone = phoneField.getText().trim();
        String plate = vehiclePlateField.getText().trim();
        
        if (driverId.isEmpty() || name.isEmpty() || phone.isEmpty() || plate.isEmpty()) {
            UIUtils.showError("錯誤", "請填寫所有欄位");
            return;
        }
        
        try {
            double x = Double.parseDouble(locationXField.getText());
            double y = Double.parseDouble(locationYField.getText());
            
            if (x < 0 || x > 100 || y < 0 || y > 100) {
                UIUtils.showError("錯誤", "座標必須在 0-100 範圍內");
                return;
            }
            
            Location location = new Location(x, y);
            
            apiClient.registerDriver(driverId, name, phone, plate, selectedVehicleType)
                .whenComplete((response, error) -> {
                    Platform.runLater(() -> {
                        if (error != null) {
                            goOnline(driverId, location);
                        } else if (response.isSuccess()) {
                            currentDriver = response.getData();
                            goOnline(driverId, location);
                        } else {
                            goOnline(driverId, location);
                        }
                    });
                });
                
        } catch (NumberFormatException e) {
            UIUtils.showError("錯誤", "請輸入有效的座標數值");
        }
    }
    
    private void goOnline(String driverId, Location location) {
        apiClient.goOnline(driverId, location)
            .whenComplete((response, error) -> {
                Platform.runLater(() -> {
                    if (error != null) {
                        UIUtils.showError("連線錯誤", "無法連接伺服器: " + error.getMessage());
                        return;
                    }
                    
                    if (response.isSuccess()) {
                        currentDriver = response.getData();
                        updateMainView();
                        showMainView();
                    } else {
                        UIUtils.showError("上線失敗", response.getErrorMessage());
                    }
                });
            });
    }
    
    private void toggleOnline() {
        if (currentDriver == null) return;
        
        if (onlineToggle.isSelected()) {
            Location location = currentDriver.getLocation();
            if (location == null) {
                location = new Location(25, 35);
            }
            
            apiClient.goOnline(currentDriver.getDriverId(), location)
                .whenComplete((response, error) -> {
                    Platform.runLater(() -> {
                        if (error == null && response.isSuccess()) {
                            currentDriver = response.getData();
                            updateMainView();
                        } else {
                            onlineToggle.setSelected(false);
                            UIUtils.showError("上線失敗", 
                                error != null ? error.getMessage() : response.getErrorMessage());
                        }
                    });
                });
        } else {
            apiClient.goOffline(currentDriver.getDriverId())
                .whenComplete((response, error) -> {
                    Platform.runLater(() -> {
                        if (error == null && response.isSuccess()) {
                            currentDriver = response.getData();
                            updateMainView();
                        } else {
                            onlineToggle.setSelected(true);
                        }
                    });
                });
        }
    }
    
    private void updateMainView() {
        if (currentDriver == null) return;
        
        DriverStatus status = currentDriver.getStatus();
        boolean isOnline = status == DriverStatus.ONLINE;
        
        String name = currentDriver.getName();
        if (name != null && !name.isEmpty()) {
            driverNameLabel.setText("👋 " + name);
        }
        
        statusLabel.setText(isOnline ? "🟢 上線中 - 等待訂單" : "⚫ 離線中");
        statusLabel.setTextFill(Color.web(isOnline ? Theme.UBER_GREEN : Theme.TEXT_SECONDARY));
        
        if (currentDriver.getLocation() != null) {
            locationLabel.setText("📍 位置: " + currentDriver.getLocation());
        }
        
        onlineToggle.setSelected(isOnline);
        onlineToggle.setText(isOnline ? "下線" : "上線");
        
        if (isOnline) {
            onlineToggle.setStyle("""
                -fx-background-color: #06C167;
                -fx-text-fill: white;
                -fx-font-size: 14px;
                -fx-font-weight: bold;
                -fx-padding: 12 24;
                -fx-background-radius: 999;
                -fx-border-color: #06C167;
                -fx-border-radius: 999;
                """);
        } else {
            onlineToggle.setStyle("""
                -fx-background-color: #242424;
                -fx-text-fill: white;
                -fx-font-size: 14px;
                -fx-font-weight: bold;
                -fx-padding: 12 24;
                -fx-background-radius: 999;
                -fx-border-color: #363636;
                -fx-border-radius: 999;
                """);
        }
    }
    
    @SuppressWarnings("unchecked")
    private void refreshOffers() {
        if (currentDriver == null || currentDriver.getStatus() != DriverStatus.ONLINE) {
            return;
        }
        
        if (currentDriver.isBusy()) {
            if (currentOrder != null) {
                apiClient.getOrder(currentOrder.getOrderId())
                    .whenComplete((response, error) -> {
                        Platform.runLater(() -> {
                            if (error == null && response.isSuccess()) {
                                currentOrder = response.getData();
                                updateOrderView();
                                
                                if (currentOrder.getStatus() == OrderStatus.COMPLETED ||
                                    currentOrder.getStatus() == OrderStatus.CANCELLED) {
                                    currentOrder = null;
                                    currentDriver.setBusy(false);
                                    showMainView();
                                }
                            }
                        });
                    });
            }
            return;
        }
        
        apiClient.getOffers(currentDriver.getDriverId())
            .whenComplete((response, error) -> {
                Platform.runLater(() -> {
                    if (error == null && response.isSuccess()) {
                        Map<String, Object> data = response.getData();
                        List<Map<String, Object>> offers = (List<Map<String, Object>>) data.get("offers");
                        updateOffersList(offers != null ? offers : new ArrayList<>());
                    }
                });
            });
    }
    
    private void updateOffersList(List<Map<String, Object>> offers) {
        offersListBox.getChildren().clear();
        
        if (offers.isEmpty()) {
            Label emptyLabel = new Label("📭 目前沒有可接的訂單\n請保持上線狀態等待派單");
            emptyLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
            emptyLabel.setFont(Font.font("Microsoft JhengHei", 14));
            emptyLabel.setAlignment(Pos.CENTER);
            emptyLabel.setMaxWidth(Double.MAX_VALUE);
            emptyLabel.setStyle("-fx-padding: 40 20;");
            offersListBox.getChildren().add(emptyLabel);
            return;
        }
        
        for (Map<String, Object> offer : offers) {
            VBox card = createOfferCard(offer);
            offersListBox.getChildren().add(card);
        }
    }
    
    @SuppressWarnings("unchecked")
    private VBox createOfferCard(Map<String, Object> offer) {
        VBox card = new VBox(12);
        card.setStyle(Theme.getCardStyle());
        card.setPadding(new Insets(16));
        
        String orderId = (String) offer.get("orderId");
        
        // 訂單 ID
        Label idLabel = new Label("📦 訂單 #" + orderId.substring(0, Math.min(8, orderId.length())));
        idLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 14));
        idLabel.setTextFill(Color.WHITE);
        
        // 路線
        Map<String, Object> pickup = (Map<String, Object>) offer.get("pickupLocation");
        Map<String, Object> dropoff = (Map<String, Object>) offer.get("dropoffLocation");
        
        String pickupStr = String.format("(%.0f, %.0f)", 
            ((Number) pickup.get("x")).doubleValue(), 
            ((Number) pickup.get("y")).doubleValue());
        String dropoffStr = String.format("(%.0f, %.0f)", 
            ((Number) dropoff.get("x")).doubleValue(), 
            ((Number) dropoff.get("y")).doubleValue());
        
        HBox routeBox = new HBox(8);
        routeBox.setAlignment(Pos.CENTER_LEFT);
        
        Circle pickupDot = new Circle(5, Color.web(Theme.UBER_GREEN));
        Label pickupLabel = new Label(pickupStr);
        pickupLabel.setTextFill(Color.WHITE);
        
        Label arrow = new Label("→");
        arrow.setTextFill(Color.web(Theme.TEXT_TERTIARY));
        
        Rectangle dropoffSquare = new Rectangle(10, 10);
        dropoffSquare.setFill(Color.web(Theme.ERROR));
        dropoffSquare.setArcWidth(2);
        dropoffSquare.setArcHeight(2);
        Label dropoffLabel = new Label(dropoffStr);
        dropoffLabel.setTextFill(Color.WHITE);
        
        routeBox.getChildren().addAll(pickupDot, pickupLabel, arrow, dropoffSquare, dropoffLabel);
        
        // 距離和車資
        HBox infoBox = new HBox(16);
        infoBox.setAlignment(Pos.CENTER_LEFT);
        
        Object distanceObj = offer.get("distance");
        Object fareObj = offer.get("estimatedFare");
        
        double distance = distanceObj instanceof Number ? ((Number) distanceObj).doubleValue() : 0;
        double fare = fareObj instanceof Number ? ((Number) fareObj).doubleValue() : 0;
        
        Label distanceLabel = new Label(String.format("📏 %.1f km", distance));
        distanceLabel.setTextFill(Color.web(Theme.TEXT_SECONDARY));
        
        Label fareLabel = new Label(String.format("💰 $%.0f", fare));
        fareLabel.setTextFill(Color.web(Theme.UBER_GREEN));
        fareLabel.setFont(Font.font("Microsoft JhengHei", FontWeight.BOLD, 16));
        
        infoBox.getChildren().addAll(distanceLabel, fareLabel);
        
        // 接單按鈕
        Button acceptBtn = new Button("🚗 接單");
        acceptBtn.setMaxWidth(Double.MAX_VALUE);
        acceptBtn.setStyle(Theme.getPrimaryButtonStyle());
        acceptBtn.setOnAction(e -> acceptOrder(orderId));
        
        card.getChildren().addAll(idLabel, routeBox, infoBox, acceptBtn);
        return card;
    }
    
    private void acceptOrder(String orderId) {
        if (currentDriver == null) return;
        
        apiClient.acceptOrder(orderId, currentDriver.getDriverId())
            .whenComplete((response, error) -> {
                Platform.runLater(() -> {
                    if (error != null) {
                        UIUtils.showError("連線錯誤", error.getMessage());
                        return;
                    }
                    
                    if (response.isSuccess()) {
                        currentOrder = response.getData();
                        currentDriver.setBusy(true);
                        updateOrderView();
                        showOrderView();
                        UIUtils.showSuccess("接單成功！");
                    } else {
                        String errorCode = response.getErrorCode();
                        if ("ORDER_ALREADY_ACCEPTED".equals(errorCode)) {
                            UIUtils.showError("搶單失敗", "此訂單已被其他司機接受");
                        } else {
                            UIUtils.showError("接單失敗", response.getErrorMessage());
                        }
                        refreshOffers();
                    }
                });
            });
    }
    
    private void updateOrderView() {
        if (currentOrder == null) return;
        
        OrderStatus status = currentOrder.getStatus();
        
        orderStatusLabel.setText(status.getDisplayName());
        orderStatusLabel.setTextFill(Color.web(status.getColor()));
        
        passengerLabel.setText("乘客 ID: " + currentOrder.getPassengerId());
        
        routeLabel.setText(String.format("📍 上車: %s\n🎯 下車: %s", 
            currentOrder.getPickupLocation(), 
            currentOrder.getDropoffLocation()));
        
        Double fare = currentOrder.getActualFare() != null ? 
            currentOrder.getActualFare() : currentOrder.getEstimatedFare();
        fareLabel.setText(fare != null ? String.format("$%.0f", fare) : "$--");
        
        switch (status) {
            case ACCEPTED:
                actionBtn.setText("🚗 開始行程");
                actionBtn.setStyle(Theme.getPrimaryButtonStyle());
                actionBtn.setDisable(false);
                cancelOrderBtn.setVisible(true);
                cancelOrderBtn.setManaged(true);
                break;
            case ONGOING:
                actionBtn.setText("✅ 完成行程");
                actionBtn.setStyle("""
                    -fx-background-color: #276EF1;
                    -fx-text-fill: white;
                    -fx-font-size: 16px;
                    -fx-font-weight: bold;
                    -fx-padding: 16 32;
                    -fx-background-radius: 12;
                    -fx-cursor: hand;
                    """);
                actionBtn.setDisable(false);
                cancelOrderBtn.setVisible(false);
                cancelOrderBtn.setManaged(false);
                break;
            case COMPLETED:
                actionBtn.setText("🎉 行程已完成");
                actionBtn.setDisable(true);
                cancelOrderBtn.setVisible(false);
                cancelOrderBtn.setManaged(false);
                break;
            case CANCELLED:
                actionBtn.setText("❌ 訂單已取消");
                actionBtn.setDisable(true);
                cancelOrderBtn.setVisible(false);
                cancelOrderBtn.setManaged(false);
                break;
            default:
                break;
        }
    }
    
    private void performAction() {
        if (currentOrder == null || currentDriver == null) return;
        
        OrderStatus status = currentOrder.getStatus();
        
        if (status == OrderStatus.ACCEPTED) {
            apiClient.startTrip(currentOrder.getOrderId(), currentDriver.getDriverId())
                .whenComplete((response, error) -> {
                    Platform.runLater(() -> {
                        if (error != null) {
                            UIUtils.showError("錯誤", error.getMessage());
                            return;
                        }
                        
                        if (response.isSuccess()) {
                            currentOrder = response.getData();
                            updateOrderView();
                        } else {
                            UIUtils.showError("開始行程失敗", response.getErrorMessage());
                        }
                    });
                });
        } else if (status == OrderStatus.ONGOING) {
            apiClient.completeTrip(currentOrder.getOrderId(), currentDriver.getDriverId())
                .whenComplete((response, error) -> {
                    Platform.runLater(() -> {
                        if (error != null) {
                            UIUtils.showError("錯誤", error.getMessage());
                            return;
                        }
                        
                        if (response.isSuccess()) {
                            currentOrder = response.getData();
                            updateOrderView();
                            UIUtils.showSuccess("行程已完成！車資: $" + 
                                (currentOrder.getActualFare() != null ? 
                                    String.format("%.0f", currentOrder.getActualFare()) : "--"));
                            
                            // 延遲返回主畫面
                            new Timeline(new KeyFrame(Duration.seconds(2), e -> {
                                currentOrder = null;
                                currentDriver.setBusy(false);
                                showMainView();
                            })).play();
                        } else {
                            UIUtils.showError("完成行程失敗", response.getErrorMessage());
                        }
                    });
                });
        }
    }
    
    private void cancelOrder() {
        if (currentOrder == null || currentDriver == null) return;
        
        UIUtils.showConfirm("確認取消", "確定要取消此訂單嗎？")
            .thenAccept(confirmed -> {
                if (confirmed) {
                    apiClient.cancelOrder(currentOrder.getOrderId(), currentDriver.getDriverId(), "司機取消")
                        .whenComplete((response, error) -> {
                            Platform.runLater(() -> {
                                if (error != null) {
                                    UIUtils.showError("錯誤", error.getMessage());
                                    return;
                                }
                                
                                if (response.isSuccess()) {
                                    currentOrder = null;
                                    currentDriver.setBusy(false);
                                    showMainView();
                                    UIUtils.showInfo("已取消", "訂單已取消");
                                } else {
                                    UIUtils.showError("取消失敗", response.getErrorMessage());
                                }
                            });
                        });
                }
            });
    }
    
    private void logout() {
        if (currentDriver != null && currentDriver.getStatus() == DriverStatus.ONLINE) {
            apiClient.goOffline(currentDriver.getDriverId())
                .whenComplete((response, error) -> {
                    Platform.runLater(() -> {
                        currentDriver = null;
                        currentOrder = null;
                        showLoginView();
                    });
                });
        } else {
            currentDriver = null;
            currentOrder = null;
            showLoginView();
        }
    }
    
    // ============================================
    // 輪詢
    // ============================================
    
    private void startPolling() {
        if (pollingTimeline != null) {
            pollingTimeline.stop();
        }
        
        pollingTimeline = new Timeline(new KeyFrame(Duration.seconds(1), e -> refreshOffers()));
        pollingTimeline.setCycleCount(Timeline.INDEFINITE);
        pollingTimeline.play();
    }
    
    private void stopPolling() {
        if (pollingTimeline != null) {
            pollingTimeline.stop();
            pollingTimeline = null;
        }
    }
    
    public void shutdown() {
        stopPolling();
        if (currentDriver != null && currentDriver.getStatus() == DriverStatus.ONLINE) {
            apiClient.goOffline(currentDriver.getDriverId());
        }
    }
}
