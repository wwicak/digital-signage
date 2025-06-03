import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Configure different test environments for different file patterns
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
  projects: [
    {
      displayName: "jsdom",
      testEnvironment: "jsdom",
      testMatch: [
        "<rootDir>/__tests__/**/components/**/*.test.{js,ts,tsx}",
        "<rootDir>/__tests__/**/hooks/**/*.test.{js,ts,tsx}",
        "<rootDir>/__tests__/**/contexts/**/*.test.{js,ts,tsx}",
        "<rootDir>/__tests__/**/pages/**/*.test.{js,ts,tsx}",
        "<rootDir>/__tests__/**/app/**/*.test.{js,ts,tsx}",
        "<rootDir>/__tests__/**/widgets/**/*.test.{js,ts,tsx}",
      ],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      moduleNameMapper: {
        "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
        "^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
        "^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i":
          "<rootDir>/__mocks__/fileMock.js",
        "^@/(.*)$": "<rootDir>/$1",
        "^nanoid$": "<rootDir>/__mocks__/nanoid.js",
        "^shortid$": "<rootDir>/__mocks__/shortid.js",
      },
      transformIgnorePatterns: ["node_modules/(?!(nanoid|shortid)/)"],
      transform: {
        "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
      },
    },
    {
      displayName: "node",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/__tests__/**/api/**/*.test.{js,ts}",
        "<rootDir>/__tests__/**/helpers/**/*.test.{js,ts}",
        "<rootDir>/__tests__/**/models/**/*.test.{js,ts}",
        "<rootDir>/__tests__/**/routes/**/*.test.{js,ts}",
      ],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "^nanoid$": "<rootDir>/__mocks__/nanoid.js",
        "^shortid$": "<rootDir>/__mocks__/shortid.js",
      },
      transformIgnorePatterns: ["node_modules/(?!(nanoid|shortid)/)"],
      transform: {
        "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
      },
    },
  ],
  // Exclude utility files from test discovery
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/__tests__/utils/",
  ],
  // Transform ES modules in node_modules
  transformIgnorePatterns: ["node_modules/(?!(nanoid|shortid)/)"],
  moduleNameMapper: {
    /*
     * Handle CSS imports (with CSS modules)
     * https://jestjs.io/docs/webpack#mocking-css-modules
     */
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",

    // Handle CSS imports (without CSS modules)
    "^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",

    /*
     * Handle image imports
     * https://jestjs.io/docs/webpack#handling-static-assets
     */
    "^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i":
      "<rootDir>/__mocks__/fileMock.js",

    // Handle module aliases
    "^@/(.*)$": "<rootDir>/$1",

    // Mock problematic ES modules
    "^nanoid$": "<rootDir>/__mocks__/nanoid.js",
    "^shortid$": "<rootDir>/__mocks__/shortid.js",
  },
  // Add Babel preset for Next.js
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
