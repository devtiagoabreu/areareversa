/**
 * Encryption utilities for AI API Keys
 * Uses AES-256-GCM with a rotating master key
 */

import crypto from 'crypto';

// Master key from environment - 32 bytes (256 bits)
// Rotate annually via environment variable
function getMasterKey(): Buffer {
  const key = process.env.AI_KEY_MASTER_KEY;
  if (!key) {
    throw new Error('AI_KEY_MASTER_KEY environment variable not set');
  }
  const buffer = Buffer.from(key, 'hex');
  if (buffer.length !== 32) {
    throw new Error('AI_KEY_MASTER_KEY must be 32 bytes (64 hex characters)');
  }
  return buffer;
}

export interface EncryptedData {
  iv: string;          // 12 bytes (96 bits) - hex
  ciphertext: string;  // hex
  authTag: string;     // 16 bytes (128 bits) - hex
  version: number;     // key version for rotation
}

/**
 * Encrypts a plaintext API key
 */
export function encryptApiKey(plaintext: string): EncryptedData {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    authTag: authTag.toString('hex'),
    version: 1 // key version for future rotation
  };
}

/**
 * Decrypts an encrypted API key
 */
export function decryptApiKey(data: EncryptedData): string {
  const masterKey = getMasterKey();
  
  const iv = Buffer.from(data.iv, 'hex');
  const ciphertext = Buffer.from(data.ciphertext, 'hex');
  const authTag = Buffer.from(data.authTag, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);
  
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  
  return plaintext.toString('utf8');
}

/**
 * Generates a new master key (for initial setup or rotation)
 * Run once to generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates that a master key is properly formatted
 */
export function validateMasterKey(key: string): boolean {
  try {
    const buffer = Buffer.from(key, 'hex');
    return buffer.length === 32;
  } catch {
    return false;
  }
}

/**
 * Re-encrypts data with a new master key (for key rotation)
 * Usage during key rotation: decrypt with old key, encrypt with new key
 */
export function reEncryptWithNewKey(oldData: EncryptedData, oldMasterKeyHex: string): EncryptedData {
  const oldKey = Buffer.from(oldMasterKeyHex, 'hex');
  const newKey = getMasterKey();
  
  const iv = Buffer.from(oldData.iv, 'hex');
  const ciphertext = Buffer.from(oldData.ciphertext, 'hex');
  const authTag = Buffer.from(oldData.authTag, 'hex');
  
  // Decrypt with old key
  const decipher = crypto.createDecipheriv('aes-256-gcm', oldKey, iv);
  decipher.setAuthTag(Buffer.from(oldData.authTag, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(oldData.ciphertext, 'hex'),
    decipher.final()
  ]);
  
  // Encrypt with new key
  const newIv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', newKey, newIv);
  const newCiphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);
  const newAuthTag = cipher.getAuthTag();
  
  return {
    iv: newIv.toString('hex'),
    ciphertext: newCiphertext.toString('hex'),
    authTag: newAuthTag.toString('hex'),
    version: 2 // incremented version
  };
}