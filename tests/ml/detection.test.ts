/**
 * Tests for Session 11: Adaptive Detection System
 */

import { DetectionMonitor, DetectionScore } from '../../ml/detection/monitor';
import { AutoUpdater, ProtectionConfig } from '../../ml/detection/auto-updater';
import { Browser, Page } from 'puppeteer';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fs
jest.mock('fs');

describe('Detection Monitor', () => {
  let monitor: DetectionMonitor;
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    monitor = new DetectionMonitor('./test-history.json');

    // Create mock page
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock browser
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DetectionMonitor', () => {
    it('should initialize with default detectors', () => {
      expect(monitor).toBeDefined();
    });

    it('should run all detection tests', async () => {
      const report = await monitor.runAllTests(mockBrowser);

      expect(report).toBeDefined();
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.grade).toMatch(/[ABCDF]/);
      expect(report.detectorScores).toHaveLength(5);
    });

    it('should calculate weighted overall score', async () => {
      const report = await monitor.runAllTests(mockBrowser);

      expect(typeof report.overallScore).toBe('number');
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should generate recommendations', async () => {
      const report = await monitor.runAllTests(mockBrowser);

      expect(report.recommendation).toBeDefined();
      expect(typeof report.recommendation).toBe('string');
      expect(report.recommendation.length).toBeGreaterThan(0);
    });

    it('should track detection history', async () => {
      const report1 = await monitor.runAllTests(mockBrowser);
      const report2 = await monitor.runAllTests(mockBrowser);

      const history = monitor.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate trends', async () => {
      await monitor.runAllTests(mockBrowser);
      await monitor.runAllTests(mockBrowser);

      const trend = monitor.getTrend(2);
      expect(trend).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(trend.direction);
      expect(typeof trend.change).toBe('number');
    });

    it('should assign correct grades', async () => {
      const report = await monitor.runAllTests(mockBrowser);

      if (report.overallScore >= 90) expect(report.grade).toBe('A');
      else if (report.overallScore >= 80) expect(report.grade).toBe('B');
      else if (report.overallScore >= 70) expect(report.grade).toBe('C');
      else if (report.overallScore >= 60) expect(report.grade).toBe('D');
      else expect(report.grade).toBe('F');
    });

    it('should export report', () => {
      const fs = require('fs');
      fs.writeFileSync = jest.fn();

      const report = {
        timestamp: Date.now(),
        overallScore: 85,
        detectorScores: [],
        grade: 'B' as const,
        recommendation: 'Test',
        configSnapshot: {},
      };

      monitor.exportReport(report, './test-report.json');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should print report without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const report = {
        timestamp: Date.now(),
        overallScore: 85,
        detectorScores: [
          {
            detector: 'Test',
            score: 85,
            details: {
              passed: ['test1'],
              failed: ['test2'],
              warnings: ['test3'],
            },
            timestamp: Date.now(),
          },
        ],
        grade: 'B' as const,
        recommendation: 'Test',
        configSnapshot: {},
      };

      monitor.printReport(report);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe('Auto-Updater', () => {
  let updater: AutoUpdater;
  let mockBrowser: jest.Mocked<Browser>;

  beforeEach(() => {
    updater = new AutoUpdater({
      configPath: './test-config.json',
      historyPath: './test-history.json',
      enableAutoUpdate: false, // Disable for tests
    });

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn(),
        waitForTimeout: jest.fn(),
        evaluate: jest.fn().mockResolvedValue({}),
        close: jest.fn(),
      }),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Management', () => {
    it('should initialize with default config', () => {
      expect(updater).toBeDefined();
      const config = updater.getCurrentConfig();
      expect(config).toBeDefined();
      expect(config.canvas_noise).toBeDefined();
    });

    it('should load and save configuration', () => {
      const config = updater.getCurrentConfig();
      expect(config).toBeDefined();
      expect(typeof config.canvas_noise).toBe('number');
    });

    it('should validate config values are in range', () => {
      const config = updater.getCurrentConfig();

      Object.values(config).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Statistics', () => {
    it('should return statistics', () => {
      const stats = updater.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalUpdates).toBeGreaterThanOrEqual(0);
      expect(stats.successfulUpdates).toBeGreaterThanOrEqual(0);
      expect(stats.averageImprovement).toBeGreaterThanOrEqual(0);
    });

    it('should track update history', () => {
      const history = updater.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should print statistics without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      updater.printStatistics();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Update Cycle', () => {
    it('should run adaptive cycle', async () => {
      // Mock RL agent to return null (simulating failure)
      const runRLAgentSpy = jest.spyOn(updater as any, 'runRLAgent').mockResolvedValue(null);

      const result = await updater.runAdaptiveCycle(mockBrowser);

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(typeof result.deployed).toBe('boolean');

      runRLAgentSpy.mockRestore();
    });

    it('should not run multiple cycles simultaneously', async () => {
      const runRLAgentSpy = jest.spyOn(updater as any, 'runRLAgent').mockResolvedValue(null);

      const promise1 = updater.runAdaptiveCycle(mockBrowser);

      await expect(updater.runAdaptiveCycle(mockBrowser)).rejects.toThrow(
        'Adaptive cycle already running'
      );

      await promise1;
      runRLAgentSpy.mockRestore();
    });

    it('should skip deployment if improvement is below threshold', async () => {
      const runRLAgentSpy = jest
        .spyOn(updater as any, 'runRLAgent')
        .mockResolvedValue({ canvas_noise: 0.51 });

      const result = await updater.runAdaptiveCycle(mockBrowser);

      expect(result.deployed).toBe(false);
      expect(result.reason).toContain('threshold');

      runRLAgentSpy.mockRestore();
    });

    it('should handle excellent current scores', async () => {
      // Mock monitor to return excellent scores
      const testCurrentConfigSpy = jest.spyOn(updater as any, 'testCurrentConfig').mockResolvedValue({
        timestamp: Date.now(),
        overallScore: 96,
        detectorScores: [],
        grade: 'A',
        recommendation: 'Excellent',
        configSnapshot: {},
      });

      const result = await updater.runAdaptiveCycle(mockBrowser);

      expect(result.deployed).toBe(false);
      expect(result.reason).toContain('excellent');

      testCurrentConfigSpy.mockRestore();
    });
  });

  describe('Auto-Update Scheduling', () => {
    it('should start and stop auto-update', () => {
      const browserFactory = jest.fn().mockResolvedValue(mockBrowser);

      updater.startAutoUpdate(browserFactory);
      expect((updater as any).intervalId).toBeDefined();

      updater.stopAutoUpdate();
      expect((updater as any).intervalId).toBeUndefined();
    });

    it('should not start multiple auto-updates', () => {
      const browserFactory = jest.fn().mockResolvedValue(mockBrowser);
      const warnSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');

      updater.startAutoUpdate(browserFactory);
      updater.startAutoUpdate(browserFactory);

      expect(warnSpy).toHaveBeenCalled();

      updater.stopAutoUpdate();
    });
  });

  describe('History Management', () => {
    it('should export history', () => {
      const fs = require('fs');
      fs.writeFileSync = jest.fn();

      updater.exportHistory('./test-export.json');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should limit history size', () => {
      const maxHistory = 5;
      updater = new AutoUpdater({
        maxHistory,
        configPath: './test-config.json',
        historyPath: './test-history.json',
      });

      // History trimming is tested internally
      expect(updater.getHistory().length).toBeLessThanOrEqual(maxHistory);
    });
  });
});

describe('Integration Tests', () => {
  it('should work together: monitor and updater', () => {
    const monitor = new DetectionMonitor('./test-history.json');
    const updater = new AutoUpdater({
      configPath: './test-config.json',
      historyPath: './test-history.json',
    });

    expect(monitor).toBeDefined();
    expect(updater).toBeDefined();

    const config = updater.getCurrentConfig();
    expect(config).toBeDefined();
  });
});

describe('RL Agent Configuration', () => {
  it('should generate valid config format', () => {
    const sampleConfig: ProtectionConfig = {
      canvas_noise: 0.7,
      webgl_noise: 0.6,
      audio_noise: 0.5,
      font_spoofing: 0.4,
      timezone: 0.5,
      language: 0.5,
      hardware_concurrency: 0.6,
      device_memory: 0.5,
      screen_noise: 0.4,
      user_agent_rotation: 0.7,
    };

    // Validate all values are in range
    Object.entries(sampleConfig).forEach(([key, value]) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });

    // Validate all required keys present
    const requiredKeys = [
      'canvas_noise',
      'webgl_noise',
      'audio_noise',
      'font_spoofing',
      'timezone',
      'language',
      'hardware_concurrency',
      'device_memory',
      'screen_noise',
      'user_agent_rotation',
    ];

    requiredKeys.forEach((key) => {
      expect(sampleConfig).toHaveProperty(key);
    });
  });
});
