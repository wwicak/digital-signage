// Mock implementation for UserCalendarLink model used in tests
const UserCalendarLinkMock = {
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndDelete: jest.fn(),
  prototype: {
    save: jest.fn(),
    getDecryptedAccessToken: jest.fn(),
    getDecryptedRefreshToken: jest.fn(),
    isTokenExpired: jest.fn(),
  },
};

export default UserCalendarLinkMock;
