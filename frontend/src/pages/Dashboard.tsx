import { LayoutDashboard, Users, Globe, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="text-primary-600" />}
          title="Total Profiles"
          value="24"
          change="+12%"
        />
        <StatCard
          icon={<Globe className="text-green-600" />}
          title="Active Proxies"
          value="156"
          change="+8%"
        />
        <StatCard
          icon={<TrendingUp className="text-blue-600" />}
          title="Success Rate"
          value="98.5%"
          change="+2.3%"
        />
        <StatCard
          icon={<LayoutDashboard className="text-purple-600" />}
          title="Running Browsers"
          value="8"
          change="active"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-dark-700">
                <span className="text-gray-600 dark:text-gray-400">Profile {i} launched</span>
                <span className="text-sm text-gray-500">2m ago</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="btn-primary w-full">Create New Profile</button>
            <button className="btn-secondary w-full">Add Proxy</button>
            <button className="btn-secondary w-full">Run Automation</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, change }: any) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        {icon}
        <span className="text-sm text-green-600">{change}</span>
      </div>
      <h3 className="text-2xl font-bold">{value}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
    </div>
  );
}
