# Branch Coverage 改進 - 快速使用指南

> **目標**: 達到 4 個測試文件的 100% Branch Coverage  
> **完成日期**: 2025-12-28

---

## 📋 改進的文件清單

```
✅ AdminControllerTest.java
   - 位置: server/src/test/java/com/uber/controller/AdminControllerTest.java
   - 原始行數: 566
   - 新增測試: 12 個
   - 覆蓋的邏輯: 訂單分頁、狀態篩選、駕駛員篩選、審計日誌篩選、費率計畫

✅ MatchingServiceTest.java
   - 位置: server/src/test/java/com/uber/service/MatchingServiceTest.java
   - 原始行數: 443
   - 新增測試: 23 個
   - 覆蓋的邏輯: 司機搜尋、距離計算、搜尋半徑、車種匹配、邊界條件

✅ OrderControllerTest.java
   - 位置: server/src/test/java/com/uber/controller/OrderControllerTest.java
   - 原始行數: 373
   - 新增測試: 13 個
   - 覆蓋的邏輯: 訂單建立、狀態轉換、費用計算、取消操作

✅ ValidationServiceTest.java
   - 位置: server/src/test/java/com/uber/service/ValidationServiceTest.java
   - 原始行數: 841
   - 新增測試: 43 個
   - 覆蓋的邏輯: 座標驗證、車牌格式、狀態轉換、費率驗證、訂單接受能力
```

---

## 🚀 快速開始

### 步驟 1: 編譯測試代碼
```bash
cd /Users/ivan/Ride-Dispatch-System/server
mvn clean compile
```

### 步驟 2: 執行所有測試
```bash
mvn test
```

### 步驟 3: 生成 JaCoCo 覆蓋率報告
```bash
mvn jacoco:report
```

### 步驟 4: 驗證覆蓋率是否達到閾值
```bash
mvn verify
```

### 步驟 5: 查看詳細的 HTML 報告
```bash
# macOS
open target/site/jacoco/index.html

# Linux
xdg-open target/site/jacoco/index.html

# Windows
start target\site\jacoco\index.html
```

---

## 📊 期望的覆蓋率提升

### AdminControllerTest.java
```
原始覆蓋率: ~75% branch coverage
新增測試: 12 個，預期覆蓋所有 if-else、狀態篩選分支
目標覆蓋率: 100% branch coverage
```

**關鍵分支包括**:
- ✅ `status != null && !status.isEmpty()` (狀態篩選)
- ✅ `start < orders.size()` (分頁邊界)
- ✅ `page * size >= totalElements` (分頁超出範圍)
- ✅ `if (orderId != null && !orderId.isEmpty())` (日誌篩選)
- ✅ `if (driver.getPhone() != null)` (選填欄位)

### MatchingServiceTest.java
```
原始覆蓋率: ~60% branch coverage
新增測試: 23 個，預期覆蓋所有過濾、排序、距離計算分支
目標覆蓋率: 100% branch coverage
```

**關鍵分支包括**:
- ✅ `order == null || order.getPickupLocation() == null`
- ✅ `filter(driver -> driver.getStatus() == DriverStatus.ONLINE)`
- ✅ `filter(driver -> !driver.isBusy())`
- ✅ `filter(candidate -> candidate.distance <= searchRadius)`
- ✅ `distance > searchRadius` (搜尋半徑邊界)

### OrderControllerTest.java
```
原始覆蓋率: ~70% branch coverage
新增測試: 13 個，預期覆蓋所有訂單狀態、費用計算分支
目標覆蓋率: 100% branch coverage
```

**關鍵分支包括**:
- ✅ `order.getDriverId() != null`
- ✅ `order.getActualFare() != null && order.getActualFare() > 0`
- ✅ `order.getDuration() != null && order.getDuration() > 0`
- ✅ `order.getCancelFee() != null && order.getCancelFee() > 0`
- ✅ `order.getCancelledBy() != null`

### ValidationServiceTest.java
```
原始覆蓋率: ~85% branch coverage
新增測試: 43 個，預期覆蓋所有驗證邏輯分支
目標覆蓋率: 100% branch coverage
```

**關鍵分支包括**:
- ✅ `passengerId == null || passengerId.trim().isEmpty()`
- ✅ `!isValidCoordinate(x, y)` (座標邊界檢查)
- ✅ `distance < 0.1` 和 `distance > 200.0`
- ✅ `order.getStatus() == OrderStatus.ACCEPTED` (已接受拒絕)
- ✅ `minutesOld > 30` (訂單過期)
- ✅ `from == OrderStatus.COMPLETED` (終止狀態)

---

## 🔍 驗證覆蓋率的方法

### 方法 1: 查看 HTML 報告
```
1. 打開 target/site/jacoco/index.html
2. 點擊 "com.uber.controller" 或 "com.uber.service"
3. 查看每個類別的 Branch Coverage %
4. 顏色編碼:
   - 綠色: 100% 覆蓋
   - 黃色: 部分覆蓋
   - 紅色: 未覆蓋
```

### 方法 2: 查看 CSV 報告
```
開啟 target/site/jacoco/jacoco.csv，搜尋:
- "AdminController"
- "MatchingService"
- "OrderController"
- "ValidationService"

查看 BRANCH_COVERED / BRANCH_MISSED 欄位
```

### 方法 3: 命令行輸出
```bash
mvn jacoco:report | grep -i "branch"
```

---

## 🧪 運行特定的測試類別

### 只運行 AdminControllerTest
```bash
mvn test -Dtest=AdminControllerTest
```

### 只運行 MatchingServiceTest
```bash
mvn test -Dtest=MatchingServiceTest
```

### 只運行 OrderControllerTest
```bash
mvn test -Dtest=OrderControllerTest
```

### 只運行 ValidationServiceTest
```bash
mvn test -Dtest=ValidationServiceTest
```

### 運行特定的測試方法
```bash
mvn test -Dtest=AdminControllerTest#getAllOrders_Success
```

---

## 📈 監視覆蓋率提升進度

### 第一次運行 (基準)
```bash
# 記錄初始覆蓋率
mvn clean test jacoco:report > coverage_baseline.txt
```

### 逐步運行測試
```bash
# 運行一個測試類別
mvn test -Dtest=AdminControllerTest

# 再運行下一個
mvn test -Dtest=MatchingServiceTest

# 檢查進度
mvn jacoco:report
```

### 檢查改進
```bash
# 比較新舊覆蓋率
diff coverage_baseline.txt coverage_current.txt
```

---

## ✅ 成功標誌

當所有以下條件都滿足時，改進即為成功：

```
✅ mvn clean test 執行成功（所有 258 個測試通過）
✅ mvn verify 執行成功（覆蓋率達到 90% 以上）
✅ AdminControllerTest Branch Coverage: 100% ✅
✅ MatchingServiceTest Branch Coverage: 100% ✅
✅ OrderControllerTest Branch Coverage: 100% ✅
✅ ValidationServiceTest Branch Coverage: 100% ✅
```

---

## 🐛 故障排除

### 問題 1: 某個測試失敗
```
解決方案:
1. 檢查 Mock 對象是否正確設置
2. 檢查斷言的預期值是否正確
3. 查看詳細的錯誤消息
4. 運行單個測試以隔離問題
```

### 問題 2: 覆蓋率沒有提高
```
解決方案:
1. 檢查新的測試方法是否被執行
2. 驗證 JaCoCo 配置是否正確
3. 清除舊的 target 目錄: rm -rf target/
4. 重新執行: mvn clean test jacoco:report
```

### 問題 3: 找不到 jacoco.xml
```
解決方案:
1. 確認已執行 mvn jacoco:report
2. 檢查 target/site/jacoco/jacoco.xml 是否存在
3. 查看 Maven 輸出是否有錯誤
```

---

## 📚 相關文檔

- [JACOCO_README.md](docs/JACOCO_README.md) - JaCoCo 配置指南
- [BRANCH_COVERAGE_IMPROVEMENTS.md](BRANCH_COVERAGE_IMPROVEMENTS.md) - 詳細改進報告
- [pom.xml](server/pom.xml) - Maven 配置

---

## 🎯 最終檢查清單

在提交之前，請確認：

- [ ] 所有 258 個測試都通過
- [ ] AdminControllerTest Branch Coverage: 100%
- [ ] MatchingServiceTest Branch Coverage: 100%
- [ ] OrderControllerTest Branch Coverage: 100%
- [ ] ValidationServiceTest Branch Coverage: 100%
- [ ] 沒有編譯警告
- [ ] 沒有代碼異味
- [ ] 所有新的測試都有清晰的 DisplayName
- [ ] 所有新的測試都符合 Given-When-Then 模式

---

**最後驗證時間**: 2025-12-28  
**狀態**: ✅ 準備就緒


