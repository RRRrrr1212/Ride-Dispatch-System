package com.uber.client.util;

import javafx.scene.paint.Color;
import javafx.scene.paint.CycleMethod;
import javafx.scene.paint.LinearGradient;
import javafx.scene.paint.Stop;

/**
 * Uber 風格主題 - 現代化設計系統
 * 參考 Uber Design System (Base)
 */
public class Theme {
    
    // ============================================
    // 🎨 品牌色彩 (Brand Colors)
    // ============================================
    
    // Uber 主要色彩
    public static final String UBER_GREEN = "#06C167";        // 主要 CTA
    public static final String UBER_GREEN_DARK = "#048848";   // 按下狀態
    public static final String UBER_GREEN_LIGHT = "#1AD87C";  // 懸停狀態
    
    public static final String UBER_BLUE = "#276EF1";         // 連結/資訊
    public static final String UBER_BLUE_DARK = "#1E54B7";
    public static final String UBER_BLUE_LIGHT = "#5B91F5";
    
    // ============================================
    // 🌑 背景色彩 (Background Colors)
    // ============================================
    
    public static final String BG_BLACK = "#000000";          // 純黑背景
    public static final String BG_DARK = "#0D0D0D";           // 深黑背景
    public static final String BG_CARD = "#141414";           // 卡片背景
    public static final String BG_ELEVATED = "#1A1A1A";       // 提升卡片
    public static final String BG_INPUT = "#242424";          // 輸入框背景
    public static final String BG_HOVER = "#2A2A2A";          // 懸停背景
    public static final String BG_SELECTED = "#1A3D26";       // 選中狀態 (綠色調)
    
    // ============================================
    // 📝 文字色彩 (Text Colors)
    // ============================================
    
    public static final String TEXT_PRIMARY = "#FFFFFF";      // 主要文字
    public static final String TEXT_SECONDARY = "#A0A0A0";    // 次要文字
    public static final String TEXT_TERTIARY = "#666666";     // 提示文字
    public static final String TEXT_DISABLED = "#4A4A4A";     // 禁用文字
    
    // ============================================
    // 📊 狀態色彩 (Status Colors)
    // ============================================
    
    public static final String SUCCESS = "#06C167";           // 成功/完成
    public static final String WARNING = "#F6B100";           // 警告/等待
    public static final String ERROR = "#E11900";             // 錯誤/取消
    public static final String INFO = "#276EF1";              // 資訊/進行中
    
    // ============================================
    // 🔲 邊框色彩 (Border Colors)
    // ============================================
    
    public static final String BORDER_DEFAULT = "#363636";
    public static final String BORDER_LIGHT = "#444444";
    public static final String BORDER_FOCUS = "#06C167";
    
    // ============================================
    // 📐 尺寸常數 (Dimensions)
    // ============================================
    
    // 字體大小
    public static final int FONT_XS = 12;
    public static final int FONT_SM = 14;
    public static final int FONT_MD = 16;
    public static final int FONT_LG = 18;
    public static final int FONT_XL = 24;
    public static final int FONT_XXL = 32;
    
    // 間距
    public static final int SPACING_XS = 4;
    public static final int SPACING_SM = 8;
    public static final int SPACING_MD = 16;
    public static final int SPACING_LG = 24;
    public static final int SPACING_XL = 32;
    public static final int SPACING_XXL = 48;
    
    // 圓角
    public static final int RADIUS_SM = 8;
    public static final int RADIUS_MD = 12;
    public static final int RADIUS_LG = 16;
    public static final int RADIUS_XL = 24;
    
    // 高度
    public static final int HEIGHT_INPUT = 52;
    public static final int HEIGHT_BUTTON = 56;
    public static final int HEIGHT_NAVBAR = 56;
    
    // ============================================
    // 舊版兼容 (Legacy Compatibility)
    // ============================================
    
    @Deprecated public static final String PRIMARY = UBER_GREEN;
    @Deprecated public static final String PRIMARY_DARK = UBER_GREEN_DARK;
    @Deprecated public static final String PRIMARY_LIGHT = UBER_GREEN_LIGHT;
    @Deprecated public static final String SECONDARY = "#FF9800";
    @Deprecated public static final String SECONDARY_DARK = "#F57C00";
    
    // ============================================
    // 🎨 漸層效果 (Gradients)
    // ============================================
    
    /**
     * 取得 Uber 風格漸層背景
     */
    public static LinearGradient getUberGradient() {
        return new LinearGradient(0, 0, 0, 1, true, CycleMethod.NO_CYCLE,
                new Stop(0, Color.web(BG_DARK)),
                new Stop(1, Color.web(BG_BLACK)));
    }
    
    /**
     * 取得綠色按鈕漸層
     */
    public static LinearGradient getGreenButtonGradient() {
        return new LinearGradient(0, 0, 0, 1, true, CycleMethod.NO_CYCLE,
                new Stop(0, Color.web(UBER_GREEN_LIGHT)),
                new Stop(1, Color.web(UBER_GREEN)));
    }
    
    // ============================================
    // 🎨 預設樣式 (Base Styles)
    // ============================================
    
    /**
     * 取得 Uber 風格基礎樣式表
     */
    public static String getBaseStyles() {
        return """
            /* ============================================
               Uber 風格基礎樣式
               ============================================ */
            
            .root {
                -fx-font-family: 'Microsoft JhengHei', 'SF Pro Display', 'Segoe UI', sans-serif;
                -fx-background-color: #0D0D0D;
            }
            
            /* 標籤 */
            .label {
                -fx-text-fill: #FFFFFF;
            }
            
            /* 輸入框 */
            .text-field, .password-field {
                -fx-background-color: #242424;
                -fx-text-fill: #FFFFFF;
                -fx-prompt-text-fill: #666666;
                -fx-border-color: #363636;
                -fx-border-radius: 12;
                -fx-background-radius: 12;
                -fx-padding: 14 16;
                -fx-font-size: 16px;
            }
            
            .text-field:focused, .password-field:focused {
                -fx-border-color: #06C167;
                -fx-effect: dropshadow(gaussian, rgba(6, 193, 103, 0.3), 10, 0, 0, 0);
            }
            
            /* 主要按鈕 */
            .button {
                -fx-background-color: #06C167;
                -fx-text-fill: #FFFFFF;
                -fx-font-size: 16px;
                -fx-font-weight: bold;
                -fx-padding: 16 32;
                -fx-background-radius: 12;
                -fx-cursor: hand;
            }
            
            .button:hover {
                -fx-background-color: #1AD87C;
                -fx-effect: dropshadow(gaussian, rgba(6, 193, 103, 0.4), 12, 0, 0, 2);
            }
            
            .button:pressed {
                -fx-background-color: #048848;
            }
            
            .button:disabled {
                -fx-background-color: #2A2A2A;
                -fx-text-fill: #666666;
            }
            
            /* 次要按鈕 */
            .button-secondary {
                -fx-background-color: transparent;
                -fx-border-color: #06C167;
                -fx-border-width: 2;
                -fx-border-radius: 12;
                -fx-text-fill: #06C167;
            }
            
            .button-secondary:hover {
                -fx-background-color: rgba(6, 193, 103, 0.1);
            }
            
            /* 危險按鈕 */
            .button-danger {
                -fx-background-color: #E11900;
                -fx-text-fill: white;
            }
            
            .button-danger:hover {
                -fx-background-color: #FF3D1F;
            }
            
            /* 警告按鈕 */
            .button-warning {
                -fx-background-color: #F6B100;
                -fx-text-fill: #000000;
            }
            
            /* 卡片 */
            .card {
                -fx-background-color: #141414;
                -fx-background-radius: 16;
                -fx-padding: 20;
                -fx-effect: dropshadow(gaussian, rgba(0, 0, 0, 0.25), 10, 0, 0, 4);
            }
            
            .card:hover {
                -fx-background-color: #1A1A1A;
            }
            
            /* 標題 */
            .title {
                -fx-font-size: 32px;
                -fx-font-weight: bold;
                -fx-text-fill: #FFFFFF;
            }
            
            .subtitle {
                -fx-font-size: 16px;
                -fx-text-fill: #A0A0A0;
            }
            
            /* 表格 */
            .table-view {
                -fx-background-color: #141414;
                -fx-border-color: transparent;
            }
            
            .table-view .column-header-background {
                -fx-background-color: #1A1A1A;
            }
            
            .table-view .column-header {
                -fx-background-color: transparent;
            }
            
            .table-view .column-header .label {
                -fx-text-fill: #A0A0A0;
                -fx-font-weight: bold;
                -fx-font-size: 13px;
            }
            
            .table-row-cell {
                -fx-background-color: #141414;
                -fx-border-color: transparent transparent #242424 transparent;
            }
            
            .table-row-cell:hover {
                -fx-background-color: #1A1A1A;
            }
            
            .table-row-cell:selected {
                -fx-background-color: #1A3D26;
            }
            
            .table-cell {
                -fx-text-fill: #FFFFFF;
                -fx-padding: 12 8;
            }
            
            /* 滾動面板 */
            .scroll-pane {
                -fx-background-color: transparent;
            }
            
            .scroll-pane > .viewport {
                -fx-background-color: transparent;
            }
            
            .scroll-bar {
                -fx-background-color: transparent;
            }
            
            .scroll-bar .thumb {
                -fx-background-color: #363636;
                -fx-background-radius: 10;
            }
            
            .scroll-bar .thumb:hover {
                -fx-background-color: #444444;
            }
            
            .scroll-bar .increment-button,
            .scroll-bar .decrement-button {
                -fx-background-color: transparent;
            }
            
            .scroll-bar .increment-arrow,
            .scroll-bar .decrement-arrow {
                -fx-background-color: transparent;
            }
            
            /* 下拉選單 */
            .combo-box {
                -fx-background-color: #242424;
                -fx-border-color: #363636;
                -fx-border-radius: 12;
                -fx-background-radius: 12;
            }
            
            .combo-box .list-cell {
                -fx-text-fill: #FFFFFF;
                -fx-background-color: transparent;
                -fx-padding: 8 12;
            }
            
            .combo-box-popup .list-view {
                -fx-background-color: #242424;
                -fx-background-radius: 12;
                -fx-effect: dropshadow(gaussian, rgba(0, 0, 0, 0.5), 15, 0, 0, 5);
            }
            
            .combo-box-popup .list-cell:hover {
                -fx-background-color: #2A2A2A;
            }
            
            .combo-box-popup .list-cell:selected {
                -fx-background-color: #1A3D26;
            }
            
            /* 進度指示器 */
            .progress-indicator {
                -fx-progress-color: #06C167;
            }
            
            /* 狀態樣式 */
            .status-pending {
                -fx-text-fill: #F6B100;
            }
            
            .status-accepted {
                -fx-text-fill: #276EF1;
            }
            
            .status-ongoing {
                -fx-text-fill: #06C167;
            }
            
            .status-completed {
                -fx-text-fill: #A0A0A0;
            }
            
            .status-cancelled {
                -fx-text-fill: #E11900;
            }
            
            /* 切換按鈕 */
            .toggle-button {
                -fx-background-color: #242424;
                -fx-text-fill: #FFFFFF;
                -fx-background-radius: 999;
                -fx-padding: 12 24;
                -fx-border-color: #363636;
                -fx-border-radius: 999;
            }
            
            .toggle-button:selected {
                -fx-background-color: #06C167;
                -fx-border-color: #06C167;
            }
            """;
    }
    
    // ============================================
    // 🛠️ 元件樣式工廠 (Component Style Factory)
    // ============================================
    
    /**
     * 取得主要按鈕樣式
     */
    public static String getPrimaryButtonStyle() {
        return """
            -fx-background-color: #06C167;
            -fx-text-fill: white;
            -fx-font-size: 16px;
            -fx-font-weight: bold;
            -fx-padding: 16 32;
            -fx-background-radius: 12;
            -fx-cursor: hand;
            """;
    }
    
    /**
     * 取得次要按鈕樣式
     */
    public static String getSecondaryButtonStyle() {
        return """
            -fx-background-color: transparent;
            -fx-border-color: #06C167;
            -fx-border-width: 2;
            -fx-border-radius: 12;
            -fx-text-fill: #06C167;
            -fx-font-size: 14px;
            -fx-padding: 14 28;
            -fx-background-radius: 12;
            -fx-cursor: hand;
            """;
    }
    
    /**
     * 取得危險按鈕樣式
     */
    public static String getDangerButtonStyle() {
        return """
            -fx-background-color: #E11900;
            -fx-text-fill: white;
            -fx-font-size: 14px;
            -fx-font-weight: bold;
            -fx-padding: 14 28;
            -fx-background-radius: 12;
            -fx-cursor: hand;
            """;
    }
    
    /**
     * 取得危險次要按鈕樣式（紅色邊框）
     */
    public static String getDangerOutlineButtonStyle() {
        return """
            -fx-background-color: transparent;
            -fx-border-color: #E11900;
            -fx-border-width: 2;
            -fx-border-radius: 12;
            -fx-text-fill: #E11900;
            -fx-font-size: 14px;
            -fx-padding: 14 28;
            -fx-background-radius: 12;
            -fx-cursor: hand;
            """;
    }
    
    /**
     * 取得輸入框樣式
     */
    public static String getInputStyle() {
        return """
            -fx-background-color: #242424;
            -fx-text-fill: white;
            -fx-prompt-text-fill: #666666;
            -fx-border-color: #363636;
            -fx-border-radius: 12;
            -fx-background-radius: 12;
            -fx-padding: 14 16;
            -fx-font-size: 16px;
            """;
    }
    
    /**
     * 取得卡片樣式
     */
    public static String getCardStyle() {
        return """
            -fx-background-color: #141414;
            -fx-background-radius: 16;
            -fx-padding: 20;
            """;
    }
    
    /**
     * 取得底部面板樣式 (Bottom Sheet)
     */
    public static String getBottomSheetStyle() {
        return """
            -fx-background-color: #141414;
            -fx-background-radius: 24 24 0 0;
            -fx-padding: 20;
            """;
    }
    
    /**
     * 取得導航列樣式
     */
    public static String getNavbarStyle() {
        return """
            -fx-background-color: #000000;
            -fx-padding: 0 16;
            """;
    }
    
    /**
     * 取得選中卡片樣式
     */
    public static String getSelectedCardStyle() {
        return """
            -fx-background-color: #1A3D26;
            -fx-background-radius: 12;
            -fx-border-color: #06C167;
            -fx-border-radius: 12;
            -fx-border-width: 2;
            -fx-padding: 16;
            """;
    }
    
    /**
     * 取得未選中卡片樣式
     */
    public static String getUnselectedCardStyle() {
        return """
            -fx-background-color: #242424;
            -fx-background-radius: 12;
            -fx-border-color: #363636;
            -fx-border-radius: 12;
            -fx-border-width: 2;
            -fx-padding: 16;
            -fx-cursor: hand;
            """;
    }
}
