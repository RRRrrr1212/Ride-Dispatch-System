import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  IconButton,
  Switch,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useDriverStore } from '../stores/driver.store';
import { useAuthStore } from '../stores/auth.store';
import { adminApi } from '../api/admin.api';

export function DriverAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isOnline, toggleOnline, driver, setDriver, clearDriver } = useDriverStore();
  
  // 選單狀態
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // 自動初始化 driver (Demo 用途)
  useEffect(() => {
    const initDriver = async () => {
      if (user && user.role === 'driver' && !driver) {
        const vehiclePlate = 'ABC-' + Math.floor(Math.random() * 9000 + 1000);
        const newDriver = {
          driverId: user.id,
          name: user.name || '司機',
          phone: user.phone || '0912345678',
          vehiclePlate,
          vehicleType: 'STANDARD' as const,
          status: 'OFFLINE' as const,
          busy: false,
        };
        
        setDriver(newDriver);
        
        try {
          await adminApi.createDriver({
            driverId: user.id,
            name: user.name || '司機',
            phone: user.phone || '0912345678',
            vehiclePlate,
            vehicleType: 'STANDARD',
          });
          console.log('司機已在後端註冊:', user.id);
        } catch (error: any) {
          if (error.response?.status !== 409) {
            console.warn('後端司機註冊失敗:', error.message);
          }
        }
      }
    };
    
    initDriver();
  }, [user, driver, setDriver]);

  const handleLogout = () => {
    logout();
    clearDriver();
    navigate('/login');
    setMenuAnchor(null);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMenuAnchor(null);
  };

  // 判斷頁面類型
  const isDashboard = location.pathname.includes('/dashboard');
  const isTrip = location.pathname.includes('/trip');
  const isMapPage = isDashboard || isTrip;

  // 處理返回
  const handleBack = () => {
    navigate('/driver/dashboard');
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: '#1a1a1a',
      overflow: 'hidden',
    }}>
      {/* 1. 地圖頁面專用佈局 (Dashboard & Trip) */}
      {isMapPage && (
        <>
          {/* 左上角懸浮選單 (只在 Dashboard 顯示) */}
          {!isTrip && (
            <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1100 }}>
              <IconButton
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  bgcolor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  '&:hover': { bgcolor: '#f5f5f5' },
                  width: 44,
                  height: 44,
                }}
              >
                <MenuIcon sx={{ color: '#1a1a1a' }} />
              </IconButton>
              
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                PaperProps={{
                  sx: { 
                    borderRadius: 3, 
                    minWidth: 220, 
                    mt: 1, 
                    boxShadow: 8,
                    bgcolor: '#2a2a2a', // 改為深色背景
                    color: 'white',     // 文字改為白色
                  }
                }}
              >
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'white' }}>
                    {driver?.name || '司機'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'grey.400' }}>
                    {driver?.vehiclePlate}
                  </Typography>
                </Box>
                <MenuItem onClick={() => handleNavigation('/driver/history')} sx={{ py: 1.5 }}>
                  <ListItemIcon><HistoryIcon fontSize="small" sx={{ color: 'grey.300' }} /></ListItemIcon>
                  <ListItemText primary="歷史行程" />
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/driver/profile')} sx={{ py: 1.5 }}>
                  <ListItemIcon><PersonIcon fontSize="small" sx={{ color: 'grey.300' }} /></ListItemIcon>
                  <ListItemText primary="個人資料" />
                </MenuItem>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#ff5252' }}>
                  <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#ff5252' }} /></ListItemIcon>
                  <ListItemText primary="登出" />
                </MenuItem>
              </Menu>
            </Box>
          )}

          {/* 右上角狀態開關 (只在 Dashboard 顯示) */}
          {!isTrip && (
            <Box sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(255,255,255,0.95)', // 保持淺色背景以凸顯開關
              borderRadius: 20,
              pl: 2,
              pr: 0.5,
              py: 0.5,
              boxShadow: 3,
            }}>
              <Typography 
                variant="caption" 
                fontWeight="bold" 
                color={isOnline ? 'success.main' : 'text.disabled'}
              >
                {isOnline ? '上線中' : '離線'}
              </Typography>
              <Switch
                checked={isOnline}
                onChange={() => toggleOnline()}
                color="success"
                size="small"
              />
            </Box>
          )}
        </>
      )}

      {/* 2. 一般頁面專用 Header (History & Profile) */}
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
            {location.pathname.includes('history') ? '歷史行程' : 
             location.pathname.includes('profile') ? '個人資料' : 'Uber 司機端'}
          </Typography>
        </Box>
      )}

      {/* 內容區域 */}
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
