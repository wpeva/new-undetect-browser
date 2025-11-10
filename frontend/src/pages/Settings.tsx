export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <nav className="card p-2 space-y-1">
            {['General', 'Appearance', 'API Keys', 'Team', 'Integrations', 'Advanced'].map((item) => (
              <button
                key={item}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">General Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="label">Application Name</label>
                  <input
                    type="text"
                    className="input"
                    defaultValue="UndetectBrowser"
                  />
                </div>

                <div>
                  <label className="label">Default Language</label>
                  <select className="input">
                    <option>English</option>
                    <option>Russian</option>
                    <option>Chinese</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Enable notifications</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Auto-start on system boot</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-dark-700 pt-6">
              <button className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
