/**
 * Example: Adaptive Detection System
 *
 * Shows how to use the adaptive detection system in your application
 */

import { UndetectBrowser } from '../src';
import { DetectionMonitor } from '../ml/detection/monitor';
import { createAutoUpdater } from '../ml/detection/auto-updater';
import { createDashboard } from '../ml/detection/dashboard';

/**
 * Example 1: Basic Detection Testing
 */
async function example1_BasicDetectionTesting() {
  console.log('Example 1: Basic Detection Testing\n');

  // Create monitor
  const monitor = new DetectionMonitor();

  // Launch browser
  const browser = new UndetectBrowser({
    headless: false,
    fingerprint: {
      canvas: true,
      webgl: true,
      audio: true,
    },
  });

  const browserInstance = await browser.launch();

  // Run tests
  console.log('Running detection tests...');
  const report = await monitor.runAllTests(browserInstance);

  // Print results
  monitor.printReport(report);

  // Check if good enough
  if (report.overallScore >= 80) {
    console.log('✅ Browser is well-protected!');
  } else {
    console.log('⚠️  Protection needs improvement');
    console.log('Recommendation:', report.recommendation);
  }

  await browserInstance.close();
}

/**
 * Example 2: Manual Adaptive Cycle
 */
async function example2_ManualAdaptiveCycle() {
  console.log('Example 2: Manual Adaptive Cycle\n');

  // Create updater
  const updater = createAutoUpdater({
    minImprovement: 5,
    enableAutoUpdate: true,
  });

  // Show current config
  console.log('Current Configuration:');
  console.log(updater.getCurrentConfig());

  // Launch browser
  const browser = new UndetectBrowser({ headless: true });
  const browserInstance = await browser.launch();

  // Run adaptive cycle
  console.log('\nRunning adaptive cycle...');
  const result = await updater.runAdaptiveCycle(browserInstance);

  console.log('\nResults:');
  console.log(`- Old Score: ${result.oldScore}`);
  console.log(`- New Score: ${result.newScore}`);
  console.log(`- Improvement: ${result.improvement.toFixed(2)}%`);
  console.log(`- Deployed: ${result.deployed}`);
  console.log(`- Reason: ${result.reason}`);

  await browserInstance.close();

  // Show statistics
  updater.printStatistics();
}

/**
 * Example 3: Automatic Updates
 */
async function example3_AutomaticUpdates() {
  console.log('Example 3: Automatic Updates\n');

  // Create updater with auto-update enabled
  const updater = createAutoUpdater({
    minImprovement: 5,
    testInterval: 1, // Test every hour (use 24 in production)
    enableAutoUpdate: true,
  });

  // Browser factory for auto-update
  const browserFactory = async () => {
    const browser = new UndetectBrowser({ headless: true });
    return await browser.launch();
  };

  // Start auto-update
  console.log('Starting auto-update system...');
  updater.startAutoUpdate(browserFactory);

  console.log('✅ Auto-update system is running');
  console.log('   - Tests run every hour');
  console.log('   - RL agent optimizes configuration');
  console.log('   - Better configs deployed automatically');

  // In production, keep this running
  // For demo, stop after 10 seconds
  setTimeout(() => {
    console.log('\nStopping auto-update...');
    updater.stopAutoUpdate();
    console.log('✅ Auto-update stopped');
  }, 10000);
}

/**
 * Example 4: Dashboard Monitoring
 */
async function example4_DashboardMonitoring() {
  console.log('Example 4: Dashboard Monitoring\n');

  // Create components
  const monitor = new DetectionMonitor();
  const updater = createAutoUpdater();

  // Start dashboard
  console.log('Starting dashboard...');
  const dashboard = await createDashboard(monitor, updater, {
    port: 3001,
  });

  console.log('✅ Dashboard running at http://localhost:3001');
  console.log('\nOpen your browser and visit the dashboard to see:');
  console.log('  - Real-time detection scores');
  console.log('  - Historical trends');
  console.log('  - Configuration settings');
  console.log('  - Update history');

  // Keep running for 60 seconds
  console.log('\nDashboard will run for 60 seconds...');
  setTimeout(async () => {
    console.log('\nStopping dashboard...');
    await dashboard.stop();
    console.log('✅ Dashboard stopped');
  }, 60000);
}

/**
 * Example 5: Custom Configuration
 */
async function example5_CustomConfiguration() {
  console.log('Example 5: Custom Configuration\n');

  // Create updater with custom settings
  const updater = createAutoUpdater({
    minImprovement: 10, // Require 10% improvement
    testInterval: 12, // Test twice daily
    maxHistory: 200, // Keep 200 history entries
    rlEpisodes: 15, // More training episodes
    rlTimesteps: 100000, // More training steps
    enableAutoUpdate: true,
    configPath: './my-custom-config.json',
    historyPath: './my-custom-history.json',
  });

  console.log('✅ Created updater with custom configuration');
  console.log('Settings:');
  console.log(`  - Min Improvement: 10%`);
  console.log(`  - Test Interval: 12 hours`);
  console.log(`  - RL Episodes: 15`);
  console.log(`  - RL Timesteps: 100,000`);
}

/**
 * Example 6: Complete Production Setup
 */
async function example6_ProductionSetup() {
  console.log('Example 6: Complete Production Setup\n');

  // 1. Initialize components
  const monitor = new DetectionMonitor('./production/detection-history.json');
  const updater = createAutoUpdater({
    minImprovement: 5,
    testInterval: 24, // Daily updates
    enableAutoUpdate: true,
    configPath: './production/config.json',
    historyPath: './production/update-history.json',
  });

  // 2. Start dashboard
  const dashboard = await createDashboard(monitor, updater, {
    port: 3000,
  });
  console.log('✅ Dashboard: http://localhost:3000');

  // 3. Setup browser factory
  const browserFactory = async () => {
    const browser = new UndetectBrowser({
      headless: true,
      fingerprint: {
        canvas: true,
        webgl: true,
        audio: true,
        fonts: true,
        plugins: true,
      },
    });
    return await browser.launch();
  };

  // 4. Start auto-update
  updater.startAutoUpdate(browserFactory);
  console.log('✅ Auto-update: Active (daily checks)');

  // 5. Run initial test
  console.log('\nRunning initial detection test...');
  const browser = await browserFactory();
  const initialReport = await monitor.runAllTests(browser);
  await browser.close();

  monitor.printReport(initialReport);

  console.log('\n' + '='.repeat(70));
  console.log('🚀 Production system is running!');
  console.log('='.repeat(70));
  console.log('Components:');
  console.log('  ✓ Detection Monitor - Tracks detection scores');
  console.log('  ✓ Auto-Updater - Optimizes configuration daily');
  console.log('  ✓ RL Agent - Learns best protection settings');
  console.log('  ✓ Dashboard - Real-time monitoring');
  console.log('\nThe system will:');
  console.log('  1. Test detection daily');
  console.log('  2. Run RL agent if scores drop');
  console.log('  3. Deploy better configurations automatically');
  console.log('  4. Track all changes in history');
  console.log('='.repeat(70));

  // Keep running (in production, this runs forever)
  console.log('\nPress Ctrl+C to stop\n');
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down...');
      updater.stopAutoUpdate();
      await dashboard.stop();
      console.log('✅ System stopped\n');
      resolve(undefined);
      process.exit(0);
    });
  });
}

/**
 * Main function - Run examples
 */
async function main() {
  const examples = [
    { name: 'Basic Detection Testing', fn: example1_BasicDetectionTesting },
    { name: 'Manual Adaptive Cycle', fn: example2_ManualAdaptiveCycle },
    { name: 'Automatic Updates', fn: example3_AutomaticUpdates },
    { name: 'Dashboard Monitoring', fn: example4_DashboardMonitoring },
    { name: 'Custom Configuration', fn: example5_CustomConfiguration },
    { name: 'Complete Production Setup', fn: example6_ProductionSetup },
  ];

  console.log('='.repeat(70));
  console.log('ADAPTIVE DETECTION SYSTEM - EXAMPLES');
  console.log('='.repeat(70));
  console.log('\nAvailable examples:\n');

  examples.forEach((example, i) => {
    console.log(`  ${i + 1}. ${example.name}`);
  });

  const exampleNum = parseInt(process.argv[2]) || 1;

  if (exampleNum < 1 || exampleNum > examples.length) {
    console.log('\nUsage: npm run build && node dist/examples/adaptive-detection-example.js <number>');
    console.log('Example: npm run build && node dist/examples/adaptive-detection-example.js 1\n');
    return;
  }

  const example = examples[exampleNum - 1];
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Running: ${example.name}`);
  console.log('='.repeat(70) + '\n');

  try {
    await example.fn();
    console.log('\n✅ Example completed!\n');
  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}

export {
  example1_BasicDetectionTesting,
  example2_ManualAdaptiveCycle,
  example3_AutomaticUpdates,
  example4_DashboardMonitoring,
  example5_CustomConfiguration,
  example6_ProductionSetup,
};
