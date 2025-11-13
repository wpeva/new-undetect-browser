# Session 11: Adaptive Detection System

Self-improving anti-detection system using Reinforcement Learning to continuously optimize browser fingerprint protection.

## Overview

The Adaptive Detection System automatically:
1. **Monitors** detection scores across multiple detection sites
2. **Learns** optimal protection configurations using RL
3. **Adapts** automatically by deploying improved settings
4. **Tracks** performance and improvements over time

## Features

### ✅ Detection Monitor (`monitor.ts`)
- Tests against 5 major detection sites:
  - PixelScan (critical)
  - CreepJS (comprehensive)
  - BrowserLeaks (canvas focus)
  - Incolumitas (automation)
  - Sannysoft (basic checks)
- Weighted scoring system
- Historical tracking
- Trend analysis
- Actionable recommendations

### ✅ RL Agent (`rl-agent.py`)
- PPO (Proximal Policy Optimization) algorithm
- Custom Gym environment for anti-detection
- 10-dimensional action space (protection levels)
- 5-dimensional observation space (detector scores)
- Reward function balancing detection evasion and performance
- Automatic configuration optimization

### ✅ Auto-Updater (`auto-updater.ts`)
- Automated testing cycles
- RL-based configuration optimization
- Smart deployment with thresholds
- Rollback capability
- Comprehensive history tracking
- Scheduled updates

### ✅ Dashboard (`dashboard.ts`)
- Real-time detection scores
- Historical trends visualization
- Auto-updater statistics
- Configuration management
- Manual update triggers
- REST API for integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Adaptive Detection System                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐│
│  │   Monitor    │─────▶│  RL Agent    │─────▶│  Updater   ││
│  │              │      │              │      │            ││
│  │ • PixelScan  │      │ • PPO Model  │      │ • Deploy   ││
│  │ • CreepJS    │      │ • Training   │      │ • History  ││
│  │ • BLeaks     │      │ • Optimize   │      │ • Schedule ││
│  │ • Incolumitas│      │ • Evaluate   │      │ • Stats    ││
│  │ • Sannysoft  │      │              │      │            ││
│  └──────────────┘      └──────────────┘      └────────────┘│
│         │                     │                     │       │
│         └─────────────────────┴─────────────────────┘       │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │    Dashboard      │                    │
│                    │                   │                    │
│                    │ • Visualization   │                    │
│                    │ • REST API        │                    │
│                    │ • Real-time       │                    │
│                    └───────────────────┘                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### 1. Install Python Dependencies

```bash
cd ml
pip install -r requirements.txt
```

Required packages:
- `gym>=0.26.0` - RL environment
- `stable-baselines3>=2.0.0` - PPO algorithm
- `torch>=2.0.0` - Neural networks
- `numpy>=1.24.0` - Numerical operations

### 2. Build TypeScript Modules

```bash
npm run build
```

## Usage

### Quick Start

```typescript
import { DetectionMonitor, createAutoUpdater, createDashboard } from './ml/detection';

// 1. Create monitor
const monitor = new DetectionMonitor();

// 2. Create auto-updater
const updater = createAutoUpdater({
  minImprovement: 5,        // Deploy if 5%+ better
  testInterval: 24,         // Test every 24 hours
  enableAutoUpdate: true,
});

// 3. Start dashboard
const dashboard = await createDashboard(monitor, updater, {
  port: 3000
});

// 4. Setup auto-update
const browserFactory = async () => {
  const browser = new UndetectBrowser({ headless: true });
  return await browser.launch();
};

updater.startAutoUpdate(browserFactory);

// System now runs autonomously!
```

### Manual Detection Testing

```typescript
import { DetectionMonitor } from './ml/detection';
import { UndetectBrowser } from './src';

const monitor = new DetectionMonitor();
const browser = new UndetectBrowser({ headless: false });
const instance = await browser.launch();

// Run tests
const report = await monitor.runAllTests(instance);

// View results
monitor.printReport(report);
console.log('Overall Score:', report.overallScore);
console.log('Grade:', report.grade);
console.log('Recommendation:', report.recommendation);

await instance.close();
```

### Train RL Agent

```bash
cd ml/detection

# Quick training (demo)
python3 rl-agent.py --timesteps 10000 --episodes 5

# Full training (production)
python3 rl-agent.py --timesteps 100000 --episodes 20

# With GPU
python3 rl-agent.py --timesteps 100000 --device cuda

# Evaluate existing model
python3 rl-agent.py --eval-only --model anti_detection_agent
```

### Run Adaptive Cycle

```typescript
import { createAutoUpdater } from './ml/detection';

const updater = createAutoUpdater();
const browser = await launchBrowser();

// Run one cycle
const result = await updater.runAdaptiveCycle(browser);

console.log(`Old: ${result.oldScore} → New: ${result.newScore}`);
console.log(`Improvement: ${result.improvement}%`);
console.log(`Deployed: ${result.deployed}`);
```

### View Dashboard

```bash
npm run build
node dist/ml/detection/demo.js 4
```

Visit http://localhost:3000 to see:
- Current detection scores
- Historical trends
- Configuration settings
- Update history
- Statistics

## Configuration

### Protection Configuration

The RL agent optimizes these 10 parameters:

```typescript
interface ProtectionConfig {
  canvas_noise: number;           // 0-1: Canvas fingerprint noise
  webgl_noise: number;            // 0-1: WebGL fingerprint noise
  audio_noise: number;            // 0-1: Audio fingerprint noise
  font_spoofing: number;          // 0-1: Font list randomization
  timezone: number;               // 0-1: Timezone offset adjustment
  language: number;               // 0-1: Language header variation
  hardware_concurrency: number;   // 0-1: CPU core count override
  device_memory: number;          // 0-1: RAM amount override
  screen_noise: number;           // 0-1: Screen resolution noise
  user_agent_rotation: number;    // 0-1: User-agent rotation level
}
```

Each value ranges from 0 (no protection) to 1 (maximum protection).

### Auto-Updater Configuration

```typescript
const updater = createAutoUpdater({
  minImprovement: 5,              // Min % improvement to deploy
  testInterval: 24,               // Hours between tests
  maxHistory: 100,                // Max history entries
  rlEpisodes: 10,                 // RL training episodes
  rlTimesteps: 50000,             // RL training timesteps
  configPath: './config.json',    // Config file path
  historyPath: './history.json',  // History file path
  enableAutoUpdate: true,         // Enable auto-deployment
});
```

## How It Works

### 1. Detection Monitoring

The monitor tests your browser against 5 detection sites:

```
┌─────────────┐
│ Your Browser│
└──────┬──────┘
       │
       ├─────▶ PixelScan     → Score: 85/100
       ├─────▶ CreepJS       → Score: 90/100
       ├─────▶ BrowserLeaks  → Score: 80/100
       ├─────▶ Incolumitas   → Score: 88/100
       └─────▶ Sannysoft     → Score: 92/100

Weighted Average → Overall: 87/100 (Grade: B)
```

### 2. RL Agent Training

The agent learns through trial and error:

```
Episode 1: Config A → Score: 70 → Reward: +5.2
Episode 2: Config B → Score: 85 → Reward: +8.7
Episode 3: Config C → Score: 92 → Reward: +12.1
...
Episode 100: Best Config → Score: 95 → Saved ✅
```

Reward function:
```python
reward = (
  detection_score / 10           # Higher is better
  - aggression_penalty * 0.5     # Less is better
  + consistency_bonus * 0.3      # More is better
  + high_score_bonus             # Bonus at 85+, 90+
)
```

### 3. Adaptive Cycle

Every 24 hours (configurable):

```
1. Test current config      → Score: 85
2. Run RL agent            → Find better config
3. Test new config         → Score: 91
4. Calculate improvement   → +6% (above 5% threshold)
5. Deploy new config       → ✅ Deployed
6. Save to history         → Logged
```

### 4. Dashboard Monitoring

Real-time visualization:

```
┌────────────────────────────────────────┐
│  Overall Score: 91/100 (Grade: A)      │
│  Trend: ↗ improving (+6)               │
├────────────────────────────────────────┤
│  Detector Scores:                      │
│  • PixelScan:     92/100 ✓             │
│  • CreepJS:       95/100 ✓             │
│  • BrowserLeaks:  88/100 ✓             │
│  • Incolumitas:   90/100 ✓             │
│  • Sannysoft:     93/100 ✓             │
├────────────────────────────────────────┤
│  Auto-Updater:                         │
│  • Total Cycles:     12                │
│  • Deployments:      8                 │
│  • Avg Improvement:  6.2%              │
└────────────────────────────────────────┘
```

## Examples

See `examples/adaptive-detection-example.ts` for 6 complete examples:

1. **Basic Detection Testing** - Simple testing workflow
2. **Manual Adaptive Cycle** - Run optimization manually
3. **Automatic Updates** - Set up scheduled optimization
4. **Dashboard Monitoring** - Real-time visualization
5. **Custom Configuration** - Advanced settings
6. **Production Setup** - Complete production deployment

Run examples:
```bash
npm run build
node dist/examples/adaptive-detection-example.js 1  # Run example 1
node dist/examples/adaptive-detection-example.js 6  # Run example 6
```

## Demos

The demo script showcases all features:

```bash
npm run build

# Run specific demo
node dist/ml/detection/demo.js 1  # Detection Monitor
node dist/ml/detection/demo.js 2  # Auto-Updater
node dist/ml/detection/demo.js 3  # RL Agent Training
node dist/ml/detection/demo.js 4  # Dashboard
node dist/ml/detection/demo.js 5  # Complete System
```

## Testing

Run the test suite:

```bash
# All detection tests
npm test -- tests/ml/detection.test.ts

# With coverage
npm run test:coverage -- tests/ml/detection.test.ts
```

Tests cover:
- Detection monitor functionality
- Auto-updater logic
- Configuration management
- History tracking
- Statistics calculation
- Integration scenarios

## API Reference

### DetectionMonitor

```typescript
class DetectionMonitor {
  constructor(historyFile?: string);

  async runAllTests(browser: Browser, config?: any): Promise<DetectionReport>;
  getTrend(lastN?: number): { direction: string; change: number };
  exportReport(report: DetectionReport, filepath: string): void;
  printReport(report: DetectionReport): void;
  getHistory(): DetectionReport[];
  clearHistory(): void;
}
```

### AutoUpdater

```typescript
class AutoUpdater {
  constructor(config?: Partial<AutoUpdaterConfig>);

  async runAdaptiveCycle(browser: Browser): Promise<UpdateResult>;
  startAutoUpdate(browserFactory: () => Promise<Browser>): void;
  stopAutoUpdate(): void;
  getStatistics(): Statistics;
  getCurrentConfig(): ProtectionConfig;
  getHistory(): UpdateResult[];
  exportHistory(filepath: string): void;
  printStatistics(): void;
}
```

### AdaptiveDashboard

```typescript
class AdaptiveDashboard {
  constructor(
    monitor: DetectionMonitor,
    updater: AutoUpdater,
    config?: Partial<DashboardConfig>
  );

  async start(): Promise<void>;
  async stop(): Promise<void>;
}
```

## Performance

### Detection Testing
- 5 detectors tested sequentially
- ~30-60 seconds per full test
- Parallel testing possible with multiple browsers

### RL Training
- CPU: ~2-4 hours for 100K timesteps
- GPU: ~30-60 minutes for 100K timesteps
- Memory: ~2GB with model loaded

### Auto-Update
- Scheduled cycles: configurable (default 24h)
- Manual cycles: on-demand
- Zero downtime deployment

## Troubleshooting

### Issue: RL Agent Fails to Import

```bash
# Solution: Install dependencies
pip install gym stable-baselines3
```

### Issue: Detection Tests Timeout

```typescript
// Solution: Increase timeout in monitor.ts
await page.goto(url, {
  waitUntil: 'networkidle2',
  timeout: 60000  // Increase from 30000
});
```

### Issue: Dashboard Not Accessible

```typescript
// Solution: Check port availability
const dashboard = await createDashboard(monitor, updater, {
  port: 3001  // Try different port
});
```

### Issue: Low Detection Scores

```bash
# Solution: Train RL agent longer
python3 rl-agent.py --timesteps 200000 --episodes 30
```

### Issue: Auto-Update Not Deploying

```typescript
// Solution: Lower deployment threshold
const updater = createAutoUpdater({
  minImprovement: 2,  // Lower from 5%
});
```

## Production Deployment

### Recommended Setup

```typescript
// production-adaptive-system.ts
import { DetectionMonitor, createAutoUpdater, createDashboard } from './ml/detection';

const monitor = new DetectionMonitor('./data/detection-history.json');
const updater = createAutoUpdater({
  minImprovement: 5,
  testInterval: 24,
  maxHistory: 1000,
  rlEpisodes: 20,
  rlTimesteps: 100000,
  configPath: './data/config.json',
  historyPath: './data/update-history.json',
  enableAutoUpdate: true,
});

const dashboard = await createDashboard(monitor, updater, {
  port: process.env.DASHBOARD_PORT || 3000,
});

const browserFactory = async () => {
  return await new UndetectBrowser({
    headless: true,
    fingerprint: { /* your settings */ }
  }).launch();
};

updater.startAutoUpdate(browserFactory);

// Graceful shutdown
process.on('SIGTERM', async () => {
  updater.stopAutoUpdate();
  await dashboard.stop();
  process.exit(0);
});
```

### Monitoring

1. **Dashboard**: Real-time web interface
2. **Logs**: Check console output for cycles
3. **History**: Review `update-history.json`
4. **Alerts**: Implement custom webhooks for deployments

### Maintenance

- Review update history weekly
- Retrain RL agent monthly with new data
- Monitor detection trends
- Adjust thresholds based on results

## Performance Optimization

### Faster Testing

```typescript
// Test fewer detectors
const monitor = new DetectionMonitor();
monitor['detectors'] = monitor['detectors'].slice(0, 3);  // Only test top 3
```

### Faster Training

```python
# Use GPU
python3 rl-agent.py --device cuda --timesteps 50000

# Or reduce timesteps
python3 rl-agent.py --timesteps 20000 --episodes 5
```

### Lower Resource Usage

```typescript
const updater = createAutoUpdater({
  testInterval: 72,  // Test every 3 days
  rlTimesteps: 25000,  // Lighter training
});
```

## Future Enhancements

- [ ] Multi-objective optimization (speed vs stealth)
- [ ] A/B testing framework
- [ ] Integration with CI/CD pipelines
- [ ] Cloud-based training
- [ ] More detection sites
- [ ] Advanced RL algorithms (SAC, TD3)
- [ ] Transfer learning across configurations

## Files Generated

- `current-config.json` - Active protection config
- `update-history.json` - All update cycles
- `detection-history.json` - All detection tests
- `rl_model.zip` - Trained RL model
- `rl_model_best_config.json` - Best config found by RL

## License

MIT

## Related Documentation

- [Main README](../../README.md)
- [ML Profile Generator](../README.md)
- [Technical Architecture](../../TECHNICAL_ARCHITECTURE.md)
- [Examples](../../examples/)
