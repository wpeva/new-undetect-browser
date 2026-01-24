import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Profiles from './pages/Profiles';
import Proxies from './pages/Proxies';
import Automation from './pages/Automation';
import Settings from './pages/Settings';
import BrowserEmulation from './pages/BrowserEmulation';
import { initWebSocket, disconnectWebSocket } from './api/websocket';

function App() {
  // Initialize WebSocket connection on app mount
  useEffect(() => {
    // Connect to WebSocket server
    initWebSocket();

    // Cleanup on unmount
    return () => {
      disconnectWebSocket();
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="proxies" element={<Proxies />} />
          <Route path="automation" element={<Automation />} />
          <Route path="browser-emulation" element={<BrowserEmulation />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
