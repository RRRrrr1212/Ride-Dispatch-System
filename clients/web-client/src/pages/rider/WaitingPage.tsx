import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { StatusChip } from '../../components/common/StatusChip';
import { orderApi } from '../../api/order.api';
import { useAuthStore } from '../../stores/auth.store';
import { getRouteWithCache } from '../../api/routing.api';
import { useAnimatedPosition } from '../../hooks/useAnimatedPosition';
import type { Order } from '../../types';

export function WaitingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 地圖相關狀態
  const savedPickup = sessionStorage.getItem('currentOrderPickup');
  const savedDropoff = sessionStorage.getItem('currentOrderDropoff');
  
  const [pickupLocation] = useState<MapLocation | null>(
    savedPickup ? JSON.parse(savedPickup) : { lat: 24.1618, lng: 120.6469 }
  );
  const [dropoffLocation] = useState<MapLocation | null>(
    savedDropoff ? JSON.parse(savedDropoff) : null
  );
  
  // 路徑相關狀態
  const [driverToPickupPath, setDriverToPickupPath] = useState<MapLocation[] | null>(null);
  // driverInitialLocation 用於記錄但目前由動畫 hook 管理
  const hasStartedAnimationRef = useRef(false);

  // 使用動畫 Hook
  const { position: animatedDriverPos, progress } = useAnimatedPosition(
    driverToPickupPath,
    {
      speed: 20,
      enabled: true,
      onComplete: () => {
        console.log('司機已到達乘客位置');
      },
    }
  );

  // Polling
  useEffect(() => {
    if (!orderId) return;

    const poll = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          const o = response.data.data;
          setOrder(o);

          // 當司機接單後，計算真實路徑並開始動畫
          if (o.status === 'ACCEPTED' && !hasStartedAnimationRef.current && pickupLocation) {
            hasStartedAnimationRef.current = true;
            
            // 模擬司機初始位置 (距離上車點 1-2 公里)
            const offset = (Math.random() - 0.5) * 0.02;
            const initialDriverPos = {
              lat: pickupLocation.lat + offset,
              lng: pickupLocation.lng + offset,
            };
            // 司機初始位置記錄在 initialDriverPos（用於路徑規劃）
            
            // 取得真實路徑
            try {
              const route = await getRouteWithCache(initialDriverPos, pickupLocation);
              setDriverToPickupPath(route.coordinates);
            } catch (error) {
              console.error('路徑規劃失敗，使用直線路徑:', error);
              // 退回到直線動畫
              setDriverToPickupPath([initialDriverPos, pickupLocation]);
            }
          }

          // 狀態轉換
          if (o.status === 'ONGOING') {
            navigate(`/rider/trip/${orderId}`);
          } else if (o.status === 'COMPLETED') {
            navigate(`/rider/completed/${orderId}`);
          } else if (o.status === 'CANCELLED') {
            navigate('/rider/home');
          }
        }
      } catch (error) {
        console.error('查詢訂單失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    poll();
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [orderId, navigate, pickupLocation]);

  const handleCancel = async () => {
    if (!orderId || !user) return;

    try {
      await orderApi.cancel(orderId, user.id, '乘客取消');
      navigate('/rider/home');
    } catch (error) {
      console.error('取消失敗:', error);
    }
  };

  // 建立地圖標記
  const markers: MapMarker[] = [];
  if (pickupLocation) {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車點' });
  }
  if (dropoffLocation) {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車點' });
  }
  // 乘客位置 (與上車點相同)
  if (pickupLocation) {
    markers.push({ id: 'passenger', position: pickupLocation, type: 'passenger' });
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地圖區域 - 顯示乘客和司機位置及路徑 */}
      <Box sx={{ height: 300, position: 'relative' }}>
        <LeafletMap
          center={pickupLocation || { lat: 24.1618, lng: 120.6469 }}
          zoom={15}
          markers={markers}
          routePath={driverToPickupPath || undefined}  // 顯示司機到乘客的路徑
          driverPosition={animatedDriverPos}  // 動畫中的司機位置
        />
        
        {/* 狀態遮罩 */}
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'rgba(0,0,0,0.8)',
          color: '#fff',
          px: 3,
          py: 1,
          borderRadius: 2,
          textAlign: 'center',
          zIndex: 1000,
        }}>
          {order?.status === 'PENDING' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} sx={{ color: '#fff' }} />
              <Typography variant="body2">
                正在尋找司機...
              </Typography>
            </Box>
          )}
          {order?.status === 'ACCEPTED' && (
            <Typography variant="body2">
              🚗 司機正在趕來！({Math.round(progress * 100)}%)
            </Typography>
          )}
        </Box>
      </Box>

      {/* 進度條 */}
      <LinearProgress 
        variant={order?.status === 'PENDING' ? 'indeterminate' : 'determinate'} 
        value={order?.status === 'ACCEPTED' ? progress * 100 : 0}
        sx={{ height: 4 }} 
      />

      {/* 訂單資訊 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">
                {order?.status === 'PENDING' ? '等待司機接單' : '司機正在趕來'}
              </Typography>
              <StatusChip status={order?.status || 'PENDING'} />
            </Box>

            {order?.driverId && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">司機資訊</Typography>
                <Typography fontWeight="bold">{order.driverName || '司機'}</Typography>
                <Typography variant="body2">{order.vehiclePlate || 'ABC-1234'}</Typography>
              </Box>
            )}

            <Typography variant="body2" color="text.secondary">訂單編號</Typography>
            <Typography sx={{ mb: 2 }}>{order?.orderId?.slice(0, 8)}...</Typography>
          </CardContent>
        </Card>

        {/* 取消按鈕 */}
        <Button
          fullWidth
          variant="outlined"
          color="error"
          onClick={handleCancel}
          data-testid="btn-cancel"
        >
          取消叫車
        </Button>
      </Box>
    </Box>
  );
}
