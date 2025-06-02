/*
 * Optional: configure or set up a testing framework before each test
 * If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`
 */

/*
 * Used for __tests__/testing-library.js
 * Learn more: https://github.com/testing-library/jest-dom
 */
require("@testing-library/jest-dom");

// Polyfill for TextEncoder and TextDecoder
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Suppress Mongoose Jest warnings
process.env.SUPPRESS_JEST_WARNINGS = "true";
