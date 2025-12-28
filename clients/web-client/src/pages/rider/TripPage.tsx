import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { orderApi } from '../../api/order.api';
import { useAnimatedPosition } from '../../hooks/useAnimatedPosition';
import { getRouteWithCache } from '../../api/routing.api';
import { useAuthStore } from '../../stores/auth.store';
import type { Order } from '../../types';

export function TripPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [driverPosition, setDriverPosition] = useState<MapLocation | null>(null);
  const [tripPath, setTripPath] = useState<MapLocation[] | null>(null);

  // 地圖相關狀態
  const savedPickup = sessionStorage.getItem('currentOrderPickup');
  const savedDropoff = sessionStorage.getItem('currentOrderDropoff');
  
  const [pickupLocation] = useState<MapLocation | null>(
    savedPickup ? JSON.parse(savedPickup) : { lat: 24.1618, lng: 120.6469 }
  );
  const [dropoffLocation] = useState<MapLocation | null>(
    savedDropoff ? JSON.parse(savedDropoff) : { lat: 24.18, lng: 120.68 }
  );
  
  // 模擬沿路行駛動畫 (如果後端沒有提供即時位置，用這個補償)
  // 如果後端提供了 driverLocation，我们会优先使用它
  const { position: animatedCarPos, progress } = useAnimatedPosition(
    tripPath,
    {
      speed: 15, // 行駛速度較快
      enabled: true,
      onComplete: () => console.log('模擬車輛到達'),
    }
  );

  // Polling
  useEffect(() => {
    if (!orderId) return;
    
    // 狀態持久化
    sessionStorage.setItem('activeOrderId', orderId);

    const poll = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          const o = response.data.data;
          setOrder(o);

          // 1. 同步真實司機位置 (支援 {x, y} 或 {lat, lng} 格式)
          const orderData = o as any;
          if (orderData.driverLocation) {
            const dl = orderData.driverLocation;
            const lat = Number(dl.lat ?? dl.x);
            const lng = Number(dl.lng ?? dl.y);
            if (!isNaN(lat) && !isNaN(lng)) {
              setDriverPosition({ lat, lng });
            }
          }
          
          // 2. 如果沒有真實位置且尚未規劃路徑，則規劃一條路徑用於模擬
          if (!tripPath && pickupLocation && dropoffLocation) {
             try {
                // 如果是 ONGOING，路徑應該是從 司機當前位置/上車點 -> 下車點
                // 這裡簡化為 上車點 -> 下車點
                const route = await getRouteWithCache(pickupLocation, dropoffLocation);
                setTripPath(route.coordinates);
             } catch (e) {
                setTripPath([pickupLocation, dropoffLocation]);
             }
          }

          if (o.status === 'COMPLETED') {
            navigate(`/rider/completed/${orderId}`);
          } else if (o.status === 'CANCELLED') {
            navigate('/rider/home');
          }
        }
      } catch (error: any) {
        console.error('查詢失敗:', error);
         if (error.response?.status === 404) {
           // 訂單不存在
        }
      }
    };

    poll();
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [orderId, navigate, pickupLocation, dropoffLocation, tripPath]);


  // 決定顯示在地圖上的車輛位置：
  // 1. 當接近完成 (95%以上) 時，直接顯示在下車點
  // 2. 真實位置優先 > 動畫模擬位置 > 上車點
  const currentCarPos = 
    (progress >= 0.95 && dropoffLocation) ? dropoffLocation :
    (driverPosition || animatedCarPos || pickupLocation);

  const markers: MapMarker[] = [];
  if (pickupLocation) markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車' });
  if (dropoffLocation) markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車' });

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <LeafletMap
        center={currentCarPos || { lat: 24.1618, lng: 120.6469 }}
        zoom={16}
        markers={markers}
        routePath={tripPath || undefined}
        driverPosition={currentCarPos}
      />

      {/* 頂部狀態指示器 (與司機端風格一致) */}
      <Box sx={{ 
        position: 'absolute', 
        top: 16, 
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000 
      }}>
        <Paper sx={{ 
          bgcolor: 'rgba(0,0,0,0.85)', 
          color: 'white', 
          px: 2.5,
          py: 1,
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          boxShadow: 4,
          backdropFilter: 'blur(8px)',
        }}>
           <Typography variant="body2" fontWeight="bold">
             {Math.round((1 - progress) * 10)} 分鐘後到達
           </Typography>
        </Paper>
      </Box>

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
        pb: 3
      }}>
         <LinearProgress 
             variant="determinate" 
             value={progress * 100} 
             sx={{ height: 4, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#276ef1' } }} 
         />
         
         <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                   <Typography variant="h5" color="white" fontWeight="bold">行程進行中</Typography>
                   <Typography variant="body2" color="grey.400">預計 10 分鐘後到達</Typography>
                </Box>
                <Avatar sx={{ width: 56, height: 56, bgcolor: '#333' }}>
                  {order?.driverName?.[0] || 'D'}
                </Avatar>
            </Box>

            <Paper sx={{ bgcolor: '#2a2a2a', p: 2, borderRadius: 3, mb: 3, display: 'flex', justifyContent: 'space-between' }}>
               <Box>
                  <Typography variant="caption" color="grey.500">車輛</Typography>
                  <Typography variant="body1" color="white" fontWeight={500}>{order?.vehiclePlate}</Typography>
               </Box>
               <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="grey.500">司機</Typography>
                  <Typography variant="body1" color="white" fontWeight={500}>{order?.driverName}</Typography>
               </Box>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2 }}>
               <Button 
                 fullWidth 
                 variant="outlined" 
                 startIcon={<PhoneIcon />}
                 sx={{ color: 'white', borderColor: 'grey.700', py: 1.5, borderRadius: 2 }}
               >
                 聯絡
               </Button>
               <Button 
                 fullWidth 
                 variant="outlined"
                 startIcon={<MessageIcon />} 
                 sx={{ color: 'white', borderColor: 'grey.700', py: 1.5, borderRadius: 2 }}
               >
                 訊息
               </Button>

            </Box>
         </Box>
      </Box>
    </Box>
  );
}
