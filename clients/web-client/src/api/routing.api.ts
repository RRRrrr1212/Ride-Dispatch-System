/**
 * OSRM (Open Source Routing Machine) 路徑規劃 API
 * 提供免費的路徑規劃服務
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org';

export interface RouteResult {
  distance: number;      // 距離 (公尺)
  duration: number;      // 時間 (秒)
  coordinates: { lat: number; lng: number }[];  // 路徑座標點
}

/**
 * 取得兩點之間的行駛路徑
 * @param start 起點座標
 * @param end 終點座標
 * @returns 路徑結果，包含距離、時間和座標陣列
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

/**
 * 取得多點之間的行駛路徑
 * @param waypoints 路徑點陣列
 * @returns 路徑結果
 */
export async function getRouteWithWaypoints(
  waypoints: { lat: number; lng: number }[]
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('至少需要 2 個路徑點');
  }

  const coordsString = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

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

// 路徑快取，避免重複請求
const routeCache = new Map<string, RouteResult>();

/**
 * 帶快取的路徑查詢
 */
export async function getRouteWithCache(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteResult> {
  const cacheKey = `${start.lat.toFixed(4)},${start.lng.toFixed(4)}-${end.lat.toFixed(4)},${end.lng.toFixed(4)}`;
  
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  const result = await getRoute(start, end);
  routeCache.set(cacheKey, result);
  
  // 限制快取大小
  if (routeCache.size > 100) {
    const firstKey = routeCache.keys().next().value;
    if (firstKey) {
      routeCache.delete(firstKey);
    }
  }
  
  return result;
}
