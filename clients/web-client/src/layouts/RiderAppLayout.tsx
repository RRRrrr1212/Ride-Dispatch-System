import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Home as HomeIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth.store';
import { AppMenu, type AppMenuItem } from '../components/common/AppMenu';

export function RiderAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    // 清除所有儲存的狀態
    localStorage.clear();
    sessionStorage.clear();
    logout();
    navigate('/login');
    window.location.reload();
  };

  // 判斷是否為「地圖頁面」（需要全螢幕地圖）
  const isMapPage = 
    location.pathname.includes('/home') || 
    location.pathname.includes('/request') || 
    location.pathname.includes('/waiting') || 
    location.pathname.includes('/trip');

  const handleBack = () => {
    // 如果是從完成頁面返回，需要清除訂單相關狀態
    if (location.pathname.includes('/completed')) {
      sessionStorage.removeItem('activeOrderId');
      sessionStorage.removeItem('currentOrderPickup');
      sessionStorage.removeItem('currentOrderDropoff');
      sessionStorage.removeItem('currentOrderPickupAddress');
      sessionStorage.removeItem('currentOrderDropoffAddress');
    }
    navigate('/rider/home');
  };

  // 定義乘客端的選單項目
  const menuItems: AppMenuItem[] = [
    {
      label: '首頁',
      icon: <HomeIcon fontSize="small" />,
      onClick: () => navigate('/rider/home'),
    },
    {
      label: '行程紀錄',
      icon: <HistoryIcon fontSize="small" />,
      onClick: () => navigate('/rider/history'),
    },
    {
      label: '登出',
      icon: <LogoutIcon fontSize="small" />,
      onClick: handleLogout,
      color: '#ff5252',
      dividerBefore: true,
    },
  ];

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: '#1a1a1a',
      overflow: 'hidden',
    }}>
      {/* 1. 地圖頁面專用佈局 (Home, Request, Waiting, Trip) */}
      {isMapPage && (
        <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1100 }}>
          <AppMenu
            userName={user?.name || user?.phone || '乘客'}
            menuItems={menuItems}
          />
        </Box>
      )}

      {/* 2. 一般頁面專用 Header (History) */}
      {!isMapPage && (
        <Box sx={{ 
          px: 2, 
          py: 1.5, 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: '#1a1a1a',
          color: 'white',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <IconButton onClick={handleBack} sx={{ color: 'white', mr: 1, ml: -1 }}>
            <ArrowBackIcon /> 
          </IconButton>
          <Typography variant="h6" fontWeight="bold">
            {location.pathname.includes('history') ? '行程紀錄' : 'Uber'}
          </Typography>
        </Box>
      )}

      {/* 內容區域 - 使用 Outlet 渲染子頁面 */}
      <Box sx={{ 
        flex: 1, 
        position: 'relative', 
        width: '100%',
        height: isMapPage ? '100%' : 'auto',
        overflow: isMapPage ? 'hidden' : 'auto',
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}
