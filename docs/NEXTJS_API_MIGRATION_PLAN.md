# Next.js API Migration Plan

This document outlines the comprehensive plan for migrating the existing Node.js/Express backend to a modern Next.js API architecture. The primary goal is to refactor the API into Next.js API routes while reusing as much of the existing business logic, models, and validation as possible to ensure a smooth transition and maintain feature parity.

## 1. Proposed File Structure

The new API routes will be organized within the `pages/api/` directory, following Next.js conventions. This structure will mirror the existing resource-based organization.

```
pages/
├── api/
│   ├── slideshows/
│   │   ├── [id].ts       // Handles /api/slideshows/:id (GET, PUT, DELETE)
│   │   └── index.ts      // Handles /api/slideshows (GET, POST)
│   ├── slides/
│   │   ├── [id].ts
│   │   └── index.ts
│   ├── widgets/
│   │   ├── [id].ts
│   │   └── index.ts
│   ├── users/
│   │   ├── index.ts
│   │   └── auth.ts       // For login, logout, status
│   ├── displays/
│   │   ├── [id].ts
│   │   └── index.ts
│   ├── buildings/
│   │   ├── [id].ts
│   │   └── index.ts
│   ├── rooms/
│   │   ├── [id].ts
│   │   └── index.ts
│   ├── reservations/
│   │   ├── [id].ts
│   │   └── index.ts
│   ├── schedule/
│   │   └── index.ts
│   └── calendar/
│       ├── outlook.ts    // Handles Outlook OAuth callbacks
│       └── google.ts     // Handles Google OAuth callbacks
└── ...
```

## 2. API Endpoint Mapping

All existing API endpoints, currently prefixed with `/api/v1`, will be mapped to the new Next.js API route files. To maintain backward compatibility during the transition, the custom server (`server.ts`) can be configured to proxy requests from the old path to the new one, or the frontend can be updated incrementally.

| Old Endpoint (Express)          | Method   | New Endpoint (Next.js) | File Path                       |
| ------------------------------- | -------- | ---------------------- | ------------------------------- |
| `GET /api/v1/slideshows`        | `GET`    | `/api/slideshows`      | `pages/api/slideshows/index.ts` |
| `POST /api/v1/slideshows`       | `POST`   | `/api/slideshows`      | `pages/api/slideshows/index.ts` |
| `GET /api/v1/slideshows/:id`    | `GET`    | `/api/slideshows/[id]` | `pages/api/slideshows/[id].ts`  |
| `PUT /api/v1/slideshows/:id`    | `PUT`    | `/api/slideshows/[id]` | `pages/api/slideshows/[id].ts`  |
| `DELETE /api/v1/slideshows/:id` | `DELETE` | `/api/slideshows/[id]` | `pages/api/slideshows/[id].ts`  |
| `GET /api/v1/slides`            | `GET`    | `/api/slides`          | `pages/api/slides/index.ts`     |
| `POST /api/v1/slides`           | `POST`   | `/api/slides`          | `pages/api/slides/index.ts`     |
| ...                             | ...      | ...                    | ...                             |

This pattern will be followed for all resources: `widgets`, `users`, `displays`, etc.

## 3. Integration Strategy

### Mongoose Models (`api/models/`)

The existing Mongoose models are well-defined and can be reused directly. A database connection utility will be created to handle connections in the serverless environment of Next.js API routes.

**`lib/mongodb.ts`** (New File)

```typescript
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
```

Each API route will then call `await dbConnect()` before executing any database operations.

### Helper Functions (`api/helpers/`)

The helper functions contain the core business logic. They are decoupled from the Express `req` and `res` objects and can be imported and used in the new API routes with minimal changes. The existing helpers for validation, data manipulation, and interaction with other services will be preserved.

## 4. Security Review and Enhancement

Security is paramount and will be addressed as follows:

- **Authentication:** `Passport.js` session-based authentication will be replaced with a modern, stateless solution suitable for serverless environments, such as `next-auth`. This will involve:
  1.  Setting up `next-auth` with a Credentials Provider to replicate the username/password strategy.
  2.  Creating a `[...nextauth].ts` file in `pages/api/auth/`.
  3.  Protecting API routes by checking the user's session using `getServerSession` from `next-auth`.
- **Authorization:** The logic of checking `creator_id` to ensure users can only access their own resources will be maintained and enforced in each API route.
- **Input Validation:** The existing `zod` schemas will be used in the new API routes to validate request bodies and parameters, ensuring data integrity and preventing injection attacks.

## 5. Handling Breaking Changes & Frontend Continuity

The migration will be performed in a way that minimizes disruption to the frontend.

- **Phased Rollout:** The new Next.js API can be deployed alongside the existing Express API. This allows for incremental testing and migration of frontend components.
- **API Gateway/Proxying:** Initially, the `server.ts` can be modified to act as a proxy, forwarding requests from the old `/api/v1/*` paths to the new `/api/*` routes. This would make the change transparent to the frontend.
- **Feature Parity:** By reusing the existing helpers and models, we ensure that the logic remains consistent, preserving all current features.
- **Environment Variables:** All configuration keys (database URI, secrets) will continue to be managed through environment variables, consistent with `keys.ts`.

## 6. Real-time Updates (SSE)

The current `sse_manager.ts` relies on a persistent server. Migrating this to a serverless context requires a different approach.

- **Strategy:** We can use a third-party service like Pusher or Ably, or implement a lightweight solution using another service (e.g., a separate simple WebSocket server or a service like Vercel's Edge Functions with streaming). A dedicated API route can be established for the frontend to connect to for SSE events.
- **Migration:** The `sendEventToDisplay` calls within the API routes will be updated to publish events to the chosen new service.

## 7. Testing Strategy

A robust testing strategy is crucial to verify the migrated API's correctness and performance.

1.  **Unit Tests:** The existing Jest tests for helper functions (`*.test.ts`) will be run to ensure business logic remains intact.
2.  **Integration Tests:** New integration tests will be written for the Next.js API routes. We can use libraries like `next-test-api-route-handler` to test the API endpoints in isolation, mocking database connections.
3.  **End-to-End (E2E) Tests:** The existing E2E tests (if any) will need to be updated to point to the new API endpoints. If none exist, a basic suite of E2E tests using a framework like Cypress or Playwright should be created to verify key user flows.
4.  **Manual QA:** A full round of manual testing will be performed on a staging environment to catch any issues not covered by automated tests. This includes testing all CRUD operations for all resources and verifying real-time updates.

By following this plan, we can methodically refactor the backend to a modern, scalable, and maintainable Next.js API while ensuring the application remains stable and fully functional throughout the process.
