/**
 * Example React Component for Profile Management
 * This demonstrates how to use the v2 API
 */

import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface Profile {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'error';
  group_id?: string;
  created_at: number;
  use_count: number;
}

const API_URL = 'http://localhost:3000/api/v2';
const WS_URL = 'http://localhost:3000';

export const ProfileManager: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newProfileName, setNewProfileName] = useState('');

  // Initialize WebSocket
  useEffect(() => {
    const ws = io(WS_URL);
    setSocket(ws);

    ws.on('connect', () => console.log('✅ Connected to server'));
    
    ws.on('profile:created', (profile: Profile) => {
      setProfiles(prev => [profile, ...prev]);
    });

    ws.on('profile:updated', (profile: Profile) => {
      setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
    });

    ws.on('profile:deleted', (profileId: string) => {
      setProfiles(prev => prev.filter(p => p.id !== profileId));
    });

    ws.on('profile:status', ({ profileId, status }) => {
      setProfiles(prev => prev.map(p => 
        p.id === profileId ? { ...p, status } : p
      ));
    });

    return () => {
      ws.disconnect();
    };
  }, []);

  // Load profiles
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await fetch(`${API_URL}/profiles`);
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!newProfileName.trim()) return;

    try {
      const res = await fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName }),
      });
      
      const data = await res.json();
      if (data.success) {
        setNewProfileName('');
        // Profile will be added via WebSocket event
      }
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const launchProfile = async (profileId: string) => {
    try {
      await fetch(`${API_URL}/profiles/${profileId}/launch`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to launch profile:', error);
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!confirm('Delete this profile?')) return;

    try {
      await fetch(`${API_URL}/profiles/${profileId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading profiles...</div>;
  }

  return (
    <div className="profile-manager">
      <h1>Profile Manager</h1>
      
      {/* Create Profile Form */}
      <div className="create-form">
        <input
          type="text"
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          placeholder="New profile name"
          onKeyPress={(e) => e.key === 'Enter' && createProfile()}
        />
        <button onClick={createProfile}>Create Profile</button>
      </div>

      {/* Profile List */}
      <div className="profile-list">
        <h2>Profiles ({profiles.length})</h2>
        {profiles.length === 0 ? (
          <p>No profiles yet. Create one above!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(profile => (
                <tr key={profile.id}>
                  <td>{profile.name}</td>
                  <td>
                    <span className={`status status-${profile.status}`}>
                      {profile.status}
                    </span>
                  </td>
                  <td>{profile.use_count}x</td>
                  <td>
                    <button onClick={() => launchProfile(profile.id)}>
                      Launch
                    </button>
                    <button onClick={() => deleteProfile(profile.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat">
          <label>Total:</label>
          <span>{profiles.length}</span>
        </div>
        <div className="stat">
          <label>Active:</label>
          <span>{profiles.filter(p => p.status === 'active').length}</span>
        </div>
        <div className="stat">
          <label>Idle:</label>
          <span>{profiles.filter(p => p.status === 'idle').length}</span>
        </div>
      </div>
    </div>
  );
};

// Example CSS
const styles = `
.profile-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.create-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.create-form input {
  flex: 1;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.create-form button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.profile-list table {
  width: 100%;
  border-collapse: collapse;
}

.profile-list th,
.profile-list td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-idle {
  background: #f0f0f0;
  color: #666;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.stats {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.stat {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.stat label {
  font-weight: bold;
  margin-right: 10px;
}
`;
