import { Plus, Play, Square, Trash2 } from 'lucide-react';

export default function Profiles() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Browser Profiles</h1>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Create Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ProfileCard key={i} id={i} />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ id }: { id: number }) {
  const isActive = id === 1;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Profile {id}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chrome • Windows 10
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          isActive
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-400'
        }`}>
          {isActive ? 'Active' : 'Idle'}
        </span>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Proxy:</span>
          <span>US-NY-001</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Fingerprint:</span>
          <span>Custom</span>
        </div>
      </div>

      <div className="flex gap-2">
        {isActive ? (
          <button className="btn-danger flex-1 flex items-center justify-center gap-2">
            <Square size={16} />
            Stop
          </button>
        ) : (
          <button className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Play size={16} />
            Launch
          </button>
        )}
        <button className="btn-secondary p-2">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
