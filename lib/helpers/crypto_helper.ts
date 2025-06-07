import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For GCM, this is always 16 bytes
const TAG_LENGTH = 16; // Authentication tag length for GCM
const SALT_LENGTH = 32; // Salt length for key derivation

/**
 * Get encryption key from environment variable and derive a proper key
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for token encryption"
    );
  }

  // Use a fixed salt for key derivation to ensure consistency
  // In production, you might want to use a per-application salt
  const salt = Buffer.from("digital-signage-calendar-encryption", "utf8");

  // Derive a proper 256-bit key using PBKDF2
  return crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, "sha512");
}

/**
 * Encrypt a plain text string using AES-256-GCM
 * @param text - The plain text to encrypt
 * @returns The encrypted text as a base64 string containing IV + encrypted data + auth tag
 */
export function encrypt(text: string): string {
  if (!text) {
    return "";
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from("calendar-tokens", "utf8")); // Additional authenticated data

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine IV + encrypted data + auth tag and encode as base64
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, "hex"),
      authTag,
    ]);
    return combined.toString("base64");
  } catch (error) {
    throw new Error(
      `Encryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encryptedText - The encrypted text as a base64 string
 * @returns The decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return "";
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedText, "base64");

    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(
      IV_LENGTH,
      combined.length - TAG_LENGTH
    );

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from("calendar-tokens", "utf8")); // Same AAD used in encryption
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Check if encryption is properly configured
 * @returns boolean indicating if encryption setup is valid
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
