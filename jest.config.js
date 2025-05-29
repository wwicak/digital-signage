module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // or 'jsdom' for frontend tests
  modulePaths: ['<rootDir>'], // Add or ensure this line is present
  // If you have moduleNameMapper for aliases, ensure they work with TS
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  }
};
