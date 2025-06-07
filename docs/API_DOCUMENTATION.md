# Meeting Room Management API Documentation

## Overview

This document describes the comprehensive OpenAPI 3.0 specification that has been implemented for the Meeting Room Management API within the Digital Signage system. The API provides endpoints for managing buildings, rooms, reservations, and accessing public schedules.

## Implementation Details

### 🔧 Technology Stack

- **OpenAPI Version**: 3.0.0
- **Documentation**: Swagger UI with JSDoc annotations
- **Validation**: Zod schema validation
- **Authentication**: Session-based authentication using cookies

### 📁 File Structure

```
api/
├── swagger.ts                 # Main Swagger configuration
├── models/
│   ├── Building.ts           # Building model with Zod validation
│   ├── Room.ts              # Room model with Zod validation
│   └── Reservation.ts       # Reservation model with Zod validation
└── routes/
    ├── buildings.ts         # Building CRUD operations
    ├── rooms.ts            # Room CRUD operations
    ├── reservations.ts     # Reservation CRUD operations
    └── schedule.ts         # Public schedule and availability endpoints
```

## API Endpoints

### 🏢 Buildings API (`/api/v1/buildings`)

| Method | Endpoint | Description                   | Auth Required |
| ------ | -------- | ----------------------------- | ------------- |
| GET    | `/`      | Get all buildings (paginated) | Admin         |
| GET    | `/{id}`  | Get building by ID            | Admin         |
| POST   | `/`      | Create new building           | Admin         |
| PUT    | `/{id}`  | Update building               | Admin         |
| DELETE | `/{id}`  | Delete building               | Admin         |

**Features:**

- Pagination support (page, limit)
- Validation prevents deletion if building has rooms
- Complete CRUD operations with error handling

### 🚪 Rooms API (`/api/v1/rooms`)

| Method | Endpoint | Description                        | Auth Required |
| ------ | -------- | ---------------------------------- | ------------- |
| GET    | `/`      | Get all rooms with building filter | Admin         |
| GET    | `/{id}`  | Get room by ID                     | Admin         |
| POST   | `/`      | Create new room                    | Admin         |
| PUT    | `/{id}`  | Update room                        | Admin         |
| DELETE | `/{id}`  | Delete room                        | Admin         |

**Features:**

- Filter by building_id
- Capacity and facilities management
- Validation prevents deletion if room has reservations
- Automatic building validation

### 📅 Reservations API (`/api/v1/reservations`)

| Method | Endpoint | Description                       | Auth Required |
| ------ | -------- | --------------------------------- | ------------- |
| GET    | `/`      | Get all reservations with filters | Admin         |
| GET    | `/{id}`  | Get reservation by ID             | Admin         |
| POST   | `/`      | Create new reservation            | Admin         |
| PUT    | `/{id}`  | Update reservation                | Admin         |
| DELETE | `/{id}`  | Cancel reservation                | Admin         |

**Features:**

- Advanced filtering (room_id, building_id, date range)
- Automatic conflict detection
- Time validation (end_time > start_time)
- Comprehensive error handling

### 📋 Schedule API (`/api/v1/schedule`)

| Method | Endpoint        | Description             | Auth Required |
| ------ | --------------- | ----------------------- | ------------- |
| GET    | `/`             | Get public schedule     | None          |
| GET    | `/availability` | Check room availability | None          |

**Features:**

- Public access (no authentication required)
- Filter by room, building, or date
- Real-time availability checking
- Capacity-based filtering

## Data Models

### Building Model

```typescript
{
  _id: string(ObjectId);
  name: string(required);
  address: string(required);
  creation_date: Date;
  last_update: Date;
}
```

### Room Model

```typescript
{
  _id: string (ObjectId)
  name: string (required)
  building_id: ObjectId (required, references Building)
  capacity: number (required, min: 1)
  facilities: string[]
  creation_date: Date
  last_update: Date
}
```

### Reservation Model

```typescript
{
  _id: string (ObjectId)
  title: string (required)
  room_id: ObjectId (required, references Room)
  start_time: Date (required)
  end_time: Date (required)
  organizer: string (required)
  attendees: string[]
  agenda_meeting: string
  creation_date: Date
  last_update: Date
}
```

## Authentication & Security

### Session-Based Authentication

- Uses cookie-based sessions (`connect.sid`)
- Admin role required for all management operations
- Public endpoints available for schedule viewing

### Security Features

- Input validation with Zod schemas
- MongoDB ObjectId validation
- Conflict detection for reservations
- Referential integrity checks

## Error Handling

### Standard Error Responses

#### Validation Error (400)

```json
{
  "message": "Validation failed",
  "errors": {
    "fieldName": ["Error message"]
  }
}
```

#### Authentication Error (401)

```json
{
  "message": "User not authenticated"
}
```

#### Authorization Error (403)

```json
{
  "message": "Admin access required"
}
```

#### Not Found Error (404)

```json
{
  "message": "Resource not found"
}
```

#### Conflict Error (409)

```json
{
  "message": "Room is already booked for the requested time slot",
  "conflictingReservations": [...]
}
```

## Accessing the Documentation

### Swagger UI

- **URL**: `http://localhost:3000/docs`
- Interactive API documentation
- Try-it-out functionality
- Authentication testing

### OpenAPI Spec JSON

- **URL**: `http://localhost:3000/docs.json`
- Raw OpenAPI 3.0 specification
- Can be imported into Postman, Insomnia, etc.

## Example Usage

### Creating a Building

```bash
POST /api/v1/buildings
Content-Type: application/json

{
  "name": "Main Office Building",
  "address": "123 Business Street, City, State 12345"
}
```

### Creating a Room

```bash
POST /api/v1/rooms
Content-Type: application/json

{
  "name": "Conference Room A",
  "building_id": "507f1f77bcf86cd799439011",
  "capacity": 12,
  "facilities": ["Projector", "Whiteboard", "Video Conference"]
}
```

### Making a Reservation

```bash
POST /api/v1/reservations
Content-Type: application/json

{
  "title": "Weekly Team Meeting",
  "room_id": "507f1f77bcf86cd799439012",
  "start_time": "2024-01-15T09:00:00.000Z",
  "end_time": "2024-01-15T10:00:00.000Z",
  "organizer": "John Doe",
  "attendees": ["Jane Smith", "Bob Johnson"],
  "agenda_meeting": "Discuss quarterly goals"
}
```

### Checking Availability

```bash
GET /api/v1/schedule/availability?start_time=2024-01-15T09:00:00.000Z&end_time=2024-01-15T10:00:00.000Z&capacity_min=10
```

## Validation Rules

### Business Logic Validation

- End time must be after start time
- Building must exist before creating rooms
- Room must exist before creating reservations
- Cannot delete buildings with existing rooms
- Cannot delete rooms with existing reservations
- Automatic conflict detection for overlapping reservations

### Data Validation

- All required fields must be provided
- MongoDB ObjectIds must be valid
- Dates must be valid ISO 8601 format
- Capacity must be at least 1
- String fields are trimmed

## Pagination

All list endpoints support pagination:

### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

## Integration with Digital Signage

The Meeting Room Management API is designed to integrate seamlessly with the digital signage system:

1. **Public Schedule Display**: Use `/schedule` endpoints to display current and upcoming meetings
2. **Room Availability**: Real-time availability checking for booking interfaces
3. **Building Navigation**: Room location information for wayfinding
4. **Capacity Planning**: Room utilization analytics

## Development Notes

### Adding New Endpoints

1. Add JSDoc annotations to route handlers
2. Define request/response schemas in `swagger.ts`
3. Update this documentation
4. Test with Swagger UI

### Extending Models

1. Update Mongoose schemas
2. Update Zod validation schemas
3. Update OpenAPI schema definitions
4. Update TypeScript interfaces

## Future Enhancements

### Planned Features

- [ ] Recurring reservations
- [ ] Email notifications
- [ ] Calendar integration (iCal, Google Calendar)
- [ ] Room booking approval workflow
- [ ] Analytics and reporting endpoints
- [ ] Mobile app API extensions

### API Versioning

The current API is versioned as v1 (`/api/v1/`). Future breaking changes will be introduced in v2 while maintaining backward compatibility.

## Support

For API support and questions:

- Check the interactive documentation at `/docs`
- Review error messages for detailed validation information
- Ensure proper authentication headers are included
- Validate request payloads against the OpenAPI schema
