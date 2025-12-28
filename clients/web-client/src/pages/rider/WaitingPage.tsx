import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  LocationOn as PickupIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  EmojiTransportation as CarIcon,
  CenterFocusStrong as FitBoundsIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { orderApi } from '../../api/order.api';
import { useAuthStore } from '../../stores/auth.store';
import { getRouteWithCache } from '../../api/routing.api';
import type { Order } from '../../types';

export function WaitingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [waitingTime, setWaitingTime] = useState(0); 
  const [driverPosition, setDriverPosition] = useState<MapLocation | null>(null); // 真實司機位置
  
  // 地圖相關狀態 (從 Session 恢復)
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

  const [manualFitBounds, setManualFitBounds] = useState(false); // 控制是否只使用手動縮放
  
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

  // Polling 訂單狀態與司機位置
  useEffect(() => {
    if (!orderId) return;

    // 紀錄當前訂單 ID，防止刷新丟失上下文
    sessionStorage.setItem('activeOrderId', orderId);

    const poll = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          const o = response.data.data;
          setOrder(o);

          // 更新司機位置 (如果後端有回傳)
          // 後端 Location 格式可能是 {x, y} (x=緯度, y=經度) 或 {lat, lng}
          const orderData = o as any;
          if (orderData.driverLocation) {
            const dl = orderData.driverLocation;
            const lat = Number(dl.lat ?? dl.x);
            const lng = Number(dl.lng ?? dl.y);
            if (!isNaN(lat) && !isNaN(lng)) {
              setDriverPosition({ lat, lng });
            }
          } else if (o.status === 'ACCEPTED' && !driverPosition && pickupLocation) {
             // 如果還沒有真實位置，可以用一個附近的假位置初始化
             setDriverPosition({
               lat: pickupLocation.lat + 0.005,
               lng: pickupLocation.lng + 0.005
             });
          }

          // 狀態導航
          if (o.status === 'ONGOING') {
             // 確保 TripPage 也能讀到正確資訊
             navigate(`/rider/trip/${orderId}`);
          } else if (o.status === 'COMPLETED') {
             navigate(`/rider/completed/${orderId}`);
          } else if (o.status === 'CANCELLED') {
             navigate('/rider/home');
          }
        }
      } catch (error: any) {
        console.error('查詢訂單失敗:', error);
        // 如果是 404 (找不到訂單) 或 400 (無效請求，可能也代表訂單異常)，清除狀態並回到首頁
        if (error.response?.status === 404 || error.response?.status === 400) {
           sessionStorage.removeItem('activeOrderId');
           navigate('/rider/home'); 
        }
      };
    };

    poll(); // 立即執行一次
    const timer = setInterval(poll, 2000); //每 2 秒更新一次
    return () => clearInterval(timer);
  }, [orderId, navigate, pickupLocation, driverPosition]);

  const handleCancel = async () => {
    if (!orderId || !user) return;
    try {
      await orderApi.cancel(orderId, user.id, '乘客取消');
      sessionStorage.removeItem('activeOrderId');
      navigate('/rider/home');
    } catch (error: any) {
      console.error('取消失敗:', error);
      // 如果訂單已經不存在，也視為取消成功/結束，回到首頁
      if (error.response?.status === 404 || error.response?.status === 400) {
        sessionStorage.removeItem('activeOrderId');
        navigate('/rider/home');
      }
    }
  };

  const markers: MapMarker[] = [];
  if (pickupLocation) {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車點' });
  }
  if (dropoffLocation) {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車點' });
  }

  // 根據司機位置和上車點顯示距離估算
  // 這裡簡單計算直線距離
  const getSimulatedArrivalMinutes = () => {
    if (driverPosition && pickupLocation) {
      const dx = driverPosition.lat - pickupLocation.lat;
      const dy = driverPosition.lng - pickupLocation.lng;
      const dist = Math.sqrt(dx*dx + dy*dy) * 111; // km
      return Math.ceil(dist / 0.5 * 60); // 假設時速 30km/h => 0.5km/min
    }
    return 3;
  }

  // 計算地圖邊界
  const mapBounds = useMemo(() => {
    if (manualFitBounds) return null; // 手動模式不自動縮放

    if (pickupLocation && dropoffLocation) {
      return [pickupLocation, dropoffLocation] as [MapLocation, MapLocation];
    }
    return null;
  }, [pickupLocation, dropoffLocation, manualFitBounds]);

  const handleFitBounds = () => {
    setManualFitBounds(false); // 啟用自動邊界
  };

  const [routePath, setRoutePath] = useState<MapLocation[] | null>(null);

  // 當司機已接單，規劃 司機 -> 上車點 的路徑
  useEffect(() => {
    if (order?.status === 'ACCEPTED' && driverPosition && pickupLocation) {
      getRouteWithCache(driverPosition, pickupLocation)
        .then(route => setRoutePath(route.coordinates))
        .catch(console.error);
    } else {
      setRoutePath(null);
    }
  }, [order?.status, driverPosition, pickupLocation]);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* 全屏地圖 */}
      <LeafletMap
        center={pickupLocation || { lat: 24.1618, lng: 120.6469 }}
        zoom={15}
        markers={markers}
        driverPosition={driverPosition || undefined}
        routePath={routePath || undefined}
        bounds={mapBounds}
        bottomOffset={280}
        onMapClick={() => setManualFitBounds(true)}
      />

       {/* 右側地圖控制按鈕 (全覽視角) */}
       <Box sx={{
        position: 'absolute',
        right: 16,
        bottom: 350, 
        zIndex: 1000,
      }}>
         <IconButton 
           onClick={handleFitBounds}
           sx={{ 
             bgcolor: 'white', 
             color: 'black',
             boxShadow: 3,
             '&:hover': { bgcolor: '#f5f5f5' }
           }}
           size="large"
         >
           <FitBoundsIcon />
         </IconButton>
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
        transition: 'height 0.3s ease',
        overflow: 'hidden',
      }}>
        {/* 進度條 (僅在已接單時顯示) */}
        {order?.status === 'ACCEPTED' && (
           <LinearProgress 
             sx={{ height: 4, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#276ef1' } }} 
           />
        )}

        <Box sx={{ p: 3 }}>
          {/* PENDING: 尋找司機中 */}
          {(!order || order.status === 'PENDING') && (
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
                  <Typography variant="h3" fontWeight="bold" color="white">
                     {getSimulatedArrivalMinutes()} <span style={{ fontSize: '1rem' }}>分鐘後到達</span>
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                   <Typography variant="h5" color="white" fontWeight="bold">
                     {order.vehiclePlate}
                   </Typography>
                    <Box sx={{ 
                      display: 'inline-block', 
                      bgcolor: '#333', 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 1, 
                      mt: 0.5 
                    }}>
                      <Typography variant="caption" color="grey.300">
                        {order.vehicleType === 'STANDARD' ? '菁英優步' : order.vehicleType} • ⭐ 4.9
                      </Typography>
                    </Box>
                </Box>
              </Box>

              {/* 詳細資訊面板 */}
              <Paper sx={{ bgcolor: '#2a2a2a', p: 2, borderRadius: 3, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                     <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', mt: 0.8, mr: 2, flexShrink: 0 }} />
                     <Box>
                        <Typography variant="caption" color="grey.500" display="block">上車</Typography>
                        <Typography variant="body2" color="white" fontWeight={500}>
                          {pickupAddress || '上車地點'}
                        </Typography>
                     </Box>
                  </Box>
                   <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                     <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', mt: 0.8, mr: 2, flexShrink: 0 }} />
                     <Box>
                        <Typography variant="caption" color="grey.500" display="block">下車</Typography>
                        <Typography variant="body2" color="white" fontWeight={500}>
                          {sessionStorage.getItem('currentOrderDropoffAddress') || '下車地點'}
                        </Typography>
                     </Box>
                  </Box>
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
