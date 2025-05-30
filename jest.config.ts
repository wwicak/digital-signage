import type { InitialOptions } from "ts-jest";
import type { Config } from "@jest/types";

// Or use `import type { Config } from 'jest';` if you prefer
// and then type `config: Config`

const config: InitialOptions & Partial<Config.ProjectConfig> = {
  preset: "ts-jest",
  testEnvironment: "node", // or 'jsdom' for frontend tests
  modulePaths: ["<rootDir>"],
  moduleNameMapper: [["\\.(css|less|scss|sass)$", "identity-obj-proxy"]],
  // ts-jest specific options can go into globals:
  // globals: {
  //   'ts-jest': {
  //     tsconfig: 'tsconfig.jest.json' // if you have a specific tsconfig for jest
  //   }
  // }
};

export default config;
