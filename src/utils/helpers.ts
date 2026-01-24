import { randomBytes } from 'crypto';

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  const bytes = randomBytes(16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // Version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // Variant 10

  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Random delay helper
 */
export async function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Fixed delay helper
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random choice from array
 */
export function randomChoice<T>(array: T[]): T {
  const index = Math.floor(Math.random() * array.length);
  const result = array[index];
  if (result === undefined) {
    throw new Error('Array is empty or index out of bounds');
  }
  return result;
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random float between min and max
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Calculate Bezier curve point
 */
export function bezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
}

/**
 * Generate realistic User-Agent
 */
export function generateUserAgent(platform: 'windows' | 'mac' | 'linux' = 'windows'): string {
  const chromeVersions = ['120.0.6099.129', '120.0.6099.130', '121.0.6167.85'];
  const version = randomChoice(chromeVersions);

  const platforms = {
    windows: 'Windows NT 10.0; Win64; x64',
    mac: 'Macintosh; Intel Mac OS X 10_15_7',
    linux: 'X11; Linux x86_64',
  };

  const platformString = platforms[platform];

  return `Mozilla/5.0 (${platformString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep for ms milliseconds
 */
export const sleep = delay;
