import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { useDriverStore } from '../../stores/driver.store';
import { adminApi } from '../../api/admin.api';
import { StatusChip } from '../../components/common/StatusChip';
import type { Order } from '../../types';

// 安全取得地址顯示
function getLocationDisplay(location: any): string {
  if (!location) return '未知地點';
  if (location.address) return location.address;
  const x = location.x ?? (location as any).lat ?? 0;
  const y = location.y ?? (location as any).lng ?? 0;
  return `(${Number(x).toFixed(4)}, ${Number(y).toFixed(4)})`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { driver, isOnline } = useDriverStore();

  const [offers, setOffers] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 司機當前位置 (模擬在台中市政府附近)
  const [driverLocation] = useState<MapLocation>({
    lat: 24.1618,
    lng: 120.6469,
  });

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
          setOffers(response.data.data.orders || []);
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
  }, [driver, isOnline]);

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

        {offers.map((order) => (
          <Card key={order.orderId} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2">
                  訂單 #{order.orderId?.slice(0, 8) || 'N/A'}
                </Typography>
                <StatusChip status={order.status || 'PENDING'} />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', mr: 1, mt: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                  {getLocationDisplay(order.pickupLocation)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main', mr: 1, mt: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                  {getLocationDisplay(order.dropoffLocation)}
                </Typography>
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
        ))}
      </Box>
    </Box>
  );
}
