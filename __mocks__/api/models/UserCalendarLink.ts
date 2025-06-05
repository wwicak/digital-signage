export default {
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
