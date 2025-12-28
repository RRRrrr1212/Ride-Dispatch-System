import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { Add as ZoomInIcon, Remove as ZoomOutIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';

// 繼承 SimulatedMap 的介面以便兼容
export interface MapLocation {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string;
  position: MapLocation;
  type: 'pickup' | 'dropoff' | 'driver' | 'passenger' | 'car' | 'user';
  label?: string;
  color?: string;
}

interface LeafletMapProps {
  center?: MapLocation;
  zoom?: number;
  markers?: MapMarker[];
  routePath?: MapLocation[];           // 路徑座標陣列 (用於顯示路線)
  driverPosition?: MapLocation | null; // 司機即時位置
  onMapClick?: (location: MapLocation) => void;
  onCenterChange?: (location: MapLocation) => void;
  selectionMode?: 'pickup' | 'dropoff' | null;
  showCenterPin?: boolean;
  loading?: boolean;
  loadingText?: string;
  bounds?: MapLocation[] | null; // 多點邊界，可用於自動縮放包含所有點
  bottomOffset?: number; // 底部偏移量 (px)，用於適應底部 Sheet
  topOffset?: number;    // 頂部偏移量 (px)，用於避開頂部 UI (如司機狀態開關)
  disableAutoCenter?: boolean; // 禁用自動置中，讓用戶可以自由拖動地圖
}

// 修復 Leaflet 預設圖標問題
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 自定義圖標
const createIcon = (color: string, emoji: string, extraClassName: string = '') => {
  return L.divIcon({
    className: `custom-marker ${extraClassName}`.trim(),
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 18px;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// 各類型標記的圖標
const pickupIcon = createIcon('#22c55e', 'P');
const dropoffIcon = createIcon('#ef4444', 'D');
const driverIcon = createIcon('#fbbf24', '🚗', 'driver-marker');
const passengerIcon = createIcon('#3b82f6', '👤');
const carIcon = createIcon('#f59e0b', '🚗', 'driver-marker');

// 用戶位置專屬圖標 - 藍色脈動效果
const userIcon = L.divIcon({
  className: 'user-location-icon',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 40px;
        height: 40px;
        background: rgba(59, 130, 246, 0.25);
        border-radius: 50%;
        animation: userPulse 2s infinite;
      "></div>
      <div style="
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #60a5fa, #3b82f6);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
        z-index: 1;
      "></div>
    </div>
    <style>
      @keyframes userPulse {
        0% { transform: scale(0.8); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.4; }
        100% { transform: scale(0.8); opacity: 1; }
      }
    </style>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// 取得標記對應的圖標
const getMarkerIcon = (type: MapMarker['type']) => {
  switch (type) {
    case 'pickup': return pickupIcon;
    case 'dropoff': return dropoffIcon;
    case 'driver': return driverIcon;
    case 'passenger': return passengerIcon;
    case 'car': return carIcon;
    case 'user': return userIcon;
    default: return pickupIcon;
  }
};

// 地圖事件處理組件
function MapEventHandler({ 
  onMapClick, 
  onCenterChange 
}: { 
  onMapClick?: (location: MapLocation) => void;
  onCenterChange?: (location: MapLocation) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    moveend: () => {
      const center = map.getCenter();
      onCenterChange?.({ lat: center.lat, lng: center.lng });
    },
  });

  return null;
}

// 地圖控制組件 - 用於程式化控制地圖
function MapController({ 
  center, 
  zoom,
  bounds,
  bottomOffset = 0,
  disableAutoCenter = false,
}: { 
  center: MapLocation; 
  zoom: number;
  bounds?: MapLocation[] | null;
  bottomOffset?: number;
  disableAutoCenter?: boolean;
}) {
  const map = useMap();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // 如果禁用了自動置中，直接返回
    if (disableAutoCenter) return;

    // 優先處理邊界縮放 (fitBounds)
    if (bounds && bounds.length > 0) {
      const leafletBounds = L.latLngBounds(
        bounds.map(b => L.latLng(b.lat, b.lng))
      );
      
      if (leafletBounds.isValid()) {
        map.fitBounds(leafletBounds, { 
          paddingTopLeft: [50, 50],
          paddingBottomRight: [50, 50 + bottomOffset], // 底部留白，避開面板
          maxZoom: 16,
          animate: true,
          duration: 1
        });
        hasInitializedRef.current = true;
        return; 
      }
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    const currentCenter = map.getCenter();
    const distance = map.distance([center.lat, center.lng], currentCenter);

    if (distance > 50) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [map, center, zoom, bounds, bottomOffset, disableAutoCenter]);

  return null;
}

// 中心大頭針組件
function CenterPin({ mode }: { mode: 'pickup' | 'dropoff' | null }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '3px solid white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'bounce 0.5s ease-in-out infinite alternate',
          '@keyframes bounce': {
            '0%': { transform: 'translateY(0)' },
            '100%': { transform: 'translateY(-8px)' },
          },
        }}
      >
        <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>
          {mode === 'pickup' ? '📍' : '🎯'}
        </Typography>
      </Box>
      {/* 大頭針尖端 */}
      <Box
        sx={{
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '15px solid black',
          margin: '0 auto',
          marginTop: '-2px',
        }}
      />
    </Box>
  );
}

export function LeafletMap({
  center = { lat: 24.1618, lng: 120.6469 }, // 台中市政府
  zoom = 15,
  markers = [],
  routePath,
  driverPosition,
  onMapClick,
  onCenterChange,
  selectionMode,
  showCenterPin = false,
  loading = false,
  loadingText = '載入中...',
  bounds,
  bottomOffset = 0,
  topOffset = 10,
  disableAutoCenter = false,
}: LeafletMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // 縮放控制
  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleRecenter = useCallback(() => {
    mapRef.current?.flyTo([center.lat, center.lng], zoom, { duration: 0.5 });
  }, [center, zoom]);

  // 組合所有標記 (包含司機位置)
  const allMarkers: MapMarker[] = [...markers];
  if (driverPosition) {
    allMarkers.push({
      id: 'driver-position',
      position: driverPosition,
      type: 'car',
      label: '司機',
    });
  }

  // Debug Log
  useEffect(() => {
    console.log('🗺️ LeafletMap Render:', { 
      center, 
      userMarker: allMarkers.find(m => m.id === 'user'),
      totalMarkers: allMarkers.length 
    });
  }, [center, allMarkers]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 300,
        borderRadius: 2,
        overflow: 'hidden',
        '& .leaflet-container': {
          height: '100%',
          width: '100%',
          borderRadius: 'inherit',
        },
        // 自定義標記樣式
        '& .custom-marker': {
          background: 'none',
          border: 'none',
        },
      }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        whenReady={() => setMapReady(true)}
        zoomControl={false}
      >
        {/* 地圖圖層 - OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 事件處理 */}
        <MapEventHandler onMapClick={onMapClick} onCenterChange={onCenterChange} />

        {/* 地圖控制器 */}
        <MapController center={center} zoom={zoom} bounds={bounds} bottomOffset={bottomOffset} disableAutoCenter={disableAutoCenter} />

        {/* 渲染路徑線 */}
        {routePath && routePath.length > 1 && (
          <Polyline
            positions={routePath.map(p => [p.lat, p.lng] as L.LatLngTuple)}
            color="#3b82f6"
            weight={5}
            opacity={0.8}
            dashArray="10, 5"
          />
        )}

        {/* 渲染標記點 */}
        {allMarkers.map(marker => (
          <Marker
            key={marker.id}
            position={[marker.position.lat, marker.position.lng]}
            icon={getMarkerIcon(marker.type)}
          >
            {marker.label && <Popup>{marker.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>

      {/* 中心大頭針 (選點模式) */}
      {showCenterPin && selectionMode && <CenterPin mode={selectionMode} />}

      {/* 縮放控制按鈕 */}
      {mapReady && (
        <Box
          sx={{
            position: 'absolute',
            right: 10,
            top: topOffset,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            zIndex: 1000,
          }}
        >
          <IconButton
            size="small"
            onClick={handleZoomIn}
            sx={{
              bgcolor: 'rgba(255,255,255,0.9)',
              color: '#333',
              '&:hover': { bgcolor: 'white' },
              boxShadow: 2,
            }}
          >
            <ZoomInIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleZoomOut}
            sx={{
              bgcolor: 'rgba(255,255,255,0.9)',
              color: '#333',
              '&:hover': { bgcolor: 'white' },
              boxShadow: 2,
            }}
          >
            <ZoomOutIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleRecenter}
            sx={{
              bgcolor: 'rgba(255,255,255,0.9)',
              color: '#333',
              '&:hover': { bgcolor: 'white' },
              boxShadow: 2,
            }}
          >
            <MyLocationIcon />
          </IconButton>
        </Box>
      )}

      {/* 選點模式提示 */}
      {selectionMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 24, // 稍微往下移一點，避開瀏覽器邊緣
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(0,0,0,0.85)', // 深黑色透明背景
            color: '#fff',
            px: 2.5,
            py: 1.2,
            borderRadius: 8,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            backdropFilter: 'blur(8px)',
            whiteSpace: 'nowrap', // 強制不換行
            maxWidth: '90%',      // 避免在極小螢幕溢出
            justifyContent: 'center',
          }}
        >
          {/* 小圓點指示器 (綠色/紅色) */}
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: selectionMode === 'pickup' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
          <Typography variant="body2" fontWeight={500} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectionMode === 'pickup' ? '拖動地圖選擇上車地點' : '拖動地圖選擇下車地點'}
          </Typography>
        </Box>
      )}

      {/* 載入狀態 */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <CircularProgress sx={{ color: 'white', mb: 2 }} />
          <Typography color="white">{loadingText}</Typography>
        </Box>
      )}
    </Box>
  );
}

export default LeafletMap;
