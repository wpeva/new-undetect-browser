/**
 * K6 Configuration File
 *
 * Central configuration for k6 load testing
 */

module.exports = {
  // Test scenarios
  scenarios: {
    // Quick smoke test
    smoke: {
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.1'],
      },
    },

    // Load test
    load: {
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.05'],
      },
    },

    // Stress test
    stress: {
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '10m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<5000'],
        http_req_failed: ['rate<0.01'],
      },
    },

    // Spike test
    spike: {
      stages: [
        { duration: '1m', target: 100 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 1000 },
        { duration: '1m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<5000'],
        http_req_failed: ['rate<0.1'],
      },
    },

    // Soak test (endurance)
    soak: {
      stages: [
        { duration: '5m', target: 100 },
        { duration: '1h', target: 100 },
        { duration: '5m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.01'],
      },
    },
  },

  // Common thresholds
  thresholds: {
    // HTTP errors should be less than 1%
    http_req_failed: ['rate<0.01'],

    // 95% of requests should be below 5s
    http_req_duration: ['p(95)<5000'],

    // Average request duration should be below 2s
    'http_req_duration{name:CreateSession}': ['avg<2000'],

    // Script execution should be fast
    'http_req_duration{name:ExecuteScript}': ['avg<1000'],

    // Session deletion should be instant
    'http_req_duration{name:DeleteSession}': ['avg<500'],
  },

  // Output options
  outputs: {
    json: './k6-results.json',
    influxdb: process.env.INFLUXDB_URL,
  },

  // Environment variables
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  },
};
