# 10. OpenStreetMap 地圖整合與車輛即時移動

## 📋 概述

本文件描述如何將目前的模擬地圖 (`SimulatedMap`) 替換為真實的 OpenStreetMap，並實現「車輛沿著真實道路移動」的動畫效果。

### 目標
1. 使用 OpenStreetMap 顯示真實地圖
2. 使用 OSRM API 取得路徑規劃 (沿道路的座標點)
3. 實現車輛沿著道路平滑移動的動畫
4. 支援反向地理編碼 (Reverse Geocoding) 顯示真實地址

---

## 🛠️ 技術選型

| 項目 | 技術 | 說明 |
|------|------|------|
| 地圖顯示 | Leaflet + react-leaflet | 最流行的開源地圖庫，支援 OSM |
| 圖資來源 | OpenStreetMap | 免費開源地圖圖資 |
| 路徑規劃 | OSRM (Open Source Routing Machine) | 免費路徑規劃 API |
| 地址查詢 | Nominatim | OSM 官方的地理編碼服務 |

---

## 📦 需要安裝的套件

```bash
cd clients/web-client
npm install leaflet react-leaflet @types/leaflet
```

---

## 🗺️ 實作步驟

### Phase 1: 基礎地圖組件 (預計 1-2 小時)

#### 1.1 建立 LeafletMap 組件

**檔案**: `src/components/map/LeafletMap.tsx`

```tsx
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  routePath?: { lat: number; lng: number }[];  // 路徑座標陣列
  driverPosition?: { lat: number; lng: number };
  onMapClick?: (location: { lat: number; lng: number }) => void;
}

export function LeafletMap({ center, zoom = 15, markers, routePath, driverPosition, onMapClick }: LeafletMapProps) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* 渲染標記點 */}
      {markers?.map(marker => (
        <Marker key={marker.id} position={[marker.position.lat, marker.position.lng]}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
      {/* 渲染路徑線 */}
      {routePath && (
        <Polyline positions={routePath.map(p => [p.lat, p.lng])} color="blue" weight={4} />
      )}
      {/* 渲染司機位置 */}
      {driverPosition && (
        <Marker position={[driverPosition.lat, driverPosition.lng]} icon={carIcon}>
          <Popup>司機位置</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
```

#### 1.2 自定義車輛圖標

```tsx
const carIcon = L.icon({
  iconUrl: '/car-icon.png',  // 需要準備一個車輛圖標
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
```

#### 1.3 修改 CSS 引入

在 `src/main.tsx` 或 `src/index.css` 中加入：

```css
@import 'leaflet/dist/leaflet.css';
```

---

### Phase 2: 路徑規劃 API (預計 1 小時)

#### 2.1 建立 OSRM API 服務

**檔案**: `src/api/routing.api.ts`

```typescript
const OSRM_BASE_URL = 'https://router.project-osrm.org';

export interface RouteResult {
  distance: number;      // 距離 (公尺)
  duration: number;      // 時間 (秒)
  coordinates: { lat: number; lng: number }[];  // 路徑座標點
}

/**
 * 取得兩點之間的行駛路徑
 */
export async function getRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteResult> {
  const url = `${OSRM_BASE_URL}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error('無法取得路徑');
  }

  const route = data.routes[0];
  const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));

  return {
    distance: route.distance,
    duration: route.duration,
    coordinates,
  };
}
```

#### 2.2 OSRM API 說明

- **免費使用**: OSRM 提供免費的公開 Demo Server
- **請求格式**: `GET /route/v1/driving/{起點經度},{起點緯度};{終點經度},{終點緯度}`
- **回傳格式**: GeoJSON 座標陣列
- **限制**: Demo Server 有流量限制，正式上線時可自建 OSRM Server

---

### Phase 3: 車輛移動動畫 (預計 2 小時)

#### 3.1 建立動畫 Hook

**檔案**: `src/hooks/useAnimatedPosition.ts`

```typescript
import { useState, useEffect, useRef } from 'react';

interface Position {
  lat: number;
  lng: number;
}

/**
 * 讓物件沿著路徑座標點平滑移動
 * @param path - 路徑座標陣列
 * @param speed - 移動速度 (每秒移動幾個座標點)
 * @param enabled - 是否啟用動畫
 */
export function useAnimatedPosition(
  path: Position[] | null,
  speed: number = 10,
  enabled: boolean = true
): Position | null {
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!path || path.length === 0 || !enabled) {
      if (path?.[0]) setCurrentPosition(path[0]);
      return;
    }

    indexRef.current = 0;
    setCurrentPosition(path[0]);

    const interval = setInterval(() => {
      indexRef.current += 1;

      if (indexRef.current >= path.length) {
        clearInterval(interval);
        setCurrentPosition(path[path.length - 1]);
        return;
      }

      setCurrentPosition(path[indexRef.current]);
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [path, speed, enabled]);

  return currentPosition;
}
```

#### 3.2 使用範例

```tsx
function TripPage() {
  const [routePath, setRoutePath] = useState<Position[]>([]);
  
  // 當訂單狀態變為 ACCEPTED，取得路徑
  useEffect(() => {
    if (order?.status === 'ACCEPTED' && pickupLocation && driverInitialLocation) {
      getRoute(driverInitialLocation, pickupLocation).then(result => {
        setRoutePath(result.coordinates);
      });
    }
  }, [order?.status]);

  // 使用動畫 Hook 取得當前司機位置
  const animatedDriverPos = useAnimatedPosition(routePath, 15, true);

  return (
    <LeafletMap
      center={pickupLocation}
      markers={markers}
      routePath={routePath}          // 顯示路徑線
      driverPosition={animatedDriverPos}  // 車輛會沿著路徑移動
    />
  );
}
```

---

### Phase 4: 地址查詢 (反向地理編碼) (預計 30 分鐘)

#### 4.1 建立 Nominatim API 服務

**檔案**: `src/api/geocoding.api.ts`

```typescript
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

/**
 * 將經緯度轉換為真實地址
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'RideDispatchSystem/1.0' }  // Nominatim 要求 User-Agent
  });
  const data = await response.json();

  return data.display_name || `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * 將地址轉換為經緯度
 */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'RideDispatchSystem/1.0' }
  });
  const data = await response.json();

  if (data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}
```

---

## 📁 檔案結構

完成後的新增/修改檔案：

```
clients/web-client/src/
├── components/
│   └── map/
│       ├── LeafletMap.tsx       # 新增: Leaflet 地圖組件
│       ├── SimulatedMap.tsx     # 保留: 作為備用
│       └── index.ts             # 修改: 導出新組件
├── api/
│   ├── routing.api.ts           # 新增: OSRM 路徑規劃
│   └── geocoding.api.ts         # 新增: Nominatim 地址查詢
├── hooks/
│   └── useAnimatedPosition.ts   # 新增: 車輛移動動畫
└── pages/
    ├── rider/
    │   ├── HomePage.tsx         # 修改: 使用 LeafletMap
    │   ├── RideRequestPage.tsx  # 修改: 使用 LeafletMap
    │   ├── WaitingPage.tsx      # 修改: 使用 LeafletMap + 動畫
    │   └── TripPage.tsx         # 修改: 使用 LeafletMap + 動畫
    └── driver/
        ├── DashboardPage.tsx    # 修改: 使用 LeafletMap
        └── TripPage.tsx         # 修改: 使用 LeafletMap + 動畫
```

---

## ⚠️ 注意事項

### API 使用限制

| 服務 | 限制 | 解決方案 |
|------|------|---------|
| OSRM Demo Server | 有流量限制 | 自建 OSRM Docker 容器 |
| Nominatim | 1 請求/秒 | 加入 debounce、快取結果 |

### 效能優化

1. **路徑快取**: 相同起終點的路徑應快取，避免重複請求
2. **座標精簡**: 如果路徑點過多 (>500)，可使用演算法簡化
3. **Debounce**: 地圖點擊事件加入 debounce，避免頻繁觸發地址查詢

### 瀏覽器相容性

- Leaflet 需要 CSS 正確載入，否則地圖會顯示異常
- 某些瀏覽器需要 polyfill

---

## ✅ 驗收標準 (已完成 2025-12-27)

- [x] 地圖使用 OpenStreetMap 圖資正確顯示
- [x] 點擊地圖可選擇上車/下車點，並顯示真實地址
- [x] 呼叫路徑規劃 API 可取得座標陣列
- [x] 車輛圖標沿著道路平滑移動 (不穿牆)
- [x] 路徑以藍色線條顯示在地圖上
- [x] 動畫完成後車輛停在目的地

---

## 📅 預估時程

| 階段 | 內容 | 時間 |
|------|------|------|
| Phase 1 | 基礎 Leaflet 地圖組件 | 1-2 小時 |
| Phase 2 | OSRM 路徑規劃 API | 1 小時 |
| Phase 3 | 車輛移動動畫 | 2 小時 |
| Phase 4 | 地址查詢 API | 30 分鐘 |
| Phase 5 | 整合到各頁面 + 測試 | 2 小時 |
| **總計** | | **6-8 小時** |

---

## 🚀 開始實作

確認開始實作後，執行以下步驟：

```bash
# 1. 安裝套件
cd clients/web-client
npm install leaflet react-leaflet @types/leaflet

# 2. 開發伺服器 (已經在運行就不用)
npm run dev

# 3. 開始編寫程式碼
```

等待您的確認後開始！
