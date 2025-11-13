/**
 * K6 Load Testing Script for Antidetect Platform
 *
 * This script performs load testing on the antidetect platform API
 * to test handling of 1000+ concurrent sessions.
 *
 * Test Stages:
 * - Ramp up from 0 to 100 sessions over 5 minutes
 * - Hold at 100 sessions for 10 minutes
 * - Ramp up to 500 sessions over 5 minutes
 * - Hold at 500 sessions for 10 minutes
 * - Ramp up to 1000 sessions over 5 minutes
 * - Hold at 1000 sessions for 10 minutes
 * - Ramp down to 0 over 5 minutes
 *
 * Total duration: ~50 minutes
 *
 * Usage:
 * k6 run tests/load/stress-test.js
 * k6 run --vus 100 --duration 30s tests/load/stress-test.js (quick test)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Configuration
const API_BASE_URL = __ENV.API_BASE_URL || 'https://api.antidetect.io';

// Custom metrics
const sessionCreationRate = new Rate('session_creation_success');
const sessionExecutionRate = new Rate('session_execution_success');
const sessionDeletionRate = new Rate('session_deletion_success');
const sessionCreationDuration = new Trend('session_creation_duration');
const sessionExecutionDuration = new Trend('session_execution_duration');
const totalSessions = new Counter('total_sessions_created');
const failedSessions = new Counter('failed_sessions');

// Test configuration
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to 100 sessions
    { duration: '10m', target: 100 },  // Stay at 100
    { duration: '5m', target: 500 },   // Ramp to 500
    { duration: '10m', target: 500 },  // Stay at 500
    { duration: '5m', target: 1000 },  // Ramp to 1000
    { duration: '10m', target: 1000 }, // Stay at 1000
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // 95% of requests should complete within 5 seconds
    http_req_duration: ['p(95)<5000'],
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'],
    // Session creation should succeed at least 99% of the time
    session_creation_success: ['rate>0.99'],
    // Session execution should succeed at least 98% of the time
    session_execution_success: ['rate>0.98'],
    // Average session creation should be under 3 seconds
    session_creation_duration: ['avg<3000'],
  },
  // Environment-specific settings
  noConnectionReuse: false,
  userAgent: 'K6-Load-Test/1.0',
};

// Helper function to generate random session config
function generateSessionConfig() {
  const countries = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP'];
  const oses = ['windows', 'macos', 'linux'];
  const protectionLevels = ['low', 'medium', 'high', 'paranoid'];

  return {
    country: countries[Math.floor(Math.random() * countries.length)],
    os: oses[Math.floor(Math.random() * oses.length)],
    browserVersion: '120.0.0.0',
    protectionLevel: protectionLevels[Math.floor(Math.random() * protectionLevels.length)],
  };
}

// Main test scenario
export default function () {
  const sessionConfig = generateSessionConfig();

  // 1. Create session
  const createStartTime = Date.now();
  const createRes = http.post(
    `${API_BASE_URL}/api/v1/sessions`,
    JSON.stringify(sessionConfig),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'CreateSession' },
    }
  );

  const createDuration = Date.now() - createStartTime;
  sessionCreationDuration.add(createDuration);

  const createSuccess = check(createRes, {
    'session created successfully': (r) => r.status === 200,
    'session has valid id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id && body.id.length > 0;
      } catch {
        return false;
      }
    },
    'response time acceptable': (r) => r.timings.duration < 10000,
  });

  sessionCreationRate.add(createSuccess);

  if (!createSuccess) {
    failedSessions.add(1);
    sleep(1);
    return; // Skip rest if session creation failed
  }

  totalSessions.add(1);

  let session;
  try {
    session = JSON.parse(createRes.body);
  } catch (error) {
    console.error('Failed to parse session response:', error);
    failedSessions.add(1);
    return;
  }

  // Small delay between operations
  sleep(0.5);

  // 2. Execute simple script
  const execStartTime = Date.now();
  const execRes = http.post(
    `${API_BASE_URL}/api/v1/sessions/${session.id}/execute`,
    JSON.stringify({
      script: 'return navigator.userAgent;',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'ExecuteScript' },
    }
  );

  const execDuration = Date.now() - execStartTime;
  sessionExecutionDuration.add(execDuration);

  const execSuccess = check(execRes, {
    'script executed successfully': (r) => r.status === 200,
    'execution has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result !== undefined;
      } catch {
        return false;
      }
    },
  });

  sessionExecutionRate.add(execSuccess);

  // Small delay before cleanup
  sleep(0.5);

  // 3. Destroy session
  const deleteRes = http.del(
    `${API_BASE_URL}/api/v1/sessions/${session.id}`,
    null,
    {
      tags: { name: 'DeleteSession' },
    }
  );

  const deleteSuccess = check(deleteRes, {
    'session deleted successfully': (r) => r.status === 200 || r.status === 204,
  });

  sessionDeletionRate.add(deleteSuccess);

  // Random think time between iterations (0.5-2 seconds)
  sleep(Math.random() * 1.5 + 0.5);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log(`Starting load test against ${API_BASE_URL}`);
  console.log('Test will create up to 1000 concurrent sessions');

  // Optional: Check API health before starting
  const healthRes = http.get(`${API_BASE_URL}/health`);
  if (healthRes.status !== 200) {
    console.warn('API health check failed, proceeding anyway...');
  }

  return { startTime: Date.now() };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`Load test completed after ${duration.toFixed(2)} minutes`);
}

// Handle summary for better reporting
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}

// Helper function for text summary
function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n\n';
  summary += `${indent}Load Test Summary\n`;
  summary += `${indent}================\n\n`;

  // Request metrics
  summary += `${indent}HTTP Requests:\n`;
  summary += `${indent}  Total: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}  Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n\n`;

  // Custom metrics
  if (data.metrics.total_sessions_created) {
    summary += `${indent}Sessions:\n`;
    summary += `${indent}  Created: ${data.metrics.total_sessions_created.values.count}\n`;
    summary += `${indent}  Failed: ${data.metrics.failed_sessions.values.count}\n`;
    summary += `${indent}  Success Rate: ${(data.metrics.session_creation_success.values.rate * 100).toFixed(2)}%\n\n`;
  }

  return summary;
}

// Helper function for HTML report
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    .metric { display: inline-block; margin: 10px; padding: 15px; background: #f9f9f9; border-left: 4px solid #4CAF50; min-width: 200px; }
    .metric-title { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .metric-value { font-size: 24px; color: #333; margin-top: 5px; }
    .success { color: #4CAF50; }
    .warning { color: #FF9800; }
    .error { color: #F44336; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Antidetect Platform Load Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Total Requests</div>
        <div class="metric-value">${data.metrics.http_reqs.values.count}</div>
      </div>

      <div class="metric">
        <div class="metric-title">Failed Requests</div>
        <div class="metric-value ${data.metrics.http_req_failed.values.rate > 0.01 ? 'error' : 'success'}">
          ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
        </div>
      </div>

      <div class="metric">
        <div class="metric-title">Avg Response Time</div>
        <div class="metric-value">${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</div>
      </div>

      <div class="metric">
        <div class="metric-title">P95 Response Time</div>
        <div class="metric-value ${data.metrics.http_req_duration.values['p(95)'] > 5000 ? 'warning' : 'success'}">
          ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
        </div>
      </div>
    </div>

    <h2>Session Metrics</h2>
    <div class="metrics">
      ${data.metrics.total_sessions_created ? `
      <div class="metric">
        <div class="metric-title">Sessions Created</div>
        <div class="metric-value">${data.metrics.total_sessions_created.values.count}</div>
      </div>
      ` : ''}

      ${data.metrics.session_creation_success ? `
      <div class="metric">
        <div class="metric-title">Creation Success Rate</div>
        <div class="metric-value ${data.metrics.session_creation_success.values.rate < 0.99 ? 'warning' : 'success'}">
          ${(data.metrics.session_creation_success.values.rate * 100).toFixed(2)}%
        </div>
      </div>
      ` : ''}
    </div>

    <h2>Thresholds</h2>
    <ul>
      ${Object.entries(data.thresholds || {}).map(([name, threshold]) => `
        <li class="${threshold.ok ? 'success' : 'error'}">${name}: ${threshold.ok ? 'PASSED' : 'FAILED'}</li>
      `).join('')}
    </ul>
  </div>
</body>
</html>
  `;
}
