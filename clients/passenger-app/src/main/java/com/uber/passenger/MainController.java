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
    
    // 數據模型 (預設座標：台中市政府)
    // 注意：SimulatedMap 期望 setCenter(Lon, Lat)，但通常 Location 模型是 (Lat, Lon) 或 (X, Y)
    // 我們的 Location 模型是 (x=Lat, y=Lon) ?? 
    // Wait, Location.java: "private double x; private double y;" usually X=Lon, Y=Lat.
    // Let's verify standard usage. If Server uses X, Y. 
    // Code in draw/simulated map: "setCenter(lon, lat)" so X=Lon.
    
    // 但此控制器用 double[] pickupLocation. 
    // 下面 generateAddress logic (dLat, dLon). 
    // Let's assume index 0 = Lat, index 1 = Lon for existing logic consistency in this file.
    private final double[] pickupLocation = new double[]{24.1618, 120.6469}; // Lat, Lon
    private final double[] dropoffLocation = new double[]{0.0, 0.0};
    private VehicleType selectedVehicleType = null; // 初始不選擇
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
        Label phoneLabel = new Label("輸入您的手機號碼以繼續");
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
        // 模擬登入 (未來可接後端 API)
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
        // SimulatedMap: CenterX=Lon, CenterY=Lat
        map.centerXProperty().addListener((obs, old, val) -> updateAddressFromMap());
        map.centerYProperty().addListener((obs, old, val) -> updateAddressFromMap());
        
        // 點擊地圖選擇地點
        map.setOnMapClickListener(point -> {
            if (isInLocationSelectionMode) {
                // point is (Lon, Lat) from SimulatedMap
                map.setCenter(point.getX(), point.getY());
            }
        });
        
        // 設定初始位置 (Lon, Lat) -> Swap from [Lat, Lon]
        map.setCenter(pickupLocation[1], pickupLocation[0]);
        updateAddressFromMap(); // 初始更新一次地址
        
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
        requestRideBtn.setDisable(true); // 初始禁用，直到選擇車種
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
        
        estimatedFareLabel = new Label("預估金額: $--");
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
            requestRideBtn.setDisable(false); // 選擇車種後啟用叫車按鈕
            
            // 簡單的高亮效果
            card.setStyle("-fx-background-color: #444; -fx-border-color: " + Theme.UBER_GREEN + "; -fx-border-radius: 8; -fx-background-radius: 8;");
            // 重置其他卡片樣式
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
            // target is [Lat, Lon], map needs (Lon, Lat)
            map.setCenter(target[1], target[0]);
        }
        
        updateAddressFromMap();
    }
    
    // 確認選點
    private void confirmLocationSelection() {
        isInLocationSelectionMode = false;
        
        // Map CenterX=Lon, CenterY=Lat
        double currentLon = map.getCenterX();
        double currentLat = map.getCenterY();
        
        // 保存座標
        if (isSelectingPickup) {
            pickupLocation[0] = currentLat;
            pickupLocation[1] = currentLon;
            pickupAddress = generateAddress(currentLat, currentLon);
            pickupInput.setText(pickupAddress);
            
            // 如果下車點還沒設，提示設置下車點? 
            // 這裡不自動跳轉，讓用戶自己決定
        } else {
            dropoffLocation[0] = currentLat;
            dropoffLocation[1] = currentLon;
            dropoffAddress = generateAddress(currentLat, currentLon);
            dropoffInput.setText(dropoffAddress);
        }
        
        // 顯示 Bottom Sheet
        TranslateTransition tt = new TranslateTransition(Duration.millis(300), bottomSheet);
        tt.setToY(0);
        tt.play();
        
        confirmLocationBtn.setVisible(false);
        
        // 如果兩點都設好了，顯示車種選單
        // 注意：dropoffLocation 初始為 0,0，所以檢查是否非 0
        if (dropoffLocation[0] != 0) {
            vehicleSelectionBox.setVisible(true);
            vehicleSelectionBox.setManaged(true);
            requestRideBtn.setVisible(true);
            requestRideBtn.setManaged(true);
            
            // 如果已選車種，重新計算
            if (selectedVehicleType != null) {
                calculateEstimate();
            }
        }
    }
    
    private void updateAddressFromMap() {
        // 即時更新地址顯示 (僅在內部狀態記錄，或顯示在 Pin 上方?)
        // 這裡為了效能，主要在 Model 中更新，實際 UI 文字框在 confirm 時更新
        // 但為了 "所見即所得"，我們可以把當前 Pin 下方的地址顯示給用戶看 (例如 Toast 或 漂浮 Label)
        // 簡化：直接更新 address 變數，如果不 confirm 就不寫入 Input
        
        // 實際應用: 應該有一個 "Selected Address" Label 在 Pin 上方
        // 這裡我們暫時只更新變數，confirm 時才顯示到 TextField
        // Map: X=Lon, Y=Lat
        double lon = map.getCenterX();
        double lat = map.getCenterY();
        // generateAddress takes (Lat, Lon)
        String tempAddr = generateAddress(lat, lon);
        
        // Update global var but not text field yet
    }
    
    private String generateAddress(double lat, double lon) {
        // 生成台中的地址
        // 中心 24.1618, 120.6469 (市府)
        
        double dLat = (lat - 24.1618) * 10000; // 緯度差 (約每 0.0001 度 11 公尺)
        double dLon = (lon - 120.6469) * 10000; // 經度差 (約每 0.0001 度 9 公尺)
        
        String district = "西屯區";
        String road = "台灣大道";
        
        // 根據經緯度大致判斷行政區
        if (dLat > 15) { // 北邊
            if (dLon > 10) district = "北屯區";
            else if (dLon < -10) district = "西區";
            else district = "北區";
        } else if (dLat < -15) { // 南邊
            if (dLon > 10) district = "大里區";
            else if (dLon < -10) district = "南屯區";
            else district = "南區";
        } else { // 中間
            if (dLon > 15) district = "東區";
            else if (dLon < -15) district = "龍井區";
            else district = "中區"; // 市中心附近
        }
        
        // 根據經緯度大致判斷路名
        if (Math.abs(dLat) < 5 && Math.abs(dLon) < 5) {
            road = "惠中路";
        } else if (Math.abs(dLat) > 10 && Math.abs(dLon) < 10) {
            road = "文心路";
        } else if (Math.abs(dLon) > 10 && Math.abs(dLat) < 10) {
            road = "公益路";
        } else if (Math.abs(dLat) > 20 || Math.abs(dLon) > 20) {
            road = "環中路";
        }
        
        int sec = (int) (Math.abs(dLon) / 5) + 1;
        int no = (int) (Math.abs(dLat) * 2 + Math.abs(dLon) * 1.5) % 800 + 1;
        
        return String.format("台中市%s%s%d段%d號", district, road, sec, no);
    }
    
    private void calculateEstimate() {
        if (selectedVehicleType == null) return;
        
        // 簡單距離計算 (歐幾里得距離估算，非真實路徑)
        // 1 度經緯度 approx 111km. 
        double latDiff = pickupLocation[0] - dropoffLocation[0];
        double lonDiff = pickupLocation[1] - dropoffLocation[1];
        double distDeg = Math.sqrt(latDiff*latDiff + lonDiff*lonDiff);
        double distKm = distDeg * 111.0;
        
        double base = switch(selectedVehicleType) {
            case STANDARD -> 50;
            case PREMIUM -> 100;
            case XL -> 150;
        };
        double perKm = switch(selectedVehicleType) {
            case STANDARD -> 20;
            case PREMIUM -> 35;
            case XL -> 45;
        };
        
        double fare = base + distKm * perKm;
        estimatedFareLabel.setText(String.format("預估金額: $%.0f", fare));
    }
    
    private void requestRide() {
        if (selectedVehicleType == null) {
            new Alert(Alert.AlertType.WARNING, "請選擇車種").show();
            return;
        }
        
        Location pLoc = new Location(pickupLocation[0], pickupLocation[1]);
        pLoc.setAddress(pickupAddress);
        
        Location dLoc = new Location(dropoffLocation[0], dropoffLocation[1]);
        dLoc.setAddress(dropoffAddress);
        
        requestRideBtn.setDisable(true);
        requestRideBtn.setText("正在呼叫司機...");
        
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
        // 移除舊的等待畫面 (如果有)
        if (root.lookup("#waitingBox") != null) {
            return;
        }

        VBox waitingBox = new VBox(20);
        waitingBox.setId("waitingBox");
        waitingBox.setAlignment(Pos.CENTER);
        // 改為底部浮層，保留地圖可見
        waitingBox.setStyle("-fx-background-color: " + Theme.BG_CARD + "; -fx-background-radius: 20 20 0 0; -fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.3), 10, 0, 0, -5);");
        waitingBox.setMaxHeight(250);
        waitingBox.setPadding(new Insets(30));
        
        Label status = new Label("正在為您尋找司機...");
        status.setTextFill(Color.WHITE);
        status.setFont(Font.font(20));
        
        ProgressIndicator pi = new ProgressIndicator();
        pi.setStyle(" -fx-progress-color: " + Theme.UBER_GREEN + ";");
        
        Button cancelBtn = new Button("取消叫車");
        cancelBtn.setStyle("-fx-background-color: transparent; -fx-text-fill: #aaa; -fx-font-size: 14;");
        cancelBtn.setOnAction(e -> {
            // TODO: Call cancel API
            resetToMain();
        });

        waitingBox.getChildren().addAll(status, pi, cancelBtn);
        
        // 放置在底部，替換原本的 BottomSheet
        mainView.getChildren().remove(bottomSheet);
        StackPane.setAlignment(waitingBox, Pos.BOTTOM_CENTER);
        mainView.getChildren().add(waitingBox);
        
        startPolling();
    }
    
    private void resetToMain() {
        if (pollingTimeline != null) pollingTimeline.stop();
        mainView.getChildren().remove(mainView.lookup("#waitingBox"));
        if (!mainView.getChildren().contains(bottomSheet)) {
            mainView.getChildren().add(bottomSheet);
        }
        requestRideBtn.setDisable(false);
        requestRideBtn.setText("確認叫車");
        
        // 清除司機圖標
        Node driverIcon = map.lookup("#driverIcon");
        if (driverIcon != null) map.getChildren().remove(driverIcon);
    }
    
    private void startPolling() {
        if (pollingTimeline != null) pollingTimeline.stop();
        pollingTimeline = new Timeline(new KeyFrame(Duration.seconds(1), e -> {
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
        currentOrder = order;
        VBox waitingBox = (VBox) mainView.lookup("#waitingBox");
        
        if (order.getStatus() == OrderStatus.ACCEPTED || order.getStatus() == OrderStatus.ONGOING) {
            if (waitingBox != null) {
                Label statusLabel = (Label) waitingBox.getChildren().get(0);
                statusLabel.setText(order.getStatus() == OrderStatus.ACCEPTED ? "司機正趕往您的位置" : "行程中");
                statusLabel.setTextFill(Color.web(Theme.UBER_GREEN));
                
                // 隱藏進度條，顯示司機資訊
                if (waitingBox.getChildren().size() > 1 && waitingBox.getChildren().get(1) instanceof ProgressIndicator) {
                    waitingBox.getChildren().remove(1); // 移除 ProgressIndicator
                    
                    Label driverInfo = new Label("司機已接單"); // 這裡可以加司機名字
                    driverInfo.setTextFill(Color.WHITE);
                    waitingBox.getChildren().add(1, driverInfo);
                }
            }
            
            // 更新地圖上的司機位置
            updateDriverLocationOnMap(order.getDriverId());
        } else if (order.getStatus() == OrderStatus.COMPLETED) {
            new Alert(Alert.AlertType.INFORMATION, "行程結束！").show();
            resetToMain();
        }
    }

    private void updateDriverLocationOnMap(String driverId) {
        if (driverId == null) return;
        
        apiClient.getDriver(driverId).thenAccept(res -> {
            if (res.isSuccess()) {
                Platform.runLater(() -> {
                    Driver driver = res.getData();
                    Location loc = driver.getLocation();
                    if (loc != null) {
                        renderDriverIcon(loc.getX(), loc.getY());
                    }
                });
            }
        });
    }

    private void renderDriverIcon(double lat, double lon) {
        Node icon = map.lookup("#driverIcon");
        Label carLabel;
        
        if (icon == null) {
            carLabel = new Label("🚖"); // 司機圖標
            carLabel.setId("driverIcon");
            carLabel.setFont(Font.font(30));
            carLabel.setEffect(new javafx.scene.effect.DropShadow(5, Color.BLACK));
            map.getChildren().add(carLabel);
        } else {
            carLabel = (Label) icon;
        }
        
        // 轉換座標
        double screenX = map.worldToScreenX(lat);
        double screenY = map.worldToScreenY(lon);
        
        // 簡單平滑移動動畫
        TranslateTransition tt = new TranslateTransition(Duration.millis(800), carLabel);
        tt.setToX(screenX - 15); // 置中補償
        tt.setToY(screenY - 15);
        tt.play();
        
        // 確保圖標位置正確 (如果地圖拖動了，這裡其實需要綁定，但為求簡單先直接設定 Translate)
        // 更好的做法是 bind LayoutX/Y 到 map 的轉換函數，但那太複雜。
        // 這裡我們每次 polling 更新一次位置。
        // 注意：因為 map 是 Pane，直接 setTranslate 相對於 Pane (0,0) 是 OK 的。
        // 但如果地圖中心變了 (SimulatedMap 重繪)，圖標位置會跑掉。
        // 我們需要在 SimulatedMap 的 draw() 或 centerX/Y 變更時也更新圖標。
        // 暫時解法：限制乘客在等待時不要亂動地圖，或者在 checkOrderStatus 裡頻繁更新。
    }
}
