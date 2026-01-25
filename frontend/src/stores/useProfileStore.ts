import { create } from 'zustand';
import { profilesApi } from '@/api/client';
import type { BrowserProfile } from '@/types';
import toast from 'react-hot-toast';

interface ProfileStore {
  profiles: BrowserProfile[];
  loading: boolean;
  selectedProfile: BrowserProfile | null;

  // API actions
  fetchProfiles: () => Promise<void>;
  createProfile: (data: Partial<BrowserProfile>) => Promise<void>;
  updateProfile: (id: string, data: Partial<BrowserProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  launchProfile: (id: string) => Promise<void>;
  stopProfile: (id: string) => Promise<void>;
  selectProfile: (profile: BrowserProfile | null) => void;

  // Local state actions (for WebSocket updates)
  addProfile: (profile: BrowserProfile) => void;
  updateProfileLocal: (id: string, data: Partial<BrowserProfile>) => void;
  removeProfile: (id: string) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [],
  loading: false,
  selectedProfile: null,

  fetchProfiles: async () => {
    set({ loading: true });
    try {
      const response = await profilesApi.getAll();
      const profiles = (response.data as { data?: BrowserProfile[] })?.data || response.data || [];
      set({ profiles: Array.isArray(profiles) ? profiles : [], loading: false });
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
      toast.error('Failed to load profiles');
      set({ loading: false });
    }
  },

  createProfile: async (data: Partial<BrowserProfile>) => {
    try {
      const response = await profilesApi.create(data);
      const newProfile = (response.data as { data?: BrowserProfile })?.data || response.data;
      set((state: ProfileStore) => ({ profiles: [...state.profiles, newProfile as BrowserProfile] }));
      toast.success('Profile created successfully');
    } catch (error) {
      console.error('Failed to create profile:', error);
      toast.error('Failed to create profile');
      throw error;
    }
  },

  updateProfile: async (id: string, data: Partial<BrowserProfile>) => {
    try {
      const response = await profilesApi.update(id, data);
      const updated = (response.data as { data?: BrowserProfile })?.data || response.data;
      set((state: ProfileStore) => ({
        profiles: state.profiles.map((p: BrowserProfile) => (p.id === id ? { ...p, ...updated } : p)),
      }));
      toast.success('Profile updated');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  },

  deleteProfile: async (id: string) => {
    try {
      await profilesApi.delete(id);
      set((state: ProfileStore) => ({
        profiles: state.profiles.filter((p: BrowserProfile) => p.id !== id),
      }));
      toast.success('Profile deleted');
    } catch (error) {
      console.error('Failed to delete profile:', error);
      toast.error('Failed to delete profile');
      throw error;
    }
  },

  launchProfile: async (id: string) => {
    try {
      await profilesApi.launch(id);
      set((state: ProfileStore) => ({
        profiles: state.profiles.map((p: BrowserProfile) =>
          p.id === id ? { ...p, status: 'active' as const } : p
        ),
      }));
      toast.success('Browser launched');
    } catch (error) {
      console.error('Failed to launch profile:', error);
      toast.error('Failed to launch browser');
      throw error;
    }
  },

  stopProfile: async (id: string) => {
    try {
      await profilesApi.stop(id);
      set((state: ProfileStore) => ({
        profiles: state.profiles.map((p: BrowserProfile) =>
          p.id === id ? { ...p, status: 'stopped' as const } : p
        ),
      }));
      toast.success('Browser stopped');
    } catch (error) {
      console.error('Failed to stop profile:', error);
      toast.error('Failed to stop browser');
      throw error;
    }
  },

  selectProfile: (profile: BrowserProfile | null) => set({ selectedProfile: profile }),

  // Local state actions for WebSocket updates
  addProfile: (profile: BrowserProfile) => {
    set((state: ProfileStore) => {
      // Avoid duplicates
      if (state.profiles.some((p: BrowserProfile) => p.id === profile.id)) {
        return state;
      }
      return { profiles: [...state.profiles, profile] };
    });
  },

  updateProfileLocal: (id: string, data: Partial<BrowserProfile>) => {
    set((state: ProfileStore) => ({
      profiles: state.profiles.map((p: BrowserProfile) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },

  removeProfile: (id: string) => {
    set((state: ProfileStore) => ({
      profiles: state.profiles.filter((p: BrowserProfile) => p.id !== id),
      selectedProfile: state.selectedProfile?.id === id ? null : state.selectedProfile,
    }));
  },
}));
