import {
  encrypt,
  decrypt,
  isEncryptionConfigured,
} from "../../../api/helpers/crypto_helper";

describe("Crypto Helper", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY =
      "test-encryption-key-for-digital-signage-calendar-tokens";
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe("isEncryptionConfigured", () => {
    it("should return true when ENCRYPTION_KEY is set", () => {
      expect(isEncryptionConfigured()).toBe(true);
    });

    it("should return false when ENCRYPTION_KEY is not set", () => {
      delete process.env.ENCRYPTION_KEY;
      expect(isEncryptionConfigured()).toBe(false);
      // Restore for other tests
      process.env.ENCRYPTION_KEY =
        "test-encryption-key-for-digital-signage-calendar-tokens";
    });
  });

  describe("encrypt", () => {
    it("should encrypt a plain text string", () => {
      const plainText = "sample-access-token-12345";
      const encrypted = encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(encrypted.length).toBeGreaterThan(0);
      // Encrypted string should be base64 encoded
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("should return empty string for empty input", () => {
      expect(encrypt("")).toBe("");
    });

    it("should produce different encrypted values for the same input (due to random IV)", () => {
      const plainText = "sample-token";
      const encrypted1 = encrypt(plainText);
      const encrypted2 = encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should throw error when ENCRYPTION_KEY is not set", () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt("test")).toThrow(
        "ENCRYPTION_KEY environment variable is required"
      );
      // Restore for other tests
      process.env.ENCRYPTION_KEY =
        "test-encryption-key-for-digital-signage-calendar-tokens";
    });
  });

  describe("decrypt", () => {
    it("should decrypt an encrypted string back to original", () => {
      const plainText = "sample-refresh-token-67890";
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it("should return empty string for empty input", () => {
      expect(decrypt("")).toBe("");
    });

    it("should handle different types of tokens", () => {
      const accessToken = "ya29.a0ARrdaM-1234567890abcdef";
      const refreshToken = "1//04567890abcdef-refresh-token";

      const encryptedAccess = encrypt(accessToken);
      const encryptedRefresh = encrypt(refreshToken);

      expect(decrypt(encryptedAccess)).toBe(accessToken);
      expect(decrypt(encryptedRefresh)).toBe(refreshToken);
    });

    it("should throw error for invalid encrypted data", () => {
      expect(() => decrypt("invalid-encrypted-data")).toThrow(
        "Decryption failed"
      );
    });

    it("should throw error when ENCRYPTION_KEY is not set", () => {
      const encrypted = encrypt("test");
      delete process.env.ENCRYPTION_KEY;
      expect(() => decrypt(encrypted)).toThrow(
        "ENCRYPTION_KEY environment variable is required"
      );
      // Restore for other tests
      process.env.ENCRYPTION_KEY =
        "test-encryption-key-for-digital-signage-calendar-tokens";
    });
  });

  describe("encrypt/decrypt round trip", () => {
    it("should handle various token formats", () => {
      const testTokens = [
        "ya29.a0ARrdaM_1234567890",
        "1//04_refresh_token_example",
        "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9",
        "simple-token-123",
        "token with spaces and special chars!@#$%^&*()",
      ];

      testTokens.forEach((token) => {
        const encrypted = encrypt(token);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(token);
      });
    });

    it("should handle unicode characters", () => {
      const unicodeToken = "token-with-unicode-🔑-characters-测试";
      const encrypted = encrypt(unicodeToken);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(unicodeToken);
    });

    it("should handle long tokens", () => {
      const longToken =
        "a".repeat(1000) + "very-long-token-" + "b".repeat(1000);
      const encrypted = encrypt(longToken);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(longToken);
    });
  });
});
