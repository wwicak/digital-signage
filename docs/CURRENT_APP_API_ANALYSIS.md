# Current App API Structure Analysis

## 🔍 **Current `/app/api/` Structure**

Based on the existing directories, you already have a partial App Router setup:

```
/app/api/
├── auth/
│   ├── [...nextauth]/          # NextAuth.js setup
│   ├── register/               # User registration
│   └── session/                # Session management
├── users/                      # User management endpoints
├── v1/
│   └── route.ts               # Basic v1 API endpoint
├── example-migration/          # Migration example/demo
└── example-protected/          # Protected route example
```

## 📋 **Migration Strategy: Build on Existing Structure**

Since you already have the App Router foundation, we need to:

### **Phase 1: Move Business Logic to App Router**

```
/app/api/
├── _lib/                      # 📁 CREATE: Internal business logic
│   ├── models/               # MOVE: /api/models/* → here
│   ├── helpers/              # MOVE: /api/helpers/* → here
│   ├── services/             # MOVE: /api/services/* → here
│   ├── auth/                 # MOVE: /api/auth/* → here
│   └── sse_manager.ts        # MOVE: /api/sse_manager.ts → here
├── auth/                     # ✅ KEEP: Already exists
├── users/                    # ✅ KEEP: Already exists
├── displays/                 # 📁 CREATE: New endpoint
│   ├── route.ts             # CONVERT: /pages/api/displays/index.ts
│   └── [id]/route.ts        # CONVERT: /pages/api/displays/[id].ts
├── slides/                   # 📁 CREATE: New endpoint
│   ├── route.ts             # CONVERT: /pages/api/slides/index.ts
│   └── [id]/route.ts        # CONVERT: /pages/api/slides/[id].ts
├── slideshows/               # 📁 CREATE: New endpoint
│   ├── route.ts             # CONVERT: /pages/api/slideshows/index.ts
│   └── [id]/route.ts        # CONVERT: /pages/api/slideshows/[id].ts
├── widgets/                  # 📁 CREATE: New endpoint
│   ├── route.ts             # CONVERT: /pages/api/widgets/index.ts
│   └── [id]/route.ts        # CONVERT: /pages/api/widgets/[id].ts
└── v1/                       # ✅ EXPAND: Add SSE endpoints
    ├── route.ts             # ✅ KEEP: Already exists
    └── displays/
        ├── events/route.ts  # CONVERT: /pages/api/v1/displays/events.ts
        └── [id]/
            └── events/route.ts # CONVERT: /pages/api/v1/displays/[id]/events.ts
```

## 🚀 **Implementation Plan**

### **Step 1: Create Business Logic Layer**

Create `/app/api/_lib/` and move all business logic from `/api/`:

```bash
# Create the internal library structure
mkdir -p app/api/_lib/{models,helpers,services,auth}

# Move business logic (we'll do this systematically)
# /api/models/* → /app/api/_lib/models/
# /api/helpers/* → /app/api/_lib/helpers/
# /api/services/* → /app/api/_lib/services/
# /api/auth/* → /app/api/_lib/auth/
# /api/sse_manager.ts → /app/api/_lib/sse_manager.ts
```

### **Step 2: Create Missing Endpoints**

Add the missing API endpoints that are currently in `/pages/api/`:

```bash
# Create endpoint directories
mkdir -p app/api/{displays/[id],slides/[id],slideshows/[id],widgets/[id]}
mkdir -p app/api/v1/displays/{events,[id]/events}
```

### **Step 3: Convert Pages API to App Router**

Convert each endpoint from Pages API pattern to App Router pattern.

### **Step 4: Update Import Paths**

Update all imports to use the new `/app/api/_lib/` structure.

### **Step 5: Remove Legacy Directories**

After testing, remove `/api/` and `/pages/api/` directories.

## 📝 **Next Actions**

Would you like me to start by:

1. **Moving business logic** from `/api/` to `/app/api/_lib/`
2. **Creating missing endpoints** (displays, slides, slideshows, widgets)
3. **Converting a specific endpoint** as a demonstration
4. **Examining existing App Router code** to understand current patterns

Which approach would you prefer to start with?
