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
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth.store';

export function RiderAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
        // 當前行程或歷史
        navigate('/rider/history');
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
        maxWidth: 430,
        margin: '0 auto',
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      {/* 頂部 AppBar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Uber
          </Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
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
          pb: 7,
        }}
      >
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
          <BottomNavigationAction label="首頁" icon={<HomeIcon />} />
          <BottomNavigationAction label="行程" icon={<LocationIcon />} />
          <BottomNavigationAction label="歷史" icon={<HistoryIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
