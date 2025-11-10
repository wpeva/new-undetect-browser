/**
 * Advanced Behavioral Simulator
 * Ultra-realistic human behavior simulation based on real statistics
 */

import { Page } from 'puppeteer';
import { logger } from '../utils/logger';
import {
  MOUSE_MOVEMENT_STATS,
  KEYBOARD_TIMING_STATS,
  READING_PATTERNS,
  SCROLLING_PATTERNS,
  CLICK_PATTERNS,
  PAGE_INTERACTION_PATTERNS,
  normalRandom,
  randomRange,
  weightedRandom,
  calculateFittsTime,
  generateBezierCurve,
} from '../utils/human-behavior-stats';

/**
 * User profile for personalized behavior
 */
interface UserProfile {
  wpmCategory: 'slow' | 'average' | 'fast' | 'expert';
  mouseSpeed: number; // multiplier
  readingSpeed: 'slow' | 'average' | 'fast';
  errorRate: number;
  sessionCount: number; // For learning effect
  fatigueLevel: number; // 0-1
  lastActivityTime: number;
}

/**
 * Advanced Behavioral Simulator Class
 */
export class AdvancedBehavioralSimulator {
  private userProfile: UserProfile;
  private sessionStartTime: number;

  constructor(profile?: Partial<UserProfile>) {
    this.userProfile = {
      wpmCategory: profile?.wpmCategory || 'average',
      mouseSpeed: profile?.mouseSpeed || 1.0,
      readingSpeed: profile?.readingSpeed || 'average',
      errorRate: profile?.errorRate || 0.02,
      sessionCount: profile?.sessionCount || 0,
      fatigueLevel: 0,
      lastActivityTime: Date.now(),
      ...profile,
    };

    this.sessionStartTime = Date.now();
    logger.info('Advanced Behavioral Simulator initialized');
  }

  /**
   * Ultra-realistic mouse movement with Fitts's Law and submovements
   */
  async moveMouseRealistically(
    page: Page,
    targetX: number,
    targetY: number,
    targetWidth: number = 100
  ): Promise<void> {
    const viewport = page.viewport();
    if (!viewport) {return;}

    // Get current mouse position (estimate from center)
    const currentX = viewport.width / 2;
    const currentY = viewport.height / 2;

    const distance = Math.sqrt(
      Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2)
    );

    // Calculate movement time using Fitts's Law
    const baseTime = calculateFittsTime(distance, targetWidth);
    const totalTime = baseTime * this.userProfile.mouseSpeed * this.getFatigueFactor();

    // Generate bezier curve with submovements
    const steps = Math.max(20, Math.floor(totalTime / 16)); // ~60fps
    let curvePoints = generateBezierCurve(
      { x: currentX, y: currentY },
      { x: targetX, y: targetY },
      steps
    );

    // Add submovements (corrections)
    curvePoints = this.addSubmovements(curvePoints, targetX, targetY);

    // Add overshoot if applicable
    if (Math.random() < MOUSE_MOVEMENT_STATS.overshoot.probability) {
      curvePoints = this.addOvershoot(curvePoints, targetX, targetY);
    }

    // Execute movement
    for (let i = 0; i < curvePoints.length; i++) {
      const point = curvePoints[i];

      // Add idle tremor
      const tremor = this.getIdleTremor();
      const x = point.x + tremor.x;
      const y = point.y + tremor.y;

      await page.mouse.move(x, y);

      // Variable timing based on velocity profile
      const progress = i / curvePoints.length;
      const velocity = this.getVelocityAtProgress(progress);
      const delay = totalTime / curvePoints.length / velocity;

      await this.delay(delay);
    }

    // Final precise positioning
    await page.mouse.move(targetX, targetY);

    this.updateActivity();
  }

  /**
   * Realistic keyboard typing with digraph latencies and errors
   */
  async typeRealistically(page: Page, selector: string, text: string): Promise<void> {
    await page.click(selector);
    await this.delay(randomRange(100, 300)); // Focus delay

    const wpmConfig = KEYBOARD_TIMING_STATS.wpm[this.userProfile.wpmCategory];
    const baseWPM = randomRange(wpmConfig.min, wpmConfig.max);
    const baseDelay = 60000 / (baseWPM * 5); // Convert WPM to ms per character

    let previousChar = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Check for typing error
      if (Math.random() < this.userProfile.errorRate * this.getFatigueFactor()) {
        await this.handleTypingError(page, char);
      }

      // Calculate delay based on digraph
      const digraph = previousChar + char;
      let delay = this.getDigraphDelay(digraph, baseDelay);

      // Apply fatigue
      delay *= this.getFatigueFactor();

      // Check for thinking pause
      if (Math.random() < KEYBOARD_TIMING_STATS.rhythm.pause.probability) {
        const pauseDuration = randomRange(
          KEYBOARD_TIMING_STATS.rhythm.pause.duration.min,
          KEYBOARD_TIMING_STATS.rhythm.pause.duration.max
        );
        await this.delay(pauseDuration);
      }

      // Type character with realistic hold time
      const holdTime = normalRandom(
        KEYBOARD_TIMING_STATS.holdTime.mean,
        KEYBOARD_TIMING_STATS.holdTime.stdDev,
        KEYBOARD_TIMING_STATS.holdTime.min,
        KEYBOARD_TIMING_STATS.holdTime.max
      );

      // @ts-expect-error - char is a string but keyboard.down/up accept KeyInput
      await page.keyboard.down(char);
      await this.delay(holdTime);
      // @ts-expect-error - char is a string but keyboard.down/up accept KeyInput
      await page.keyboard.up(char);

      await this.delay(delay);

      previousChar = char;
    }

    this.updateActivity();
  }

  /**
   * Realistic page reading simulation
   */
  async simulateReading(page: Page, duration?: number): Promise<void> {
    const readDuration = duration || randomRange(3000, 10000);
    const startTime = Date.now();

    // Get page content for realistic reading simulation
    const textElements = await page.$$('p, h1, h2, h3, h4, h5, h6, span');

    if (textElements.length === 0) {
      await this.delay(readDuration);
      return;
    }

    while (Date.now() - startTime < readDuration) {
      // Pick random text element
      const element = textElements[Math.floor(Math.random() * textElements.length)];
      const box = await element.boundingBox();

      if (!box) {continue;}

      // Simulate eye movements (saccades and fixations)
      await this.simulateEyeTracking(page, box);

      // Check for regression (reading backward)
      if (Math.random() < READING_PATTERNS.regression.probability) {
        const regressionDistance = randomRange(
          READING_PATTERNS.regression.distance.min,
          READING_PATTERNS.regression.distance.max
        );
        // Move mouse slightly backward
        await page.mouse.move(
          box.x - regressionDistance * 10,
          box.y,
          { steps: 5 }
        );
      }

      // Fixation pause
      const fixationDuration = normalRandom(
        READING_PATTERNS.fixations.duration.mean,
        READING_PATTERNS.fixations.duration.stdDev,
        READING_PATTERNS.fixations.duration.min,
        READING_PATTERNS.fixations.duration.max
      );

      await this.delay(fixationDuration);
    }

    this.updateActivity();
  }

  /**
   * Realistic scrolling with inertia and pauses
   */
  async scrollRealistically(
    page: Page,
    direction: 'down' | 'up' = 'down',
    distance?: number
  ): Promise<void> {
    // Determine scroll distance
    const distanceConfig = weightedRandom([
      { value: SCROLLING_PATTERNS.distance.short, probability: 0.40 },
      { value: SCROLLING_PATTERNS.distance.medium, probability: 0.40 },
      { value: SCROLLING_PATTERNS.distance.long, probability: 0.20 },
    ]);

    const scrollDistance = distance || randomRange(distanceConfig.min, distanceConfig.max);
    const directionMultiplier = direction === 'down' ? 1 : -1;

    // Initial velocity
    let velocity = randomRange(
      SCROLLING_PATTERNS.velocity.initial.min,
      SCROLLING_PATTERNS.velocity.initial.max
    );

    const peakVelocity = randomRange(
      SCROLLING_PATTERNS.velocity.peak.min,
      SCROLLING_PATTERNS.velocity.peak.max
    );

    let scrolled = 0;
    const acceleration = peakVelocity / 10;

    while (scrolled < scrollDistance) {
      // Accelerate to peak
      if (velocity < peakVelocity) {
        velocity = Math.min(velocity + acceleration, peakVelocity);
      } else {
        // Decelerate
        velocity *= SCROLLING_PATTERNS.velocity.deceleration;
      }

      const step = velocity / 60; // 60fps
      await page.mouse.wheel({ deltaY: step * directionMultiplier });

      scrolled += step;
      await this.delay(16); // ~60fps

      // Check for reading pause
      if (Math.random() < SCROLLING_PATTERNS.pauses.reading.probability / 100) {
        const pauseDuration = randomRange(
          SCROLLING_PATTERNS.pauses.reading.duration.min,
          SCROLLING_PATTERNS.pauses.reading.duration.max
        );
        await this.delay(pauseDuration);

        // Simulate reading during pause
        await this.simulateReading(page, pauseDuration * 0.8);
      }

      // Stop if velocity too low
      if (velocity < SCROLLING_PATTERNS.inertia.threshold) {
        break;
      }
    }

    // Direction change
    if (Math.random() < SCROLLING_PATTERNS.directionChange.probability) {
      const backDistance = randomRange(
        SCROLLING_PATTERNS.directionChange.distance.min,
        SCROLLING_PATTERNS.directionChange.distance.max
      );
      await this.delay(randomRange(500, 1500));
      await this.scrollRealistically(
        page,
        direction === 'down' ? 'up' : 'down',
        backDistance
      );
    }

    this.updateActivity();
  }

  /**
   * Realistic clicking with pre/post pauses
   */
  async clickRealistically(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Element has no bounding box: ${selector}`);
    }

    // Move to element
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;
    await this.moveMouseRealistically(page, targetX, targetY, box.width);

    // Pre-click pause (hover)
    if (Math.random() < CLICK_PATTERNS.preClickPause.probability) {
      const pauseDuration = randomRange(
        CLICK_PATTERNS.preClickPause.duration.min,
        CLICK_PATTERNS.preClickPause.duration.max
      );
      await this.delay(pauseDuration);
    }

    // Click with realistic duration
    const clickDuration = normalRandom(
      CLICK_PATTERNS.duration.mean,
      CLICK_PATTERNS.duration.stdDev,
      CLICK_PATTERNS.duration.min,
      CLICK_PATTERNS.duration.max
    );

    await page.mouse.down();
    await this.delay(clickDuration);
    await page.mouse.up();

    // Post-click pause
    if (Math.random() < CLICK_PATTERNS.postClickPause.probability) {
      const pauseDuration = randomRange(
        CLICK_PATTERNS.postClickPause.duration.min,
        CLICK_PATTERNS.postClickPause.duration.max
      );
      await this.delay(pauseDuration);
    }

    this.updateActivity();
  }

  /**
   * Realistic form filling
   */
  async fillFormRealistically(
    page: Page,
    formData: Record<string, string>
  ): Promise<void> {
    for (const [selector, value] of Object.entries(formData)) {
      // Move to field
      await this.clickRealistically(page, selector);

      // Thinking pause before typing
      if (Math.random() < PAGE_INTERACTION_PATTERNS.formFilling.thinkingPause.probability) {
        const thinkDuration = randomRange(
          PAGE_INTERACTION_PATTERNS.formFilling.thinkingPause.duration.min,
          PAGE_INTERACTION_PATTERNS.formFilling.thinkingPause.duration.max
        );
        await this.delay(thinkDuration);
      }

      // Type value
      await this.typeRealistically(page, selector, value);

      // Pause between fields
      const fieldDelay = randomRange(
        PAGE_INTERACTION_PATTERNS.formFilling.fieldToField.min,
        PAGE_INTERACTION_PATTERNS.formFilling.fieldToField.max
      );
      await this.delay(fieldDelay);
    }

    // Review before submit
    if (Math.random() < PAGE_INTERACTION_PATTERNS.formFilling.reviewBeforeSubmit.probability) {
      const reviewDuration = randomRange(
        PAGE_INTERACTION_PATTERNS.formFilling.reviewBeforeSubmit.duration.min,
        PAGE_INTERACTION_PATTERNS.formFilling.reviewBeforeSubmit.duration.max
      );
      await this.simulateReading(page, reviewDuration);
    }

    this.updateActivity();
  }

  /**
   * Private: Add submovements to mouse movement
   */
  private addSubmovements(
    points: Array<{ x: number; y: number }>,
    _targetX: number,
    _targetY: number
  ): Array<{ x: number; y: number }> {
    const { submovements } = MOUSE_MOVEMENT_STATS;
    const correctionCount = randomRange(
      submovements.correction.count.min,
      submovements.correction.count.max
    );

    // Add correction points near the end
    const correctionStart = Math.floor(points.length * 0.7);

    for (let i = 0; i < correctionCount; i++) {
      const progress = (i + 1) / (correctionCount + 1);
      const index = correctionStart + Math.floor(progress * (points.length - correctionStart));

      if (index < points.length) {
        const deviation = randomRange(5, 15);
        points[index] = {
          x: points[index].x + deviation * (Math.random() - 0.5),
          y: points[index].y + deviation * (Math.random() - 0.5),
        };
      }
    }

    return points;
  }

  /**
   * Private: Add overshoot to movement
   */
  private addOvershoot(
    points: Array<{ x: number; y: number }>,
    targetX: number,
    targetY: number
  ): Array<{ x: number; y: number }> {
    const overshootDistance = randomRange(
      MOUSE_MOVEMENT_STATS.overshoot.distance.min,
      MOUSE_MOVEMENT_STATS.overshoot.distance.max
    );

    const angle = Math.atan2(
      points[points.length - 1].y - points[points.length - 2].y,
      points[points.length - 1].x - points[points.length - 2].x
    );

    // Add overshoot point
    points.push({
      x: targetX + Math.cos(angle) * overshootDistance,
      y: targetY + Math.sin(angle) * overshootDistance,
    });

    // Add correction back to target
    const correctionSteps = 5;
    for (let i = 1; i <= correctionSteps; i++) {
      const t = i / correctionSteps;
      points.push({
        x: points[points.length - 1].x + (targetX - points[points.length - 1].x) * t,
        y: points[points.length - 1].y + (targetY - points[points.length - 1].y) * t,
      });
    }

    return points;
  }

  /**
   * Private: Get idle tremor
   */
  private getIdleTremor(): { x: number; y: number } {
    const amplitude = randomRange(
      MOUSE_MOVEMENT_STATS.idle.amplitude.min,
      MOUSE_MOVEMENT_STATS.idle.amplitude.max
    );

    return {
      x: (Math.random() - 0.5) * amplitude,
      y: (Math.random() - 0.5) * amplitude,
    };
  }

  /**
   * Private: Get velocity at progress
   */
  private getVelocityAtProgress(progress: number): number {
    const { peakPosition } = MOUSE_MOVEMENT_STATS.velocity;

    if (progress < peakPosition) {
      // Acceleration phase
      return 0.5 + (progress / peakPosition) * 0.5;
    } else {
      // Deceleration phase
      const decelerationProgress = (progress - peakPosition) / (1 - peakPosition);
      return 1.0 - decelerationProgress * 0.5;
    }
  }

  /**
   * Private: Get digraph typing delay
   */
  private getDigraphDelay(digraph: string, _baseDelay: number): number {
    const { digraphLatencies } = KEYBOARD_TIMING_STATS;

    // Check for common digraph
    if (digraphLatencies.common[digraph]) {
      return digraphLatencies.common[digraph];
    }

    // Check for same hand vs different hand
    // Simplified: assume alternating hands for now
    const config = Math.random() < 0.5
      ? digraphLatencies.sameHand
      : digraphLatencies.differentHand;

    return normalRandom(config.mean, config.stdDev);
  }

  /**
   * Private: Handle typing error
   */
  private async handleTypingError(page: Page, intendedChar: string): Promise<void> {
    const { types, correction } = KEYBOARD_TIMING_STATS.errors;

    const errorType = weightedRandom([
      { value: 'substitution', probability: types.substitution },
      { value: 'insertion', probability: types.insertion },
      { value: 'deletion', probability: types.deletion },
      { value: 'transposition', probability: types.transposition },
    ]);

    if (errorType === 'substitution') {
      // Type wrong character
      const wrongChar = String.fromCharCode(intendedChar.charCodeAt(0) + (Math.random() < 0.5 ? 1 : -1));
      await page.keyboard.type(wrongChar);

      // Correct immediately
      if (Math.random() < correction.immediate) {
        await this.delay(randomRange(100, 300));
        await page.keyboard.press('Backspace');
        await this.delay(randomRange(50, 150));
      }
    } else if (errorType === 'insertion') {
      // Type extra character
      const extraChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await page.keyboard.type(extraChar);

      if (Math.random() < correction.immediate) {
        await this.delay(randomRange(100, 300));
        await page.keyboard.press('Backspace');
      }
    }
    // deletion and transposition handled differently
  }

  /**
   * Private: Simulate eye tracking on text
   */
  private async simulateEyeTracking(page: Page, textBox: any): Promise<void> {
    const { saccades, fixations } = READING_PATTERNS;

    // Simulate saccades across text
    const numSaccades = Math.floor(textBox.width / 70); // ~7-9 characters per saccade

    for (let i = 0; i < numSaccades; i++) {
      const x = textBox.x + (i / numSaccades) * textBox.width;
      const y = textBox.y + textBox.height / 2;

      // Move mouse to simulate eye position (subtle)
      await page.mouse.move(x, y, { steps: 2 });

      // Saccade duration
      await this.delay(randomRange(saccades.duration.min, saccades.duration.max));

      // Fixation
      const fixationDuration = normalRandom(
        fixations.duration.mean,
        fixations.duration.stdDev,
        fixations.duration.min,
        fixations.duration.max
      );
      await this.delay(fixationDuration);
    }
  }

  /**
   * Private: Get fatigue factor
   */
  private getFatigueFactor(): number {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const { fatigue } = KEYBOARD_TIMING_STATS;

    if (sessionDuration < fatigue.onset) {
      return 1.0;
    }

    // Linear fatigue increase
    const fatigueProgress = Math.min(
      1.0,
      (sessionDuration - fatigue.onset) / fatigue.onset
    );

    return 1.0 + (fatigue.factor - 1.0) * fatigueProgress;
  }

  /**
   * Private: Update activity timestamp
   */
  private updateActivity(): void {
    this.userProfile.lastActivityTime = Date.now();
  }

  /**
   * Private: Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current user profile
   */
  getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<UserProfile>): void {
    this.userProfile = { ...this.userProfile, ...updates };
    logger.info('User profile updated');
  }
}

/**
 * Create advanced behavioral simulator instance
 */
export function createAdvancedBehavioralSimulator(
  profile?: Partial<UserProfile>
): AdvancedBehavioralSimulator {
  return new AdvancedBehavioralSimulator(profile);
}
