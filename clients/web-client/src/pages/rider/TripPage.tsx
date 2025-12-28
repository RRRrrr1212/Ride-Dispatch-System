import { useEffect, useState, useRef, useMemo } from 'react';
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
  const [driverStopped, setDriverStopped] = useState(false); // 司機是否已停止
  const lastPositionsRef = useRef<MapLocation[]>([]); // 追蹤最近位置
  
  // 地圖控制
  const [autoCenter, setAutoCenter] = useState(true);
  const [zoomToArrival, setZoomToArrival] = useState(false); // 到達時放大視角
  const handleMapInteraction = () => setAutoCenter(false);
  const handleRecenter = () => setAutoCenter(true);

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

  // 計算真實 ETA (Haversine)
  const getEtaInfo = () => {
    if (!driverPosition || !dropoffLocation) return null;

    const R = 6371e3; // metres
    const φ1 = driverPosition.lat * Math.PI/180;
    const φ2 = dropoffLocation.lat * Math.PI/180;
    const Δφ = (dropoffLocation.lat-driverPosition.lat) * Math.PI/180;
    const Δλ = (dropoffLocation.lng-driverPosition.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = R * c; // meters

    // 如果距離異常大 (> 50km)，可能是位置初始化問題
    if (dist > 50000) return null;

    // Add 1.3 multiplier to simulate real road distance
    const estimatedDist = dist * 1.3;
    const mins = Math.ceil((estimatedDist / 1000) / 30 * 60); // 30km/h
    return { mins, dist: Math.round(dist) };
  };

  const eta = getEtaInfo();
  
  // 到達時自動放大到目標位置
  useEffect(() => {
    if (eta && eta.dist < 50 && !zoomToArrival) {
      setZoomToArrival(true);
    }
  }, [eta, zoomToArrival]);

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

          // 1. 同步真實司機位置 (後端 Location: x=lat, y=lng)
          const orderData = o as any;
          if (orderData.driverLocation) {
            const dl = orderData.driverLocation;
            // 後端 Location: x=緯度(lat), y=經度(lng)
            let lat: number, lng: number;
            if (dl.lat !== undefined && dl.lng !== undefined) {
              lat = Number(dl.lat);
              lng = Number(dl.lng);
            } else {
              // x = latitude (緯度), y = longitude (經度)
              lat = Number(dl.x);
              lng = Number(dl.y);
            }
            
            // 驗證座標合理性 (台中附近: lat ~24, lng ~120)
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat < 90 && lng > 90) {
              const newPos = { lat, lng };
              setDriverPosition(newPos);
              
              // 檢測司機是否停止移動
              const positions = lastPositionsRef.current;
              positions.push(newPos);
              if (positions.length > 3) positions.shift();
              
              if (positions.length >= 3) {
                const isStationary = positions.every((pos, i) => {
                  if (i === 0) return true;
                  const prev = positions[i - 1];
                  const dist = Math.sqrt(
                    Math.pow((pos.lat - prev.lat) * 111000, 2) +
                    Math.pow((pos.lng - prev.lng) * 111000 * Math.cos(pos.lat * Math.PI / 180), 2)
                  );
                  return dist < 15; // 15 公尺
                });
                setDriverStopped(isStationary);
              }
            } else {
              console.warn('[TripPage-Rider] 無效的司機位置:', dl, '解析: lat=', lat, 'lng=', lng);
            }
          } else if (!driverPosition && pickupLocation) {
            // Fallback: 如果後端未回報位置，用上車點附近的估計位置
            setDriverPosition({
              lat: pickupLocation.lat + 0.003, // 約 333m 北
              lng: pickupLocation.lng + 0.003  // 約 300m 東
            });
          }
          
          // 2. 優先使用後端共享的路徑（司機端上傳的）
          if (orderData.routePathJson) {
             // 後端有路徑，總是使用（以保持與司機端同步）
             try {
                const parsed = JSON.parse(orderData.routePathJson) as number[][];
                const coords = parsed.map(([lat, lng]) => ({ lat, lng }));
                // 只有路徑真的不同時才更新，避免無限 re-render
                if (!tripPath || coords.length !== tripPath.length) {
                   setTripPath(coords);
                }
             } catch (e) {
                console.warn('解析路徑失敗', e);
             }
          } else if (!tripPath && pickupLocation && dropoffLocation) {
             // 後端沒有路徑且目前沒路徑，自己計算作為備案
             try {
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
         if (error.response?.status === 404 || error.response?.status === 400) {
           // 訂單不存在
           console.warn('訂單不存在，返回首頁');
           sessionStorage.removeItem('activeOrderId');
           navigate('/rider/home');
        }
      }
    };

    poll();
    const timer = setInterval(poll, 500); // 每0.5秒更新一次
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

  // 計算初始 bounds（顯示上下車兩點）
  const mapBounds = useMemo(() => {
    if (zoomToArrival) return undefined; // 到達時不使用 bounds
    const points: MapLocation[] = [];
    if (pickupLocation) points.push(pickupLocation);
    if (dropoffLocation) points.push(dropoffLocation);
    return points.length >= 2 ? points : undefined;
  }, [pickupLocation, dropoffLocation, zoomToArrival]);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <LeafletMap
        center={zoomToArrival ? (dropoffLocation || currentCarPos || { lat: 24.1618, lng: 120.6469 }) : (currentCarPos || { lat: 24.1618, lng: 120.6469 })}
        zoom={zoomToArrival ? 18 : 15}
        markers={markers}
        routePath={tripPath || undefined}
        driverPosition={currentCarPos}
        bounds={mapBounds}
        onMapClick={handleMapInteraction}
        onCenterChange={handleMapInteraction}
        disableAutoCenter={!autoCenter}
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
             {eta && eta.dist < 50 ? (
               <span style={{ color: '#4ade80' }}>✓ 已到達</span>
             ) : eta ? (
               <>{eta.dist > 1000 ? `${(eta.dist/1000).toFixed(1)} km` : `${eta.dist} m`} • {eta.mins} 分鐘</>
             ) : (
               '計算中...'
             )}
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
            {/* 頂部：ETA + 司機資訊 (與 WaitingPage 相同概念) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="caption" color="grey.500">
                  {eta && eta.dist < 50 ? '行程狀態' : '預計還有'}
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="white">
                  {eta && eta.dist < 50 ? (
                    <span style={{ color: '#4ade80' }}>已到達</span>
                  ) : eta ? (
                    <>{eta.mins} <span style={{ fontSize: '1rem' }}>分鐘</span></>
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>計算中...</span>
                  )}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                {/* 司機名字 - 主要資訊 */}
                <Typography variant="h5" color="white" fontWeight="bold">
                  {order?.driverName || '司機'}
                </Typography>
                {/* 車種 + 車牌 - 次要資訊 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: 1,
                  mt: 0.5 
                }}>
                  <Box sx={{ 
                    bgcolor: '#333', 
                    px: 1, 
                    py: 0.25, 
                    borderRadius: 1,
                  }}>
                    <Typography variant="caption" color="grey.300">
                      {order?.vehicleType === 'STANDARD' ? '菁英' : order?.vehicleType === 'PREMIUM' ? '尊榮' : order?.vehicleType === 'XL' ? '大型' : order?.vehicleType}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="grey.400" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                    {order?.vehiclePlate}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 詳細資訊面板 (與 WaitingPage 相同風格) */}
            <Paper sx={{ bgcolor: '#2a2a2a', p: 2, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', mt: 0.8, mr: 2, flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" color="grey.500" display="block">上車</Typography>
                  <Typography variant="body2" color="white" fontWeight={500}>
                    {sessionStorage.getItem('currentOrderPickupAddress') || '上車地點'}
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
         </Box>
      </Box>
    </Box>
  );
}
