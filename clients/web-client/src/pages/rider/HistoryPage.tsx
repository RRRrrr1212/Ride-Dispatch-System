import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Chip, Alert } from '@mui/material';
import { useAuthStore } from '../../stores/auth.store';
import { adminApi } from '../../api/admin.api';
import type { Order } from '../../types';

export function HistoryPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 使用 admin API 取得歷史訂單 (Demo 用途)
        // 正式環境應該有專門的乘客歷史 API
        const response = await adminApi.getOrders({ status: 'COMPLETED' });
        if (response.data.success && response.data.data) {
          // 過濾出該乘客的訂單
          const allOrders = response.data.data.orders || [];
          const myOrders = allOrders.filter(
            (order: Order) => order.passengerId === user.id
          );
          setOrders(myOrders);
        }
      } catch (err) {
        console.error('取得歷史訂單失敗:', err);
        // 如果 API 失敗，嘗試取得所有訂單
        try {
          const response = await adminApi.getOrders({});
          if (response.data.success && response.data.data) {
            const allOrders = response.data.data.orders || [];
            const completedOrders = allOrders.filter(
              (order: Order) => 
                order.status === 'COMPLETED' && 
                order.passengerId === user.id
            );
            setOrders(completedOrders);
          }
        } catch {
          setError('無法載入歷史行程');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // 取得地址顯示
  const getLocationDisplay = (location: any): string => {
    if (!location) return '未知地點';
    if (location.address) return location.address;
    const x = location.x ?? location.lat ?? 0;
    const y = location.y ?? location.lng ?? 0;
    return `(${Number(x).toFixed(4)}, ${Number(y).toFixed(4)})`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        歷史行程
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h1" sx={{ mb: 2, fontSize: 64 }}>
            🚗
          </Typography>
          <Typography color="text.secondary">
            還沒有完成的行程
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            完成您的第一趟行程後，這裡會顯示記錄
          </Typography>
        </Box>
      )}

      {orders.map((order) => (
        <Card key={order.orderId} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {formatDate(order.completedAt || order.createdAt)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label={order.vehicleType || 'STANDARD'} 
                  size="small" 
                  variant="outlined"
                />
                <Typography color="primary" fontWeight="bold" fontSize={18}>
                  ${order.fare || order.estimatedFare || 0}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', mr: 1.5, mt: 0.5 }} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {getLocationDisplay(order.pickupLocation)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main', mr: 1.5, mt: 0.5 }} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {getLocationDisplay(order.dropoffLocation)}
              </Typography>
            </Box>

            {order.driverName && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                司機：{order.driverName}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
