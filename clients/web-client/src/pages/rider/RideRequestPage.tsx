import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
import { getRouteWithCache } from '../../api/routing.api';
import { useAuthStore } from '../../stores/auth.store';
import { orderApi } from '../../api/order.api';
import type { VehicleType } from '../../types';

export function RideRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // 從 sessionStorage 讀取上車點
  const savedPickup = sessionStorage.getItem('pickupLocation');
  const savedPickupAddress = sessionStorage.getItem('pickupAddress');

  const [pickupLocation, setPickupLocation] = useState<MapLocation | null>(
    savedPickup ? JSON.parse(savedPickup) : { lat: 24.1618, lng: 120.6469 }
  );
  const [pickupAddress, setPickupAddress] = useState(
    savedPickupAddress || '台中市西屯區市政路100號'
  );
  
  const [dropoffLocation, setDropoffLocation] = useState<MapLocation | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState('');
  
  const [vehicleType, setVehicleType] = useState<VehicleType>('STANDARD');
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  
  // 路徑相關狀態
  const [routePath, setRoutePath] = useState<MapLocation[]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [routeDuration, setRouteDuration] = useState<number>(0);

  // 當兩點都選定時，計算路徑
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      getRouteWithCache(pickupLocation, dropoffLocation)
        .then(result => {
          setRoutePath(result.coordinates);
          setRouteDistance(result.distance);
          setRouteDuration(result.duration);
        })
        .catch(error => {
          console.error('路徑規劃失敗:', error);
          setRoutePath([]);
        });
    } else {
      setRoutePath([]);
      setRouteDistance(0);
      setRouteDuration(0);
    }
  }, [pickupLocation, dropoffLocation]);

  // 計算預估車資 - 使用真實距離
  const calculateFare = () => {
    if (!pickupLocation || !dropoffLocation) return 0;
    
    const distanceKm = routeDistance > 0 
      ? routeDistance / 1000  // 使用真實路徑距離
      : Math.sqrt(
          Math.pow((dropoffLocation.lat - pickupLocation.lat) * 111, 2) +
          Math.pow((dropoffLocation.lng - pickupLocation.lng) * 111, 2)
        );
    
    const baseFare = vehicleType === 'STANDARD' ? 50 : vehicleType === 'PREMIUM' ? 80 : 100;
    const perKmRate = vehicleType === 'STANDARD' ? 15 : vehicleType === 'PREMIUM' ? 25 : 30;
    return Math.round(baseFare + distanceKm * perKmRate);
  };

  const estimatedFare = calculateFare();

  // 處理地圖中心變化 - 使用真實地址
  const handleCenterChange = useCallback(async (location: MapLocation) => {
    if (!selectionMode) return;

    setIsLoadingAddress(true);
    try {
      const address = await reverseGeocodeWithCache(location.lat, location.lng);
      
      if (selectionMode === 'pickup') {
        setPickupLocation(location);
        setPickupAddress(address);
      } else if (selectionMode === 'dropoff') {
        setDropoffLocation(location);
        setDropoffAddress(address);
      }
    } catch (error) {
      console.error('地址查詢失敗:', error);
      const fallbackAddress = `(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`;
      if (selectionMode === 'pickup') {
        setPickupLocation(location);
        setPickupAddress(fallbackAddress);
      } else {
        setDropoffLocation(location);
        setDropoffAddress(fallbackAddress);
      }
    } finally {
      setIsLoadingAddress(false);
    }
  }, [selectionMode]);

  const handleRequestRide = async () => {
    if (!user || !pickupLocation || !dropoffLocation) return;

    setLoading(true);
    try {
      const response = await orderApi.create({
        passengerId: user.id,
        pickupLocation: { x: pickupLocation.lat, y: pickupLocation.lng },
        dropoffLocation: { x: dropoffLocation.lat, y: dropoffLocation.lng },
        vehicleType,
      });

      if (response.data.success && response.data.data) {
        // 存儲訂單資訊以便在等待頁面使用
        sessionStorage.setItem('currentOrderPickup', JSON.stringify(pickupLocation));
        sessionStorage.setItem('currentOrderDropoff', JSON.stringify(dropoffLocation));
        sessionStorage.setItem('currentOrderPickupAddress', pickupAddress);
        sessionStorage.setItem('currentOrderDropoffAddress', dropoffAddress);
        navigate(`/rider/waiting/${response.data.data.orderId}`);
      }
    } catch (error) {
      console.error('叫車失敗:', error);
      alert('叫車失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  // 建立地圖標記
  const markers: MapMarker[] = [];
  if (pickupLocation && selectionMode !== 'pickup') {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車' });
  }
  if (dropoffLocation && selectionMode !== 'dropoff') {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車' });
  }

  // 地圖中心點
  const mapCenter = selectionMode === 'dropoff' 
    ? (dropoffLocation || pickupLocation || { lat: 24.1618, lng: 120.6469 })
    : (pickupLocation || { lat: 24.1618, lng: 120.6469 });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地圖區域 - 使用 OpenStreetMap */}
      <Box sx={{ height: 250, position: 'relative' }}>
        <LeafletMap
          center={mapCenter}
          zoom={15}
          markers={markers}
          routePath={selectionMode ? [] : routePath}  // 選點模式時不顯示路徑
          selectionMode={selectionMode}
          showCenterPin={selectionMode !== null}
          onCenterChange={handleCenterChange}
        />
      </Box>

      {/* 表單區域 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          叫車
        </Typography>

        {/* 地點輸入 */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mr: 2 }} />
              <TextField
                fullWidth
                value={pickupAddress}
                onClick={() => setSelectionMode('pickup')}
                InputProps={{ readOnly: true }}
                placeholder="選擇上車地點"
                size="small"
                data-testid="input-pickup"
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', mr: 2 }} />
              <TextField
                fullWidth
                value={dropoffAddress}
                onClick={() => setSelectionMode('dropoff')}
                InputProps={{ readOnly: true }}
                placeholder="選擇下車地點"
                size="small"
                data-testid="input-dropoff"
              />
            </Box>
          </CardContent>
        </Card>

        {/* 選點模式確認按鈕 */}
        {selectionMode && (
          <Card sx={{ mb: 2, bgcolor: selectionMode === 'pickup' ? 'success.dark' : 'error.dark' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, minHeight: 24 }}>
                {isLoadingAddress ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                    <Typography variant="body2" sx={{ color: '#fff' }}>
                      查詢地址中...
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#fff' }}>
                    {selectionMode === 'pickup' ? pickupAddress : dropoffAddress}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setSelectionMode(null)}
                  sx={{ flex: 1, color: '#fff', borderColor: '#fff' }}
                >
                  取消
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setSelectionMode(null)}
                  disabled={isLoadingAddress}
                  sx={{ flex: 1, bgcolor: '#fff', color: '#000', '&:hover': { bgcolor: '#eee' } }}
                >
                  確認{selectionMode === 'pickup' ? '上車點' : '下車點'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 車種選擇 */}
        {!selectionMode && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              選擇車種
            </Typography>
            <ToggleButtonGroup
              value={vehicleType}
              exclusive
              onChange={(_, v) => v && setVehicleType(v)}
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="STANDARD" data-testid="vehicle-standard">
                🚗 菁英
              </ToggleButton>
              <ToggleButton value="PREMIUM" data-testid="vehicle-premium">
                🚘 尊榮
              </ToggleButton>
              <ToggleButton value="XL" data-testid="vehicle-xl">
                🚐 大型
              </ToggleButton>
            </ToggleButtonGroup>

            {/* 路線資訊 */}
            {dropoffLocation && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">預估距離</Typography>
                    <Typography>
                      {routeDistance > 0 
                        ? `${(routeDistance / 1000).toFixed(1)} 公里` 
                        : '計算中...'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">預估時間</Typography>
                    <Typography>
                      {routeDuration > 0 
                        ? `${Math.ceil(routeDuration / 60)} 分鐘` 
                        : '計算中...'}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontWeight="bold">預估車資</Typography>
                    <Typography color="primary" fontWeight="bold" fontSize={20}>
                      ${estimatedFare}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            <Divider sx={{ my: 2 }} />

            {/* 叫車按鈕 */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleRequestRide}
              disabled={!pickupLocation || !dropoffLocation || loading}
              data-testid="btn-request-ride"
            >
              {loading ? '正在呼叫司機...' : '確認叫車'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
