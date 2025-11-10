import { create } from 'zustand';
import { profilesApi } from '@/api/client';
import type { BrowserProfile } from '@/types';
import toast from 'react-hot-toast';

interface ProfileStore {
  profiles: BrowserProfile[];
  loading: boolean;
  selectedProfile: BrowserProfile | null;

  fetchProfiles: () => Promise<void>;
  createProfile: (data: Partial<BrowserProfile>) => Promise<void>;
  updateProfile: (id: string, data: Partial<BrowserProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  launchProfile: (id: string) => Promise<void>;
  stopProfile: (id: string) => Promise<void>;
  selectProfile: (profile: BrowserProfile | null) => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: [],
  loading: false,
  selectedProfile: null,

  fetchProfiles: async () => {
    set({ loading: true });
    try {
      const { data } = await profilesApi.getAll();
      set({ profiles: data, loading: false });
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
      toast.error('Failed to load profiles');
      set({ loading: false });
    }
  },

  createProfile: async (data) => {
    try {
      const { data: newProfile } = await profilesApi.create(data);
      set((state) => ({ profiles: [...state.profiles, newProfile] }));
      toast.success('Profile created successfully');
    } catch (error) {
      console.error('Failed to create profile:', error);
      toast.error('Failed to create profile');
      throw error;
    }
  },

  updateProfile: async (id, data) => {
    try {
      const { data: updated } = await profilesApi.update(id, data);
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
      }));
      toast.success('Profile updated');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  },

  deleteProfile: async (id) => {
    try {
      await profilesApi.delete(id);
      set((state) => ({
        profiles: state.profiles.filter((p) => p.id !== id),
      }));
      toast.success('Profile deleted');
    } catch (error) {
      console.error('Failed to delete profile:', error);
      toast.error('Failed to delete profile');
      throw error;
    }
  },

  launchProfile: async (id) => {
    try {
      await profilesApi.launch(id);
      set((state) => ({
        profiles: state.profiles.map((p) =>
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

  stopProfile: async (id) => {
    try {
      await profilesApi.stop(id);
      set((state) => ({
        profiles: state.profiles.map((p) =>
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

  selectProfile: (profile) => set({ selectedProfile: profile }),
}));
