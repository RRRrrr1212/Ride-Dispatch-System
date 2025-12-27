# 🎨 UI Layout 設計

> **文件**: 04_LAYOUTS.md  
> **更新日期**: 2025-12-27

---

## Layout 總覽

| Layout | 用途 | 特性 |
|--------|------|------|
| `RiderAppLayout` | 乘客端 | AppBar + BottomNav + 主內容 |
| `DriverAppLayout` | 司機端 | AppBar + BottomNav + 主內容 |
| `AdminLayout` | 管理後台 | Sidebar + Topbar + Content |

---

## 1. RiderAppLayout (乘客端)

### 結構圖

```
┌─────────────────────────────────────┐
│  AppBar: Logo + 使用者選單          │ ← 56px 固定頂部
├─────────────────────────────────────┤
│                                     │
│         主內容區 (Outlet)            │ ← flex-grow: 1
│         可滾動                       │   overflow-y: auto
│                                     │
├─────────────────────────────────────┤
│  BottomNavigation:                  │ ← 56px 固定底部
│  [🏠 首頁] [📍 行程] [📋 歷史]      │
└─────────────────────────────────────┘
```

### 實作程式碼

```typescript
// src/layouts/RiderAppLayout.tsx
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Home as HomeIcon,
  LocationOn as LocationIcon,
  History as HistoryIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth.store';

export function RiderAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // 根據路徑決定底部導航選中項
  const getNavValue = () => {
    if (location.pathname.includes('/history')) return 2;
    if (location.pathname.includes('/trip') || location.pathname.includes('/waiting')) return 1;
    return 0;
  };

  const handleNavChange = (_: unknown, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/rider/home');
        break;
      case 1:
        navigate('/rider/history'); // 或當前行程
        break;
      case 2:
        navigate('/rider/history');
        break;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: 430,  // 手機寬度
        margin: '0 auto',
        bgcolor: 'background.default',
      }}
    >
      {/* 頂部 AppBar */}
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Uber
          </Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.name?.[0] || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled>{user?.name || '乘客'}</MenuItem>
            <MenuItem onClick={handleLogout}>登出</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* 主內容區 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          pb: 7, // 為底部導航預留空間
        }}
      >
        <Outlet />
      </Box>

      {/* 底部導航 */}
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 430, margin: '0 auto' }}
        elevation={3}
      >
        <BottomNavigation value={getNavValue()} onChange={handleNavChange}>
          <BottomNavigationAction label="首頁" icon={<HomeIcon />} />
          <BottomNavigationAction label="行程" icon={<LocationIcon />} />
          <BottomNavigationAction label="歷史" icon={<HistoryIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
```

---

## 2. DriverAppLayout (司機端)

### 結構圖

```
┌─────────────────────────────────────┐
│  AppBar: 司機狀態 + 上/下線切換      │ ← 56px
├─────────────────────────────────────┤
│                                     │
│         主內容區 (Outlet)            │
│                                     │
├─────────────────────────────────────┤
│  BottomNavigation:                  │ ← 56px
│  [📦 訂單] [🚗 行程] [👤 個人]       │
└─────────────────────────────────────┘
```

### 實作程式碼

```typescript
// src/layouts/DriverAppLayout.tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Switch,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Chip,
} from '@mui/material';
import {
  LocalShipping as OrderIcon,
  DirectionsCar as TripIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useDriverStore } from '../stores/driver.store';

export function DriverAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, toggleOnline, driver } = useDriverStore();

  const getNavValue = () => {
    if (location.pathname.includes('/history') || location.pathname.includes('/profile')) return 2;
    if (location.pathname.includes('/trip')) return 1;
    return 0;
  };

  const handleNavChange = (_: unknown, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/driver/dashboard');
        break;
      case 1:
        // 當前行程或最近行程
        navigate('/driver/dashboard');
        break;
      case 2:
        navigate('/driver/history');
        break;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: 430,
        margin: '0 auto',
        bgcolor: 'background.default',
      }}
    >
      {/* 頂部 AppBar */}
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            司機模式
          </Typography>
          <Chip
            label={isOnline ? '上線中' : '離線'}
            color={isOnline ? 'success' : 'default'}
            size="small"
            sx={{ mr: 1 }}
          />
          <Switch
            checked={isOnline}
            onChange={toggleOnline}
            color="success"
          />
        </Toolbar>
      </AppBar>

      {/* 主內容區 */}
      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', pb: 7 }}>
        <Outlet />
      </Box>

      {/* 底部導航 */}
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 430, margin: '0 auto' }}
        elevation={3}
      >
        <BottomNavigation value={getNavValue()} onChange={handleNavChange}>
          <BottomNavigationAction label="訂單" icon={<OrderIcon />} />
          <BottomNavigationAction label="行程" icon={<TripIcon />} />
          <BottomNavigationAction label="個人" icon={<PersonIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
```

---

## 3. AdminLayout (管理後台)

### 結構圖

```
┌─────────────────────────────────────────────────────────┐
│  Topbar: Logo + 搜尋 + 使用者選單                        │ ← 64px
├───────────────┬─────────────────────────────────────────┤
│               │                                         │
│   Sidebar     │           主內容區 (Outlet)              │
│   240px       │                                         │
│               │                                         │
│  • 📋 訂單    │                                         │
│  • 🚗 司機    │                                         │
│  • 📝 日誌    │                                         │
│  • ⚙️ 費率    │                                         │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

### 實作程式碼

```typescript
// src/layouts/AdminLayout.tsx
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Receipt as OrderIcon,
  DirectionsCar as DriverIcon,
  History as LogIcon,
  AttachMoney as RateIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth.store';

const DRAWER_WIDTH = 240;

const menuItems = [
  { text: '儀表板', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: '訂單管理', icon: <OrderIcon />, path: '/admin/orders' },
  { text: '司機管理', icon: <DriverIcon />, path: '/admin/drivers' },
  { text: '審計日誌', icon: <LogIcon />, path: '/admin/audit-logs' },
  { text: '費率設定', icon: <RateIcon />, path: '/admin/rate-plans' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" fontWeight="bold">
          🚗 Uber Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            管理後台
          </Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.name?.[0] || 'A'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled>{user?.name || '管理員'}</MenuItem>
            <MenuItem onClick={handleLogout}>登出</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar - Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      {/* Sidebar - Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8, // AppBar 高度
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
```

---

## Safe Area 處理

針對手機端 (Rider/Driver)，需處理 Safe Area：

```typescript
// 在 Layout 中加入
<Box
  sx={{
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  }}
>
  {/* content */}
</Box>
```

---

**下一步**: 閱讀 [05_PWA_CONFIG.md](./05_PWA_CONFIG.md) 了解 PWA 設定
