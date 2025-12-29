import { apiClient } from './client';
import type { Order, Driver, AuditLog, RatePlan, ApiResponse, OrderStatus, Rider } from '../types';

interface PaginatedOrders {
  orders: Order[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export const adminApi = {
  // 取得所有訂單
  getOrders: (params?: { status?: OrderStatus; passengerId?: string; driverId?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PaginatedOrders>>('/admin/orders', { params }),

  // 取得訂單詳情
  getOrderDetail: (orderId: string) =>
    apiClient.get<ApiResponse<Order>>(`/admin/orders/${orderId}`),

  // 取得所有司機
  getDrivers: () =>
    apiClient.get<ApiResponse<{ drivers: Driver[]; count: number }>>('/admin/drivers'),

  // 取得審計日誌
  getAuditLogs: (params?: { orderId?: string; action?: string }) =>
    apiClient.get<ApiResponse<{ logs: AuditLog[]; count: number }>>('/admin/audit-logs', { params }),

  // 取得費率設定
  getRatePlans: () =>
    apiClient.get<ApiResponse<{ ratePlans: RatePlan[] }>>('/admin/rate-plans'),

  // 更新費率設定
  updateRatePlan: (vehicleType: string, data: Omit<RatePlan, 'vehicleType'>) =>
    apiClient.put<ApiResponse<RatePlan>>(`/admin/rate-plans/${vehicleType}`, data),

  // 創建司機
  createDriver: (data: { driverId: string; name: string; phone: string; vehiclePlate: string; vehicleType: string }) =>
    apiClient.post<ApiResponse<Driver>>('/admin/drivers', data),

  // ========== 乘客管理 ==========
  
  // 取得所有乘客
  getRiders: () =>
    apiClient.get<ApiResponse<{ riders: Rider[]; count: number }>>('/admin/riders'),
  
  // 建立乘客
  createRider: (data: { riderId: string; name: string; phone: string }) =>
    apiClient.post<ApiResponse<Rider>>('/admin/riders', data),
  
  // 取得單一乘客 (回傳完整資訊，包含 name, phone, location 等)
  getRider: (riderId: string) =>
    apiClient.get<ApiResponse<Rider>>(`/admin/riders/${riderId}`),
  
  // 刪除乘客
  deleteRider: (riderId: string) =>
    apiClient.delete<ApiResponse<string>>(`/admin/riders/${riderId}`),

  // ========== 位置設置 (Demo 用途) ==========
  
  // 設置司機位置
  setDriverLocation: (driverId: string, data: { lat: number; lng: number; address?: string }) =>
    apiClient.put<ApiResponse<{ success: boolean; driverId: string; location: Location }>>(`/admin/drivers/${driverId}/location`, data),
  
  // 取得司機位置設置狀態
  getDriverLocationStatus: (driverId: string) =>
    apiClient.get<ApiResponse<{ driverId: string; canSetLocation: boolean; currentLocation: Location | null; reason?: string }>>(`/admin/drivers/${driverId}/location-status`),
  
  // 設置乘客位置
  setRiderLocation: (riderId: string, data: { lat: number; lng: number; address?: string }) =>
    apiClient.put<ApiResponse<{ success: boolean; riderId: string; location: Location }>>(`/admin/riders/${riderId}/location`, data),
  
  // 取得乘客位置設置狀態
  getRiderLocationStatus: (riderId: string) =>
    apiClient.get<ApiResponse<{ 
      riderId: string; 
      canSetLocation: boolean; 
      currentLocation: Location | null; 
      reason?: string;
      totalOrdersFound?: number;
      activeOrdersCount?: number;
      activeOrders?: Array<{ orderId: string; status: string; createdAt: string; driverId?: string }>;
    }>>(`/admin/riders/${riderId}/location-status`),
  
  // 強制取消乘客的殘留訂單
  forceCancelRiderOrders: (riderId: string) =>
    apiClient.post<ApiResponse<{ 
      riderId: string; 
      cancelledCount: number; 
      cancelledOrderIds: string[]; 
      timestamp: string;
    }>>(`/admin/riders/${riderId}/force-cancel-orders`),

  // ========== 資料管理 ==========
  
  // 清除所有資料
  clearAll: () =>
    apiClient.delete<ApiResponse<{ message: string; clearedAt: string }>>('/admin/clear-all'),
  
  // 重置行程資料（保留司機和乘客基礎資料）
  resetTripData: () =>
    apiClient.post<ApiResponse<{ 
      message: string; 
      ordersCleared: number; 
      auditLogsCleared: number; 
      driversReset: number;
      ridersPreserved: number;
      driversPreserved: number;
      resetAt: string;
    }>>('/admin/reset-trip-data'),
};
