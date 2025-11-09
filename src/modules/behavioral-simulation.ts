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

/**
 * Behavioral Simulation Module
 * Provides human-like mouse, keyboard, and scroll interactions
 */
export class BehavioralSimulationModule {
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 };

  /**
   * Move mouse in a human-like way using Bezier curves
   */
  async humanMouseMove(
    page: Page,
    targetX: number,
    targetY: number,
    options: MouseMoveOptions = {}
  ): Promise<void> {
    const steps = options.steps || Math.floor(Math.random() * 20) + 10;
    const duration = options.duration || Math.random() * 500 + 300;

    const startX = this.lastMousePosition.x;
    const startY = this.lastMousePosition.y;

    // Control points for Bezier curve
    const cp1x = startX + (targetX - startX) * (Math.random() * 0.5 + 0.25);
    const cp1y = startY + (targetY - startY) * (Math.random() * 0.5 + 0.25);
    const cp2x = startX + (targetX - startX) * (Math.random() * 0.5 + 0.5);
    const cp2y = startY + (targetY - startY) * (Math.random() * 0.5 + 0.5);

    const stepDelay = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      // Calculate position using cubic Bezier curve
      const x = bezierPoint(t, startX, cp1x, cp2x, targetX);
      const y = bezierPoint(t, startY, cp1y, cp2y, targetY);

      // Add subtle jitter
      const jitterX = (Math.random() - 0.5) * 2;
      const jitterY = (Math.random() - 0.5) * 2;

      await page.mouse.move(x + jitterX, y + jitterY);

      // Random micro-pauses
      if (Math.random() < 0.1) {
        await randomDelay(10, 30);
      } else {
        await randomDelay(stepDelay * 0.8, stepDelay * 1.2);
      }
    }

    this.lastMousePosition = { x: targetX, y: targetY };
    logger.debug(`Mouse moved to (${targetX}, ${targetY})`);
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
   * Type text in a human-like way
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
    const baseWPM = 50 + Math.random() * 70; // 50-120 WPM
    const baseDelay = 60000 / (baseWPM * 5); // Convert WPM to ms per character

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Occasional typing mistakes
      if (makeMistakes && Math.random() < 0.03 && i > 0) {
        // Type wrong character
        const wrongChar = String.fromCharCode(
          char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1)
        );
        await page.keyboard.type(wrongChar);
        await randomDelay(100, 200);

        // Backspace
        await page.keyboard.press('Backspace');
        await randomDelay(50, 100);
      }

      // Type the correct character
      await page.keyboard.type(char);

      // Variable typing speed
      let charDelay = baseDelay;

      // Slower at punctuation
      if ([',', '.', '!', '?', ';', ':'].includes(char)) {
        charDelay += Math.random() * 300 + 200;
      }

      // Slower after spaces (thinking)
      if (char === ' ') {
        charDelay += Math.random() * 100 + 50;
      }

      // Random "thinking" pauses
      if (Math.random() < 0.05) {
        charDelay += Math.random() * 700 + 300;
      }

      // Apply delay with variation
      await randomDelay(
        charDelay * (0.7 + Math.random() * 0.6),
        charDelay * (0.8 + Math.random() * 0.4)
      );
    }

    logger.debug(`Typed "${text}" into ${selector}`);
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
    const viewport = await page.viewport();
    if (!viewport) return;

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
