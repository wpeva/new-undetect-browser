import { UndetectBrowser } from '../src/index';

/**
 * Behavioral Simulation Example
 * Demonstrates human-like interactions
 */
async function main() {
  console.log('🤖 Starting Behavioral Simulation Example\n');

  const undetect = new UndetectBrowser({
    stealth: {
      level: 'advanced',
      behavioralSimulation: true,
      networkProtection: true,
    },
  });

  const browser = await undetect.launch({
    headless: false,
  });

  const page = await browser.newPage();

  console.log('📄 Navigating to example page...\n');
  await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

  // ========================================
  // Example 1: Human-like mouse movement
  // ========================================
  console.log('🖱️  Example 1: Human-like mouse movement');
  console.log('Moving mouse to search box using Bezier curves...');

  // The mouse will move in a natural curve, not a straight line
  await (page as any).humanMove(400, 300);
  console.log('✅ Mouse moved naturally\n');

  await (page as any).humanDelay(500, 1000);

  // ========================================
  // Example 2: Human-like clicking
  // ========================================
  console.log('👆 Example 2: Human-like clicking');
  console.log('Clicking on search box with natural offset...');

  // Clicks slightly off-center with pre-click micro-movements
  await (page as any).humanClick('textarea[name="q"]');
  console.log('✅ Clicked naturally\n');

  await (page as any).humanDelay(300, 700);

  // ========================================
  // Example 3: Human-like typing
  // ========================================
  console.log('⌨️  Example 3: Human-like typing');
  console.log('Typing with variable speed and occasional mistakes...');

  // Types with:
  // - Variable WPM (50-120)
  // - Occasional typos and corrections
  // - Pauses at punctuation
  // - Thinking pauses
  await (page as any).humanType(
    'textarea[name="q"]',
    'undetectable browser automation'
  );
  console.log('✅ Typed naturally\n');

  await (page as any).humanDelay(500, 1000);

  // ========================================
  // Example 4: Human-like scrolling
  // ========================================
  console.log('📜 Example 4: Human-like scrolling');
  console.log('Scrolling with variable speed and reading pauses...');

  // Scroll down
  await (page as any).humanScroll({
    direction: 'down',
    distance: 300,
  });

  await (page as any).humanDelay(1000, 2000);

  // Scroll up a bit (natural overcorrection)
  await (page as any).humanScroll({
    direction: 'up',
    distance: 100,
  });

  console.log('✅ Scrolled naturally\n');

  // ========================================
  // Example 5: Simulate reading behavior
  // ========================================
  console.log('📖 Example 5: Simulating reading');
  console.log('Moving mouse randomly to simulate reading...');

  // Simulates a user reading content by moving mouse randomly
  await (page as any).simulateReading(3000);
  console.log('✅ Simulated reading for 3 seconds\n');

  // ========================================
  // Example 6: Complete realistic interaction
  // ========================================
  console.log('🎭 Example 6: Complete realistic interaction sequence');
  console.log('Performing a search like a real human would...\n');

  // Clear search box
  await page.evaluate(() => {
    const input = document.querySelector('textarea[name="q"]') as HTMLTextAreaElement;
    if (input) input.value = '';
  });

  // Move to search box
  console.log('  → Moving to search box...');
  const searchBox = await page.$('textarea[name="q"]');
  if (searchBox) {
    const box = await searchBox.boundingBox();
    if (box) {
      await (page as any).humanMove(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    }
  }

  // Click
  console.log('  → Clicking...');
  await (page as any).humanClick('textarea[name="q"]');

  // Type query
  console.log('  → Typing query...');
  await (page as any).humanType('textarea[name="q"]', 'puppeteer stealth');

  // Wait (thinking)
  console.log('  → Thinking...');
  await (page as any).humanDelay(500, 1500);

  // Press Enter
  console.log('  → Pressing Enter...');
  await page.keyboard.press('Enter');

  // Wait for results
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('  → Search results loaded\n');

  // Simulate reading results
  console.log('  → Reading results...');
  await (page as any).simulateReading(5000);

  // Scroll through results
  console.log('  → Scrolling through results...');
  await (page as any).humanScroll({
    direction: 'down',
    distance: 500,
  });

  await (page as any).humanDelay(1000, 2000);

  await (page as any).humanScroll({
    direction: 'down',
    distance: 300,
  });

  console.log('✅ Complete interaction finished\n');

  // ========================================
  // Take screenshot
  // ========================================
  await page.screenshot({
    path: 'examples/screenshots/behavioral-example.png',
    fullPage: true,
  });

  console.log('📸 Screenshot saved to examples/screenshots/behavioral-example.png\n');

  // Keep browser open for inspection
  console.log('Browser will stay open for 10 seconds for inspection...');
  await (page as any).humanDelay(10000, 10000);

  await browser.close();

  console.log('✅ Done!');
}

main().catch(console.error);
