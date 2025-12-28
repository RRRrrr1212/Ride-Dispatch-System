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
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { adminApi } from '../../api/admin.api';
import { getVehicleTypeName } from '../../utils/vehicleTypes';
import type { Driver, VehicleType } from '../../types';

export function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  
  // 新增司機表單
  const [newDriver, setNewDriver] = useState({
    phone: '',
    name: '',
    vehiclePlate: '',
    vehicleType: 'STANDARD' as VehicleType,
  });

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
      alert('請填寫所有必填欄位');
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
        alert('司機建立成功');
        setOpenDialog(false);
        setNewDriver({ phone: '', name: '', vehiclePlate: '', vehicleType: 'STANDARD' });
        fetchDrivers();
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('司機帳號已存在');
      } else {
        alert('建立失敗');
      }
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
                </TableRow>
              ))}
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: 'grey.500' }}>
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
    </Box>
  );
}
