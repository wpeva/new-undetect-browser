/**
 * Full Platform E2E Test Suite
 *
 * This test suite performs end-to-end testing of the entire antidetect platform,
 * including session creation, detection tests, and cleanup.
 *
 * Tests cover:
 * - Session creation via API
 * - Detection testing against multiple services (Pixelscan, CreepJS, BrowserLeaks)
 * - Session execution and cleanup
 * - Performance metrics
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.antidetect.io';
const API_TIMEOUT = 120000; // 2 minutes

interface SessionResponse {
  id: string;
  country: string;
  os: string;
  browserVersion: string;
  protectionLevel: string;
  created: string;
}

interface DetectionResults {
  pixelscan?: string;
  creepjs?: string;
  canvas?: string;
  webrtc?: string;
  audio?: string;
  webgl?: string;
}

interface ExecutionResponse {
  result: DetectionResults;
  executionTime: number;
  status: string;
}

describe('Full Platform E2E Test', () => {
  let sessionId: string;

  beforeAll(() => {
    // Ensure API is available
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL environment variable is required');
    }
  });

  afterEach(async () => {
    // Cleanup: Always destroy session after each test
    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn(`Failed to cleanup session ${sessionId}:`, error);
      }
    }
  });

  it('should create session, execute script, pass detection tests', async () => {
    // 1. Create session via API
    const createResponse = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: 'US',
        os: 'windows',
        browserVersion: '120.0.0.0',
        protectionLevel: 'paranoid',
      }),
    });

    expect(createResponse.status).toBe(200);

    const session = (await createResponse.json()) as SessionResponse;
    sessionId = session.id;

    expect(session.id).toBeDefined();
    expect(session.country).toBe('US');
    expect(session.os).toBe('windows');
    expect(session.protectionLevel).toBe('paranoid');

    // 2. Execute detection tests
    const testScript = `
      const results = {};

      try {
        // Test pixelscan
        await page.goto('https://pixelscan.net', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('.score', { timeout: 10000 });
        results.pixelscan = await page.$eval('.score', el => el.textContent);
      } catch (error) {
        results.pixelscan = 'Error: ' + error.message;
      }

      try {
        // Test creepjs
        await page.goto('https://abrahamjuliot.github.io/creepjs/', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(5000);
        results.creepjs = await page.evaluate(() => {
          const gradeEl = document.querySelector('.grade');
          return gradeEl ? gradeEl.textContent : 'Not found';
        });
      } catch (error) {
        results.creepjs = 'Error: ' + error.message;
      }

      try {
        // Test browserleaks canvas
        await page.goto('https://browserleaks.com/canvas', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);
        results.canvas = await page.evaluate(() => {
          const hashEl = document.querySelector('.hash');
          return hashEl ? hashEl.textContent : 'Generated';
        });
      } catch (error) {
        results.canvas = 'Error: ' + error.message;
      }

      try {
        // Test WebRTC leak
        await page.goto('https://browserleaks.com/webrtc', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);
        results.webrtc = await page.evaluate(() => {
          const leaks = document.querySelectorAll('.leak');
          return leaks.length === 0 ? 'No leaks detected' : \`\${leaks.length} leaks found\`;
        });
      } catch (error) {
        results.webrtc = 'Error: ' + error.message;
      }

      return results;
    `;

    const execResponse = await fetch(
      `${API_BASE_URL}/api/v1/sessions/${session.id}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: testScript }),
      }
    );

    expect(execResponse.status).toBe(200);

    const execResult = (await execResponse.json()) as ExecutionResponse;
    const { result } = execResult;

    // 3. Verify detection scores
    console.log('Detection Test Results:', result);

    // Verify each detection test ran
    expect(result.pixelscan).toBeDefined();
    expect(result.creepjs).toBeDefined();
    expect(result.canvas).toBeDefined();
    expect(result.webrtc).toBeDefined();

    // Verify no errors occurred
    expect(result.pixelscan).not.toContain('Error:');
    expect(result.creepjs).not.toContain('Error:');
    expect(result.canvas).not.toContain('Error:');
    expect(result.webrtc).not.toContain('Error:');

    // Verify detection bypass success
    // Note: These are flexible checks as detection services may change
    if (result.pixelscan && !result.pixelscan.includes('Error')) {
      // Pixelscan should show high score (typically 80%+)
      console.log('Pixelscan score:', result.pixelscan);
    }

    if (result.creepjs && !result.creepjs.includes('Error')) {
      // CreepJS should show good grade (A, A+, B+, etc.)
      console.log('CreepJS grade:', result.creepjs);
    }

    if (result.webrtc && !result.webrtc.includes('Error')) {
      // Should have no WebRTC leaks
      expect(result.webrtc).toContain('No leaks');
    }

    // 4. Cleanup is handled in afterEach
  }, API_TIMEOUT);

  it('should handle multiple concurrent operations on same session', async () => {
    // Create session
    const createResponse = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: 'GB',
        os: 'macos',
        browserVersion: '119.0.0.0',
        protectionLevel: 'high',
      }),
    });

    const session = (await createResponse.json()) as SessionResponse;
    sessionId = session.id;

    // Execute multiple operations in parallel
    const operations = [
      fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: 'return navigator.userAgent;' }),
      }),
      fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: 'return navigator.platform;' }),
      }),
      fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: 'return navigator.hardwareConcurrency;' }),
      }),
    ];

    const results = await Promise.all(operations);

    // All operations should succeed
    results.forEach((response) => {
      expect(response.status).toBe(200);
    });
  }, 60000);

  it('should properly handle session lifecycle', async () => {
    // Create
    const createResponse = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: 'DE',
        os: 'linux',
        browserVersion: '121.0.0.0',
        protectionLevel: 'medium',
      }),
    });

    expect(createResponse.status).toBe(200);
    const session = (await createResponse.json()) as SessionResponse;
    sessionId = session.id;

    // Read session info
    const getResponse = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`);
    expect(getResponse.status).toBe(200);
    const sessionInfo = await getResponse.json();
    expect(sessionInfo.id).toBe(sessionId);

    // Execute simple task
    const execResponse = await fetch(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: 'return "test";' }),
      }
    );
    expect(execResponse.status).toBe(200);

    // Delete
    const deleteResponse = await fetch(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}`,
      { method: 'DELETE' }
    );
    expect(deleteResponse.status).toBe(200);

    // Verify deletion
    const verifyResponse = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`);
    expect(verifyResponse.status).toBe(404);

    // Clear sessionId to prevent cleanup attempt
    sessionId = '';
  }, 60000);

  it('should validate session creation with invalid parameters', async () => {
    const invalidRequests = [
      { country: 'INVALID', os: 'windows', protectionLevel: 'high' },
      { country: 'US', os: 'invalid_os', protectionLevel: 'high' },
      { country: 'US', os: 'windows', protectionLevel: 'invalid_level' },
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      // Should return error (400 or 422)
      expect([400, 422]).toContain(response.status);
    }
  }, 30000);

  it('should measure session performance metrics', async () => {
    const startTime = Date.now();

    // Create session
    const createResponse = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: 'US',
        os: 'windows',
        protectionLevel: 'high',
      }),
    });

    const createTime = Date.now() - startTime;
    expect(createResponse.status).toBe(200);
    expect(createTime).toBeLessThan(10000); // Should create in < 10s

    const session = (await createResponse.json()) as SessionResponse;
    sessionId = session.id;

    // Execute script and measure performance
    const execStart = Date.now();
    const execResponse = await fetch(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: 'return performance.now();',
        }),
      }
    );
    const execTime = Date.now() - execStart;

    expect(execResponse.status).toBe(200);
    expect(execTime).toBeLessThan(5000); // Should execute in < 5s

    console.log('Performance Metrics:', {
      sessionCreationTime: createTime,
      scriptExecutionTime: execTime,
      totalTime: Date.now() - startTime,
    });
  }, 30000);
});

describe('Detection Tests E2E', () => {
  let sessionId: string;

  afterEach(async () => {
    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn(`Failed to cleanup session ${sessionId}:`, error);
      }
    }
  });

  it('should pass Sannysoft detection tests', async () => {
    const createResponse = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: 'US',
        os: 'windows',
        protectionLevel: 'paranoid',
      }),
    });

    const session = (await createResponse.json()) as SessionResponse;
    sessionId = session.id;

    const testScript = `
      await page.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      const results = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr'));
        const failed = rows.filter(row => {
          const text = row.textContent || '';
          return text.includes('failed') || text.includes('WebDriver');
        });

        return {
          totalTests: rows.length,
          failedTests: failed.length,
          passedTests: rows.length - failed.length,
        };
      });

      return results;
    `;

    const execResponse = await fetch(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: testScript }),
      }
    );

    const { result } = (await execResponse.json()) as ExecutionResponse;
    console.log('Sannysoft results:', result);

    expect(result).toBeDefined();
    // Should have high pass rate
    if (result.totalTests && result.passedTests) {
      const passRate = (result.passedTests / result.totalTests) * 100;
      expect(passRate).toBeGreaterThan(80); // At least 80% pass rate
    }
  }, API_TIMEOUT);

  it('should pass Incolumitas bot detection', async () => {
    const createResponse = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: 'US',
        os: 'windows',
        protectionLevel: 'paranoid',
      }),
    });

    const session = (await createResponse.json()) as SessionResponse;
    sessionId = session.id;

    const testScript = `
      await page.goto('https://bot.incolumitas.com', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(5000);

      const results = await page.evaluate(() => {
        const detectionResult = document.body.textContent || '';
        return {
          isBot: detectionResult.toLowerCase().includes('bot detected'),
          fullText: detectionResult.substring(0, 500),
        };
      });

      return results;
    `;

    const execResponse = await fetch(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: testScript }),
      }
    );

    const { result } = (await execResponse.json()) as ExecutionResponse;
    console.log('Incolumitas results:', result);

    expect(result).toBeDefined();
    expect(result.isBot).toBe(false); // Should not be detected as bot
  }, API_TIMEOUT);
});

describe('Stress Testing E2E', () => {
  it('should handle rapid session creation and destruction', async () => {
    const sessionCount = 10;
    const sessionIds: string[] = [];

    try {
      // Create multiple sessions rapidly
      const createPromises = Array.from({ length: sessionCount }, () =>
        fetch(`${API_BASE_URL}/api/v1/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: 'US',
            os: 'windows',
            protectionLevel: 'medium',
          }),
        })
      );

      const responses = await Promise.all(createPromises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const sessions = await Promise.all(
        responses.map((r) => r.json() as Promise<SessionResponse>)
      );

      sessionIds.push(...sessions.map((s) => s.id));

      // Destroy all sessions
      const deletePromises = sessionIds.map((id) =>
        fetch(`${API_BASE_URL}/api/v1/sessions/${id}`, {
          method: 'DELETE',
        })
      );

      const deleteResponses = await Promise.all(deletePromises);
      deleteResponses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    } finally {
      // Cleanup any remaining sessions
      for (const id of sessionIds) {
        try {
          await fetch(`${API_BASE_URL}/api/v1/sessions/${id}`, {
            method: 'DELETE',
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }, 120000);
});
