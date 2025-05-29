"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var next_1 = __importDefault(require("next")); // Changed to ES6 import (ensure manual-declarations.d.ts or @types/next is appropriate)
var mongoose_1 = __importDefault(require("mongoose"));
var passport_1 = __importDefault(require("passport")); // Ensure passport is imported
var cookie_parser_1 = __importDefault(require("cookie-parser"));
var cookie_session_1 = __importDefault(require("cookie-session"));
var body_parser_1 = __importDefault(require("body-parser"));
var Keys = __importStar(require("./keys"));
var User_1 = __importDefault(require("./api/models/User")); // Import UserModel as User
var dev = Keys.ENVIRON !== 'PROD';
var app = (0, next_1.default)({ dev: dev });
var handle = app.getRequestHandler();
// eslint-disable-next-line @typescript-eslint/no-var-requires
var apiRoutes = require('./api/routes'); // Assuming apiRoutes is CommonJS, keep as require
var server = (0, express_1.default)();
server.use(function (req, res, nextFx) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    nextFx();
});
mongoose_1.default.Promise = global.Promise;
if (!Keys.SESSION_SECRET) {
    console.error("FATAL ERROR: SESSION_SECRET is not available. Application cannot start.");
    process.exit(1);
}
server.use(body_parser_1.default.urlencoded({ extended: false }));
server.use(body_parser_1.default.json());
server.use((0, cookie_parser_1.default)());
server.use((0, cookie_session_1.default)({
    secret: Keys.SESSION_SECRET,
    name: 'sessionId',
}));
// Use the directly imported and typed User model
passport_1.default.use(User_1.default.createStrategy());
passport_1.default.serializeUser(User_1.default.serializeUser());
passport_1.default.deserializeUser(User_1.default.deserializeUser());
server.use(passport_1.default.initialize());
server.use(passport_1.default.session());
server.use('/api/v1', apiRoutes);
server.use('/uploads', express_1.default.static('uploads'));
server.get('*', function (req, res) {
    return handle(req, res);
});
app
    .prepare()
    .then(function () {
    mongoose_1.default.connect(Keys.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(function () { return console.log('MongoDB connected successfully.'); })
        .catch(function (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
    server.listen(Keys.PORT, function (err) {
        if (err)
            throw err;
        console.log("> Ready on http://localhost:".concat(Keys.PORT, " in ").concat(Keys.ENVIRON, " mode"));
    });
})
    .catch(function (ex) {
    console.error('Next.js app preparation error:', ex.stack);
    process.exit(1);
});
