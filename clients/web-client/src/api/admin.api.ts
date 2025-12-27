import { apiClient } from './client';
import type { Order, Driver, AuditLog, RatePlan, ApiResponse, OrderStatus } from '../types';

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
  getOrders: (params?: { status?: OrderStatus; page?: number; size?: number }) =>
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
};
