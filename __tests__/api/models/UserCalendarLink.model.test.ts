import mongoose from "mongoose";
import UserCalendarLink, {
  IUserCalendarLink,
} from "../../../api/models/UserCalendarLink";
import User from "../../../api/models/User";

// Mock the crypto helper to avoid needing actual encryption in tests
jest.mock("../../../api/helpers/crypto_helper", () => ({
  encrypt: jest.fn((text: string) => `encrypted_${text}`),
  decrypt: jest.fn((encryptedText: string) =>
    encryptedText.replace("encrypted_", "")
  ),
  isEncryptionConfigured: jest.fn(() => true),
}));

describe("UserCalendarLink Model", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/test"
      );
    }
  });

  beforeEach(async () => {
    await UserCalendarLink.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("Schema Definition", () => {
    it("should create a valid UserCalendarLink document", async () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        role: "user",
      });
      await user.save();

      const calendarLink = new UserCalendarLink({
        userId: user._id,
        provider: "google",
        externalUserId: "google-user-123",
        calendarId: "primary",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
        scopes: ["calendar.readonly", "calendar.events"],
        isActive: true,
      });

      const savedLink = await calendarLink.save();

      expect(savedLink.userId).toEqual(user._id);
      expect(savedLink.provider).toBe("google");
      expect(savedLink.externalUserId).toBe("google-user-123");
      expect(savedLink.calendarId).toBe("primary");
      expect(savedLink.scopes).toEqual([
        "calendar.readonly",
        "calendar.events",
      ]);
      expect(savedLink.isActive).toBe(true);
      expect(savedLink.createdAt).toBeDefined();
      expect(savedLink.updatedAt).toBeDefined();
    });

    it("should have default values for optional fields", async () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        role: "user",
      });
      await user.save();

      const calendarLink = new UserCalendarLink({
        userId: user._id,
        provider: "outlook",
        externalUserId: "outlook-user-123",
        calendarId: "calendar-123",
        accessToken: "access-token-123",
      });

      const savedLink = await calendarLink.save();

      expect(savedLink.isActive).toBe(true);
      expect(savedLink.scopes).toEqual([]);
    });
  });

  describe("Instance Methods", () => {
    let calendarLink: IUserCalendarLink;

    beforeEach(async () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        role: "user",
      });
      await user.save();

      calendarLink = new UserCalendarLink({
        userId: user._id,
        provider: "google",
        externalUserId: "google-user-123",
        calendarId: "primary",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
        tokenExpiryDate: new Date(Date.now() + 3600000), // 1 hour from now
      });
      await calendarLink.save();
    });

    it("should decrypt access token correctly", () => {
      const decryptedToken = calendarLink.getDecryptedAccessToken();
      expect(decryptedToken).toBe("access-token-123");
    });

    it("should decrypt refresh token correctly", () => {
      const decryptedToken = calendarLink.getDecryptedRefreshToken();
      expect(decryptedToken).toBe("refresh-token-456");
    });

    it("should check if token is expired", () => {
      // Token expires in 1 hour, should not be expired
      expect(calendarLink.isTokenExpired()).toBe(false);

      // Set token to expired
      calendarLink.tokenExpiryDate = new Date(Date.now() - 3600000); // 1 hour ago
      expect(calendarLink.isTokenExpired()).toBe(true);
    });
  });
});
