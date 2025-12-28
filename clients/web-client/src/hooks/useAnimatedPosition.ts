import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  lat: number;
  lng: number;
}

interface UseAnimatedPositionOptions {
  speed?: number;          // 每秒移動幾個座標點，預設 15
  enabled?: boolean;       // 是否啟用動畫，預設 true
  onComplete?: () => void; // 動畫完成時的回調
  onProgress?: (progress: number, currentPosition: Position) => void; // 進度回調
  initialIndex?: number;   // 初始索引 (用於狀態恢復)
}

/**
 * 讓物件沿著路徑座標點平滑移動的 Hook
 * @param path - 路徑座標陣列
 * @param options - 動畫選項
 * @returns 當前位置與控制函數
 */
export function useAnimatedPosition(
  path: Position[] | null,
  options: UseAnimatedPositionOptions = {}
) {
  const { 
    speed = 15, 
    enabled = true, 
    onComplete,
    onProgress,
    initialIndex = 0, // 預設從 0 開始
  } = options;

  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(0); // 0 - 1 之間
  
  const indexRef = useRef(initialIndex);
  const intervalRef = useRef<number | null>(null);
  const pathRef = useRef<Position[] | null>(null);

  // 停止動畫
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  // 重置動畫
  const reset = useCallback(() => {
    stop();
    indexRef.current = 0;
    setProgress(0);
    if (pathRef.current && pathRef.current.length > 0) {
      setCurrentPosition(pathRef.current[0]);
    }
  }, [stop]);

  // 跳轉到指定位置
  const jumpTo = useCallback((index: number) => {
    if (!pathRef.current || index < 0 || index >= pathRef.current.length) return;
    indexRef.current = index;
    setCurrentPosition(pathRef.current[index]);
    setProgress(index / (pathRef.current.length - 1));
  }, []);

  // 開始/恢復動畫
  const start = useCallback(() => {
    if (!pathRef.current || pathRef.current.length === 0 || !enabled) return;
    
    setIsAnimating(true);
    
    intervalRef.current = window.setInterval(() => {
      indexRef.current += 1;
      
      const path = pathRef.current!;
      const currentIndex = indexRef.current;
      
      if (currentIndex >= path.length) {
        stop();
        setCurrentPosition(path[path.length - 1]);
        setProgress(1);
        onComplete?.();
        return;
      }

      const newPosition = path[currentIndex];
      setCurrentPosition(newPosition);
      
      const newProgress = currentIndex / (path.length - 1);
      setProgress(newProgress);
      onProgress?.(newProgress, newPosition);
    }, 1000 / speed);
  }, [speed, enabled, stop, onComplete, onProgress]);

  // 當路徑變化時重新初始化
  useEffect(() => {
    stop();
    pathRef.current = path;

    if (!path || path.length === 0 || !enabled) {
      setCurrentPosition(null);
      return;
    }

    // 如果傳入的 initialIndex 有效且是第一次載入 (或路徑變化但我們想保持一些狀態?)
    // 這裡我們簡化：每次路徑變更如果是全新的，預設是 0，除非外部控制 initialIndex 變了
    // 但因為 initialIndex 是 prop，最好只在 mount 時生效，或者我們手動控制
    
    // 修正：如果此時 indexRef 已經有值且未重置，可能不需要強制設為 0？
    // 但為了安全，如果 path 變了，通常意味著新路徑。
    // 為了支援「恢復」，我們依賴元件 mount 時傳入的 correct initialIndex
    
    // 如果目前的 indexRef 超出新路徑範圍，重置
    if (indexRef.current >= path.length) {
       indexRef.current = 0;
    } 
    // 注意：這裡如果我們想讓 Hook 內部狀態優先，就不該每次都重置 indexRef.current = 0
    // 但因為 useEffect 依賴 path，path 變了通常要重置。
    // 解決方案：我們依賴 options.initialIndex *只在第一次* 生效？
    // 或者，我們信任傳進來的 initialIndex。
    
    if (options.initialIndex !== undefined && options.initialIndex !== 0) {
       indexRef.current = options.initialIndex;
    } else {
       // 如果沒有指定 initialIndex，則只有在路徑完全不同時才重置？
       // 為了簡單起見，這裡我們假設如果 path 變了就是新的
       // 但在這個應用中，path 可能因為重新 fetch 而 reference 變了但內容一樣
       // 所以我們最好保持 indexRef 不變，除非顯式重置
       // 暫時維持原邏輯，但在這裡讀取 prop
       if (indexRef.current === 0) {
          // 只有當它是 0 (預設) 的時候才不需要做什麼
       }
    }
    
    // 確實重置邏輯：
    // 如果外部傳入 initialIndex，使用它。
    if (options.initialIndex !== undefined) {
      indexRef.current = options.initialIndex;
    } else {
      indexRef.current = 0;
    }

    const startPosIndex = indexRef.current < path.length ? indexRef.current : 0;
    setProgress(startPosIndex / (path.length - 1 || 1));
    setCurrentPosition(path[startPosIndex]);
    
    // 自動開始動畫
    if (enabled && path.length > 1) {
      const timer = setTimeout(start, 500);
      return () => clearTimeout(timer);
    }
  }, [path, enabled, stop, start, options.initialIndex]);

  // 清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    position: currentPosition,
    isAnimating,
    progress,
    start,
    stop,
    reset,
    jumpTo,
  };
}

/**
 * 計算路徑的總距離 (使用 Haversine 公式)
 */
export function calculatePathDistance(path: Position[]): number {
  if (path.length < 2) return 0;
  
  let totalDistance = 0;
  
  for (let i = 1; i < path.length; i++) {
    totalDistance += haversineDistance(path[i - 1], path[i]);
  }
  
  return totalDistance;
}

/**
 * Haversine 公式計算兩點間的距離 (公尺)
 */
function haversineDistance(pos1: Position, pos2: Position): number {
  const R = 6371000; // 地球半徑 (公尺)
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.lat)) * Math.cos(toRad(pos2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 沿路徑插值，使動畫更平滑
 * @param path 原始路徑
 * @param targetPointCount 目標點數
 */
export function interpolatePath(path: Position[], targetPointCount: number): Position[] {
  if (path.length === 0) return [];
  if (path.length === 1) return [path[0]];
  if (path.length >= targetPointCount) return path;

  const result: Position[] = [path[0]];
  const segmentCount = path.length - 1;
  const pointsPerSegment = Math.floor((targetPointCount - 1) / segmentCount);

  for (let i = 0; i < segmentCount; i++) {
    const start = path[i];
    const end = path[i + 1];

    for (let j = 1; j <= pointsPerSegment; j++) {
      const t = j / (pointsPerSegment + 1);
      result.push({
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t,
      });
    }

    if (i < segmentCount - 1 || true) {
      result.push(end);
    }
  }

  return result;
}
