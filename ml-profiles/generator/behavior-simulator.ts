/**
 * Human Behavior Simulator
 *
 * Simulates realistic human interactions with web pages including:
 * - Mouse movements (Bezier curves, human timing)
 * - Typing (variable speed, mistakes, corrections)
 * - Scrolling (natural easing, pauses)
 * - Clicking (hover, delay, jitter)
 */

import { Page, ElementHandle } from 'puppeteer';
import { BehaviorProfile } from './fingerprint-generator';

export class BehaviorSimulator {
  private profile: BehaviorProfile;
  private currentMouseX: number = 0;
  private currentMouseY: number = 0;

  // Common bigrams in English (for faster typing)
  private commonBigrams = new Set([
    'th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd',
    'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar'
  ]);

  // Keys adjacent on QWERTY keyboard (for realistic typos)
  private adjacentKeys: { [key: string]: string[] } = {
    'a': ['q', 'w', 's', 'z'],
    'b': ['v', 'g', 'h', 'n'],
    'c': ['x', 'd', 'f', 'v'],
    'd': ['s', 'e', 'r', 'f', 'c', 'x'],
    'e': ['w', 'r', 'd', 's'],
    'f': ['d', 'r', 't', 'g', 'v', 'c'],
    'g': ['f', 't', 'y', 'h', 'b', 'v'],
    'h': ['g', 'y', 'u', 'j', 'n', 'b'],
    'i': ['u', 'o', 'k', 'j'],
    'j': ['h', 'u', 'i', 'k', 'm', 'n'],
    'k': ['j', 'i', 'o', 'l', 'm'],
    'l': ['k', 'o', 'p'],
    'm': ['n', 'j', 'k'],
    'n': ['b', 'h', 'j', 'm'],
    'o': ['i', 'p', 'l', 'k'],
    'p': ['o', 'l'],
    'q': ['w', 'a'],
    'r': ['e', 't', 'f', 'd'],
    's': ['a', 'w', 'e', 'd', 'x', 'z'],
    't': ['r', 'y', 'g', 'f'],
    'u': ['y', 'i', 'j', 'h'],
    'v': ['c', 'f', 'g', 'b'],
    'w': ['q', 'e', 's', 'a'],
    'x': ['z', 's', 'd', 'c'],
    'y': ['t', 'u', 'h', 'g'],
    'z': ['a', 's', 'x']
  };

  constructor(profile: BehaviorProfile) {
    this.profile = profile;
  }

  /**
   * Move mouse to element with realistic Bezier curve
   */
  async moveMouseToElement(page: Page, selector: string): Promise<void> {
    try {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const box = await element.boundingBox();
      if (!box) {
        throw new Error(`Element has no bounding box: ${selector}`);
      }

      // Target center of element
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;

      await this.moveMouseTo(page, targetX, targetY);
    } catch (error) {
      console.error('moveMouseToElement error:', error);
      throw error;
    }
  }

  /**
   * Move mouse to coordinates with realistic path
   */
  async moveMouseTo(page: Page, targetX: number, targetY: number): Promise<void> {
    // Generate Bezier path
    const path = this.generateBezierPath(
      this.currentMouseX,
      this.currentMouseY,
      targetX,
      targetY,
      { curvature: 1.2, steps: 50 }
    );

    // Move along path with human timing
    const baseDelay = 1000 / this.profile.mouseSpeed;  // ms per pixel

    for (let i = 0; i < path.length; i++) {
      const point = path[i];

      // Variable delay (faster at start, slower near target)
      const progress = i / path.length;
      const delayMultiplier = progress < 0.5 ? 0.8 : 1.2;
      const delay = baseDelay * delayMultiplier * (1 + (Math.random() - 0.5) * this.profile.randomness);

      await page.mouse.move(point.x, point.y);
      await this.delay(delay * 10);  // Scale up for realistic timing
    }

    // Update current position
    this.currentMouseX = targetX;
    this.currentMouseY = targetY;

    // Small overshoot and correction (human behavior)
    if (Math.random() < 0.3) {  // 30% chance of overshoot
      await this.overshootAndCorrect(page, targetX, targetY);
    }
  }

  /**
   * Realistic overshoot and correction
   */
  private async overshootAndCorrect(page: Page, targetX: number, targetY: number): Promise<void> {
    // Overshoot by 5-15 pixels
    const overshootX = targetX + (Math.random() * 10 - 5);
    const overshootY = targetY + (Math.random() * 10 - 5);

    await page.mouse.move(overshootX, overshootY);
    await this.delay(50);

    // Correct back to target
    await page.mouse.move(targetX, targetY);
    this.currentMouseX = targetX;
    this.currentMouseY = targetY;
  }

  /**
   * Generate Bezier curve path
   */
  private generateBezierPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: { curvature: number; steps: number }
  ): Array<{ x: number; y: number }> {
    // Control points for natural curve
    const cp1x = x1 + (x2 - x1) * 0.25 + (Math.random() * 100 - 50);
    const cp1y = y1 + (y2 - y1) * 0.25 + (Math.random() * 100 - 50);
    const cp2x = x1 + (x2 - x1) * 0.75 + (Math.random() * 100 - 50);
    const cp2y = y1 + (y2 - y1) * 0.75 + (Math.random() * 100 - 50);

    // Generate points along cubic Bezier curve
    const points: Array<{ x: number; y: number }> = [];
    for (let t = 0; t <= 1; t += 1 / options.steps) {
      const x = this.cubicBezier(t, x1, cp1x, cp2x, x2);
      const y = this.cubicBezier(t, y1, cp1y, cp2y, y2);
      points.push({ x, y });
    }

    return points;
  }

  /**
   * Cubic Bezier formula
   */
  private cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const oneMinusT = 1 - t;
    return (
      oneMinusT ** 3 * p0 +
      3 * oneMinusT ** 2 * t * p1 +
      3 * oneMinusT * t ** 2 * p2 +
      t ** 3 * p3
    );
  }

  /**
   * Type text with realistic timing and mistakes
   */
  async typeText(page: Page, selector: string, text: string): Promise<void> {
    // Focus element
    await page.focus(selector);
    await this.delay(100);

    // Calculate base delay from typing speed (WPM to ms/char)
    // 50 WPM = ~240 ms per character (average word length 4.7)
    const baseDelay = (60 * 1000) / (this.profile.typingSpeed * 4.7);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Calculate delay for this character
      let delay = baseDelay;

      // Faster for common bigrams
      if (i > 0 && this.isCommonBigram(text[i - 1] + char)) {
        delay *= 0.7;  // 30% faster
      }

      // Slower for shift key (capitals, symbols)
      if (char === char.toUpperCase() && char !== char.toLowerCase()) {
        delay *= 1.5;  // 50% slower
      }

      // Random variation based on profile randomness
      delay *= 1 + (Math.random() - 0.5) * this.profile.randomness;

      // Type character
      await page.keyboard.type(char, { delay: 0 });
      await this.delay(delay);

      // Chance of typo (if mistakes enabled)
      if (this.profile.mistakes && Math.random() < 0.02) {  // 2% typo rate
        await this.makeTypo(page, char);
      }
    }
  }

  /**
   * Check if bigram is common (for faster typing)
   */
  private isCommonBigram(bigram: string): boolean {
    return this.commonBigrams.has(bigram.toLowerCase());
  }

  /**
   * Make a realistic typo and correct it
   */
  private async makeTypo(page: Page, intendedChar: string): Promise<void> {
    // Get adjacent key
    const adjacent = this.adjacentKeys[intendedChar.toLowerCase()];
    if (!adjacent || adjacent.length === 0) {
      return;  // No adjacent keys
    }

    // Type wrong character
    const wrongChar = adjacent[Math.floor(Math.random() * adjacent.length)];
    await page.keyboard.type(wrongChar);
    await this.delay(100);

    // Notice mistake (100-300ms reaction time)
    await this.delay(100 + Math.random() * 200);

    // Backspace
    await page.keyboard.press('Backspace');
    await this.delay(150);

    // Type correct character
    await page.keyboard.type(intendedChar);
  }

  /**
   * Scroll to element with natural easing
   */
  async scrollToElement(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Element has no bounding box: ${selector}`);
    }

    const currentScroll = await page.evaluate(() => window.scrollY);
    const targetScroll = box.y - 100;  // Leave 100px margin at top

    await this.scrollTo(page, targetScroll);
  }

  /**
   * Scroll to Y position with easing
   */
  async scrollTo(page: Page, targetY: number): Promise<void> {
    const currentY = await page.evaluate(() => window.scrollY);
    const distance = targetY - currentY;

    // Calculate duration based on distance and scroll speed
    const duration = Math.min(Math.abs(distance) / this.profile.scrollSpeed * 1000, 3000);  // Max 3s

    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      // Ease-in-out curve
      const eased = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      const currentScrollY = currentY + distance * eased;

      await page.evaluate((y: number) => window.scrollTo(0, y), currentScrollY);
      await this.delay(16);  // 60 FPS
    }

    // Ensure final position
    await page.evaluate((y: number) => window.scrollTo(0, y), targetY);

    // Reading pause after scroll
    if (this.profile.pauses) {
      await this.readingPause();
    }
  }

  /**
   * Click element with realistic behavior
   */
  async clickElement(page: Page, selector: string): Promise<void> {
    // Move mouse to element
    await this.moveMouseToElement(page, selector);

    // Hover before clicking (100-500ms)
    await this.delay(100 + Math.random() * 400);

    // Mouse down
    await page.mouse.down();

    // Click duration (50-150ms)
    await this.delay(50 + Math.random() * 100);

    // Mouse up
    await page.mouse.up();

    // Small jitter after click (hand tremor)
    const jitterX = Math.random() * 4 - 2;  // ±2px
    const jitterY = Math.random() * 4 - 2;

    await page.mouse.move(
      this.currentMouseX + jitterX,
      this.currentMouseY + jitterY
    );

    this.currentMouseX += jitterX;
    this.currentMouseY += jitterY;
  }

  /**
   * Random mouse movement (to appear active)
   */
  async randomMouseMovement(page: Page, duration: number = 2000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      // Random position within viewport
      const viewportSize = await page.viewport();
      if (!viewportSize) break;

      const targetX = Math.random() * viewportSize.width;
      const targetY = Math.random() * viewportSize.height;

      await this.moveMouseTo(page, targetX, targetY);

      // Pause between movements
      await this.delay(500 + Math.random() * 1000);
    }
  }

  /**
   * Reading pause (simulate user reading content)
   */
  async readingPause(duration?: number): Promise<void> {
    if (!duration) {
      // Calculate based on reading speed (200-300 WPM)
      // Assume average paragraph is 100 words
      const wordsToRead = 50 + Math.random() * 100;
      duration = (wordsToRead / this.profile.readingSpeed) * 60 * 1000;
    }

    // Add randomness
    duration *= 1 + (Math.random() - 0.5) * this.profile.randomness;

    await this.delay(duration);
  }

  /**
   * Simulate page interaction (scroll, read, move mouse)
   */
  async interactWithPage(page: Page, duration: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      // Random action
      const action = Math.random();

      if (action < 0.4) {
        // Scroll (40%)
        const maxScroll = await page.evaluate(() => document.body.scrollHeight);
        const targetScroll = Math.random() * maxScroll;
        await this.scrollTo(page, targetScroll);
      } else if (action < 0.7) {
        // Random mouse movement (30%)
        await this.randomMouseMovement(page, 1000);
      } else {
        // Reading pause (30%)
        await this.readingPause(1000 + Math.random() * 2000);
      }

      // Short break between actions
      await this.delay(500 + Math.random() * 1000);
    }
  }

  /**
   * Fill form with realistic behavior
   */
  async fillForm(
    page: Page,
    fields: Array<{ selector: string; value: string; type?: 'text' | 'email' | 'password' }>
  ): Promise<void> {
    for (const field of fields) {
      // Move to field
      await this.moveMouseToElement(page, field.selector);

      // Click to focus
      await this.clickElement(page, field.selector);

      // Short thinking pause
      await this.delay(200 + Math.random() * 300);

      // Type value
      await this.typeText(page, field.selector, field.value);

      // Pause after field (thinking about next field)
      await this.delay(300 + Math.random() * 500);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current mouse position
   */
  getMousePosition(): { x: number; y: number } {
    return {
      x: this.currentMouseX,
      y: this.currentMouseY
    };
  }

  /**
   * Set mouse position (for initialization)
   */
  setMousePosition(x: number, y: number): void {
    this.currentMouseX = x;
    this.currentMouseY = y;
  }

  /**
   * Update behavior profile (e.g., if user gets tired)
   */
  updateProfile(updates: Partial<BehaviorProfile>): void {
    this.profile = { ...this.profile, ...updates };
  }
}

// Example usage:
/*
const simulator = new BehaviorSimulator({
  mouseSpeed: 1200,
  typingSpeed: 50,
  scrollSpeed: 800,
  readingSpeed: 250,
  randomness: 0.5,
  mistakes: true,
  pauses: true
});

// Move and click
await simulator.moveMouseToElement(page, '#login-button');
await simulator.clickElement(page, '#login-button');

// Fill form
await simulator.fillForm(page, [
  { selector: '#email', value: 'user@example.com', type: 'email' },
  { selector: '#password', value: 'SecureP@ss123', type: 'password' }
]);

// Scroll and read
await simulator.scrollToElement(page, '#article');
await simulator.readingPause(5000);

// General page interaction
await simulator.interactWithPage(page, 30000);  // 30 seconds
*/
