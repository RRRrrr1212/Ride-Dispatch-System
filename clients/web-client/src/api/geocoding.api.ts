/**
 * Nominatim 地理編碼 API
 * 提供地址與座標的雙向轉換
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// 請求節流 - Nominatim 限制 1 請求/秒
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 秒

async function throttledFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return fetch(url, options);
}

/**
 * 將經緯度轉換為真實地址 (反向地理編碼)
 * @param lat 緯度
 * @param lng 經度
 * @returns 地址字串
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW&zoom=18`;

    const response = await throttledFetch(url, {
      headers: { 'User-Agent': 'RideDispatchSystem/1.0' }
    });
    const data = await response.json();

    // 優先返回詳細地址
    if (data.address) {
      const parts: string[] = [];
      
      // 組合台灣地址格式
      if (data.address.city || data.address.county) {
        parts.push(data.address.city || data.address.county);
      }
      if (data.address.suburb || data.address.quarter) {
        parts.push(data.address.suburb || data.address.quarter);
      }
      if (data.address.road) {
        parts.push(data.address.road);
        if (data.address.house_number) {
          parts.push(`${data.address.house_number}號`);
        }
      }
      
      if (parts.length > 0) {
        return parts.join('');
      }
    }

    return data.display_name || `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  } catch (error) {
    console.error('反向地理編碼失敗:', error);
    return `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

/**
 * 將地址轉換為經緯度 (正向地理編碼)
 * @param address 地址字串
 * @returns 座標，或 null 如果查詢失敗
 */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=zh-TW`;

    const response = await throttledFetch(url, {
      headers: { 'User-Agent': 'RideDispatchSystem/1.0' }
    });
    const data = await response.json();

    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('地理編碼失敗:', error);
    return null;
  }
}

/**
 * 搜尋地址建議
 * @param query 搜尋關鍵字
 * @param limit 結果數量上限
 * @returns 地址建議列表
 */
export async function searchAddress(
  query: string,
  limit: number = 5
): Promise<Array<{ display_name: string; lat: number; lng: number }>> {
  try {
    const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&accept-language=zh-TW&countrycodes=tw`;

    const response = await throttledFetch(url, {
      headers: { 'User-Agent': 'RideDispatchSystem/1.0' }
    });
    const data = await response.json();

    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('地址搜尋失敗:', error);
    return [];
  }
}

// 地址快取
const addressCache = new Map<string, string>();

/**
 * 帶快取的反向地理編碼
 */
export async function reverseGeocodeWithCache(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  const result = await reverseGeocode(lat, lng);
  addressCache.set(cacheKey, result);
  
  // 限制快取大小
  if (addressCache.size > 200) {
    const firstKey = addressCache.keys().next().value;
    if (firstKey) {
      addressCache.delete(firstKey);
    }
  }
  
  return result;
}
