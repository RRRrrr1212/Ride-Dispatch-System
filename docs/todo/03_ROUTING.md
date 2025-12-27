# 🛣️ 路由設計

> **文件**: 03_ROUTING.md  
> **更新日期**: 2025-12-27

---

## 路由總覽

```
/login                    # 統一登入頁

/rider                    # 乘客端 (需登入)
  ├── /home               # 首頁
  ├── /request            # 叫車
  ├── /waiting/:orderId   # 等候司機
  ├── /trip/:orderId      # 行程中
  ├── /completed/:orderId # 行程完成
  └── /history            # 歷史訂單

/driver                   # 司機端 (需登入 + 司機角色)
  ├── /dashboard          # 待命/可接訂單
  ├── /order/:orderId     # 訂單詳情
  ├── /trip/:orderId      # 行程中
  └── /history            # 歷史訂單

/admin                    # 管理後台 (需登入 + admin 角色)
  ├── /dashboard          # 儀表板
  ├── /orders             # 訂單管理
  ├── /drivers            # 司機管理
  ├── /audit-logs         # 審計日誌
  └── /rate-plans         # 費率設定
```

---

## 路由配置 (App.tsx)

```typescript
// src/App.tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

// Layouts
import { RiderAppLayout } from './layouts/RiderAppLayout';
import { DriverAppLayout } from './layouts/DriverAppLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Guards
import { AuthGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
// Rider Pages
import { HomePage as RiderHome } from './pages/rider/HomePage';
import { RideRequestPage } from './pages/rider/RideRequestPage';
import { WaitingPage as RiderWaiting } from './pages/rider/WaitingPage';
import { TripPage as RiderTrip } from './pages/rider/TripPage';
import { CompletedPage } from './pages/rider/CompletedPage';
import { HistoryPage as RiderHistory } from './pages/rider/HistoryPage';
// Driver Pages
import { DashboardPage as DriverDashboard } from './pages/driver/DashboardPage';
import { OrderDetailPage } from './pages/driver/OrderDetailPage';
import { TripPage as DriverTrip } from './pages/driver/TripPage';
import { HistoryPage as DriverHistory } from './pages/driver/HistoryPage';
// Admin Pages
import { DashboardPage as AdminDashboard } from './pages/admin/DashboardPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { DriversPage } from './pages/admin/DriversPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { RatePlansPage } from './pages/admin/RatePlansPage';

const router = createBrowserRouter([
  // 公開路由
  { path: '/login', element: <LoginPage /> },

  // 乘客端
  {
    path: '/rider',
    element: (
      <AuthGuard>
        <RiderAppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <RiderHome /> },
      { path: 'request', element: <RideRequestPage /> },
      { path: 'waiting/:orderId', element: <RiderWaiting /> },
      { path: 'trip/:orderId', element: <RiderTrip /> },
      { path: 'completed/:orderId', element: <CompletedPage /> },
      { path: 'history', element: <RiderHistory /> },
    ],
  },

  // 司機端
  {
    path: '/driver',
    element: (
      <AuthGuard requiredRole="driver">
        <DriverAppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DriverDashboard /> },
      { path: 'order/:orderId', element: <OrderDetailPage /> },
      { path: 'trip/:orderId', element: <DriverTrip /> },
      { path: 'history', element: <DriverHistory /> },
    ],
  },

  // 管理後台
  {
    path: '/admin',
    element: (
      <AuthGuard requiredRole="admin">
        <RoleGuard allowedRoles={['admin']}>
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'drivers', element: <DriversPage /> },
      { path: 'audit-logs', element: <AuditLogsPage /> },
      { path: 'rate-plans', element: <RatePlansPage /> },
    ],
  },

  // 預設導向
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

---

## 路由守衛

### AuthGuard.tsx

```typescript
// src/guards/AuthGuard.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: 'rider' | 'driver' | 'admin';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 未登入 → 導向登入頁
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 角色不符 → 導向 403 或首頁
  if (requiredRole && user?.role !== requiredRole) {
    // 根據用戶角色導向對應首頁
    const roleHome = {
      rider: '/rider/home',
      driver: '/driver/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={roleHome[user?.role || 'rider']} replace />;
  }

  return <>{children}</>;
}
```

### RoleGuard.tsx

```typescript
// src/guards/RoleGuard.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { ReactNode } from 'react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
```

---

## 導航 Hook

```typescript
// src/hooks/useAppNavigate.ts
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function useAppNavigate() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const goHome = () => {
    switch (user?.role) {
      case 'driver':
        navigate('/driver/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/rider/home');
    }
  };

  const goToOrder = (orderId: string) => {
    switch (user?.role) {
      case 'driver':
        navigate(`/driver/order/${orderId}`);
        break;
      default:
        navigate(`/rider/waiting/${orderId}`);
    }
  };

  return { goHome, goToOrder, navigate };
}
```

---

**下一步**: 閱讀 [04_LAYOUTS.md](./04_LAYOUTS.md) 了解 Layout 設計
