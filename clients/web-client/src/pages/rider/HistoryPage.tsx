import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Chip, Alert, Skeleton } from '@mui/material';
import { useAuthStore } from '../../stores/auth.store';
import { adminApi } from '../../api/admin.api';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';
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

export function HistoryPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 地址狀態：key 是座標，value 是地址
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [loadingAddresses, setLoadingAddresses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 使用 admin API 取得歷史訂單 (Demo 用途)
        const response = await adminApi.getOrders({ status: 'COMPLETED', passengerId: user.id });
        if (response.data.success && response.data.data) {
          // 過濾出該乘客的訂單
          const allOrders = response.data.data.orders || [];
          const myOrders = allOrders.filter(
            (order: Order) => order.passengerId === user.id
          );
          setOrders(myOrders);
          
          // 為每個訂單的地點獲取地址
          fetchAddressesForOrders(myOrders);
        }
      } catch (err) {
        console.error('取得歷史訂單失敗:', err);
        // 如果 API 失敗，嘗試取得所有訂單
        try {
          const response = await adminApi.getOrders({ passengerId: user.id });
          if (response.data.success && response.data.data) {
            const allOrders = response.data.data.orders || [];
            const completedOrders = allOrders.filter(
              (order: Order) => 
                order.status === 'COMPLETED' && 
                order.passengerId === user.id
            );
            setOrders(completedOrders);
            fetchAddressesForOrders(completedOrders);
          }
        } catch {
          setError('無法載入歷史行程');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  // 為訂單獲取地址
  const fetchAddressesForOrders = async (orderList: Order[]) => {
    // 收集所有需要查詢的座標
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

    // 設置載入狀態
    const loadingState: Record<string, boolean> = {};
    uniqueCoords.forEach(c => { loadingState[c.key] = true; });
    setLoadingAddresses(prev => ({ ...prev, ...loadingState }));

    // 逐個查詢地址 (因為 Nominatim 有限速)
    for (const coord of uniqueCoords) {
      try {
        const address = await reverseGeocodeWithCache(coord.lat, coord.lng);
        addressCache[coord.key] = address;
        setAddresses(prev => ({ ...prev, [coord.key]: address }));
      } catch (error) {
        console.error('地址查詢失敗:', error);
        addressCache[coord.key] = `(${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
        setAddresses(prev => ({ ...prev, [coord.key]: addressCache[coord.key] }));
      } finally {
        setLoadingAddresses(prev => ({ ...prev, [coord.key]: false }));
      }
    }
  };

  // 取得地址顯示
  const getLocationDisplay = (location: any): { address: string; loading: boolean } => {
    const key = getCoordKey(location);
    if (!key) return { address: '未知地點', loading: false };
    
    // 先檢查快取
    if (addressCache[key]) {
      return { address: addressCache[key], loading: false };
    }
    
    // 檢查是否正在載入
    if (loadingAddresses[key]) {
      return { address: '', loading: true };
    }
    
    // 檢查狀態中的地址
    if (addresses[key]) {
      return { address: addresses[key], loading: false };
    }
    
    // 返回座標作為備用
    const x = location?.x ?? location?.lat ?? 0;
    const y = location?.y ?? location?.lng ?? 0;
    return { address: `(${Number(x).toFixed(4)}, ${Number(y).toFixed(4)})`, loading: false };
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        歷史行程
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h1" sx={{ mb: 2, fontSize: 64 }}>
            🚗
          </Typography>
          <Typography color="text.secondary">
            還沒有完成的行程
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            完成您的第一趟行程後，這裡會顯示記錄
          </Typography>
        </Box>
      )}

      {orders.map((order) => {
        const pickupDisplay = getLocationDisplay(order.pickupLocation);
        const dropoffDisplay = getLocationDisplay(order.dropoffLocation);
        
        return (
          <Card key={order.orderId} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {formatDate(order.completedAt || order.createdAt)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip 
                    label={
                      order.vehicleType === 'STANDARD' ? '標準' :
                      order.vehicleType === 'PREMIUM' ? '尊榮' :
                      order.vehicleType === 'XL' ? '大型車' :
                      order.vehicleType || '標準'
                    } 
                    size="small" 
                    variant="outlined"
                  />
                  <Typography color="primary" fontWeight="bold" fontSize={18}>
                    ${order.fare || order.estimatedFare || 0}
                  </Typography>
                </Box>
              </Box>
              
              {/* 上車點 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', mr: 1.5, mt: 0.5, flexShrink: 0 }} />
                {pickupDisplay.loading ? (
                  <Skeleton variant="text" width="80%" />
                ) : (
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {pickupDisplay.address}
                  </Typography>
                )}
              </Box>
              
              {/* 下車點 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main', mr: 1.5, mt: 0.5, flexShrink: 0 }} />
                {dropoffDisplay.loading ? (
                  <Skeleton variant="text" width="80%" />
                ) : (
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {dropoffDisplay.address}
                  </Typography>
                )}
              </Box>

              {order.driverName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  司機：{order.driverName}
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
