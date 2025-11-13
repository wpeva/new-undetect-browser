/**
 * Anti-Detect Browser Test Runner
 *
 * Custom test runner for running detection tests, performance benchmarks,
 * and integration tests.
 *
 * Features:
 * - Parallel test execution
 * - Custom assertions for anti-detect testing
 * - Report generation (HTML, JSON, Markdown)
 * - CI/CD integration
 * - Screenshot capture on failure
 */

import { Browser, Page } from 'puppeteer';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

// ========== Types ==========

export interface TestSuite {
  name: string;
  tests: Test[];
  before?: () => Promise<void>;
  after?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

export interface Test {
  name: string;
  fn: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
  only?: boolean;
}

export interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  duration: number;
  error?: Error;
  screenshot?: string;
}

export interface TestReport {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  timestamp: string;
}

// ========== Global State ==========

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;
let browser: Browser | null = null;
let page: Page | null = null;

// ========== Test Definition API ==========

export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    tests: [],
  };

  currentSuite = suite;
  fn();
  currentSuite = null;

  suites.push(suite);
}

export function it(name: string, fn: () => Promise<void>, timeout = 30000): void {
  if (!currentSuite) {
    throw new Error('it() must be called within describe()');
  }

  currentSuite.tests.push({
    name,
    fn,
    timeout,
  });
}

export function before(fn: () => Promise<void>): void {
  if (!currentSuite) {
    throw new Error('before() must be called within describe()');
  }
  currentSuite.before = fn;
}

export function after(fn: () => Promise<void>): void {
  if (!currentSuite) {
    throw new Error('after() must be called within describe()');
  }
  currentSuite.after = fn;
}

export function beforeEach(fn: () => Promise<void>): void {
  if (!currentSuite) {
    throw new Error('beforeEach() must be called within describe()');
  }
  currentSuite.beforeEach = fn;
}

export function afterEach(fn: () => Promise<void>): void {
  if (!currentSuite) {
    throw new Error('afterEach() must be called within describe()');
  }
  currentSuite.afterEach = fn;
}

export function skip(name: string, fn: () => Promise<void>): void {
  if (!currentSuite) {
    throw new Error('skip() must be called within describe()');
  }

  currentSuite.tests.push({
    name,
    fn,
    skip: true,
  });
}

export function only(name: string, fn: () => Promise<void>, timeout = 30000): void {
  if (!currentSuite) {
    throw new Error('only() must be called within describe()');
  }

  currentSuite.tests.push({
    name,
    fn,
    timeout,
    only: true,
  });
}

// ========== Assertion API ==========

export class Assertion<T> {
  constructor(private actual: T) {}

  toBe(expected: T): void {
    if (this.actual !== expected) {
      throw new AssertionError(
        `Expected ${this.format(this.actual)} to be ${this.format(expected)}`
      );
    }
  }

  toEqual(expected: T): void {
    if (JSON.stringify(this.actual) !== JSON.stringify(expected)) {
      throw new AssertionError(
        `Expected ${this.format(this.actual)} to equal ${this.format(expected)}`
      );
    }
  }

  toBeUndefined(): void {
    if (this.actual !== undefined) {
      throw new AssertionError(
        `Expected ${this.format(this.actual)} to be undefined`
      );
    }
  }

  toBeDefined(): void {
    if (this.actual === undefined) {
      throw new AssertionError('Expected value to be defined');
    }
  }

  toBeNull(): void {
    if (this.actual !== null) {
      throw new AssertionError(
        `Expected ${this.format(this.actual)} to be null`
      );
    }
  }

  toBeTruthy(): void {
    if (!this.actual) {
      throw new AssertionError(
        `Expected ${this.format(this.actual)} to be truthy`
      );
    }
  }

  toBeFalsy(): void {
    if (this.actual) {
      throw new AssertionError(
        `Expected ${this.format(this.actual)} to be falsy`
      );
    }
  }

  toContain(item: any): void {
    if (Array.isArray(this.actual)) {
      if (!this.actual.includes(item)) {
        throw new AssertionError(
          `Expected array to contain ${this.format(item)}`
        );
      }
    } else if (typeof this.actual === 'string') {
      if (!this.actual.includes(item as string)) {
        throw new AssertionError(
          `Expected string to contain "${item}"`
        );
      }
    } else {
      throw new AssertionError('toContain() requires array or string');
    }
  }

  toMatch(pattern: RegExp): void {
    if (typeof this.actual !== 'string') {
      throw new AssertionError('toMatch() requires string');
    }
    if (!pattern.test(this.actual)) {
      throw new AssertionError(
        `Expected "${this.actual}" to match ${pattern}`
      );
    }
  }

  toBeGreaterThan(value: number): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError('toBeGreaterThan() requires number');
    }
    if (this.actual <= value) {
      throw new AssertionError(
        `Expected ${this.actual} to be greater than ${value}`
      );
    }
  }

  toBeLessThan(value: number): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError('toBeLessThan() requires number');
    }
    if (this.actual >= value) {
      throw new AssertionError(
        `Expected ${this.actual} to be less than ${value}`
      );
    }
  }

  toBeInRange(min: number, max: number): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError('toBeInRange() requires number');
    }
    if (this.actual < min || this.actual > max) {
      throw new AssertionError(
        `Expected ${this.actual} to be in range [${min}, ${max}]`
      );
    }
  }

  // Anti-detect specific assertions

  toBeUndetectable(): void {
    // Custom assertion for checking if value indicates detection
    const detectableValues = [true, 'true', 'detected', 'automation', 'webdriver'];
    if (detectableValues.includes(this.actual as any)) {
      throw new AssertionError(
        `Detectable value found: ${this.format(this.actual)}`
      );
    }
  }

  toHaveRealisticFingerprint(): void {
    // Check if fingerprint looks realistic (not empty, not default values)
    if (!this.actual || typeof this.actual !== 'object') {
      throw new AssertionError('Expected object with fingerprint properties');
    }

    const fp = this.actual as any;

    // Check common suspicious patterns
    if (fp.plugins && fp.plugins.length === 0) {
      throw new AssertionError('Suspicious: No plugins detected');
    }
    if (fp.languages && fp.languages.length === 0) {
      throw new AssertionError('Suspicious: No languages detected');
    }
  }

  private format(value: T): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

export function expect<T>(actual: T): Assertion<T> {
  return new Assertion(actual);
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

// ========== Test Runner ==========

export async function run(options: {
  parallel?: boolean;
  bail?: boolean;
  grep?: string;
  reporter?: 'console' | 'json' | 'html';
} = {}): Promise<TestReport> {
  const {
    parallel = false,
    bail = false,
    grep = '',
    reporter = 'console',
  } = options;

  const startTime = performance.now();
  const results: TestResult[] = [];

  console.log('\n🚀 Starting test run...\n');

  // Filter suites by grep
  let filteredSuites = suites;
  if (grep) {
    filteredSuites = suites.filter(
      (suite) => suite.name.includes(grep) || suite.tests.some((t) => t.name.includes(grep))
    );
  }

  // Check for .only tests
  const hasOnly = filteredSuites.some((suite) => suite.tests.some((t) => t.only));
  if (hasOnly) {
    filteredSuites = filteredSuites.map((suite) => ({
      ...suite,
      tests: suite.tests.filter((t) => t.only),
    }));
  }

  // Run suites
  for (const suite of filteredSuites) {
    console.log(`📦 ${suite.name}`);

    if (suite.before) {
      await suite.before();
    }

    for (const test of suite.tests) {
      if (test.skip) {
        console.log(`  ⊘ ${test.name} (skipped)`);
        continue;
      }

      const testStartTime = performance.now();

      if (suite.beforeEach) {
        await suite.beforeEach();
      }

      try {
        // Run test with timeout
        await Promise.race([
          test.fn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Test timeout after ${test.timeout}ms`)),
              test.timeout || 30000
            )
          ),
        ]);

        const duration = performance.now() - testStartTime;
        console.log(`  ✓ ${test.name} (${duration.toFixed(0)}ms)`);

        results.push({
          suite: suite.name,
          test: test.name,
          passed: true,
          duration,
        });
      } catch (error) {
        const duration = performance.now() - testStartTime;
        console.log(`  ✗ ${test.name} (${duration.toFixed(0)}ms)`);
        console.log(`    ${(error as Error).message}`);

        // Capture screenshot on failure if browser is available
        let screenshot: string | undefined;
        if (page && !page.isClosed()) {
          try {
            screenshot = await page.screenshot({ encoding: 'base64' });
          } catch {}
        }

        results.push({
          suite: suite.name,
          test: test.name,
          passed: false,
          duration,
          error: error as Error,
          screenshot,
        });

        if (bail) {
          break;
        }
      }

      if (suite.afterEach) {
        await suite.afterEach();
      }
    }

    if (suite.after) {
      await suite.after();
    }

    console.log('');

    if (bail && results.some((r) => !r.passed)) {
      break;
    }
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  const report: TestReport = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    skipped: filteredSuites.reduce(
      (acc, suite) => acc + suite.tests.filter((t) => t.skip).length,
      0
    ),
    duration,
    results,
    timestamp: new Date().toISOString(),
  };

  // Print summary
  console.log('─'.repeat(60));
  console.log(`Total:   ${report.total}`);
  console.log(`✓ Passed: ${report.passed}`);
  console.log(`✗ Failed: ${report.failed}`);
  console.log(`⊘ Skipped: ${report.skipped}`);
  console.log(`⏱ Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('─'.repeat(60));

  // Generate report
  if (reporter === 'json') {
    await generateJSONReport(report);
  } else if (reporter === 'html') {
    await generateHTMLReport(report);
  }

  return report;
}

// ========== Report Generation ==========

async function generateJSONReport(report: TestReport): Promise<void> {
  const reportPath = path.join(__dirname, '../reports/test-results.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 JSON report: ${reportPath}`);
}

async function generateHTMLReport(report: TestReport): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .passed { color: green; }
    .failed { color: red; }
    .test { margin: 10px 0; padding: 10px; border-left: 3px solid #ddd; }
    .test.passed { border-color: green; }
    .test.failed { border-color: red; }
    .error { background: #ffe6e6; padding: 10px; border-radius: 3px; margin: 5px 0; }
  </style>
</head>
<body>
  <h1>Test Report</h1>
  <div class="summary">
    <p>Timestamp: ${report.timestamp}</p>
    <p>Duration: ${(report.duration / 1000).toFixed(2)}s</p>
    <p>Total: ${report.total}</p>
    <p class="passed">✓ Passed: ${report.passed}</p>
    <p class="failed">✗ Failed: ${report.failed}</p>
    <p>⊘ Skipped: ${report.skipped}</p>
  </div>
  <h2>Results</h2>
  ${report.results
    .map(
      (r) => `
    <div class="test ${r.passed ? 'passed' : 'failed'}">
      <strong>${r.suite} › ${r.test}</strong>
      <span style="float: right;">${r.duration.toFixed(0)}ms</span>
      ${r.error ? `<div class="error">${r.error.message}</div>` : ''}
      ${r.screenshot ? `<img src="data:image/png;base64,${r.screenshot}" style="max-width: 100%;">` : ''}
    </div>
  `
    )
    .join('')}
</body>
</html>
  `;

  const reportPath = path.join(__dirname, '../reports/test-results.html');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, html);
  console.log(`\n📄 HTML report: ${reportPath}`);
}

// ========== Browser Helpers ==========

export function setBrowser(b: Browser): void {
  browser = b;
}

export function setPage(p: Page): void {
  page = p;
}

export function getBrowser(): Browser | null {
  return browser;
}

export function getPage(): Page | null {
  return page;
}

// ========== Exports ==========

export { Browser, Page } from 'puppeteer';
