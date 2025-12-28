# 🚖 Ride-Dispatch System 專案結案報告

> **文件**: PROJECT_FINAL_REPORT.md  
> **日期**: 2025-12-29  
> **作者**: Antigravity AI Assistant & User

---

## 1. 專案概述 (Project Overview)

本專案為一套模擬 Uber/Grab 的**叫車媒合系統 (Ride-Dispatch System)**，旨在實現核心的叫車、接單、以及後台管理功能。

系統採用**前後端分離 (Client-Server)** 架構：
- **前端**: 使用 **React** 與 **MUI** 建構的現代化 Web 應用，提供乘客、司機與管理員三種介面。
- **後端**: 使用 **Spring Boot** 建構的 RESTful API 服務，負責核心業務邏輯與資料處理。

本專案特別著重於**高併發下的搶單正確性 (Concurrency)**、**資料一致性 (Data Consistency)** 以及 **良好的使用者體驗 (UX)**。

---

## 2. 系統功能 (System Features)

### 👤 乘客端 (Passenger App)
*   **即時叫車**: 
    *   整合 OpenStreetMap 地圖。
    *   支援地址輸入與座標選點。
    *   動態計算預估車資 (基於距離與時間) 與顯示規劃路徑。
    *   選擇不同車種 (Standard, Premium, XL)。
*   **行程追蹤**: 
    *   即時在地圖上查看司機位置。
    *   顯示司機資訊 (車牌、車型、評分)。
*   **狀態同步**: 
    *   透過 Polling 機制即時更新訂單狀態流轉：`PENDING` (等待) -> `ACCEPTED` (接單) -> `ONGOING` (行程中) -> `COMPLETED` (完成)。
*   **歷史紀錄**: 查看已完成的行程與費用明細。

### 🚗 司機端 (Driver App)
*   **狀態控制**: 
    *   **上線/下線**: 切換工作狀態 (Online/Offline)。
    *   **位置更新**: 模擬即時 GPS 位置回報。
*   **即時媒合**: 
    *   接收附近的叫車請求 (Offers)。
    *   查看乘客距離與預估收益。
*   **搶單機制 (核心功能)**: 
    *   支援多位司機同時搶單。
    *   **H2 規則驗證**: 系統確保同時搶單時，僅有一位司機成功，其餘收到 `409 Conflict`。
*   **行程管理**: 
    *   執行「開始行程」與「完成行程」。
    *   系統自動根據實際行駛距離計算最終車資。

### 🛠 管理後台 (Admin Console)
*   **即時儀表板**: 
    *   監控系統總訂單數、總營收、線上與忙碌司機數等關鍵指標 (KPI)。
*   **資料管理**: 
    *   **訂單管理**: 查詢、篩選所有歷史訂單。
    *   **司機管理**: 查看司機狀態、位置與接單紀錄。
    *   **乘客管理**: 管理乘客帳號與黑名單。
*   **費率設定**: 
    *   動態調整不同車種 (Standard, Premium, XL) 的計費規則 (基本費、里程費、時間費)。
*   **審計日誌 (Audit Log)**: 
    *   詳實記錄每一次關鍵操作 (如建立訂單、搶單成功/失敗、狀態變更)。
    *   用於系統除錯與爭議追蹤。
*   **系統維護**: 
    *   強制取消異常訂單 (Force Cancel)。
    *   重置系統資料 (Clear All)。

---

## 3. 技術架構 (Technology Stack)

### 前端 (Frontend) - Web Client
| 技術 | 說明 |
|------|------|
| **React 18** | 核心 UI 框架，採用 Functional Components 與 Hooks。 |
| **TypeScript** | 提供靜態型別檢查，提升代碼穩健性。 |
| **Vite** | 極速的前端建構工具 (Build Tool)。 |
| **Material-UI (MUI)** | Google Material Design 風格的元件庫，確保 UI 一致且美觀。 |
| **Zustand** | 輕量級全域狀態管理 (State Management)。 |
| **Leaflet / React-Leaflet** | 開源地圖整合，介接 OpenStreetMap Tile Server。 |
| **OSRM API** | 開源路徑規劃服務 (Open Source Routing Machine) 用於繪製導航路線。 |
| **Axios** | 處理 HTTP 請求與攔截器 (Interceptors)。 |

### 後端 (Backend) - REST API
| 技術 | 說明 |
|------|------|
| **Spring Boot 3.x** | 基於 Java 17 的快速應用程式開發框架。 |
| **Spring Web MVC** | 實作 RESTful Controller 層。 |
| **Maven** | 專案相依性管理與建構工具。 |
| **JUnit 5 & Mockito** | 單元測試與整合測試框架。 |
| **Jackson** | 處理 JSON 序列化與反序列化。 |

### 資料存儲 (Data Persistence)
為了簡化部署並專注於邏輯實作，本專案採用 **In-Memory + JSON Persistence** 策略模擬資料庫：

1.  **記憶體運算 (In-Memory)**: 執行時所有資料 (Entities) 皆儲存於 `ConcurrentHashMap` 或 `List` 中，確保極高的存取效能。
2.  **檔案持久化 (File Persistence)**: 當資料發生變更 (Create/Update/Delete) 時，同步將資料序列化寫入專案根目錄的 `data/*.json` 檔案。
3.  **資料結構設計**:
    *   `drivers.json`: 司機的基本資料、當前位置、狀態 (Online/Busy)。
    *   `orders.json`: 訂單的完整生命週期、路徑資訊、費用明細。
    *   `riders.json`: 乘客帳號資訊。
    *   `audit_logs.json`: 系統操作流水帳，包含 Timestamp, Actor, Action, Result。
    *   `rate_plans.json`: 各車種的定價策略設定。

---

## 4. 遇到的困難與解決方案 (Challenges & Solutions)

### ⚔️ 挑戰 1: 高併發搶單 (Race Condition Handling)
*   **困難**: 當多位司機幾乎在同一毫秒對同一張 `PENDING` 訂單發送 `accept` 請求時，若無適當控制，會導致多位司機同時接單的嚴重 Bug。
*   **解決**: 
    *   在 `OrderService` 層級實作 **執行緒鎖 (ReentrantLock)** 與 **Double-Check Locking**。
    *   嚴格定義狀態機 (State Machine)，僅允許 `PENDING` -> `ACCEPTED` 的轉換。
    *   使用 `synchronized` 區塊確保同一筆訂單的狀態檢查與更新是原子操作 (Atomic)。
    *   驗證結果：透過 `ConcurrencyH2Test` 模擬 10 執行緒併發，確認僅 1 行程成功，其餘回傳 `409 Conflict`。

### 🔄 挑戰 2: 前後端即時狀態同步
*   **困難**: 傳統 HTTP 是 Request-Response 模型，伺服器無法主動將「司機已接單」或「車輛位置更新」推播給乘客端。
*   **解決**: 
    *   實作 **Short Polling (短輪詢)** 機制。
    *   前端封裝 `useInterval` Hook，在特定頁面 (如等待頁、行程頁) 每 1-3 秒向後端查詢最新狀態。
    *   優化 API 回應大小 (Payload)，僅回傳必要的差異資料，降低頻寬消耗。

### 🗺️ 挑戰 3: 地圖與路徑規劃整合
*   **困難**: 商業地圖 API (Google Maps) 需要信用卡綁定與 API Key，且開發成本高；且需要模擬車輛在路徑上的平滑移動。
*   **解決**: 
    *   採用 **OpenStreetMap (OSM)** 搭配 **Leaflet** 顯示地圖。
    *   使用 **OSRM (Open Source Routing Machine)** 的公用 Demo API 取得導航路徑 (Polyline)。
    *   前端實作 **路徑解碼 (Polyline Decoding)** 與 **插值動畫 (Interpolation)**，讓司機圖示能沿著真實道路路徑平滑移動，而非直線跳躍。

### 🏗️ 挑戰 4: 從 JavaFX 轉型至 Web 架構
*   **困難**: 專案初期計畫使用 JavaFX 開發桌面客戶端，但發現其在地圖整合與現代化 UI 表現上的侷限性。
*   **解決**: 
    *   果斷進行技術轉型，將 Client 層改為 React Web App。
    *   利用 Spring Boot 後端的 **REST API 特性**，成功在不修改後端核心邏輯的情況下，完成了前端介面的徹底翻新。
    *   新的 Web 架構具備各裝置相容性 (RWD) 與未來的 PWA 擴充潛力。

---

## 5. 未來展望 (Future Work)

若需進一步優化本系統，可考慮以下方向：

1.  **WebSocket 整合**: 將 Polling 機制改為 WebSocket 推播，實現真正的毫秒級即時通訊。
2.  **真實資料庫遷移**: 將 JSON Persistence 改為 MySQL 或 PostgreSQL，並引入 JPA/Hibernate ORM。
3.  **PWA 離線功能**: 完善 Service Worker 設定，讓 App 在無網路環境下也能查看歷史紀錄或基本 UI。
4.  **金流串接**: 整合 Stripe 或 PayPal API，實現真實的線上支付功能。
