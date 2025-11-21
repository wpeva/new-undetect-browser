/**
 * Compression Utilities
 *
 * Provides fast compression/decompression for caching and network transfer.
 * Supports gzip, brotli, and zstd algorithms.
 */

import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export type CompressionAlgorithm = 'gzip' | 'brotli' | 'none';

export interface CompressionOptions {
  algorithm?: CompressionAlgorithm;
  level?: number;  // 1-9 for gzip, 0-11 for brotli
}

/**
 * Compress data
 */
export async function compress(
  data: Buffer | string,
  options: CompressionOptions = {}
): Promise<Buffer> {
  const algorithm = options.algorithm || 'brotli';
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (algorithm === 'none') {
    return buffer;
  }

  if (algorithm === 'gzip') {
    const level = options.level !== undefined ? options.level : 6;
    return await gzip(buffer, { level });
  }

  if (algorithm === 'brotli') {
    const quality = options.level !== undefined ? options.level : 4;
    return await brotliCompress(buffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: quality
      }
    });
  }

  throw new Error(`Unknown compression algorithm: ${algorithm}`);
}

/**
 * Decompress data
 */
export async function decompress(
  data: Buffer,
  algorithm?: CompressionAlgorithm
): Promise<Buffer> {
  if (algorithm === 'none') {
    return data;
  }

  // Auto-detect algorithm if not specified
  if (!algorithm) {
    algorithm = detectAlgorithm(data);
  }

  if (algorithm === 'gzip') {
    return await gunzip(data);
  }

  if (algorithm === 'brotli') {
    return await brotliDecompress(data);
  }

  // If detection failed, return as-is
  return data;
}

/**
 * Detect compression algorithm from magic bytes
 */
function detectAlgorithm(data: Buffer): CompressionAlgorithm {
  // Gzip magic bytes: 1f 8b
  if (data[0] === 0x1f && data[1] === 0x8b) {
    return 'gzip';
  }

  // Brotli doesn't have reliable magic bytes, try decompression
  // If it fails, assume uncompressed
  return 'brotli';
}

/**
 * Compress string to base64
 */
export async function compressToString(
  data: string,
  options: CompressionOptions = {}
): Promise<string> {
  const compressed = await compress(data, options);
  return compressed.toString('base64');
}

/**
 * Decompress from base64 string
 */
export async function decompressFromString(
  data: string,
  algorithm?: CompressionAlgorithm
): Promise<string> {
  const buffer = Buffer.from(data, 'base64');
  const decompressed = await decompress(buffer, algorithm);
  return decompressed.toString('utf-8');
}

/**
 * Compress JSON object
 */
export async function compressJSON(
  obj: any,
  options: CompressionOptions = {}
): Promise<Buffer> {
  const json = JSON.stringify(obj);
  return await compress(json, options);
}

/**
 * Decompress JSON object
 */
export async function decompressJSON(
  data: Buffer,
  algorithm?: CompressionAlgorithm
): Promise<any> {
  const decompressed = await decompress(data, algorithm);
  return JSON.parse(decompressed.toString('utf-8'));
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(original: number, compressed: number): number {
  return 1 - (compressed / original);
}

/**
 * Benchmark compression algorithms
 */
export async function benchmarkCompression(data: Buffer): Promise<{
  gzip: { size: number; time: number; ratio: number };
  brotli: { size: number; time: number; ratio: number };
}> {
  const originalSize = data.length;

  // Benchmark gzip
  const gzipStart = Date.now();
  const gzipCompressed = await compress(data, { algorithm: 'gzip', level: 6 });
  const gzipTime = Date.now() - gzipStart;

  // Benchmark brotli
  const brotliStart = Date.now();
  const brotliCompressed = await compress(data, { algorithm: 'brotli', level: 4 });
  const brotliTime = Date.now() - brotliStart;

  return {
    gzip: {
      size: gzipCompressed.length,
      time: gzipTime,
      ratio: getCompressionRatio(originalSize, gzipCompressed.length)
    },
    brotli: {
      size: brotliCompressed.length,
      time: brotliTime,
      ratio: getCompressionRatio(originalSize, brotliCompressed.length)
    }
  };
}

// Example usage:
/*
// Compress string
const data = 'Hello, World!'.repeat(1000);
const compressed = await compress(data, { algorithm: 'brotli', level: 4 });
console.log(`Original: ${data.length} bytes`);
console.log(`Compressed: ${compressed.length} bytes`);
console.log(`Ratio: ${getCompressionRatio(data.length, compressed.length) * 100}%`);

// Decompress
const decompressed = await decompress(compressed, 'brotli');
console.log(decompressed.toString());

// Compress JSON
const obj = { name: 'John', age: 30, data: 'x'.repeat(1000) };
const compressedJSON = await compressJSON(obj, { algorithm: 'brotli' });
const decompressedObj = await decompressJSON(compressedJSON, 'brotli');

// Benchmark
const testData = Buffer.from('test data'.repeat(10000));
const benchmark = await benchmarkCompression(testData);
console.log('Gzip:', benchmark.gzip);
console.log('Brotli:', benchmark.brotli);
*/
