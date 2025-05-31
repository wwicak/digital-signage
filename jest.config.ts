import type { Config } from "@jest/types";

// Or use `import type { Config } from 'jest';` if you prefer
// and then type `config: Config`

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "jsdom", // or 'jsdom' for frontend tests
  modulePaths: ["<rootDir>"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      babelConfig: true, // Instruct ts-jest to use the created babel.config.js
      // tsconfig: 'tsconfig.jest.json', // Optional: if you have a separate tsconfig for jest
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
};

export default config;
