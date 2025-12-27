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
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { orderApi } from '../../api/order.api';
import type { Order } from '../../types';

export function CompletedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      {/* 完成圖示 */}
      <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1 }}>
        行程完成！
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        感謝您使用 Uber
      </Typography>

      {/* 費用明細 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
            ${order?.fare || order?.estimatedFare || 0}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'left' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="text.secondary">車種</Typography>
              <Typography>{order?.vehicleType}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="text.secondary">距離</Typography>
              <Typography>{order?.distance || '5.2'} km</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">時長</Typography>
              <Typography>{order?.duration || '15'} 分鐘</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 路線 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'left' }}>
          <Typography variant="subtitle2" color="text.secondary">
            📍 上車
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {order?.pickupLocation.address || `(${order?.pickupLocation.x}, ${order?.pickupLocation.y})`}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            🎯 下車
          </Typography>
          <Typography>
            {order?.dropoffLocation.address || `(${order?.dropoffLocation.x}, ${order?.dropoffLocation.y})`}
          </Typography>
        </CardContent>
      </Card>

      {/* 返回首頁 */}
      <Button
        fullWidth
        variant="contained"
        onClick={() => navigate('/rider/home')}
      >
        返回首頁
      </Button>
    </Box>
  );
}
