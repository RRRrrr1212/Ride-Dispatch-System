import { useRef, useEffect, useState, useCallback } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Add as ZoomInIcon, Remove as ZoomOutIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';

export interface MapLocation {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string;
  position: MapLocation;
  type: 'pickup' | 'dropoff' | 'driver' | 'passenger' | 'car';
  label?: string;
  color?: string;
}

interface SimulatedMapProps {
  center?: MapLocation;
  zoom?: number;
  markers?: MapMarker[];
  onMapClick?: (location: MapLocation) => void;
  selectionMode?: 'pickup' | 'dropoff' | null;
  showCenterPin?: boolean;
  onCenterChange?: (location: MapLocation) => void;
  animateDriverTo?: MapLocation | null;
  driverPosition?: MapLocation | null;
}

// 台中市區街道名稱
const STREETS = [
  '台灣大道', '文心路', '崇德路', '市政路', '惠中路',
  '河南路', '青海路', '西屯路', '中港路', '忠明路',
  '黎明路', '公益路', '五權路', '三民路', '向上路',
];

const DISTRICTS = ['西屯區', '北屯區', '南屯區', '西區', '北區', '中區', '南區', '東區'];

// 生成虛擬街道地址
function generateAddress(lat: number, lng: number): string {
  const streetIdx = Math.floor((lat * 1000) % STREETS.length);
  const districtIdx = Math.floor((lng * 1000) % DISTRICTS.length);
  const number = Math.floor((lat * lng * 10000) % 500) + 1;
  return `台中市${DISTRICTS[districtIdx]}${STREETS[streetIdx]}${number}號`;
}

export function SimulatedMap({
  center = { lat: 24.1618, lng: 120.6469 },
  zoom = 14,
  markers = [],
  onMapClick,
  selectionMode,
  showCenterPin = false,
  onCenterChange,
  animateDriverTo,
  driverPosition,
}: SimulatedMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [animatedDriverPos, setAnimatedDriverPos] = useState<MapLocation | null>(driverPosition || null);

  const WORLD_SCALE = 10000; // 地圖縮放係數

  // 座標轉換：經緯度 -> 畫布座標
  const latLngToCanvas = useCallback((loc: MapLocation, canvasWidth: number, canvasHeight: number) => {
    const scale = Math.pow(2, mapZoom - 10) * WORLD_SCALE;
    const x = (loc.lng - mapCenter.lng) * scale + canvasWidth / 2;
    const y = (mapCenter.lat - loc.lat) * scale + canvasHeight / 2;
    return { x, y };
  }, [mapCenter, mapZoom]);

  // 座標轉換：畫布座標 -> 經緯度
  const canvasToLatLng = useCallback((x: number, y: number, canvasWidth: number, canvasHeight: number): MapLocation => {
    const scale = Math.pow(2, mapZoom - 10) * WORLD_SCALE;
    const lng = (x - canvasWidth / 2) / scale + mapCenter.lng;
    const lat = mapCenter.lat - (y - canvasHeight / 2) / scale;
    return { lat, lng };
  }, [mapCenter, mapZoom]);

  // 繪製地圖
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清除畫布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const scale = Math.pow(2, mapZoom - 10) * WORLD_SCALE;

    // 繪製網格 (模擬街道)
    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 1;

    const gridSpacing = 0.005; // 約 500 公尺
    const startLat = Math.floor(mapCenter.lat / gridSpacing) * gridSpacing - gridSpacing * 10;
    const startLng = Math.floor(mapCenter.lng / gridSpacing) * gridSpacing - gridSpacing * 10;

    for (let i = 0; i < 20; i++) {
      const lat = startLat + i * gridSpacing;
      const { y } = latLngToCanvas({ lat, lng: mapCenter.lng }, width, height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const lng = startLng + i * gridSpacing;
      const { x } = latLngToCanvas({ lat: mapCenter.lat, lng }, width, height);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 繪製主要道路 (加粗)
    ctx.strokeStyle = '#3d3d5c';
    ctx.lineWidth = 3;

    const mainRoadSpacing = 0.02;
    for (let i = -5; i <= 5; i++) {
      const lat = Math.round(mapCenter.lat / mainRoadSpacing) * mainRoadSpacing + i * mainRoadSpacing;
      const { y } = latLngToCanvas({ lat, lng: mapCenter.lng }, width, height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      const lng = Math.round(mapCenter.lng / mainRoadSpacing) * mainRoadSpacing + i * mainRoadSpacing;
      const { x } = latLngToCanvas({ lat: mapCenter.lat, lng }, width, height);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 繪製地標建築物
    const landmarks = [
      { lat: 24.1618, lng: 120.6469, name: '台中市政府' },
      { lat: 24.1648, lng: 120.6400, name: '新光三越' },
      { lat: 24.1580, lng: 120.6520, name: '秋紅谷' },
      { lat: 24.1700, lng: 120.6350, name: '逢甲夜市' },
    ];

    landmarks.forEach(lm => {
      const { x, y } = latLngToCanvas({ lat: lm.lat, lng: lm.lng }, width, height);
      if (x > -50 && x < width + 50 && y > -50 && y < height + 50) {
        ctx.fillStyle = '#4a4a6a';
        ctx.fillRect(x - 15, y - 15, 30, 30);
        ctx.fillStyle = '#888';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name, x, y + 30);
      }
    });

    // 繪製標記
    const allMarkers = [...markers];
    
    // 添加動畫中的司機位置
    if (animatedDriverPos) {
      allMarkers.push({
        id: 'animated-driver',
        position: animatedDriverPos,
        type: 'driver',
        label: '司機',
      });
    }

    allMarkers.forEach(marker => {
      const { x, y } = latLngToCanvas(marker.position, width, height);
      
      if (x < -30 || x > width + 30 || y < -30 || y > height + 30) return;

      ctx.save();
      
      switch (marker.type) {
        case 'pickup':
          // 綠色上車點
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Inter';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('P', x, y);
          break;

        case 'dropoff':
          // 紅色下車點
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Inter';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('D', x, y);
          break;

        case 'driver':
        case 'car':
          // 黃色車輛圖標
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(x, y - 15);
          ctx.lineTo(x + 10, y + 10);
          ctx.lineTo(x - 10, y + 10);
          ctx.closePath();
          ctx.fill();
          // 車輛圖標
          ctx.fillStyle = '#000';
          ctx.font = '16px Inter';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚗', x, y);
          break;

        case 'passenger':
          // 藍色乘客圖標
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '12px Inter';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👤', x, y);
          break;
      }

      // 繪製標籤
      if (marker.label) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - 30, y + 15, 60, 18);
        ctx.fillStyle = '#fff';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(marker.label, x, y + 26);
      }

      ctx.restore();
    });

    // 繪製中心大頭針 (選點模式)
    if (showCenterPin) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = selectionMode === 'pickup' ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2 - 40);
      ctx.lineTo(width / 2 + 15, height / 2 - 10);
      ctx.lineTo(width / 2, height / 2);
      ctx.lineTo(width / 2 - 15, height / 2 - 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 地址提示
      const address = generateAddress(mapCenter.lat, mapCenter.lng);
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(width / 2 - 100, height / 2 + 10, 200, 25);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(address, width / 2, height / 2 + 26);
    }

  }, [mapCenter, mapZoom, markers, animatedDriverPos, showCenterPin, selectionMode, latLngToCanvas]);

  // 調整畫布大小
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawMap();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawMap]);

  // 監聽變化重繪
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // 司機移動動畫
  useEffect(() => {
    if (!animateDriverTo || !animatedDriverPos) return;

    const startPos = { ...animatedDriverPos };
    const endPos = animateDriverTo;
    const duration = 2000; // 2 秒
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 easeInOut 動畫曲線
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setAnimatedDriverPos({
        lat: startPos.lat + (endPos.lat - startPos.lat) * eased,
        lng: startPos.lng + (endPos.lng - startPos.lng) * eased,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [animateDriverTo]);

  // 初始化司機位置
  useEffect(() => {
    if (driverPosition && !animatedDriverPos) {
      setAnimatedDriverPos(driverPosition);
    }
  }, [driverPosition]);

  // 拖曳事件
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const scale = Math.pow(2, mapZoom - 10) * WORLD_SCALE;

    setMapCenter(prev => ({
      lat: prev.lat + dy / scale,
      lng: prev.lng - dx / scale,
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onCenterChange?.(mapCenter);
    }
  };

  // 點擊選點
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const location = canvasToLatLng(x, y, canvas.width, canvas.height);
    onMapClick?.(location);
  };

  // 縮放
  const handleZoomIn = () => setMapZoom(z => Math.min(z + 1, 18));
  const handleZoomOut = () => setMapZoom(z => Math.max(z - 1, 10));
  const handleRecenter = () => setMapCenter(center);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 300,
        borderRadius: 2,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{ display: 'block' }}
      />

      {/* 縮放控制 */}
      <Box sx={{ position: 'absolute', right: 10, top: 10, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <IconButton size="small" onClick={handleZoomIn} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
          <ZoomInIcon />
        </IconButton>
        <IconButton size="small" onClick={handleZoomOut} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
          <ZoomOutIcon />
        </IconButton>
        <IconButton size="small" onClick={handleRecenter} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
          <MyLocationIcon />
        </IconButton>
      </Box>

      {/* 選點模式提示 */}
      {selectionMode && (
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: selectionMode === 'pickup' ? 'success.main' : 'error.main',
          color: '#fff',
          px: 2,
          py: 0.5,
          borderRadius: 1,
        }}>
          <Typography variant="body2">
            {selectionMode === 'pickup' ? '📍 選擇上車地點' : '🎯 選擇下車地點'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// 導出地址生成函數
export { generateAddress };
