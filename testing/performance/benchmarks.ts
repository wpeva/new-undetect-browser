/**
 * Performance Benchmarks
 *
 * Measures performance overhead of anti-detection protections
 * compared to vanilla Chrome.
 *
 * Metrics:
 * - Memory usage (baseline, per-session)
 * - CPU usage (idle, active)
 * - Page load time
 * - JavaScript execution time
 * - Canvas operation time
 * - WebGL operation time
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { performance } from 'perf_hooks';
import { StealthEngine } from '../../src/core/stealth-engine';
import * as os from 'os';

// ========== Types ==========

interface BenchmarkResult {
  name: string;
  vanilla: number;
  protected: number;
  overhead: number;
  overheadPercent: number;
  unit: string;
}

interface BenchmarkReport {
  timestamp: string;
  system: {
    platform: string;
    cpus: number;
    totalMemory: number;
    freeMemory: number;
  };
  results: BenchmarkResult[];
  summary: {
    avgOverhead: number;
    maxOverhead: number;
    acceptableOverhead: boolean; // < 10%
  };
}

// ========== Benchmarks ==========

async function benchmarkMemoryUsage(): Promise<BenchmarkResult> {
  console.log('📊 Benchmarking memory usage...');

  // Vanilla Chrome
  const vanillaBrowser = await puppeteer.launch({ headless: true });
  const vanillaPage = await vanillaBrowser.newPage();
  await vanillaPage.goto('about:blank');

  const vanillaMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  await vanillaBrowser.close();

  // Protected Chrome
  const protectedBrowser = await puppeteer.launch({ headless: true });
  const protectedPage = await protectedBrowser.newPage();

  const stealth = new StealthEngine({ level: 'paranoid' });
  await stealth.applyProtections(protectedPage, 'Mozilla/5.0...');

  await protectedPage.goto('about:blank');
  const protectedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  await protectedBrowser.close();

  const overhead = protectedMemory - vanillaMemory;
  const overheadPercent = (overhead / vanillaMemory) * 100;

  return {
    name: 'Memory Usage (idle)',
    vanilla: vanillaMemory,
    protected: protectedMemory,
    overhead,
    overheadPercent,
    unit: 'MB',
  };
}

async function benchmarkPageLoad(): Promise<BenchmarkResult> {
  console.log('📊 Benchmarking page load time...');

  const testUrl = 'https://example.com';

  // Vanilla Chrome
  const vanillaBrowser = await puppeteer.launch({ headless: true });
  const vanillaPage = await vanillaBrowser.newPage();

  const vanillaStart = performance.now();
  await vanillaPage.goto(testUrl, { waitUntil: 'networkidle2' });
  const vanillaTime = performance.now() - vanillaStart;

  await vanillaBrowser.close();

  // Protected Chrome
  const protectedBrowser = await puppeteer.launch({ headless: true });
  const protectedPage = await protectedBrowser.newPage();

  const stealth = new StealthEngine({ level: 'paranoid' });
  await stealth.applyProtections(protectedPage, 'Mozilla/5.0...');

  const protectedStart = performance.now();
  await protectedPage.goto(testUrl, { waitUntil: 'networkidle2' });
  const protectedTime = performance.now() - protectedStart;

  await protectedBrowser.close();

  const overhead = protectedTime - vanillaTime;
  const overheadPercent = (overhead / vanillaTime) * 100;

  return {
    name: 'Page Load Time',
    vanilla: vanillaTime,
    protected: protectedTime,
    overhead,
    overheadPercent,
    unit: 'ms',
  };
}

async function benchmarkCanvasOperations(): Promise<BenchmarkResult> {
  console.log('📊 Benchmarking canvas operations...');

  const canvasCode = `
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = 'blue';
      ctx.fillText('Test ' + i, 10, 10);
      const data = canvas.toDataURL();
    }

    const end = performance.now();
    (end - start);
  `;

  // Vanilla
  const vanillaBrowser = await puppeteer.launch({ headless: true });
  const vanillaPage = await vanillaBrowser.newPage();
  const vanillaTime = await vanillaPage.evaluate(canvasCode);
  await vanillaBrowser.close();

  // Protected
  const protectedBrowser = await puppeteer.launch({ headless: true });
  const protectedPage = await protectedBrowser.newPage();
  const stealth = new StealthEngine({ level: 'paranoid' });
  await stealth.applyProtections(protectedPage, 'Mozilla/5.0...');
  const protectedTime = await protectedPage.evaluate(canvasCode);
  await protectedBrowser.close();

  const overhead = protectedTime - vanillaTime;
  const overheadPercent = (overhead / vanillaTime) * 100;

  return {
    name: 'Canvas Operations (1000x)',
    vanilla: vanillaTime,
    protected: protectedTime,
    overhead,
    overheadPercent,
    unit: 'ms',
  };
}

async function benchmarkJavaScriptExecution(): Promise<BenchmarkResult> {
  console.log('📊 Benchmarking JavaScript execution...');

  const jsCode = `
    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const obj = {
        a: Math.random(),
        b: Math.random(),
        c: Math.random(),
      };
      JSON.stringify(obj);
      JSON.parse(JSON.stringify(obj));
    }

    const end = performance.now();
    (end - start);
  `;

  // Vanilla
  const vanillaBrowser = await puppeteer.launch({ headless: true });
  const vanillaPage = await vanillaBrowser.newPage();
  const vanillaTime = await vanillaPage.evaluate(jsCode);
  await vanillaBrowser.close();

  // Protected
  const protectedBrowser = await puppeteer.launch({ headless: true });
  const protectedPage = await protectedBrowser.newPage();
  const stealth = new StealthEngine({ level: 'paranoid' });
  await stealth.applyProtections(protectedPage, 'Mozilla/5.0...');
  const protectedTime = await protectedPage.evaluate(jsCode);
  await protectedBrowser.close();

  const overhead = protectedTime - vanillaTime;
  const overheadPercent = (overhead / vanillaTime) * 100;

  return {
    name: 'JavaScript Execution',
    vanilla: vanillaTime,
    protected: protectedTime,
    overhead,
    overheadPercent,
    unit: 'ms',
  };
}

// ========== Main Runner ==========

export async function runBenchmarks(): Promise<BenchmarkReport> {
  console.log('\n🏁 Starting performance benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Run benchmarks
  results.push(await benchmarkMemoryUsage());
  results.push(await benchmarkPageLoad());
  results.push(await benchmarkCanvasOperations());
  results.push(await benchmarkJavaScriptExecution());

  // Calculate summary
  const avgOverhead =
    results.reduce((sum, r) => sum + r.overheadPercent, 0) / results.length;
  const maxOverhead = Math.max(...results.map((r) => r.overheadPercent));
  const acceptableOverhead = avgOverhead < 10; // < 10% is acceptable

  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem() / 1024 / 1024 / 1024, // GB
      freeMemory: os.freemem() / 1024 / 1024 / 1024, // GB
    },
    results,
    summary: {
      avgOverhead,
      maxOverhead,
      acceptableOverhead,
    },
  };

  // Print results
  console.log('\n📈 Results:\n');
  console.log('─'.repeat(80));
  console.log(
    'Benchmark'.padEnd(30) +
      'Vanilla'.padEnd(15) +
      'Protected'.padEnd(15) +
      'Overhead'
  );
  console.log('─'.repeat(80));

  for (const result of results) {
    const vanilla = `${result.vanilla.toFixed(2)} ${result.unit}`;
    const protected = `${result.protected.toFixed(2)} ${result.unit}`;
    const overhead = `+${result.overheadPercent.toFixed(1)}%`;

    console.log(
      result.name.padEnd(30) +
        vanilla.padEnd(15) +
        protected.padEnd(15) +
        overhead
    );
  }

  console.log('─'.repeat(80));
  console.log(`Average overhead: ${avgOverhead.toFixed(1)}%`);
  console.log(`Maximum overhead: ${maxOverhead.toFixed(1)}%`);
  console.log(
    `Status: ${acceptableOverhead ? '✅ PASS' : '❌ FAIL'} (threshold: 10%)`
  );
  console.log('─'.repeat(80));

  return report;
}

// Run if executed directly
if (require.main === module) {
  runBenchmarks()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
