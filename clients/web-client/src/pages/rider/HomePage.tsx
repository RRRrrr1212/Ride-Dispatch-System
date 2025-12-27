import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputBase,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
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
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* 全屏地圖 */}
      <LeafletMap
        center={{ lat: 24.1618, lng: 120.6469 }}  // 台中市政府
        zoom={15}
        markers={selectionMode ? [] : markers}
        selectionMode={selectionMode}
        showCenterPin={selectionMode !== null}
        onCenterChange={handleCenterChange}
      />

      {/* 底部面板 */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#1a1a1a', // 深色主題
        borderRadius: '24px 24px 0 0',
        p: 2,
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
      }}>
        {/* 拖曳指示條 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box sx={{ width: 40, height: 4, bgcolor: 'grey.700', borderRadius: 2 }} />
        </Box>

        {!selectionMode ? (
          <>
            <Typography variant="h5" fontWeight="bold" color="white" sx={{ mb: 2, px: 1 }}>
              你好！要去哪裡？
            </Typography>

            {/* 搜尋欄位 */}
            <Paper
              onClick={handleStartSelection}
              sx={{
                p: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                bgcolor: '#2a2a2a', // 深色輸入框
                borderRadius: 3,
                mb: 3,
                cursor: 'pointer',
                boxShadow: 'none',
              }}
            >
              <IconButton sx={{ p: '10px', color: 'white' }} aria-label="search">
                <SearchIcon />
              </IconButton>
              <InputBase
                sx={{ ml: 1, flex: 1, color: 'white', fontWeight: 500 }}
                placeholder="搜尋目的地"
                readOnly
                inputProps={{ style: { cursor: 'pointer' } }}
              />
              <IconButton 
                type="button" 
                sx={{ p: '10px', color: 'white', bgcolor: '#333', mr: 0.5, '&:hover': { bgcolor: '#444' } }}
              >
                 <ScheduleIcon fontSize="small" />
              </IconButton>
            </Paper>

            {/* 快捷地點 */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1, overflowX: 'auto', pb: 1 }}>
               <Box 
                 sx={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: 1.5, 
                   bgcolor: '#2a2a2a', 
                   px: 2, 
                   py: 1, 
                   borderRadius: 10,
                   color: 'white',
                   minWidth: 'fit-content',
                 }}
               >
                 <Box sx={{ bgcolor: '#333', p: 0.5, borderRadius: '50%', display: 'flex' }}>
                   <WorkIcon fontSize="small" sx={{ color: 'grey.300' }} />
                 </Box>
                 <Typography variant="body2" fontWeight={500}>公司</Typography>
               </Box>
               
               <Box 
                 sx={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: 1.5, 
                   bgcolor: '#2a2a2a', 
                   px: 2, 
                   py: 1, 
                   borderRadius: 10,
                   color: 'white',
                   minWidth: 'fit-content',
                 }}
               >
                 <Box sx={{ bgcolor: '#333', p: 0.5, borderRadius: '50%', display: 'flex' }}>
                   <HomeIcon fontSize="small" sx={{ color: 'grey.300' }} />
                 </Box>
                 <Typography variant="body2" fontWeight={500}>家</Typography>
               </Box>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="h6" color="white" sx={{ mb: 1, px: 1 }}>
              設定上車地點
            </Typography>
            
            <Box sx={{ 
              bgcolor: '#2a2a2a', 
              borderRadius: 3, 
              p: 2, 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2 
            }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'success.main',
                flexShrink: 0 
              }} />
              
              <Box sx={{ flex: 1 }}>
                {isLoadingAddress ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} color="inherit" sx={{ color: 'grey.500' }} />
                    <Typography variant="body2" color="grey.500">
                      查詢地址中...
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body1" color="white" fontWeight={500}>
                    {pickupAddress || '拖曳地圖選擇位置'}
                  </Typography>
                )}
                {!isLoadingAddress && pickupAddress && (
                  <Typography variant="caption" color="grey.500">
                    鄰近的地標
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setSelectionMode(null)}
                sx={{ flex: 1, color: 'white', borderColor: 'grey.700', py: 1.5, borderRadius: 2 }}
              >
                取消
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmLocation}
                disabled={!pickupLocation || isLoadingAddress}
                sx={{ 
                  flex: 2, 
                  py: 1.5, 
                  borderRadius: 2, 
                  bgcolor: 'white', 
                  color: 'black',
                  fontWeight: 'bold',
                  '&:hover': { bgcolor: 'grey.200' },
                  '&:disabled': { bgcolor: 'grey.800', color: 'grey.600' }
                }}
              >
                確認上車點
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
