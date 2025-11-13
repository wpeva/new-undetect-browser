/**
 * Session Manager Tests
 */

import { SessionManager, SessionConfig } from '../session-manager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('create', () => {
    it('should create a new session', async () => {
      const config: SessionConfig = {
        os: 'windows',
        protectionLevel: 'standard',
      };

      const session = await manager.create(config);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe('ready');
      expect(session.cdpEndpoint).toBeDefined();
      expect(session.wsEndpoint).toBeDefined();
      expect(session.profile).toBeDefined();
    });

    it('should create session with custom duration', async () => {
      const config: SessionConfig = {
        os: 'mac',
        maxDuration: 1800,
      };

      const session = await manager.create(config);
      const expectedExpiry = new Date(session.createdAt.getTime() + 1800 * 1000);

      expect(session.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    });

    it('should emit session:created event', async () => {
      const onCreated = jest.fn();
      manager.on('session:created', onCreated);

      await manager.create({ os: 'linux' });

      expect(onCreated).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should get session by id', async () => {
      const created = await manager.create({ os: 'windows' });
      const retrieved = await manager.get(created.id);

      expect(retrieved.id).toBe(created.id);
    });

    it('should throw error for non-existent session', async () => {
      await expect(manager.get('non-existent')).rejects.toThrow('not found');
    });

    it('should throw error for expired session', async () => {
      const session = await manager.create({ os: 'windows', maxDuration: 1 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      await expect(manager.get(session.id)).rejects.toThrow('expired');
    });
  });

  describe('execute', () => {
    it('should execute script in session', async () => {
      const session = await manager.create({ os: 'windows' });
      const result = await manager.execute(session.id, 'console.log("test")');

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should update session status during execution', async () => {
      const session = await manager.create({ os: 'windows' });

      const statusChanges: string[] = [];
      manager.on('session:status', ({ newStatus }) => {
        statusChanges.push(newStatus);
      });

      await manager.execute(session.id, 'test');

      expect(statusChanges).toContain('active');
      expect(statusChanges).toContain('idle');
    });
  });

  describe('destroy', () => {
    it('should destroy session', async () => {
      const session = await manager.create({ os: 'windows' });
      await manager.destroy(session.id);

      await expect(manager.get(session.id)).rejects.toThrow('not found');
    });

    it('should emit session:destroyed event', async () => {
      const onDestroyed = jest.fn();
      manager.on('session:destroyed', onDestroyed);

      const session = await manager.create({ os: 'windows' });
      await manager.destroy(session.id);

      expect(onDestroyed).toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      const session = await manager.create({ os: 'windows' });
      await manager.destroy(session.id);
      await manager.destroy(session.id); // Should not throw
    });
  });

  describe('list', () => {
    it('should list all sessions', async () => {
      await manager.create({ os: 'windows' });
      await manager.create({ os: 'mac' });

      const sessions = await manager.list();

      expect(sessions).toHaveLength(2);
    });

    it('should filter sessions by status', async () => {
      const session = await manager.create({ os: 'windows' });
      await manager.updateStatus(session.id, 'error');

      const errorSessions = await manager.list({ status: 'error' });

      expect(errorSessions).toHaveLength(1);
      expect(errorSessions[0].status).toBe('error');
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      await manager.create({ os: 'windows' });
      await manager.create({ os: 'mac' });

      const stats = manager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byStatus.ready).toBe(2);
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp', async () => {
      const session = await manager.create({ os: 'windows' });
      const originalActivity = session.lastActivity;

      await new Promise(resolve => setTimeout(resolve, 100));
      await manager.updateActivity(session.id);

      const updated = await manager.get(session.id);
      expect(updated.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });
  });

  describe('shutdown', () => {
    it('should destroy all sessions on shutdown', async () => {
      await manager.create({ os: 'windows' });
      await manager.create({ os: 'mac' });

      await manager.shutdown();

      expect(manager.getCount()).toBe(0);
    });
  });
});
