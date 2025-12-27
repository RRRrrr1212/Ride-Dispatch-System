import { apiClient } from './client';
import type { Driver, Order, ApiResponse, VehicleType } from '../types';

export const driverApi = {
  // 司機上線
  goOnline: (driverId: string, location: { x: number; y: number }) =>
    apiClient.put<ApiResponse<Driver>>(`/drivers/${driverId}/online`, { location }),

  // 司機下線
  goOffline: (driverId: string) =>
    apiClient.put<ApiResponse<Driver>>(`/drivers/${driverId}/offline`),

  // 更新位置
  updateLocation: (driverId: string, x: number, y: number) =>
    apiClient.put<ApiResponse<Driver>>(`/drivers/${driverId}/location`, { x, y }),

  // 取得可接訂單
  getOffers: (driverId: string) =>
    apiClient.get<ApiResponse<{ offers: Order[]; count: number }>>(`/drivers/${driverId}/offers`),

  // 註冊司機
  register: (data: {
    phone: string;
    name: string;
    vehiclePlate: string;
    vehicleType: VehicleType;
  }) => apiClient.post<ApiResponse<Driver>>('/drivers', {
    driverId: `driver-${data.phone}`,
    ...data,
  }),
  
  // 取得司機資訊
  getDriver: (driverId: string) =>
    apiClient.get<ApiResponse<Driver>>(`/drivers/${driverId}`),
};
