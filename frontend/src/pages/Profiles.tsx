import { useEffect, useState } from 'react';
import { Plus, Play, Square, Trash2, RefreshCw, Loader2, Settings, X } from 'lucide-react';
import { profilesApi, proxiesApi } from '@/api/client';

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

interface Proxy {
  id: string;
  type: string;
  host: string;
  port: number;
  country?: string;
  status?: string;
}

export default function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, proxiesRes] = await Promise.all([
        profilesApi.getAll(),
        proxiesApi.getAll()
      ]);
      const profilesData = (profilesRes.data as any)?.data || profilesRes.data || [];
      const proxiesData = (proxiesRes.data as any)?.data || proxiesRes.data || [];
      setProfiles(Array.isArray(profilesData) ? profilesData : []);
      setProxies(Array.isArray(proxiesData) ? proxiesData : []);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load profiles. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLaunch = async (id: string) => {
    setActionLoading(id);
    try {
      await profilesApi.launch(id);
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

  const handleUpdateProfile = async (id: string, updates: Partial<Profile>) => {
    try {
      await profilesApi.update(id, updates);
      setProfiles(prev => prev.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ));
      setEditingProfile(null);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile: ' + (err.response?.data?.error || err.message));
    }
  };

  const getProxyInfo = (proxyId?: string) => {
    if (!proxyId) return null;
    return proxies.find(p => p.id === proxyId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Browser Profiles</h1>
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
        <h1 className="text-3xl font-bold">Browser Profiles</h1>
        <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <button onClick={fetchData} className="mt-4 btn-primary flex items-center gap-2">
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
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2">
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
          <p className="text-gray-500 dark:text-gray-400 mb-4">No profiles yet. Create your first profile!</p>
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
              proxy={getProxyInfo(profile.proxy_id)}
              onLaunch={handleLaunch}
              onStop={handleStop}
              onDelete={handleDelete}
              onEdit={() => setEditingProfile(profile)}
              isLoading={actionLoading === profile.id}
            />
          ))}
        </div>
      )}

      {editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          proxies={proxies}
          onClose={() => setEditingProfile(null)}
          onSave={handleUpdateProfile}
        />
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  proxy,
  onLaunch,
  onStop,
  onDelete,
  onEdit,
  isLoading,
}: {
  profile: Profile;
  proxy: Proxy | null | undefined;
  onLaunch: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  isLoading: boolean;
}) {
  const isActive = profile.status === 'active' || profile.status === 'running';
  const isError = profile.status === 'error';

  const getStatusBadge = () => {
    if (isError) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    if (isActive) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
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
          <span className={proxy ? 'text-green-600' : 'text-gray-400'}>
            {proxy ? `${proxy.type.toUpperCase()} ${proxy.host}:${proxy.port}` : 'None'}
          </span>
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
          onClick={onEdit}
          disabled={isLoading || isActive}
          className="btn-secondary p-2"
          title="Edit profile"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => onDelete(profile.id)}
          disabled={isLoading || isActive}
          className="btn-secondary p-2"
          title="Delete profile"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function EditProfileModal({
  profile,
  proxies,
  onClose,
  onSave,
}: {
  profile: Profile;
  proxies: Proxy[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Profile>) => void;
}) {
  const [form, setForm] = useState({
    name: profile.name,
    proxy_id: profile.proxy_id || '',
    tags: profile.tags || '',
    notes: profile.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(profile.id, {
      name: form.name,
      proxy_id: form.proxy_id || undefined,
      tags: form.tags || undefined,
      notes: form.notes || undefined,
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Proxy</label>
            <select
              value={form.proxy_id}
              onChange={(e) => setForm({ ...form, proxy_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
            >
              <option value="">No Proxy (Direct Connection)</option>
              {proxies.map((proxy) => (
                <option key={proxy.id} value={proxy.id}>
                  {proxy.type.toUpperCase()} {proxy.host}:{proxy.port} {proxy.country ? `(${proxy.country})` : ''}
                </option>
              ))}
            </select>
            {proxies.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No proxies available. <a href="/proxies" className="text-primary-600 hover:underline">Add proxies first</a>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g., work, personal"
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
