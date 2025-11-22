/**
 * Encryption Utilities
 *
 * Provides AES-256-GCM encryption for data at rest and in transit.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptOptions {
  data: string | Buffer;
  key: string | Buffer;
}

export interface EncryptResult {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(options: EncryptOptions): Promise<EncryptResult> {
  const { data, key } = options;

  // Generate random IV and salt
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key from password
  const derivedKey = crypto.pbkdf2Sync(
    typeof key === 'string' ? Buffer.from(key) : key,
    salt,
    100000,
    KEY_LENGTH,
    'sha512'
  );

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  // Encrypt data
  const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final()
  ]);

  // Get auth tag
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    salt: salt.toString('base64')
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(options: {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
  key: string | Buffer;
}): Promise<string> {
  const { encrypted, iv, tag, salt, key } = options;

  // Derive key from password
  const derivedKey = crypto.pbkdf2Sync(
    typeof key === 'string' ? Buffer.from(key) : key,
    Buffer.from(salt, 'base64'),
    100000,
    KEY_LENGTH,
    'sha512'
  );

  // Create decipher
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    derivedKey,
    Buffer.from(iv, 'base64')
  );

  // Set auth tag
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  // Decrypt data
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Generate secure random key
 */
export function generateKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcrypt');
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = require('bcrypt');
  return await bcrypt.compare(password, hash);
}

// Example usage:
/*
const masterKey = generateKey();

// Encrypt
const result = await encrypt({
  data: 'sensitive information',
  key: masterKey
});

// Decrypt
const decrypted = await decrypt({
  encrypted: result.encrypted,
  iv: result.iv,
  tag: result.tag,
  salt: result.salt,
  key: masterKey
});
*/
