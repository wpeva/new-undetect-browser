module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
      },
    }],
  },
  testTimeout: 30000,
  // Skip Chrome-dependent tests in CI (only run unit tests that don't need browser)
  testPathIgnorePatterns: process.env.CI ? [
    '/node_modules/',
    '/tests/unit/behavioral-simulation\\.test\\.ts',
    '/tests/unit/webdriver-evasion\\.test\\.ts',
    '/tests/unit/network-protection\\.test\\.ts',
    '/tests/unit/advanced-evasions\\.test\\.ts',
    '/tests/unit/viewport-protection\\.test\\.ts',
    '/tests/unit/fingerprint-spoofing\\.test\\.ts',
    '/tests/modules/headless-detection-protection\\.test\\.ts',
    '/tests/modules/automation-detection-protection\\.test\\.ts',
    '/tests/detection/',
  ] : ['/node_modules/'],
  maxWorkers: process.env.CI ? 2 : '50%',
  bail: false,
  errorOnDeprecated: true,
};
