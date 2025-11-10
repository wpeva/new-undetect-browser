/**
 * Electron Preload Script
 * Provides safe bridge between renderer and main process
 */

import { contextBridge, ipcRenderer } from 'electron';

// API for renderer process
const api = {
  // Profiles
  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:getAll'),
    create: (data: any) => ipcRenderer.invoke('profiles:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('profiles:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id),
  },

  // Browser control
  browser: {
    launch: (profileId: string) => ipcRenderer.invoke('browser:launch', profileId),
    close: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
    status: (profileId: string) => ipcRenderer.invoke('browser:status', profileId),
  },

  // Proxy
  proxy: {
    test: (proxyConfig: any) => ipcRenderer.invoke('proxy:test', proxyConfig),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  },

  // System
  system: {
    openFileDialog: () => ipcRenderer.invoke('system:openFileDialog'),
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', api);

// Type definitions for TypeScript
export type ElectronAPI = typeof api;
