import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { StatusChip } from '../../components/common/StatusChip';
import { orderApi } from '../../api/order.api';
import { useDriverStore } from '../../stores/driver.store';
import { getRouteWithCache } from '../../api/routing.api';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
import { useAnimatedPosition } from '../../hooks/useAnimatedPosition';
import type { Order } from '../../types';

const steps = ['接單', '前往乘客', '開始行程', '完成'];

export function TripPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { driver } = useDriverStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 地圖相關狀態
  const [pickupLocation, setPickupLocation] = useState<MapLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<MapLocation | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [dropoffAddress, setDropoffAddress] = useState<string>('');
  
  // 路徑相關
  const [currentPath, setCurrentPath] = useState<MapLocation[] | null>(null);
  const [driverInitialLocation] = useState<MapLocation>({ lat: 24.16, lng: 120.64 });
  
  const hasStartedToPickupRef = useRef(false);
  const hasStartedToDropoffRef = useRef(false);

  // 使用動畫 Hook - 降低速度使動畫更真實
  const { position: animatedDriverPos, progress } = useAnimatedPosition(
    currentPath,
    {
      speed: 5, // 降低速度，原本是20
      enabled: true,
    }
  );

  const getActiveStep = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 1;
      case 'ONGOING': return 2;
      case 'COMPLETED': return 3;
      default: return 0;
    }
  };

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          const o = response.data.data;
          setOrder(o);
          
          // 設定地點
          if (o.pickupLocation) {
            const pickup = {
              lat: o.pickupLocation.x ?? (o.pickupLocation as any).lat ?? 24.165,
              lng: o.pickupLocation.y ?? (o.pickupLocation as any).lng ?? 120.65,
            };
            setPickupLocation(pickup);
            
            // 取得真實地址
            reverseGeocodeWithCache(pickup.lat, pickup.lng)
              .then(addr => setPickupAddress(addr))
              .catch(() => setPickupAddress(`(${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)})`));
          }
          if (o.dropoffLocation) {
            const dropoff = {
              lat: o.dropoffLocation.x ?? (o.dropoffLocation as any).lat ?? 24.18,
              lng: o.dropoffLocation.y ?? (o.dropoffLocation as any).lng ?? 120.68,
            };
            setDropoffLocation(dropoff);
            
            // 取得真實地址
            reverseGeocodeWithCache(dropoff.lat, dropoff.lng)
              .then(addr => setDropoffAddress(addr))
              .catch(() => setDropoffAddress(`(${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)})`));
          }
        }
      } catch (error) {
        console.error('查詢失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
    const timer = setInterval(fetchOrder, 3000);
    return () => clearInterval(timer);
  }, [orderId]);

  // 當狀態變為 ACCEPTED 時，計算路徑前往乘客
  useEffect(() => {
    if (order?.status === 'ACCEPTED' && pickupLocation && !hasStartedToPickupRef.current) {
      hasStartedToPickupRef.current = true;
      
      // 計算從司機位置到乘客的路徑
      getRouteWithCache(driverInitialLocation, pickupLocation)
        .then(route => {
          setCurrentPath(route.coordinates);
        })
        .catch(error => {
          console.error('路徑規劃失敗:', error);
          setCurrentPath([driverInitialLocation, pickupLocation]);
        });
    }
  }, [order?.status, pickupLocation, driverInitialLocation]);

  // 當狀態變為 ONGOING 時，計算路徑前往目的地
  useEffect(() => {
    if (order?.status === 'ONGOING' && pickupLocation && dropoffLocation && !hasStartedToDropoffRef.current) {
      hasStartedToDropoffRef.current = true;
      
      // 計算從上車點到目的地的路徑
      getRouteWithCache(pickupLocation, dropoffLocation)
        .then(route => {
          setCurrentPath(route.coordinates);
        })
        .catch(error => {
          console.error('路徑規劃失敗:', error);
          setCurrentPath([pickupLocation, dropoffLocation]);
        });
    }
  }, [order?.status, pickupLocation, dropoffLocation]);

  const handleStart = async () => {
    if (!orderId || !driver) return;

    setActionLoading(true);
    try {
      const response = await orderApi.start(orderId, driver.driverId);
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
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
      const response = await orderApi.complete(orderId, driver.driverId);
      if (response.data.success) {
        alert('行程完成！');
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
  if (pickupLocation) {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車' });
  }
  if (dropoffLocation) {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車' });
  }

  // 地圖中心跟隨司機
  const mapCenter = animatedDriverPos || driverInitialLocation;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地圖區域 - 顯示司機沿路移動 */}
      <Box sx={{ height: 280, position: 'relative' }}>
        <LeafletMap
          center={mapCenter}
          zoom={15}
          markers={markers}
          routePath={currentPath || undefined}  // 顯示當前路徑
          driverPosition={animatedDriverPos}    // 沿路動畫的司機位置
        />
        
        {/* 狀態提示 */}
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: order?.status === 'ACCEPTED' ? 'info.main' : 'primary.main',
          color: '#fff',
          px: 2,
          py: 0.5,
          borderRadius: 1,
          zIndex: 1000,
        }}>
          <Typography variant="body2">
            {order?.status === 'ACCEPTED' 
              ? `🚗 前往乘客中 (${Math.round(progress * 100)}%)`
              : `🚗 行程進行中 (${Math.round(progress * 100)}%)`}
          </Typography>
        </Box>
      </Box>

      {/* 行程資訊 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                {order?.status === 'ACCEPTED' ? '前往乘客中' : '行程進行中'}
              </Typography>
              <StatusChip status={order?.status || 'ONGOING'} />
            </Box>

            <Stepper activeStep={getActiveStep(order?.status || '')} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* 乘客資訊 */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              乘客
            </Typography>
            <Typography>👤 {order?.passengerId}</Typography>
          </CardContent>
        </Card>

        {/* 路線 - 顯示真實地址 */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">上車</Typography>
                <Typography>
                  {pickupAddress || (pickupLocation ? `(${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)})` : '未知')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">下車</Typography>
                <Typography>
                  {dropoffAddress || (dropoffLocation ? `(${dropoffLocation.lat.toFixed(4)}, ${dropoffLocation.lng.toFixed(4)})` : '未知')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 操作按鈕 */}
        {order?.status === 'ACCEPTED' && (
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleStart}
            disabled={actionLoading}
            data-testid="btn-start-trip"
          >
            {actionLoading ? '處理中...' : '🚗 已接到乘客 - 開始行程'}
          </Button>
        )}

        {order?.status === 'ONGOING' && (
          <Button
            fullWidth
            variant="contained"
            color="success"
            size="large"
            onClick={handleComplete}
            disabled={actionLoading}
            data-testid="btn-complete-trip"
          >
            {actionLoading ? '處理中...' : '✅ 已到達 - 完成行程'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
