import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  LinearProgress,
  Divider,
  Avatar,
} from '@mui/material';
import {
  LocationOn as PickupIcon,
  Flag as DropoffIcon,
  AccessTime as TimeIcon,
  LocalTaxi as TaxiIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { StatusChip } from '../../components/common/StatusChip';
import { orderApi } from '../../api/order.api';
import { useAuthStore } from '../../stores/auth.store';
import { getRouteWithCache } from '../../api/routing.api';
import { useAnimatedPosition } from '../../hooks/useAnimatedPosition';
import type { Order } from '../../types';

export function WaitingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitingTime, setWaitingTime] = useState(0); // 等待秒數
  const [estimatedArrival, setEstimatedArrival] = useState<number | null>(null); // 預計到達時間(秒)
  
  // 地圖相關狀態
  const savedPickup = sessionStorage.getItem('currentOrderPickup');
  const savedDropoff = sessionStorage.getItem('currentOrderDropoff');
  const savedPickupAddress = sessionStorage.getItem('currentOrderPickupAddress');
  const savedDropoffAddress = sessionStorage.getItem('currentOrderDropoffAddress');
  
  const [pickupLocation] = useState<MapLocation | null>(
    savedPickup ? JSON.parse(savedPickup) : { lat: 24.1618, lng: 120.6469 }
  );
  const [dropoffLocation] = useState<MapLocation | null>(
    savedDropoff ? JSON.parse(savedDropoff) : null
  );
  const [pickupAddress] = useState(savedPickupAddress || '');
  const [dropoffAddress] = useState(savedDropoffAddress || '');
  
  // 路徑相關狀態
  const [driverToPickupPath, setDriverToPickupPath] = useState<MapLocation[] | null>(null);
  const hasStartedAnimationRef = useRef(false);

  // 使用動畫 Hook - 降低速度使動畫更真實
  // speed=5 表示每秒移動5個座標點，路徑通常有幾十到幾百個點
  const { position: animatedDriverPos, progress } = useAnimatedPosition(
    driverToPickupPath,
    {
      speed: 5, // 降低速度，原本是20，現在是5
      enabled: true,
      onComplete: () => {
        console.log('司機已到達乘客位置');
      },
    }
  );

  // 等待計時器
  useEffect(() => {
    const timer = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

          // 當司機接單後，計算真實路徑並開始動畫
          if (o.status === 'ACCEPTED' && !hasStartedAnimationRef.current && pickupLocation) {
            hasStartedAnimationRef.current = true;
            
            // 模擬司機初始位置 (距離上車點 0.5-1.5 公里)
            const offset = (Math.random() - 0.5) * 0.015;
            const initialDriverPos = {
              lat: pickupLocation.lat + offset,
              lng: pickupLocation.lng + offset,
            };
            
            // 取得真實路徑
            try {
              const route = await getRouteWithCache(initialDriverPos, pickupLocation);
              setDriverToPickupPath(route.coordinates);
              // 設置預計到達時間
              setEstimatedArrival(Math.ceil(route.duration / 60)); // 轉換為分鐘
            } catch (error) {
              console.error('路徑規劃失敗，使用直線路徑:', error);
              setDriverToPickupPath([initialDriverPos, pickupLocation]);
              setEstimatedArrival(3); // 預設3分鐘
            }
          }

          // 狀態轉換
          if (o.status === 'ONGOING') {
            navigate(`/rider/trip/${orderId}`);
          } else if (o.status === 'COMPLETED') {
            navigate(`/rider/completed/${orderId}`);
          } else if (o.status === 'CANCELLED') {
            navigate('/rider/home');
          }
        }
      } catch (error) {
        console.error('查詢訂單失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    poll();
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [orderId, navigate, pickupLocation]);

  const handleCancel = async () => {
    if (!orderId || !user) return;

    try {
      await orderApi.cancel(orderId, user.id, '乘客取消');
      navigate('/rider/home');
    } catch (error) {
      console.error('取消失敗:', error);
    }
  };

  // 建立地圖標記
  const markers: MapMarker[] = [];
  if (pickupLocation) {
    markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車點' });
  }
  if (dropoffLocation) {
    markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車點' });
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地圖區域 */}
      <Box sx={{ height: 280, position: 'relative' }}>
        <LeafletMap
          center={pickupLocation || { lat: 24.1618, lng: 120.6469 }}
          zoom={15}
          markers={markers}
          routePath={driverToPickupPath || undefined}
          driverPosition={animatedDriverPos}
        />
        
        {/* 狀態遮罩 */}
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: order?.status === 'ACCEPTED' ? 'success.main' : 'rgba(0,0,0,0.8)',
          color: '#fff',
          px: 3,
          py: 1,
          borderRadius: 2,
          textAlign: 'center',
          zIndex: 1000,
        }}>
          {order?.status === 'PENDING' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} sx={{ color: '#fff' }} />
              <Typography variant="body2">
                正在尋找司機...
              </Typography>
            </Box>
          )}
          {order?.status === 'ACCEPTED' && (
            <Typography variant="body2" fontWeight="bold">
              🚗 司機正在趕來
            </Typography>
          )}
        </Box>
      </Box>

      {/* 進度條 */}
      <LinearProgress 
        variant={order?.status === 'PENDING' ? 'indeterminate' : 'determinate'} 
        value={order?.status === 'ACCEPTED' ? progress * 100 : 0}
        color={order?.status === 'ACCEPTED' ? 'success' : 'primary'}
        sx={{ height: 4 }} 
      />

      {/* 訂單資訊卡片 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* 主狀態卡片 */}
        <Card sx={{ mb: 2, bgcolor: order?.status === 'ACCEPTED' ? 'success.dark' : 'background.paper' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ color: order?.status === 'ACCEPTED' ? '#fff' : 'text.primary' }}>
                  {order?.status === 'PENDING' ? '等待司機接單' : '司機正在趕來'}
                </Typography>
                <Typography variant="body2" sx={{ color: order?.status === 'ACCEPTED' ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                  已等待 {formatTime(waitingTime)}
                </Typography>
              </Box>
              <StatusChip status={order?.status || 'PENDING'} />
            </Box>

            {/* 司機接單後顯示預計到達時間 */}
            {order?.status === 'ACCEPTED' && estimatedArrival && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                p: 2, 
                bgcolor: 'rgba(255,255,255,0.1)', 
                borderRadius: 1,
                mb: 1
              }}>
                <TimeIcon sx={{ color: '#fff', fontSize: 32 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    預計到達
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    約 {Math.max(1, Math.ceil(estimatedArrival * (1 - progress)))} 分鐘
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    進度
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {Math.round(progress * 100)}%
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 司機資訊 (如果已接單) */}
        {order?.driverId && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                司機資訊
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <TaxiIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{order.driverName || '司機'}</Typography>
                  <Typography color="text.secondary">{order.vehiclePlate || 'ABC-1234'}</Typography>
                </Box>
                {/* 可以添加撥打電話按鈕 */}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 行程詳情 */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              行程詳情
            </Typography>
            
            {/* 上車點 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <PickupIcon sx={{ color: 'success.main', mr: 1.5, mt: 0.3 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">上車地點</Typography>
                <Typography>
                  {pickupAddress || (pickupLocation ? `(${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)})` : '未設定')}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1, ml: 4.5 }} />

            {/* 下車點 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <DropoffIcon sx={{ color: 'error.main', mr: 1.5, mt: 0.3 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">下車地點</Typography>
                <Typography>
                  {dropoffAddress || (dropoffLocation ? `(${dropoffLocation.lat.toFixed(4)}, ${dropoffLocation.lng.toFixed(4)})` : '未設定')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 訂單編號 */}
        <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mb: 2 }}>
          訂單編號：{order?.orderId?.slice(0, 8)}...
        </Typography>

        {/* 取消按鈕 */}
        <Button
          fullWidth
          variant="outlined"
          color="error"
          onClick={handleCancel}
          data-testid="btn-cancel"
        >
          取消叫車
        </Button>
      </Box>
    </Box>
  );
}
