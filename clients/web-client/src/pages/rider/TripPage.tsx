import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { StatusChip } from '../../components/common/StatusChip';
import { orderApi } from '../../api/order.api';
import { getRouteWithCache } from '../../api/routing.api';
import { useAnimatedPosition } from '../../hooks/useAnimatedPosition';
import type { Order } from '../../types';

const steps = ['建立', '接單', '行駛', '完成'];

export function TripPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [, setLoading] = useState(true);
  
  // 地圖相關狀態
  const savedPickup = sessionStorage.getItem('currentOrderPickup');
  const savedDropoff = sessionStorage.getItem('currentOrderDropoff');
  const savedPickupAddress = sessionStorage.getItem('currentOrderPickupAddress');
  const savedDropoffAddress = sessionStorage.getItem('currentOrderDropoffAddress');
  
  const [pickupLocation] = useState<MapLocation | null>(
    savedPickup ? JSON.parse(savedPickup) : { lat: 24.1618, lng: 120.6469 }
  );
  const [dropoffLocation] = useState<MapLocation | null>(
    savedDropoff ? JSON.parse(savedDropoff) : { lat: 24.18, lng: 120.68 }
  );
  const [pickupAddress] = useState(savedPickupAddress || '');
  const [dropoffAddress] = useState(savedDropoffAddress || '');
  
  // 路徑相關
  const [tripPath, setTripPath] = useState<MapLocation[] | null>(null);
  const hasStartedTripAnimationRef = useRef(false);

  // 使用動畫 Hook
  const { position: animatedCarPos, progress } = useAnimatedPosition(
    tripPath,
    {
      speed: 15,
      enabled: true,
      onComplete: () => {
        console.log('車輛已到達目的地');
      },
    }
  );

  const getActiveStep = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'ACCEPTED': return 1;
      case 'ONGOING': return 2;
      case 'COMPLETED': return 3;
      default: return 0;
    }
  };

  // Polling
  useEffect(() => {
    if (!orderId) return;

    const poll = async () => {
      try {
        const response = await orderApi.get(orderId);
        if (response.data.success && response.data.data) {
          const o = response.data.data;
          setOrder(o);

          // 當行程開始時，計算真實路徑並開始動畫
          if (o.status === 'ONGOING' && !hasStartedTripAnimationRef.current && pickupLocation && dropoffLocation) {
            hasStartedTripAnimationRef.current = true;
            
            try {
              const route = await getRouteWithCache(pickupLocation, dropoffLocation);
              setTripPath(route.coordinates);
            } catch (error) {
              console.error('路徑規劃失敗，使用直線路徑:', error);
              setTripPath([pickupLocation, dropoffLocation]);
            }
          }

          if (o.status === 'COMPLETED') {
            navigate(`/rider/completed/${orderId}`);
          } else if (o.status === 'CANCELLED') {
            navigate('/rider/home');
          }
        }
      } catch (error) {
        console.error('查詢失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [orderId, navigate, pickupLocation, dropoffLocation]);

  // 建立地圖標記
  const markers: MapMarker[] = [];
  if (pickupLocation) {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車' });
  }
  if (dropoffLocation) {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車' });
  }

  // 地圖中心跟隨車輛
  const mapCenter = animatedCarPos || pickupLocation || { lat: 24.1618, lng: 120.6469 };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地圖區域 - 顯示車輛沿路移動 */}
      <Box sx={{ height: 300, position: 'relative' }}>
        <LeafletMap
          center={mapCenter}
          zoom={15}
          markers={markers}
          routePath={tripPath || undefined}  // 顯示行程路徑
          driverPosition={animatedCarPos}    // 沿路動畫的車輛位置
        />
        
        {/* 狀態提示 */}
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'primary.main',
          color: '#fff',
          px: 3,
          py: 1,
          borderRadius: 2,
          zIndex: 1000,
        }}>
          <Typography variant="body2">
            {order?.status === 'ACCEPTED' 
              ? '🚗 司機正在前往' 
              : `🚗 行程進行中 (${Math.round(progress * 100)}%)`}
          </Typography>
        </Box>
      </Box>

      {/* 行程資訊 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {order?.status === 'ACCEPTED' ? '司機正趕往您的位置' : '行程進行中'}
              </Typography>
              <StatusChip status={order?.status || 'ONGOING'} />
            </Box>

            <Stepper activeStep={getActiveStep(order?.status || '')} alternativeLabel sx={{ mb: 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* 司機資訊 */}
        {order?.driverId && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                司機資訊
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}>
                  🚗
                </Box>
                <Box>
                  <Typography variant="h6">{order.driverName || '司機'}</Typography>
                  <Typography color="text.secondary">{order.vehiclePlate || 'ABC-1234'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 路線資訊 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">上車</Typography>
                <Typography>
                  {pickupAddress || 
                   (pickupLocation ? `(${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)})` : '未知')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">下車</Typography>
                <Typography>
                  {dropoffAddress || 
                   (dropoffLocation ? `(${dropoffLocation.lat.toFixed(4)}, ${dropoffLocation.lng.toFixed(4)})` : '未知')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
