import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
} from '@mui/material';
import {
  LocationOn as LocationIcon, 
  Flag as FlagIcon,
  DirectionsCar as CarIcon,
  LocalTaxi as TaxiIcon,
  AirportShuttle as VanIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { getRouteWithCache } from '../../api/routing.api';
import { useAuthStore } from '../../stores/auth.store';
import { orderApi } from '../../api/order.api';
import type { VehicleType } from '../../types';

export function RideRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // 1. 從 sessionStorage 讀取上車點與下車點 (修復下車點丟失問題)
  const savedPickup = sessionStorage.getItem('pickupLocation');
  const savedPickupAddress = sessionStorage.getItem('pickupAddress');
  const savedDropoff = sessionStorage.getItem('dropoffLocation');
  const savedDropoffAddress = sessionStorage.getItem('dropoffAddress');

  const [pickupLocation] = useState<MapLocation | null>(
    savedPickup ? JSON.parse(savedPickup) : null
  );
  const [pickupAddress] = useState(savedPickupAddress || '未知上車點');
  
  const [dropoffLocation] = useState<MapLocation | null>(
    savedDropoff ? JSON.parse(savedDropoff) : null
  );
  const [dropoffAddress] = useState(savedDropoffAddress || '選取下車點');
  
  const [vehicleType, setVehicleType] = useState<VehicleType>('STANDARD');
  const [loading, setLoading] = useState(false);
  const [isSelectingVehicle, setIsSelectingVehicle] = useState(false); // 控制是否顯示車種選擇
  
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
    }
  }, [pickupLocation, dropoffLocation]);

  // 計算特定車種的預估車資（簡單合理的計費方式）
  const calculateFareForType = (type: VehicleType) => {
    if (!routeDistance && (!pickupLocation || !dropoffLocation)) return 0;
    
    // 距離（公里）
    const dist = routeDistance > 0 ? routeDistance / 1000 : 3;
    
    // 費率
    const rates = {
      STANDARD: { baseFare: 50, perKmRate: 15, minFare: 70 },
      PREMIUM: { baseFare: 80, perKmRate: 25, minFare: 120 },
      XL: { baseFare: 100, perKmRate: 30, minFare: 150 },
    };
    
    const rate = rates[type];
    const fare = rate.baseFare + (dist * rate.perKmRate);
    return Math.round(Math.max(fare, rate.minFare));
  };

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
        // 存儲訂單資訊以便在等待頁面使用 (與 WaitingPage 初始化邏輯對齊)
        sessionStorage.setItem('currentOrderPickup', JSON.stringify(pickupLocation));
        sessionStorage.setItem('currentOrderPickupAddress', pickupAddress);
        if (dropoffLocation) {
           sessionStorage.setItem('currentOrderDropoff', JSON.stringify(dropoffLocation));
           sessionStorage.setItem('currentOrderDropoffAddress', dropoffAddress);
        }
        
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
  if (pickupLocation) markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車' });
  if (dropoffLocation) markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車' });

  // 計算地圖邊界：若有起終點，顯示兩者範圍
  const mapBounds = useMemo(() => {
    if (pickupLocation && dropoffLocation) {
      return [pickupLocation, dropoffLocation] as [MapLocation, MapLocation];
    }
    return null;
  }, [pickupLocation, dropoffLocation]);

  // 如果在上一步剛選完下車點，地圖中心設在下車點或兩點之間
  const mapCenter = pickupLocation || { lat: 24.1618, lng: 120.6469 };

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
        {/* 頂部返回按鈕 (懸浮) */}
        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1100 }}>
            <Button 
                variant="contained" 
                color="inherit" 
                sx={{ minWidth: 40, width: 40, height: 40, borderRadius: '50%', bgcolor: 'white', color: 'black' }}
                onClick={() => {
                    if (isSelectingVehicle) setIsSelectingVehicle(false);
                    else navigate('/rider/home');
                }}
            >
                <ArrowBackIcon />
            </Button>
        </Box>

      {/* 全屏地圖 */}
       <LeafletMap
          center={mapCenter}
          zoom={14}
          markers={markers}
          routePath={routePath}
          bounds={mapBounds}
       />

      {/* 底部面板 */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#1a1a1a', 
        borderRadius: '24px 24px 0 0',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
        transition: 'transform 0.3s ease',
      }}>
        {/* 初始狀態 (選取車種按鈕) */}
        {!isSelectingVehicle ? (
            <Box sx={{ p: 3 }}>
                {/* 地址預覽 */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', mr: 2 }} />
                        <Typography color="white" fontWeight={500} noWrap>{pickupAddress}</Typography>
                    </Box>
                    <Box sx={{ ml: 0.5, borderLeft: '1px dashed #555', height: 16, mb: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                         <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', mr: 2 }} />
                         {dropoffLocation ? (
                             <Typography color="white" fontWeight={500} noWrap>{dropoffAddress}</Typography>
                         ) : (
                             <Typography color="grey.500">未設定下車點</Typography>
                         )}
                    </Box>
                </Box>

                <Button
                 fullWidth
                 variant="contained"
                 size="large"
                 onClick={() => setIsSelectingVehicle(true)}
                 disabled={!dropoffLocation}
                 sx={{ 
                   py: 1.5, 
                   fontSize: '1.1rem', 
                   fontWeight: 'bold', 
                   bgcolor: 'white', 
                   color: 'black',
                   '&:hover': { bgcolor: 'grey.200' },
                   '&:disabled': { bgcolor: 'grey.800', color: 'grey.600' }
                 }}
                >
                  選取車種
                </Button>
            </Box>
        ) : (
            // 車種選擇列表
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" color="white" sx={{ mb: 2, px: 1, fontWeight: 'bold' }}>
                    選擇車種
                </Typography>
                
                <List sx={{ mb: 2 }}>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton 
                          selected={vehicleType === 'STANDARD'}
                          onClick={() => setVehicleType('STANDARD')}
                          sx={{ 
                            borderRadius: 2, 
                            border: '2px solid',
                            borderColor: vehicleType === 'STANDARD' ? '#276ef1' : 'transparent',
                            bgcolor: vehicleType === 'STANDARD' ? 'rgba(39, 110, 241, 0.1)' : 'transparent'
                          }}
                        >
                            <ListItemIcon>
                                <Avatar sx={{ bgcolor: 'transparent' }}><CarIcon sx={{ color: 'white', fontSize: 30 }} /></Avatar>
                            </ListItemIcon>
                            <ListItemText 
                                primary={<Typography color="white" fontWeight="bold">UberX 菁英優步</Typography>}
                                secondary={<Typography color="grey.400" variant="caption">最近</Typography>}
                            />
                            <Typography color="white" fontWeight="bold">${calculateFareForType('STANDARD')}</Typography>
                            <Typography variant="caption" color="grey.500" sx={{ display: 'block', fontSize: '0.7rem', textAlign: 'right' }}>預估金額</Typography>
                        </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton 
                          selected={vehicleType === 'PREMIUM'}
                          onClick={() => setVehicleType('PREMIUM')}
                          sx={{ 
                            borderRadius: 2, 
                            border: '2px solid',
                            borderColor: vehicleType === 'PREMIUM' ? '#276ef1' : 'transparent',
                            bgcolor: vehicleType === 'PREMIUM' ? 'rgba(39, 110, 241, 0.1)' : 'transparent'
                          }}
                        >
                            <ListItemIcon>
                                <Avatar sx={{ bgcolor: 'transparent' }}><TaxiIcon sx={{ color: 'white', fontSize: 30 }} /></Avatar>
                            </ListItemIcon>
                            <ListItemText 
                                primary={<Typography color="white" fontWeight="bold">尊榮優步</Typography>}
                                secondary={<Typography color="grey.400" variant="caption">高品質車輛</Typography>}
                            />
                            <Typography color="white" fontWeight="bold">${calculateFareForType('PREMIUM')}</Typography>
                            <Typography variant="caption" color="grey.500" sx={{ display: 'block', fontSize: '0.7rem', textAlign: 'right' }}>預估金額</Typography>
                        </ListItemButton>
                    </ListItem>
                    
                    <ListItem disablePadding>
                        <ListItemButton 
                          selected={vehicleType === 'XL'}
                          onClick={() => setVehicleType('XL')}
                          sx={{ 
                            borderRadius: 2, 
                            border: '2px solid',
                            borderColor: vehicleType === 'XL' ? '#276ef1' : 'transparent',
                            bgcolor: vehicleType === 'XL' ? 'rgba(39, 110, 241, 0.1)' : 'transparent'
                          }}
                        >
                            <ListItemIcon>
                                <Avatar sx={{ bgcolor: 'transparent' }}><VanIcon sx={{ color: 'white', fontSize: 30 }} /></Avatar>
                            </ListItemIcon>
                            <ListItemText 
                                primary={<Typography color="white" fontWeight="bold">UberXL 大型</Typography>}
                                secondary={<Typography color="grey.400" variant="caption">適合多人或行李</Typography>}
                            />
                            <Typography color="white" fontWeight="bold">${calculateFareForType('XL')}</Typography>
                            <Typography variant="caption" color="grey.500" sx={{ display: 'block', fontSize: '0.7rem', textAlign: 'right' }}>預估金額</Typography>
                        </ListItemButton>
                    </ListItem>
                </List>

                <Button
                 fullWidth
                 variant="contained"
                 size="large"
                 onClick={handleRequestRide}
                 disabled={loading}
                 sx={{ 
                   py: 1.5, 
                   fontSize: '1.1rem', 
                   fontWeight: 'bold', 
                   bgcolor: '#276ef1', 
                   color: 'white',
                   '&:hover': { bgcolor: '#1f54c4' }
                 }}
                >
                  {loading ? '正在呼叫司機...' : '確認叫車'}
                </Button>
            </Box>
        )}
      </Box>
    </Box>
  );
}
