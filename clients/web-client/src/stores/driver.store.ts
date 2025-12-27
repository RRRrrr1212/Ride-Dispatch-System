import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Driver, Location } from '../types';
import { driverApi } from '../api/driver.api';

interface DriverState {
  driver: Driver | null;
  isOnline: boolean;
  location: Location | null;
  setDriver: (driver: Driver | null) => void;
  setLocation: (location: Location) => void;
  toggleOnline: () => Promise<void>;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  clearDriver: () => void;  // 登出時清除所有資料
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set, get) => ({
      driver: null,
      isOnline: false,
      location: null,

      setDriver: (driver) => set({ driver }),

      setLocation: (location) => set({ location }),

      toggleOnline: async () => {
        const { isOnline } = get();
        if (isOnline) {
          await get().goOffline();
        } else {
          await get().goOnline();
        }
      },

      goOnline: async () => {
        const { driver, location } = get();
        if (!driver) {
          console.warn('無法上線：未設定司機資訊');
          return;
        }

        const loc = location || { x: 24.1618, y: 120.6469 }; // 預設台中
        try {
          const response = await driverApi.goOnline(driver.driverId, loc);
          if (response.data.success && response.data.data) {
            set({ isOnline: true, driver: response.data.data });
          }
        } catch (error: any) {
          // 如果後端沒有這個司機，在前端模擬上線
          if (error.response?.status === 404) {
            console.warn('後端找不到司機，使用前端模擬上線');
            set({ 
              isOnline: true,
              driver: {
                ...driver,
                status: 'ONLINE',
                location: loc,
              }
            });
          } else {
            console.error('上線失敗:', error);
            // 在 Demo 模式下，即使 API 失敗也模擬上線
            set({ isOnline: true });
          }
        }
      },

      goOffline: async () => {
        const { driver } = get();
        if (!driver) return;

        try {
          const response = await driverApi.goOffline(driver.driverId);
          if (response.data.success) {
            set({ isOnline: false });
          }
        } catch (error) {
          console.error('下線失敗:', error);
          // Demo 模式下，即使 API 失敗也模擬下線
          set({ isOnline: false });
        }
      },

      clearDriver: () => {
        set({ driver: null, isOnline: false, location: null });
      },
    }),
    {
      name: 'driver-storage',
      partialize: (state) => ({
        driver: state.driver,
        isOnline: state.isOnline,
        location: state.location,
      }),
    }
  )
);
