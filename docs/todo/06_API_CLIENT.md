# 🔌 API 串接

> **文件**: 06_API_CLIENT.md  
> **更新日期**: 2025-12-27

---

## API Client 設定

```typescript
// src/api/client.ts
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request 攔截器
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response 攔截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    switch (status) {
      case 401:
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 409:
        console.warn('併發衝突 (H2)');
        break;
    }
    return Promise.reject(error);
  }
);
```

---

## 訂單 API

```typescript
// src/api/order.api.ts
import { apiClient } from './client';
import type { Order, CreateOrderRequest, ApiResponse } from '../types';

export const orderApi = {
  create: (data: CreateOrderRequest) =>
    apiClient.post<ApiResponse<Order>>('/orders', data),

  get: (orderId: string) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${orderId}`),

  cancel: (orderId: string, cancelledBy: string, reason?: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/cancel`, { cancelledBy, reason }),

  accept: (orderId: string, driverId: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/accept`, { driverId }),

  start: (orderId: string, driverId: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/start`, { driverId }),

  complete: (orderId: string, driverId: string) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${orderId}/complete`, { driverId }),
};
```

---

## 司機 API

```typescript
// src/api/driver.api.ts
import { apiClient } from './client';
import type { Driver, ApiResponse } from '../types';

export const driverApi = {
  goOnline: (driverId: string, location: { x: number; y: number }) =>
    apiClient.put<ApiResponse<Driver>>(`/drivers/${driverId}/online`, { location }),

  goOffline: (driverId: string) =>
    apiClient.put<ApiResponse<Driver>>(`/drivers/${driverId}/offline`),

  updateLocation: (driverId: string, x: number, y: number) =>
    apiClient.put<ApiResponse<Driver>>(`/drivers/${driverId}/location`, { x, y }),

  getOffers: (driverId: string) =>
    apiClient.get<ApiResponse<{ offers: Order[]; count: number }>>(`/drivers/${driverId}/offers`),
};
```

---

## 類型定義

```typescript
// src/types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  timestamp: string;
}

// src/types/order.types.ts
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
  driverId?: string;
  status: OrderStatus;
  pickupLocation: Location;
  dropoffLocation: Location;
  vehicleType: VehicleType;
  estimatedFare?: number;
  fare?: number;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface CreateOrderRequest {
  passengerId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  vehicleType: VehicleType;
}
```

---

## Polling Hook

```typescript
// src/hooks/usePolling.ts
import { useState, useEffect } from 'react';
import { orderApi } from '../api/order.api';
import type { Order } from '../types';

export function useOrderPolling(orderId: string, interval = 2000) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await orderApi.get(orderId);
        if (res.data.success && res.data.data) {
          setOrder(res.data.data);
        }
      } finally {
        setLoading(false);
      }
    };

    poll();
    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }, [orderId, interval]);

  return { order, loading };
}
```

---

**下一步**: 閱讀 [07_MVP_SCREENS.md](./07_MVP_SCREENS.md)
