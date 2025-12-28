import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';

// Layouts
import { RiderAppLayout } from './layouts/RiderAppLayout';
import { DriverAppLayout } from './layouts/DriverAppLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Guards
import { AuthGuard } from './guards/AuthGuard';

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
import { EarningsPage as DriverEarnings } from './pages/driver/EarningsPage';
import { ProfilePage as DriverProfile } from './pages/driver/ProfilePage';

// Admin Pages
import { DashboardPage as AdminDashboard } from './pages/admin/DashboardPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { DriversPage } from './pages/admin/DriversPage';
import { RidersPage } from './pages/admin/RidersPage';
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
      { path: 'earnings', element: <DriverEarnings /> },
      { path: 'profile', element: <DriverProfile /> },
    ],
  },

  // 管理後台
  {
    path: '/admin',
    element: (
      <AuthGuard requiredRole="admin">
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'drivers', element: <DriversPage /> },
      { path: 'riders', element: <RidersPage /> },
      { path: 'audit-logs', element: <AuditLogsPage /> },
      { path: 'rate-plans', element: <RatePlansPage /> },
    ],
  },

  // 預設導向
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
