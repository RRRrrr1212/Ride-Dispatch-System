import { create } from 'zustand';
import type { Order } from '../types';

interface OrderState {
  currentOrder: Order | null;
  setCurrentOrder: (order: Order | null) => void;
  clearCurrentOrder: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  currentOrder: null,

  setCurrentOrder: (order) => set({ currentOrder: order }),

  clearCurrentOrder: () => set({ currentOrder: null }),
}));
