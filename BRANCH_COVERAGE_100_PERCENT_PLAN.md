# ✅ 分支覆蓋率 100% 優化計劃 - 完整方案

**日期**: 2025-12-29  
**目標**: AdminControllerTest (95%→100%), ValidationServiceTest (85%→100%), OrderControllerTest (95%→100%), MatchingServiceTest (93%→100%)

---

## 📊 已完成的改進

### 1. AdminControllerTest (95% → 預期 100%)

**新增測試數量**: 40+ 個

**涵蓋的缺失分支**:
- ✅ buildRatePlanResponse - 所有欄位測試 (2 個測試)
- ✅ buildOrderSummary - actualFare=0, completedAt=null, cancelledAt=null 等邊界 (3 個測試)
- ✅ buildOrderDetail - acceptedAt=null, startedAt=null, duration=0, cancelFee=0, cancelledBy=null (5 個測試)
- ✅ buildDriverSummary - phone=null, vehiclePlate=null, location=null, currentOrderId=null (4 個測試)
- ✅ buildAuditLogResponse - failureReason=null/有值 (2 個測試)
- ✅ getAllOrders - 無效狀態、空列表、分頁邊界等 (7 個測試)
- ✅ getAllDrivers - 狀態篩選、無字段等 (6 個測試)
- ✅ getAuditLogs - orderId/action 篩選等 (6 個測試)

---

## 📋 其他文件改進建議

### 2. ValidationServiceTest (85% → 100%)

**缺失的分支** (約 15%):
- 座標邊界值測試 (X=±180, Y=±90)
- 訂單狀態轉換完整矩陣 (25 種組合)
- 費用驗證邊界 (baseFare>500, perKmRate>100 等)
- 時間邊界 (30 分鐘期限)
- 距離邊界 (50km 限制)

**建議新增測試數量**: 25-30 個

**焦點區域**:
```java
// 座標邊界
testCoordinateAtMaxX/MinX/MaxY/MinY() // 4 個
testCombinedBoundaries() // 2 個

// 狀態轉換矩陣
testOrderStateTransition_*() // 12 個
testDriverStateTransition_*() // 3 個

// 費率驗證
testRatePlan_*Boundary() // 5 個

// 訂單時間
testOrderAcceptable_*Boundary() // 3 個
```

### 3. OrderControllerTest (95% → 100%)

**缺失的分支** (約 5%):
- 訂單狀態轉換的所有路徑
- 異常情況處理
- 邊界條件 (fare=0, distance=0 等)

**建議新增測試數量**: 10-15 個

**焦點區域**:
```java
// 狀態轉換
testStartTrip_*() // 3 個
testCompleteTrip_*() // 3 個
testCancelOrder_*() // 2 個

// 邊界條件
testFare_ZeroAmount() // 1 個
testDistance_Zero() // 1 個

// 異常路徑
testInvalidState_*() // 2 個
```

### 4. MatchingServiceTest (93% → 100%)

**缺失的分支** (約 7%):
- 距離計算邊界 (at 50km limit)
- 空駕駛員列表
- 車型不匹配
- 搜索半徑動態調整

**建議新增測試數量**: 8-12 個

**焦點區域**:
```java
// 距離邊界
testFindDriver_At50kmBoundary() // 1 個
testFindDriver_Over50km() // 1 個

// 空列表
testFindDriver_NoMatching() // 1 個
testFindDriver_EmptyList() // 1 個

// 車型匹配
testFindDriver_VehicleTypeMismatch() // 2 個

// 搜索半徑調整
testFindDriver_DynamicRadius_*() // 3 個
```

---

## 🚀 下一步實施步驟

### Step 1: 運行當前測試驗證 AdminControllerTest 改進

```bash
cd /Users/ivan/Ride-Dispatch-System/server
mvn clean test -Dtest=AdminControllerTest
```

### Step 2: 為 ValidationServiceTest 添加缺失測試

根據上述建議添加 25-30 個新測試，重點：
- ✅ 所有座標邊界值
- ✅ 完整的狀態轉換矩陣
- ✅ 費用檢驗邊界

### Step 3: 為 OrderControllerTest 添加缺失測試

添加 10-15 個新測試，涵蓋：
- ✅ 完整的狀態轉換路徑
- ✅ 邊界條件
- ✅ 異常情況

### Step 4: 為 MatchingServiceTest 添加缺失測試

添加 8-12 個新測試，涵蓋：
- ✅ 距離邊界
- ✅ 空列表情況
- ✅ 車型匹配

### Step 5: 生成 JaCoCo 報告並驗證

```bash
mvn clean test jacoco:report
open target/site/jacoco/index.html
```

---

## 📊 預期最終結果

| 文件 | 原始 | 目標 | 改進 |
|------|------|------|------|
| AdminControllerTest | 95% | **100%** | ✅ +40 tests |
| ValidationServiceTest | 85% | **100%** | 建議 +25-30 tests |
| OrderControllerTest | 95% | **100%** | 建議 +10-15 tests |
| MatchingServiceTest | 93% | **100%** | 建議 +8-12 tests |

---

## 💡 關鍵改進策略

### 1. 邊界值測試
測試所有邊界：0, null, 最大值、最小值等

### 2. 條件分支測試
每個 if/else 分支都要有對應的測試

### 3. 狀態轉換測試
所有可能的狀態組合都要測試

### 4. 異常情況測試
測試異常、空值、無效輸入等

---

## ✅ 檢查清單

- [x] AdminControllerTest 完成改進 (40+ 新測試)
- [ ] ValidationServiceTest 需要新增 25-30 個測試
- [ ] OrderControllerTest 需要新增 10-15 個測試
- [ ] MatchingServiceTest 需要新增 8-12 個測試
- [ ] 執行 `mvn clean test jacoco:report` 確認 100% 覆蓋率

---

## 📝 已實施的 AdminControllerTest 改進詳情

### 新增的嵌套測試類別 (11 個)

1. **RatePlanResponseTests** (2 個測試)
   - buildRatePlanResponse 全欄位
   - PREMIUM 車種

2. **OrderSummaryAdditionalTests** (3 個測試)
   - actualFare = 0
   - completedAt = null
   - cancelledAt = null

3. **OrderDetailAdditionalTests** (5 個測試)
   - acceptedAt = null
   - startedAt = null
   - duration = null
   - cancelFee = null
   - cancelledBy = null

4. **DriverSummaryAdditionalTests** (4 個測試)
   - phone = null
   - vehiclePlate = null
   - location = null
   - currentOrderId = null

...以及其他 7 個測試類別包含邊界和異常情況測試

---

**狀態**: AdminControllerTest 實施完成 ✅  
**預期結果**: AdminControllerTest 將達到 100% 分支覆蓋率

**下一步**: 按照上述計劃為其他三個文件添加缺失的分支測試

