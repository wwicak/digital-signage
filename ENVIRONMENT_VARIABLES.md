# Environment Variables

This document describes the environment variables required for the Digital Signage application.

## Database Configuration

- `MONGODB_URI` - MongoDB connection string (required)
- `DB_NAME` - Database name (optional, defaults to database name in connection string)

## Calendar Integration Security

### ENCRYPTION_KEY

**Required for calendar integration features**

- **Purpose**: Encrypts OAuth tokens (access tokens and refresh tokens) for external calendar providers (Google Calendar, Outlook Calendar)
- **Format**: String of at least 32 characters for security
- **Usage**: Used with AES-256-GCM encryption to secure calendar API tokens at rest
- **Example**: `ENCRYPTION_KEY=your-very-secure-encryption-key-here-at-least-32-chars`

**Security Notes:**

- This key should be generated randomly and stored securely
- Never commit this key to version control
- Use different keys for different environments (development, staging, production)
- If this key is changed, existing encrypted tokens in the database will become unusable
- The key should be at least 32 characters long for adequate security

**Key Generation Example:**

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Authentication & OAuth

### Google Calendar Integration

- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required for Google Calendar integration)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (required for Google Calendar integration)
- `GOOGLE_CALLBACK_URL` - OAuth callback URL for Google authentication (optional, defaults to `/api/v1/calendar/google/callback`)

### Microsoft Outlook Integration

- `OUTLOOK_CLIENT_ID` - Microsoft OAuth client ID (required for Outlook Calendar integration)
- `OUTLOOK_CLIENT_SECRET` - Microsoft OAuth client secret (required for Outlook Calendar integration)
- `OUTLOOK_TENANT_ID` - Microsoft Azure Tenant ID (optional, defaults to 'common' for multi-tenant)
- `OUTLOOK_CALLBACK_URL` - OAuth callback URL for Outlook authentication (optional, defaults to `/api/v1/calendar/outlook/callback`)

## Session Management

- `SESSION_SECRET` - Secret key for session encryption (required)
- `SESSION_TIMEOUT` - Session timeout in milliseconds (optional, defaults to 1 hour)

## Development

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Application port (optional, defaults to 3000)

## Example .env file

```env
# Database
MONGODB_URI=mongodb://localhost:27017/digital-signage

# Calendar Integration Security
ENCRYPTION_KEY=your-secure-32-character-encryption-key-here-generated-randomly

# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Outlook Calendar OAuth
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret

# Session Security
SESSION_SECRET=your-session-secret-key

# Application
NODE_ENV=development
PORT=3000
```
