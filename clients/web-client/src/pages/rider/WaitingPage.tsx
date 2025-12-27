import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Avatar,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  LocationOn as PickupIcon,
  EmojiTransportation as CarIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
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
  const [waitingTime, setWaitingTime] = useState(0); 
  const [estimatedArrival, setEstimatedArrival] = useState<number | null>(null);
  
  // 地圖相關狀態
  const savedPickup = sessionStorage.getItem('currentOrderPickup');
  const savedDropoff = sessionStorage.getItem('currentOrderDropoff');
  const savedPickupAddress = sessionStorage.getItem('currentOrderPickupAddress');
  
  const [pickupLocation] = useState<MapLocation | null>(
    savedPickup ? JSON.parse(savedPickup) : { lat: 24.1618, lng: 120.6469 }
  );
  const [dropoffLocation] = useState<MapLocation | null>(
    savedDropoff ? JSON.parse(savedDropoff) : null
  );
  const [pickupAddress] = useState(savedPickupAddress || '');
  
  const [driverToPickupPath, setDriverToPickupPath] = useState<MapLocation[] | null>(null);
  const hasStartedAnimationRef = useRef(false);

  // 模擬司機移動
  const { position: animatedDriverPos, progress } = useAnimatedPosition(
    driverToPickupPath,
    {
      speed: 5,
      enabled: true,
      onComplete: () => console.log('司機已到達乘客位置'),
    }
  );

  // 等待計時器
  useEffect(() => {
    const timer = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            
            // 模擬司機初始位置 (距離上車點 0.5-1.5 公里)
            const offset = (Math.random() - 0.5) * 0.015;
            const initialDriverPos = {
              lat: pickupLocation.lat + offset,
              lng: pickupLocation.lng + offset,
            };
            
            try {
              const route = await getRouteWithCache(initialDriverPos, pickupLocation);
              setDriverToPickupPath(route.coordinates);
              setEstimatedArrival(Math.ceil(route.duration / 60));
            } catch (error) {
              console.error('路徑規劃失敗:', error);
              setDriverToPickupPath([initialDriverPos, pickupLocation]);
              setEstimatedArrival(3);
            }
          }

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

  const markers: MapMarker[] = [];
  if (pickupLocation) {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車點' });
  }
  if (dropoffLocation) {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車點' });
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* 全屏地圖 */}
      <LeafletMap
        center={pickupLocation || { lat: 24.1618, lng: 120.6469 }}
        zoom={15}
        markers={markers}
        routePath={driverToPickupPath || undefined}
        driverPosition={animatedDriverPos}
      />
      
      {/* 底部面板 */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#1a1a1a',
        borderRadius: '24px 24px 0 0',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
        transition: 'height 0.3s ease',
        overflow: 'hidden',
      }}>
        {/* 進度條 (僅在已接單時顯示) */}
        {order?.status === 'ACCEPTED' && (
           <LinearProgress 
             variant="determinate" 
             value={progress * 100} 
             sx={{ height: 4, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#276ef1' } }} 
           />
        )}

        <Box sx={{ p: 3 }}>
          {/* PENDING: 尋找司機中 */}
          {order?.status === 'PENDING' && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                <CircularProgress size={60} thickness={4} sx={{ color: '#276ef1' }} />
                <Box
                  sx={{
                    top: 0, left: 0, bottom: 0, right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CarIcon sx={{ color: '#fff' }} />
                </Box>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="white" gutterBottom>
                正在尋找附近的司機...
              </Typography>
              <Typography variant="body1" color="grey.400" sx={{ mb: 3 }}>
                已等待 {formatTime(waitingTime)}
              </Typography>
              
              <Paper 
                sx={{ 
                  bgcolor: '#2a2a2a', 
                  p: 2, 
                  borderRadius: 3, 
                  display: 'flex', 
                  alignItems: 'center',
                  textAlign: 'left',
                  mb: 3
                }}
              >
                <PickupIcon sx={{ color: '#276ef1', mr: 2 }} />
                <Box>
                  <Typography variant="caption" color="grey.500">上車地點</Typography>
                  <Typography variant="body1" color="white" fontWeight={500} noWrap>
                      {pickupAddress || '位置載入中...'}
                  </Typography>
                </Box>
              </Paper>

              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="large"
                onClick={handleCancel}
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                取消行程
              </Button>
            </Box>
          )}

          {/* ACCEPTED: 司機已接單 */}
          {order?.status === 'ACCEPTED' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="grey.500">司機將在</Typography>
                  <Typography variant="h4" fontWeight="bold" color="white">
                     {Math.max(1, Math.ceil((estimatedArrival || 5) * (1 - progress)))} <span style={{ fontSize: '1rem' }}>分鐘後到達</span>
                  </Typography>
                </Box>
                <Avatar sx={{ width: 60, height: 60, bgcolor: '#276ef1' }}>
                  {order.driverName?.[0] || 'D'}
                </Avatar>
              </Box>

              <Paper sx={{ bgcolor: '#2a2a2a', p: 2, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                   <Typography variant="h6" color="white" fontWeight="bold">
                     {order.vehiclePlate}
                   </Typography>
                   <Typography variant="body2" color="grey.400" sx={{ bgcolor: '#333', px: 1, py: 0.5, borderRadius: 1 }}>
                     {order.vehicleType}
                   </Typography>
                </Box>
                <Typography variant="body1" color="grey.300">
                  {order.driverName} • ⭐ 4.9
                </Typography>
              </Paper>

              <Box sx={{ display: 'flex', gap: 2 }}>
                 <Button 
                   fullWidth
                   variant="contained" 
                   startIcon={<PhoneIcon />}
                   sx={{ bgcolor: '#333', '&:hover': { bgcolor: '#444' }, py: 1.5, borderRadius: 2 }}
                 >
                   聯絡司機
                 </Button>
                 <Button 
                   fullWidth
                   variant="contained"
                   startIcon={<MessageIcon />}
                   sx={{ bgcolor: '#333', '&:hover': { bgcolor: '#444' }, py: 1.5, borderRadius: 2 }}
                 >
                   傳訊息
                 </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
