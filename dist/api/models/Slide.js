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
var mongoose_1 = __importStar(require("mongoose"));
var SlideSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        required: true
        // enum: Object.values(SlideType) // Use if SlideType enum is defined
    },
    data: {
        type: mongoose_1.Schema.Types.Mixed, // Or a more specific schema based on 'type'
        required: true
    },
    creator_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User', // Ensure 'User' matches your User model name
        required: true
    },
    creation_date: {
        type: Date,
        default: Date.now
    },
    last_update: {
        type: Date,
        default: Date.now
    },
    duration: {
        type: Number,
        default: 10 // Default duration, e.g., 10 seconds
    },
    is_enabled: {
        type: Boolean,
        default: true
    }
    // Define other fields from original schema here
}, {
    timestamps: { createdAt: 'creation_date', updatedAt: 'last_update' }
});
// Pre-save middleware to update `last_update` field
SlideSchema.pre('save', function (next) {
    if (this.isModified()) {
        this.last_update = new Date();
    }
    next();
});
var SlideModel = mongoose_1.default.model('Slide', SlideSchema);
exports.default = SlideModel;
