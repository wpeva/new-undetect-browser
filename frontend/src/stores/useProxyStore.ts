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

export const useProxyStore = create<ProxyStore>((set, get) => ({
  proxies: [],
  loading: false,
  checkingProxy: null,

  fetchProxies: async () => {
    set({ loading: true });
    try {
      const { data } = await proxiesApi.getAll();
      set({ proxies: data, loading: false });
    } catch (error) {
      console.error('Failed to fetch proxies:', error);
      toast.error('Failed to load proxies');
      set({ loading: false });
    }
  },

  createProxy: async (data) => {
    try {
      const { data: newProxy } = await proxiesApi.create(data);
      // WebSocket will handle adding to state
      toast.success('Proxy created');
    } catch (error) {
      console.error('Failed to create proxy:', error);
      toast.error('Failed to create proxy');
      throw error;
    }
  },

  updateProxy: async (id, data) => {
    try {
      const { data: updated } = await proxiesApi.update(id, data);
      set((state) => ({
        proxies: state.proxies.map((p) => (p.id === id ? updated : p)),
      }));
      toast.success('Proxy updated');
    } catch (error) {
      console.error('Failed to update proxy:', error);
      toast.error('Failed to update proxy');
      throw error;
    }
  },

  deleteProxy: async (id) => {
    try {
      await proxiesApi.delete(id);
      set((state) => ({
        proxies: state.proxies.filter((p) => p.id !== id),
      }));
      toast.success('Proxy deleted');
    } catch (error) {
      console.error('Failed to delete proxy:', error);
      toast.error('Failed to delete proxy');
      throw error;
    }
  },

  checkProxy: async (id) => {
    set({ checkingProxy: id });
    try {
      const { data } = await proxiesApi.check(id);
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
  addProxy: (proxy) => {
    set((state) => {
      // Avoid duplicates
      if (state.proxies.some((p) => p.id === proxy.id)) {
        return state;
      }
      return { proxies: [...state.proxies, proxy] };
    });
  },

  updateProxyLocal: (id, data) => {
    set((state) => ({
      proxies: state.proxies.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },

  removeProxy: (id) => {
    set((state) => ({
      proxies: state.proxies.filter((p) => p.id !== id),
    }));
  },
}));
