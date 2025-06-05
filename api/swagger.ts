import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Meeting Room Management API",
      version: "1.0.0",
      description:
        "A comprehensive API for managing buildings, rooms, reservations, and schedules for digital signage meeting room management system.",
      contact: {
        name: "API Support",
        email: "support@digitalsignage.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api/v1",
        description: "Development server",
      },
      {
        url: "/api/v1",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description: "Session-based authentication using cookies",
        },
      },
      schemas: {
        Building: {
          type: "object",
          required: ["name", "address"],
          properties: {
            _id: {
              type: "string",
              format: "objectId",
              description: "Unique identifier for the building",
              example: "507f1f77bcf86cd799439011",
            },
            name: {
              type: "string",
              minLength: 1,
              description: "Name of the building",
              example: "Main Office Building",
            },
            address: {
              type: "string",
              minLength: 1,
              description: "Physical address of the building",
              example: "123 Business Street, City, State 12345",
            },
            creation_date: {
              type: "string",
              format: "date-time",
              description: "Date and time when the building was created",
              example: "2024-01-01T10:00:00.000Z",
            },
            last_update: {
              type: "string",
              format: "date-time",
              description: "Date and time of the last update",
              example: "2024-01-01T10:00:00.000Z",
            },
            __v: {
              type: "number",
              description: "Document version number",
              example: 0,
            },
          },
        },
        Room: {
          type: "object",
          required: ["name", "building_id", "capacity"],
          properties: {
            _id: {
              type: "string",
              format: "objectId",
              description: "Unique identifier for the room",
              example: "507f1f77bcf86cd799439012",
            },
            name: {
              type: "string",
              minLength: 1,
              description: "Name of the room",
              example: "Conference Room A",
            },
            building_id: {
              oneOf: [
                {
                  type: "string",
                  format: "objectId",
                  description: "Reference to the building ID",
                  example: "507f1f77bcf86cd799439011",
                },
                {
                  $ref: "#/components/schemas/Building",
                },
              ],
            },
            capacity: {
              type: "integer",
              minimum: 1,
              description: "Maximum number of people the room can accommodate",
              example: 12,
            },
            facilities: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of facilities available in the room",
              example: ["Projector", "Whiteboard", "Video Conference"],
            },
            creation_date: {
              type: "string",
              format: "date-time",
              description: "Date and time when the room was created",
              example: "2024-01-01T10:00:00.000Z",
            },
            last_update: {
              type: "string",
              format: "date-time",
              description: "Date and time of the last update",
              example: "2024-01-01T10:00:00.000Z",
            },
            __v: {
              type: "number",
              description: "Document version number",
              example: 0,
            },
          },
        },
        Reservation: {
          type: "object",
          required: ["title", "room_id", "start_time", "end_time", "organizer"],
          properties: {
            _id: {
              type: "string",
              format: "objectId",
              description: "Unique identifier for the reservation",
              example: "507f1f77bcf86cd799439013",
            },
            title: {
              type: "string",
              minLength: 1,
              description: "Title of the meeting/reservation",
              example: "Weekly Team Meeting",
            },
            room_id: {
              oneOf: [
                {
                  type: "string",
                  format: "objectId",
                  description: "Reference to the room ID",
                  example: "507f1f77bcf86cd799439012",
                },
                {
                  $ref: "#/components/schemas/Room",
                },
              ],
            },
            start_time: {
              type: "string",
              format: "date-time",
              description: "Start date and time of the reservation",
              example: "2024-01-15T09:00:00.000Z",
            },
            end_time: {
              type: "string",
              format: "date-time",
              description: "End date and time of the reservation",
              example: "2024-01-15T10:00:00.000Z",
            },
            organizer: {
              type: "string",
              minLength: 1,
              description: "Name of the meeting organizer",
              example: "John Doe",
            },
            attendees: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of meeting attendees",
              example: ["Jane Smith", "Bob Johnson", "Alice Wilson"],
            },
            agenda_meeting: {
              type: "string",
              description: "Meeting agenda or description",
              example: "Discuss quarterly goals and project updates",
            },
            creation_date: {
              type: "string",
              format: "date-time",
              description: "Date and time when the reservation was created",
              example: "2024-01-01T10:00:00.000Z",
            },
            last_update: {
              type: "string",
              format: "date-time",
              description: "Date and time of the last update",
              example: "2024-01-01T10:00:00.000Z",
            },
            __v: {
              type: "number",
              description: "Document version number",
              example: 0,
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
              example: "Resource not found",
            },
            error: {
              type: "string",
              description: "Detailed error information",
              example: "The requested resource could not be found",
            },
            errors: {
              type: "object",
              description: "Validation errors",
              additionalProperties: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Validation failed",
            },
            errors: {
              type: "object",
              description: "Field-specific validation errors",
              additionalProperties: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              example: {
                name: ["Building name is required"],
                address: ["Building address is required"],
              },
            },
          },
        },
        ConflictError: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Room is already booked for the requested time slot",
            },
            conflictingReservations: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Reservation",
              },
            },
            conflictingRooms: {
              type: "integer",
              example: 3,
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
              description: "Current page number",
              example: 1,
            },
            limit: {
              type: "integer",
              minimum: 1,
              description: "Number of items per page",
              example: 10,
            },
            total: {
              type: "integer",
              minimum: 0,
              description: "Total number of items",
              example: 50,
            },
            pages: {
              type: "integer",
              minimum: 0,
              description: "Total number of pages",
              example: 5,
            },
          },
        },
        BuildingsResponse: {
          type: "object",
          properties: {
            buildings: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Building",
              },
            },
            pagination: {
              $ref: "#/components/schemas/Pagination",
            },
          },
        },
        RoomsResponse: {
          type: "object",
          properties: {
            rooms: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Room",
              },
            },
            pagination: {
              $ref: "#/components/schemas/Pagination",
            },
          },
        },
        ReservationsResponse: {
          type: "object",
          properties: {
            reservations: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Reservation",
              },
            },
            pagination: {
              $ref: "#/components/schemas/Pagination",
            },
          },
        },
        ScheduleEntry: {
          type: "object",
          properties: {
            room: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "objectId",
                  example: "507f1f77bcf86cd799439012",
                },
                name: {
                  type: "string",
                  example: "Conference Room A",
                },
                capacity: {
                  type: "integer",
                  example: 12,
                },
                facilities: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  example: ["Projector", "Whiteboard"],
                },
                building: {
                  $ref: "#/components/schemas/Building",
                },
              },
            },
            reservations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "objectId",
                    example: "507f1f77bcf86cd799439013",
                  },
                  title: {
                    type: "string",
                    example: "Weekly Team Meeting",
                  },
                  start_time: {
                    type: "string",
                    format: "date-time",
                    example: "2024-01-15T09:00:00.000Z",
                  },
                  end_time: {
                    type: "string",
                    format: "date-time",
                    example: "2024-01-15T10:00:00.000Z",
                  },
                  organizer: {
                    type: "string",
                    example: "John Doe",
                  },
                  attendees: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    example: ["Jane Smith", "Bob Johnson"],
                  },
                  agenda_meeting: {
                    type: "string",
                    example: "Discuss quarterly goals",
                  },
                },
              },
            },
          },
        },
        ScheduleResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Schedule retrieved successfully",
            },
            filters: {
              type: "object",
              properties: {
                room_id: {
                  type: "string",
                  nullable: true,
                  example: null,
                },
                building_id: {
                  type: "string",
                  nullable: true,
                  example: "507f1f77bcf86cd799439011",
                },
                date: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                  example: "2024-01-15T00:00:00.000Z",
                },
              },
            },
            total_rooms: {
              type: "integer",
              example: 3,
            },
            total_reservations: {
              type: "integer",
              example: 5,
            },
            schedule: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ScheduleEntry",
              },
            },
          },
        },
        AvailabilityResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Room availability retrieved successfully",
            },
            query: {
              type: "object",
              properties: {
                building_id: {
                  type: "string",
                  nullable: true,
                  example: "507f1f77bcf86cd799439011",
                },
                start_time: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-15T09:00:00.000Z",
                },
                end_time: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-15T10:00:00.000Z",
                },
                capacity_min: {
                  type: "integer",
                  nullable: true,
                  example: 10,
                },
              },
            },
            total_rooms: {
              type: "integer",
              example: 5,
            },
            available_rooms: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Room",
              },
            },
            unavailable_rooms: {
              type: "array",
              items: {
                allOf: [
                  {
                    $ref: "#/components/schemas/Room",
                  },
                  {
                    type: "object",
                    properties: {
                      conflicting_reservations: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Reservation",
                        },
                      },
                    },
                  },
                ],
              },
            },
            availability_summary: {
              type: "object",
              properties: {
                available: {
                  type: "integer",
                  example: 2,
                },
                unavailable: {
                  type: "integer",
                  example: 3,
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        sessionAuth: [],
      },
    ],
  },
  apis: [
    "./api/routes/buildings.ts",
    "./api/routes/rooms.ts",
    "./api/routes/reservations.ts",
    "./api/routes/schedule.ts",
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCssUrl:
        "https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.0/themes/3.x/theme-outline.css",
      customSiteTitle: "Meeting Room Management API Documentation",
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true,
        filter: true,
        displayRequestDuration: true,
      },
    })
  );

  app.get("/docs.json", (req: any, res: any) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });
};

export default specs;
