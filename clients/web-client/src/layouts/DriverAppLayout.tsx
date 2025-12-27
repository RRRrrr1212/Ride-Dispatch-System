import { useEffect } from 'react';
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
import { useAuthStore } from '../stores/auth.store';

export function DriverAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { isOnline, toggleOnline, driver, setDriver } = useDriverStore();

  // 自動初始化 driver (Demo 用途)
  useEffect(() => {
    if (user && user.role === 'driver' && !driver) {
      // 自動建立一個 mock driver
      setDriver({
        driverId: user.id,
        name: user.name || '司機',
        phone: user.phone || '0912345678',
        vehiclePlate: 'ABC-' + Math.floor(Math.random() * 9000 + 1000),
        vehicleType: 'STANDARD',
        status: 'OFFLINE',
        busy: false,
      });
    }
  }, [user, driver, setDriver]);

  const getNavValue = () => {
    if (location.pathname.includes('/history')) return 2;
    if (location.pathname.includes('/trip')) return 1;
    return 0;
  };

  const handleNavChange = (_: unknown, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/driver/dashboard');
        break;
      case 1:
        navigate('/driver/dashboard');
        break;
      case 2:
        navigate('/driver/history');
        break;
    }
  };

  const handleToggleOnline = async () => {
    try {
      await toggleOnline();
    } catch (error) {
      console.error('切換上線狀態失敗:', error);
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
      <AppBar position="static" elevation={0}>
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
            onChange={handleToggleOnline}
            color="success"
            data-testid="toggle-online"
          />
        </Toolbar>
      </AppBar>

      {/* 主內容區 */}
      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', pb: 7 }}>
        <Outlet />
      </Box>

      {/* 底部導航 */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 430,
          margin: '0 auto',
        }}
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
