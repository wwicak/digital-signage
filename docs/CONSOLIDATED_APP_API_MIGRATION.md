# Consolidated App Router Migration Plan

## 🎯 **Goal: Standardize Everything Under `/app/api`**

Perfect! Let's consolidate everything into a single, clean `/app/api` structure following Next.js 14+ standards.

## 📁 **Final Target Structure**

```
/app/api/
├── _lib/                     # Business logic & utilities (internal)
│   ├── models/              # Mongoose models
│   │   ├── Display.ts
│   │   ├── Slide.ts
│   │   ├── Slideshow.ts
│   │   ├── Widget.ts
│   │   ├── User.ts
│   │   ├── Building.ts
│   │   ├── Room.ts
│   │   └── Reservation.ts
│   ├── helpers/             # Business logic helpers
│   │   ├── auth_helper.ts
│   │   ├── display_helper.ts
│   │   ├── slide_helper.ts
│   │   ├── slideshow_helper.ts
│   │   ├── widget_helper.ts
│   │   └── common_helper.ts
│   ├── services/            # External API services
│   │   ├── google_calendar_service.ts
│   │   └── outlook_calendar_service.ts
│   ├── auth/                # Auth strategies
│   │   ├── google_strategy.ts
│   │   └── outlook_strategy.ts
│   └── sse_manager.ts       # SSE management
├── auth/                    # Authentication endpoints
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── register/route.ts
│   └── status/route.ts
├── displays/                # Display management
│   ├── route.ts             # GET /api/displays, POST /api/displays
│   └── [id]/
│       └── route.ts         # GET/PUT/DELETE /api/displays/[id]
├── slides/                  # Slide management
│   ├── route.ts
│   └── [id]/route.ts
├── slideshows/              # Slideshow management
│   ├── route.ts
│   └── [id]/route.ts
├── widgets/                 # Widget management
│   ├── route.ts
│   └── [id]/route.ts
└── v1/                      # Legacy API compatibility
    └── displays/
        ├── events/route.ts  # Global SSE
        └── [id]/
            └── events/route.ts  # Display-specific SSE
```

## 🔄 **Migration Steps**

### **Step 1: Create App API Structure**

```bash
# Create the new structure
mkdir -p app/api/_lib/{models,helpers,services,auth}
mkdir -p app/api/{auth/{login,logout,register,status},displays/[id],slides/[id],slideshows/[id],widgets/[id],v1/displays/{events,[id]/events}}
```

### **Step 2: Move Business Logic from `/api/` → `/app/api/_lib/`**

#### **2.1 Move Models**

```bash
# Move all models
/api/models/* → /app/api/_lib/models/
```

#### **2.2 Move Helpers**

```bash
# Move all helpers
/api/helpers/* → /app/api/_lib/helpers/
```

#### **2.3 Move Services**

```bash
# Move services
/api/services/* → /app/api/_lib/services/
```

#### **2.4 Move Auth Strategies**

```bash
# Move auth
/api/auth/* → /app/api/_lib/auth/
```

#### **2.5 Move SSE Manager**

```bash
# Move SSE manager
/api/sse_manager.ts → /app/api/_lib/sse_manager.ts
```

### **Step 3: Convert Pages API → App Router**

#### **3.1 Convert Display Routes**

```typescript
// FROM: pages/api/displays/index.ts
// TO: app/api/displays/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "../_lib/models/Display";
import { requireAuth } from "../_lib/helpers/auth_helper";
import { createWidgetsForDisplay } from "../_lib/helpers/display_helper";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const displays = await Display.find({ creator_id: user._id }).populate(
      "widgets"
    );
    return NextResponse.json(displays);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error fetching displays" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();

    // Use helpers from _lib
    const newDisplay = new Display({
      ...body,
      creator_id: user._id,
      widgets: [],
    });

    if (body.widgets?.length > 0) {
      await createWidgetsForDisplay(newDisplay, body.widgets, user._id);
    }

    const savedDisplay = await newDisplay.save();
    const populatedDisplay = await savedDisplay.populate("widgets");

    return NextResponse.json(populatedDisplay, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error creating display" },
      { status: error.status || 500 }
    );
  }
}
```

#### **3.2 Convert Individual Display Route**

```typescript
// FROM: pages/api/displays/[id].ts
// TO: app/api/displays/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "../../_lib/models/Display";
import { requireAuth } from "../../_lib/helpers/auth_helper";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const display = await Display.findOne({
      _id: params.id,
      creator_id: user._id,
    }).populate("widgets");

    if (!display) {
      return NextResponse.json(
        { message: "Display not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(display);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error fetching display" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();

    const display = await Display.findOneAndUpdate(
      { _id: params.id, creator_id: user._id },
      body,
      { new: true }
    ).populate("widgets");

    if (!display) {
      return NextResponse.json(
        { message: "Display not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(display);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error updating display" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const display = await Display.findOneAndDelete({
      _id: params.id,
      creator_id: user._id,
    });

    if (!display) {
      return NextResponse.json(
        { message: "Display not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Display deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error deleting display" },
      { status: error.status || 500 }
    );
  }
}
```

#### **3.3 Convert SSE Routes**

```typescript
// FROM: pages/api/v1/displays/events.ts
// TO: app/api/v1/displays/events/route.ts

import { NextRequest } from "next/server";
import { addClient, removeClient } from "../../../_lib/sse_manager";

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Create a mock response object for compatibility with existing SSE manager
      const res = {
        write: (data: string) => {
          controller.enqueue(encoder.encode(data));
        },
        end: () => {
          controller.close();
        },
      } as any;

      // Send initial connection event
      res.write(`event: connected\n`);
      res.write(
        `data: ${JSON.stringify({
          message: "Global display SSE connected",
        })}\n\n`
      );

      // Add client to global SSE manager
      const displayId = "global";
      addClient(displayId, res);

      // Handle cleanup when stream is cancelled
      return () => {
        removeClient(displayId, res);
      };
    },
    cancel() {
      // Cleanup handled in start() return function
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
```

### **Step 4: Update Import Paths**

#### **4.1 Update Auth Helper for App Router**

```typescript
// app/api/_lib/helpers/auth_helper.ts
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function requireAuth(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get("connect.sid");

  if (!session) {
    throw { status: 401, message: "Authentication required" };
  }

  // Existing session validation logic...
  return user;
}
```

#### **4.2 Update All Import Paths**

```typescript
// Update all files to use relative imports from _lib
import Display from "../_lib/models/Display";
import { requireAuth } from "../_lib/helpers/auth_helper";
import { createWidgetsForDisplay } from "../_lib/helpers/display_helper";
```

### **Step 5: Clean Up Old Directories**

```bash
# After successful migration and testing
rm -rf /pages/api/
rm -rf /api/
```

## 📋 **Migration Checklist**

### **Phase 1: Setup (Week 1)**

- [ ] Create `/app/api/_lib/` structure
- [ ] Move models from `/api/models/` → `/app/api/_lib/models/`
- [ ] Move helpers from `/api/helpers/` → `/app/api/_lib/helpers/`
- [ ] Move services from `/api/services/` → `/app/api/_lib/services/`
- [ ] Move auth from `/api/auth/` → `/app/api/_lib/auth/`
- [ ] Move `sse_manager.ts` → `/app/api/_lib/sse_manager.ts`

### **Phase 2: Convert API Routes (Week 2)**

- [ ] Convert displays routes
- [ ] Convert slides routes
- [ ] Convert slideshows routes
- [ ] Convert widgets routes
- [ ] Convert auth routes

### **Phase 3: Convert SSE (Week 3)**

- [ ] Convert SSE routes to Web Streams
- [ ] Adapt SSE manager for App Router
- [ ] Test real-time functionality

### **Phase 4: Testing & Cleanup (Week 4)**

- [ ] Update all import paths
- [ ] Test all API endpoints
- [ ] Update tests to use new structure
- [ ] Remove old directories
- [ ] Update documentation

## 🎯 **Benefits of This Approach**

1. **✅ Single Source of Truth** - Everything under `/app/api`
2. **✅ Clear Separation** - Routes vs business logic (`_lib` convention)
3. **✅ Next.js 14+ Standard** - App Router best practices
4. **✅ Easy Maintenance** - All API code in one place
5. **✅ Clean Architecture** - Logical organization
