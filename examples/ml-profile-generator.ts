/**
 * ML Profile Generator Examples
 * Session 10: ML Profile Generation
 *
 * Examples of using the ML Profile Generator API
 */

import { MLProfileGenerator, type GenerateParams } from '../ml/api/generate';

/**
 * Example 1: Basic profile generation
 */
async function example1_basic() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 1: Basic Profile Generation');
  console.log('='.repeat(80));

  const generator = new MLProfileGenerator();

  const params: GenerateParams = {
    country: 'US',
    os: 'windows',
    browser: 'Chrome',
    browserVersion: '120',
  };

  console.log('\n📝 Generating profile with params:', params);

  try {
    const profile = await generator.generate(params);

    console.log('\n✅ Profile generated successfully!');
    console.log('   Canvas Hash:', profile.canvas.hash);
    console.log('   WebGL Vendor:', profile.webgl.unmaskedVendor);
    console.log('   Hardware Cores:', profile.hardware.hardwareConcurrency);
    console.log('   Screen:', `${profile.screen.width}x${profile.screen.height}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 2: Generate profiles for different platforms
 */
async function example2_multiPlatform() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 2: Multi-Platform Generation');
  console.log('='.repeat(80));

  const generator = new MLProfileGenerator();

  const platforms = [
    { country: 'US', os: 'windows' as const, browser: 'Chrome' },
    { country: 'GB', os: 'mac' as const, browser: 'Safari' },
    { country: 'DE', os: 'linux' as const, browser: 'Firefox' },
  ];

  for (const params of platforms) {
    console.log(`\n🔄 Generating ${params.os} profile...`);

    try {
      const profile = await generator.generate(params);
      console.log('   ✅ Platform:', profile.hardware.platform);
      console.log('   ✅ GPU:', profile.webgl.unmaskedVendor);
    } catch (error) {
      console.error('   ❌ Error:', error);
    }
  }
}

/**
 * Example 3: Batch generation
 */
async function example3_batch() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 3: Batch Generation');
  console.log('='.repeat(80));

  const generator = new MLProfileGenerator();

  const paramsArray: GenerateParams[] = [
    { country: 'US', os: 'windows', browser: 'Chrome', browserVersion: '120' },
    { country: 'US', os: 'windows', browser: 'Chrome', browserVersion: '119' },
    { country: 'US', os: 'windows', browser: 'Edge', browserVersion: '120' },
  ];

  console.log(`\n🔄 Generating ${paramsArray.length} profiles...`);

  try {
    const profiles = await generator.generateBatch(paramsArray);
    console.log(`✅ Generated ${profiles.length} profiles successfully!`);

    profiles.forEach((profile, i) => {
      console.log(`   ${i + 1}. Canvas: ${profile.canvas.hash}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 4: Validation handling
 */
async function example4_validation() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 4: Validation Handling');
  console.log('='.repeat(80));

  const generator = new MLProfileGenerator();

  // Valid profile
  console.log('\n✅ Valid profile (Windows):');
  try {
    const profile = await generator.generate({
      country: 'US',
      os: 'windows',
      browser: 'Chrome',
    });
    console.log('   Platform:', profile.hardware.platform);
    console.log('   GPU:', profile.webgl.unmaskedVendor);
  } catch (error) {
    console.error('   Error:', (error as Error).message);
  }

  // Note: The model should generate consistent profiles automatically
  // If validation fails, it means the model needs more training
}

/**
 * Example 5: Integration with browser automation
 */
async function example5_integration() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 5: Browser Integration Example');
  console.log('='.repeat(80));

  const generator = new MLProfileGenerator();

  console.log('\n🔄 Generating profile for browser...');

  const profile = await generator.generate({
    country: 'US',
    os: 'windows',
    browser: 'Chrome',
    browserVersion: '120',
  });

  console.log('✅ Profile generated!');
  console.log('\n📦 Profile ready for browser configuration:');
  console.log('   Canvas fingerprint:', profile.canvas.hash);
  console.log('   WebGL configuration:', profile.webgl.renderer);
  console.log('   Hardware profile:', {
    cores: profile.hardware.hardwareConcurrency,
    memory: profile.hardware.deviceMemory,
    platform: profile.hardware.platform,
  });
  console.log('   Screen:', `${profile.screen.width}x${profile.screen.height} @ ${profile.screen.devicePixelRatio}x`);

  console.log('\n📝 Example integration:');
  console.log(`
const browser = new UndetectBrowser({
  fingerprint: {
    canvas: profile.canvas,
    webgl: profile.webgl,
    audio: profile.audio,
    hardware: profile.hardware,
    screen: profile.screen
  }
});
await browser.launch();
  `.trim());
}

/**
 * Example 6: Custom model path
 */
async function example6_customModel() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 6: Custom Model Path');
  console.log('='.repeat(80));

  // You can specify custom model path
  const generator = new MLProfileGenerator({
    modelPath: './ml/models/my_custom_model.pth',
    pythonPath: 'python3',
  });

  console.log('✅ Generator created with custom model path');
  console.log('   Note: Make sure the model file exists!');
}

/**
 * Example 7: Test generator availability
 */
async function example7_test() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 7: Test Generator');
  console.log('='.repeat(80));

  const generator = new MLProfileGenerator();

  console.log('\n🔍 Testing generator availability...');

  const isAvailable = await generator.test();

  if (isAvailable) {
    console.log('✅ ML Profile Generator is working correctly!');
  } else {
    console.log('❌ ML Profile Generator test failed');
    console.log('   Make sure Python and dependencies are installed:');
    console.log('   cd ml && pip install -r requirements.txt');
  }
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('\n╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(22) + 'ML Profile Generator Examples' + ' '.repeat(27) + '║');
  console.log('║' + ' '.repeat(32) + 'Session 10' + ' '.repeat(36) + '║');
  console.log('╚' + '='.repeat(78) + '╝');

  console.log('\n⚠️  Note: Make sure Python dependencies are installed:');
  console.log('   cd ml && pip install -r requirements.txt\n');

  try {
    // Run examples
    await example1_basic();
    await example2_multiPlatform();
    await example3_batch();
    await example4_validation();
    await example5_integration();
    await example6_customModel();
    await example7_test();

    console.log('\n' + '='.repeat(80));
    console.log('✅ All examples completed!');
    console.log('='.repeat(80));

    console.log('\n📚 Next steps:');
    console.log('   1. Train the model for better results');
    console.log('   2. Integrate with your browser automation');
    console.log('   3. Customize profiles for your use case');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for use in other files
export {
  example1_basic,
  example2_multiPlatform,
  example3_batch,
  example4_validation,
  example5_integration,
  example6_customModel,
  example7_test,
};
