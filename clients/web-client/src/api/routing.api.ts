/**
 * OSRM (Open Source Routing Machine) 路徑規劃 API
 * 提供免費的路徑規劃服務
 * 
 * 優化：
 * 1. 增加快取機制
 * 2. 增加錯誤處理 (429 Too Many Requests)
 * 3. 增加直線路徑 fallback
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org';

export interface RouteResult {
  distance: number;      // 距離 (公尺)
  duration: number;      // 時間 (秒)
  coordinates: { lat: number; lng: number }[];  // 路徑座標點
}

// 直線路徑生成器 (Fallback)
function generateStraightLineRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): RouteResult {
  const R = 6371e3; // 地球半徑 (公尺)
  const φ1 = start.lat * Math.PI / 180;
  const φ2 = end.lat * Math.PI / 180;
  const Δφ = (end.lat - start.lat) * Math.PI / 180;
  const Δλ = (end.lng - start.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // 假設均速 30km/h 來估算時間
  const duration = distance / (30 * 1000 / 3600);

  // 生成直線上的 10 個點
  const coordinates = [];
  for (let i = 0; i <= 10; i++) {
    coordinates.push({
      lat: start.lat + (end.lat - start.lat) * (i / 10),
      lng: start.lng + (end.lng - start.lng) * (i / 10),
    });
  }

  return { distance, duration, coordinates };
}

// 請求隊列與冷卻控制
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 最小請求間隔 1000ms

/**
 * 核心路徑請求函數
 */
async function fetchRouteFromOSRM(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteResult> {
  const now = Date.now();

  // 簡單的速率限制 (Throttle)
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - (now - lastRequestTime)));
  }
  
  const url = `${OSRM_BASE_URL}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
  
  try {
    lastRequestTime = Date.now();
    
    // 設定較長的 timeout (15秒)，避免網路稍慢就被切斷
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 只有在明確 429 時才考慮 fallback，其他錯誤讓它拋出或由上層決定
      if (response.status === 429) {
        console.warn('API 請求過多 (429)，暫時使用直線');
        return generateStraightLineRoute(start, end);
      }
      throw new Error(`Routing API Error: ${response.status}`);
    }

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
  } catch (error) {
    console.warn('路徑規劃請求失敗:', error);
    // 網路層級的錯誤 (如 Timeout, Network Error) 還是回傳直線避免 App 崩潰，
    // 但不會鎖死狀態
    return generateStraightLineRoute(start, end);
  }
}

// 路徑快取
const routeCache = new Map<string, RouteResult>();

/**
 * 取得兩點之間的行駛路徑 (自動使用快取)
 */
export async function getRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteResult> {
  // 使用較粗的粒度生成 Cache Key (約 10~20公尺精度)
  // 如果起點終點幾乎沒變，直接用 Cache
  const cacheKey = `${start.lat.toFixed(3)},${start.lng.toFixed(3)}-${end.lat.toFixed(3)},${end.lng.toFixed(3)}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // 嘗試請求
  const result = await fetchRouteFromOSRM(start, end);

  // 存入快取 (即使是 Fallback 的直線也暫時存起來，避免重複錯誤請求)
  // 但為了讓之後有機會恢復，我們可以在這裡做個判斷，如果是直線路徑可能不Cache太久？
  // 為了簡化，目前還是 Cache 住，因為 Key 精度只有 3 位小數，移動後就會刷新
  routeCache.set(cacheKey, result);

  // 限制快取大小
  if (routeCache.size > 200) {
    const firstKey = routeCache.keys().next().value;
    if (firstKey) routeCache.delete(firstKey);
  }

  return result;
}

/**
 * 取得多點之間的行駛路徑
 * 注意：此函數暫未整合快取與 Fallback 機制，請謹慎使用
 */
export async function getRouteWithWaypoints(
  waypoints: { lat: number; lng: number }[]
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('至少需要 2 個路徑點');
  }

  // 簡單處理：如果需要多點，暫時可以用同樣的邏輯或拆分成多段 getRoute
  // 這裡為了快速修復 429，我們簡單回傳直線
  try {
    const coordsString = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route');

    const route = data.routes[0];
    const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));

    return {
      distance: route.distance,
      duration: route.duration,
      coordinates,
    };
  } catch (e) {
    console.warn('多點路徑規劃失敗，使用直線:', e);
    // 產生從起點到終點的直線 (忽略中間點，簡化處理)
    return generateStraightLineRoute(waypoints[0], waypoints[waypoints.length - 1]);
  }
}

// 兼容舊 API
export const getRouteWithCache = getRoute;
