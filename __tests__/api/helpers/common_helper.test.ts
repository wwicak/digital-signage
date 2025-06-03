// @ts-nocheck
import {
  findByIdAndSend,
  findAllAndSend,
  createAndSend,
  findByIdAndUpdateAndSend,
  findByIdAndDeleteAndSend,
  parseQueryParams,
  sendSseEvent,
} from "../../../api/helpers/common_helper";
import { jest } from "@jest/globals";

// Mock mongoose module before importing anything that uses it
jest.mock("mongoose");

// Disable strict type checking for jest mocks to avoid "never" type issues
/* eslint-disable @typescript-eslint/no-explicit-any */

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Create mock models
const createMockModel = (modelName: string) => {
  const mockQuery = {
    populate: jest.fn().mockReturnThis(),
  };

  return {
    findById: jest.fn().mockReturnValue(mockQuery),
    find: jest.fn().mockReturnValue(mockQuery),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    modelName,
  };
};

const TestModel = createMockModel("TestModel");
const RefModel = createMockModel("RefModel");

// Mock document constructor
const createMockDocument = (data: any) => ({
  ...data,
  save: jest.fn(),
  populate: jest.fn(),
  toObject: jest.fn().mockReturnValue(data),
  _id: "507f1f77bcf86cd799439011",
});

describe("Common Helper Functions", () => {
  let res: any;

  beforeEach(() => {
    res = mockResponse();
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("createAndSend", () => {
    it("should create a document and send it with status 201", async () => {
      const itemData = { name: "Test Item", value: 100 };
      const savedDoc = { ...itemData, _id: "507f1f77bcf86cd799439011" };

      // Create a mock constructor
      const MockModel = jest.fn().mockImplementation((data) => ({
        save: jest.fn().mockResolvedValue(savedDoc),
      }));

      await createAndSend(MockModel as any, itemData, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedDoc);
    });

    it("should handle validation errors during creation", async () => {
      const invalidData = { value: "invalid_number" };
      const validationError = new Error("Validation failed");
      validationError.name = "ValidationError";
      (validationError as any).errors = {
        value: { message: "Invalid number" },
      };

      const MockModel = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(validationError),
      }));

      await createAndSend(MockModel as any, invalidData, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation Error",
          errors: expect.any(Object),
        })
      );
    });
  });

  describe("findByIdAndUpdateAndSend", () => {
    it("should update a document and send it", async () => {
      const updateData = { name: "Updated Item", value: 200 };
      const updatedDoc = { ...updateData, _id: "507f1f77bcf86cd799439011" };

      (TestModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedDoc);

      await findByIdAndUpdateAndSend(
        TestModel as any,
        "507f1f77bcf86cd799439011",
        updateData,
        res
      );

      expect(res.json).toHaveBeenCalledWith(updatedDoc);
    });

    it("should send 404 if document not found", async () => {
      (TestModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await findByIdAndUpdateAndSend(TestModel as any, "nonexistent", {}, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "TestModel not found",
      });
    });
  });

  describe("findByIdAndDeleteAndSend", () => {
    it("should delete a document and send success message", async () => {
      const deletedDoc = { _id: "507f1f77bcf86cd799439011", name: "Test Item" };
      (TestModel.findByIdAndDelete as jest.Mock).mockResolvedValue(deletedDoc);

      await findByIdAndDeleteAndSend(
        TestModel as any,
        "507f1f77bcf86cd799439011",
        res
      );

      expect(res.json).toHaveBeenCalledWith({
        message: "TestModel deleted successfully",
      });
    });

    it("should send 404 if document not found", async () => {
      (TestModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await findByIdAndDeleteAndSend(TestModel as any, "nonexistent", res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "TestModel not found",
      });
    });
  });

  describe("findByIdAndSend", () => {
    it("should find document by ID and send with status 200", async () => {
      const foundDoc = {
        name: "Test Item",
        value: 100,
        _id: "507f1f77bcf86cd799439011",
      };

      // Mock findById to return a promise that resolves to the document
      (TestModel.findById as jest.Mock).mockResolvedValue(foundDoc);

      await findByIdAndSend(TestModel as any, "507f1f77bcf86cd799439011", res);

      expect(res.json).toHaveBeenCalledWith(foundDoc);
    });

    it("should send 404 if document not found", async () => {
      (TestModel.findById as jest.Mock).mockResolvedValue(null);

      await findByIdAndSend(TestModel as any, "nonexistent", res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "TestModel not found",
      });
    });

    it("should find document by ID with populate and send it", async () => {
      const populatedDoc = {
        name: "Test Item",
        value: 100,
        fieldToPopulate: { data: "populated data" },
        _id: "507f1f77bcf86cd799439011",
      };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(populatedDoc),
      };

      (TestModel.findById as jest.Mock).mockReturnValue(mockQuery);

      await findByIdAndSend(
        TestModel as any,
        "507f1f77bcf86cd799439011",
        res,
        "fieldToPopulate"
      );

      expect(res.json).toHaveBeenCalledWith(populatedDoc);
    });
  });

  describe("findAllAndSend", () => {
    it("should find all documents and send them", async () => {
      const docs = [
        { name: "Item 1", value: 100 },
        { name: "Item 2", value: 200 },
      ];

      (TestModel.find as jest.Mock).mockResolvedValue(docs);

      await findAllAndSend(TestModel as any, res);

      expect(res.json).toHaveBeenCalledWith(docs);
    });

    it("should handle empty collection", async () => {
      (TestModel.find as jest.Mock).mockResolvedValue([]);

      await findAllAndSend(TestModel as any, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe("sendSseEvent", () => {
    it("should send SSE event when res has SSE headers", () => {
      const sseRes = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        getHeader: jest.fn((name: string) => "text/event-stream"),
      };

      sendSseEvent(sseRes, "test-event", { message: "test data" });

      expect(sseRes.write).toHaveBeenCalledWith(
        `event: test-event\ndata: ${JSON.stringify({
          message: "test data",
        })}\n\n`
      );
    });

    it("should log error for non-SSE response", () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const regularRes = {
        getHeader: jest.fn((name: string) => "application/json"),
      };

      sendSseEvent(regularRes, "test-event", { message: "test data" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Attempted to send SSE event on a non-SSE response object."
      );
    });
  });

  describe("parseQueryParams", () => {
    it("should parse default query params", () => {
      const query = {};
      const params = parseQueryParams(query);
      expect(params.filter).toEqual({});
      expect(params.sort).toEqual({});
      expect(params.skip).toBe(0);
      expect(params.limit).toBe(10);
    });

    it("should parse page and limit", () => {
      const query = { page: "2", limit: "5" };
      const params = parseQueryParams(query);
      expect(params.skip).toBe(5);
      expect(params.limit).toBe(5);
    });

    it("should parse ascending sort", () => {
      const query = { sort: "name:asc" };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: 1 });
    });

    it("should parse descending sort", () => {
      const query = { sort: "name:desc" };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: -1 });
    });

    it("should parse sort without direction (defaults to asc)", () => {
      const query = { sort: "name" };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: 1 });
    });

    it("should parse filter params", () => {
      const query = { name: "test", category: "A" };
      const params = parseQueryParams(query);
      expect(params.filter).toEqual({ name: "test", category: "A" });
    });

    it("should parse all parameters together", () => {
      const query = {
        page: "3",
        limit: "20",
        sort: "age:desc",
        city: "NY",
        active: "true",
      };
      const params = parseQueryParams(query);
      expect(params.filter).toEqual({ city: "NY", active: "true" });
      expect(params.sort).toEqual({ age: -1 });
      expect(params.skip).toBe(40);
      expect(params.limit).toBe(20);
    });
  });
});
