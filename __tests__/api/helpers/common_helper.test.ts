import mongoose from "mongoose";
import {
  findByIdAndSend,
  findAllAndSend,
  createAndSend,
  findByIdAndUpdateAndSend,
  findByIdAndDeleteAndSend,
  sendSseEvent,
  parseQueryParams,
} from "../../../api/helpers/common_helper";
import { jest } from "@jest/globals";

// --- Centralized Mock Query Object ---
// This object will be returned by model static methods like findById, find, etc.
// Tests will configure the behavior of its methods (exec, populate, etc.).
const mockQueryObject = {
  exec: jest.fn(),
  populate: jest.fn(function (this: any) {
    return this;
  }), // mockReturnThis
  select: jest.fn(function (this: any) {
    return this;
  }),
  sort: jest.fn(function (this: any) {
    return this;
  }),
  lean: jest.fn(function (this: any) {
    return this;
  }),
  limit: jest.fn(function (this: any) {
    return this;
  }),
  skip: jest.fn(function (this: any) {
    return this;
  }),
  // For the specific "granular thenable" test case that is already passing
  then: jest.fn(function (this: any, onFulfilled: any, onRejected: any) {
    return this.exec().then(onFulfilled, onRejected);
  }),
};

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.write = jest.fn().mockReturnValue(res);
  res.flushHeaders = jest.fn().mockReturnValue(res);
  return res;
};

const mockModel = (modelName = "TestModel") => {
  const modelInstanceSaveResolver = jest.fn();
  const ModelConstructorMock = jest.fn((data) => ({
    ...data,
    _id: new mongoose.Types.ObjectId(),
    save: modelInstanceSaveResolver,
    populate: jest.fn(function (this: any) {
      this.execPopulate = jest.fn().mockResolvedValue(this);
      return this;
    }),
    execPopulate: jest.fn(function (this: any) {
      return Promise.resolve(this);
    }),
  }));

  Object.assign(ModelConstructorMock, {
    modelName,
    findById: jest.fn().mockReturnValue(mockQueryObject),
    find: jest.fn().mockReturnValue(mockQueryObject),
    findByIdAndUpdate: jest.fn().mockReturnValue(mockQueryObject),
    findByIdAndDelete: jest.fn().mockReturnValue(mockQueryObject),
  });

  (ModelConstructorMock as any)._mockSaveResolver = modelInstanceSaveResolver;
  (ModelConstructorMock as any).modelName = modelName;

  return ModelConstructorMock as any;
};

describe("Common Helper Functions", () => {
  let res: any;

  beforeEach(() => {
    res = mockResponse();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    // Reset all methods of the shared mockQueryObject before each test
    mockQueryObject.exec.mockReset();
    mockQueryObject.populate
      .mockReset()
      .mockImplementation(function (this: any) {
        return this;
      });
    mockQueryObject.select.mockReset().mockImplementation(function (this: any) {
      return this;
    });
    mockQueryObject.sort.mockReset().mockImplementation(function (this: any) {
      return this;
    });
    mockQueryObject.lean.mockReset().mockImplementation(function (this: any) {
      return this;
    });
    mockQueryObject.limit.mockReset().mockImplementation(function (this: any) {
      return this;
    });
    mockQueryObject.skip.mockReset().mockImplementation(function (this: any) {
      return this;
    });
    mockQueryObject.then
      .mockReset()
      .mockImplementation(function (
        this: any,
        onFulfilled: any,
        onRejected: any
      ) {
        return this.exec().then(onFulfilled, onRejected);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findByIdAndSend", () => {
    let model: any;
    const docId = new mongoose.Types.ObjectId().toString();
    const mockDoc = { _id: docId, name: "Test Doc", fieldToPopulate: null };
    const populatedDoc = {
      ...mockDoc,
      fieldToPopulate: { data: "populated data" },
    };

    beforeEach(() => {
      model = mockModel("MockedItem");
      // Ensure model.findById is reset to return the centrally managed mockQueryObject
      model.findById.mockClear().mockReturnValue(mockQueryObject);
    });

    // This test is ALREADY PASSING and uses its own specific mock setup for the query chain.
    // We leave it as is to preserve its working "granular thenable" strategy.
    it("should find a document by ID, populate, and send it", async () => {
      const populateField = "fieldToPopulate";

      const mockExecFn_specific = jest.fn().mockResolvedValue(populatedDoc);
      const queryAfterPopulate_specific = {
        exec: mockExecFn_specific,
        then: function (this: any, onFulfilled: any, onRejected: any) {
          return this.exec().then(onFulfilled, onRejected);
        },
      };
      const queryAfterFindById_specific = {
        populate: jest.fn().mockReturnValue(queryAfterPopulate_specific),
      };
      model.findById.mockReturnValue(queryAfterFindById_specific);

      await findByIdAndSend(model, docId, res, populateField);

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(queryAfterFindById_specific.populate).toHaveBeenCalledWith(
        populateField
      );
      expect(mockExecFn_specific).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(populatedDoc);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should find a document by ID without populate and send it", async () => {
      mockQueryObject.exec.mockResolvedValue(mockDoc);

      await findByIdAndSend(model, docId, res);

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(mockQueryObject.populate).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDoc);
    });

    it("should return 404 if document not found (with populate)", async () => {
      const populateField = "fieldToPopulate";
      mockQueryObject.exec.mockResolvedValue(null);

      await findByIdAndSend(model, docId, res, populateField);

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(mockQueryObject.populate).toHaveBeenCalledWith(populateField);
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "MockedItem not found",
      });
    });

    it("should return 404 if document not found (no populate)", async () => {
      mockQueryObject.exec.mockResolvedValue(null);

      await findByIdAndSend(model, docId, res);

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "MockedItem not found",
      });
    });

    it("should return 500 on database error (with populate)", async () => {
      const populateField = "fieldToPopulate";
      const dbError = new Error("DB Error");
      mockQueryObject.exec.mockRejectedValue(dbError);

      await findByIdAndSend(model, docId, res, populateField);

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(mockQueryObject.populate).toHaveBeenCalledWith(populateField);
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching data",
        error: "DB Error",
      });
    });

    it("should return 500 on database error (no populate)", async () => {
      const dbError = new Error("DB Error");
      mockQueryObject.exec.mockRejectedValue(dbError);

      await findByIdAndSend(model, docId, res);

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching data",
        error: "DB Error",
      });
    });
  });

  describe("findAllAndSend", () => {
    let model: any;
    const mockDocs = [{ name: "Doc1" }, { name: "Doc2" }];

    beforeEach(() => {
      model = mockModel("AllItems");
      model.find.mockClear().mockReturnValue(mockQueryObject); // Ensure find uses the shared query object
    });

    it("should find all documents and send them", async () => {
      mockQueryObject.exec.mockResolvedValue(mockDocs);

      await findAllAndSend(model, res, "someField", { someFilter: "value" });

      expect(model.find).toHaveBeenCalledWith({ someFilter: "value" });
      expect(mockQueryObject.populate).toHaveBeenCalledWith("someField");
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(mockDocs);
    });

    it("should find all documents without populate or queryOptions and send them", async () => {
      mockQueryObject.exec.mockResolvedValue(mockDocs);

      await findAllAndSend(model, res);

      expect(model.find).toHaveBeenCalledWith({});
      expect(mockQueryObject.populate).not.toHaveBeenCalled();
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(mockDocs);
    });

    it("should find all documents with queryOptions but no populate and send them", async () => {
      mockQueryObject.exec.mockResolvedValue(mockDocs);
      const queryOptions = { name: "SpecificName" };

      await findAllAndSend(model, res, undefined, queryOptions);

      expect(model.find).toHaveBeenCalledWith(queryOptions);
      expect(mockQueryObject.populate).not.toHaveBeenCalled();
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(mockDocs);
    });

    it("should return 500 on database error", async () => {
      const dbError = new Error("DB Error");
      mockQueryObject.exec.mockRejectedValue(dbError);

      await findAllAndSend(model, res, "someField");

      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1); // Ensure exec was called
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching data",
        error: "DB Error",
      });
    });
  });

  describe("createAndSend", () => {
    let model: any;
    const itemData = { name: "New Item", value: 100 };
    const savedItem = {
      ...itemData,
      _id: new mongoose.Types.ObjectId().toString(),
    };

    beforeEach(() => {
      model = mockModel("CreatedItem");
    });

    it("should create a document and send it with status 201", async () => {
      model._mockSaveResolver.mockResolvedValue(savedItem);

      await createAndSend(model, itemData, res);

      expect(model).toHaveBeenCalledWith(itemData);
      expect(model._mockSaveResolver).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedItem);
    });

    it("should return 400 on validation error", async () => {
      const validationError = new Error("Validation failed") as any;
      validationError.name = "ValidationError";
      validationError.errors = { name: { message: "Name is required" } };
      model._mockSaveResolver.mockRejectedValue(validationError);

      await createAndSend(model, itemData, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Validation Error",
        errors: validationError.errors,
      });
    });

    it("should return 500 on other database errors", async () => {
      model._mockSaveResolver.mockRejectedValue(new Error("DB Error"));

      await createAndSend(model, itemData, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error creating data",
        error: "DB Error",
      });
    });
  });

  describe("findByIdAndUpdateAndSend", () => {
    let model: any;
    const docId = new mongoose.Types.ObjectId().toString();
    const updateData = { name: "Updated Name" };
    const updatedDocData = { _id: docId, name: "Updated Name" };

    beforeEach(() => {
      model = mockModel("UpdatedItem");
      model.findByIdAndUpdate.mockClear().mockReturnValue(mockQueryObject);
    });

    it("should find by ID, update, populate, and send the document", async () => {
      const populatedFieldValue = { data: "populatedValue" };
      const docAfterUpdateWithPopulateMethod = {
        ...updatedDocData,
        fieldToPopulate: "someId", // Unpopulated value
        populate: jest.fn(function (this: any) {
          // Mock instance populate
          this.fieldToPopulate = populatedFieldValue; // Simulate population
          this.execPopulate = jest.fn().mockResolvedValue(this); // execPopulate after populate
          return this;
        }),
        execPopulate: jest.fn(), // Placeholder, will be defined by populate mock
      };
      mockQueryObject.exec.mockResolvedValue(docAfterUpdateWithPopulateMethod);

      await findByIdAndUpdateAndSend(
        model,
        docId,
        updateData,
        res,
        "fieldToPopulate"
      );

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(docId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(docAfterUpdateWithPopulateMethod.populate).toHaveBeenCalledWith(
        "fieldToPopulate"
      );
      expect(
        docAfterUpdateWithPopulateMethod.execPopulate
      ).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          fieldToPopulate: populatedFieldValue,
        })
      );
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should find by ID, update, and send (no populate)", async () => {
      mockQueryObject.exec.mockResolvedValue(updatedDocData);

      await findByIdAndUpdateAndSend(model, docId, updateData, res);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(docId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(updatedDocData);
    });

    it("should return 404 if document not found for update", async () => {
      mockQueryObject.exec.mockResolvedValue(null);

      await findByIdAndUpdateAndSend(model, docId, updateData, res);

      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "UpdatedItem not found",
      });
    });

    it("should return 400 on validation error during update", async () => {
      const validationError = new Error("Validation failed") as any;
      validationError.name = "ValidationError";
      validationError.errors = { name: { message: "Name is required" } };
      mockQueryObject.exec.mockRejectedValue(validationError);

      await findByIdAndUpdateAndSend(model, docId, updateData, res);

      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Validation Error",
        errors: validationError.errors,
      });
    });

    it("should return 500 on other database errors during update", async () => {
      const dbError = new Error("DB Update Error");
      mockQueryObject.exec.mockRejectedValue(dbError);

      await findByIdAndUpdateAndSend(model, docId, updateData, res);

      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error updating data",
        error: "DB Update Error",
      });
    });
  });

  describe("findByIdAndDeleteAndSend", () => {
    let model: any;
    const docId = new mongoose.Types.ObjectId().toString();
    const mockDeletedDoc = { _id: docId, name: "Deleted Doc" };

    beforeEach(() => {
      model = mockModel("DeletedItem");
      model.findByIdAndDelete.mockClear().mockReturnValue(mockQueryObject);
    });

    it("should find by ID, delete, and send success message", async () => {
      mockQueryObject.exec.mockResolvedValue(mockDeletedDoc);

      await findByIdAndDeleteAndSend(model, docId, res);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(docId);
      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        message: "DeletedItem deleted successfully",
      });
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 404 if document not found for delete", async () => {
      mockQueryObject.exec.mockResolvedValue(null);

      await findByIdAndDeleteAndSend(model, docId, res);

      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "DeletedItem not found",
      });
    });

    it("should return 500 on database error during delete", async () => {
      const dbError = new Error("DB Delete Error");
      mockQueryObject.exec.mockRejectedValue(dbError);

      await findByIdAndDeleteAndSend(model, docId, res);

      expect(mockQueryObject.exec).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error deleting data",
        error: "DB Delete Error",
      });
    });
  });

  describe("sendSseEvent", () => {
    it("should write event and data to SSE response stream", () => {
      const eventName = "testEvent";
      const eventData = { foo: "bar" };

      sendSseEvent(res, eventName, eventData);

      expect(res.write).toHaveBeenCalledWith(`event: ${eventName}\n`);
      expect(res.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(eventData)}\n\n`
      );
    });

    it("should warn if res is not a valid SSE stream (missing write)", () => {
      const invalidRes: any = { flushHeaders: jest.fn() };
      sendSseEvent(invalidRes, "testEvent", {});
      expect(console.warn).toHaveBeenCalledWith(
        "Attempted to send SSE event on a non-SSE response object."
      );
    });

    it("should warn if res is not a valid SSE stream (missing flushHeaders)", () => {
      const invalidRes: any = { write: jest.fn() };
      sendSseEvent(invalidRes, "testEvent", {});
      expect(console.warn).toHaveBeenCalledWith(
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

    it("should parse sort ascending", () => {
      const query = { sort: "name:asc" };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: 1 });
    });

    it("should parse sort descending", () => {
      const query = { sort: "name:desc" };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: -1 });
    });

    it("should parse sort without explicit direction (defaults to asc)", () => {
      const query = { sort: "name" };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: 1 });
    });

    it("should parse filter parameters", () => {
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
