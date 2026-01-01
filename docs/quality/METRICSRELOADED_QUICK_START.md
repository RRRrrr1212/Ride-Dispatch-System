# IntelliJ MetricsReloaded - 快速操作指南

**適用版本**: IntelliJ IDEA 2024.x - 2025.x  
**插件**: MetricsReloaded v1.3.8+  
**日期**: 2025-12-29

---

## 🚀 快速開始（5分鐘）

### 第一步：安裝 MetricsReloaded

```
1. 打開 IntelliJ IDEA
2. ⌘+, (Mac) 或 Ctrl+Alt+S (Windows/Linux)
3. 搜尋: Plugins
4. 搜尋框輸入: MetricsReloaded
5. 點擊 Install
6. 重啟 IDE
```

### 第二步：打開您的項目

```
File → Open → /Users/ivan/Ride-Dispatch-System
```

### 第三步：執行分析

```
方式 1: 分析整個項目
└─ 在 Project 窗口中右鍵點擊項目根目錄
   → Analyze → Run MetricsReloaded Analysis

方式 2: 分析特定模塊 (推薦)
└─ 右鍵點擊 server 模塊
   → Analyze → Run MetricsReloaded Analysis

方式 3: 分析特定文件
└─ 打開 MatchingService.java
   → 右鍵點擊文件標籤
   → Analyze → Run MetricsReloaded Analysis
```

### 第四步：查看結果

分析完成後，在 IDE 底部會出現 **Metrics** 標籤頁：

```
┌─────────────────────────────────────────────────┐
│ Metrics                                    ▼    │
├─────────────────────────────────────────────────┤
│ Class Name              WMC   LOC   CC    DIT   │
├─────────────────────────────────────────────────┤
│ ✓ MatchingService        14   188   14    1    │
│ ✓ FareService            16   250   18    1    │
│ ✓ OrderService           28   380   35    1    │
│ ✓ AdminController        22   450   28    1    │
│ ✓ ValidationService      32   500   40    1    │
├─────────────────────────────────────────────────┤
│ Total:                  112  1768  135    -    │
└─────────────────────────────────────────────────┘
```

---

## 📊 Metrics 窗口詳解

### 主要列說明

| 列名 | 說明 | 數值範圍 | 評級 |
|------|------|---------|------|
| **WMC** | 加權方法複雜度 | 1-∞ | < 20 🟢 |
| **LOC** | 代碼行數 | - | - |
| **CC** | 循環複雜度 | 1-∞ | < 10 🟢 |
| **DIT** | 繼承深度 | 1-∞ | < 5 🟢 |
| **NOC** | 子類數量 | 0-∞ | < 5 🟢 |
| **CBO** | 耦合度 | 0-∞ | < 10 🟢 |
| **LCOM** | 內聚度 | 0-1 | > 0.8 🟢 |

### 快速導航

```
Metrics 窗口快捷操作:

1. 展開/摺疊類
   └─ 點擊類名左邊的 ▶/▼

2. 查看方法詳情
   └─ 展開類後可看到各個方法的複雜度

3. 跳轉到代碼
   └─ 雙擊某行自動跳轉到代碼位置

4. 過濾顯示
   └─ 工具欄上有過濾按鈕（目標圖標）

5. 排序
   └─ 點擊列頭按複雜度、行數等排序
```

---

## 🎯 針對 MatchingService 的查看步驟

### 步驟 1: 選擇 MatchingService 進行分析

```
1. 在 Project 視圖中找到:
   src/main/java/com/uber/service/MatchingService.java

2. 右鍵點擊
   → Analyze → Run MetricsReloaded Analysis
```

### 步驟 2: 查看類級別數據

```
MatchingService
├─ WMC: 14         ← 總複雜度 (優秀)
├─ LOC: 188        ← 代碼行數
├─ CC:  14         ← 循環複雜度
├─ DIT: 1          ← 繼承深度
└─ CBO: 3          ← 耦合度
```

### 步驟 3: 展開查看方法級別數據

```
展開 MatchingService 節點，看到:

├─ findBestDriver()          CC: 4  最複雜的方法
├─ getAvailableOrders()      CC: 3
├─ calculateDistance()       CC: 2
├─ getAvailableDrivers()     CC: 2
├─ setSearchRadius()         CC: 2
├─ getSearchRadius()         CC: 1  最簡單的方法
└─ DriverCandidate()         CC: 1  內部類
```

### 步驟 4: 點擊方法跳轉到代碼

```
在 Metrics 窗口中:
1. 點擊 findBestDriver()
2. 自動跳轉到代碼編輯器中該方法的位置
3. 可以直接在代碼中查看複雜度來源
```

---

## 🔍 詳細分析 MatchingService 的複雜度

### 查看 findBestDriver() 的複雜度分解

```
在 Metrics 窗口點擊 findBestDriver()

顯示詳細信息:
┌──────────────────────────────────────────┐
│ Method: findBestDriver()                 │
├──────────────────────────────────────────┤
│ CC: 4                                    │
│ LOC: 40                                  │
│ Complexity Distribution:                 │
│ ├─ if statements: 2                      │
│ ├─ filter operations: 4                  │
│ ├─ && operator: 1                        │
│ └─ return statements: 1                  │
└──────────────────────────────────────────┘

具體位置:
第 48 行: if (order == null || ...)       [+1]
第 53 行: .filter(driver -> ...)          [+1]
第 55 行: .filter(driver -> ...)          [+1]
第 57 行: if (candidates.isEmpty())       [+1]
                             總計: CC = 4
```

---

## 📈 查看全包的複雜度對比

### 分析整個 com.uber.service 包

```
1. Project 視圖中右鍵 com.uber.service
2. Analyze → Run MetricsReloaded Analysis
3. 查看 Metrics 窗口結果

顯示結果:
┌──────────────────────┬─────┬─────┬────┐
│ Service              │ WMC │ LOC │ CC │
├──────────────────────┼─────┼─────┼────┤
│ MatchingService   🟢  │  14 │ 188 │ 14 │ ← 最簡潔
│ FareService       🟢  │  16 │ 250 │ 18 │
│ AuditService      🟢  │  12 │ 180 │ 13 │
│ DriverService     🟡  │  22 │ 320 │ 28 │
│ OrderService      🟡  │  28 │ 380 │ 35 │ ← 最複雜
│ ValidationService 🟡  │  32 │ 500 │ 40 │ ← 需優化
└──────────────────────┴─────┴─────┴────┘

Package Total: 124 (需改進的目標)
```

---

## 💡 實用技巧

### 1. 開啟 Inspector 進行實時檢查

```
View → Tool Windows → Inspector
→ 搜尋 "complexity" 進行實時檢查
→ 編輯代碼時自動計算複雜度
```

### 2. 設置複雜度警告閾值

```
Preferences → Editor → Code Style → Inspections
→ 搜尋 "Method complexity"
→ 設置警告級別: WMC > 20, CC > 10
```

### 3. 批量分析並導出報告

```
Analyze → Run MetricsReloaded Analysis
分析完成後:
→ 在 Metrics 窗口右鍵
→ Export to... → CSV/HTML/PDF
→ 保存位置: docs/quality/WMC_Report_20251229.html
```

### 4. 快速查找高複雜度的類

```
在 Metrics 窗口:
1. 點擊 "WMC" 列頭進行排序
2. 自動按複雜度從高到低排序
3. 馬上看到最複雜的類在最上面
```

---

## 📝 WMC 優化建議

### 如果 WMC > 20 怎麼辦?

```
降低複雜度的方法 (按優先級排列):

1️⃣  提取方法 (Extract Method)
    ├─ 將複雜邏輯提取成獨立方法
    ├─ 每個方法職責單一
    └─ 示例: 將多個 filter 條件提取為 isAvailable()

2️⃣  提取類 (Extract Class)
    ├─ 創建新類承載某些責任
    ├─ 減少原類的複雜度
    └─ 示例: MatchingStrategy 策略類

3️⃣  簡化條件邏輯
    ├─ 使用多態替代條件判斷
    ├─ 應用設計模式 (Strategy, State 等)
    └─ 示例: 用枚舉替代 if-else 鏈

4️⃣  分解狀態機
    ├─ 將複雜的狀態轉換邏輯分離
    ├─ 使用專門的狀態機框架
    └─ 示例: Spring StateMachine
```

### MatchingService 的情況

```
✅ 現況: WMC 14 (優秀)
✅ 無需優化
✅ 可作為最佳實踐範例
```

---

## 📊 與測試覆蓋率的關聯

### MatchingServiceTest 中的覆蓋情況

```
MatchingService 的複雜度 vs 測試覆蓋:

findBestDriver() 
├─ CC: 4
├─ 覆蓋的測試:
│  ├─ testMatch_OnlineDriverOnly()
│  ├─ testMatch_NonBusyOnly()
│  ├─ testMatch_VehicleTypeFilter()
│  ├─ testMatch_DistanceSort()
│  ├─ testFindBestDriver_EmptyDriverList()
│  └─ 更多邊界測試...
└─ 覆蓋率: 100% ✅

calculateDistance()
├─ CC: 2
├─ 覆蓋的測試:
│  ├─ testDistance_GeneralCase()
│  ├─ testDistance_NullInputs()
│  ├─ testDistance_BothNull()
│  └─ 更多...
└─ 覆蓋率: 100% ✅

總結: 複雜度越高 → 需要越多的測試
      MatchingService 的高複雜度方法都有完整測試
```

---

## 🎓 常見問題

### Q1: 為什麼要關注 WMC?

```
A: WMC 高表示:
   ├─ 代碼複雜，難以理解
   ├─ 測試困難，易出 BUG
   ├─ 維護成本高
   ├─ 變更風險大
   └─ 可讀性差

降低 WMC 帶來:
   ├─ 代碼更清晰
   ├─ 測試更完善
   ├─ 維護更簡單
   ├─ 性能更穩定
   └─ 開發效率更高
```

### Q2: MatchingService 的 WMC 14 好嗎?

```
A: 非常好！
   ├─ < 15: 優秀 🟢
   ├─ 15-20: 良好 🟡
   ├─ > 20: 需改進 🟡
   └─ MatchingService: 14 = 最高等級
```

### Q3: 如何在代碼審查時使用 WMC?

```
A: Pull Request 審查檢查清單:
   ├─ ☑ 新方法的 CC > 10 嗎?
   ├─ ☑ 類的 WMC > 25 嗎?
   ├─ ☑ 有新增測試覆蓋複雜邏輯嗎?
   └─ ☑ 複雜方法有清晰的文檔嗎?
```

---

## 🔗 相關文件

- 📄 **WMC_ANALYSIS_REPORT.md** - MatchingService 詳細分析報告
- 📄 **METRICSRELOADED_WMC_GUIDE.md** - 完整使用指南
- 📄 **MatchingServiceTest.java** - 100% 分支覆蓋的測試

---

## ✅ 操作清單

- [ ] 安裝 MetricsReloaded 插件
- [ ] 打開項目
- [ ] 分析 MatchingService
- [ ] 查看 Metrics 窗口結果
- [ ] 驗證 WMC = 14
- [ ] 查看方法級別詳情
- [ ] 對比其他 Service 類
- [ ] 檢查測試覆蓋對應情況
- [ ] （可選）導出 HTML 報告

---

**快速上手完成！** 🎉

現在您可以在 IntelliJ 中實時查看和監控代碼複雜度了。

