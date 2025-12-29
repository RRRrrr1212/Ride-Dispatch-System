# IntelliJ MetricsReloaded - WMC 報告查看指南

**日期**: 2025-12-29  
**工具**: IntelliJ IDEA MetricsReloaded Plugin  
**分析指標**: WMC (Weighted Method Complexity)

---

## 📋 如何在 IntelliJ 中使用 MetricsReloaded 查看 WMC 報告

### Step 1: 安裝 MetricsReloaded 插件

#### 方法 A: 通過 IntelliJ Marketplace (推薦)

1. **打開 IntelliJ IDEA**
2. 菜單: `IntelliJ IDEA` → `Preferences` (Mac) 或 `File` → `Settings` (Windows/Linux)
3. 左側導航: `Plugins`
4. 搜尋框輸入: `MetricsReloaded`
5. 點擊 `Install` 按鈕
6. 重新啟動 IntelliJ IDEA

#### 方法 B: 手動安裝

1. 下載插件: https://plugins.jetbrains.com/plugin/93-metricsreloaded
2. 打開 IntelliJ IDEA
3. `Preferences` → `Plugins` → 點擊齒輪圖標
4. 選擇 `Install Plugin from Disk...`
5. 選擇下載的 `.jar` 文件
6. 重啟 IntelliJ

---

### Step 2: 執行 MetricsReloaded 分析

1. **打開您的項目** (`/Users/ivan/Ride-Dispatch-System`)

2. **選擇分析範圍** - 以下三種方式：

   **方式 A: 分析整個項目**
   - 在 Project 窗口中右鍵點擊項目名稱
   - 選擇 `Analyze` → `Run MetricsReloaded Analysis`
   
   **方式 B: 分析特定模塊**
   - 右鍵點擊 `server` 模塊
   - 選擇 `Analyze` → `Run MetricsReloaded Analysis`
   
   **方式 C: 分析特定包或類**
   - 右鍵點擊 `com.uber.service` 包
   - 選擇 `Analyze` → `Run MetricsReloaded Analysis`

3. **等待分析完成**
   - IntelliJ 會在下方的 `Metrics` 窗口顯示進度

---

### Step 3: 查看 WMC 報告

分析完成後，會在 `Metrics` 窗口顯示：

#### 報告內容

```
Project Metrics
├── Lines of Code (LOC)
├── Cyclomatic Complexity (CC)
├── Weighted Method Complexity (WMC)  ← 我們關注的指標
├── Depth of Inheritance Tree (DIT)
├── Number of Children (NOC)
├── Coupling Between Objects (CBO)
└── Lack of Cohesion of Methods (LCOM)
```

#### WMC 解釋

**WMC (Weighted Method Complexity)**:
- **定義**: 類的所有方法複雜度的加權和
- **計算**: WMC = Σ(每個方法的複雜度)
- **低值更好**: WMC < 10 為優秀，< 15 為良好，> 20 為需改進

---

### Step 4: 查看詳細信息

在 Metrics 窗口中，點擊不同的類來查看詳細信息：

#### 類級別的 WMC 查看

| 列 | 說明 |
|---|---|
| **Class** | 類名 |
| **WMC** | 加權方法複雜度 |
| **LOC** | 代碼行數 |
| **CC** | 循環複雜度 |
| **DIT** | 繼承深度 |
| **NOC** | 子類數量 |

#### 方法級別的查看

選中一個類後，可以展開看到該類的所有方法及其複雜度：

```
MatchingService (WMC: 18)
├─ findBestDriver() - CC: 3
├─ getAvailableOrders() - CC: 4
├─ getAvailableDrivers() - CC: 2
├─ calculateDistance() - CC: 3
└─ setSearchRadius() - CC: 1
```

---

## 🎯 特定文件的 WMC 分析

### 1. MatchingService.java

根據 MatchingServiceTest.java 的覆蓋情況分析：

**預期的高複雜度方法**:
- `findBestDriver()` - 篩選邏輯複雜 (CC: 3-4)
- `getAvailableOrders()` - 排序邏輯 (CC: 3-4)
- `calculateDistance()` - 距離計算 (CC: 2-3)

**總 WMC 估計**: 15-20

### 2. AdminController.java

多個 build* 方法：
- `buildOrderSummary()` - 多個 null 檢查 (CC: 3-4)
- `buildDriverSummary()` - 多個 null 檢查 (CC: 3-4)
- `buildOrderDetail()` - 多個 null 檢查 (CC: 4-5)
- `buildAuditLogResponse()` - 簡單邏輯 (CC: 1-2)

**總 WMC 估計**: 20-25

### 3. ValidationService.java

複雜的驗證邏輯：
- `validateOrderStateTransition()` - 狀態機 (CC: 5-6)
- `validateRatePlan()` - 多條件檢查 (CC: 4-5)
- `validateLocationUpdate()` - 邊界檢查 (CC: 3-4)

**總 WMC 估計**: 25-30 (較高複雜度)

### 4. OrderController.java

訂單操作方法：
- `acceptOrder()` - 狀態檢查 (CC: 3-4)
- `startTrip()` - 狀態轉換 (CC: 2-3)
- `completeTrip()` - 結算邏輯 (CC: 3-4)

**總 WMC 估計**: 15-20

---

## 📊 MetricsReloaded 窗口位置

### 在 IntelliJ 中找到 Metrics 窗口

1. **菜單方式**:
   - `View` → `Tool Windows` → `Metrics`

2. **快捷方式**:
   - 在 IDE 底部會有一個 `Metrics` 標籤頁
   - 如果沒看到，點擊左下角的 "☰" 圖標

3. **雙屏查看** (推薦):
   - 左側: 代碼編輯器
   - 右側: Metrics 面板
   - 中部底部: Metrics 詳細報告

---

## 🔍 WMC 報告的常見視圖

### 視圖 1: Package Overview

```
Metrics for Package: com.uber.service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Class Name              WMC   LOC   CC   DIT
─────────────────────────────────────────
MatchingService          18    320   22   1
ValidationService        28    450   35   1
OrderService             25    380   30   1
DriverService            20    310   25   1
FareService              15    250   18   1
AuditService             12    180   14   1

Package Total:          118   1870  144  -
```

### 視圖 2: Class Detailed View

```
MatchingService Details
━━━━━━━━━━━━━━━━━━━━━━━
Method Name                  CC   LOC
──────────────────────────────────
+ findBestDriver()           4    45
+ getAvailableOrders()       4    50
+ getAvailableDrivers()      2    25
+ calculateDistance()        3    35
+ setSearchRadius()          1    20
+ getSearchRadius()          1    10
- filterAvailableDrivers()   3    40
- sortByDistance()           2    30

Class WMC Sum:              20   255
Class Complexity Ratio:    1.05
```

### 視圖 3: Violation List

顯示違反複雜度閾值的方法：

```
Complexity Violations
━━━━━━━━━━━━━━━━━━━━━
Level    Class              Method              CC    Limit
────────────────────────────────────────────────────────
⚠️ HIGH  ValidationService  validateOrder*      6     5
⚠️ HIGH  OrderController    updateOrder()       5     5
⚠️ MED   AdminController    getAllOrders()      4     3
```

---

## 💡 使用 MetricsReloaded 的最佳實踐

### 1. 定期檢查 WMC

```
分析週期:
├─ 每次大功能開發後: ✅
├─ Pull Request 前: ✅
├─ 每週: ✅
└─ 重構前後: ✅
```

### 2. WMC 改進策略

如果發現 WMC 過高 (> 20):

```
方案 A: 提取方法 (Extract Method)
  複雜方法 → 分解成多個簡單方法

方案 B: 移到新類 (Extract Class)
  功能複雜類 → 分散到多個類

方案 C: 簡化邏輯 (Simplify Logic)
  複雜條件 → 使用多態或策略模式
```

### 3. 導出報告

在 Metrics 窗口中：
1. 右鍵點擊報告
2. 選擇 `Export to...`
3. 選擇格式: CSV, HTML, PDF
4. 保存位置: `docs/quality/`

---

## 📈 預期的 WMC 數值範圍

| 組件 | 預期 WMC | 評級 |
|------|---------|------|
| **MatchingService** | 15-20 | 🟢 良好 |
| **FareService** | 10-15 | 🟢 優秀 |
| **OrderService** | 20-25 | 🟡 需改進 |
| **ValidationService** | 25-30 | 🔴 過高 |
| **AdminController** | 20-25 | 🟡 需改進 |
| **整個 server 模塊** | 200-250 | 🟡 中等 |

---

## 🎯 MatchingServiceTest.java 相關的 WMC 分析

根據您的 MatchingServiceTest.java 測試覆蓋，MatchingService 的預期 WMC:

### 覆蓋的方法複雜度:

```
testMatch_OnlineDriverOnly()        → findBestDriver() CC: 2
testMatch_NonBusyOnly()              → CC: +1 (busy 檢查)
testMatch_VehicleTypeFilter()        → CC: +1 (type 篩選)
testMatch_DistanceSort()             → getAvailableOrders() CC: 3
testGetAvailableOrders_*()           → CC: 2-3
calculateDistance()                  → CC: 2 (null 檢查)
setSearchRadius()                    → CC: 1 (簡單驗證)

推估 WMC = 15-18 (較低複雜度)
```

---

## ✅ 檢查清單

- [ ] 安裝 MetricsReloaded 插件
- [ ] 打開 `Metrics` 窗口
- [ ] 運行項目的 MetricsReloaded 分析
- [ ] 查看整個項目的 WMC
- [ ] 檢查 `com.uber.service` 包的 WMC
- [ ] 重點檢查 `MatchingService`, `ValidationService`, `OrderService`
- [ ] 識別 WMC > 20 的類進行優化
- [ ] 導出報告到 `docs/quality/WMC_Analysis_Report.html`

---

## 🔗 相關資源

- **MetricsReloaded 官方**: https://plugins.jetbrains.com/plugin/93-metricsreloaded
- **JetBrains 幫助**: https://www.jetbrains.com/help/idea/code-metrics.html
- **複雜度降低指南**: `DETAILED_BRANCH_COVERAGE_GUIDE.md`

---

**下一步**: 按照上述步驟在 IntelliJ 中安裝並運行 MetricsReloaded 分析，查看詳細的 WMC 報告。

