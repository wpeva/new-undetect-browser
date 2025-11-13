/**
 * Integration Tests for Session Migration
 * Session 13: Multi-Region Deployment
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import SessionMigration, { Session, SessionState } from '../session-migration';

describe('SessionMigration', () => {
  let migration: SessionMigration;

  beforeEach(() => {
    migration = new SessionMigration();
  });

  afterEach(() => {
    migration.stop();
  });

  describe('Session Registration', () => {
    it('should register a new session', () => {
      const session: Session = {
        id: 'session-1',
        userId: 'user-1',
        browserId: 'browser-1',
        region: 'us-east',
        createdAt: new Date(),
        lastActivity: new Date(),
        state: SessionState.ACTIVE,
        data: {
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          tabs: [],
          profile: {
            fingerprint: {},
            userAgent: 'Mozilla/5.0',
            viewport: { width: 1920, height: 1080 },
            timezone: 'America/New_York',
            locale: 'en-US',
            webgl: {},
            canvas: {},
          },
          metadata: {},
        },
      };

      migration.registerSession(session);

      const retrieved = migration.getSession('session-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('session-1');
      expect(retrieved?.region).toBe('us-east');
    });

    it('should emit registration event', (done) => {
      migration.on('session:registered', (session) => {
        expect(session.id).toBe('session-2');
        done();
      });

      const session: Session = {
        id: 'session-2',
        userId: 'user-2',
        browserId: 'browser-2',
        region: 'eu-west',
        createdAt: new Date(),
        lastActivity: new Date(),
        state: SessionState.ACTIVE,
        data: {
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          tabs: [],
          profile: {
            fingerprint: {},
            userAgent: 'Mozilla/5.0',
            viewport: { width: 1920, height: 1080 },
            timezone: 'Europe/Dublin',
            locale: 'en-GB',
            webgl: {},
            canvas: {},
          },
          metadata: {},
        },
      };

      migration.registerSession(session);
    });
  });

  describe('Session Migration', () => {
    beforeEach(() => {
      // Register test session
      const session: Session = {
        id: 'migrate-test-1',
        userId: 'user-1',
        browserId: 'browser-1',
        region: 'us-east',
        createdAt: new Date(),
        lastActivity: new Date(),
        state: SessionState.ACTIVE,
        data: {
          cookies: [{ name: 'test', value: 'value' }],
          localStorage: { key: 'value' },
          sessionStorage: { key: 'value' },
          tabs: [{ url: 'https://example.com', title: 'Test', history: [], scrollPosition: { x: 0, y: 0 } }],
          profile: {
            fingerprint: {},
            userAgent: 'Mozilla/5.0',
            viewport: { width: 1920, height: 1080 },
            timezone: 'America/New_York',
            locale: 'en-US',
            webgl: {},
            canvas: {},
          },
          metadata: {},
        },
      };

      migration.registerSession(session);
    });

    it('should migrate session to another region', async () => {
      const result = await migration.migrateSession('migrate-test-1', 'eu-west');

      expect(result.success).toBe(true);
      expect(result.oldRegion).toBe('us-east');
      expect(result.newRegion).toBe('eu-west');
      expect(result.duration).toBeGreaterThan(0);

      const session = migration.getSession('migrate-test-1');
      expect(session?.region).toBe('eu-west');
    });

    it('should handle migration to same region', async () => {
      const result = await migration.migrateSession('migrate-test-1', 'us-east');

      expect(result.success).toBe(true);
      expect(result.error).toContain('Already in target region');
    });

    it('should handle non-existent session', async () => {
      const result = await migration.migrateSession('non-existent', 'eu-west');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should emit migration events', (done) => {
      let migratingEmitted = false;

      migration.on('session:migrating', (event) => {
        expect(event.sessionId).toBe('migrate-test-1');
        expect(event.oldRegion).toBe('us-east');
        expect(event.newRegion).toBe('eu-west');
        migratingEmitted = true;
      });

      migration.on('session:migrated', (event) => {
        expect(migratingEmitted).toBe(true);
        expect(event.sessionId).toBe('migrate-test-1');
        expect(event.newRegion).toBe('eu-west');
        done();
      });

      migration.migrateSession('migrate-test-1', 'eu-west');
    });
  });

  describe('Batch Migration', () => {
    beforeEach(() => {
      // Register multiple sessions
      for (let i = 1; i <= 5; i++) {
        const session: Session = {
          id: `batch-${i}`,
          userId: `user-${i}`,
          browserId: `browser-${i}`,
          region: 'us-east',
          createdAt: new Date(),
          lastActivity: new Date(),
          state: SessionState.ACTIVE,
          data: {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            tabs: [],
            profile: {
              fingerprint: {},
              userAgent: 'Mozilla/5.0',
              viewport: { width: 1920, height: 1080 },
              timezone: 'America/New_York',
              locale: 'en-US',
              webgl: {},
              canvas: {},
            },
            metadata: {},
          },
        };

        migration.registerSession(session);
      }
    });

    it('should migrate multiple sessions', async () => {
      const sessionIds = ['batch-1', 'batch-2', 'batch-3'];
      const results = await migration.batchMigrate(sessionIds, 'eu-west');

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.newRegion).toBe('eu-west');
      });
    });
  });

  describe('Region Evacuation', () => {
    beforeEach(() => {
      // Register sessions in us-east
      for (let i = 1; i <= 3; i++) {
        const session: Session = {
          id: `evac-${i}`,
          userId: `user-${i}`,
          browserId: `browser-${i}`,
          region: 'us-east',
          createdAt: new Date(),
          lastActivity: new Date(),
          state: SessionState.ACTIVE,
          data: {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            tabs: [],
            profile: {
              fingerprint: {},
              userAgent: 'Mozilla/5.0',
              viewport: { width: 1920, height: 1080 },
              timezone: 'America/New_York',
              locale: 'en-US',
              webgl: {},
              canvas: {},
            },
            metadata: {},
          },
        };

        migration.registerSession(session);
      }
    });

    it('should evacuate all sessions from region', async () => {
      const results = await migration.evacuateRegion('us-east');

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.oldRegion).toBe('us-east');
        expect(result.newRegion).not.toBe('us-east');
      });

      // Verify no sessions remain in us-east
      const remainingSessions = migration.getSessionsByRegion('us-east');
      expect(remainingSessions).toHaveLength(0);
    });

    it('should emit evacuation events', (done) => {
      migration.on('region:evacuated', (event) => {
        expect(event.sourceRegion).toBe('us-east');
        expect(event.results).toHaveLength(3);
        done();
      });

      migration.evacuateRegion('us-east');
    });
  });

  describe('Session Queries', () => {
    beforeEach(() => {
      // Register sessions in different regions
      const regions = ['us-east', 'eu-west', 'ap-south'];
      regions.forEach((region, idx) => {
        const session: Session = {
          id: `query-${idx + 1}`,
          userId: 'user-1',
          browserId: `browser-${idx + 1}`,
          region,
          createdAt: new Date(),
          lastActivity: new Date(),
          state: SessionState.ACTIVE,
          data: {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            tabs: [],
            profile: {
              fingerprint: {},
              userAgent: 'Mozilla/5.0',
              viewport: { width: 1920, height: 1080 },
              timezone: 'America/New_York',
              locale: 'en-US',
              webgl: {},
              canvas: {},
            },
            metadata: {},
          },
        };

        migration.registerSession(session);
      });
    });

    it('should get sessions by region', () => {
      const sessions = migration.getSessionsByRegion('us-east');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].region).toBe('us-east');
    });

    it('should get sessions by user', () => {
      const sessions = migration.getSessionsByUser('user-1');
      expect(sessions).toHaveLength(3);
    });

    it('should get specific session by ID', () => {
      const session = migration.getSession('query-1');
      expect(session).toBeDefined();
      expect(session?.id).toBe('query-1');
    });
  });

  describe('Session Termination', () => {
    beforeEach(() => {
      const session: Session = {
        id: 'terminate-test',
        userId: 'user-1',
        browserId: 'browser-1',
        region: 'us-east',
        createdAt: new Date(),
        lastActivity: new Date(),
        state: SessionState.ACTIVE,
        data: {
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          tabs: [],
          profile: {
            fingerprint: {},
            userAgent: 'Mozilla/5.0',
            viewport: { width: 1920, height: 1080 },
            timezone: 'America/New_York',
            locale: 'en-US',
            webgl: {},
            canvas: {},
          },
          metadata: {},
        },
      };

      migration.registerSession(session);
    });

    it('should terminate session', async () => {
      await migration.terminateSession('terminate-test');

      const session = migration.getSession('terminate-test');
      expect(session).toBeUndefined();
    });

    it('should emit termination event', (done) => {
      migration.on('session:terminated', (event) => {
        expect(event.sessionId).toBe('terminate-test');
        done();
      });

      migration.terminateSession('terminate-test');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Register sessions with different states and regions
      const sessions: Session[] = [
        {
          id: 'stat-1',
          userId: 'user-1',
          browserId: 'browser-1',
          region: 'us-east',
          createdAt: new Date(),
          lastActivity: new Date(),
          state: SessionState.ACTIVE,
          data: {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            tabs: [],
            profile: {
              fingerprint: {},
              userAgent: 'Mozilla/5.0',
              viewport: { width: 1920, height: 1080 },
              timezone: 'America/New_York',
              locale: 'en-US',
              webgl: {},
              canvas: {},
            },
            metadata: {},
          },
        },
        {
          id: 'stat-2',
          userId: 'user-2',
          browserId: 'browser-2',
          region: 'us-east',
          createdAt: new Date(),
          lastActivity: new Date(),
          state: SessionState.ACTIVE,
          data: {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            tabs: [],
            profile: {
              fingerprint: {},
              userAgent: 'Mozilla/5.0',
              viewport: { width: 1920, height: 1080 },
              timezone: 'America/New_York',
              locale: 'en-US',
              webgl: {},
              canvas: {},
            },
            metadata: {},
          },
        },
        {
          id: 'stat-3',
          userId: 'user-3',
          browserId: 'browser-3',
          region: 'eu-west',
          createdAt: new Date(),
          lastActivity: new Date(),
          state: SessionState.ACTIVE,
          data: {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            tabs: [],
            profile: {
              fingerprint: {},
              userAgent: 'Mozilla/5.0',
              viewport: { width: 1920, height: 1080 },
              timezone: 'Europe/Dublin',
              locale: 'en-GB',
              webgl: {},
              canvas: {},
            },
            metadata: {},
          },
        },
      ];

      sessions.forEach((s) => migration.registerSession(s));
    });

    it('should provide migration statistics', () => {
      const stats = migration.getStatistics();

      expect(stats.totalSessions).toBe(3);
      expect(stats.sessionsByRegion['us-east']).toBe(2);
      expect(stats.sessionsByRegion['eu-west']).toBe(1);
      expect(stats.sessionsByState[SessionState.ACTIVE]).toBe(3);
      expect(stats.queueLength).toBe(0);
    });
  });
});
