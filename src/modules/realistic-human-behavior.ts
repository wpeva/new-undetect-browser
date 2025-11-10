/**
 * Realistic Human Behavior Simulator
 * Advanced biometric simulation with natural patterns
 */

import { Page } from 'puppeteer';

export interface HumanBehaviorProfile {
  typingSpeed: number; // WPM
  typingVariance: number; // Variability
  mouseSpeed: number; // pixels/second
  mouseAccuracy: number; // 0-1
  reactionTime: number; // milliseconds
  readingSpeed: number; // words per minute
  scrollPattern: 'smooth' | 'jumpy' | 'mixed';
  clickPattern: 'fast' | 'deliberate' | 'mixed';
  errorRate: number; // 0-1, typo frequency
}

/**
 * Generate realistic human behavior profile
 */
export function generateHumanBehaviorProfile(seed?: string): HumanBehaviorProfile {
  const random = seed ? createSeededRandom(seed) : Math.random;

  // Typing speed: 40-80 WPM is typical
  const typingSpeed = 40 + random() * 40;

  // Mouse speed: 200-600 pixels/second
  const mouseSpeed = 200 + random() * 400;

  return {
    typingSpeed,
    typingVariance: 0.2 + random() * 0.3, // 20-50% variance
    mouseSpeed,
    mouseAccuracy: 0.7 + random() * 0.25, // 70-95%
    reactionTime: 150 + random() * 200, // 150-350ms
    readingSpeed: 200 + random() * 100, // 200-300 WPM
    scrollPattern: random() > 0.7 ? 'jumpy' : random() > 0.4 ? 'smooth' : 'mixed',
    clickPattern: random() > 0.6 ? 'fast' : random() > 0.3 ? 'deliberate' : 'mixed',
    errorRate: random() * 0.05, // 0-5% typos
  };
}

/**
 * Human-like typing with realistic delays
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  profile: HumanBehaviorProfile
): Promise<void> {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element ${selector} not found`);
  }

  await element.click();
  await delay(profile.reactionTime);

  const baseDelay = 60000 / (profile.typingSpeed * 5); // Convert WPM to ms per char

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Add typing variance
    const variance = 1 + (Math.random() - 0.5) * profile.typingVariance;
    let charDelay = baseDelay * variance;

    // Slower for capital letters and special chars
    if (char !== char.toLowerCase() || /[^a-zA-Z0-9\s]/.test(char)) {
      charDelay *= 1.5;
    }

    // Faster for common bigrams
    if (i > 0) {
      const bigram = text.substring(i - 1, i + 1).toLowerCase();
      const fastBigrams = ['th', 'he', 'in', 'er', 'an', 'ed', 'nd', 'to', 'en', 'or'];
      if (fastBigrams.includes(bigram)) {
        charDelay *= 0.7;
      }
    }

    // Occasional typos
    if (Math.random() < profile.errorRate && i < text.length - 1) {
      // Type wrong character
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
      await page.keyboard.type(wrongChar);
      await delay(charDelay);

      // Realize mistake (longer pause)
      await delay(profile.reactionTime * 1.5);

      // Delete wrong character
      await page.keyboard.press('Backspace');
      await delay(charDelay * 0.5);
    }

    // Type correct character
    await page.keyboard.type(char);
    await delay(charDelay);

    // Longer pause after punctuation
    if (/[.!?,;]/.test(char)) {
      await delay(profile.reactionTime);
    }

    // Small pause after space (word boundary)
    if (char === ' ') {
      await delay(charDelay * 0.5);
    }
  }
}

/**
 * Human-like mouse movement with bezier curves
 */
export async function humanMoveMouse(
  page: Page,
  targetX: number,
  targetY: number,
  profile: HumanBehaviorProfile
): Promise<void> {
  // Get current mouse position (assume center if unknown)
  const viewport = page.viewport();
  const startX = viewport ? viewport.width / 2 : 500;
  const startY = viewport ? viewport.height / 2 : 500;

  // Calculate distance
  const distance = Math.sqrt(
    Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2)
  );

  // Time based on mouse speed
  const duration = (distance / profile.mouseSpeed) * 1000;

  // Generate bezier curve points
  const points = generateBezierPath(
    startX,
    startY,
    targetX,
    targetY,
    profile.mouseAccuracy
  );

  // Move along path
  const steps = Math.max(10, Math.floor(duration / 16)); // ~60fps
  const delayPerStep = duration / steps;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    // Add small random jitter
    const jitterX = (Math.random() - 0.5) * (1 - profile.mouseAccuracy) * 5;
    const jitterY = (Math.random() - 0.5) * (1 - profile.mouseAccuracy) * 5;

    await page.mouse.move(point.x + jitterX, point.y + jitterY);
    await delay(delayPerStep / points.length);
  }

  // Final precise position
  await page.mouse.move(targetX, targetY);
}

/**
 * Human-like click with micro-movements
 */
export async function humanClick(
  page: Page,
  selector: string,
  profile: HumanBehaviorProfile
): Promise<void> {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element ${selector} not found`);
  }

  // Get element position
  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Could not get bounding box for ${selector}`);
  }

  // Target center of element with slight randomness
  const targetX = box.x + box.width / 2 + (Math.random() - 0.5) * box.width * 0.3;
  const targetY = box.y + box.height / 2 + (Math.random() - 0.5) * box.height * 0.3;

  // Move to element
  await humanMoveMouse(page, targetX, targetY, profile);

  // Reaction time before click
  await delay(profile.reactionTime * (0.8 + Math.random() * 0.4));

  // Small movement during click (hand tremor)
  const tremorX = (Math.random() - 0.5) * 2;
  const tremorY = (Math.random() - 0.5) * 2;
  await page.mouse.move(targetX + tremorX, targetY + tremorY);

  // Click with realistic timing
  await page.mouse.down();
  await delay(50 + Math.random() * 50); // 50-100ms click duration
  await page.mouse.up();

  // Small movement after click
  await page.mouse.move(targetX + tremorX * 2, targetY + tremorY * 2);
  await delay(30 + Math.random() * 20);
}

/**
 * Human-like scrolling
 */
export async function humanScroll(
  page: Page,
  direction: 'up' | 'down',
  amount: number,
  profile: HumanBehaviorProfile
): Promise<void> {
  const scrollAmount = direction === 'down' ? amount : -amount;

  if (profile.scrollPattern === 'smooth') {
    // Smooth continuous scroll
    const steps = 20;
    const stepAmount = scrollAmount / steps;

    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel({ deltaY: stepAmount });
      await delay(16 + Math.random() * 8); // ~60fps with variance
    }
  } else if (profile.scrollPattern === 'jumpy') {
    // Quick jumps with pauses
    const jumps = 3 + Math.floor(Math.random() * 3);
    const jumpAmount = scrollAmount / jumps;

    for (let i = 0; i < jumps; i++) {
      await page.mouse.wheel({ deltaY: jumpAmount });
      await delay(200 + Math.random() * 200);
    }
  } else {
    // Mixed: combination of smooth and jumpy
    const smoothPortion = scrollAmount * 0.6;
    const jumpPortion = scrollAmount * 0.4;

    // Smooth part
    const smoothSteps = 15;
    for (let i = 0; i < smoothSteps; i++) {
      await page.mouse.wheel({ deltaY: smoothPortion / smoothSteps });
      await delay(16 + Math.random() * 8);
    }

    await delay(100 + Math.random() * 100);

    // Jump
    await page.mouse.wheel({ deltaY: jumpPortion });
  }
}

/**
 * Human-like page reading behavior
 */
export async function humanReadPage(
  page: Page,
  profile: HumanBehaviorProfile
): Promise<void> {
  // Get page height
  const height = await page.evaluate(() => document.body.scrollHeight);
  const viewport = page.viewport();
  const viewportHeight = viewport?.height || 800;

  // Estimate reading time based on content
  const textContent = await page.evaluate(() => document.body.innerText);
  const wordCount = textContent.split(/\s+/).length;
  // Use reading time for potential future optimization
  const _readingTime = (wordCount / profile.readingSpeed) * 60000; // ms

  // Scroll through page naturally
  let currentScroll = 0;
  const targetScroll = height - viewportHeight;

  while (currentScroll < targetScroll) {
    // Read viewport content
    const viewportWords = Math.floor((viewportHeight / 20) * 10); // Estimate words per viewport
    const viewportReadTime = (viewportWords / profile.readingSpeed) * 60000;
    await delay(viewportReadTime * (0.8 + Math.random() * 0.4));

    // Scroll to next section
    const scrollDistance = viewportHeight * (0.7 + Math.random() * 0.3);
    await humanScroll(page, 'down', scrollDistance, profile);
    currentScroll += scrollDistance;

    // Occasional scroll back (re-reading)
    if (Math.random() < 0.15) {
      await delay(500 + Math.random() * 500);
      await humanScroll(page, 'up', scrollDistance * 0.3, profile);
      await delay(1000 + Math.random() * 1000);
      await humanScroll(page, 'down', scrollDistance * 0.3, profile);
    }

    // Random pauses (thinking, distraction)
    if (Math.random() < 0.1) {
      await delay(2000 + Math.random() * 3000);
    }
  }
}

/**
 * Simulate human page exploration
 */
export async function humanExplorePage(
  page: Page,
  profile: HumanBehaviorProfile
): Promise<void> {
  // Hover over random elements
  const hoverableElements = await page.$$('a, button, [onclick], img');

  if (hoverableElements.length > 0) {
    const elementsToHover = Math.min(
      3 + Math.floor(Math.random() * 5),
      hoverableElements.length
    );

    for (let i = 0; i < elementsToHover; i++) {
      const element = hoverableElements[Math.floor(Math.random() * hoverableElements.length)];
      const box = await element.boundingBox();

      if (box) {
        const targetX = box.x + box.width / 2;
        const targetY = box.y + box.height / 2;

        await humanMoveMouse(page, targetX, targetY, profile);
        await delay(500 + Math.random() * 1500); // Hover duration

        // Small movements while hovering
        for (let j = 0; j < 2; j++) {
          const offsetX = (Math.random() - 0.5) * box.width * 0.5;
          const offsetY = (Math.random() - 0.5) * box.height * 0.5;
          await page.mouse.move(targetX + offsetX, targetY + offsetY);
          await delay(100 + Math.random() * 200);
        }
      }
    }
  }
}

/**
 * Generate bezier curve for mouse movement
 */
function generateBezierPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  accuracy: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  // Control points for bezier curve
  const cp1x = startX + (endX - startX) * (0.2 + Math.random() * 0.3);
  const cp1y = startY + (endY - startY) * (Math.random() - 0.5) * 0.5;
  const cp2x = startX + (endX - startX) * (0.7 + Math.random() * 0.2);
  const cp2y = endY + (startY - endY) * (Math.random() - 0.5) * 0.5;

  // Generate points along curve
  const steps = 30 + Math.floor((1 - accuracy) * 20);

  for (let t = 0; t <= 1; t += 1 / steps) {
    const x = cubicBezier(t, startX, cp1x, cp2x, endX);
    const y = cubicBezier(t, startY, cp1y, cp2y, endY);
    points.push({ x, y });
  }

  return points;
}

/**
 * Cubic bezier formula
 */
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const oneMinusT = 1 - t;
  return (
    oneMinusT ** 3 * p0 +
    3 * oneMinusT ** 2 * t * p1 +
    3 * oneMinusT * t ** 2 * p2 +
    t ** 3 * p3
  );
}

/**
 * Delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Seeded random generator
 */
function createSeededRandom(seed: string): () => number {
  let value = seed.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280.0;
  };
}

/**
 * Simulate form filling with human behavior
 */
export async function humanFillForm(
  page: Page,
  formData: Record<string, string>,
  profile: HumanBehaviorProfile
): Promise<void> {
  for (const [selector, value] of Object.entries(formData)) {
    // Random delay before focusing field
    await delay(500 + Math.random() * 1000);

    // Click on field
    await humanClick(page, selector, profile);

    // Small pause before typing
    await delay(300 + Math.random() * 300);

    // Type value
    await humanType(page, selector, value, profile);

    // Occasional field re-check
    if (Math.random() < 0.2) {
      await delay(500 + Math.random() * 500);
      const currentValue = await page.$eval(
        selector,
        (el: any) => el.value
      );

      if (currentValue !== value) {
        // Re-type if mismatch
        await page.$eval(selector, (el: any) => (el.value = ''));
        await humanType(page, selector, value, profile);
      }
    }
  }
}
