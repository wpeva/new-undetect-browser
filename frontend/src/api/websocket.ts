/**
 * WebSocket Client for Real-time Updates
 * Connects to Socket.IO server for live profile and proxy updates
 */

import { io, Socket } from 'socket.io-client';
import { useProfileStore } from '@/stores/useProfileStore';
import { useProxyStore } from '@/stores/useProxyStore';
import toast from 'react-hot-toast';

// WebSocket connection
let socket: Socket | null = null;

// Configuration
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

/**
 * Initialize WebSocket connection
 */
export function initWebSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('WebSocket connected:', socket?.id);
    toast.success('Connected to server', { id: 'ws-connected' });
  });

  socket.on('disconnect', (reason: string) => {
    console.log('WebSocket disconnected:', reason);
    if (reason === 'io server disconnect') {
      toast.error('Server disconnected', { id: 'ws-disconnected' });
    }
  });

  socket.on('connect_error', (error: Error) => {
    console.error('WebSocket connection error:', error);
  });

  // Profile events
  socket.on('profile:created', (profile: { id: string; name: string }) => {
    console.log('Profile created via WS:', profile);
    useProfileStore.getState().addProfile(profile as any);
    toast.success(`Profile "${profile.name}" created`, { id: `profile-created-${profile.id}` });
  });

  socket.on('profile:updated', (profile: { id: string }) => {
    console.log('Profile updated via WS:', profile);
    useProfileStore.getState().updateProfileLocal(profile.id, profile);
  });

  socket.on('profile:deleted', (profileId: string) => {
    console.log('Profile deleted via WS:', profileId);
    useProfileStore.getState().removeProfile(profileId);
  });

  socket.on('profile:launched', (profileId: string) => {
    console.log('Profile launched via WS:', profileId);
    useProfileStore.getState().updateProfileLocal(profileId, { status: 'active' });
    toast.success('Browser launched', { id: `profile-launched-${profileId}` });
  });

  socket.on('profile:stopped', (profileId: string) => {
    console.log('Profile stopped via WS:', profileId);
    useProfileStore.getState().updateProfileLocal(profileId, { status: 'stopped' });
    toast('Browser stopped', { id: `profile-stopped-${profileId}`, icon: '🛑' });
  });

  socket.on('profile:status', ({ profileId, status }: { profileId: string; status: string }) => {
    console.log('Profile status changed via WS:', profileId, status);
    useProfileStore.getState().updateProfileLocal(profileId, { status: status as any });
  });

  socket.on('profiles:bulk-deleted', (ids: string[]) => {
    console.log('Profiles bulk deleted via WS:', ids);
    ids.forEach((id: string) => useProfileStore.getState().removeProfile(id));
    toast.success(`Deleted ${ids.length} profiles`);
  });

  // Proxy events
  socket.on('proxy:created', (proxy: { id: string }) => {
    console.log('Proxy created via WS:', proxy);
    useProxyStore.getState().addProxy(proxy as any);
    toast.success('Proxy added', { id: `proxy-created-${proxy.id}` });
  });

  socket.on('proxy:checked', (data: { id: string; status: string; latency?: number; country?: string; city?: string }) => {
    console.log('Proxy checked via WS:', data);
    if (data.status === 'working') {
      useProxyStore.getState().updateProxyLocal(data.id, {
        status: 'working',
        latency: data.latency,
        country: data.country,
        city: data.city,
      });
    } else {
      useProxyStore.getState().updateProxyLocal(data.id, { status: 'failed' });
    }
  });

  socket.on('proxies:imported', (count: number) => {
    console.log('Proxies imported via WS:', count);
    useProxyStore.getState().fetchProxies();
    toast.success(`Imported ${count} proxies`);
  });

  socket.on('proxies:check-complete', ({ total }: { total: number }) => {
    console.log('Proxies check complete:', total);
    toast.success(`Checked ${total} proxies`);
  });

  // Error events
  socket.on('error', (error: { message?: string }) => {
    console.error('WebSocket error:', error);
    toast.error(error.message || 'Server error');
  });

  return socket;
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return socket?.connected || false;
}

/**
 * Emit event to server
 */
export function emit(event: string, data?: any): void {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn('WebSocket not connected, cannot emit:', event);
  }
}

/**
 * Launch profile via WebSocket
 */
export function launchProfileWS(profileId: string): void {
  emit('profile:launch', profileId);
}

/**
 * Stop profile via WebSocket
 */
export function stopProfileWS(profileId: string): void {
  emit('profile:stop', profileId);
}

export default {
  init: initWebSocket,
  disconnect: disconnectWebSocket,
  getSocket,
  isConnected,
  emit,
  launchProfileWS,
  stopProfileWS,
};
