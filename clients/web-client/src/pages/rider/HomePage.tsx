import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  InputBase,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapLocation, MapMarker } from '../../components/map/LeafletMap';
import { reverseGeocodeWithCache } from '../../api/geocoding.api';

export function HomePage() {
  const navigate = useNavigate();
  
  const [pickupLocation, setPickupLocation] = useState<MapLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<MapLocation | null>(null);
  
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [dropoffAddress, setDropoffAddress] = useState<string>('');
  
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // 檢查是否有進行中的訂單 (防止刷新或誤觸首頁導致狀態丟失)
  useEffect(() => {
    const activeOrderId = sessionStorage.getItem('activeOrderId');
    if (activeOrderId) {
       // 簡單檢查一下訂單是否存在 (Optional: 可以 call API 確認狀態)
       // 這裡直接導回 WaitingPage，由 WaitingPage 負責狀態分流 (ONGOING/COMPLETED etc.)
       navigate(`/rider/waiting/${activeOrderId}`);
    }
  }, [navigate]);

  // 開始搜尋 -> 初始化狀態
  const handleStartSelection = () => {
    setSelectionMode('pickup');
    // 保留上車點(如果有的話)，重置下車點
    setDropoffLocation(null);
    setDropoffAddress('');
  };

  const [isTyping, setIsTyping] = useState(false); // 是否正在手動輸入

  // 當地圖中心移動時查詢地址
  const handleCenterChange = useCallback(async (location: MapLocation) => {
    if (!selectionMode) return;

    // 如果正在手動輸入，不更新地址，避免蓋掉用戶輸入
    if (isTyping) return;

    setIsLoadingAddress(true);
    const isPickup = selectionMode === 'pickup';
    
    if (isPickup) {
      setPickupLocation(location);
      sessionStorage.setItem('pickupLocation', JSON.stringify(location));
    } else {
      setDropoffLocation(location);
      sessionStorage.setItem('dropoffLocation', JSON.stringify(location));
    }

    try {
      const address = await reverseGeocodeWithCache(location.lat, location.lng);
      
      if (isPickup) {
        setPickupAddress(address);
        sessionStorage.setItem('pickupAddress', address);
      } else {
        setDropoffAddress(address);
        sessionStorage.setItem('dropoffAddress', address);
      }
    } catch (error) {
      console.error('地址查詢失敗:', error);
      const fallback = `(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`;
      if (isPickup) {
          setPickupAddress(fallback);
          sessionStorage.setItem('pickupAddress', fallback);
      } else {
          setDropoffAddress(fallback);
          sessionStorage.setItem('dropoffAddress', fallback);
      }
    } finally {
      setIsLoadingAddress(false);
    }
  }, [selectionMode, isTyping]);

  // 手動輸入地址變更
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (selectionMode === 'pickup') setPickupAddress(val);
    else setDropoffAddress(val);
  };

  // 執行地址搜尋
  const handleAddressSearch = async () => {
    const query = selectionMode === 'pickup' ? pickupAddress : dropoffAddress;
    if (!query) return;

    setIsLoadingAddress(true);
    try {
        // 這裡需要引入 geocode 函數，確保 import 有包含
        const { geocode } = await import('../../api/geocoding.api');
        
        // 優先搜尋當前選點附近的結果
        // 如果是選 pickup，參考當前的 pickupLocation (即地圖視野中心)
        // 如果是選 dropoff，優先參考 pickupLocation (上車點附近)，其次是當前的 dropoffLocation
        const searchReference = selectionMode === 'pickup' 
            ? (pickupLocation || { lat: 24.1618, lng: 120.6469 })
            : (pickupLocation || dropoffLocation || { lat: 24.1618, lng: 120.6469 });

        const result = await geocode(query, searchReference);
        
        if (result) {
            setIsTyping(false); // 搜尋完成，恢復地圖同步
            
            // 更新中心點，這會觸發 LeafletMap 的 useEffect 移動地圖
            // 然後 handleCenterChange 會再次被觸發 (因為地圖動了且 isTyping=false)，完成地址確認
            if (selectionMode === 'pickup') {
                setPickupLocation(result);
            } else {
                setDropoffLocation(result);
            }
        } else {
            alert('找不到此地點');
        }
    } catch (e) {
        console.error(e);
        alert('搜尋失敗');
    } finally {
        setIsLoadingAddress(false);
    }
  };

  // 恢復地圖選點模式 (點擊右側 icon)
  const handleMapModeClick = () => {
    setIsTyping(false);
    // 這裡其實不需要做什麼，因為只要 isTyping 為 false，
    // 下一次地圖移動就會更新地址。
    // 如果想要立即更新為當前地圖中心地址，可能需要從 storage 或狀態強制刷一次，
    // 但最簡單的是用戶稍微拖一下地圖就好了。
    // 或者我們可以不變，僅僅是退出輸入狀態。
  };

  // 確認選擇
  const handleConfirmLocation = () => {
    if (selectionMode === 'pickup' && pickupLocation) {
      setSelectionMode('dropoff');
    } else if (selectionMode === 'dropoff' && dropoffLocation) {
      sessionStorage.setItem('dropoffLocation', JSON.stringify(dropoffLocation));
      if (!sessionStorage.getItem('dropoffAddress')) {
          sessionStorage.setItem('dropoffAddress', dropoffAddress);
      }
      navigate('/rider/request');
    }
  };

  const markers: MapMarker[] = [];
  if (pickupLocation) markers.push({ id: 'pickup', position: pickupLocation, type: 'pickup', label: '上車點' });
  if (dropoffLocation && selectionMode !== 'dropoff') markers.push({ id: 'dropoff', position: dropoffLocation, type: 'dropoff', label: '下車點' });

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* 全屏地圖 */}
      <LeafletMap
        center={
           // 當手動搜尋更新 location 時，這裡會傳入新的 center，地圖會飛過去
           (selectionMode === 'pickup' ? pickupLocation : dropoffLocation) || { lat: 24.1618, lng: 120.6469 }
        }
        zoom={16}
        markers={selectionMode === 'pickup' ? [] : (selectionMode === 'dropoff' ? markers.filter(m => m.type === 'pickup') : markers)}
        selectionMode={selectionMode}
        showCenterPin={selectionMode !== null && !isTyping} // 輸入時隱藏大頭針？或者保持顯示但不動
        onCenterChange={handleCenterChange}
      />

      {/* 底部面板 */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#1a1a1a', 
        borderRadius: '16px 16px 0 0', 
        p: 2,
        pb: 3, 
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
      }}>
        {/* 拖曳指示條 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Box sx={{ width: 32, height: 4, bgcolor: 'grey.700', borderRadius: 2 }} />
        </Box>

        {!selectionMode ? (
          <>
            <Typography variant="h6" fontWeight="bold" color="white" sx={{ mb: 2, px: 1 }}>
              你好！要去哪裡？
            </Typography>

            {/* 搜尋欄位 */}
            <Paper
              onClick={handleStartSelection}
              sx={{
                p: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                bgcolor: '#2a2a2a',
                borderRadius: 3,
                mb: 2,
                cursor: 'pointer',
                boxShadow: 'none',
                border: '1px solid #333',
                transition: 'background 0.2s',
                '&:active': { bgcolor: '#333' }
              }}
            >
              <SearchIcon sx={{ color: 'white', mr: 1.5 }} />
              <Typography color="grey.400" sx={{ flex: 1, fontWeight: 500, fontSize: '1.1rem' }}>
                搜尋目的地
              </Typography>
              <Box sx={{ bgcolor: '#333', p: 0.5, borderRadius: 2 }}>
                 <ScheduleIcon fontSize="small" sx={{ color: 'white' }} />
              </Box>
            </Paper>
            {/* 已移除快捷按鈕區塊 */}
          </>
        ) : (
          <>
            {/* 選點模式標題 */}
            <Typography variant="subtitle1" color="white" sx={{ mb: 1.5, px: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectionMode === 'pickup' ? '🟢 設定上車地點' : '🔴 設定下車地點'}
            </Typography>
            
            {/* 可輸入的地址搜尋框 */}
            <Paper sx={{ 
              bgcolor: '#2a2a2a', 
              borderRadius: 2, 
              p: '4px 8px', 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              border: '1px solid #333',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
            }}>
               <InputBase
                  sx={{ ml: 1, flex: 1, color: 'white', fontWeight: 500 }}
                  placeholder={selectionMode === 'pickup' ? "輸入上車地點" : "輸入下車地點"}
                  value={selectionMode === 'pickup' ? pickupAddress : dropoffAddress}
                  onChange={handleAddressChange}
                  onFocus={() => setIsTyping(true)}
                  // onBlur={() => setIsTyping(false)} // Blur時可能還沒搜尋，先不強制關閉
                  onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
               />
               
               {/* 功能按鈕：Loading -> (輸入中且有文字) ? 搜尋 : 地圖選點(退出輸入) */}
               {(() => {
                   const currentAddr = selectionMode === 'pickup' ? pickupAddress : dropoffAddress;
                   const hasText = currentAddr && currentAddr.length > 0;
                   
                   if (isLoadingAddress) {
                       return (
                           <IconButton disabled sx={{ p: 1 }}>
                               <CircularProgress size={20} sx={{ color: 'grey.500' }} />
                           </IconButton>
                       );
                   }
                   
                   if (isTyping && hasText) {
                       return (
                           <IconButton onClick={handleAddressSearch} sx={{ color: 'white', bgcolor: '#276ef1', '&:hover': { bgcolor: '#1f54c4' }, p: 1 }}>
                               <SearchIcon fontSize="small" />
                           </IconButton>
                       );
                   }
                   
                   return (
                       <IconButton onClick={handleMapModeClick} sx={{ color: 'white', bgcolor: '#333', '&:hover': { bgcolor: '#444' }, p: 1 }} title="使用地圖選點">
                           <LocationIcon fontSize="small" />
                       </IconButton>
                   );
               })()}
            </Paper>

            {/* 操作按鈕 */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => {
                   if (selectionMode === 'dropoff') {
                     setSelectionMode('pickup'); 
                     // 切換回 pickup 時，可能需要恢復輸入框的值為 pickupAddress
                     // React state 會自動處理
                   } else {
                     setSelectionMode(null);
                   }
                }}
                sx={{ 
                  flex: 1, 
                  color: 'white', 
                  borderColor: 'grey.700', 
                  py: 1.2, 
                  borderRadius: 2,
                  '&:hover': { borderColor: 'grey.500', bgcolor: 'rgba(255,255,255,0.05)' }
                }}
              >
                {selectionMode === 'dropoff' ? '上一步' : '取消'}
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmLocation}
                disabled={isLoadingAddress}
                sx={{ 
                  flex: 2, 
                  py: 1.2, 
                  borderRadius: 2, 
                  bgcolor: selectionMode === 'pickup' ? 'white' : '#ef5350', 
                  color: selectionMode === 'pickup' ? 'black' : 'white',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  '&:hover': { 
                    bgcolor: selectionMode === 'pickup' ? 'grey.200' : '#d32f2f' 
                  }
                }}
              >
                {selectionMode === 'pickup' ? '確認上車點' : '確認下車點'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
