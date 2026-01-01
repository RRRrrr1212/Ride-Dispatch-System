import { apiClient } from './client';
import type { Order, CreateOrderRequest, ApiResponse } from '../types';

export const orderApi = {
  // 建立訂單
  create: (data: CreateOrderRequest) =>
    apiClient.post<ApiResponse<Order>>('/orders', data),

  // 查詢訂單
  get: (orderId: string) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${orderId}`),

  // 取消訂單
  cancel: (orderId: string, cancelledBy: string, reason?: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/cancel`, { cancelledBy, reason }),

  // 司機拒絕訂單 (重新配對給下一個司機)
  decline: (orderId: string, driverId: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/decline`, { driverId }),

  // 接受訂單 (司機)
  accept: (orderId: string, driverId: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/accept`, { driverId }),

  // 開始行程
  start: (orderId: string, driverId: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/start`, { driverId }),

  // 完成行程 (支持傳入模擬的行程時間)
  complete: (orderId: string, driverId: string, simulatedDuration?: number) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/complete`, { driverId, simulatedDuration }),

  // 更新路徑 (共享路徑給乘客端)
  updateRoute: (orderId: string, routePathJson: string) =>
    apiClient.put<ApiResponse<{ orderId: string; routePathJson: string }>>(`/orders/${orderId}/route`, { routePathJson }),
};
