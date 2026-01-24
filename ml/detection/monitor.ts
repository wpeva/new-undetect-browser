/**
 * Session 11: Adaptive Detection System - Monitor
 *
 * Automated detection testing system that continuously monitors
 * browser fingerprint against known detection sites.
 */

import { Browser, Page } from 'puppeteer';
import { logger } from '../../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface DetectorConfig {
  name: string;
  url: string;
  testFunction: (page: Page) => Promise<DetectionScore>;
  weight: number; // Importance weight (1-10)
}

export interface DetectionScore {
  detector: string;
  score: number; // 0-100 (100 = perfect, 0 = detected)
  details: {
    passed: string[];
    failed: string[];
    warnings: string[];
  };
  timestamp: number;
  metadata?: any;
}

export interface DetectionReport {
  timestamp: number;
  overallScore: number; // Weighted average of all scores
  detectorScores: DetectionScore[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
  configSnapshot: any;
}

/**
 * Detection Monitor
 *
 * Runs automated tests against multiple detection sites
 * and provides actionable feedback.
 */
export class DetectionMonitor {
  private detectors: DetectorConfig[] = [];
  private historyFile: string;
  private history: DetectionReport[] = [];

  constructor(historyFile = './ml/detection/history.json') {
    this.historyFile = historyFile;
    this.loadHistory();
    this.initializeDetectors();
  }

  /**
   * Initialize detector configurations
   */
  private initializeDetectors(): void {
    // PixelScan detector
    this.detectors.push({
      name: 'PixelScan',
      url: 'https://pixelscan.net',
      testFunction: this.testPixelScan.bind(this),
      weight: 10, // Critical
    });

    // CreepJS detector
    this.detectors.push({
      name: 'CreepJS',
      url: 'https://abrahamjuliot.github.io/creepjs/',
      testFunction: this.testCreepJS.bind(this),
      weight: 9,
    });

    // BrowserLeaks detector
    this.detectors.push({
      name: 'BrowserLeaks',
      url: 'https://browserleaks.com/canvas',
      testFunction: this.testBrowserLeaks.bind(this),
      weight: 8,
    });

    // Incolumitas detector
    this.detectors.push({
      name: 'Incolumitas',
      url: 'https://bot.incolumitas.com/',
      testFunction: this.testIncolumitas.bind(this),
      weight: 9,
    });

    // Sannysoft detector
    this.detectors.push({
      name: 'Sannysoft',
      url: 'https://bot.sannysoft.com/',
      testFunction: this.testSannysoft.bind(this),
      weight: 7,
    });
  }

  /**
   * Test against PixelScan
   */
  private async testPixelScan(page: Page): Promise<DetectionScore> {
    const passed: string[] = [];
    const failed: string[] = [];
    const warnings: string[] = [];

    try {
      await page.goto('https://pixelscan.net', { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for scans to complete

      // Check for detection indicators
      const results = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return {
          hasAutomation: bodyText.includes('automation') || bodyText.includes('webdriver'),
          hasHeadless: bodyText.includes('headless'),
          hasBot: bodyText.includes('bot detected'),
          trustScore: document.querySelector('[data-testid="trust-score"]')?.textContent || 'unknown',
        };
      });

      if (!results.hasAutomation) {
        passed.push('No automation detected');
      } else {
        failed.push('Automation detected');
      }

      if (!results.hasHeadless) {
        passed.push('No headless detected');
      } else {
        failed.push('Headless detected');
      }

      if (!results.hasBot) {
        passed.push('No bot flag');
      } else {
        failed.push('Bot detected');
      }

      // Calculate score
      const score = (passed.length / (passed.length + failed.length)) * 100;

      return {
        detector: 'PixelScan',
        score: Math.round(score),
        details: { passed, failed, warnings },
        timestamp: Date.now(),
        metadata: { trustScore: results.trustScore },
      };
    } catch (error: any) {
      logger.error(`PixelScan test failed: ${error.message}`);
      return {
        detector: 'PixelScan',
        score: 0,
        details: { passed: [], failed: ['Test execution failed'], warnings: [] },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Test against CreepJS
   */
  private async testCreepJS(page: Page): Promise<DetectionScore> {
    const passed: string[] = [];
    const failed: string[] = [];
    const warnings: string[] = [];

    try {
      await page.goto('https://abrahamjuliot.github.io/creepjs/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for tests to run

      const results = await page.evaluate(() => {
        const getText = (selector: string) =>
          document.querySelector(selector)?.textContent?.toLowerCase() || '';

        return {
          lies: getText('.lies'),
          bot: getText('.bot'),
          grade: getText('.grade'),
          confidence: getText('.confidence'),
        };
      });

      // Check for bot indicators
      if (!results.bot.includes('bot')) {
        passed.push('No bot classification');
      } else {
        failed.push('Classified as bot');
      }

      if (!results.lies.includes('lie')) {
        passed.push('No lies detected');
      } else {
        warnings.push('Some lies detected');
      }

      // Grade-based scoring
      let gradeScore = 70; // Default
      if (results.grade.includes('a')) gradeScore = 95;
      else if (results.grade.includes('b')) gradeScore = 85;
      else if (results.grade.includes('c')) gradeScore = 75;
      else if (results.grade.includes('d')) gradeScore = 65;
      else if (results.grade.includes('f')) gradeScore = 50;

      const score = Math.min(100, gradeScore + passed.length * 5 - failed.length * 10);

      return {
        detector: 'CreepJS',
        score: Math.max(0, Math.round(score)),
        details: { passed, failed, warnings },
        timestamp: Date.now(),
        metadata: { grade: results.grade, confidence: results.confidence },
      };
    } catch (error: any) {
      logger.error(`CreepJS test failed: ${error.message}`);
      return {
        detector: 'CreepJS',
        score: 0,
        details: { passed: [], failed: ['Test execution failed'], warnings: [] },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Test against BrowserLeaks
   */
  private async testBrowserLeaks(page: Page): Promise<DetectionScore> {
    const passed: string[] = [];
    const failed: string[] = [];
    const warnings: string[] = [];

    try {
      await page.goto('https://browserleaks.com/canvas', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const results = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return {
          canvasFingerprint: document.querySelector('.hash')?.textContent || 'none',
          hasWarnings: bodyText.includes('warning') || bodyText.includes('suspicious'),
          uniqueness: bodyText.includes('unique'),
        };
      });

      if (results.canvasFingerprint !== 'none') {
        passed.push('Canvas fingerprint present');
      } else {
        warnings.push('No canvas fingerprint');
      }

      if (!results.hasWarnings) {
        passed.push('No warnings');
      } else {
        failed.push('Warnings detected');
      }

      const score = (passed.length / (passed.length + failed.length + warnings.length * 0.5)) * 100;

      return {
        detector: 'BrowserLeaks',
        score: Math.round(score),
        details: { passed, failed, warnings },
        timestamp: Date.now(),
        metadata: { canvasFingerprint: results.canvasFingerprint },
      };
    } catch (error: any) {
      logger.error(`BrowserLeaks test failed: ${error.message}`);
      return {
        detector: 'BrowserLeaks',
        score: 0,
        details: { passed: [], failed: ['Test execution failed'], warnings: [] },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Test against Incolumitas
   */
  private async testIncolumitas(page: Page): Promise<DetectionScore> {
    const passed: string[] = [];
    const failed: string[] = [];
    const warnings: string[] = [];

    try {
      await page.goto('https://bot.incolumitas.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 4000));

      const results = await page.evaluate(() => {
        const getResult = (testName: string) => {
          const el = Array.from(document.querySelectorAll('td')).find((td) =>
            td.textContent?.includes(testName)
          );
          return el?.nextElementSibling?.textContent?.toLowerCase() || 'unknown';
        };

        return {
          webdriver: getResult('webdriver'),
          chromeRuntime: getResult('chrome'),
          permissions: getResult('permissions'),
          plugins: getResult('plugins'),
          languages: getResult('languages'),
        };
      });

      // Check each test
      Object.entries(results).forEach(([test, result]) => {
        if (result.includes('pass') || result.includes('ok')) {
          passed.push(`${test}: passed`);
        } else if (result.includes('fail')) {
          failed.push(`${test}: failed`);
        } else {
          warnings.push(`${test}: ${result}`);
        }
      });

      const score = (passed.length / (passed.length + failed.length)) * 100;

      return {
        detector: 'Incolumitas',
        score: Math.round(score || 50),
        details: { passed, failed, warnings },
        timestamp: Date.now(),
        metadata: results,
      };
    } catch (error: any) {
      logger.error(`Incolumitas test failed: ${error.message}`);
      return {
        detector: 'Incolumitas',
        score: 0,
        details: { passed: [], failed: ['Test execution failed'], warnings: [] },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Test against Sannysoft
   */
  private async testSannysoft(page: Page): Promise<DetectionScore> {
    const passed: string[] = [];
    const failed: string[] = [];
    const warnings: string[] = [];

    try {
      await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const results = await page.evaluate(() => {
        const checks = Array.from(document.querySelectorAll('tr')).map((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) return null;
          return {
            test: cells[0]?.textContent?.trim() || '',
            result: cells[1]?.textContent?.toLowerCase() || '',
          };
        });

        return checks.filter((c) => c !== null);
      });

      results.forEach((check: any) => {
        if (check.result.includes('failed') || check.result.includes('detected')) {
          failed.push(`${check.test}: ${check.result}`);
        } else if (check.result.includes('warning')) {
          warnings.push(`${check.test}: ${check.result}`);
        } else {
          passed.push(`${check.test}: ${check.result}`);
        }
      });

      const score = (passed.length / (passed.length + failed.length)) * 100;

      return {
        detector: 'Sannysoft',
        score: Math.round(score || 50),
        details: { passed, failed, warnings },
        timestamp: Date.now(),
      };
    } catch (error: any) {
      logger.error(`Sannysoft test failed: ${error.message}`);
      return {
        detector: 'Sannysoft',
        score: 0,
        details: { passed: [], failed: ['Test execution failed'], warnings: [] },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Run all detection tests
   */
  async runAllTests(browser: Browser, config?: any): Promise<DetectionReport> {
    logger.info('🔍 Starting comprehensive detection tests...');

    const detectorScores: DetectionScore[] = [];

    // Test each detector
    for (const detector of this.detectors) {
      logger.info(`Testing ${detector.name}...`);
      const page = await browser.newPage();

      try {
        const score = await detector.testFunction(page);
        detectorScores.push(score);
        logger.info(
          `${detector.name}: ${score.score}/100 (${score.details.passed.length} passed, ${score.details.failed.length} failed)`
        );
      } catch (error: any) {
        logger.error(`Failed to test ${detector.name}: ${error.message}`);
        detectorScores.push({
          detector: detector.name,
          score: 0,
          details: { passed: [], failed: ['Test failed'], warnings: [] },
          timestamp: Date.now(),
        });
      } finally {
        await page.close();
      }
    }

    // Calculate weighted overall score
    let totalWeightedScore = 0;
    let totalWeight = 0;

    this.detectors.forEach((detector, index) => {
      const score = detectorScores[index];
      if (score) {
        totalWeightedScore += score.score * detector.weight;
        totalWeight += detector.weight;
      }
    });

    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // Generate recommendation
    const recommendation = this.generateRecommendation(detectorScores, overallScore);

    const report: DetectionReport = {
      timestamp: Date.now(),
      overallScore,
      detectorScores,
      grade,
      recommendation,
      configSnapshot: config || {},
    };

    // Save to history
    this.history.push(report);
    this.saveHistory();

    logger.info(
      `\n✅ Detection tests completed!\nOverall Score: ${overallScore}/100 (Grade: ${grade})\nRecommendation: ${recommendation}`
    );

    return report;
  }

  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(scores: DetectionScore[], overallScore: number): string {
    if (overallScore >= 90) {
      return 'Excellent! Your browser is highly undetectable. No changes needed.';
    }

    const failedDetectors = scores.filter((s) => s.score < 70);
    if (failedDetectors.length === 0) {
      return 'Good detection evasion. Minor improvements could be made.';
    }

    const criticalIssues: string[] = [];
    failedDetectors.forEach((detector) => {
      detector.details.failed.forEach((issue) => {
        if (issue.toLowerCase().includes('webdriver')) {
          criticalIssues.push('WebDriver not properly hidden');
        }
        if (issue.toLowerCase().includes('headless')) {
          criticalIssues.push('Headless detection not prevented');
        }
        if (issue.toLowerCase().includes('automation')) {
          criticalIssues.push('Automation signals present');
        }
        if (issue.toLowerCase().includes('canvas')) {
          criticalIssues.push('Canvas fingerprint issues');
        }
      });
    });

    const uniqueIssues = [...new Set(criticalIssues)];
    return `Critical issues: ${uniqueIssues.join(', ')}. Run RL agent to optimize protection.`;
  }

  /**
   * Get detection trend (improving/declining)
   */
  getTrend(lastN = 5): { direction: 'improving' | 'stable' | 'declining'; change: number } {
    if (this.history.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const recentReports = this.history.slice(-lastN);
    const scores = recentReports.map((r) => r.overallScore);

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const change = lastScore - firstScore;

    let direction: 'improving' | 'stable' | 'declining';
    if (change > 5) direction = 'improving';
    else if (change < -5) direction = 'declining';
    else direction = 'stable';

    return { direction, change };
  }

  /**
   * Export report as JSON
   */
  exportReport(report: DetectionReport, filepath: string): void {
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    logger.info(`Report exported to ${filepath}`);
  }

  /**
   * Print report to console
   */
  printReport(report: DetectionReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ADAPTIVE DETECTION MONITOR REPORT');
    console.log('='.repeat(70));
    console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
    console.log(`Overall Score: ${report.overallScore}/100 (Grade: ${report.grade})`);
    console.log(`Recommendation: ${report.recommendation}`);
    console.log('='.repeat(70));

    report.detectorScores.forEach((score) => {
      const icon = score.score >= 70 ? '✓' : '✗';
      console.log(`\n${icon} ${score.detector}: ${score.score}/100`);
      if (score.details.passed.length > 0) {
        console.log(`  ✓ Passed: ${score.details.passed.join(', ')}`);
      }
      if (score.details.failed.length > 0) {
        console.log(`  ✗ Failed: ${score.details.failed.join(', ')}`);
      }
      if (score.details.warnings.length > 0) {
        console.log(`  ⚠  Warnings: ${score.details.warnings.join(', ')}`);
      }
    });

    console.log('\n' + '='.repeat(70));
    const trend = this.getTrend();
    console.log(`Trend: ${trend.direction} (${trend.change > 0 ? '+' : ''}${trend.change})`);
    console.log('='.repeat(70) + '\n');
  }

  /**
   * Load history from file
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf-8');
        this.history = JSON.parse(data);
        logger.info(`Loaded ${this.history.length} historical reports`);
      }
    } catch (error: any) {
      logger.warn(`Failed to load history: ${error.message}`);
      this.history = [];
    }
  }

  /**
   * Save history to file
   */
  private saveHistory(): void {
    try {
      const dir = path.dirname(this.historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
      logger.info(`Saved ${this.history.length} reports to history`);
    } catch (error: any) {
      logger.error(`Failed to save history: ${error.message}`);
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  /**
   * Get all history
   */
  getHistory(): DetectionReport[] {
    return this.history;
  }
}
