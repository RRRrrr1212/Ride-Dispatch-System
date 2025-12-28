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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { StatusChip } from '../../components/common/StatusChip';
import { adminApi } from '../../api/admin.api';
import { getVehicleTypeName } from '../../utils/vehicleTypes';
import type { Order, OrderStatus } from '../../types';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params = statusFilter ? { status: statusFilter } : undefined;
        const response = await adminApi.getOrders(params);
        if (response.data.success && response.data.data) {
          setOrders(response.data.data.orders);
        }
      } catch (error) {
        console.error('取得訂單失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">訂單管理</Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>狀態篩選</InputLabel>
          <Select
            value={statusFilter}
            label="狀態篩選"
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="PENDING">等待中</MenuItem>
            <MenuItem value="ACCEPTED">已接單</MenuItem>
            <MenuItem value="ONGOING">行程中</MenuItem>
            <MenuItem value="COMPLETED">已完成</MenuItem>
            <MenuItem value="CANCELLED">已取消</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>訂單 ID</TableCell>
                <TableCell>乘客</TableCell>
                <TableCell>司機</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>車種</TableCell>
                <TableCell>車資</TableCell>
                <TableCell>建立時間</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.orderId} hover>
                  <TableCell>{order.orderId.slice(0, 8)}...</TableCell>
                  <TableCell>{order.passengerId}</TableCell>
                  <TableCell>{order.driverId || '-'}</TableCell>
                  <TableCell><StatusChip status={order.status} /></TableCell>
                  <TableCell>{getVehicleTypeName(order.vehicleType)}</TableCell>
                  <TableCell>${order.fare || order.estimatedFare || '-'}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    沒有訂單資料
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
