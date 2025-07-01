# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Digital Signage Application Overview

This is a Next.js-based digital signage system that allows users to create and manage content displays on screens. The application uses MongoDB for data persistence and features a modular widget-based architecture.

## Development Commands

### Core Development Commands
- `bun run dev` - Start development server (prefer bun for speed)
- `bun run build` - Build production application
- `bun run build:fast` - Fast build without linting (for development)
- `bun run start` - Start production server
- `bun run type-check` - TypeScript type checking
- `bun run lint` - Run ESLint on codebase
- `bun run lint:fix` - Fix ESLint issues automatically
- `bun run test` - Run Jest tests with coverage

### Setup & Maintenance
- `bun run setup` - Initialize environment configuration
- `bun run update` - Pull latest changes, install deps, and rebuild
- `bun run seed:admin` - Create admin user
- `bun run seed:meeting-rooms` - Set up meeting room demo data
- `bun run init-feature-flags` - Initialize feature flags

## Architecture Overview

### Application Structure
- **Next.js App Router**: Uses modern App Router architecture (`app/` directory)
- **API Routes**: RESTful API endpoints in `app/api/` and legacy routes in `pages/api/`
- **Widget System**: Modular widget architecture in `widgets/` directory
- **Display Management**: Real-time display updates via Server-Sent Events (SSE)
- **Authentication**: Passport.js with local, Google OAuth, and Outlook OAuth strategies

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `widgets/` - Widget definitions with Content and Options components
- `lib/models/` - MongoDB Mongoose models with Zod schemas
- `lib/helpers/` - Business logic and utility functions
- `components/` - Reusable React components (shadcn/ui + custom)
- `hooks/` - Custom React hooks for data fetching and state management

### Widget Architecture
Each widget consists of:
- `index.ts` - Widget definition extending `base_widget`
- `src/[WidgetName]Content.tsx` - Display component for screens
- `src/[WidgetName]Options.tsx` - Configuration component for admin panel

Available widgets: announcement, congrats, image, list, media-player, meeting-room, priority-video, slideshow, weather, web, youtube

### Data Models
Core models include Display, Widget, Slide, Slideshow, User, Building, Room, Reservation with corresponding Zod schemas for validation.

### Real-time Features
- Server-Sent Events for display updates (`lib/sse_manager.ts`)
- Display heartbeat monitoring
- Automatic content refresh on displays

## Testing

The project uses Jest with separate configurations for Node.js (API/backend) and jsdom (React components) environments. Tests are organized in `__tests__/` directory with mocks in `__mocks__/`.

## Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Mongoose/MongoDB
- **Authentication**: Passport.js with multiple strategies
- **State Management**: TanStack Query for server state
- **Testing**: Jest with React Testing Library
- **Build**: Bun package manager (preferred over npm/yarn)

## Important Notes
- Always run `bun run type-check` and `bun run lint` before committing
- Widget development requires registration in `widgets/index.ts`
- API routes follow OpenAPI/Swagger documentation patterns
- The application supports multi-tenant buildings and room reservations
- Feature flags are available for gradual rollouts

# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
  gemini command:

### Examples:

**Single file analysis:**
gemini -p "@src/main.py Explain this file's purpose and structure"

Multiple files:
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

Entire directory:
gemini -p "@src/ Summarize the architecture of this codebase"

Multiple directories:
gemini -p "@src/ @tests/ Analyze test coverage for the source code"

Current directory and subdirectories:
gemini -p "@./ Give me an overview of this entire project"

# Or use --all_files flag:
gemini --all_files -p "Analyze the project structure and dependencies"

Implementation Verification Examples

Check if a feature is implemented:
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

Verify authentication implementation:
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

Check for specific patterns:
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

Verify error handling:
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

Check for rate limiting:
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

Verify caching strategy:
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

Check for specific security measures:
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

Verify test coverage for features:
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

When to Use Gemini CLI

Use gemini -p when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results