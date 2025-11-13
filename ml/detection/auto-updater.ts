/**
 * Session 11: Adaptive Detection System - Auto-Updater
 *
 * Automatically tests current protection configuration,
 * runs RL agent to find improvements, and deploys optimized configs.
 */

import { Browser } from 'puppeteer';
import { DetectionMonitor, DetectionReport } from './monitor';
import { logger } from '../../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProtectionConfig {
  canvas_noise: number;
  webgl_noise: number;
  audio_noise: number;
  font_spoofing: number;
  timezone: number;
  language: number;
  hardware_concurrency: number;
  device_memory: number;
  screen_noise: number;
  user_agent_rotation: number;
}

export interface UpdateResult {
  timestamp: number;
  oldScore: number;
  newScore: number;
  improvement: number;
  deployed: boolean;
  reason: string;
  oldConfig: ProtectionConfig;
  newConfig: ProtectionConfig;
}

export interface AutoUpdaterConfig {
  minImprovement: number; // Minimum improvement % to deploy
  testInterval: number; // Hours between tests
  maxHistory: number; // Maximum history entries to keep
  rlEpisodes: number; // RL training episodes
  rlTimesteps: number; // RL training timesteps
  configPath: string; // Path to save config
  historyPath: string; // Path to save update history
  enableAutoUpdate: boolean; // Enable automatic updates
}

/**
 * Auto-Updater
 *
 * Orchestrates the adaptive detection system:
 * 1. Tests current configuration
 * 2. Runs RL agent to find improvements
 * 3. Validates new configuration
 * 4. Deploys if improvement meets threshold
 */
export class AutoUpdater {
  private monitor: DetectionMonitor;
  private config: AutoUpdaterConfig;
  private currentConfig: ProtectionConfig;
  private history: UpdateResult[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(config?: Partial<AutoUpdaterConfig>) {
    this.config = {
      minImprovement: 5, // At least 5% improvement
      testInterval: 24, // Test every 24 hours
      maxHistory: 100,
      rlEpisodes: 10,
      rlTimesteps: 50000,
      configPath: './ml/detection/current-config.json',
      historyPath: './ml/detection/update-history.json',
      enableAutoUpdate: true,
      ...config,
    };

    this.monitor = new DetectionMonitor();
    this.currentConfig = this.loadCurrentConfig();
    this.loadHistory();
  }

  /**
   * Load current protection configuration
   */
  private loadCurrentConfig(): ProtectionConfig {
    try {
      if (fs.existsSync(this.config.configPath)) {
        const data = fs.readFileSync(this.config.configPath, 'utf-8');
        const config = JSON.parse(data);
        logger.info('Loaded current protection config');
        return config;
      }
    } catch (error: any) {
      logger.warn(`Failed to load config: ${error.message}`);
    }

    // Return default config
    return this.getDefaultConfig();
  }

  /**
   * Get default protection configuration
   */
  private getDefaultConfig(): ProtectionConfig {
    return {
      canvas_noise: 0.5,
      webgl_noise: 0.5,
      audio_noise: 0.5,
      font_spoofing: 0.5,
      timezone: 0.5,
      language: 0.5,
      hardware_concurrency: 0.5,
      device_memory: 0.5,
      screen_noise: 0.5,
      user_agent_rotation: 0.5,
    };
  }

  /**
   * Save protection configuration
   */
  private saveConfig(config: ProtectionConfig): void {
    try {
      const dir = path.dirname(this.config.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.config.configPath, JSON.stringify(config, null, 2));
      logger.info('Saved protection config');
    } catch (error: any) {
      logger.error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * Load update history
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.config.historyPath)) {
        const data = fs.readFileSync(this.config.historyPath, 'utf-8');
        this.history = JSON.parse(data);
        logger.info(`Loaded ${this.history.length} update history entries`);
      }
    } catch (error: any) {
      logger.warn(`Failed to load history: ${error.message}`);
      this.history = [];
    }
  }

  /**
   * Save update history
   */
  private saveHistory(): void {
    try {
      // Keep only last N entries
      if (this.history.length > this.config.maxHistory) {
        this.history = this.history.slice(-this.config.maxHistory);
      }

      const dir = path.dirname(this.config.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.config.historyPath, JSON.stringify(this.history, null, 2));
      logger.info(`Saved ${this.history.length} history entries`);
    } catch (error: any) {
      logger.error(`Failed to save history: ${error.message}`);
    }
  }

  /**
   * Test current configuration
   */
  async testCurrentConfig(browser: Browser): Promise<DetectionReport> {
    logger.info('Testing current protection configuration...');
    const report = await this.monitor.runAllTests(browser, this.currentConfig);
    return report;
  }

  /**
   * Run RL agent to find improved configuration
   */
  async runRLAgent(currentScore: number): Promise<ProtectionConfig | null> {
    logger.info('Running RL agent to find improved configuration...');

    try {
      // Run Python RL agent
      const pythonScript = path.join(__dirname, 'rl-agent.py');
      const command = `python3 ${pythonScript} --timesteps ${this.config.rlTimesteps} --episodes ${this.config.rlEpisodes} --output ./ml/detection/rl_model`;

      logger.info(`Executing: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr) {
        logger.warn(`RL Agent stderr: ${stderr}`);
      }

      logger.info(`RL Agent stdout: ${stdout}`);

      // Load best config generated by RL agent
      const configPath = './ml/detection/rl_model_best_config.json';
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        const newConfig = JSON.parse(data);
        logger.info('✅ RL agent found new configuration');
        return newConfig;
      } else {
        logger.error('RL agent did not generate config file');
        return null;
      }
    } catch (error: any) {
      logger.error(`Failed to run RL agent: ${error.message}`);
      return null;
    }
  }

  /**
   * Test new configuration
   */
  async testNewConfig(browser: Browser, config: ProtectionConfig): Promise<DetectionReport> {
    logger.info('Testing new configuration...');
    // Apply config to browser (in real implementation)
    // For now, just test with monitor
    const report = await this.monitor.runAllTests(browser, config);
    return report;
  }

  /**
   * Check if new config is better than current
   */
  private isBetter(newScore: number, oldScore: number): boolean {
    const improvement = ((newScore - oldScore) / oldScore) * 100;
    return improvement >= this.config.minImprovement;
  }

  /**
   * Deploy new configuration
   */
  private async deployConfig(config: ProtectionConfig, reason: string): Promise<void> {
    logger.info(`Deploying new configuration: ${reason}`);

    // Save new config
    this.currentConfig = config;
    this.saveConfig(config);

    // In production, this would:
    // 1. Update browser launch parameters
    // 2. Restart services if needed
    // 3. Notify monitoring systems
    // 4. Roll back if issues detected

    logger.info('✅ Configuration deployed successfully');
  }

  /**
   * Run a complete adaptive cycle
   */
  async runAdaptiveCycle(browser: Browser): Promise<UpdateResult> {
    if (this.isRunning) {
      throw new Error('Adaptive cycle already running');
    }

    this.isRunning = true;

    try {
      logger.info('\n' + '='.repeat(70));
      logger.info('🔄 Starting Adaptive Detection Cycle');
      logger.info('='.repeat(70));

      // 1. Test current protection
      logger.info('\n[1/4] Testing current protection configuration...');
      const currentReport = await this.testCurrentConfig(browser);
      const currentScore = currentReport.overallScore;

      logger.info(`Current score: ${currentScore}/100 (Grade: ${currentReport.grade})`);
      this.monitor.printReport(currentReport);

      // Check if current score is already excellent
      if (currentScore >= 95) {
        const result: UpdateResult = {
          timestamp: Date.now(),
          oldScore: currentScore,
          newScore: currentScore,
          improvement: 0,
          deployed: false,
          reason: 'Current configuration is already excellent (95+)',
          oldConfig: this.currentConfig,
          newConfig: this.currentConfig,
        };

        this.history.push(result);
        this.saveHistory();

        logger.info('✅ No improvement needed. Current config is excellent!');
        return result;
      }

      // 2. Run RL agent to find better config
      logger.info('\n[2/4] Running RL agent to optimize configuration...');
      const newConfig = await this.runRLAgent(currentScore);

      if (!newConfig) {
        const result: UpdateResult = {
          timestamp: Date.now(),
          oldScore: currentScore,
          newScore: currentScore,
          improvement: 0,
          deployed: false,
          reason: 'RL agent failed to generate new configuration',
          oldConfig: this.currentConfig,
          newConfig: this.currentConfig,
        };

        this.history.push(result);
        this.saveHistory();

        logger.error('⚠️  RL agent failed. Keeping current config.');
        return result;
      }

      // 3. Test new config
      logger.info('\n[3/4] Testing new configuration...');
      const newReport = await this.testNewConfig(browser, newConfig);
      const newScore = newReport.overallScore;

      logger.info(`New score: ${newScore}/100 (Grade: ${newReport.grade})`);
      this.monitor.printReport(newReport);

      // 4. Compare and decide
      logger.info('\n[4/4] Evaluating improvement...');
      const improvement = ((newScore - currentScore) / currentScore) * 100;
      const isBetter = this.isBetter(newScore, currentScore);

      logger.info(`Improvement: ${improvement.toFixed(2)}% (Threshold: ${this.config.minImprovement}%)`);

      let deployed = false;
      let reason = '';

      if (isBetter && this.config.enableAutoUpdate) {
        reason = `Improvement of ${improvement.toFixed(2)}% exceeds threshold`;
        await this.deployConfig(newConfig, reason);
        deployed = true;
        logger.info(`✅ Deployed new configuration! Score improved from ${currentScore} to ${newScore}`);
      } else if (!isBetter) {
        reason = `Improvement of ${improvement.toFixed(2)}% below threshold (${this.config.minImprovement}%)`;
        logger.info(`⚠️  No deployment: ${reason}`);
      } else {
        reason = 'Auto-update disabled';
        logger.info('⚠️  New config is better but auto-update is disabled');
      }

      const result: UpdateResult = {
        timestamp: Date.now(),
        oldScore: currentScore,
        newScore,
        improvement,
        deployed,
        reason,
        oldConfig: this.currentConfig,
        newConfig,
      };

      this.history.push(result);
      this.saveHistory();

      logger.info('\n' + '='.repeat(70));
      logger.info('🔄 Adaptive Detection Cycle Complete');
      logger.info('='.repeat(70) + '\n');

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start automatic updates on schedule
   */
  startAutoUpdate(browserFactory: () => Promise<Browser>): void {
    if (this.intervalId) {
      logger.warn('Auto-update already running');
      return;
    }

    logger.info(`Starting auto-update with ${this.config.testInterval} hour interval`);

    const intervalMs = this.config.testInterval * 60 * 60 * 1000;

    this.intervalId = setInterval(async () => {
      logger.info('⏰ Auto-update triggered');

      try {
        const browser = await browserFactory();
        await this.runAdaptiveCycle(browser);
        await browser.close();
      } catch (error: any) {
        logger.error(`Auto-update failed: ${error.message}`);
      }
    }, intervalMs);

    logger.info('✅ Auto-update scheduled');
  }

  /**
   * Stop automatic updates
   */
  stopAutoUpdate(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Auto-update stopped');
    }
  }

  /**
   * Get update statistics
   */
  getStatistics(): {
    totalUpdates: number;
    successfulUpdates: number;
    averageImprovement: number;
    bestImprovement: number;
    currentScore: number;
  } {
    const successfulUpdates = this.history.filter((u) => u.deployed);

    const stats = {
      totalUpdates: this.history.length,
      successfulUpdates: successfulUpdates.length,
      averageImprovement:
        successfulUpdates.length > 0
          ? successfulUpdates.reduce((sum, u) => sum + u.improvement, 0) / successfulUpdates.length
          : 0,
      bestImprovement:
        successfulUpdates.length > 0 ? Math.max(...successfulUpdates.map((u) => u.improvement)) : 0,
      currentScore: this.history.length > 0 ? this.history[this.history.length - 1].newScore : 0,
    };

    return stats;
  }

  /**
   * Export update history
   */
  exportHistory(filepath: string): void {
    fs.writeFileSync(filepath, JSON.stringify(this.history, null, 2));
    logger.info(`History exported to ${filepath}`);
  }

  /**
   * Print statistics
   */
  printStatistics(): void {
    const stats = this.getStatistics();

    console.log('\n' + '='.repeat(70));
    console.log('📊 AUTO-UPDATER STATISTICS');
    console.log('='.repeat(70));
    console.log(`Total Update Cycles: ${stats.totalUpdates}`);
    console.log(`Successful Deployments: ${stats.successfulUpdates}`);
    console.log(`Average Improvement: ${stats.averageImprovement.toFixed(2)}%`);
    console.log(`Best Improvement: ${stats.bestImprovement.toFixed(2)}%`);
    console.log(`Current Score: ${stats.currentScore}/100`);
    console.log('='.repeat(70));

    if (this.history.length > 0) {
      console.log('\nRecent Updates:');
      const recent = this.history.slice(-5).reverse();
      recent.forEach((update, i) => {
        const date = new Date(update.timestamp).toLocaleString();
        const icon = update.deployed ? '✅' : '⚠️ ';
        console.log(
          `${icon} ${date}: ${update.oldScore} → ${update.newScore} (${update.improvement.toFixed(2)}%)`
        );
        console.log(`   ${update.reason}`);
      });
    }

    console.log('='.repeat(70) + '\n');
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): ProtectionConfig {
    return { ...this.currentConfig };
  }

  /**
   * Get update history
   */
  getHistory(): UpdateResult[] {
    return this.history;
  }
}

/**
 * Create auto-updater with default settings
 */
export function createAutoUpdater(config?: Partial<AutoUpdaterConfig>): AutoUpdater {
  return new AutoUpdater(config);
}
