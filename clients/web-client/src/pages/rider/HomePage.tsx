import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';

export function HomePage() {
  const navigate = useNavigate();
  
  const [pickupLocation, setPickupLocation] = useState<MapLocation | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const handleStartSelection = () => {
    setSelectionMode('pickup');
  };

  // 使用真實地址查詢
  const handleCenterChange = useCallback(async (location: MapLocation) => {
    if (selectionMode === 'pickup') {
      setPickupLocation(location);
      setIsLoadingAddress(true);
      try {
        const address = await reverseGeocodeWithCache(location.lat, location.lng);
        setPickupAddress(address);
        // 存儲到 sessionStorage 以便在叫車頁面使用
        sessionStorage.setItem('pickupLocation', JSON.stringify(location));
        sessionStorage.setItem('pickupAddress', address);
      } catch (error) {
        console.error('地址查詢失敗:', error);
        setPickupAddress(`(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`);
      } finally {
        setIsLoadingAddress(false);
      }
    }
  }, [selectionMode]);

  const handleConfirmLocation = () => {
    if (pickupLocation) {
      navigate('/rider/request');
    }
  };

  const markers: MapMarker[] = pickupLocation ? [
    { id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車點' }
  ] : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地圖區域 - 使用 OpenStreetMap */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <LeafletMap
          center={{ lat: 24.1618, lng: 120.6469 }}  // 台中市政府
          zoom={15}
          markers={selectionMode ? [] : markers}  // 選點模式時不顯示標記，因為有中心大頭針
          selectionMode={selectionMode}
          showCenterPin={selectionMode !== null}
          onCenterChange={handleCenterChange}
        />
      </Box>

      {/* 底部卡片 */}
      <Card sx={{ borderRadius: '16px 16px 0 0', mt: -2, position: 'relative', zIndex: 1 }}>
        <CardContent sx={{ p: 2 }}>
          {!selectionMode ? (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                你好！要去哪裡？
              </Typography>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleStartSelection}
                data-testid="btn-start-ride"
              >
                開始叫車
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                📍 上車地點
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, minHeight: 24 }}>
                {isLoadingAddress ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      查詢地址中...
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {pickupAddress || '拖曳地圖選擇位置'}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setSelectionMode(null)}
                  sx={{ flex: 1 }}
                >
                  取消
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmLocation}
                  disabled={!pickupLocation || isLoadingAddress}
                  sx={{ flex: 1 }}
                  data-testid="btn-confirm-pickup"
                >
                  確認上車點
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
