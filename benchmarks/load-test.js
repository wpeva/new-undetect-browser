/**
 * Load Testing Script
 * Session 14 - Performance Benchmarks
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const sessionCreationTime = new Trend('session_creation_time');
const detectionScore = new Trend('detection_score');
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
    'detection_score': ['avg>9.5'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.post(`${BASE_URL}/api/sessions`, JSON.stringify({
    deviceType: 'desktop',
    osType: 'windows'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has sessionId': (r) => r.json('sessionId') !== undefined,
  });

  if (res.status === 200) {
    const data = res.json();
    detectionScore.add(data.detectionScore);
  } else {
    errorRate.add(1);
  }

  sleep(1);
}
