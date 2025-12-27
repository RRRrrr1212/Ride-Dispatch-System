import { useEffect, useState } from 'react';
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
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  LocalShipping as OrderIcon,
  DirectionsCar as TripIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { useDriverStore } from '../stores/driver.store';
import { useAuthStore } from '../stores/auth.store';

export function DriverAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isOnline, toggleOnline, driver, setDriver, clearDriver } = useDriverStore();
  
  // 選單狀態
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    // 清除司機狀態
    clearDriver();
    // 登出
    logout();
    // 導航到登入頁
    navigate('/login', { replace: true });
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
          
          {/* 更多選項按鈕 */}
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            data-testid="btn-menu"
          >
            <MoreIcon />
          </IconButton>
          
          {/* 下拉選單 */}
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem disabled>
              <ListItemText 
                primary={driver?.name || user?.name || '司機'} 
                secondary={driver?.vehiclePlate || ''} 
              />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>設定</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout} data-testid="btn-logout">
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>登出</ListItemText>
            </MenuItem>
          </Menu>
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
