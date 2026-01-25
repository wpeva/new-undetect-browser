import { useEffect, useState } from 'react';
import { Plus, CheckCircle, XCircle, Trash2, RefreshCw, Loader2, X } from 'lucide-react';
import { proxiesApi } from '@/api/client';

interface Proxy {
  id: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  city?: string;
  status?: string;
  speed?: number;
}

export default function Proxies() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const fetchProxies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await proxiesApi.getAll();
      const data = (response.data as any)?.data || response.data || [];
      setProxies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch proxies:', err);
      setError('Failed to load proxies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProxies();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proxy?')) return;
    try {
      await proxiesApi.delete(id);
      setProxies(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete proxy');
    }
  };

  const handleCheck = async (id: string) => {
    setCheckingId(id);
    try {
      const response = await proxiesApi.check(id);
      const result = response.data;
      setProxies(prev => prev.map(p =>
        p.id === id ? { ...p, status: result.success ? 'working' : 'failed', speed: result.data?.latencyMs } : p
      ));
    } catch (err) {
      setProxies(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'failed' } : p
      ));
    } finally {
      setCheckingId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'working':
      case 'active':
        return <span className="flex items-center gap-1 text-green-600"><CheckCircle size={16} />Working</span>;
      case 'failed':
        return <span className="flex items-center gap-1 text-red-600"><XCircle size={16} />Failed</span>;
      case 'checking':
        return <span className="flex items-center gap-1 text-yellow-600"><Loader2 size={16} className="animate-spin" />Checking</span>;
      default:
        return <span className="text-gray-500">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Proxy Management</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Proxy Management</h1>
        <div className="flex gap-2">
          <button onClick={fetchProxies} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={20} />
            Refresh
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Add Proxy
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 text-red-600">
          {error}
        </div>
      )}

      {proxies.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-4">No proxies yet. Add your first proxy!</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Proxy
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
              {proxies.map((proxy) => (
                <tr key={proxy.id}>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded uppercase">
                      {proxy.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{proxy.host}:{proxy.port}</td>
                  <td className="px-6 py-4 text-sm">
                    {proxy.username ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{proxy.country || '-'}{proxy.city ? `, ${proxy.city}` : ''}</td>
                  <td className="px-6 py-4">
                    {checkingId === proxy.id ? (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Loader2 size={16} className="animate-spin" />Checking
                      </span>
                    ) : (
                      getStatusBadge(proxy.status)
                    )}
                  </td>
                  <td className="px-6 py-4">{proxy.speed ? `${proxy.speed}ms` : '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCheck(proxy.id)}
                        disabled={checkingId === proxy.id}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        title="Check proxy"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(proxy.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete proxy"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddProxyModal
          onClose={() => setShowAddModal(false)}
          onAdd={(proxy) => {
            setProxies(prev => [proxy, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddProxyModal({ onClose, onAdd }: { onClose: () => void; onAdd: (proxy: Proxy) => void }) {
  const [form, setForm] = useState({
    type: 'http' as 'http' | 'https' | 'socks4' | 'socks5',
    host: '',
    port: '',
    username: '',
    password: '',
    country: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.host || !form.port) {
      setError('Host and port are required');
      return;
    }

    setLoading(true);
    try {
      const response = await proxiesApi.create({
        type: form.type,
        host: form.host,
        port: parseInt(form.port),
        username: form.username || undefined,
        password: form.password || undefined,
        country: form.country || undefined,
      });
      const newProxy = (response.data as any)?.data || response.data;
      onAdd(newProxy);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add proxy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Proxy</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
            >
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="socks4">SOCKS4</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Host *</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Port *</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                placeholder="8080"
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="US, DE, etc."
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-600"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Add Proxy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
