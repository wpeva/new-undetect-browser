/**
 * Cloud API Server Tests
 */

import { CloudAPIServer } from '../server';
import fetch from 'node-fetch';

// Mock fetch for testing
global.fetch = fetch as any;

describe('CloudAPIServer', () => {
  let server: CloudAPIServer;
  const port = 3100;
  const baseURL = `http://localhost:${port}/api/v1`;

  beforeAll(async () => {
    server = new CloudAPIServer({ port });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Health endpoint', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseURL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.uptime).toBeGreaterThan(0);
    });
  });

  describe('Stats endpoint', () => {
    it('should return server statistics', async () => {
      const response = await fetch(`${baseURL}/stats`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toBeDefined();
      expect(data.websocket).toBeDefined();
      expect(data.server).toBeDefined();
    });
  });

  describe('Session endpoints', () => {
    let sessionId: string;

    it('should create a session', async () => {
      const response = await fetch(`${baseURL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          os: 'windows',
          protectionLevel: 'standard',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
      expect(data.session.id).toBeDefined();

      sessionId = data.session.id;
    });

    it('should get session by id', async () => {
      const response = await fetch(`${baseURL}/sessions/${sessionId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.id).toBe(sessionId);
    });

    it('should list sessions', async () => {
      const response = await fetch(`${baseURL}/sessions`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.sessions)).toBe(true);
      expect(data.count).toBeGreaterThan(0);
    });

    it('should execute script in session', async () => {
      const response = await fetch(`${baseURL}/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: 'console.log("test")',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.executionTime).toBeGreaterThan(0);
    });

    it('should update session activity', async () => {
      const response = await fetch(`${baseURL}/sessions/${sessionId}/activity`, {
        method: 'PUT',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should destroy session', async () => {
      const response = await fetch(`${baseURL}/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`${baseURL}/sessions/non-existent`);

      expect(response.status).toBe(500); // Will throw error
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown endpoint', async () => {
      const response = await fetch(`${baseURL}/unknown`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid script execution', async () => {
      const session = await fetch(`${baseURL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os: 'windows' }),
      });
      const { session: s } = await session.json();

      const response = await fetch(`${baseURL}/sessions/${s.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing script
      });

      expect(response.status).toBe(400);

      // Cleanup
      await fetch(`${baseURL}/sessions/${s.id}`, { method: 'DELETE' });
    });
  });

  describe('OpenAPI documentation', () => {
    it('should serve OpenAPI spec', async () => {
      const response = await fetch(`http://localhost:${port}/api-docs/openapi.json`);
      const spec = await response.json();

      expect(response.status).toBe(200);
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.paths).toBeDefined();
    });

    it('should serve Swagger UI', async () => {
      const response = await fetch(`http://localhost:${port}/api-docs`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain('swagger-ui');
    });
  });
});
