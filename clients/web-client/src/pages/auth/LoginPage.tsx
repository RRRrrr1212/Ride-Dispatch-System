import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
} from '@mui/material';
import {
  Person as RiderIcon,
  DirectionsCar as DriverIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth.store';
import { useDriverStore } from '../../stores/driver.store';
import { driverApi } from '../../api/driver.api';
import type { UserRole } from '../../types';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { setDriver } = useDriverStore();

  const [role, setRole] = useState<UserRole>('rider');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function getDefaultPath(r: UserRole) {
    switch (r) {
      case 'driver':
        return '/driver/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/rider/home';
    }
  }

  // 乘客/管理員登入
  const handleSimpleLogin = () => {
    if (!phone) return;

    const userId = `${role}-${phone}`;
    const userName = name || (role === 'rider' ? '乘客' : '管理員');

    login(userId, userName, role, phone);
    navigate(getDefaultPath(role), { replace: true });
  };

  // 司機登入
  const handleDriverLogin = async () => {
    if (!phone) {
      setError('請輸入手機號碼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 嘗試從後端取得司機資訊
      const driverId = `driver-${phone}`;
      
      // 先嘗試登入 (假設後端有這個司機)
      // 如果失敗，使用 Demo 模式
      try {
        // 嘗試取得司機資訊
        await driverApi.getDriver(driverId);
        // 如果成功，表示司機存在
      } catch (err) {
        // 司機不存在或 API 失敗，使用 Demo 模式
        console.log('使用 Demo 模式登入');
      }

      // 設定 auth store
      login(driverId, name || '司機', 'driver', phone);
      
      // 設定 driver store (Demo 模式)
      setDriver({
        driverId,
        name: name || '司機',
        phone,
        vehiclePlate: `ABC-${Math.floor(Math.random() * 9000) + 1000}`,
        vehicleType: 'STANDARD',
        status: 'OFFLINE',
        busy: false,
      });


      navigate('/driver/dashboard', { replace: true });
    } catch (err) {
      setError('登入失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
        Uber
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        叫車派遣系統
      </Typography>

      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          {/* 角色選擇 */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            選擇身份
          </Typography>
          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={(_, newRole) => {
              if (newRole) {
                setRole(newRole);
                setError('');
              }
            }}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="rider">
              <RiderIcon sx={{ mr: 1 }} /> 乘客
            </ToggleButton>
            <ToggleButton value="driver">
              <DriverIcon sx={{ mr: 1 }} /> 司機
            </ToggleButton>
            <ToggleButton value="admin">
              <AdminIcon sx={{ mr: 1 }} /> 管理員
            </ToggleButton>
          </ToggleButtonGroup>

          {/* 乘客/管理員 - 簡單登入 */}
          {(role === 'rider' || role === 'admin') && (
            <>
              <TextField
                fullWidth
                label="手機號碼"
                placeholder="0912-345-678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ mb: 2 }}
                data-testid="input-phone"
              />
              <TextField
                fullWidth
                label="姓名 (選填)"
                placeholder="輸入您的姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 3 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSimpleLogin}
                disabled={!phone}
                data-testid="btn-login"
              >
                登入
              </Button>
            </>
          )}

          {/* 司機 - 僅登入 (帳號由後台建立) */}
          {role === 'driver' && (
            <>
              {error && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                  {error}
                </Typography>
              )}

              <TextField
                fullWidth
                label="手機號碼"
                placeholder="0912-345-678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ mb: 2 }}
                data-testid="driver-phone"
              />
              <TextField
                fullWidth
                label="姓名 (選填)"
                placeholder="輸入您的姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 3 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleDriverLogin}
                disabled={!phone || loading}
                data-testid="btn-driver-login"
              >
                {loading ? '登入中...' : '司機登入'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 4 }}>
        Demo 版本 - 支援模擬模式
      </Typography>
    </Box>
  );
}
