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
import { StatusChip } from '../../components/common/StatusChip';
import { orderApi } from '../../api/order.api';
import { useDriverStore } from '../../stores/driver.store';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
import type { Order } from '../../types';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { driver } = useDriverStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  
  // 地址狀態
  const [pickupAddress, setPickupAddress] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<string | null>(null);
  const [loadingPickup, setLoadingPickup] = useState(false);
  const [loadingDropoff, setLoadingDropoff] = useState(false);

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

  // 獲取地址
  const fetchAddresses = async (orderData: Order) => {
    // 上車點地址
    if (orderData.pickupLocation) {
      const lat = orderData.pickupLocation.x ?? (orderData.pickupLocation as any).lat;
      const lng = orderData.pickupLocation.y ?? (orderData.pickupLocation as any).lng;
      if (lat !== undefined && lng !== undefined) {
        setLoadingPickup(true);
        try {
          const address = await reverseGeocodeWithCache(lat, lng);
          setPickupAddress(address);
        } catch {
          setPickupAddress(`(${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`);
        } finally {
          setLoadingPickup(false);
        }
      }
    }

    // 下車點地址
    if (orderData.dropoffLocation) {
      const lat = orderData.dropoffLocation.x ?? (orderData.dropoffLocation as any).lat;
      const lng = orderData.dropoffLocation.y ?? (orderData.dropoffLocation as any).lng;
      if (lat !== undefined && lng !== undefined) {
        setLoadingDropoff(true);
        try {
          const address = await reverseGeocodeWithCache(lat, lng);
          setDropoffAddress(address);
        } catch {
          setDropoffAddress(`(${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`);
        } finally {
          setLoadingDropoff(false);
        }
      }
    }
  };

  const handleAccept = async () => {
    if (!orderId || !driver) return;

    console.log('Accepting order:', orderId, 'driverId:', driver.driverId, 'driver:', driver);
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
          {loadingPickup ? (
            <Skeleton variant="text" width="80%" sx={{ mb: 2 }} />
          ) : (
            <Typography sx={{ mb: 2 }}>
              {pickupAddress || '載入中...'}
            </Typography>
          )}

          <Typography variant="subtitle2" color="text.secondary">
            🎯 下車地點
          </Typography>
          {loadingDropoff ? (
            <Skeleton variant="text" width="80%" />
          ) : (
            <Typography>
              {dropoffAddress || '載入中...'}
            </Typography>
          )}
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
