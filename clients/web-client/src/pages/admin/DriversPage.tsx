import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { adminApi } from '../../api/admin.api';
import { getVehicleTypeName } from '../../utils/vehicleTypes';
import type { Driver, VehicleType, Location } from '../../types';

// 台中市的一些預設位置供選擇
const PRESET_LOCATIONS = [
  { name: '台中火車站', lat: 24.1368, lng: 120.6861 },
  { name: '台中高鐵站', lat: 24.1126, lng: 120.6155 },
  { name: '逢甲夜市', lat: 24.1808, lng: 120.6461 },
  { name: '一中商圈', lat: 24.1495, lng: 120.6857 },
  { name: '台中國家歌劇院', lat: 24.1622, lng: 120.6410 },
  { name: '科博館', lat: 24.1597, lng: 120.6657 },
  { name: '秋紅谷', lat: 24.1637, lng: 120.6393 },
  { name: '勤美誠品', lat: 24.1508, lng: 120.6622 },
  { name: '草悟道', lat: 24.1483, lng: 120.6631 },
  { name: '台中公園', lat: 24.1453, lng: 120.6839 },
];

export function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Snackbar 狀態
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // 新增司機表單
  const [newDriver, setNewDriver] = useState({
    phone: '',
    name: '',
    vehiclePlate: '',
    vehicleType: 'STANDARD' as VehicleType,
  });
  
  // 位置設置表單
  const [locationForm, setLocationForm] = useState({
    lat: '',
    lng: '',
    address: '',
    preset: '',
  });
  
  // 位置設置狀態
  const [canSetLocation, setCanSetLocation] = useState(true);
  const [locationReason, setLocationReason] = useState<string | null>(null);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getDrivers();
      if (response.data.success && response.data.data) {
        setDrivers(response.data.data.drivers);
      }
    } catch (error) {
      console.error('取得司機失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleCreateDriver = async () => {
    if (!newDriver.phone || !newDriver.name) {
      setSnackbar({ open: true, message: '請填寫所有必填欄位', severity: 'warning' });
      return;
    }
    
    // 自動生成隨機車牌 (例如: ABC-1234)
    const randomPlate = `${String.fromCharCode(65+Math.floor(Math.random()*26))}${String.fromCharCode(65+Math.floor(Math.random()*26))}${String.fromCharCode(65+Math.floor(Math.random()*26))}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const response = await adminApi.createDriver({
        driverId: `driver-${newDriver.phone}`,
        name: newDriver.name,
        phone: newDriver.phone,
        vehiclePlate: randomPlate,
        vehicleType: newDriver.vehicleType,
      });
      if (response.data.success) {
        setSnackbar({ open: true, message: '司機建立成功', severity: 'success' });
        setOpenDialog(false);
        setNewDriver({ phone: '', name: '', vehiclePlate: '', vehicleType: 'STANDARD' });
        fetchDrivers();
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        setSnackbar({ open: true, message: '司機帳號已存在', severity: 'error' });
      } else {
        setSnackbar({ open: true, message: '建立失敗', severity: 'error' });
      }
    }
  };
  
  // 開啟位置設置對話框
  const handleOpenLocationDialog = async (driver: Driver) => {
    setSelectedDriver(driver);
    setLocationLoading(true);
    setOpenLocationDialog(true);
    
    // 初始化表單
    if (driver.location) {
      setLocationForm({
        lat: String(driver.location.x || ''),
        lng: String(driver.location.y || ''),
        address: driver.location.address || '',
        preset: '',
      });
    } else {
      setLocationForm({ lat: '', lng: '', address: '', preset: '' });
    }
    
    // 檢查是否可以設置位置
    try {
      const response = await adminApi.getDriverLocationStatus(driver.driverId);
      if (response.data.success && response.data.data) {
        setCanSetLocation(response.data.data.canSetLocation);
        setLocationReason(response.data.data.reason || null);
      }
    } catch (error) {
      console.error('檢查位置狀態失敗:', error);
      setCanSetLocation(false);
      setLocationReason('無法檢查位置狀態');
    } finally {
      setLocationLoading(false);
    }
  };
  
  // 選擇預設位置
  const handlePresetChange = (presetName: string) => {
    const preset = PRESET_LOCATIONS.find(p => p.name === presetName);
    if (preset) {
      setLocationForm({
        lat: String(preset.lat),
        lng: String(preset.lng),
        address: preset.name,
        preset: presetName,
      });
    }
  };
  
  // 設置位置
  const handleSetLocation = async () => {
    if (!selectedDriver) return;
    
    const lat = parseFloat(locationForm.lat);
    const lng = parseFloat(locationForm.lng);
    
    // 驗證座標
    if (isNaN(lat) || isNaN(lng)) {
      setSnackbar({ open: true, message: '請輸入有效的經緯度', severity: 'warning' });
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setSnackbar({ open: true, message: '緯度必須在 -90 到 90 之間', severity: 'warning' });
      return;
    }
    
    if (lng < -180 || lng > 180) {
      setSnackbar({ open: true, message: '經度必須在 -180 到 180 之間', severity: 'warning' });
      return;
    }
    
    setLocationLoading(true);
    try {
      const response = await adminApi.setDriverLocation(selectedDriver.driverId, {
        lat,
        lng,
        address: locationForm.address || undefined,
      });
      
      if (response.data.success) {
        setSnackbar({ open: true, message: '位置設置成功', severity: 'success' });
        setOpenLocationDialog(false);
        fetchDrivers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || '位置設置失敗';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLocationLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'success';
      case 'BUSY': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ONLINE': return '上線';
      case 'OFFLINE': return '離線';
      case 'BUSY': return '忙碌';
      default: return status;
    }
  };
  
  const formatLocation = (location: Location | undefined) => {
    if (!location) return '未設置';
    if (location.address) return location.address;
    
    // 嘗試匹配預設地點 (解決座標顯示問題)
    const preset = PRESET_LOCATIONS.find(p => 
      Math.abs(p.lat - (location.x || 0)) < 0.0001 && 
      Math.abs(p.lng - (location.y || 0)) < 0.0001
    );
    if (preset) return preset.name;

    return '自訂位置'; 
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">司機管理</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDrivers}
          >
            重新整理
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            新增司機
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'grey.400' }}>司機 ID</TableCell>
                <TableCell sx={{ color: 'grey.400' }}>姓名</TableCell>
                <TableCell sx={{ color: 'grey.400' }}>電話</TableCell>
                <TableCell sx={{ color: 'grey.400' }}>車牌</TableCell>
                <TableCell sx={{ color: 'grey.400' }}>車種</TableCell>
                <TableCell sx={{ color: 'grey.400' }}>狀態</TableCell>
                <TableCell sx={{ color: 'grey.400' }}>位置</TableCell>
                <TableCell sx={{ color: 'grey.400' }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.driverId} hover>
                  <TableCell sx={{ color: 'white' }}>
                    <Chip label={driver.driverId} size="small" color="primary" />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{driver.name}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{driver.phone}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{driver.vehiclePlate}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{getVehicleTypeName(driver.vehicleType)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(driver.status)}
                      color={getStatusColor(driver.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'grey.400', fontSize: '0.85rem' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'grey.300' }}>
                        {formatLocation(driver.location)}
                      </Typography>
                      {driver.location && (driver.location.x || driver.location.y) && (
                        <Typography variant="caption" sx={{ color: 'grey.600', fontFamily: 'monospace' }}>
                          ({Number(driver.location.x).toFixed(4)}, {Number(driver.location.y).toFixed(4)})
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={driver.busy ? '司機正在行程中，無法更改位置' : '設置初始位置'}>
                      <span>
                        <IconButton
                          size="small"
                          color={driver.busy ? 'default' : 'primary'}
                          onClick={() => handleOpenLocationDialog(driver)}
                          disabled={driver.busy}
                        >
                          {driver.busy ? <WarningIcon /> : <LocationIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ color: 'grey.500' }}>
                    沒有司機資料
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 新增司機對話框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增司機</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="手機號碼"
            value={newDriver.phone}
            onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            placeholder="例: 0912345678"
          />
          <TextField
            fullWidth
            label="姓名"
            value={newDriver.name}
            onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>車種 *</InputLabel>
            <Select
              value={newDriver.vehicleType}
              label="車種 *"
              onChange={(e) => setNewDriver({ ...newDriver, vehicleType: e.target.value as VehicleType })}
            >
              <MenuItem value="STANDARD">🚗 菁英</MenuItem>
              <MenuItem value="PREMIUM">🚘 尊榮</MenuItem>
              <MenuItem value="XL">🚐 大型</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateDriver}>建立</Button>
        </DialogActions>
      </Dialog>
      
      {/* 設置位置對話框 */}
      <Dialog open={openLocationDialog} onClose={() => setOpenLocationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            設置司機位置
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {locationLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !canSetLocation ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>無法設置位置</strong><br />
              {locationReason || '司機目前狀態不允許更改位置'}
            </Alert>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                設置司機的初始位置（用於 Demo）。此功能只能在司機<strong>沒有進行中的行程</strong>時使用。
              </Alert>
              
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'grey.600' }}>
                快速選擇預設位置：
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>選擇地點</InputLabel>
                <Select
                  value={locationForm.preset}
                  label="選擇地點"
                  onChange={(e) => handlePresetChange(e.target.value)}
                >
                  {PRESET_LOCATIONS.map((loc) => (
                    <MenuItem key={loc.name} value={loc.name}>
                      📍 {loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'grey.600' }}>
                或手動輸入座標：
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="緯度 (Latitude)"
                  type="number"
                  value={locationForm.lat}
                  onChange={(e) => setLocationForm({ ...locationForm, lat: e.target.value, preset: '' })}
                  placeholder="例: 24.1368"
                  inputProps={{ step: 0.0001 }}
                />
                <TextField
                  fullWidth
                  label="經度 (Longitude)"
                  type="number"
                  value={locationForm.lng}
                  onChange={(e) => setLocationForm({ ...locationForm, lng: e.target.value, preset: '' })}
                  placeholder="例: 120.6861"
                  inputProps={{ step: 0.0001 }}
                />
              </Box>
              <TextField
                fullWidth
                label="地址描述（可選）"
                value={locationForm.address}
                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                placeholder="例: 台中火車站"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLocationDialog(false)}>取消</Button>
          <Button 
            variant="contained" 
            onClick={handleSetLocation}
            disabled={!canSetLocation || locationLoading}
            startIcon={<LocationIcon />}
          >
            設置位置
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
