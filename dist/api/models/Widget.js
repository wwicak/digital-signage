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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetType = void 0;
var mongoose_1 = __importStar(require("mongoose"));
// Define an enum for widget types if you have specific, known types
var WidgetType;
(function (WidgetType) {
    WidgetType["ANNOUNCEMENT"] = "announcement";
    WidgetType["CONGRATS"] = "congrats";
    WidgetType["IMAGE"] = "image";
    WidgetType["LIST"] = "list";
    WidgetType["SLIDESHOW"] = "slideshow";
    WidgetType["WEATHER"] = "weather";
    WidgetType["WEB"] = "web";
    WidgetType["YOUTUBE"] = "youtube";
    WidgetType["EMPTY"] = "empty";
})(WidgetType || (exports.WidgetType = WidgetType = {}));
var WidgetSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: Object.values(WidgetType) // Use if WidgetType enum is defined
    },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    w: { type: Number, required: true, default: 1 },
    h: { type: Number, required: true, default: 1 },
    data: {
        type: mongoose_1.Schema.Types.Mixed, // Or a more specific schema based on 'type'
        required: false // Data might not be required for all widget types or at creation
    },
    creator_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User', // Ensure 'User' matches your User model name
        required: true
    }
    // creation_date and last_update will be handled by timestamps
}, {
    timestamps: { createdAt: 'creation_date', updatedAt: 'last_update' }
});
// Pre-save middleware to update `last_update` field (already handled by timestamps, but can be kept if custom logic needed)
// WidgetSchema.pre('save', function(next) {
//   if (this.isModified()) {
//     this.last_update = new Date();
//   }
//   next();
// });
var WidgetModel = mongoose_1.default.model('Widget', WidgetSchema);
exports.default = WidgetModel;
