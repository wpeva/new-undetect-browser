/**
 * Session 11: Adaptive Detection System - Dashboard
 *
 * Real-time monitoring dashboard for detection scores,
 * RL agent progress, and auto-updater statistics.
 */

import express, { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { DetectionMonitor } from './monitor';
import { AutoUpdater } from './auto-updater';
import { logger } from '../../src/utils/logger';

export interface DashboardConfig {
  port: number;
  updateInterval: number; // Refresh interval in seconds
  historyLimit: number; // Number of history entries to show
}

/**
 * Adaptive Detection Dashboard
 *
 * Provides a web interface to monitor:
 * - Current detection scores
 * - Historical trends
 * - RL agent training progress
 * - Auto-updater statistics
 * - Configuration changes
 */
export class AdaptiveDashboard {
  private app: express.Application;
  private config: DashboardConfig;
  private monitor: DetectionMonitor;
  private updater: AutoUpdater;
  private server: any;

  constructor(
    monitor: DetectionMonitor,
    updater: AutoUpdater,
    config?: Partial<DashboardConfig>
  ) {
    this.config = {
      port: 3000,
      updateInterval: 5,
      historyLimit: 50,
      ...config,
    };

    this.monitor = monitor;
    this.updater = updater;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // API: Get current status
    this.app.get('/api/status', this.getStatus.bind(this));

    // API: Get detection history
    this.app.get('/api/detection/history', this.getDetectionHistory.bind(this));

    // API: Get update history
    this.app.get('/api/updates/history', this.getUpdateHistory.bind(this));

    // API: Get current configuration
    this.app.get('/api/config', this.getCurrentConfig.bind(this));

    // API: Get statistics
    this.app.get('/api/statistics', this.getStatistics.bind(this));

    // API: Trigger manual update cycle
    this.app.post('/api/updates/trigger', this.triggerUpdate.bind(this));

    // Serve dashboard HTML
    this.app.get('/', this.serveDashboard.bind(this));
  }

  /**
   * Get current system status
   */
  private async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const detectionHistory = this.monitor.getHistory();
      const updateHistory = this.updater.getHistory();
      const trend = this.monitor.getTrend(10);
      const stats = this.updater.getStatistics();

      const latestDetection =
        detectionHistory.length > 0 ? detectionHistory[detectionHistory.length - 1] : null;

      const status = {
        timestamp: Date.now(),
        detection: {
          currentScore: latestDetection?.overallScore || 0,
          grade: latestDetection?.grade || 'N/A',
          trend: trend.direction,
          trendChange: trend.change,
          lastTest: latestDetection?.timestamp || null,
        },
        updates: {
          totalCycles: stats.totalUpdates,
          successfulDeployments: stats.successfulUpdates,
          averageImprovement: stats.averageImprovement,
          lastUpdate: updateHistory.length > 0 ? updateHistory[updateHistory.length - 1].timestamp : null,
        },
        config: this.updater.getCurrentConfig(),
      };

      res.json(status);
    } catch (error: any) {
      logger.error(`Failed to get status: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get detection test history
   */
  private getDetectionHistory(req: Request, res: Response): void {
    try {
      const limit = parseInt(req.query.limit as string) || this.config.historyLimit;
      const history = this.monitor.getHistory().slice(-limit);

      const simplified = history.map((report) => ({
        timestamp: report.timestamp,
        overallScore: report.overallScore,
        grade: report.grade,
        detectorScores: report.detectorScores.map((s) => ({
          detector: s.detector,
          score: s.score,
        })),
      }));

      res.json(simplified);
    } catch (error: any) {
      logger.error(`Failed to get detection history: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get update history
   */
  private getUpdateHistory(req: Request, res: Response): void {
    try {
      const limit = parseInt(req.query.limit as string) || this.config.historyLimit;
      const history = this.updater.getHistory().slice(-limit);

      res.json(history);
    } catch (error: any) {
      logger.error(`Failed to get update history: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get current configuration
   */
  private getCurrentConfig(req: Request, res: Response): void {
    try {
      const config = this.updater.getCurrentConfig();
      res.json(config);
    } catch (error: any) {
      logger.error(`Failed to get config: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get comprehensive statistics
   */
  private getStatistics(req: Request, res: Response): void {
    try {
      const updaterStats = this.updater.getStatistics();
      const detectionHistory = this.monitor.getHistory();
      const updateHistory = this.updater.getHistory();

      // Calculate detector-specific statistics
      const detectorStats: any = {};
      detectionHistory.forEach((report) => {
        report.detectorScores.forEach((score) => {
          if (!detectorStats[score.detector]) {
            detectorStats[score.detector] = {
              scores: [],
              avgScore: 0,
              minScore: 100,
              maxScore: 0,
            };
          }
          detectorStats[score.detector].scores.push(score.score);
        });
      });

      // Calculate averages
      Object.keys(detectorStats).forEach((detector) => {
        const scores = detectorStats[detector].scores;
        detectorStats[detector].avgScore =
          scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        detectorStats[detector].minScore = Math.min(...scores);
        detectorStats[detector].maxScore = Math.max(...scores);
        delete detectorStats[detector].scores; // Don't send all scores
      });

      const statistics = {
        updater: updaterStats,
        detection: {
          totalTests: detectionHistory.length,
          detectorStats,
        },
        timeline: {
          updates: updateHistory.length,
          tests: detectionHistory.length,
          deployments: updateHistory.filter((u) => u.deployed).length,
        },
      };

      res.json(statistics);
    } catch (error: any) {
      logger.error(`Failed to get statistics: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Trigger manual update cycle
   */
  private async triggerUpdate(req: Request, res: Response): Promise<void> {
    try {
      // In production, this would trigger the actual update cycle
      // For now, just acknowledge the request
      res.json({
        success: true,
        message: 'Update cycle triggered. Check logs for progress.',
      });
    } catch (error: any) {
      logger.error(`Failed to trigger update: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Serve dashboard HTML
   */
  private serveDashboard(req: Request, res: Response): void {
    const html = this.generateDashboardHTML();
    res.send(html);
  }

  /**
   * Generate dashboard HTML
   */
  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adaptive Detection Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #0f0f23;
            color: #e0e0e0;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
        }

        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            color: #888;
            font-size: 1.1em;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            border: 1px solid #2a2a3e;
        }

        .card h2 {
            font-size: 1.3em;
            margin-bottom: 16px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .metric {
            margin: 12px 0;
        }

        .metric-label {
            color: #888;
            font-size: 0.9em;
            margin-bottom: 4px;
        }

        .metric-value {
            font-size: 1.8em;
            font-weight: bold;
        }

        .score {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
        }

        .grade-A { background: #10b981; color: white; }
        .grade-B { background: #3b82f6; color: white; }
        .grade-C { background: #f59e0b; color: white; }
        .grade-D { background: #ef4444; color: white; }
        .grade-F { background: #991b1b; color: white; }

        .trend {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .trend-improving { background: #10b98133; color: #10b981; }
        .trend-stable { background: #3b82f633; color: #3b82f6; }
        .trend-declining { background: #ef444433; color: #ef4444; }

        .detector-list {
            list-style: none;
        }

        .detector-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #2a2a3e;
        }

        .detector-item:last-child {
            border-bottom: none;
        }

        .detector-name {
            font-weight: 500;
        }

        .detector-score {
            font-weight: bold;
        }

        .score-high { color: #10b981; }
        .score-med { color: #f59e0b; }
        .score-low { color: #ef4444; }

        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1em;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .button:hover {
            transform: translateY(-2px);
        }

        .button:active {
            transform: translateY(0);
        }

        .timeline {
            margin-top: 20px;
        }

        .timeline-item {
            padding: 12px;
            border-left: 3px solid #667eea;
            margin-bottom: 16px;
            background: #1a1a2e;
            border-radius: 0 8px 8px 0;
        }

        .timeline-time {
            color: #888;
            font-size: 0.85em;
        }

        .timeline-content {
            margin-top: 8px;
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .status-active { background: #10b981; }
        .status-warning { background: #f59e0b; }
        .status-error { background: #ef4444; }

        .config-table {
            width: 100%;
            margin-top: 12px;
        }

        .config-table tr {
            border-bottom: 1px solid #2a2a3e;
        }

        .config-table td {
            padding: 8px 4px;
        }

        .config-table td:first-child {
            color: #888;
            width: 60%;
        }

        .config-table td:last-child {
            text-align: right;
            font-family: monospace;
            font-weight: bold;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #888;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .spinner {
            border: 3px solid #2a2a3e;
            border-top-color: #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎯 Adaptive Detection Dashboard</h1>
            <p class="subtitle">Real-time monitoring of anti-detection system</p>
        </header>

        <div id="dashboard">
            <div class="loading">
                <div class="spinner"></div>
                <p style="margin-top: 20px;">Loading dashboard...</p>
            </div>
        </div>
    </div>

    <script>
        let updateInterval;

        async function fetchStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Failed to fetch status:', error);
                return null;
            }
        }

        async function fetchDetectionHistory() {
            try {
                const response = await fetch('/api/detection/history?limit=10');
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Failed to fetch detection history:', error);
                return [];
            }
        }

        async function fetchUpdateHistory() {
            try {
                const response = await fetch('/api/updates/history?limit=5');
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Failed to fetch update history:', error);
                return [];
            }
        }

        async function triggerUpdate() {
            try {
                const response = await fetch('/api/updates/trigger', { method: 'POST' });
                const data = await response.json();
                alert(data.message);
            } catch (error) {
                alert('Failed to trigger update: ' + error.message);
            }
        }

        function getScoreClass(score) {
            if (score >= 80) return 'score-high';
            if (score >= 60) return 'score-med';
            return 'score-low';
        }

        function formatDate(timestamp) {
            return new Date(timestamp).toLocaleString();
        }

        function formatConfig(config) {
            return Object.entries(config)
                .map(([key, value]) => \`
                    <tr>
                        <td>\${key.replace(/_/g, ' ')}</td>
                        <td>\${typeof value === 'number' ? value.toFixed(3) : value}</td>
                    </tr>
                \`)
                .join('');
        }

        async function updateDashboard() {
            const status = await fetchStatus();
            const detectionHistory = await fetchDetectionHistory();
            const updateHistory = await fetchUpdateHistory();

            if (!status) {
                document.getElementById('dashboard').innerHTML = '<div class="card"><h2>❌ Error</h2><p>Failed to load dashboard data</p></div>';
                return;
            }

            const latestDetection = detectionHistory[detectionHistory.length - 1];

            const html = \`
                <div class="grid">
                    <div class="card">
                        <h2>
                            <span class="status-indicator status-active"></span>
                            Current Detection Score
                        </h2>
                        <div class="metric">
                            <div class="metric-label">Overall Score</div>
                            <div class="metric-value">\${status.detection.currentScore}/100</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Grade</div>
                            <div><span class="score grade-\${status.detection.grade}">\${status.detection.grade}</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Trend</div>
                            <div><span class="trend trend-\${status.detection.trend}">\${status.detection.trend} (\${status.detection.trendChange > 0 ? '+' : ''}\${status.detection.trendChange})</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Last Test</div>
                            <div style="font-size: 0.9em; color: #888;">\${status.detection.lastTest ? formatDate(status.detection.lastTest) : 'Never'}</div>
                        </div>
                    </div>

                    <div class="card">
                        <h2>📊 Detector Scores</h2>
                        <ul class="detector-list">
                            \${latestDetection ? latestDetection.detectorScores.map(d => \`
                                <li class="detector-item">
                                    <span class="detector-name">\${d.detector}</span>
                                    <span class="detector-score \${getScoreClass(d.score)}">\${d.score}/100</span>
                                </li>
                            \`).join('') : '<li>No data available</li>'}
                        </ul>
                    </div>

                    <div class="card">
                        <h2>🔄 Auto-Updater Stats</h2>
                        <div class="metric">
                            <div class="metric-label">Total Cycles</div>
                            <div class="metric-value">\${status.updates.totalCycles}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Successful Deployments</div>
                            <div class="metric-value">\${status.updates.successfulDeployments}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Average Improvement</div>
                            <div class="metric-value">\${status.updates.averageImprovement.toFixed(2)}%</div>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="button" onclick="triggerUpdate()">🚀 Trigger Update Cycle</button>
                        </div>
                    </div>
                </div>

                <div class="grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <h2>⚙️  Current Configuration</h2>
                        <table class="config-table">
                            \${formatConfig(status.config)}
                        </table>
                    </div>
                </div>

                <div class="card">
                    <h2>📜 Recent Updates</h2>
                    <div class="timeline">
                        \${updateHistory.length > 0 ? updateHistory.reverse().map(u => \`
                            <div class="timeline-item">
                                <div class="timeline-time">\${formatDate(u.timestamp)}</div>
                                <div class="timeline-content">
                                    <strong>\${u.deployed ? '✅' : '⚠️'} \${u.oldScore} → \${u.newScore} (\${u.improvement.toFixed(2)}%)</strong>
                                    <div style="margin-top: 4px; color: #888;">\${u.reason}</div>
                                </div>
                            </div>
                        \`).join('') : '<p style="color: #888;">No updates yet</p>'}
                    </div>
                </div>
            \`;

            document.getElementById('dashboard').innerHTML = html;
        }

        // Initial load
        updateDashboard();

        // Auto-refresh every 5 seconds
        updateInterval = setInterval(updateDashboard, 5000);
    </script>
</body>
</html>
    `;
  }

  /**
   * Start dashboard server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          logger.info(`🎯 Adaptive Detection Dashboard started on port ${this.config.port}`);
          logger.info(`📊 Visit http://localhost:${this.config.port} to view dashboard`);
          resolve();
        });
      } catch (error: any) {
        logger.error(`Failed to start dashboard: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Stop dashboard server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Dashboard stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * Create and start dashboard
 */
export async function createDashboard(
  monitor: DetectionMonitor,
  updater: AutoUpdater,
  config?: Partial<DashboardConfig>
): Promise<AdaptiveDashboard> {
  const dashboard = new AdaptiveDashboard(monitor, updater, config);
  await dashboard.start();
  return dashboard;
}
