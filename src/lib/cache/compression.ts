/**
 * Cache compression utilities for large objects
 */

import { Buffer } from "node:buffer";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CompressionResult {
  data: Buffer;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface DecompressionResult {
  data: string;
  wasCompressed: boolean;
}

/**
 * Compress data if it's large enough to benefit from compression
 */
export async function compressData(data: string, threshold = 1024): Promise<CompressionResult> {
  const originalSize = Buffer.byteLength(data, "utf8");

  // Don't compress small data
  if (originalSize < threshold) {
    return {
      data: Buffer.from(data, "utf8"),
      compressed: false,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }

  try {
    const compressed = await gzipAsync(data);
    const compressedSize = compressed.length;
    const compressionRatio = originalSize / compressedSize;

    return {
      data: compressed,
      compressed: true,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.warn("Compression failed, using original data:", error);
    return {
      data: Buffer.from(data, "utf8"),
      compressed: false,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }
}

/**
 * Decompress data if it was compressed
 */
export async function decompressData(data: Buffer, wasCompressed: boolean): Promise<DecompressionResult> {
  if (!wasCompressed) {
    return {
      data: data.toString("utf8"),
      wasCompressed: false,
    };
  }

  try {
    const decompressed = await gunzipAsync(data);
    return {
      data: decompressed.toString("utf8"),
      wasCompressed: true,
    };
  } catch (error) {
    console.error("Decompression failed:", error);
    throw new Error("Failed to decompress cached data");
  }
}

/**
 * Check if data should be compressed based on size
 */
export function shouldCompress(data: string, threshold = 1024): boolean {
  return Buffer.byteLength(data, "utf8") >= threshold;
}

/**
 * Get compression statistics
 */
export function getCompressionStats(originalSize: number, compressedSize: number) {
  const compressionRatio = originalSize / compressedSize;
  const spaceSaved = originalSize - compressedSize;
  const spaceSavedPercent = (spaceSaved / originalSize) * 100;

  return {
    compressionRatio: Math.round(compressionRatio * 100) / 100,
    spaceSaved,
    spaceSavedPercent: Math.round(spaceSavedPercent * 100) / 100,
  };
}
