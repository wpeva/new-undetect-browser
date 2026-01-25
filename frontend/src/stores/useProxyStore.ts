/**
 * Proxy Store with WebSocket support
 */

import { create } from 'zustand';
import { proxiesApi } from '@/api/client';
import type { ProxyConfig } from '@/types';
import toast from 'react-hot-toast';

interface ProxyStore {
  proxies: ProxyConfig[];
  loading: boolean;
  checkingProxy: string | null;

  // API actions
  fetchProxies: () => Promise<void>;
  createProxy: (data: Partial<ProxyConfig>) => Promise<void>;
  updateProxy: (id: string, data: Partial<ProxyConfig>) => Promise<void>;
  deleteProxy: (id: string) => Promise<void>;
  checkProxy: (id: string) => Promise<void>;

  // Local state actions (for WebSocket updates)
  addProxy: (proxy: ProxyConfig) => void;
  updateProxyLocal: (id: string, data: Partial<ProxyConfig>) => void;
  removeProxy: (id: string) => void;
}

export const useProxyStore = create<ProxyStore>((set) => ({
  proxies: [],
  loading: false,
  checkingProxy: null,

  fetchProxies: async () => {
    set({ loading: true });
    try {
      const response = await proxiesApi.getAll();
      // Handle both {data: [...]} and [...] response formats
      const proxies = (response.data as { data?: ProxyConfig[] })?.data || response.data || [];
      set({ proxies: Array.isArray(proxies) ? proxies : [], loading: false });
    } catch (error) {
      console.error('Failed to fetch proxies:', error);
      toast.error('Failed to load proxies');
      set({ loading: false });
    }
  },

  createProxy: async (data: Partial<ProxyConfig>) => {
    try {
      await proxiesApi.create(data);
      // WebSocket will handle adding to state
      toast.success('Proxy created');
    } catch (error) {
      console.error('Failed to create proxy:', error);
      toast.error('Failed to create proxy');
      throw error;
    }
  },

  updateProxy: async (id: string, data: Partial<ProxyConfig>) => {
    try {
      const response = await proxiesApi.update(id, data);
      const updated = (response.data as { data?: ProxyConfig })?.data || response.data;
      set((state: ProxyStore) => ({
        proxies: state.proxies.map((p: ProxyConfig) => (p.id === id ? { ...p, ...updated } : p)),
      }));
      toast.success('Proxy updated');
    } catch (error) {
      console.error('Failed to update proxy:', error);
      toast.error('Failed to update proxy');
      throw error;
    }
  },

  deleteProxy: async (id: string) => {
    try {
      await proxiesApi.delete(id);
      set((state: ProxyStore) => ({
        proxies: state.proxies.filter((p: ProxyConfig) => p.id !== id),
      }));
      toast.success('Proxy deleted');
    } catch (error) {
      console.error('Failed to delete proxy:', error);
      toast.error('Failed to delete proxy');
      throw error;
    }
  },

  checkProxy: async (id: string) => {
    set({ checkingProxy: id });
    try {
      const response = await proxiesApi.check(id);
      const data = response.data;
      // WebSocket will handle the update
      if (data.status === 'working') {
        toast.success(`Proxy working (${data.latency}ms)`);
      } else {
        toast.error('Proxy check failed');
      }
    } catch (error) {
      console.error('Failed to check proxy:', error);
      toast.error('Failed to check proxy');
    } finally {
      set({ checkingProxy: null });
    }
  },

  // Local state actions for WebSocket updates
  addProxy: (proxy: ProxyConfig) => {
    set((state: ProxyStore) => {
      // Avoid duplicates
      if (state.proxies.some((p: ProxyConfig) => p.id === proxy.id)) {
        return state;
      }
      return { proxies: [...state.proxies, proxy] };
    });
  },

  updateProxyLocal: (id: string, data: Partial<ProxyConfig>) => {
    set((state: ProxyStore) => ({
      proxies: state.proxies.map((p: ProxyConfig) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },

  removeProxy: (id: string) => {
    set((state: ProxyStore) => ({
      proxies: state.proxies.filter((p: ProxyConfig) => p.id !== id),
    }));
  },
}));
