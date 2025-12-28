import { Box, Typography, Card, CardContent, Button, Avatar, Divider, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import {
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Star as StarIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useDriverStore } from '../../stores/driver.store';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const navigate = useNavigate();
  const { driver, clearDriver, goOffline, isOnline } = useDriverStore();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    if (isOnline) {
      try {
        await goOffline();
      } catch (error) {
        console.error('Logout offline failed', error);
      }
    }
    clearDriver();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* 個人資訊卡片 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 28 }}>
              {driver?.name?.charAt(0) || '司'}
            </Avatar>
            <Box>
              <Typography variant="h6">{driver?.name || '司機'}</Typography>
              <Typography color="text.secondary">{driver?.phone || ''}</Typography>
            </Box>
          </Box>
          
          {/* 評分 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
            <StarIcon sx={{ color: 'warning.main' }} />
            <Typography variant="h6" fontWeight="bold">4.9</Typography>
            <Typography color="text.secondary" sx={{ ml: 1 }}>司機評分</Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 車輛資訊 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CarIcon color="primary" />
            <Box>
              <Typography variant="body2" color="text.secondary">車牌號碼</Typography>
              <Typography fontWeight="bold">{driver?.vehiclePlate || 'ABC-1234'}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 選單列表 */}
      <Card sx={{ mb: 2 }}>
        <List disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="編輯個人資料" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <CarIcon />
            </ListItemIcon>
            <ListItemText primary="車輛資訊" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="設定" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="幫助中心" />
          </ListItemButton>
        </List>
      </Card>

      {/* 登出按鈕 */}
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={handleLogout}
        data-testid="btn-logout"
      >
        登出
      </Button>

      {/* 版本資訊 */}
      <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 4 }}>
        Uber 司機端 v1.0.0
      </Typography>
    </Box>
  );
}
