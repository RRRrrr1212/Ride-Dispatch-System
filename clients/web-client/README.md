# 🚗 Uber Web Client

前端 Web 應用程式，使用 React + TypeScript + MUI 建構。

## 🚀 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build
```

## 📱 應用入口

| 路徑 | 說明 | 目標裝置 |
|------|------|----------|
| `/rider/*` | 乘客端 | 手機 (手機優先設計) |
| `/driver/*` | 司機端 | 手機 (手機優先設計) |
| `/admin/*` | 管理後台 | 桌面 |
| `/login` | 統一登入頁 | 通用 |

## 🛠️ 技術棧

- **框架**: React 18 + TypeScript
- **建置工具**: Vite 5
- **UI 庫**: MUI (Material-UI) 5
- **路由**: React Router 6
- **狀態管理**: Zustand
- **HTTP Client**: Axios
- **PWA**: vite-plugin-pwa

## 📁 專案結構

```
src/
├── api/           # API 請求封裝
├── components/    # 可重用元件
├── guards/        # 路由守衛
├── hooks/         # Custom Hooks
├── layouts/       # 頁面佈局
├── pages/         # 路由頁面
├── stores/        # Zustand 狀態
├── theme/         # MUI 主題
├── types/         # TypeScript 類型
└── utils/         # 工具函數
```

## 🔗 API

後端 API Base URL: `http://localhost:8080/api`

## 📱 PWA 功能

- 可安裝到主畫面
- 全螢幕體驗 (standalone)
- 離線 Shell 快取
