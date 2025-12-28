# 🧪 測試策略

> **文件**: 08_TESTING.md  
> **更新日期**: 2025-12-27

---

## 測試層級

| 層級 | 工具 | 範圍 | 覆蓋率目標 |
|------|------|------|------------|
| **單元測試** | Vitest | Hooks, Utils, API | 80% |
| **元件測試** | Testing Library | UI 元件 | 60% |
| **E2E 測試** | Playwright | 完整流程 | 關鍵路徑 |

---

## 單元測試範例

```typescript
// src/hooks/__tests__/usePolling.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrderPolling } from '../usePolling';

vi.mock('../../api/order.api', () => ({
  orderApi: {
    get: vi.fn().mockResolvedValue({
      data: { success: true, data: { orderId: 'test', status: 'PENDING' } }
    })
  }
}));

describe('useOrderPolling', () => {
  it('應該返回訂單資料', async () => {
    const { result } = renderHook(() => useOrderPolling('test-id'));
    
    await waitFor(() => {
      expect(result.current.order).not.toBeNull();
    });
    
    expect(result.current.order?.orderId).toBe('test');
  });
});
```

---

## 元件測試範例

```typescript
// src/components/__tests__/StatusChip.test.tsx
import { render, screen } from '@testing-library/react';
import { StatusChip } from '../StatusChip';

describe('StatusChip', () => {
  it('PENDING 顯示黃色', () => {
    render(<StatusChip status="PENDING" />);
    expect(screen.getByText('等待中')).toBeInTheDocument();
  });

  it('COMPLETED 顯示綠色', () => {
    render(<StatusChip status="COMPLETED" />);
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });
});
```

---

## E2E 測試範例

```typescript
// e2e/rider-flow.spec.ts
import { test, expect } from '@playwright/test';

test('乘客完整叫車流程', async ({ page }) => {
  // 1. 登入
  await page.goto('/login');
  await page.fill('[data-testid="input-phone"]', '0912345678');
  await page.click('[data-testid="btn-login"]');
  
  // 2. 進入叫車頁
  await page.waitForURL('/rider/home');
  await page.click('[data-testid="input-destination"]');
  
  // 3. 設定目的地
  await page.fill('[data-testid="input-dropoff"]', '台中市北區');
  await page.click('[data-testid="btn-confirm-location"]');
  
  // 4. 選擇車種
  await page.click('[data-testid="vehicle-standard"]');
  
  // 5. 叫車
  await page.click('[data-testid="btn-request-ride"]');
  
  // 6. 驗證進入等待頁
  await page.waitForURL(/\/rider\/waiting\//);
  await expect(page.getByTestId('status-chip')).toHaveText('等待中');
});
```

---

## data-testid 規範

所有可互動元素必須有穩定的 `data-testid`：

```typescript
// 按鈕
<Button data-testid="btn-request-ride">確認叫車</Button>
<Button data-testid="btn-accept-order">接單</Button>
<Button data-testid="btn-start-trip">開始行程</Button>
<Button data-testid="btn-complete-trip">完成行程</Button>

// 輸入框
<TextField data-testid="input-phone" />
<TextField data-testid="input-pickup" />
<TextField data-testid="input-dropoff" />

// 狀態
<Chip data-testid="status-chip" />
<Switch data-testid="toggle-online" />

// 卡片/列表項
<Card data-testid={`order-card-${orderId}`} />
```

---

## 測試指令

```bash
# 單元/元件測試
npm run test

# 監聽模式
npm run test:watch

# 覆蓋率報告
npm run test:coverage

# E2E 測試
npm run test:e2e

# E2E 視覺化
npm run test:e2e:ui
```

---

## package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

**下一步**: 閱讀 [09_IMPLEMENTATION_PLAN.md](./09_IMPLEMENTATION_PLAN.md)
