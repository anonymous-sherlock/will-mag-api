/**
 * Cache security utilities and validation
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";

export interface SecurityConfig {
  /** Maximum key length */
  maxKeyLength: number;
  /** Allowed key characters pattern */
  keyPattern: RegExp;
  /** Maximum value size */
  maxValueSize: number;
  /** Sensitive data patterns to block */
  sensitivePatterns: RegExp[];
  /** Enable encryption for sensitive data */
  enableEncryption: boolean;
  /** Encryption key (should be from environment) */
  encryptionKey?: string;
}

export const defaultSecurityConfig: SecurityConfig = {
  maxKeyLength: 250,
  keyPattern: /^[\w:-]+$/,
  maxValueSize: 10 * 1024 * 1024, // 10MB
  sensitivePatterns: [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /credential/i,
    /auth/i,
  ],
  enableEncryption: false,
};

/**
 * Validate cache key
 */
export function validateCacheKey(key: string, config: SecurityConfig = defaultSecurityConfig): {
  valid: boolean;
  error?: string;
} {
  if (!key || typeof key !== "string") {
    return { valid: false, error: "Key must be a non-empty string" };
  }

  if (key.length > config.maxKeyLength) {
    return { valid: false, error: `Key too long (max ${config.maxKeyLength} characters)` };
  }

  if (!config.keyPattern.test(key)) {
    return { valid: false, error: "Key contains invalid characters" };
  }

  // Check for potential injection patterns
  if (key.includes("..") || key.includes("//") || key.includes("\\")) {
    return { valid: false, error: "Key contains potentially dangerous patterns" };
  }

  return { valid: true };
}

/**
 * Validate cache value
 */
export function validateCacheValue(value: any, config: SecurityConfig = defaultSecurityConfig): {
  valid: boolean;
  error?: string;
  isSensitive: boolean;
} {
  if (value === null || value === undefined) {
    return { valid: true, isSensitive: false };
  }

  const serialized = JSON.stringify(value);

  if (serialized.length > config.maxValueSize) {
    return {
      valid: false,
      error: `Value too large (max ${config.maxValueSize} bytes)`,
      isSensitive: false,
    };
  }

  // Check for sensitive data patterns
  const isSensitive = config.sensitivePatterns.some(pattern =>
    pattern.test(serialized),
  );

  return { valid: true, isSensitive };
}

/**
 * Encrypt sensitive data
 */
export function encryptSensitiveData(data: string, key: string): string {
  if (!key) {
    throw new Error("Encryption key is required");
  }

  const iv = crypto.randomBytes(16);
  const keyHash = crypto.createHash("sha256").update(key).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", keyHash, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encryptedData: string, key: string): string {
  if (!key) {
    throw new Error("Encryption key is required");
  }

  const parts = encryptedData.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];

  const keyHash = crypto.createHash("sha256").update(key).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyHash, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Sanitize cache key to prevent injection
 */
export function sanitizeCacheKey(key: string): string {
  return key
    .replace(/[^\w:-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Check if data contains sensitive information
 */
export function containsSensitiveData(data: any, patterns: RegExp[] = defaultSecurityConfig.sensitivePatterns): boolean {
  const serialized = JSON.stringify(data);
  return patterns.some(pattern => pattern.test(serialized));
}

/**
 * Generate secure cache key with hash
 */
export function generateSecureKey(prefix: string, data: any): string {
  const hash = crypto.createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .substring(0, 16);

  return `${prefix}:${hash}`;
}

/**
 * Rate limiting for cache operations
 */
export class CacheRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000, // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const record = this.requests.get(identifier);
    if (!record)
      return this.maxRequests;

    const now = Date.now();
    if (now > record.resetTime)
      return this.maxRequests;

    return Math.max(0, this.maxRequests - record.count);
  }
}
