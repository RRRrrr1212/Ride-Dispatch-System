import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  IconButton,
  Switch,
  Typography,
} from '@mui/material';
import {
  Home as HomeIcon,
  AttachMoney as AttachMoneyIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useDriverStore } from '../stores/driver.store';
import { useAuthStore } from '../stores/auth.store';
import { adminApi } from '../api/admin.api';
import { AppMenu, type AppMenuItem } from '../components/common/AppMenu';
import { driverApi } from '../api/driver.api';

// ... (imports)

export function DriverAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isOnline, toggleOnline, driver, setDriver, clearDriver } = useDriverStore();

  // 自動初始化/恢復 driver (Demo 用途)
  useEffect(() => {
    const initDriver = async () => {
      if (!user || user.role !== 'driver') return;

      let currentDriver = driver;

      // 1. 如果本地沒有 driver，先建立一個 (Demo 資料)
      if (!currentDriver) {
        const vehiclePlate = 'ABC-' + Math.floor(Math.random() * 9000 + 1000);
        currentDriver = {
          driverId: user.id,
          name: user.name || '司機',
          phone: user.phone || '0912345678',
          vehiclePlate,
          vehicleType: 'STANDARD',
          status: 'OFFLINE',
          busy: false,
        };
        setDriver(currentDriver);
      }

      // 2. 檢查後端是否存在此司機，若不存在則補註冊 (解決後端重啟問題)
      try {
        await driverApi.getDriver(user.id);
      } catch (error) {
        console.warn('後端找不到司機，嘗試自動重新註冊...');
        try {
          await adminApi.createDriver({
            driverId: currentDriver.driverId,
            name: currentDriver.name,
            phone: currentDriver.phone,
            vehiclePlate: currentDriver.vehiclePlate,
            vehicleType: currentDriver.vehicleType,
          });
          console.log('司機自動註冊成功');
          
          // 如果前端顯示為上線，但後端剛重啟(默認離線)，這裡應該同步後端狀態，或者強制後端上線
          // 為了體驗平順，如果前端是 isOnline，我們嘗試幫他 goOnline
          if (isOnline) {
             // 稍微延遲一下確保註冊完成
             setTimeout(() => {
                 driverApi.goOnline(currentDriver!.driverId, { x: 120.6469, y: 24.1618 })
                   .catch(e => console.error('自動上線失敗', e));
             }, 500);
          }
          
        } catch (regError: any) {
          // 409 代表已存在，忽略
          if (regError.response?.status !== 409) {
            console.error('司機自動註冊失敗:', regError);
          }
        }
      }
    };
    
    initDriver();
    // 依賴列表只監聽 user，不監聽 driver，避免 driver 變更造成的無限迴圈
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogout = () => {
    logout();
    clearDriver();
    navigate('/login');
  };

  // 判斷頁面類型
  const isDashboard = location.pathname.includes('/dashboard');
  const isTrip = location.pathname.includes('/trip');
  const isMapPage = isDashboard || isTrip;

  // 處理返回
  const handleBack = () => {
    navigate('/driver/dashboard');
  };

  // 定義司機端的選單項目
  const menuItems: AppMenuItem[] = [
    {
      label: '首頁',
      icon: <HomeIcon fontSize="small" />,
      onClick: () => navigate('/driver/dashboard'),
    },
    {
      label: '收入',
      icon: <AttachMoneyIcon fontSize="small" />,
      onClick: () => navigate('/driver/earnings'),
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
      {/* 1. 地圖頁面專用佈局 (Dashboard & Trip) */}
      {isMapPage && (
        <>
          {/* 左上角懸浮選單 (只在 Dashboard 顯示) */}
          {!isTrip && (
            <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1100 }}>
              <AppMenu
                userName={driver?.name || '司機'}
                userRating="5.0 ★"
                menuItems={menuItems}
              />
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
              bgcolor: 'rgba(255,255,255,0.95)',
              borderRadius: 20,
              pl: 2,
              pr: 0.5,
              py: 0.5,
              boxShadow: 3,
            }}>
              <Typography 
                variant="caption" 
                fontWeight="bold" 
                color={isOnline ? 'success.main' : 'black'}
              >
                {isOnline ? '上線中' : '未上線'}
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
