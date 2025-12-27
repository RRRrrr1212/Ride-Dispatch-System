# 🛠️ 技術選型

> **文件**: 01_TECH_STACK.md  
> **更新日期**: 2025-12-27

---

## 核心技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| **React** | 18.x | UI 框架 |
| **Vite** | 5.x | 建置工具 |
| **TypeScript** | 5.x | 型別安全 |
| **MUI (Material-UI)** | 5.x | UI 元件庫 |
| **React Router** | 6.x | 路由管理 |
| **Zustand** | 4.x | 狀態管理 |
| **Axios** | 1.x | HTTP Client |
| **vite-plugin-pwa** | 0.17.x | PWA 支援 |

---

## 為什麼選 MUI？

| 考量點 | MUI | Tailwind | AntD |
|--------|-----|----------|------|
| **App-like 元件** | ✅ BottomNav, SwipeableDrawer | ❌ 需自建 | ⚠️ 偏桌面 |
| **Safe Area 支援** | ✅ 內建 | ⚠️ 手動處理 | ⚠️ 手動處理 |
| **TypeScript** | ✅ 完善 | ✅ 完善 | ✅ 完善 |
| **學習成本** | ⚠️ 中等 | ⚠️ 需學命名 | ⚠️ 中等 |
| **主題客製化** | ✅ Theme Provider | ✅ Tailwind Config | ✅ ConfigProvider |

**結論**: MUI 提供最接近原生 App 的元件，適合「像 App」的需求。

---

## 依賴清單

### package.json

```json
{
  "name": "uber-web-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "vitest": "^1.1.0",
    "@testing-library/react": "^14.1.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0"
  }
}
```

---

## 初始化指令

```bash
# 建立專案
npm create vite@latest web-client -- --template react-ts

# 進入目錄
cd web-client

# 安裝核心依賴
npm install react-router-dom @mui/material @mui/icons-material @emotion/react @emotion/styled zustand axios

# 安裝開發依賴
npm install -D vite-plugin-pwa vitest @testing-library/react
```

---

## 環境變數

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api

# .env.production
VITE_API_BASE_URL=/api
```

---

**下一步**: 閱讀 [02_PROJECT_STRUCTURE.md](./02_PROJECT_STRUCTURE.md) 了解專案結構
