import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Person as RiderIcon,
  DirectionsCar as DriverIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth.store';
import { useDriverStore } from '../../stores/driver.store';
import { driverApi } from '../../api/driver.api';
import type { UserRole, VehicleType } from '../../types';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const { setDriver } = useDriverStore();

  const [role, setRole] = useState<UserRole>('rider');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  
  // 司機額外欄位
  const [driverTab, setDriverTab] = useState(0); // 0: 登入, 1: 註冊
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('STANDARD');
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
        const response = await driverApi.getOffers(driverId);
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

  // 司機註冊
  const handleDriverRegister = async () => {
    if (!phone || !name || !vehiclePlate) {
      setError('請填寫所有必填欄位');
      return;
    }

    setLoading(true);
    setError('');

    const driverId = `driver-${phone}`;

    try {
      // 嘗試向後端註冊
      const response = await driverApi.register({
        phone,
        name,
        vehiclePlate,
        vehicleType,
      });

      if (response.data.success && response.data.data) {
        const driver = response.data.data;
        
        login(driver.driverId, driver.name, 'driver', driver.phone);
        setDriver(driver);
        navigate('/driver/dashboard', { replace: true });
      }
    } catch (err: any) {
      // 如果後端註冊失敗，使用 Demo 模式
      console.log('後端註冊失敗，使用 Demo 模式');
      
      login(driverId, name, 'driver', phone);
      setDriver({
        driverId,
        name,
        phone,
        vehiclePlate,
        vehicleType,
        status: 'OFFLINE',
        busy: false,
      });

      navigate('/driver/dashboard', { replace: true });
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

          {/* 司機 - 登入/註冊 */}
          {role === 'driver' && (
            <>
              <Tabs
                value={driverTab}
                onChange={(_, v) => {
                  setDriverTab(v);
                  setError('');
                }}
                sx={{ mb: 2 }}
              >
                <Tab label="登入" />
                <Tab label="註冊" />
              </Tabs>

              {error && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                  {error}
                </Typography>
              )}

              {/* 司機登入 */}
              {driverTab === 0 && (
                <>
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

              {/* 司機註冊 */}
              {driverTab === 1 && (
                <>
                  <TextField
                    fullWidth
                    label="手機號碼 *"
                    placeholder="0912-345-678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                  <TextField
                    fullWidth
                    label="姓名 *"
                    placeholder="輸入您的姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                  <TextField
                    fullWidth
                    label="車牌號碼 *"
                    placeholder="ABC-1234"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>車種 *</InputLabel>
                    <Select
                      value={vehicleType}
                      label="車種 *"
                      onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    >
                      <MenuItem value="STANDARD">🚗 菁英</MenuItem>
                      <MenuItem value="PREMIUM">🚘 尊榮</MenuItem>
                      <MenuItem value="XL">🚐 大型</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleDriverRegister}
                    disabled={!phone || !name || !vehiclePlate || loading}
                    data-testid="btn-driver-register"
                  >
                    {loading ? '註冊中...' : '註冊成為司機'}
                  </Button>
                </>
              )}
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
