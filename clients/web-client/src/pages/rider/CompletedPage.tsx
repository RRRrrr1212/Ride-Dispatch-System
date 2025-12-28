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
  Skeleton,
} from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { orderApi } from '../../api/order.api';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
import type { Order } from '../../types';

export function CompletedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 地址狀態
  const [pickupAddress, setPickupAddress] = useState<string>('載入中...');
  const [dropoffAddress, setDropoffAddress] = useState<string>('載入中...');

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          const orderData = response.data.data;
          setOrder(orderData);
          
          // 獲取地址
          fetchAddresses(orderData);
        }
      } catch (error) {
        console.error('查詢失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const fetchAddresses = async (orderData: Order) => {
    // 上車點
    if (orderData.pickupLocation) {
      const lat = orderData.pickupLocation.x ?? (orderData.pickupLocation as any).lat;
      const lng = orderData.pickupLocation.y ?? (orderData.pickupLocation as any).lng;
      
      if (lat !== undefined && lng !== undefined) {
        try {
          const addr = await reverseGeocodeWithCache(lat, lng);
          setPickupAddress(addr);
        } catch {
          setPickupAddress(`(${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`);
        }
      }
    }

    // 下車點
    if (orderData.dropoffLocation) {
      const lat = orderData.dropoffLocation.x ?? (orderData.dropoffLocation as any).lat;
      const lng = orderData.dropoffLocation.y ?? (orderData.dropoffLocation as any).lng;
      
      if (lat !== undefined && lng !== undefined) {
        try {
          const addr = await reverseGeocodeWithCache(lat, lng);
          setDropoffAddress(addr);
        } catch {
          setDropoffAddress(`(${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`);
        }
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 6, textAlign: 'center', minHeight: '100%' }}>
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
            {pickupAddress === '載入中...' ? <Skeleton width="80%" /> : pickupAddress}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            🎯 下車
          </Typography>
          <Typography>
            {dropoffAddress === '載入中...' ? <Skeleton width="80%" /> : dropoffAddress}
          </Typography>
        </CardContent>
      </Card>

      {/* 返回首頁 */}
      <Button
        fullWidth
        variant="contained"
        sx={{ position: 'relative', zIndex: 10, mb: 4 }}
        onClick={() => {
          // 清除所有訂單相關狀態
          sessionStorage.removeItem('activeOrderId');
          sessionStorage.removeItem('currentOrderPickup');
          sessionStorage.removeItem('currentOrderDropoff');
          sessionStorage.removeItem('currentOrderPickupAddress');
          sessionStorage.removeItem('currentOrderDropoffAddress');
          navigate('/rider/home');
        }}
      >
        返回首頁
      </Button>
    </Box>
  );
}
