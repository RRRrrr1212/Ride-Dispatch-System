import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth.store';

export function RiderAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuAnchor(null);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMenuAnchor(null);
  };

  // 判斷是否為「地圖頁面」（需要全螢幕地圖）
  const isMapPage = 
    location.pathname.includes('/home') || 
    location.pathname.includes('/request') || 
    location.pathname.includes('/waiting') || 
    location.pathname.includes('/trip');

  const handleBack = () => {
    navigate('/rider/home');
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: '#1a1a1a', // 統一使用黑色背景
      overflow: 'hidden',
    }}>
      {/* 1. 地圖頁面專用佈局 (Home, Request, Waiting, Trip) */}
      {isMapPage && (
        <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1100 }}>
          {/* 左上角懸浮漢堡選單 (所有地圖頁面都顯示，方便隨時切換) */}
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
                bgcolor: '#2a2a2a',
                color: 'white',
              }
            }}
          >
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'white' }}>
                {user?.name || '乘客'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'grey.400' }}>
                5.0 ★
              </Typography>
            </Box>
            <MenuItem onClick={() => handleNavigation('/rider/home')} sx={{ py: 1.5 }}>
              <ListItemIcon><HomeIcon fontSize="small" sx={{ color: 'grey.300' }} /></ListItemIcon>
              <ListItemText primary="首頁" />
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/rider/history')} sx={{ py: 1.5 }}>
              <ListItemIcon><HistoryIcon fontSize="small" sx={{ color: 'grey.300' }} /></ListItemIcon>
              <ListItemText primary="行程紀錄" />
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#ff5252' }}>
              <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#ff5252' }} /></ListItemIcon>
              <ListItemText primary="登出" />
            </MenuItem>
          </Menu>
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
