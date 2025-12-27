import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';
import { StatusChip } from '../../components/common/StatusChip';
import { orderApi } from '../../api/order.api';
import { useDriverStore } from '../../stores/driver.store';
import type { Order } from '../../types';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { driver } = useDriverStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          setOrder(response.data.data);
        }
      } catch (error) {
        console.error('查詢失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleAccept = async () => {
    if (!orderId || !driver) return;

    setAccepting(true);
    try {
      const response = await orderApi.accept(orderId, driver.driverId);
      if (response.data.success) {
        navigate(`/driver/trip/${orderId}`);
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('此訂單已被其他司機接受');
        navigate('/driver/dashboard');
      } else {
        alert('接單失敗');
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>訂單不存在</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* 狀態 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">訂單詳情</Typography>
            <StatusChip status={order.status} />
          </Box>
        </CardContent>
      </Card>

      {/* 乘客資訊 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            乘客資訊
          </Typography>
          <Typography>👤 {order.passengerId}</Typography>
        </CardContent>
      </Card>

      {/* 行程資訊 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            📍 上車地點
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {order.pickupLocation.address || `(${order.pickupLocation.x}, ${order.pickupLocation.y})`}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            🎯 下車地點
          </Typography>
          <Typography>
            {order.dropoffLocation.address || `(${order.dropoffLocation.x}, ${order.dropoffLocation.y})`}
          </Typography>
        </CardContent>
      </Card>

      {/* 車資 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>預估車資</Typography>
            <Typography color="primary" fontWeight="bold">
              ${order.estimatedFare || 150}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Divider sx={{ my: 2 }} />

      {/* 操作按鈕 */}
      {order.status === 'PENDING' && (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleAccept}
          disabled={accepting}
          data-testid="btn-accept-order"
          sx={{ mb: 2 }}
        >
          {accepting ? '接單中...' : '接受訂單'}
        </Button>
      )}

      <Button
        fullWidth
        variant="outlined"
        onClick={() => navigate('/driver/dashboard')}
      >
        返回
      </Button>
    </Box>
  );
}
