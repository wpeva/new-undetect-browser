/**
 * Session 11: Adaptive Detection System - Demo
 *
 * Demonstrates the complete adaptive detection system workflow
 */

import { UndetectBrowser } from '../../src';
import { DetectionMonitor } from './monitor';
import { AutoUpdater, createAutoUpdater } from './auto-updater';
import { createDashboard } from './dashboard';
import { logger } from '../../src/utils/logger';

async function demoDetectionMonitor() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 DEMO 1: Detection Monitor');
  console.log('='.repeat(70) + '\n');

  const monitor = new DetectionMonitor();

  // Launch browser
  const undetectBrowser = new UndetectBrowser({
    headless: false,
    fingerprint: {
      canvas: true,
      webgl: true,
      audio: true,
    },
  });

  const browser = await undetectBrowser.launch();

  console.log('🔍 Running detection tests against all detectors...\n');

  // Run all detection tests
  const report = await monitor.runAllTests(browser);

  // Print report
  monitor.printReport(report);

  // Export report
  monitor.exportReport(report, './ml/detection/demo-report.json');
  console.log('✅ Report exported to ./ml/detection/demo-report.json\n');

  // Show trend
  const trend = monitor.getTrend(5);
  console.log(`📈 Detection Trend: ${trend.direction} (${trend.change > 0 ? '+' : ''}${trend.change})\n`);

  await browser.close();
}

async function demoAutoUpdater() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 DEMO 2: Auto-Updater');
  console.log('='.repeat(70) + '\n');

  const updater = createAutoUpdater({
    minImprovement: 3, // Lower threshold for demo
    rlTimesteps: 10000, // Faster training for demo
    rlEpisodes: 5,
    enableAutoUpdate: true,
  });

  console.log('📋 Current Configuration:');
  const config = updater.getCurrentConfig();
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.toFixed(3)}`);
  });

  console.log('\n📊 Update Statistics:');
  updater.printStatistics();

  // Launch browser
  const undetectBrowser = new UndetectBrowser({
    headless: false,
  });

  const browser = await undetectBrowser.launch();

  console.log('🔄 Running adaptive cycle...\n');

  try {
    // Run one adaptive cycle
    const result = await updater.runAdaptiveCycle(browser);

    console.log('\n' + '='.repeat(70));
    console.log('✅ Adaptive Cycle Complete');
    console.log('='.repeat(70));
    console.log(`Old Score: ${result.oldScore}/100`);
    console.log(`New Score: ${result.newScore}/100`);
    console.log(`Improvement: ${result.improvement.toFixed(2)}%`);
    console.log(`Deployed: ${result.deployed ? 'Yes ✅' : 'No ⚠️'}`);
    console.log(`Reason: ${result.reason}`);
    console.log('='.repeat(70) + '\n');
  } catch (error: any) {
    console.error('❌ Adaptive cycle failed:', error.message);
  }

  await browser.close();

  // Show final statistics
  console.log('\n📊 Final Statistics:');
  updater.printStatistics();
}

async function demoRLAgent() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 DEMO 3: RL Agent Training');
  console.log('='.repeat(70) + '\n');

  console.log('Training RL agent to find optimal protection configuration...\n');

  console.log('Command to train RL agent:');
  console.log('  cd ml/detection');
  console.log('  python3 rl-agent.py --timesteps 50000 --episodes 10\n');

  console.log('This will:');
  console.log('  1. Create an anti-detection environment');
  console.log('  2. Train a PPO agent for 50,000 steps');
  console.log('  3. Evaluate for 10 episodes');
  console.log('  4. Save the best configuration\n');

  console.log('Expected output:');
  console.log('  - Training progress with rewards');
  console.log('  - Evaluation results');
  console.log('  - Best configuration saved to JSON\n');

  console.log('The RL agent learns to:');
  console.log('  ✓ Maximize detection evasion scores');
  console.log('  ✓ Minimize performance impact');
  console.log('  ✓ Maintain configuration consistency');
  console.log('  ✓ Adapt to different detectors\n');
}

async function demoDashboard() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 DEMO 4: Adaptive Detection Dashboard');
  console.log('='.repeat(70) + '\n');

  const monitor = new DetectionMonitor();
  const updater = createAutoUpdater();

  console.log('Starting dashboard server...\n');

  const dashboard = await createDashboard(monitor, updater, {
    port: 3000,
  });

  console.log('Dashboard features:');
  console.log('  ✓ Real-time detection scores');
  console.log('  ✓ Historical trends');
  console.log('  ✓ Auto-updater statistics');
  console.log('  ✓ Configuration management');
  console.log('  ✓ Manual update triggers\n');

  console.log('Press Ctrl+C to stop the dashboard\n');

  // Keep running
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n\nStopping dashboard...');
      await dashboard.stop();
      resolve(undefined);
    });
  });
}

async function demoComplete() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 DEMO 5: Complete Adaptive System');
  console.log('='.repeat(70) + '\n');

  console.log('Setting up complete adaptive detection system...\n');

  // Initialize components
  const monitor = new DetectionMonitor();
  const updater = createAutoUpdater({
    minImprovement: 5,
    testInterval: 24, // Test every 24 hours
    enableAutoUpdate: true,
  });

  // Start dashboard
  const dashboard = await createDashboard(monitor, updater, {
    port: 3000,
  });

  console.log('✅ Dashboard started on http://localhost:3000\n');

  // Setup auto-update
  const browserFactory = async () => {
    const undetectBrowser = new UndetectBrowser({ headless: true });
    return await undetectBrowser.launch();
  };

  updater.startAutoUpdate(browserFactory);
  console.log('✅ Auto-updater scheduled (runs every 24 hours)\n');

  console.log('System is now running in adaptive mode:');
  console.log('  1. Monitors detection scores continuously');
  console.log('  2. Runs RL agent to find improvements');
  console.log('  3. Automatically deploys better configurations');
  console.log('  4. Provides real-time dashboard\n');

  console.log('Press Ctrl+C to stop the system\n');

  // Keep running
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down adaptive system...');
      updater.stopAutoUpdate();
      await dashboard.stop();
      console.log('✅ System stopped\n');
      resolve(undefined);
    });
  });
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 SESSION 11: ADAPTIVE DETECTION SYSTEM - DEMO');
  console.log('='.repeat(70));

  const demos = [
    { name: 'Detection Monitor', fn: demoDetectionMonitor },
    { name: 'Auto-Updater', fn: demoAutoUpdater },
    { name: 'RL Agent Training', fn: demoRLAgent },
    { name: 'Dashboard', fn: demoDashboard },
    { name: 'Complete System', fn: demoComplete },
  ];

  console.log('\nAvailable demos:\n');
  demos.forEach((demo, i) => {
    console.log(`  ${i + 1}. ${demo.name}`);
  });

  const demoIndex = parseInt(process.argv[2]) || 1;

  if (demoIndex < 1 || demoIndex > demos.length) {
    console.log('\nUsage: npm run build && node dist/ml/detection/demo.js <demo-number>');
    console.log('Example: npm run build && node dist/ml/detection/demo.js 1\n');
    return;
  }

  const selectedDemo = demos[demoIndex - 1];

  console.log(`\n🚀 Running: ${selectedDemo.name}\n`);

  try {
    await selectedDemo.fn();
    console.log('\n✅ Demo completed successfully!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run demo
if (require.main === module) {
  main();
}

export { demoDetectionMonitor, demoAutoUpdater, demoRLAgent, demoDashboard, demoComplete };
