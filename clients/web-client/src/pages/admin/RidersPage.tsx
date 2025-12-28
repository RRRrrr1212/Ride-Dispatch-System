import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { adminApi } from '../../api/admin.api';
import type { Rider, Location } from '../../types';

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
  { name: '東海大學', lat: 24.1819, lng: 120.6002 },
  { name: '中興大學', lat: 24.1215, lng: 120.6749 },
];

export function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Snackbar 狀態
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // 新增乘客表單
  const [newRider, setNewRider] = useState({
    name: '',
    phone: '',
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
  const [activeOrders, setActiveOrders] = useState<Array<{ orderId: string; status: string; createdAt: string; driverId?: string }>>([]);
  const [forceCancelLoading, setForceCancelLoading] = useState(false);

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getRiders();
      if (response.data.success && response.data.data) {
        setRiders(response.data.data.riders);
      }
    } catch (error) {
      console.error('取得乘客列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleCreateRider = async () => {
    if (!newRider.name || !newRider.phone) {
      setSnackbar({ open: true, message: '請填寫所有欄位', severity: 'warning' });
      return;
    }
    
    const riderId = `rider-${newRider.phone}`;

    try {
      const response = await adminApi.createRider({
        riderId,
        name: newRider.name,
        phone: newRider.phone,
      });
      if (response.data.success) {
        setSnackbar({ open: true, message: '乘客建立成功', severity: 'success' });
        setOpenDialog(false);
        setNewRider({ name: '', phone: '' });
        fetchRiders();
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        setSnackbar({ open: true, message: '乘客帳號已存在', severity: 'error' });
      } else {
        setSnackbar({ open: true, message: '建立失敗', severity: 'error' });
      }
    }
  };

  const handleDeleteRider = async (riderId: string) => {
    if (!window.confirm(`確定要刪除乘客 ${riderId} 嗎？`)) return;
    
    try {
      await adminApi.deleteRider(riderId);
      setSnackbar({ open: true, message: '乘客已刪除', severity: 'success' });
      fetchRiders();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || '刪除失敗';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };
  
  // 開啟位置設置對話框
  const handleOpenLocationDialog = async (rider: Rider) => {
    setSelectedRider(rider);
    setLocationLoading(true);
    setOpenLocationDialog(true);
    
    // 初始化表單
    if (rider.location) {
      setLocationForm({
        lat: String(rider.location.x || ''),
        lng: String(rider.location.y || ''),
        address: rider.location.address || '',
        preset: '',
      });
    } else {
      setLocationForm({ lat: '', lng: '', address: '', preset: '' });
    }
    
    // 檢查是否可以設置位置
    try {
      const response = await adminApi.getRiderLocationStatus(rider.riderId);
      if (response.data.success && response.data.data) {
        setCanSetLocation(response.data.data.canSetLocation);
        setLocationReason(response.data.data.reason || null);
        setActiveOrders(response.data.data.activeOrders || []);
      }
    } catch (error) {
      console.error('檢查位置狀態失敗:', error);
      setCanSetLocation(false);
      setLocationReason('無法檢查位置狀態');
      setActiveOrders([]);
    } finally {
      setLocationLoading(false);
    }
  };
  
  // 強制取消殘留訂單
  const handleForceCancelOrders = async () => {
    if (!selectedRider) return;
    
    if (!window.confirm(`確定要強制取消乘客 ${selectedRider.name} 的所有殘留訂單嗎？\n\n這個操作會：\n• 將所有進行中的訂單標記為已取消\n• 釋放相關的司機\n\n此操作無法復原！`)) {
      return;
    }
    
    setForceCancelLoading(true);
    try {
      const response = await adminApi.forceCancelRiderOrders(selectedRider.riderId);
      if (response.data.success && response.data.data) {
        const { cancelledCount, cancelledOrderIds } = response.data.data;
        setSnackbar({ 
          open: true, 
          message: `成功取消 ${cancelledCount} 筆訂單: ${cancelledOrderIds.join(', ')}`, 
          severity: 'success' 
        });
        // 重新檢查位置狀態
        const statusResponse = await adminApi.getRiderLocationStatus(selectedRider.riderId);
        if (statusResponse.data.success && statusResponse.data.data) {
          setCanSetLocation(statusResponse.data.data.canSetLocation);
          setLocationReason(statusResponse.data.data.reason || null);
          setActiveOrders(statusResponse.data.data.activeOrders || []);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || '強制取消失敗';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setForceCancelLoading(false);
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
    if (!selectedRider) return;
    
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
      const response = await adminApi.setRiderLocation(selectedRider.riderId, {
        lat,
        lng,
        address: locationForm.address || undefined,
      });
      
      if (response.data.success) {
        setSnackbar({ open: true, message: '位置設置成功', severity: 'success' });
        setOpenLocationDialog(false);
        fetchRiders();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || '位置設置失敗';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLocationLoading(false);
    }
  };
  
  // 檢查座標是否匹配預設位置（允許小誤差）
  const isLocationMatchingPreset = (lat: number, lng: number, preset: typeof PRESET_LOCATIONS[0]): boolean => {
    const tolerance = 0.0001; // 約 11 公尺的誤差範圍
    return Math.abs(lat - preset.lat) < tolerance && Math.abs(lng - preset.lng) < tolerance;
  };
  
  // 根據座標找到匹配的預設位置名稱
  const findMatchingPresetName = (lat: number | undefined, lng: number | undefined): string | null => {
    if (lat === undefined || lng === undefined) return null;
    for (const preset of PRESET_LOCATIONS) {
      if (isLocationMatchingPreset(lat, lng, preset)) {
        return preset.name;
      }
    }
    return null;
  };
  
  const formatLocation = (location: Location | undefined) => {
    if (!location) return '未設置';
    
    // 取得座標（x 是緯度，y 是經度）
    const lat = location.x;
    const lng = location.y;
    
    // 檢查座標是否與預設位置匹配
    const matchingPresetName = findMatchingPresetName(lat, lng);
    
    if (matchingPresetName) {
      // 座標匹配預設位置，顯示該預設位置名稱
      return matchingPresetName;
    } else if (lat !== undefined && lng !== undefined) {
      // 座標不匹配任何預設位置，顯示「自訂」
      return '自訂';
    } else if (location.address) {
      // 沒有座標但有地址，顯示地址
      return location.address;
    }
    
    return '未設置';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">乘客管理</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchRiders}
          >
            重新整理
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            新增乘客
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'grey.400' }}>乘客 ID</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>姓名</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>電話</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>位置</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>建立時間</TableCell>
              <TableCell sx={{ color: 'grey.400' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : riders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'grey.500' }}>
                  尚無乘客資料
                </TableCell>
              </TableRow>
            ) : (
              riders.map((rider) => (
                <TableRow key={rider.riderId} hover>
                  <TableCell sx={{ color: 'white' }}>
                    <Chip label={rider.riderId} size="small" color="primary" />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{rider.name}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{rider.phone}</TableCell>
                  <TableCell sx={{ color: 'grey.400', fontSize: '0.85rem' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'grey.300' }}>
                        {formatLocation(rider.location)}
                      </Typography>
                      {rider.location && (rider.location.x || rider.location.y) && (
                        <Typography variant="caption" sx={{ color: 'grey.600', fontFamily: 'monospace' }}>
                          ({Number(rider.location.x).toFixed(4)}, {Number(rider.location.y).toFixed(4)})
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'grey.400' }}>
                    {new Date(rider.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="設置初始位置">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenLocationDialog(rider)}
                      >
                        <LocationIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="刪除乘客">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteRider(rider.riderId)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增乘客對話框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>新增乘客</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="手機號碼"
            value={newRider.phone}
            onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            placeholder="例: 0912345678"
          />
          <TextField
            fullWidth
            label="姓名"
            value={newRider.name}
            onChange={(e) => setNewRider({ ...newRider, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateRider}>建立</Button>
        </DialogActions>
      </Dialog>
      
      {/* 設置位置對話框 */}
      <Dialog open={openLocationDialog} onClose={() => setOpenLocationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            設置乘客位置
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {locationLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !canSetLocation ? (
            <Box>
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>無法設置位置</strong><br />
                {locationReason || '乘客目前狀態不允許更改位置'}
              </Alert>
              
              {activeOrders.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                    🔴 發現 {activeOrders.length} 筆殘留訂單：
                  </Typography>
                  <Box sx={{ bgcolor: '#1a1a1a', p: 1.5, borderRadius: 1, mb: 2 }}>
                    {activeOrders.map((order) => (
                      <Box key={order.orderId} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        py: 0.5,
                        borderBottom: '1px solid #333',
                        '&:last-child': { borderBottom: 'none' }
                      }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {order.orderId}
                          </Typography>
                          <Typography variant="caption" color="grey.500">
                            {order.status} • {new Date(order.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                        {order.driverId && (
                          <Typography variant="caption" color="grey.400">
                            司機: {order.driverId}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                  
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    這些訂單可能是因為系統異常而未正確關閉。如果確認行程已結束，可以使用下方按鈕強制取消。
                  </Alert>
                  
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    onClick={handleForceCancelOrders}
                    disabled={forceCancelLoading}
                  >
                    {forceCancelLoading ? '處理中...' : `強制取消 ${activeOrders.length} 筆殘留訂單`}
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                設置乘客的初始位置（用於 Demo）。此功能只能在乘客<strong>沒有進行中的訂單</strong>時使用。
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
