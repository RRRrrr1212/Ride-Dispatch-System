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
import { adminApi } from '../../api/admin.api';
import type { UserRole } from '../../types';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { setDriver } = useDriverStore();

  const [role, setRole] = useState<UserRole>('rider');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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

  // 乘客登入 (需驗證後台是否有建立帳號)
  const handleRiderLogin = async () => {
    if (!phone) {
      setError('請輸入手機號碼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const riderId = `rider-${phone}`;
      
      // 驗證乘客帳號是否存在
      await adminApi.getRider(riderId);
      
      // 帳號存在，登入成功
      login(riderId, name || '乘客', 'rider', phone);
      navigate('/rider/home', { replace: true });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('帳號不存在，請聯絡管理員建立');
      } else {
        setError('登入失敗，請重試');
      }
    } finally {
      setLoading(false);
    }
  };

  // 管理員登入 (從環境變數驗證)
  const handleAdminLogin = () => {
    if (!phone || !password) {
      setError('請輸入帳號和密碼');
      return;
    }

    const envUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (phone !== envUsername || password !== envPassword) {
      setError('帳號或密碼錯誤');
      return;
    }

    const userId = `admin-${phone}`;
    const userName = name || '管理員';

    login(userId, userName, 'admin', phone);
    navigate('/admin/dashboard', { replace: true });
  };

  // 司機登入 (需驗證後台是否有建立帳號)
  const handleDriverLogin = async () => {
    if (!phone) {
      setError('請輸入手機號碼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const driverId = `driver-${phone}`;
      
      // 驗證司機帳號是否存在
      const response = await driverApi.getDriver(driverId);
      
      if (response.data.success && response.data.data) {
        const driver = response.data.data;
        
        // 帳號存在，設定 auth 和 driver store
        login(driverId, driver.name, 'driver', driver.phone);
        setDriver(driver);
        navigate('/driver/dashboard', { replace: true });
      } else {
        setError('帳號不存在，請聯絡管理員建立');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('帳號不存在，請聯絡管理員建立');
      } else {
        setError('登入失敗，請重試');
      }
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
                setPhone('');
                setPassword('');
                setName('');
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

          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {/* 乘客登入 */}
          {role === 'rider' && (
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
                onClick={handleRiderLogin}
                disabled={!phone || loading}
                data-testid="btn-login"
              >
                {loading ? '登入中...' : '登入'}
              </Button>
            </>
          )}

          {/* 管理員登入 */}
          {role === 'admin' && (
            <>
              <TextField
                fullWidth
                label="帳號"
                placeholder="輸入管理員帳號"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="密碼"
                placeholder="輸入管理員密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }}
                type="password"
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
                onClick={handleAdminLogin}
                disabled={!phone || !password}
              >
                登入
              </Button>
            </>
          )}

          {/* 司機登入 */}
          {role === 'driver' && (
            <>
              <TextField
                fullWidth
                label="手機號碼"
                placeholder="0912-345-678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ mb: 3 }}
                data-testid="driver-phone"
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
    </Box>
  );
}
