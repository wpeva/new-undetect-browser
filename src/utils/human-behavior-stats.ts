/**
 * Real Human Behavior Statistics
 * Based on academic research and real user data
 * Sources: CHI papers, HCI research, biometric studies
 */

/**
 * Mouse Movement Statistics (Fitts's Law & Extensions)
 * Based on research: MacKenzie, I. S. (1992), Meyer et al. (1988)
 */
export const MOUSE_MOVEMENT_STATS = {
  // Fitts's Law: MT = a + b * log2(D/W + 1)
  fittsLaw: {
    a: 0, // Intercept (ms)
    b: 166, // Slope coefficient (ms)
  },

  // Submovements during mouse movement
  submovements: {
    primary: {
      proportion: 0.7, // 70% of distance in primary movement
      duration: 0.4, // 40% of total time
    },
    correction: {
      count: { min: 1, max: 4 }, // Number of corrective submovements
      proportion: 0.3, // Remaining 30% of distance
      duration: 0.6, // 60% of total time
    },
  },

  // Velocity profile (acceleration/deceleration)
  velocity: {
    peakPosition: 0.35, // Peak velocity at 35% of movement
    initialAcceleration: 2.5, // m/s²
    finalDeceleration: 3.0, // m/s²
  },

  // Overshoot and correction
  overshoot: {
    probability: 0.15, // 15% chance of overshoot
    distance: { min: 2, max: 15 }, // pixels
    correctionTime: { min: 50, max: 150 }, // ms
  },

  // Idle movement (tremor/drift)
  idle: {
    frequency: 8, // Hz (8-12 Hz physiological tremor)
    amplitude: { min: 0.5, max: 2 }, // pixels
    driftSpeed: { min: 0.1, max: 0.5 }, // pixels/second
  },

  // Bezier curve parameters for natural movement
  bezier: {
    controlPoint1: { x: 0.25, y: 0.1 }, // First control point
    controlPoint2: { x: 0.75, y: 0.9 }, // Second control point
    wobble: { min: 0, max: 10 }, // Random wobble amplitude
  },
};

/**
 * Keyboard Timing Statistics
 * Based on research: Typing biometrics, keystroke dynamics
 * Sources: Monrose & Rubin (2000), Killourhy & Maxion (2009)
 */
export const KEYBOARD_TIMING_STATS = {
  // Hold time (key down to key up)
  holdTime: {
    mean: 120, // ms
    stdDev: 30,
    min: 50,
    max: 250,
  },

  // Flight time (key up to next key down)
  flightTime: {
    mean: 180, // ms
    stdDev: 50,
    min: 50,
    max: 400,
  },

  // Digraph latencies (time between specific letter pairs)
  // Based on real typing data
  digraphLatencies: {
    // Same hand digraphs (slower)
    sameHand: {
      mean: 200,
      stdDev: 60,
    },
    // Different hand digraphs (faster)
    differentHand: {
      mean: 140,
      stdDev: 40,
    },
    // Common bigrams (faster due to muscle memory)
    common: {
      'th': 110,
      'he': 115,
      'in': 120,
      'er': 118,
      'an': 125,
      'ed': 130,
      're': 122,
      'on': 128,
      'en': 135,
      'at': 125,
      'ou': 140,
      'ng': 145,
    },
  },

  // WPM (Words Per Minute) distribution
  wpm: {
    slow: { min: 20, max: 35, probability: 0.15 },
    average: { min: 35, max: 50, probability: 0.50 },
    fast: { min: 50, max: 70, probability: 0.30 },
    expert: { min: 70, max: 100, probability: 0.05 },
  },

  // Typing errors
  errors: {
    rate: 0.02, // 2% error rate
    types: {
      substitution: 0.50, // Wrong key (50%)
      insertion: 0.20, // Extra key (20%)
      deletion: 0.20, // Missing key (20%)
      transposition: 0.10, // Swapped keys (10%)
    },
    correction: {
      immediate: 0.70, // 70% corrected immediately
      delayed: 0.20, // 20% corrected after a delay
      uncorrected: 0.10, // 10% not corrected
    },
  },

  // Fatigue effect (typing slows down over time)
  fatigue: {
    onset: 300000, // Starts after 5 minutes (ms)
    factor: 1.2, // 20% slowdown at peak fatigue
    recovery: 60000, // Recovers after 1 minute break
  },

  // Rhythm patterns (keystroke intervals)
  rhythm: {
    baseline: 150, // Base interval (ms)
    variance: 30, // Natural variance
    burst: {
      probability: 0.15, // 15% chance of burst typing
      speedup: 0.7, // 30% faster during bursts
      duration: { min: 3, max: 8 }, // Number of keystrokes in burst
    },
    pause: {
      probability: 0.10, // 10% chance of thinking pause
      duration: { min: 500, max: 2000 }, // Pause duration (ms)
    },
  },
};

/**
 * Reading Patterns (Eye Tracking Simulation)
 * Based on research: Rayner (1998), Duchowski (2007)
 */
export const READING_PATTERNS = {
  // Saccades (rapid eye movements between fixations)
  saccades: {
    duration: { min: 20, max: 40 }, // ms
    distance: {
      forward: { min: 7, max: 9 }, // characters
      backward: { min: 3, max: 5 }, // regression
    },
    velocity: 500, // degrees/second
  },

  // Fixations (pauses on text)
  fixations: {
    duration: {
      mean: 250, // ms
      stdDev: 50,
      min: 150,
      max: 500,
    },
    location: {
      optimal: 0.37, // Optimal viewing position (37% into word)
      variance: 0.15, // Variance in fixation location
    },
  },

  // Regression (moving eyes backward)
  regression: {
    probability: 0.15, // 15% of saccades are regressions
    distance: { min: 2, max: 10 }, // words
  },

  // Reading speed
  speed: {
    wordsPerMinute: {
      slow: { min: 180, max: 220 },
      average: { min: 220, max: 280 },
      fast: { min: 280, max: 350 },
    },
    variability: 0.20, // 20% speed variance
  },

  // Reading comprehension pauses
  comprehension: {
    sentenceEnd: { min: 200, max: 400 }, // Pause at sentence end
    paragraphEnd: { min: 400, max: 800 }, // Pause at paragraph end
    difficult: { multiplier: 1.5 }, // 50% longer for difficult text
  },
};

/**
 * Scrolling Patterns
 * Based on research: User scrolling behavior studies
 */
export const SCROLLING_PATTERNS = {
  // Scroll velocity
  velocity: {
    initial: { min: 100, max: 300 }, // pixels/second
    peak: { min: 500, max: 1500 },
    deceleration: 0.95, // Exponential decay factor
  },

  // Scroll distance
  distance: {
    short: { min: 50, max: 200, probability: 0.40 },
    medium: { min: 200, max: 600, probability: 0.40 },
    long: { min: 600, max: 1500, probability: 0.20 },
  },

  // Pause patterns
  pauses: {
    reading: {
      probability: 0.60, // 60% chance of pause while reading
      duration: { min: 1000, max: 5000 }, // ms
    },
    decision: {
      probability: 0.20, // 20% chance of decision pause
      duration: { min: 500, max: 2000 },
    },
  },

  // Direction changes
  directionChange: {
    probability: 0.10, // 10% chance of scrolling back up
    distance: { min: 100, max: 500 }, // pixels to scroll back
  },

  // Inertial scrolling (momentum)
  inertia: {
    enabled: true,
    friction: 0.92, // Friction coefficient
    threshold: 10, // Minimum velocity to continue (pixels/second)
  },
};

/**
 * Click Patterns
 * Based on research: Mouse click biometrics
 */
export const CLICK_PATTERNS = {
  // Click duration (mousedown to mouseup)
  duration: {
    mean: 100, // ms
    stdDev: 30,
    min: 50,
    max: 250,
  },

  // Double-click timing
  doubleClick: {
    interval: { min: 150, max: 350 }, // ms between clicks
    maxDeviation: 20, // Maximum position deviation (pixels)
  },

  // Pre-click pause (hover before click)
  preClickPause: {
    probability: 0.70, // 70% of clicks have pre-click pause
    duration: { min: 100, max: 500 }, // ms
  },

  // Post-click pause (wait after click)
  postClickPause: {
    probability: 0.60, // 60% of clicks have post-click pause
    duration: { min: 200, max: 1000 }, // ms
  },

  // Misclick (clicking wrong element)
  misclick: {
    probability: 0.02, // 2% chance of misclick
    correction: {
      delay: { min: 200, max: 500 }, // Delay before correction
      probability: 0.95, // 95% are corrected
    },
  },
};

/**
 * Attention Patterns
 * Based on research: Attention span and focus studies
 */
export const ATTENTION_PATTERNS = {
  // Focus duration before distraction
  focusDuration: {
    short: { min: 5000, max: 15000, probability: 0.20 }, // 5-15 seconds
    medium: { min: 15000, max: 60000, probability: 0.50 }, // 15-60 seconds
    long: { min: 60000, max: 300000, probability: 0.30 }, // 1-5 minutes
  },

  // Context switches (tab changes, etc.)
  contextSwitch: {
    probability: 0.05, // 5% chance per minute
    duration: { min: 2000, max: 10000 }, // Time away (ms)
  },

  // Distraction simulation
  distraction: {
    types: {
      brief: {
        probability: 0.60,
        duration: { min: 500, max: 2000 },
      },
      moderate: {
        probability: 0.30,
        duration: { min: 2000, max: 5000 },
      },
      extended: {
        probability: 0.10,
        duration: { min: 5000, max: 15000 },
      },
    },
  },

  // Fatigue over time
  fatigue: {
    onsetTime: 1800000, // 30 minutes
    effects: {
      slowerReactions: 1.3, // 30% slower
      moreErrors: 1.5, // 50% more errors
      longerPauses: 1.4, // 40% longer pauses
    },
  },
};

/**
 * Page Interaction Patterns
 * Realistic patterns for interacting with web pages
 */
export const PAGE_INTERACTION_PATTERNS = {
  // Page load behavior
  pageLoad: {
    initialPause: { min: 500, max: 1500 }, // Pause after page load
    scrollToContent: {
      probability: 0.70, // 70% scroll to main content
      delay: { min: 1000, max: 3000 },
    },
  },

  // Form filling
  formFilling: {
    fieldToField: { min: 500, max: 2000 }, // Time between fields
    thinkingPause: {
      probability: 0.30, // 30% chance of pause
      duration: { min: 1000, max: 5000 },
    },
    reviewBeforeSubmit: {
      probability: 0.80, // 80% review before submit
      duration: { min: 2000, max: 8000 },
    },
  },

  // Link clicking behavior
  linkClick: {
    hoverBefore: {
      probability: 0.80, // 80% hover before click
      duration: { min: 200, max: 800 },
    },
    readLinkText: {
      probability: 0.60, // 60% read before clicking
      duration: { min: 300, max: 1000 },
    },
  },

  // Search behavior
  search: {
    queryFormulation: { min: 2000, max: 8000 }, // Time to formulate query
    refinement: {
      probability: 0.30, // 30% refine search
      delay: { min: 3000, max: 10000 },
    },
    resultScanning: {
      perResult: { min: 500, max: 2000 }, // Time per search result
      depthVariation: 0.80, // Decreasing attention for later results
    },
  },
};

/**
 * Biometric Variance Patterns
 * Natural variance in human behavior
 */
export const BIOMETRIC_VARIANCE = {
  // Time of day effects
  timeOfDay: {
    morning: { speedFactor: 0.95, errorFactor: 1.1 }, // Slightly slower, more errors
    midday: { speedFactor: 1.0, errorFactor: 1.0 }, // Baseline
    afternoon: { speedFactor: 0.90, errorFactor: 1.2 }, // Slower, more errors (fatigue)
    evening: { speedFactor: 0.85, errorFactor: 1.3 }, // Much slower, many errors
  },

  // Individual variance
  individual: {
    speedVariance: 0.20, // ±20% from baseline
    accuracyVariance: 0.15, // ±15% error rate
    stylePreference: {
      mouseUser: 0.60, // 60% prefer mouse
      keyboardUser: 0.40, // 40% prefer keyboard
    },
  },

  // Learning effect (gets faster/more accurate over time)
  learning: {
    enabled: true,
    speedImprovement: 0.95, // Multiply by 0.95 each session (5% faster)
    errorReduction: 0.90, // Multiply by 0.90 each session (10% fewer errors)
    plateau: 10, // Number of sessions to plateau
  },
};

/**
 * Helper function: Get random value from normal distribution
 */
export function normalRandom(mean: number, stdDev: number, min?: number, max?: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  let value = mean + z0 * stdDev;

  if (min !== undefined) {value = Math.max(min, value);}
  if (max !== undefined) {value = Math.min(max, value);}

  return value;
}

/**
 * Helper function: Get random value from range
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Helper function: Pick random item from weighted distribution
 */
export function weightedRandom<T>(items: Array<{ value: T; probability: number }>): T {
  if (items.length === 0) {
    throw new Error('Items array cannot be empty');
  }

  const random = Math.random();
  let cumulative = 0;

  for (const item of items) {
    cumulative += item.probability;
    if (random < cumulative) {
      return item.value;
    }
  }

  return items[items.length - 1]!.value;
}

/**
 * Helper function: Apply Fitts's Law
 */
export function calculateFittsTime(distance: number, targetWidth: number): number {
  const { a, b } = MOUSE_MOVEMENT_STATS.fittsLaw;
  const ID = Math.log2(distance / targetWidth + 1); // Index of difficulty
  return a + b * ID;
}

/**
 * Helper function: Generate bezier curve points
 */
export function generateBezierCurve(
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps: number
): Array<{ x: number; y: number }> {
  const { controlPoint1, controlPoint2, wobble } = MOUSE_MOVEMENT_STATS.bezier;

  // Calculate control points
  const cp1 = {
    x: start.x + (end.x - start.x) * controlPoint1.x + randomRange(-wobble.max, wobble.max),
    y: start.y + (end.y - start.y) * controlPoint1.y + randomRange(-wobble.max, wobble.max),
  };

  const cp2 = {
    x: start.x + (end.x - start.x) * controlPoint2.x + randomRange(-wobble.max, wobble.max),
    y: start.y + (end.y - start.y) * controlPoint2.y + randomRange(-wobble.max, wobble.max),
  };

  // Generate curve points
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    points.push({
      x: mt3 * start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * end.x,
      y: mt3 * start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * end.y,
    });
  }

  return points;
}
