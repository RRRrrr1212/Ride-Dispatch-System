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
} from '@mui/material';
import { adminApi } from '../../api/admin.api';
import type { Driver } from '../../types';

export function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
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

    fetchDrivers();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'success';
      case 'BUSY': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        司機管理
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>司機 ID</TableCell>
                <TableCell>姓名</TableCell>
                <TableCell>電話</TableCell>
                <TableCell>車牌</TableCell>
                <TableCell>車種</TableCell>
                <TableCell>狀態</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.driverId} hover>
                  <TableCell>{driver.driverId}</TableCell>
                  <TableCell>{driver.name}</TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>{driver.vehiclePlate}</TableCell>
                  <TableCell>{driver.vehicleType}</TableCell>
                  <TableCell>
                    <Chip
                      label={driver.status}
                      color={getStatusColor(driver.status) as any}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    沒有司機資料
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
