import { useEffect, useState } from 'react';
import { Plus, Play, Square, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { profilesApi } from '@/api/client';

interface Profile {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'error' | 'running';
  user_agent?: string;
  fingerprint?: string;
  proxy_id?: string;
  tags?: string;
  notes?: string;
  created_at?: number;
  updated_at?: number;
  last_used?: number;
  use_count?: number;
}

export default function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await profilesApi.getAll();
      const data = (response.data as any)?.data || response.data || [];
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch profiles:', err);
      setError('Failed to load profiles. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleLaunch = async (id: string) => {
    setActionLoading(id);
    try {
      await profilesApi.launch(id);
      // Update local state
      setProfiles(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'active' as const } : p
      ));
    } catch (err: any) {
      console.error('Failed to launch profile:', err);
      alert('Failed to launch profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id: string) => {
    setActionLoading(id);
    try {
      await profilesApi.stop(id);
      // Update local state
      setProfiles(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'idle' as const } : p
      ));
    } catch (err: any) {
      console.error('Failed to stop profile:', err);
      alert('Failed to stop profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    setActionLoading(id);
    try {
      await profilesApi.delete(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('Failed to delete profile:', err);
      alert('Failed to delete profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await profilesApi.create({
        name: `Profile ${profiles.length + 1}`,
      });
      const newProfile = (response.data as any)?.data || response.data;
      if (newProfile) {
        setProfiles(prev => [newProfile, ...prev]);
      }
    } catch (err: any) {
      console.error('Failed to create profile:', err);
      alert('Failed to create profile: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Browser Profiles</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2">Loading profiles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Browser Profiles</h1>
        </div>
        <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <button onClick={fetchProfiles} className="mt-4 btn-primary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Browser Profiles</h1>
        <div className="flex gap-2">
          <button onClick={fetchProfiles} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={20} />
            Refresh
          </button>
          <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Create Profile
          </button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No profiles yet. Create your first profile to get started!</p>
          <button onClick={handleCreate} className="btn-primary">
            Create Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onLaunch={handleLaunch}
              onStop={handleStop}
              onDelete={handleDelete}
              isLoading={actionLoading === profile.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  onLaunch,
  onStop,
  onDelete,
  isLoading,
}: {
  profile: Profile;
  onLaunch: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  const isActive = profile.status === 'active' || profile.status === 'running';
  const isError = profile.status === 'error';

  const getStatusBadge = () => {
    if (isError) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
    if (isActive) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-400';
  };

  const getStatusText = () => {
    if (isError) return 'Error';
    if (isActive) return 'Active';
    return 'Idle';
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{profile.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {profile.user_agent ? 'Custom UA' : 'Chrome'} • {profile.use_count || 0} sessions
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Proxy:</span>
          <span>{profile.proxy_id ? 'Configured' : 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Fingerprint:</span>
          <span>{profile.fingerprint ? 'Custom' : 'Default'}</span>
        </div>
        {profile.tags && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Tags:</span>
            <span className="truncate max-w-[120px]">{profile.tags}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isActive ? (
          <button
            onClick={() => onStop(profile.id)}
            disabled={isLoading}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
            Stop
          </button>
        ) : (
          <button
            onClick={() => onLaunch(profile.id)}
            disabled={isLoading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Launch
          </button>
        )}
        <button
          onClick={() => onDelete(profile.id)}
          disabled={isLoading}
          className="btn-secondary p-2"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
