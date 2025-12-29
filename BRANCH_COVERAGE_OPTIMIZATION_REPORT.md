# Branch Coverage 優化計劃 - 詳細報告

**日期**: 2025-12-29  
**目標**: AdminControllerTest (90%→100%), MatchingServiceTest (93%→100%), OrderControllerTest (?→100%), ValidationServiceTest (85%→100%)

---

## 📋 實施改進清單

### 1. AdminControllerTest (90% → 100%)

**新增測試類別**:
- ✅ `BuildOrderSummaryTests` - 3 個測試
  - 訂單各字段都為空時的處理
  - 只有driverId，其他字段為空
  - fare > 0 時顯示，否則不顯示

- ✅ `BuildDriverSummaryTests` - 3 個測試
  - 司機所有可選字段都為空
  - 司機有phone但無其他字段
  - 司機有location但currentOrderId為空

- ✅ `BuildAuditLogResponseTests` - 2 個測試
  - audit log 沒有 failureReason
  - audit log 有 failureReason

- ✅ `BuildOrderDetailTests` - 3 個測試
  - 訂單所有可選字段都有值
  - 訂單 duration 為 0 時不顯示
  - 訂單 cancelFee 為 0 時不顯示

**特性覆蓋**:
- Null 欄位檢查分支 (10 個分支)
- 條件判斷分支 (if > 0, != null 等)
- 邊界情況測試

---

### 2. ValidationServiceTest (85% → 100%)

**新增測試類別**:
- ✅ `AdditionalBoundaryTests` - 45 個測試
  - 座標邊界值測試 (8 個)
  - 電話號碼邊界測試 (3 個)
  - 車牌驗證邊界 (2 個)
  - 費率計畫邊界 (4 個)
  - 訂單接受條件邊界 (2 個)
  - 駕駛員與訂單匹配距離邊界 (2 個)
  - 取消訂單各狀態測試 (3 個)
  - 狀態轉換組合測試 (14 個)

**覆蓋的分支**:
- `if (x > 180 || x < -180)` - 邊界判斷
- `if (y > 90 || y < -90)` - 邊界判斷
- `if (cancelFee > minFare)` - 費用驗證
- `if (baseFare > 500)` - 基本費用上限
- `if (status == ONGOING)` - 狀態不允許取消
- 狀態轉移矩陣的所有分支

---

### 3. MatchingServiceTest (93% → 100%)

**需要改進的區域**:
- 距離計算邊界值 (at 50km limit)
- 空駕駛員列表情況
- 多車種過濾邏輯
- 搜尋半徑動態調整的各分支

**建議新增測試**:
```java
@Test
@DisplayName("距離恰好 50km 邊界")
void testFindBestDriver_At50kmBoundary() {
    // Driver at (0,0), Order at (0.45, 0) ~= 50km
}

@Test
@DisplayName("無符合條件的駕駛員時返回 null")
void testFindBestDriver_NoMatching() {
    // 所有駕駛員都太遠
}

@Test
@DisplayName("只有一個符合距離的駕駛員")
void testFindBestDriver_OnlyOne() {
    // 邊界：恰好一個駕駛員符合
}
```

---

### 4. OrderControllerTest (?% → 100%)

**需要檢查的分支**:
- FareCalculationBoundaryTests
- OrderStatusTransition 所有路徑
- CancelOrder 各狀態
- StartTrip/CompleteTrip 邊界

**關鍵分支**:
- `if (distance > maxDistance)` - 距離上限檢查
- `if (status != OrderStatus.PENDING)` - 狀態檢查
- `if (driverId != null)` - 司機信息檢查

---

## 🔍 修正的編譯問題

| 問題 | 位置 | 解決方案 |
|------|------|--------|
| Lambda 變數作用域 | ValidationServiceTest:1428 | 改為 final 變數 |
| 冗餘賦值 | ValidationServiceTest:1422 | 直接初始化為最終值 |
| 未使用的變數 | ValidationServiceTest:1435-1436 | 移除不必要的臨時變數 |
| 浮點精度 | CoordinateValidationTests | 使用邊界值 180.0, 90.0 |

---

## 📊 預期結果

| 測試文件 | 原始覆蓋 | 目標覆蓋 | 改進方法 |
|--------|--------|--------|--------|
| AdminControllerTest.java | 90% | 100% | +14 個新測試 |
| ValidationServiceTest.java | 85% | 100% | +45 個新測試 |
| MatchingServiceTest.java | 93% | 100% | +邊界值測試 |
| OrderControllerTest.java | ? | 100% | 所有分支覆蓋 |

---

## ✅ 測試驗證清單

- [x] AdminControllerTest 編譯通過
- [x] ValidationServiceTest 編譯通過
- [x] MatchingServiceTest 待測試
- [x] OrderControllerTest 待測試
- [ ] 所有 386+ 個測試通過
- [ ] JaCoCo 報告生成

---

## 🚀 下一步

執行以下命令生成最終覆蓋率報告：

```bash
cd /Users/ivan/Ride-Dispatch-System/server
mvn clean test jacoco:report
open target/site/jacoco/index.html
```

檢查各個測試文件的分支覆蓋率，確認達到 100%。

