import { Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { randomDelay, bezierPoint } from '../utils/helpers';

export interface MouseMoveOptions {
  steps?: number;
  duration?: number;
}

export interface ClickOptions {
  offset?: { x: number; y: number };
  delay?: number;
}

export interface TypeOptions {
  delay?: number;
  mistake?: boolean;
}

export interface ScrollOptions {
  direction: 'up' | 'down';
  distance?: number;
  duration?: number;
}

interface TrajectoryCache {
  path: { x: number; y: number; t: number }[];
  timestamp: number;
}

interface KeyTimingPattern {
  pressToPress: number[]; // Time between key presses
  pressToRelease: number[]; // Hold duration
  lastKeyTime: number;
}

/**
 * Behavioral Simulation Module
 * Provides human-like mouse, keyboard, and scroll interactions
 * with caching and realistic timing patterns
 */
export class BehavioralSimulationModule {
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private trajectoryCache: Map<string, TrajectoryCache> = new Map();
  private keyTimingPattern: KeyTimingPattern = {
    pressToPress: [],
    pressToRelease: [],
    lastKeyTime: Date.now(),
  };
  private readonly CACHE_TTL = 5000; // 5 seconds
  private readonly MAX_CACHE_SIZE = 50;

  /**
   * Generate trajectory cache key
   */
  private getTrajectoryKey(startX: number, startY: number, endX: number, endY: number): string {
    const roundToTen = (n: number) => Math.round(n / 10) * 10;
    return `${roundToTen(startX)},${roundToTen(startY)}-${roundToTen(endX)},${roundToTen(endY)}`;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.trajectoryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.trajectoryCache.delete(key));

    // Limit cache size
    if (this.trajectoryCache.size > this.MAX_CACHE_SIZE) {
      const entriesToDelete = this.trajectoryCache.size - this.MAX_CACHE_SIZE;
      const keys = Array.from(this.trajectoryCache.keys()).slice(0, entriesToDelete);
      keys.forEach((key) => this.trajectoryCache.delete(key));
    }
  }

  /**
   * Move mouse in a human-like way using Bezier curves with caching
   */
  async humanMouseMove(
    page: Page,
    targetX: number,
    targetY: number,
    options: MouseMoveOptions = {}
  ): Promise<void> {
    const startX = this.lastMousePosition.x;
    const startY = this.lastMousePosition.y;

    // Check cache for similar trajectory
    const cacheKey = this.getTrajectoryKey(startX, startY, targetX, targetY);
    let path: { x: number; y: number; t: number }[];

    const cached = this.trajectoryCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      // Use cached trajectory with slight variations
      path = cached.path.map((p) => ({
        x: p.x + (Math.random() - 0.5) * 5, // ±2.5px variation
        y: p.y + (Math.random() - 0.5) * 5,
        t: p.t * (0.9 + Math.random() * 0.2), // ±10% time variation
      }));
    } else {
      // Generate new trajectory
      const steps = options.steps || Math.floor(Math.random() * 20) + 10;
      const duration = options.duration || Math.random() * 500 + 300;

      // More realistic control points (overshoot and correction)
      const distance = Math.sqrt(
        Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2)
      );
      const overshoot = distance > 200 ? (Math.random() * 0.15 + 0.05) : 0; // 5-20% overshoot for long distances

      const cp1x = startX + (targetX - startX) * (Math.random() * 0.3 + 0.2);
      const cp1y = startY + (targetY - startY) * (Math.random() * 0.3 + 0.2);
      const cp2x = startX + (targetX - startX) * (1 + overshoot);
      const cp2y = startY + (targetY - startY) * (1 + overshoot);

      const stepDelay = duration / steps;

      path = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        // Calculate position using cubic Bezier curve
        let x = bezierPoint(t, startX, cp1x, cp2x, targetX);
        let y = bezierPoint(t, startY, cp1y, cp2y, targetY);

        // Add subtle jitter
        const jitterX = (Math.random() - 0.5) * 2;
        const jitterY = (Math.random() - 0.5) * 2;

        x += jitterX;
        y += jitterY;

        path.push({ x, y, t: stepDelay });
      }

      // Cache the trajectory
      this.trajectoryCache.set(cacheKey, { path, timestamp: now });
      this.cleanCache();
    }

    // Execute the path
    for (const point of path) {
      await page.mouse.move(point.x, point.y);

      // Random micro-pauses for realism
      if (Math.random() < 0.1) {
        await randomDelay(10, 30);
      } else {
        await randomDelay(point.t * 0.8, point.t * 1.2);
      }
    }

    this.lastMousePosition = { x: targetX, y: targetY };
    logger.debug(`Mouse moved to (${targetX}, ${targetY}) [cached: ${!!cached}]`);
  }

  /**
   * Click in a human-like way
   */
  async humanClick(
    page: Page,
    selector: string,
    options: ClickOptions = {}
  ): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element ${selector} not found`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Element ${selector} has no bounding box`);
    }

    // Calculate click position with offset
    const offsetX = options.offset?.x ?? (Math.random() - 0.5) * box.width * 0.3;
    const offsetY = options.offset?.y ?? (Math.random() - 0.5) * box.height * 0.3;

    const clickX = box.x + box.width / 2 + offsetX;
    const clickY = box.y + box.height / 2 + offsetY;

    // Move to position
    await this.humanMouseMove(page, clickX, clickY);

    // Pre-click micro-movements
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      await page.mouse.move(
        clickX + (Math.random() - 0.5) * 3,
        clickY + (Math.random() - 0.5) * 3
      );
      await randomDelay(10, 30);
    }

    // Wait before clicking
    await randomDelay(50, 150);

    // Click with realistic timing
    await page.mouse.down();
    await randomDelay(30, 120); // Human click duration
    await page.mouse.up();

    // Post-click pause
    await randomDelay(options.delay || 100, options.delay ? options.delay + 200 : 300);

    logger.debug(`Clicked on ${selector}`);
  }

  /**
   * Generate realistic key timing based on learned patterns
   */
  private getRealisticKeyTiming(char: string, prevChar?: string): { pressTime: number; holdTime: number } {
    const now = Date.now();

    // Base WPM with fatigue (slower over time)
    const fatigueFactor = Math.min(1.2, 1 + this.keyTimingPattern.pressToPress.length / 1000);
    const baseWPM = (50 + Math.random() * 70) / fatigueFactor; // 50-120 WPM with fatigue
    const baseDelay = 60000 / (baseWPM * 5);

    let pressTime = baseDelay;
    let holdTime = 40 + Math.random() * 60; // 40-100ms hold time

    // Digraph timing (common letter combinations)
    if (prevChar) {
      const digraph = `${prevChar}${char}`.toLowerCase();
      const commonDigraphs = ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd'];

      if (commonDigraphs.includes(digraph)) {
        pressTime *= 0.8; // Faster for common combinations
      } else if (/[aeiou]{2}/.test(digraph) || /[bcdfghjklmnpqrstvwxyz]{2}/.test(digraph)) {
        pressTime *= 1.3; // Slower for awkward combinations
      }
    }

    // Punctuation and special characters
    if ([',', '.', '!', '?', ';', ':'].includes(char)) {
      pressTime += Math.random() * 300 + 200;
      holdTime += Math.random() * 50;
    }

    // Space (word boundaries)
    if (char === ' ') {
      pressTime += Math.random() * 100 + 50;
    }

    // Capital letters (shift key)
    if (/[A-Z]/.test(char)) {
      holdTime += 20 + Math.random() * 30; // Longer hold for shift
    }

    // Numbers and symbols (reach to different rows)
    if (/[0-9!@#$%^&*()]/.test(char)) {
      pressTime *= 1.4;
      holdTime += Math.random() * 30;
    }

    // Random "thinking" pauses (5% chance)
    if (Math.random() < 0.05) {
      pressTime += Math.random() * 700 + 300;
    }

    // Learn from this timing
    this.keyTimingPattern.pressToPress.push(pressTime);
    this.keyTimingPattern.pressToRelease.push(holdTime);

    // Keep only last 100 timings
    if (this.keyTimingPattern.pressToPress.length > 100) {
      this.keyTimingPattern.pressToPress.shift();
      this.keyTimingPattern.pressToRelease.shift();
    }

    this.keyTimingPattern.lastKeyTime = now + pressTime;

    return {
      pressTime: pressTime * (0.8 + Math.random() * 0.4), // ±20% variation
      holdTime: holdTime * (0.9 + Math.random() * 0.2), // ±10% variation
    };
  }

  /**
   * Type text in a human-like way with realistic keyboard timing
   */
  async humanType(
    page: Page,
    selector: string,
    text: string,
    options: TypeOptions = {}
  ): Promise<void> {
    // Click on the element first
    await this.humanClick(page, selector);
    await randomDelay(100, 300);

    const makeMistakes = options.mistake ?? Math.random() < 0.1; // 10% chance
    let prevChar: string | undefined;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Occasional typing mistakes (3% chance)
      if (makeMistakes && Math.random() < 0.03 && i > 0) {
        // Type wrong character (adjacent key on QWERTY)
        const wrongChar = this.getAdjacentKey(char);
        const mistakeTiming = this.getRealisticKeyTiming(wrongChar, prevChar);

        await randomDelay(mistakeTiming.pressTime, mistakeTiming.pressTime);
        await page.keyboard.down(wrongChar as any);
        await randomDelay(mistakeTiming.holdTime, mistakeTiming.holdTime);
        await page.keyboard.up(wrongChar as any);

        // Realize mistake (100-200ms delay)
        await randomDelay(100, 200);

        // Backspace
        const backspaceTiming = this.getRealisticKeyTiming('Backspace');
        await randomDelay(backspaceTiming.pressTime, backspaceTiming.pressTime);
        await page.keyboard.down('Backspace');
        await randomDelay(backspaceTiming.holdTime, backspaceTiming.holdTime);
        await page.keyboard.up('Backspace');

        await randomDelay(50, 100);
      }

      // Type the correct character with realistic timing
      const timing = this.getRealisticKeyTiming(char, prevChar);

      await randomDelay(timing.pressTime, timing.pressTime);
      await page.keyboard.down(char as any);
      await randomDelay(timing.holdTime, timing.holdTime);
      await page.keyboard.up(char as any);

      prevChar = char;
    }

    logger.debug(`Typed "${text}" into ${selector} with realistic timing`);
  }

  /**
   * Get adjacent key on QWERTY keyboard for realistic typos
   */
  private getAdjacentKey(char: string): string {
    const qwertyMap: Record<string, string[]> = {
      q: ['w', 'a'], w: ['q', 'e', 's'], e: ['w', 'r', 'd'], r: ['e', 't', 'f'],
      t: ['r', 'y', 'g'], y: ['t', 'u', 'h'], u: ['y', 'i', 'j'], i: ['u', 'o', 'k'],
      o: ['i', 'p', 'l'], p: ['o', 'l'],
      a: ['q', 's', 'z'], s: ['w', 'a', 'd', 'x'], d: ['e', 's', 'f', 'c'],
      f: ['r', 'd', 'g', 'v'], g: ['t', 'f', 'h', 'b'], h: ['y', 'g', 'j', 'n'],
      j: ['u', 'h', 'k', 'm'], k: ['i', 'j', 'l'], l: ['o', 'k', 'p'],
      z: ['a', 'x'], x: ['s', 'z', 'c'], c: ['d', 'x', 'v'], v: ['f', 'c', 'b'],
      b: ['g', 'v', 'n'], n: ['h', 'b', 'm'], m: ['j', 'n'],
    };

    const lowerChar = char.toLowerCase();
    const adjacent = qwertyMap[lowerChar];

    if (adjacent && adjacent.length > 0) {
      const wrongChar = adjacent[Math.floor(Math.random() * adjacent.length)];
      return /[A-Z]/.test(char) ? wrongChar.toUpperCase() : wrongChar;
    }

    // Fallback to similar character
    return String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
  }

  /**
   * Scroll in a human-like way
   */
  async humanScroll(
    page: Page,
    options: ScrollOptions
  ): Promise<void> {
    const distance = options.distance || Math.random() * 500 + 300;
    const duration = options.duration || Math.random() * 1000 + 500;
    const steps = Math.floor(distance / (Math.random() * 30 + 20));
    const stepSize = distance / steps;
    const stepDelay = duration / steps;

    for (let i = 0; i < steps; i++) {
      await page.evaluate(
        (delta, direction) => {
          window.scrollBy(0, direction === 'down' ? delta : -delta);
        },
        stepSize,
        options.direction
      );

      // Variable scroll speed
      await randomDelay(stepDelay * 0.8, stepDelay * 1.2);

      // Random pauses (simulating "reading")
      if (Math.random() < 0.1) {
        await randomDelay(500, 2000);
      }

      // Occasional micro-scrolls back (natural overcorrection)
      if (Math.random() < 0.05) {
        await page.evaluate((delta, direction) => {
          window.scrollBy(0, direction === 'down' ? -delta * 0.1 : delta * 0.1);
        }, stepSize, options.direction);
        await randomDelay(50, 150);
      }
    }

    // Final pause
    await randomDelay(300, 700);

    logger.debug(`Scrolled ${options.direction} by ${distance}px`);
  }

  /**
   * Wait for a random human-like delay
   */
  async humanDelay(min: number = 500, max: number = 2000): Promise<void> {
    await randomDelay(min, max);
  }

  /**
   * Move mouse randomly (simulate reading/browsing)
   */
  async simulateReading(page: Page, duration: number = 3000): Promise<void> {
    const endTime = Date.now() + duration;
    const viewport = page.viewport();
    if (!viewport) {
      return;
    }

    while (Date.now() < endTime) {
      // Random position within viewport
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;

      await this.humanMouseMove(page, x, y, { steps: 5, duration: 200 });
      await randomDelay(200, 800);
    }

    logger.debug(`Simulated reading for ${duration}ms`);
  }

  /**
   * Inject behavioral helpers into page context
   */
  async injectHelpers(page: Page): Promise<void> {
    // Store mouse position in page context
    await page.evaluateOnNewDocument(() => {
      (window as any).lastMouseX = 0;
      (window as any).lastMouseY = 0;

      document.addEventListener('mousemove', (e) => {
        (window as any).lastMouseX = e.clientX;
        (window as any).lastMouseY = e.clientY;
      });
    });

    logger.debug('Behavioral helpers injected into page');
  }

  /**
   * Get module name
   */
  getName(): string {
    return 'BehavioralSimulation';
  }
}
