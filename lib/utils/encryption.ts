
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 250000;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set.');
}

/**
 * Derives a key from the master encryption key and a salt.
 * This adds an extra layer of security.
 * @param salt - The salt to use for key derivation.
 * @returns The derived key.
 */
const getKey = (salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, ITERATIONS, KEY_LENGTH, 'sha512');
};

/**
 * Encrypts a given text using AES-256-GCM.
 * @param text - The text to encrypt.
 * @returns A string containing the salt, IV, auth tag, and encrypted text, separated by colons.
 */
export const encrypt = (text: string): string => {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString('hex'),
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
};

/**
 * Decrypts a given string that was encrypted with the encrypt function.
 * @param encryptedText - The encrypted text string.
 * @returns The original decrypted text.
 */
export const decrypt = (encryptedText: string): string => {
  const [saltHex, ivHex, tagHex, encryptedHex] = encryptedText.split(':');

  if (!saltHex || !ivHex || !tagHex || !encryptedHex) {
    console.log('Invalid encrypted text format:', encryptedText);
    throw new Error('Invalid encrypted text format.');
  }

  const salt = Buffer.from(saltHex, 'hex');
  const key = getKey(salt);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
};
