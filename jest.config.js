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
    process.env.CI ? '/tests/unit/behavioral-simulation.test.ts' : '',
    process.env.CI ? '/tests/unit/webdriver-evasion.test.ts' : '',
    process.env.CI ? '/tests/unit/network-protection.test.ts' : '',
    process.env.CI ? '/tests/unit/advanced-evasions.test.ts' : '',
    process.env.CI ? '/tests/unit/viewport-protection.test.ts' : '',
    process.env.CI ? '/tests/modules/headless-detection-protection.test.ts' : '',
    process.env.CI ? '/tests/modules/automation-detection-protection.test.ts' : '',
    process.env.CI ? '/tests/detection/sannysoft.test.ts' : '',
  ].filter(Boolean),
};
