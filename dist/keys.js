"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOST_URL = exports.SESSION_SECRET = exports.MONGODB_URI = exports.ENVIRON = exports.PORT = void 0;
// import * as dotenv from 'dotenv'; // Remove this
var dotenv = require('dotenv'); // Use require
var boxen_1 = __importDefault(require("boxen"));
dotenv.config(); // Load .env file variables into process.env
// If dotenv was required, its return value from .config() might be different or not automatically typed.
// We'll assume .parsed is available, but this could be a source of runtime errors if not handled.
var configResult = dotenv.config();
var parsedDotenv = configResult.parsed || {};
var defaultPort = 3001;
exports.PORT = parseInt(process.env.PORT || parsedDotenv.PORT || String(defaultPort), 10);
exports.ENVIRON = process.env.ENVIRON || parsedDotenv.ENVIRON || 'DEV';
var mongoUri = process.env.MONGODB_URI || parsedDotenv.MONGODB_URI;
if (!mongoUri) {
    if (exports.ENVIRON === 'PROD') {
        console.error('FATAL ERROR: MONGODB_URI is not defined in a production environment.');
        process.exit(1);
    }
    else {
        console.warn('Warning: MONGODB_URI is not defined. Using default development URI: mongodb://localhost/display');
        mongoUri = 'mongodb://localhost/display';
    }
}
exports.MONGODB_URI = mongoUri;
exports.SESSION_SECRET = process.env.SESSION_SECRET || parsedDotenv.SESSION_SECRET;
if (!exports.SESSION_SECRET) {
    if (exports.ENVIRON === 'PROD') {
        console.error('FATAL ERROR: SESSION_SECRET is not defined in a production environment.');
        process.exit(1);
    }
    else {
        console.warn('Warning: SESSION_SECRET is not defined. Using a default development secret "dev-secret". THIS IS NOT SECURE FOR PRODUCTION!');
        exports.SESSION_SECRET = 'dev-secret'; // Default for non-production
    }
}
var hostUrl = process.env.SERVER_HOST || parsedDotenv.SERVER_HOST;
if (!hostUrl) {
    if (exports.ENVIRON === 'PROD') {
        console.error('FATAL ERROR: HOST_URL is not defined in a production environment. This is needed for absolute URLs.');
        process.exit(1);
    }
    else {
        var resolvedPort = exports.PORT || defaultPort;
        console.warn("Warning: HOST_URL is not defined. Defaulting to http://localhost:".concat(resolvedPort, "/ for development."));
        hostUrl = "http://localhost:".concat(resolvedPort, "/");
    }
}
exports.HOST_URL = hostUrl;
// const dotenvResult = dotenv.config(); // Already called above
if (configResult.error && !process.env.ENVIRON && exports.ENVIRON === 'DEV') {
    console.error("Welcome to digital-signage!\n\nYou have not configured your installation yet, please run the setup utility by executing:\n" +
        (0, boxen_1.default)('$   npm run setup', { padding: 1, margin: 1, borderStyle: 'double' }) // Use 'as any' for the options
    );
}
