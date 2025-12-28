import { useEffect, useState, useMemo, useRef } from 'react';
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
  const [driverStopped, setDriverStopped] = useState(false); // 司機是否已停止
  
  // 追蹤最近的司機位置用於檢測停止
  const lastPositionsRef = useRef<MapLocation[]>([]);
  
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
  const [autoCenter, setAutoCenter] = useState(true); // 控制是否自動置中
  
  // 當用戶拖動地圖時
  const handleMapInteraction = () => {
    setAutoCenter(false);
  };
  
  // 恢復自動置中
  const handleRecenter = () => {
    setAutoCenter(true);
    setManualFitBounds(false);
  };
  
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

          // 更新司機位置 (從後端獲取)
          const orderData = o as any;
          if (orderData.driverLocation) {
            const dl = orderData.driverLocation;
            // 後端 Location: x=緯度(lat), y=經度(lng) 
            // 前端 MapLocation: lat=緯度, lng=經度
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
              if (positions.length > 3) positions.shift(); // 只保留最近 3 個
              
              // 如果有 3 個位置且變化都小於 15 公尺，認為已停止
              if (positions.length >= 3) {
                const isStationary = positions.every((pos, i) => {
                  if (i === 0) return true;
                  const prev = positions[i - 1];
                  const dist = Math.sqrt(
                    Math.pow((pos.lat - prev.lat) * 111000, 2) +
                    Math.pow((pos.lng - prev.lng) * 111000 * Math.cos(pos.lat * Math.PI / 180), 2)
                  );
                  return dist < 2.5; // 移動小於 2.5 公尺 (約 9km/h) 視為停止
                });
                setDriverStopped(isStationary);
              }
            } else {
              console.warn('[WaitingPage] 無效的司機位置:', dl, '解析結果: lat=', lat, 'lng=', lng);
            }
          } else if (o.status === 'ACCEPTED' && !driverPosition && pickupLocation) {
             // 後端沒有位置，用上車點附近作為初始估計
             // 這通常表示司機還沒開始回報位置
             const estimatedLat = pickupLocation.lat + (Math.random() - 0.5) * 0.01;
             const estimatedLng = pickupLocation.lng + (Math.random() - 0.5) * 0.01;
             setDriverPosition({ lat: estimatedLat, lng: estimatedLng });
             console.log('[WaitingPage] 使用估計位置 (後端無位置):', estimatedLat, estimatedLng);
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
    const timer = setInterval(poll, 500); // 每0.5秒更新一次
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

  // 計算兩點間的距離 (公尺) - Haversine
  const calculateDistance = (p1: MapLocation, p2: MapLocation): number => {
    const R = 6371e3; 
    const φ1 = p1.lat * Math.PI/180;
    const φ2 = p2.lat * Math.PI/180;
    const Δφ = (p2.lat-p1.lat) * Math.PI/180;
    const Δλ = (p2.lng-p1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 根據司機當前位置和上車點顯示距離估算
  // 使用 useMemo 避免不必要的重新計算
  const etaInfo = useMemo(() => {
    if (!driverPosition || !pickupLocation) {
      return { minutes: -1, distanceM: -1, isArrived: false };
    }
    
    const distM = calculateDistance(driverPosition, pickupLocation);
    
    // 如果距離太遠 (> 50km)，可能是位置錯誤
    if (distM > 50000) {
      return { minutes: -1, distanceM: distM, isArrived: false };
    }
    
    // 判斷是否已到達：距離 < 50m 或 司機已停止且距離 < 100m
    const isArrived = distM < 50 || (driverStopped && distM < 100);
    
    // 假設市區均速 30km/h = 500m/min
    // 直線距離乘以 1.3 係數來模擬實際道路距離
    const estimatedDistM = distM * 1.3;
    const mins = Math.ceil(estimatedDistM / 500);
    
    return { 
      minutes: Math.max(1, mins), 
      distanceM: distM,
      isArrived 
    };
  }, [driverPosition, pickupLocation, driverStopped]);
  
  // 到達狀態使用滯後機制 - 一旦到達就不會再變回未到達
  const [hasArrivedLock, setHasArrivedLock] = useState(false);
  
  useEffect(() => {
    if (etaInfo.isArrived && !hasArrivedLock) {
      setHasArrivedLock(true);
    }
  }, [etaInfo.isArrived, hasArrivedLock]);
  
  // 最終到達狀態
  const isDriverArrived = hasArrivedLock || etaInfo.isArrived;

  // 計算地圖邊界
  const mapBounds = useMemo(() => {
    if (manualFitBounds) return null; // 手動模式不自動縮放
    
    // ACCEPTED 狀態（司機正在前往上車點）：顯示司機位置和上車點
    if (order?.status === 'ACCEPTED' && driverPosition && pickupLocation) {
      return [driverPosition, pickupLocation] as [MapLocation, MapLocation];
    }
    
    // PENDING 狀態（等待司機接單）：只顯示上車點附近
    if (order?.status === 'PENDING' && pickupLocation) {
      return null; // 不縮放，保持當前視角
    }
    
    // ONGOING 狀態（正在前往目的地）：顯示上車點和下車點
    if (order?.status === 'ONGOING' && pickupLocation && dropoffLocation) {
      return [pickupLocation, dropoffLocation] as [MapLocation, MapLocation];
    }
    
    // 預設：如果有上下車點就顯示
    if (pickupLocation && dropoffLocation) {
      return [pickupLocation, dropoffLocation] as [MapLocation, MapLocation];
    }
    return null;
  }, [order?.status, driverPosition, pickupLocation, dropoffLocation, manualFitBounds]);

  const handleFitBounds = () => {
    setManualFitBounds(false); // 啟用自動邊界
  };

  const [routePath, setRoutePath] = useState<MapLocation[] | null>(null);

  // 路徑同步：優先使用後端回傳的司機路徑，否則嘗試本地計算
  useEffect(() => {
    // 1. 如果後端有路徑，直接使用
    if (order?.routePathJson) {
      try {
        const path = JSON.parse(order.routePathJson);
        // 格式轉換 [lat, lng] -> {lat, lng}
        const formattedPath = path.map((p: any) => ({ lat: p[0], lng: p[1] }));
        setRoutePath(formattedPath);
        return;
      } catch (e) {
        console.error('路徑解析失敗', e);
      }
    }

    // 2. 如果沒有後端路徑，但在 ACCEPTED 狀態且有位置，本地計算 (Fallback)
    if (order?.status === 'ACCEPTED' && driverPosition && pickupLocation) {
        const dx = driverPosition.lat - pickupLocation.lat;
        const dy = driverPosition.lng - pickupLocation.lng;
        // 檢查距離是否合理 (< 50km)，避免過遠請求
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
             getRouteWithCache(driverPosition, pickupLocation)
                .then(route => setRoutePath(route.coordinates))
                .catch(() => setRoutePath(null));
        } else {
             setRoutePath(null);
        }
    } else {
      setRoutePath(null);
    }
  }, [order?.routePathJson, order?.status, driverPosition, pickupLocation]);

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
        onMapClick={handleMapInteraction}
        onCenterChange={handleMapInteraction}
        disableAutoCenter={!autoCenter}
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

              {/* 顯示車種標誌 (尤其是尊榮) */}
              {order && (
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ 
                      display: 'inline-block',
                      bgcolor: order.vehicleType === 'PREMIUM' ? 'black' : '#333',
                      color: order.vehicleType === 'PREMIUM' ? '#FFD700' : 'white',
                      px: 2, 
                      py: 0.5, 
                      borderRadius: 4,
                      fontWeight: 'bold',
                      border: order.vehicleType === 'PREMIUM' ? '1px solid #FFD700' : '1px solid #555',
                      boxShadow: order.vehicleType === 'PREMIUM' ? '0 0 10px rgba(255, 215, 0, 0.3)' : 'none'
                    }}>
                        {order.vehicleType === 'STANDARD' ? '菁英優步' : 
                         order.vehicleType === 'PREMIUM' ? '👑 尊榮優步' : 
                         order.vehicleType === 'XL' ? 'UberXL' : order.vehicleType}
                    </Box>
                  </Box>
              )}

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
                  <Typography variant="caption" color="grey.500">
                    司機將在
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="white">
                     {isDriverArrived ? (
                       <span style={{ color: '#4ade80' }}>已到達</span>
                     ) : etaInfo.minutes === -1 ? (
                       <span style={{ fontSize: '1.5rem' }}>位置同步中...</span>
                     ) : (
                       <>{etaInfo.minutes} <span style={{ fontSize: '1rem' }}>分鐘後到達</span></>
                     )}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                   {/* 司機名字 - 主要資訊 */}
                   <Typography variant="h5" color="white" fontWeight="bold">
                     {order.driverName || '司機'}
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
                         {order.vehicleType === 'STANDARD' ? '菁英' : order.vehicleType === 'PREMIUM' ? '尊榮' : order.vehicleType === 'XL' ? '大型' : order.vehicleType}
                       </Typography>
                     </Box>
                     <Typography variant="caption" color="grey.400" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                       {order.vehiclePlate}
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


            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
