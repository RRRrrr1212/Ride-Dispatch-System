import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { 
  CenterFocusStrong as FitBoundsIcon,
  Home as HomeIcon,
  Logout as LogoutIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { orderApi } from '../../api/order.api';
import { driverApi } from '../../api/driver.api';
import { useDriverStore } from '../../stores/driver.store';
import { getRouteWithCache } from '../../api/routing.api';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
import { useAnimatedPosition } from '../../hooks/useAnimatedPosition';
import type { Order } from '../../types';
import { AppMenu, type AppMenuItem } from '../../components/common/AppMenu';

export function TripPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { driver } = useDriverStore();
  
  const [order, setOrder] = useState<Order | null>(null);

  const handleLogout = async () => {
    if (window.confirm('確定要登出並重置狀態嗎？')) {
        sessionStorage.setItem('isResetting', 'true');
        try {
            if (driver) await driverApi.goOffline(driver.driverId);
        } catch (e) { console.error(e); }

        // 強力清除所有狀態
        localStorage.clear();
        sessionStorage.clear();
        
        navigate('/login');
        window.location.reload();
    }
  };

  const handleGoHome = () => {
     // 如果行程還沒完成，提示此操作不會取消行程
     if (order?.status === 'ACCEPTED' || order?.status === 'ONGOING') {
        alert('行程進行中，無法直接回到首頁。請先完成行程或登出重置。');
        return;
     }
     navigate('/driver/dashboard');
  };

  // 定義選單項目
  const menuItems: AppMenuItem[] = [
    {
      label: '首頁',
      icon: <HomeIcon fontSize="small" />,
      onClick: handleGoHome,
    },
    {
      label: '收入',
      icon: <AttachMoneyIcon fontSize="small" />,
      onClick: () => {},
    },
    {
      label: '登出',
      icon: <LogoutIcon fontSize="small" />,
      onClick: handleLogout,
      color: '#ff5252',
      dividerBefore: true,
    },
  ];
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 地圖相關狀態
  const [pickupLocation, setPickupLocation] = useState<MapLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<MapLocation | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [dropoffAddress, setDropoffAddress] = useState<string>('');
  
  // 路徑與動畫狀態
  const [currentPath, setCurrentPath] = useState<MapLocation[] | null>(null);
  const [driverInitialLocation] = useState<MapLocation>({ lat: 24.16, lng: 120.64 });
  const [simulationStartIndex, setSimulationStartIndex] = useState(0); 
  const [manualFitBounds, setManualFitBounds] = useState(false); // 控制是否只使用手動縮放

  const hasStartedToPickupRef = useRef(false);
  const hasStartedToDropoffRef = useRef(false);

  // 計算恢復的起始點
  useEffect(() => {
    if (!orderId) return;
    const key = `trip_sim_start_${orderId}`;
    const stored = localStorage.getItem(key);
    
    // 如果有儲存的開始時間，計算經過秒數 -> 推算 index
    if (stored) {
      const startTime = parseInt(stored, 10);
      const elapsedSec = (Date.now() - startTime) / 1000;
      // 速度為 1 點/秒 (根據 useAnimatedPosition 設定)
      const estimatedIndex = Math.floor(elapsedSec * 1); 
      setSimulationStartIndex(estimatedIndex);
    } else {
      localStorage.setItem(key, Date.now().toString());
    }
  }, [orderId]);

  // 使用動畫 Hook - 降低速度 (模擬 30km/h 移動)
  const { position: animatedDriverPos } = useAnimatedPosition(
    currentPath,
    {
      speed: 1, // 降低速度，確保移動過程清晰可見 (大於 15s)
      enabled: true,
      initialIndex: simulationStartIndex, // 傳入初始索引
    }
  );

  // 簡單的距離計算 (Haversine)
  const getDistance = (p1: MapLocation, p2: MapLocation) => {
    const R = 6371e3; // metres
    const φ1 = p1.lat * Math.PI/180;
    const φ2 = p2.lat * Math.PI/180;
    const Δφ = (p2.lat-p1.lat) * Math.PI/180;
    const Δλ = (p2.lng-p1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in meters
  }

  // 計算剩餘距離與時間
  const [etaInfo, setEtaInfo] = useState({ distance: 0, minutes: 0 });
  const [canInteract, setCanInteract] = useState(false); // 是否在可操作範圍內 (150m)

  useEffect(() => {
    if (!animatedDriverPos) return;

    let target: MapLocation | null = null;
    if (order?.status === 'ACCEPTED') target = pickupLocation;
    else if (order?.status === 'ONGOING') target = dropoffLocation;

    if (target) {
      const dist = getDistance(animatedDriverPos, target);
      setEtaInfo({
        distance: Math.round(dist),
        minutes: Math.ceil((dist / 1000) / 30 * 60) // 假設時速 30km/h
      });
      setCanInteract(dist <= 150); 
    }
  }, [animatedDriverPos, order?.status, pickupLocation, dropoffLocation]);

  // 定期回報位置給伺服器 (每 2 秒)
  useEffect(() => {
    if (!driver || !animatedDriverPos) return;
    
    // 簡單限流
    const timer = setInterval(() => {
         driverApi.updateLocation(driver.driverId, animatedDriverPos.lat, animatedDriverPos.lng)
           .catch(err => console.error('位置回報失敗', err));
    }, 2000);

    return () => clearInterval(timer);
  }, [driver, animatedDriverPos]);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          const fetchedOrder = response.data.data;
          setOrder(fetchedOrder); // 這裡只要 setOrder，剩下的依賴 useEffect 處理

           const parseLocation = (loc: any): MapLocation | null => {
             if (typeof loc === 'string') {
                const parts = loc.split(',');
                if (parts.length === 2) {
                   const lat = parseFloat(parts[0]);
                   const lng = parseFloat(parts[1]);
                   if (!isNaN(lat) && !isNaN(lng)) {
                      return { lat, lng };
                   }
                }
             } else if (typeof loc === 'object' && loc !== null) {
                // 嘗試讀取可能的屬性名 (後端 Location 類: x=緯度, y=經度)
                const lat = Number(loc.lat ?? loc.latitude ?? loc.x);
                const lng = Number(loc.lng ?? loc.longitude ?? loc.lon ?? loc.y);
                if (!isNaN(lat) && !isNaN(lng)) {
                   return { lat, lng };
                }
             }
             return null;
           };

           // 解析位置
           if (fetchedOrder.pickupLocation) {
             const pLoc = parseLocation(fetchedOrder.pickupLocation);
             if (pLoc) {
               setPickupLocation(pLoc);
               reverseGeocodeWithCache(pLoc.lat, pLoc.lng).then(setPickupAddress);
             }
           }
           if (fetchedOrder.dropoffLocation) {
             const dLoc = parseLocation(fetchedOrder.dropoffLocation);
             if (dLoc) {
               setDropoffLocation(dLoc);
               reverseGeocodeWithCache(dLoc.lat, dLoc.lng).then(setDropoffAddress);
             }
           }
        }
      } catch (error: any) {
        console.error('Failed to fetch order:', error);
        // 如果訂單不存在（後端重啟等原因），清除狀態並返回 Dashboard
        if (error.response?.status === 400 || error.response?.status === 404) {
          sessionStorage.removeItem('driverActiveOrderId');
          navigate('/driver/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
//...

    fetchOrder();
    const timer = setInterval(fetchOrder, 3000);
    return () => clearInterval(timer);
  }, [orderId]);

  // 同步 driverActiveOrderId 到 SessionStorage
  useEffect(() => {
    if (orderId && order && (order.status === 'ACCEPTED' || order.status === 'ONGOING')) {
       sessionStorage.setItem('driverActiveOrderId', orderId);
    }
  }, [orderId, order]);

  // 當狀態變為 ACCEPTED 時，計算路徑前往乘客
  useEffect(() => {
    if (order?.status === 'ACCEPTED' && pickupLocation && !hasStartedToPickupRef.current) {
      hasStartedToPickupRef.current = true;
      // 假設司機從初始點出發
      getRouteWithCache(driverInitialLocation, pickupLocation)
        .then(route => {
          setCurrentPath(route.coordinates);
        })
        .catch(err => console.error('Path error', err));
    }
  }, [order?.status, pickupLocation, driverInitialLocation]);

  // 當狀態變為 ONGOING 時，計算路徑前往目的地
  useEffect(() => {
    if (order?.status === 'ONGOING' && pickupLocation && dropoffLocation && !hasStartedToDropoffRef.current) {
        hasStartedToDropoffRef.current = true;
        
        // 重置動畫計時器
        const key = `trip_sim_start_${orderId}`;
        localStorage.setItem(key, Date.now().toString());
        setSimulationStartIndex(0);

        getRouteWithCache(pickupLocation, dropoffLocation)
          .then(route => {
             setCurrentPath(route.coordinates);
          })
          .catch(err => console.error('Path error', err));
    }
  }, [order?.status, pickupLocation, dropoffLocation]); // removed orderId

  const handleStart = async () => {
    if (!orderId || !driver) return;

    setActionLoading(true);
    try {
      const response = await orderApi.start(orderId, driver.driverId);
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
        // 清除舊的動畫狀態，準備下一段
        const key = `trip_sim_start_${orderId}`;
        localStorage.setItem(key, Date.now().toString());
        // 重新整理頁面以重置狀態
        window.location.reload(); 
      }
    } catch (error) {
      alert('開始行程失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!orderId || !driver) return;

    setActionLoading(true);
    try {
      // 先將司機位置更新到下車點（確保位置正確）
      if (dropoffLocation) {
        await driverApi.updateLocation(driver.driverId, dropoffLocation.lat, dropoffLocation.lng)
          .catch(err => console.warn('更新位置失敗', err));
      }
      
      const response = await orderApi.complete(orderId, driver.driverId);
      if (response.data.success) {
        alert('行程完成！');
        localStorage.removeItem(`trip_sim_start_${orderId}`);
        sessionStorage.removeItem('driverActiveOrderId');
        navigate('/driver/dashboard');
      }
    } catch (error) {
      alert('完成行程失敗');
    } finally {
      setActionLoading(false);
    }
  };

  // 建立地圖標記
  const markers: MapMarker[] = [];
  if (pickupLocation && typeof pickupLocation.lat === 'number' && typeof pickupLocation.lng === 'number') {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車' });
  }
  if (dropoffLocation && typeof dropoffLocation.lat === 'number' && typeof dropoffLocation.lng === 'number') {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車' });
  }

  // 地圖中心跟隨司機
  const mapCenter = animatedDriverPos || driverInitialLocation;

  // 計算地圖邊界
  const mapBounds = useMemo(() => {
    // 如果手動控制縮放，就不回傳邊界，讓地圖保持當前視角
    if (manualFitBounds) return null;

    // 收集所有關鍵點：司機位置、上車點、下車點
    const points: MapLocation[] = [];
    
    // 輔助檢查函數
    const isValid = (loc: MapLocation | null) => loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';

    const driverPos = animatedDriverPos || driverInitialLocation;
    if (isValid(driverPos)) points.push(driverPos!);
    if (isValid(pickupLocation)) points.push(pickupLocation!);
    if (isValid(dropoffLocation)) points.push(dropoffLocation!);

    // 只要有兩個以上的點，就進行自動縮放
    if (points.length >= 2) {
      return points;
    }

    return null;
  }, [pickupLocation, dropoffLocation, animatedDriverPos, driverInitialLocation, manualFitBounds]);

  const handleFitBounds = () => {
    setManualFitBounds(false); // 啟用自動邊界 (LeafletMap 會偵測到 bounds 變化或重渲染而 fit)
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* 全屏地圖 */}
      <LeafletMap
        center={mapCenter}
        zoom={16}
        markers={markers}
        routePath={currentPath || undefined}
        driverPosition={animatedDriverPos}
        bounds={mapBounds}
        bottomOffset={300}        
        onCenterChange={() => {
           // 當用戶移動地圖時 (透過 onCenterChange)，可以考慮切換到手動模式，但需避免誤觸
           // 這裡暫時依賴 Fit Bounds 按鈕來控制
        }}
        // 加監聽器切換手動模式
        onMapClick={() => setManualFitBounds(true)}
      />

      {/* 頂部左側選單按鈕 - 使用共用的 AppMenu */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1200 }}>
        <AppMenu
          userName={driver?.name || driver?.driverId || '司機'}
          userRating="5.0 ★"
          menuItems={menuItems}
        />
      </Box>
      
      {/* 右側地圖控制按鈕 (全覽視角) */}
      <Box sx={{
        position: 'absolute',
        right: 16,
        bottom: 350, // 位於底部面板上方
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
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

      {/* 頂部狀態提示 (ETA) - 黑底白字 */}
      <Box sx={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'auto',
      }}>
        <Box sx={{
          bgcolor: 'rgba(0,0,0,0.9)', 
          color: '#fff', 
          px: 2.5,
          py: 1,
          borderRadius: 20,
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
           <Typography variant="body2" fontWeight="bold">
              {etaInfo.distance > 1000 ? `${(etaInfo.distance/1000).toFixed(1)} km` : `${etaInfo.distance} m`} • {etaInfo.minutes} 分鐘
           </Typography>
        </Box>
      </Box>

      {/* 底部行程資訊面板 */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#1a1a1a', 
        borderRadius: '24px 24px 0 0',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '50%', // 稍微加高
        pb: 4 // 底部加點 padding 讓按鈕不要貼底
      }}>
        {/* 拖曳指示條 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
           <Box sx={{ width: 40, height: 4, bgcolor: 'grey.600', borderRadius: 2 }} />
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3, pt: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
            <Typography variant="h6" color="white" fontWeight="bold">
              {order?.status === 'ACCEPTED' ? '前往乘客' : '前往目的地'}
            </Typography>
            
            <Box sx={{ 
              bgcolor: 'white', 
              color: 'black', 
              px: 1.5, 
              py: 0.5, 
              borderRadius: 1,
              fontWeight: 'bold',
              fontSize: '0.875rem'
            }}>
              {order?.status === 'ACCEPTED' ? '已接單' : '行程中'}
            </Box>
          </Box>

          {/* 乘客資訊 */}
          <Card sx={{ mb: 2, bgcolor: '#2a2a2a', color: 'white' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
               <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h6" color="white">{order?.passengerId?.charAt(0) || 'U'}</Typography>
               </Box>
               <Box>
                 <Typography variant="subtitle1" fontWeight="bold">{order?.passengerId}</Typography>
                 <Typography variant="caption" color="grey.400">乘客</Typography>
               </Box>
            </CardContent>
          </Card>

          {/* 路線 */}
          <Box sx={{ mb: 4 }}> {/* 增加下方 margin 避免擠壓 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mr: 2, mt: 0.5, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" color="grey.400">上車</Typography>
                <Typography color="white" fontWeight={500}>
                  {pickupAddress || (pickupLocation ? `(${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)})` : '未知')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', mr: 2, mt: 0.5, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" color="grey.400">下車</Typography>
                <Typography color="white" fontWeight={500}>
                  {dropoffAddress || (dropoffLocation ? `(${dropoffLocation.lat.toFixed(4)}, ${dropoffLocation.lng.toFixed(4)})` : '未知')}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 操作按鈕 - 樣式統一 (Pill shape, Smaller) */}
          <Box sx={{ mt: 'auto', pb: 2 }}>
            {order?.status === 'ACCEPTED' && (
              <Button
                fullWidth
                variant="contained"
                onClick={handleStart}
                disabled={actionLoading || !canInteract}
                sx={{ 
                  py: 1, // 縮小高度
                  fontSize: '1rem', 
                  fontWeight: 'bold',
                  borderRadius: 8, // 圓角
                  bgcolor: canInteract ? 'white' : 'grey.600',
                  color: canInteract ? 'black' : 'white',
                  textTransform: 'none', // 避免全大寫
                  boxShadow: 2,
                  '&:hover': {
                    bgcolor: canInteract ? '#e0e0e0' : 'grey.600'
                  }
                }}
              >
                {actionLoading 
                  ? '處理中...' 
                  : canInteract 
                    ? '已接到乘客 - 開始行程' 
                    : `抵達後可點擊 (剩 ${etaInfo.distance > 1000 ? `${(etaInfo.distance/1000).toFixed(1)} km` : `${etaInfo.distance} m`})`
                }
              </Button>
            )}

            {order?.status === 'ONGOING' && (
              <Button
                fullWidth
                variant="contained"
                onClick={handleComplete}
                disabled={actionLoading || !canInteract}
                sx={{ 
                  py: 1, 
                  fontSize: '1rem', 
                  fontWeight: 'bold',
                  borderRadius: 8,
                  bgcolor: canInteract ? 'white' : 'grey.600',
                   color: canInteract ? 'black' : 'white',
                   textTransform: 'none',
                   boxShadow: 2,
                   '&:hover': {
                    bgcolor: canInteract ? '#e0e0e0' : 'grey.600'
                  }
                }}
              >
                {actionLoading 
                  ? '處理中...' 
                  : canInteract 
                    ? '已到達 - 完成行程' 
                    : `抵達後可點擊 (剩 ${etaInfo.distance > 1000 ? `${(etaInfo.distance/1000).toFixed(1)} km` : `${etaInfo.distance} m`})`
                }
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
