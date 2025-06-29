# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run build:fast` - Fast build without linting (uses DISABLE_ESLINT_PLUGIN=true)
- `npm start` - Start production server

### Testing
- `npm test` - Run Jest tests with coverage
- Jest is configured with separate environments for browser (jsdom) and Node.js components
- Component tests use jsdom environment, API/model tests use node environment

### Code Quality
- `npm run lint` - Run ESLint with caching
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm run type-check` - Run TypeScript type checking without emitting files

### Database & Setup
- `npm run setup` - Initialize configuration using makeconf
- `npm run seed:admin` - Create admin user (uses create-admin.ts)
- `npm run seed:meeting-rooms` - Seed meeting room data
- `npm run setup:meeting-rooms` - Setup meeting rooms system
- `npm run init-feature-flags` - Initialize feature flags

### Maintenance
- `npm run update` - Git pull, install dependencies, and build

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with local, Google OAuth, and Outlook OAuth strategies
- **UI**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (@tanstack/react-query)
- **Testing**: Jest with Testing Library
- **Widget System**: GridStack for drag-and-drop layouts

### Project Structure

#### Core Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable React components organized by feature
- `lib/` - Core business logic, models, services, and utilities
- `widgets/` - Modular widget system for display content
- `hooks/` - Custom React hooks for data fetching and state management
- `pages/` - Legacy Next.js pages (being migrated to App Router)

#### Widget Architecture
The application uses a highly modular widget system:
- Each widget extends `BaseWidget` class from `widgets/base_widget.ts`
- Widgets have two main components: `Content` (display) and `Options` (admin configuration)
- Available widgets are listed in `widgets/widget_list.ts`
- Widgets support dynamic loading and real-time updates

#### API Structure
- App Router APIs in `app/api/` (new)
- Legacy APIs in `pages/api/` (being migrated)
- OpenAPI/Swagger documentation for meeting room management APIs
- RESTful endpoints for displays, slides, slideshows, widgets, users, and layouts

#### Authentication & Authorization
- Session-based authentication with multiple OAuth providers
- Role-based access control (RBAC) for admin functions
- User management with calendar integration capabilities

#### Display System
- Real-time display updates via Server-Sent Events (SSE)
- Display heartbeat monitoring and status tracking
- Layout management with GridStack for responsive widget arrangements
- Support for multiple display types and orientations

### Key Models
- `Display` - Digital signage screens with layout and widget configuration
- `Widget` - Individual content components (slideshow, weather, announcements, etc.)
- `Slide/Slideshow` - Content slides with support for images, videos, web content
- `User` - Authentication and user management
- `Layout` - Reusable widget arrangements
- `Building/Room/Reservation` - Meeting room management system

### Development Patterns
- Use TypeScript with strict mode enabled
- Zod schemas for validation alongside Mongoose models
- Custom hooks for data fetching with React Query
- Component composition with shadcn/ui base components
- Real-time updates via SSE for display synchronization

### Testing Strategy
- Unit tests for utilities and helpers
- Component tests with React Testing Library
- API integration tests with supertest
- Mocked external dependencies (MongoDB, nanoid, shortid)

### Configuration
- Environment variables via .env files
- Feature flags system for gradual rollouts
- MongoDB connection via mongoose
- Next.js configuration supports external packages and custom rewrites