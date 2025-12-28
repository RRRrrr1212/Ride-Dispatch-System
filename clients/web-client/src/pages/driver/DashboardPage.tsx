import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Skeleton,
  Chip,
  Divider,
  Avatar,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { useDriverStore } from '../../stores/driver.store';
import { adminApi } from '../../api/admin.api';
import { orderApi } from '../../api/order.api';
import { driverApi } from '../../api/driver.api';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
import type { Order } from '../../types';

// 從 location 物件取得座標
function getCoordinates(location: any): { lat: number; lng: number } | null {
  if (!location) return null;
  
  const rawLat = location.x ?? location.lat ?? location.latitude;
  const rawLng = location.y ?? location.lng ?? location.longitude;
  
  if (rawLat === undefined || rawLng === undefined) return null;
  
  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (isNaN(lat) || isNaN(lng)) return null;
  
  return { lat, lng };
}

// 地址顯示組件
function AddressLine({ location, type, label }: { location: any; type: 'pickup' | 'dropoff'; label: string }) {
  const [address, setAddress] = useState<string>('載入中...');
  const [loading, setLoading] = useState(true);

  const coords = getCoordinates(location);
  const coordKey = coords ? `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}` : null;

  useEffect(() => {
    let cancelled = false;
    
    const fetchAddress = async () => {
      if (!coordKey || !coords) {
        setAddress('未知地點');
        setLoading(false);
        return;
      }

      try {
        const addr = await reverseGeocodeWithCache(coords.lat, coords.lng);
        if (!cancelled) setAddress(addr);
      } catch {
        if (!cancelled) setAddress(`(${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAddress();
    return () => { cancelled = true; };
  }, [coordKey]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        pt: 0.5,
      }}>
        {type === 'pickup' ? (
          <LocationIcon sx={{ color: 'success.main', fontSize: 20 }} />
        ) : (
          <FlagIcon sx={{ color: 'error.main', fontSize: 20 }} />
        )}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width="80%" />
        ) : (
          <Typography variant="body2" fontWeight={500}>
            {address}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// 訂單卡片組件
function OrderCard({ order, onAccept, onDecline, accepting }: { 
  order: Order; 
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  accepting: string | null;
}) {
  const isAccepting = accepting === order.orderId;

  return (
    <Card 
      sx={{ 
        mb: 2, 
        borderRadius: 3,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'visible',
        bgcolor: '#2a2a2a', // 深色卡片背景
        color: 'white',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* 頂部：乘客資訊和車資 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light' }}>
              <PersonIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {order.passengerId || '乘客'}
              </Typography>
              <Typography variant="caption" color="grey.400">
                {order.vehicleType === 'STANDARD' ? '菁英優步' : order.vehicleType || '菁英優步'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" color="success.main" fontWeight="bold">
              ${Math.round(order.estimatedFare || order.fare || 70)}
            </Typography>
            <Chip 
              label="等待中" 
              size="small" 
              color="warning"
              sx={{ height: 20, fontSize: 11 }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'grey.700' }} />

        {/* 路線資訊 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          <AddressLine location={order.pickupLocation} type="pickup" label="上車地點" />
          
          {/* 連接線 */}
          <Box sx={{ ml: 1.2, borderLeft: '2px dashed', borderColor: 'grey.700', height: 12 }} />
          
          <AddressLine location={order.dropoffLocation} type="dropoff" label="下車地點" />
        </Box>

        <Divider sx={{ my: 2, borderColor: 'grey.700' }} />

        {/* 操作按鈕 */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => onDecline(order.orderId)}
            disabled={!!accepting}
            sx={{ 
              flex: 1,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 'bold',
              fontSize: 16,
              borderColor: 'grey.600',
              color: 'grey.300',
              '&:hover': {
                borderColor: 'grey.400',
                bgcolor: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            拒絕
          </Button>
          <Button
            variant="contained"
            onClick={() => onAccept(order.orderId)}
            disabled={isAccepting || !!accepting}
            sx={{ 
              flex: 2,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 'bold',
              fontSize: 16,
            }}
            startIcon={isAccepting ? <CircularProgress size={20} color="inherit" /> : <CarIcon />}
          >
            {isAccepting ? '接單中...' : '接受訂單'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { driver, isOnline } = useDriverStore();

  const [offers, setOffers] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const ignoredOrdersRef = useState<Set<string>>(new Set())[0]; // 使用 Set 記錄已忽略的訂單
  
  // 使用真實位置初始化，預設為台中市政府
  const [driverLocation, setDriverLocation] = useState<MapLocation>({
    lat: 24.1618,
    lng: 120.6469,
  });

  // 獲取並持續追蹤當前位置
  useEffect(() => {
    if (!navigator.geolocation) return;

    // 立即獲取一次
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ lat: latitude, lng: longitude });
        // 如果已上線，立即同步到後端 (雖然下面 watch 也會觸發，但為了保險)
        if (isOnline && driver) {
             driverApi.updateLocation(driver.driverId, longitude, latitude).catch(console.error);
        }
      },
      console.error
    );

    // 持續追蹤
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ lat: latitude, lng: longitude });
        
        // 如果司機在線上，上傳位置到後端
        if (isOnline && driver) {
           // 注意：頻率可能很高，實務上應該 throttle，但 demo 版先這樣確保即時性
           // 為了避免過度請求，可以使用簡單的 throttle 或依賴 watchPosition 的觸發頻率（瀏覽器通常會控制）
           // 這裡我們加一個簡單的檢查，距離上次更新超過 5 秒再上傳，或者直接上傳如果流量允許
           // 考慮 demo 效果，我們每 3 秒上傳一次的邏輯放在另一個 effect 比較好，
           // 這裡先單純更新本地 state。
        }
      },
      console.error,
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, driver]);

  // 定期上傳位置到後端 (每 5 秒)
  useEffect(() => {
     if (!isOnline || !driver) return;

     const interval = setInterval(() => {
        // 使用當前的 driverLocation 上傳
        // 由於 lat/lng 是 number，直接傳
        // 注意 driverApi.updateLocation 參數順序是 (id, x/lng, y/lat)
        driverApi.updateLocation(driver.driverId, driverLocation.lng, driverLocation.lat)
          .catch((e: any) => console.error('位置上傳失敗', e));
     }, 5000);

     return () => clearInterval(interval);
  }, [isOnline, driver, driverLocation]);

  // 檢查是否有進行中的訂單 (防止刷新或誤觸首頁導致狀態丟失)
  useEffect(() => {
    const checkActiveOrder = async () => {
      // 增加一個簡單的鎖，如果剛登出或剛清除狀態，不要立刻跳轉
      if (sessionStorage.getItem('isResetting')) return;

      // 1. 檢查 sessionStorage (最快)
      const storedOrderId = sessionStorage.getItem('driverActiveOrderId');
      if (storedOrderId) {
         navigate(`/driver/trip/${storedOrderId}`);
         return;
      }

      // 2. API 檢查 (略過，避免在狀態卡住時無限迴圈，先依靠 session)
      // 如果需要更嚴格的檢查，可以在這裡加回，但目前先暫停，讓使用者有機會操作 Menu
    };

    checkActiveOrder();
  }, [navigate, driver]);



  // 拒絕訂單
  const handleDecline = (orderId: string) => {
    if (window.confirm('確定要拒絕此訂單嗎？')) {
      ignoredOrdersRef.add(orderId);
      setOffers(prev => prev.filter(o => o.orderId !== orderId));
    }
  };

  // 接單處理
  const handleAcceptOrder = async (orderId: string) => {
    if (!driver) return;

    setAccepting(orderId);
    try {
      const response = await orderApi.accept(orderId, driver.driverId);
      if (response.data.success) {
        navigate(`/driver/trip/${orderId}`);
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('此訂單已被其他司機接受');
        // 刷新訂單列表
        setOffers(prev => prev.filter(o => o.orderId !== orderId));
      } else {
        alert('接單失敗：' + (error.response?.data?.error?.message || error.message));
      }
    } finally {
      setAccepting(null);
    }
  };

  useEffect(() => {
    if (!driver || !isOnline) {
      setOffers([]);
      return;
    }

    const fetchOffers = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const response = await adminApi.getOrders({ status: 'PENDING' });
        if (response.data.success && response.data.data) {
          const allOrders = response.data.data.orders || [];
          // 過濾掉已忽略的訂單
          const filteredOrders = allOrders.filter((o: Order) => !ignoredOrdersRef.has(o.orderId));
          setOffers(filteredOrders);
        }
      } catch (err: any) {
        console.error('取得訂單失敗:', err);
        // 只有在持續失敗且沒有舊資料時才顯示錯誤，避免閃爍
        if (offers.length === 0) {
           setError('無法取得訂單列表');
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    fetchOffers(true);
    const timer = setInterval(() => fetchOffers(false), 5000);
    return () => clearInterval(timer);
  }, [driver, isOnline]);

  // 標記與邊界計算
  const { markers, mapBounds } = useMemo(() => {
    const newMarkers: MapMarker[] = [];
    const points: MapLocation[] = [];

    offers.forEach((order) => {
      // 上車點
      const pickupCoords = getCoordinates(order.pickupLocation);
      if (pickupCoords) {
        newMarkers.push({
          id: `${order.orderId}-pickup`,
          position: pickupCoords,
          type: 'pickup',
          label: `$${Math.round(order.estimatedFare || 70)}`,
        });
        points.push(pickupCoords);
      }

      // 下車點
      const dropoffCoords = getCoordinates(order.dropoffLocation);
      if (dropoffCoords) {
        newMarkers.push({
          id: `${order.orderId}-dropoff`,
          position: dropoffCoords,
          type: 'dropoff',
        });
        points.push(dropoffCoords);
      }
    });
    
    // 將司機位置也加入考量，確保視野包含自己
    if (driverLocation) {
        points.push(driverLocation);
    }
    
    // 如果有點數據且大於等於 2 個（例如司機+上車點），回傳所有點讓地圖自動縮放
    let bounds: MapLocation[] | null = null;
    if (points.length >= 2) {
       bounds = points;
    }

    return { markers: newMarkers, mapBounds: bounds };
  }, [offers, driverLocation]);

  if (!isOnline) {
    return (
      <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
        {/* 全屏地圖 */}
        <LeafletMap
          center={driverLocation}
          zoom={13}
          markers={[]}
          driverPosition={driverLocation}
          bottomOffset={200}
        />
        
        {/* 離線提示 - 底部面板 */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: '#1a1a1a',
          borderRadius: '24px 24px 0 0',
          p: 3,
          pb: 6, // 增加底部 padding 避免被裝置 Home Indicator 遮擋
          minHeight: 180, // 增加最小高度
          zIndex: 1000,
        }}>
          {/* 拖曳指示條 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ width: 40, height: 4, bgcolor: 'grey.600', borderRadius: 2 }} />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: 'grey.700' }}>
              {driver?.name?.charAt(0) || '司'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" color="#fff">{driver?.name || '未登入'}</Typography>
              <Typography variant="body2" color="grey.400">
                {driver?.vehiclePlate} • {driver?.phone}
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" color="grey.400" sx={{ textAlign: 'center', mb: 1 }}>
            點擊右上角開關開始上線接單
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* 全屏地圖 */}
      <LeafletMap
        center={driverLocation}
        zoom={14}
        markers={markers}
        driverPosition={driverLocation}
        bounds={mapBounds}
        bottomOffset={380} // 為底部訂單列表預留空間
        topOffset={80} // 避開右上角上線開關
      />



      {/* 底部訂單面板 */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '55%',
        minHeight: 200, // 增加最小高度
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1a1a1a',
        borderRadius: '24px 24px 0 0',
        zIndex: 1000,
        overflow: 'hidden',
      }}>
        {/* 拖曳指示條 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          pt: 1.5,
          pb: 1,
          flexShrink: 0,
        }}>
          <Box sx={{ 
            width: 40, 
            height: 4, 
            bgcolor: 'grey.600', 
            borderRadius: 2 
          }} />
        </Box>

        {/* 標題列 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          px: 2.5,
          pb: 1.5,
          flexShrink: 0,
        }}>
          <Typography variant="h6" fontWeight="bold" color="#fff">
            可接訂單
          </Typography>
        </Box>

        {/* 可滑動的訂單列表 */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          px: 2,
          pb: 3,
          // 隱藏滾動條
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}>
          {loading && offers.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#fff' }} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && offers.length === 0 && (
            <Card sx={{ borderRadius: 3, textAlign: 'center', py: 2, bgcolor: '#2a2a2a', mb: 2 }}>
              <Typography variant="h1" sx={{ fontSize: 32, mb: 0.5 }}>🚗</Typography>
              <Typography color="grey.400">目前沒有可接的訂單</Typography>
              <Typography variant="body2" color="grey.500">請稍後再試</Typography>
            </Card>
          )}

          {offers.map((order) => (
            <OrderCard 
              key={order.orderId} 
              order={order} 
              onAccept={handleAcceptOrder}
              onDecline={handleDecline}
              accepting={accepting}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

