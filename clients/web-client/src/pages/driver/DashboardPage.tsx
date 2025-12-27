import { useEffect, useState, useCallback } from 'react';
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
} from '@mui/material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { useDriverStore } from '../../stores/driver.store';
import { adminApi } from '../../api/admin.api';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
import { StatusChip } from '../../components/common/StatusChip';
import type { Order } from '../../types';

// 儲存地址的快取
const addressCache: Record<string, string> = {};

// 生成座標的快取 key
function getCoordKey(location: any): string | null {
  if (!location) return null;
  const x = location.x ?? location.lat;
  const y = location.y ?? location.lng;
  if (x === undefined || y === undefined) return null;
  return `${Number(x).toFixed(4)},${Number(y).toFixed(4)}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { driver, isOnline } = useDriverStore();

  const [offers, setOffers] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 地址狀態
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [loadingAddresses, setLoadingAddresses] = useState<Record<string, boolean>>({});
  
  // 司機當前位置 (模擬在台中市政府附近)
  const [driverLocation] = useState<MapLocation>({
    lat: 24.1618,
    lng: 120.6469,
  });

  // 為訂單獲取地址
  const fetchAddressesForOrders = useCallback(async (orderList: Order[]) => {
    const coordsToFetch: { key: string; lat: number; lng: number }[] = [];
    
    for (const order of orderList) {
      // 上車點
      const pickupKey = getCoordKey(order.pickupLocation);
      if (pickupKey && !addressCache[pickupKey]) {
        const lat = order.pickupLocation?.x ?? (order.pickupLocation as any)?.lat;
        const lng = order.pickupLocation?.y ?? (order.pickupLocation as any)?.lng;
        if (lat !== undefined && lng !== undefined) {
          coordsToFetch.push({ key: pickupKey, lat, lng });
        }
      }
      
      // 下車點
      const dropoffKey = getCoordKey(order.dropoffLocation);
      if (dropoffKey && !addressCache[dropoffKey]) {
        const lat = order.dropoffLocation?.x ?? (order.dropoffLocation as any)?.lat;
        const lng = order.dropoffLocation?.y ?? (order.dropoffLocation as any)?.lng;
        if (lat !== undefined && lng !== undefined) {
          coordsToFetch.push({ key: dropoffKey, lat, lng });
        }
      }
    }

    // 去重
    const uniqueCoords = coordsToFetch.filter(
      (coord, index, self) => self.findIndex(c => c.key === coord.key) === index
    );

    if (uniqueCoords.length === 0) return;

    // 設置載入狀態
    const loadingState: Record<string, boolean> = {};
    uniqueCoords.forEach(c => { loadingState[c.key] = true; });
    setLoadingAddresses(prev => ({ ...prev, ...loadingState }));

    // 逐個查詢地址
    for (const coord of uniqueCoords) {
      try {
        const address = await reverseGeocodeWithCache(coord.lat, coord.lng);
        addressCache[coord.key] = address;
        setAddresses(prev => ({ ...prev, [coord.key]: address }));
      } catch (error) {
        console.error('地址查詢失敗:', error);
        const fallback = `(${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
        addressCache[coord.key] = fallback;
        setAddresses(prev => ({ ...prev, [coord.key]: fallback }));
      } finally {
        setLoadingAddresses(prev => ({ ...prev, [coord.key]: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (!driver || !isOnline) {
      setOffers([]);
      return;
    }

    const fetchOffers = async () => {
      setLoading(true);
      setError(null);
      try {
        // 使用 admin API 取得所有 PENDING 訂單 (Demo 用途)
        const response = await adminApi.getOrders({ status: 'PENDING' });
        if (response.data.success && response.data.data) {
          const orderList = response.data.data.orders || [];
          setOffers(orderList);
          
          // 獲取地址
          if (orderList.length > 0) {
            fetchAddressesForOrders(orderList);
          }
        }
      } catch (err: any) {
        console.error('取得訂單失敗:', err);
        setError('無法取得訂單列表');
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
    const timer = setInterval(fetchOffers, 5000);
    return () => clearInterval(timer);
  }, [driver, isOnline, fetchAddressesForOrders]);

  // 取得地址顯示
  const getLocationDisplay = (location: any): { address: string; loading: boolean } => {
    const key = getCoordKey(location);
    if (!key) return { address: '未知地點', loading: false };
    
    if (addressCache[key]) {
      return { address: addressCache[key], loading: false };
    }
    
    if (loadingAddresses[key]) {
      return { address: '', loading: true };
    }
    
    if (addresses[key]) {
      return { address: addresses[key], loading: false };
    }
    
    const x = location?.x ?? location?.lat ?? 0;
    const y = location?.y ?? location?.lng ?? 0;
    return { address: `(${Number(x).toFixed(4)}, ${Number(y).toFixed(4)})`, loading: false };
  };

  // 建立地圖標記：顯示所有待接訂單的上車點
  const markers: MapMarker[] = offers.map((order, index) => {
    const pickupLoc = order.pickupLocation;
    return {
      id: order.orderId,
      position: {
        lat: pickupLoc?.x ?? (pickupLoc as any)?.lat ?? 24.16 + index * 0.005,
        lng: pickupLoc?.y ?? (pickupLoc as any)?.lng ?? 120.64 + index * 0.005,
      },
      type: 'pickup' as const,
      label: `訂單 ${index + 1}`,
    };
  });

  if (!isOnline) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 地圖區域 - 離線時也顯示 */}
        <Box sx={{ height: 250, position: 'relative' }}>
          <LeafletMap
            center={driverLocation}
            zoom={15}
            markers={[]}
            driverPosition={driverLocation}
          />
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            px: 4,
            py: 2,
            borderRadius: 2,
            textAlign: 'center',
            zIndex: 1000,
          }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              您目前離線
            </Typography>
            <Typography variant="body2" color="text.secondary">
              請開啟上方的開關以開始接單
            </Typography>
          </Box>
        </Box>
        
        {/* 司機資訊 */}
        <Box sx={{ p: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">司機資訊</Typography>
              <Typography variant="h6">{driver?.name || '未登入'}</Typography>
              <Typography color="text.secondary">{driver?.phone}</Typography>
              <Typography color="text.secondary">{driver?.vehiclePlate}</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地圖區域 - 使用 OpenStreetMap 顯示司機位置和待接訂單 */}
      <Box sx={{ height: 250, position: 'relative' }}>
        <LeafletMap
          center={driverLocation}
          zoom={14}
          markers={markers}
          driverPosition={driverLocation}
        />
        
        {/* 上線狀態提示 */}
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'success.main',
          color: '#fff',
          px: 2,
          py: 0.5,
          borderRadius: 1,
          zIndex: 1000,
        }}>
          <Typography variant="body2">🟢 上線中 - 等待訂單</Typography>
        </Box>
      </Box>

      {/* 訂單列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          可接訂單 ({offers.length})
        </Typography>

        {loading && offers.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && offers.length === 0 && (
          <Alert severity="info">
            目前沒有可接的訂單，請稍後再試
          </Alert>
        )}

        {offers.map((order) => {
          const pickupDisplay = getLocationDisplay(order.pickupLocation);
          const dropoffDisplay = getLocationDisplay(order.dropoffLocation);
          
          return (
            <Card key={order.orderId} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2">
                    訂單 #{order.orderId?.slice(0, 8) || 'N/A'}
                  </Typography>
                  <StatusChip status={order.status || 'PENDING'} />
                </Box>

                {/* 上車點 */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', mr: 1, mt: 0.5, flexShrink: 0 }} />
                  {pickupDisplay.loading ? (
                    <Skeleton variant="text" width="70%" />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {pickupDisplay.address}
                    </Typography>
                  )}
                </Box>
                
                {/* 下車點 */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main', mr: 1, mt: 0.5, flexShrink: 0 }} />
                  {dropoffDisplay.loading ? (
                    <Skeleton variant="text" width="70%" />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {dropoffDisplay.address}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography color="primary" fontWeight="bold">
                    💰 ${order.estimatedFare || order.fare || 150}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/driver/order/${order.orderId}`)}
                    data-testid={`btn-view-order-${order.orderId}`}
                  >
                    查看詳情
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
