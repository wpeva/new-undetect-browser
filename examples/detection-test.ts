import { UndetectBrowser, LogLevel } from '../src/index';

/**
 * Detection Test Example
 * Tests the browser against multiple detection sites
 */
async function main() {
  console.log('🕵️  Detection Test Example\n');

  const undetect = new UndetectBrowser({
    stealth: { level: 'paranoid' },
    logLevel: LogLevel.INFO,
  });

  const browser = await undetect.launch({
    headless: false,
  });

  const testSites = [
    {
      name: 'Bot.Sannysoft',
      url: 'https://bot.sannysoft.com/',
      checks: async (page: any) => {
        await page.waitForTimeout(2000);

        const webdriver = await page.evaluate(() => {
          const el = document.querySelector('#webdriver');
          return el?.textContent?.trim();
        });

        const chrome = await page.evaluate(() => {
          const el = document.querySelector('#chrome');
          return el?.textContent?.trim();
        });

        const plugins = await page.evaluate(() => {
          const el = document.querySelector('#plugins');
          return el?.textContent?.trim();
        });

        return {
          webdriver: !webdriver?.includes('present'),
          chrome: chrome?.includes('present'),
          plugins: !plugins?.includes('0'),
        };
      },
    },
    {
      name: 'Are You Headless',
      url: 'https://arh.antoinevastel.com/bots/areyouheadless',
      checks: async (page: any) => {
        await page.waitForTimeout(2000);

        const text = await page.evaluate(() => {
          return document.body.textContent || '';
        });

        return {
          notHeadless: !text.includes('You are Chrome headless'),
        };
      },
    },
    {
      name: 'BrowserLeaks - WebRTC',
      url: 'https://browserleaks.com/webrtc',
      checks: async (page: any) => {
        await page.waitForTimeout(3000);
        return { loaded: true };
      },
    },
  ];

  const results: any[] = [];

  for (const site of testSites) {
    console.log(`\n📍 Testing: ${site.name}`);
    console.log(`   URL: ${site.url}`);

    const page = await browser.newPage();

    try {
      await page.goto(site.url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const checks = await site.checks(page);

      console.log('   Results:', checks);

      // Take screenshot
      const filename = `examples/screenshots/${site.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`   Screenshot: ${filename}`);

      results.push({
        site: site.name,
        url: site.url,
        checks,
        passed: Object.values(checks).every((v) => v === true),
      });

      // Wait before next test
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error(`   ❌ Error:`, error);
      results.push({
        site: site.name,
        url: site.url,
        error: (error as Error).message,
        passed: false,
      });
    } finally {
      await page.close();
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.site}`);
    if (result.checks) {
      Object.entries(result.checks).forEach(([key, value]) => {
        const checkStatus = value ? '✓' : '✗';
        console.log(`    ${checkStatus} ${key}`);
      });
    }
  }

  const totalPassed = results.filter((r) => r.passed).length;
  const totalTests = results.length;
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log(`Pass Rate: ${passRate}% (${totalPassed}/${totalTests})`);
  console.log('='.repeat(60));

  await browser.close();
  console.log('\n✅ Done!');
}

main().catch(console.error);
