/**
 * Performance Metrics and Monitoring Test Suite
 *
 * This suite measures and validates performance metrics across the platform:
 * - Session creation time
 * - Script execution time
 * - Memory usage
 * - CPU usage
 * - Network latency
 * - Concurrent session handling
 * - Resource cleanup
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.antidetect.io';

interface PerformanceMetrics {
  sessionCreation: number;
  scriptExecution: number;
  sessionDestruction: number;
  totalTime: number;
  memoryUsed?: number;
}

interface SessionInfo {
  id: string;
  created: number;
}

describe('Performance Metrics and Monitoring', () => {
  const metrics: PerformanceMetrics[] = [];

  afterAll(() => {
    // Calculate and display aggregate metrics
    if (metrics.length > 0) {
      const avgCreation =
        metrics.reduce((sum, m) => sum + m.sessionCreation, 0) / metrics.length;
      const avgExecution =
        metrics.reduce((sum, m) => sum + m.scriptExecution, 0) / metrics.length;
      const avgDestruction =
        metrics.reduce((sum, m) => sum + m.sessionDestruction, 0) / metrics.length;
      const avgTotal =
        metrics.reduce((sum, m) => sum + m.totalTime, 0) / metrics.length;

      console.log('\n========================================');
      console.log('PERFORMANCE METRICS SUMMARY');
      console.log('========================================');
      console.log(`Average Session Creation: ${avgCreation.toFixed(2)}ms`);
      console.log(`Average Script Execution: ${avgExecution.toFixed(2)}ms`);
      console.log(`Average Session Destruction: ${avgDestruction.toFixed(2)}ms`);
      console.log(`Average Total Time: ${avgTotal.toFixed(2)}ms`);
      console.log(`Total Tests: ${metrics.length}`);
      console.log('========================================\n');
    }
  });

  describe('Session Lifecycle Performance', () => {
    it('should create session in under 5 seconds', async () => {
      const startTime = performance.now();

      const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: 'US',
          os: 'windows',
          protectionLevel: 'high',
        }),
      });

      const creationTime = performance.now() - startTime;

      expect(response.status).toBe(200);
      expect(creationTime).toBeLessThan(5000);

      const session = await response.json();

      // Cleanup
      await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}`, {
        method: 'DELETE',
      });

      console.log(`Session creation time: ${creationTime.toFixed(2)}ms`);
    }, 30000);

    it('should execute simple script in under 2 seconds', async () => {
      // Create session
      const createRes = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: 'US',
          os: 'windows',
          protectionLevel: 'medium',
        }),
      });

      const session = await createRes.json();

      // Execute script and measure time
      const execStartTime = performance.now();

      const execRes = await fetch(
        `${API_BASE_URL}/api/v1/sessions/${session.id}/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: 'return navigator.userAgent;',
          }),
        }
      );

      const executionTime = performance.now() - execStartTime;

      expect(execRes.status).toBe(200);
      expect(executionTime).toBeLessThan(2000);

      // Cleanup
      await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}`, {
        method: 'DELETE',
      });

      console.log(`Script execution time: ${executionTime.toFixed(2)}ms`);
    }, 30000);

    it('should destroy session in under 1 second', async () => {
      // Create session
      const createRes = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: 'US',
          os: 'windows',
          protectionLevel: 'low',
        }),
      });

      const session = await createRes.json();

      // Destroy and measure time
      const destroyStartTime = performance.now();

      const destroyRes = await fetch(
        `${API_BASE_URL}/api/v1/sessions/${session.id}`,
        { method: 'DELETE' }
      );

      const destroyTime = performance.now() - destroyStartTime;

      expect(destroyRes.status).toBe(200);
      expect(destroyTime).toBeLessThan(1000);

      console.log(`Session destruction time: ${destroyTime.toFixed(2)}ms`);
    }, 30000);
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle 10 concurrent session creations efficiently', async () => {
      const startTime = performance.now();
      const sessionIds: string[] = [];

      try {
        // Create 10 sessions concurrently
        const createPromises = Array.from({ length: 10 }, () =>
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
        const totalTime = performance.now() - startTime;

        // All should succeed
        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });

        const sessions = await Promise.all(responses.map((r) => r.json()));
        sessionIds.push(...sessions.map((s) => s.id));

        // Should complete in reasonable time (under 15 seconds for 10 sessions)
        expect(totalTime).toBeLessThan(15000);

        console.log(
          `10 concurrent sessions created in ${totalTime.toFixed(2)}ms (${(totalTime / 10).toFixed(2)}ms avg per session)`
        );
      } finally {
        // Cleanup
        await Promise.all(
          sessionIds.map((id) =>
            fetch(`${API_BASE_URL}/api/v1/sessions/${id}`, {
              method: 'DELETE',
            })
          )
        );
      }
    }, 60000);

    it('should handle 50 concurrent script executions', async () => {
      // Create session first
      const createRes = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: 'US',
          os: 'windows',
          protectionLevel: 'low',
        }),
      });

      const session = await createRes.json();

      try {
        const startTime = performance.now();

        // Execute 50 scripts concurrently
        const execPromises = Array.from({ length: 50 }, () =>
          fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script: 'return Math.random();',
            }),
          })
        );

        const responses = await Promise.all(execPromises);
        const totalTime = performance.now() - startTime;

        // All should succeed
        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });

        console.log(
          `50 concurrent executions in ${totalTime.toFixed(2)}ms (${(totalTime / 50).toFixed(2)}ms avg per execution)`
        );
      } finally {
        // Cleanup
        await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}`, {
          method: 'DELETE',
        });
      }
    }, 60000);
  });

  describe('Complex Operations Performance', () => {
    it('should handle complex detection test within time limits', async () => {
      const metric: PerformanceMetrics = {
        sessionCreation: 0,
        scriptExecution: 0,
        sessionDestruction: 0,
        totalTime: 0,
      };

      const totalStartTime = performance.now();

      // 1. Create session
      const createStartTime = performance.now();
      const createRes = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: 'US',
          os: 'windows',
          protectionLevel: 'paranoid',
        }),
      });
      metric.sessionCreation = performance.now() - createStartTime;

      expect(createRes.status).toBe(200);
      const session = await createRes.json();

      // 2. Execute complex script
      const execStartTime = performance.now();
      const complexScript = `
        const results = {};

        // Test navigator properties
        results.userAgent = navigator.userAgent;
        results.platform = navigator.platform;
        results.vendor = navigator.vendor;
        results.hardwareConcurrency = navigator.hardwareConcurrency;

        // Test screen properties
        results.screenWidth = screen.width;
        results.screenHeight = screen.height;
        results.colorDepth = screen.colorDepth;

        // Test WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (gl) {
          results.webglVendor = gl.getParameter(gl.VENDOR);
          results.webglRenderer = gl.getParameter(gl.RENDERER);
        }

        return results;
      `;

      const execRes = await fetch(
        `${API_BASE_URL}/api/v1/sessions/${session.id}/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: complexScript }),
        }
      );
      metric.scriptExecution = performance.now() - execStartTime;

      expect(execRes.status).toBe(200);

      // 3. Destroy session
      const destroyStartTime = performance.now();
      await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}`, {
        method: 'DELETE',
      });
      metric.sessionDestruction = performance.now() - destroyStartTime;

      metric.totalTime = performance.now() - totalStartTime;
      metrics.push(metric);

      // Validate performance thresholds
      expect(metric.sessionCreation).toBeLessThan(10000);
      expect(metric.scriptExecution).toBeLessThan(5000);
      expect(metric.sessionDestruction).toBeLessThan(2000);
      expect(metric.totalTime).toBeLessThan(15000);

      console.log('Complex operation metrics:', metric);
    }, 60000);

    it('should maintain performance under sequential load', async () => {
      const iterations = 5;
      const iterationMetrics: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        // Create session
        const createRes = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: 'US',
            os: 'windows',
            protectionLevel: 'medium',
          }),
        });

        const session = await createRes.json();

        // Execute script
        await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: 'return performance.now();',
          }),
        });

        // Cleanup
        await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}`, {
          method: 'DELETE',
        });

        const iterationTime = performance.now() - startTime;
        iterationMetrics.push(iterationTime);
      }

      // Check for performance degradation
      const avgTime =
        iterationMetrics.reduce((sum, t) => sum + t, 0) / iterations;
      const maxTime = Math.max(...iterationMetrics);
      const minTime = Math.min(...iterationMetrics);

      console.log('Sequential load metrics:', {
        iterations,
        avgTime: avgTime.toFixed(2),
        minTime: minTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        variance: (maxTime - minTime).toFixed(2),
      });

      // Performance should not degrade significantly
      expect(maxTime - minTime).toBeLessThan(5000); // Max 5s variance
    }, 120000);
  });

  describe('Resource Management', () => {
    it('should properly cleanup resources after session destruction', async () => {
      const sessionIds: string[] = [];

      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: 'US',
            os: 'windows',
            protectionLevel: 'medium',
          }),
        });

        const session = await res.json();
        sessionIds.push(session.id);
      }

      // Destroy all sessions
      for (const id of sessionIds) {
        const res = await fetch(`${API_BASE_URL}/api/v1/sessions/${id}`, {
          method: 'DELETE',
        });
        expect(res.status).toBe(200);
      }

      // Verify sessions are actually destroyed
      for (const id of sessionIds) {
        const res = await fetch(`${API_BASE_URL}/api/v1/sessions/${id}`);
        expect(res.status).toBe(404); // Should not exist
      }
    }, 60000);

    it('should handle memory efficiently with large payloads', async () => {
      const createRes = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: 'US',
          os: 'windows',
          protectionLevel: 'low',
        }),
      });

      const session = await createRes.json();

      try {
        // Execute script with large return value
        const largeDataScript = `
          const largeArray = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            data: 'x'.repeat(100),
            timestamp: Date.now(),
          }));
          return largeArray;
        `;

        const startTime = performance.now();

        const execRes = await fetch(
          `${API_BASE_URL}/api/v1/sessions/${session.id}/execute`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script: largeDataScript }),
          }
        );

        const executionTime = performance.now() - startTime;

        expect(execRes.status).toBe(200);
        const result = await execRes.json();
        expect(Array.isArray(result.result)).toBe(true);
        expect(result.result.length).toBe(1000);

        // Should handle large payload efficiently
        expect(executionTime).toBeLessThan(10000);

        console.log(
          `Large payload execution time: ${executionTime.toFixed(2)}ms`
        );
      } finally {
        await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}`, {
          method: 'DELETE',
        });
      }
    }, 60000);
  });

  describe('Latency and Response Time', () => {
    it('should have low API latency', async () => {
      const measurements: number[] = [];

      // Measure latency over 10 requests
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        await fetch(`${API_BASE_URL}/health`);

        const latency = performance.now() - startTime;
        measurements.push(latency);
      }

      const avgLatency =
        measurements.reduce((sum, l) => sum + l, 0) / measurements.length;
      const maxLatency = Math.max(...measurements);

      console.log('API Latency:', {
        average: avgLatency.toFixed(2),
        max: maxLatency.toFixed(2),
        measurements: measurements.map((l) => l.toFixed(2)),
      });

      // Average latency should be under 100ms
      expect(avgLatency).toBeLessThan(100);
    }, 30000);
  });
});
