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
  // Skip Chrome-dependent tests in CI
  testPathIgnorePatterns: [
    '/node_modules/',
    process.env.CI ? 'behavioral-simulation\\.test\\.ts$' : '',
    process.env.CI ? 'webdriver-evasion\\.test\\.ts$' : '',
    process.env.CI ? 'network-protection\\.test\\.ts$' : '',
    process.env.CI ? 'advanced-evasions\\.test\\.ts$' : '',
    process.env.CI ? 'viewport-protection\\.test\\.ts$' : '',
    process.env.CI ? 'headless-detection-protection\\.test\\.ts$' : '',
    process.env.CI ? 'automation-detection-protection\\.test\\.ts$' : '',
    process.env.CI ? 'fingerprint-spoofing\\.test\\.ts$' : '',
    process.env.CI ? 'sannysoft\\.test\\.ts$' : '',
  ].filter(Boolean),
  maxWorkers: process.env.CI ? 2 : '50%',
  bail: false,
  errorOnDeprecated: true,
};
