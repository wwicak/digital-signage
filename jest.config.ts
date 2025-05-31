import type { Config } from "@jest/types";
import type { JestConfigWithTsJest } from "ts-jest";

// Or use `import type { Config } from 'jest';` if you prefer
// and then type `config: Config`

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "jsdom", // or 'jsdom' for frontend tests
  modulePaths: ["<rootDir>"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/$1", // Added path alias for @/*
  },
  collectCoverageFrom: [
    "api/**/*.ts",
    "components/**/*.tsx",
    "widgets/**/*.ts",
    "widgets/**/*.tsx",
    "app/**/*.tsx",
    "app/**/*.ts",
    "pages/**/*.tsx",
    "pages/**/*.ts",
    "hooks/**/*.ts",
    "lib/**/*.ts",
    "helpers/**/*.ts",
    "api/helpers/**/*.ts",
    "!**/*.test.ts",
    "!**/*.test.tsx",
    "!**/__tests__/**/*",
    "!next.config.js",
    "!middleware.ts",
    "!pages/_app.tsx",
    "!pages/_document.tsx",
    "!app/layout.tsx",
    "!app/page.tsx",
    "!server.ts",
  ],
  // ts-jest specific options can go into globals:
  globals: {
    'ts-jest': {
      babelConfig: true, // or 'babel.config.js'
      // tsconfig: 'tsconfig.jest.json' // if you have a specific tsconfig for jest
    }
  }
};

export default config;
