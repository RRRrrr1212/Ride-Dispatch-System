// API 通用類型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  timestamp: string;
}

// 訂單相關類型
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type VehicleType = 'STANDARD' | 'PREMIUM' | 'XL';

export interface Location {
  x: number;
  y: number;
  address?: string;
}

export interface Order {
  orderId: string;
  passengerId: string;
  riderName?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  status: OrderStatus;
  pickupLocation: Location;
  dropoffLocation: Location;
  vehicleType: VehicleType;
  estimatedFare?: number;
  fare?: number;
  actualFare?: number;       // 實際車資
  driverEarnings?: number;   // 司機實際收入（扣除平台抽成）
  distance?: number;
  duration?: number;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelFee?: number;
  routePathJson?: string; // 共享的路徑資料 (JSON string)
}

export interface CreateOrderRequest {
  passengerId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  vehicleType: VehicleType;
}

// 司機相關類型
export type DriverStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';

export interface Driver {
  driverId: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  status: DriverStatus;
  location?: Location;
  busy: boolean;
  rating?: number;
  tripCount?: number;
}

// 使用者相關類型
export type UserRole = 'rider' | 'driver' | 'admin';

export interface User {
  id: string;
  name: string;
  phone?: string;
  role: UserRole;
}

// 審計日誌
export interface AuditLog {
  id: string;
  timestamp: string;
  orderId: string;
  action: string;
  actorType: string;
  actorId: string;
  previousState: string | null;
  newState: string;
  success: boolean;
  failureReason: string | null;
}

// 費率設定
export interface RatePlan {
  vehicleType: VehicleType;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
}

// 乘客類型
export interface Rider {
  riderId: string;
  name: string;
  phone: string;
  location?: Location;
  createdAt: string;
}
