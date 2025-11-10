import { Plus, Play, Pause, Clock } from 'lucide-react';

export default function Automation() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Automation Tasks</h1>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <TaskCard key={i} id={i} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ id }: { id: number }) {
  const isRunning = id === 1;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Task {id}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automated login and data extraction
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          isRunning
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-400'
        }`}>
          {isRunning ? 'Running' : 'Paused'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock size={16} />
          <span>Last run: 2 hours ago</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Success rate: 95%
        </div>
      </div>

      <div className="flex gap-2">
        {isRunning ? (
          <button className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Pause size={16} />
            Pause
          </button>
        ) : (
          <button className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Play size={16} />
            Run
          </button>
        )}
      </div>
    </div>
  );
}
