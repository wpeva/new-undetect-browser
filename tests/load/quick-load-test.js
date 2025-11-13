/**
 * Quick K6 Load Test for Development
 *
 * A shorter version of the stress test for quick validation during development.
 *
 * Usage:
 * k6 run tests/load/quick-load-test.js
 * k6 run --vus 50 --duration 2m tests/load/quick-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Custom metrics
const sessionCreationSuccess = new Rate('session_creation_success');
const sessionExecutionSuccess = new Rate('session_execution_success');
const creationTime = new Trend('session_creation_time');

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20
    { duration: '30s', target: 50 },  // Ramp to 50
    { duration: '1m', target: 50 },   // Stay at 50
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% under 3s
    http_req_failed: ['rate<0.05'],     // Less than 5% errors
    session_creation_success: ['rate>0.95'],
  },
};

export default function () {
  // Create session
  const createStart = Date.now();
  const createRes = http.post(
    `${API_BASE_URL}/api/v1/sessions`,
    JSON.stringify({
      country: 'US',
      os: 'windows',
      protectionLevel: 'medium',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  creationTime.add(Date.now() - createStart);

  const created = check(createRes, {
    'status is 200': (r) => r.status === 200,
  });

  sessionCreationSuccess.add(created);

  if (!created) {
    return;
  }

  const session = JSON.parse(createRes.body);

  // Execute script
  const execRes = http.post(
    `${API_BASE_URL}/api/v1/sessions/${session.id}/execute`,
    JSON.stringify({ script: 'return navigator.userAgent;' }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const executed = check(execRes, {
    'execution succeeded': (r) => r.status === 200,
  });

  sessionExecutionSuccess.add(executed);

  // Cleanup
  http.del(`${API_BASE_URL}/api/v1/sessions/${session.id}`);

  sleep(1);
}
