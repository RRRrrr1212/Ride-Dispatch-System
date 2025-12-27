# 📁 專案資料夾結構

> **文件**: 02_PROJECT_STRUCTURE.md  
> **更新日期**: 2025-12-27

---

## 完整結構

```
clients/web-client/
├── public/
│   ├── icons/                    # PWA 圖示
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   ├── manifest.json             # PWA Manifest
│   └── favicon.ico
│
├── src/
│   ├── main.tsx                  # 應用入口
│   ├── App.tsx                   # 路由配置
│   ├── vite-env.d.ts
│   │
│   ├── api/                      # API 層
│   │   ├── client.ts             # Axios 實體 + 攔截器
│   │   ├── order.api.ts          # 訂單 API
│   │   ├── driver.api.ts         # 司機 API
│   │   └── admin.api.ts          # 管理員 API
│   │
│   ├── stores/                   # Zustand 狀態管理
│   │   ├── auth.store.ts         # 認證狀態
│   │   ├── order.store.ts        # 訂單狀態
│   │   └── driver.store.ts       # 司機狀態
│   │
│   ├── types/                    # TypeScript 類型定義
│   │   ├── order.types.ts
│   │   ├── driver.types.ts
│   │   ├── api.types.ts          # API Response 通用類型
│   │   └── index.ts
│   │
│   ├── hooks/                    # Custom Hooks
│   │   ├── useAuth.ts
│   │   ├── useOrder.ts
│   │   └── usePolling.ts         # 輪詢狀態 Hook
│   │
│   ├── components/               # 共用元件
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── StatusChip.tsx    # 訂單狀態標籤
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── InstallPrompt.tsx # PWA 安裝提示
│   │   ├── maps/
│   │   │   └── MapView.tsx       # 簡易地圖元件
│   │   └── cards/
│   │       ├── OrderCard.tsx
│   │       └── DriverCard.tsx
│   │
│   ├── layouts/                  # 佈局元件
│   │   ├── RiderAppLayout.tsx    # 乘客端 Layout
│   │   ├── DriverAppLayout.tsx   # 司機端 Layout
│   │   └── AdminLayout.tsx       # 管理後台 Layout
│   │
│   ├── pages/                    # 頁面元件
│   │   ├── auth/
│   │   │   └── LoginPage.tsx     # 統一登入頁
│   │   │
│   │   ├── rider/                # 乘客端頁面
│   │   │   ├── HomePage.tsx
│   │   │   ├── RideRequestPage.tsx
│   │   │   ├── WaitingPage.tsx
│   │   │   ├── TripPage.tsx
│   │   │   ├── CompletedPage.tsx
│   │   │   └── HistoryPage.tsx
│   │   │
│   │   ├── driver/               # 司機端頁面
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── OrderDetailPage.tsx
│   │   │   ├── TripPage.tsx
│   │   │   └── HistoryPage.tsx
│   │   │
│   │   └── admin/                # 管理後台頁面
│   │       ├── DashboardPage.tsx
│   │       ├── OrdersPage.tsx
│   │       ├── DriversPage.tsx
│   │       ├── AuditLogsPage.tsx
│   │       └── RatePlansPage.tsx
│   │
│   ├── guards/                   # 路由守衛
│   │   ├── AuthGuard.tsx
│   │   └── RoleGuard.tsx
│   │
│   ├── utils/                    # 工具函數
│   │   ├── format.ts
│   │   └── constants.ts
│   │
│   └── theme/                    # MUI 主題
│       ├── index.ts
│       ├── palette.ts
│       └── components.ts
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 目錄說明

| 目錄 | 說明 |
|------|------|
| `api/` | 所有 HTTP 請求封裝 |
| `stores/` | 全域狀態管理 (Zustand) |
| `types/` | TypeScript 介面與類型 |
| `hooks/` | 可重用的 React Hooks |
| `components/` | 可重用 UI 元件 |
| `layouts/` | 頁面佈局框架 |
| `pages/` | 路由對應的頁面 |
| `guards/` | 路由權限守衛 |
| `utils/` | 工具函數 |
| `theme/` | MUI 主題設定 |

---

## 命名規則

| 類型 | 規則 | 範例 |
|------|------|------|
| **元件** | PascalCase | `OrderCard.tsx` |
| **Hooks** | camelCase + use 前綴 | `useOrder.ts` |
| **API** | camelCase + .api 後綴 | `order.api.ts` |
| **Store** | camelCase + .store 後綴 | `auth.store.ts` |
| **類型** | camelCase + .types 後綴 | `order.types.ts` |

---

**下一步**: 閱讀 [03_ROUTING.md](./03_ROUTING.md) 了解路由設計
