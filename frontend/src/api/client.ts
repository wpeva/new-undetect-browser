import axios from 'axios';
import type { BrowserProfile, ProxyConfig, AutomationTask, Statistics } from '@/types';

const api = axios.create({
  baseURL: '/api/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Profiles API
export const profilesApi = {
  getAll: () => api.get<BrowserProfile[]>('/profiles'),
  getById: (id: string) => api.get<BrowserProfile>(`/profiles/${id}`),
  create: (data: Partial<BrowserProfile>) => api.post<BrowserProfile>('/profiles', data),
  update: (id: string, data: Partial<BrowserProfile>) => api.put<BrowserProfile>(`/profiles/${id}`, data),
  delete: (id: string) => api.delete(`/profiles/${id}`),
  launch: (id: string) => api.post(`/profiles/${id}/launch`),
  stop: (id: string) => api.post(`/profiles/${id}/stop`),
};

// Proxies API
export const proxiesApi = {
  getAll: () => api.get<ProxyConfig[]>('/proxies'),
  create: (data: Partial<ProxyConfig>) => api.post<ProxyConfig>('/proxies', data),
  update: (id: string, data: Partial<ProxyConfig>) => api.put<ProxyConfig>(`/proxies/${id}`, data),
  delete: (id: string) => api.delete(`/proxies/${id}`),
  check: (id: string) => api.post<{ status: string; latency: number }>(`/proxies/${id}/check`),
};

// Automation API
export const automationApi = {
  getTasks: () => api.get<AutomationTask[]>('/automation/tasks'),
  createTask: (data: Partial<AutomationTask>) => api.post<AutomationTask>('/automation/tasks', data),
  runTask: (id: string) => api.post(`/automation/tasks/${id}/run`),
  deleteTask: (id: string) => api.delete(`/automation/tasks/${id}`),
};

// Statistics API
export const statsApi = {
  get: () => api.get<Statistics>('/stats'),
};

export default api;
