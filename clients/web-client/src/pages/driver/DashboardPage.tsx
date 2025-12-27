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
function OrderCard({ order, onAccept, accepting }: { 
  order: Order; 
  onAccept: (orderId: string) => void;
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
              <Typography variant="caption" color="text.secondary">
                {order.vehicleType || 'STANDARD'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" color="success.main" fontWeight="bold">
              ${order.estimatedFare || order.fare || 70}
            </Typography>
            <Chip 
              label="等待中" 
              size="small" 
              color="warning"
              sx={{ height: 20, fontSize: 11 }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 路線資訊 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          <AddressLine location={order.pickupLocation} type="pickup" label="上車地點" />
          
          {/* 連接線 */}
          <Box sx={{ ml: 1.2, borderLeft: '2px dashed', borderColor: 'divider', height: 12 }} />
          
          <AddressLine location={order.dropoffLocation} type="dropoff" label="下車地點" />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 接單按鈕 */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => onAccept(order.orderId)}
          disabled={isAccepting}
          sx={{ 
            py: 1.5,
            borderRadius: 2,
            fontWeight: 'bold',
            fontSize: 16,
          }}
          startIcon={isAccepting ? <CircularProgress size={20} color="inherit" /> : <CarIcon />}
        >
          {isAccepting ? '接單中...' : '接受訂單'}
        </Button>
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
  
  const [driverLocation] = useState<MapLocation>({
    lat: 24.1618,
    lng: 120.6469,
  });

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

    const fetchOffers = async () => {
      if (offers.length === 0) setLoading(true);
      setError(null);
      try {
        const response = await adminApi.getOrders({ status: 'PENDING' });
        if (response.data.success && response.data.data) {
          setOffers(response.data.data.orders || []);
        }
      } catch (err: any) {
        console.error('取得訂單失敗:', err);
        setError('無法取得訂單列表');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
    const timer = setInterval(fetchOffers, 5000);
    return () => clearInterval(timer);
  }, [driver, isOnline]);

  const markers: MapMarker[] = useMemo(() => offers.map((order, index) => {
    const coords = getCoordinates(order.pickupLocation);
    return {
      id: order.orderId,
      position: coords || { lat: 24.16 + index * 0.005, lng: 120.64 + index * 0.005 },
      type: 'pickup' as const,
      label: `$${order.estimatedFare || 70}`,
    };
  }), [offers]);

  if (!isOnline) {
    return (
      <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
        {/* 全屏地圖 */}
        <LeafletMap
          center={driverLocation}
          zoom={13}
          markers={[]}
          driverPosition={driverLocation}
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
      />

      {/* 底部訂單面板 */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '55%',
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
          <Chip 
            label={`${offers.length} 筆`} 
            size="small" 
            sx={{ 
              bgcolor: 'success.main',
              color: '#fff',
              fontWeight: 600,
            }}
          />
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
            <Card sx={{ borderRadius: 3, textAlign: 'center', py: 4, bgcolor: '#2a2a2a' }}>
              <Typography variant="h1" sx={{ fontSize: 48, mb: 1 }}>🚗</Typography>
              <Typography color="grey.400">目前沒有可接的訂單</Typography>
              <Typography variant="body2" color="grey.500">請稍後再試</Typography>
            </Card>
          )}

          {offers.map((order) => (
            <OrderCard 
              key={order.orderId} 
              order={order} 
              onAccept={handleAcceptOrder}
              accepting={accepting}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

