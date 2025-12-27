# 📋 前端大整改總覽

> **版本**: v1.0  
> **建立日期**: 2025-12-27  
> **專案**: Ride-Dispatch-System 前端重構

---

## 🎯 改造目標

將前端從 **JavaFX Desktop Apps** 轉換為 **統一的 React Web 應用**：

| 入口 | 目標 | 特性 |
|------|------|------|
| `/rider/*` | 乘客端 App-like UI | 手機優先、PWA 支援 |
| `/driver/*` | 司機端 App-like UI | 手機優先、PWA 支援 |
| `/admin/*` | 後台管理桌面版 | 桌面優先、RBAC 權限 |
| `/login` | 統一登入頁 | 支援乘客/司機/管理員 |

---

## 📊 現況分析

### 目前架構

| 項目 | 現況 | 問題 |
|------|------|------|
| **乘客端** | JavaFX Desktop App | 不像手機 App，無法跨平台 |
| **司機端** | JavaFX Desktop App | 同上 |
| **後台管理** | JavaFX Desktop App | 桌面版可接受，但維護三套技術棧成本高 |
| **後端 API** | Spring Boot (已完成 Phase 1-3) | ✅ 可完全複用 |

### 已有資源

- ✅ 完整的後端 API (`/api/orders`, `/api/drivers`, `/api/admin`)
- ✅ 狀態機合約 (`docs/specs/state-machine.md`)
- ✅ API 規格文件 (`docs/specs/api-spec.md`)
- ✅ UI/UX 設計規範 (`docs/UI_UX_DESIGN_SPEC.md`)

---

## 📁 文件索引

| 文件 | 說明 |
|------|------|
| [01_TECH_STACK.md](./01_TECH_STACK.md) | 技術選型與依賴 |
| [02_PROJECT_STRUCTURE.md](./02_PROJECT_STRUCTURE.md) | 專案資料夾結構 |
| [03_ROUTING.md](./03_ROUTING.md) | 路由設計與守衛 |
| [04_LAYOUTS.md](./04_LAYOUTS.md) | UI Layout 設計 |
| [05_PWA_CONFIG.md](./05_PWA_CONFIG.md) | PWA 設定 |
| [06_API_CLIENT.md](./06_API_CLIENT.md) | API 串接範例 |
| [07_MVP_SCREENS.md](./07_MVP_SCREENS.md) | MVP 畫面清單 |
| [08_TESTING.md](./08_TESTING.md) | 測試策略 |
| [09_IMPLEMENTATION_PLAN.md](./09_IMPLEMENTATION_PLAN.md) | 實作計畫與時程 |

---

## 🚀 快速開始

```bash
# 1. 進入 web-client 目錄
cd clients/web-client

# 2. 安裝依賴
npm install

# 3. 啟動開發伺服器
npm run dev

# 4. 開啟瀏覽器
# 乘客端: http://localhost:5173/rider
# 司機端: http://localhost:5173/driver
# 管理後台: http://localhost:5173/admin
```

---

**下一步**: 閱讀 [01_TECH_STACK.md](./01_TECH_STACK.md) 了解技術選型
