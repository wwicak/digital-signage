import mongoose from "mongoose";
import {
  findByIdAndSend,
  findAllAndSend,
  // createAndSend, // Will add back later if needed, after fixing its specific issues
  findByIdAndUpdateAndSend,
  findByIdAndDeleteAndSend,
  sendSseEvent,
  parseQueryParams,
} from "../../../api/helpers/common_helper";

// Mock Express response object
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.write = jest.fn().mockReturnValue(res);
  res.flushHeaders = jest.fn().mockReturnValue(res);
  return res;
};

// Mock Mongoose model for general cases (findById, find, etc.)
const mockGeneralModel = (modelName = "TestModel") => {
  const modelInstance: any = {
    modelName,
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };
  return modelInstance;
};

// Helper for chained Mongoose queries like .populate().exec()
const mockQueryChain = (resolveValue: any, execRejects = false) => {
  // Removed populateRejects from params as it's not used in this new structure
  const execMock = jest.fn();
  if (execRejects) {
    execMock.mockRejectedValue(resolveValue);
  } else {
    execMock.mockResolvedValue(resolveValue);
  }

  const query: any = {
    exec: execMock, // Keep exec for direct calls if any, but await will use .then
    populate: jest.fn().mockReturnThis(), // Populate should return the same thenable query
    select: jest.fn().mockReturnThis(), // Select should also return the same thenable query
    then: function (onFulfilled: any, onRejected: any) {
      // Make the query thenable
      // Ensure execMock is called and its promise is used
      return this.exec().then(onFulfilled, onRejected);
    },
    catch: function (onRejected: any) {
      // Also add catch for completeness
      return this.exec().catch(onRejected);
    },
  };
  return query;
};

describe("Common Helper Functions", () => {
  let res: any; // This will be set by the main beforeEach
  // const testId = new mongoose.Types.ObjectId().toString(); // Defined in child describe
  // const testData = { name: 'Test Name', _id: testId }; // Defined in child describe
  // const populatedData = { ...testData, populatedField: { detail: 'Populated Detail' } }; // Defined in child describe

  beforeEach(() => {
    res = mockResponse(); // res is now consistently set here for all tests
    jest.clearAllMocks();
  });

  it("should correctly initialize and run a basic test with boilerplate", async () => {
    // made async
    expect(true).toBe(true);
    const model = mockGeneralModel("BoilerplateTestModel");
    expect(model.modelName).toBe("BoilerplateTestModel");
    const MOCK_RESPONSE_VALUE = { data: "mockData" };
    const query = mockQueryChain(MOCK_RESPONSE_VALUE);

    // Test the thenable nature
    const result = await query;
    expect(result).toBe(MOCK_RESPONSE_VALUE);
    expect(query.exec).toHaveBeenCalled(); // exec should be called by our then implementation
  });

  // Actual test suites will be added back here one by one

  // --- findByIdAndSend ---
  describe("findByIdAndSend", () => {
    const testId = new mongoose.Types.ObjectId().toString();
    const testData = { name: "Test Name", _id: testId };
    const populatedData = {
      ...testData,
      populatedField: { detail: "Populated Detail" },
    };
    // res is inherited from the parent describe's beforeEach

    // Removed local beforeEach for `res` as it's handled by the parent.

    it("should find a document by ID and send it", async () => {
      const docId = new mongoose.Types.ObjectId().toString(); // Ensure docId is defined for this test
      const mockDoc = { _id: docId, name: "Test Doc" };
      const model = mockGeneralModel("MockedItem"); // Use mockGeneralModel instead of undefined mockModel

      // Get the query object that model.findById() will return by default from mockQueryChain
      // model.findById is already a jest.fn() that returns a mockQueryChain object.
      // We need to configure the 'exec' and 'populate' on the object *that will be returned*.

      const mockQueryReturnedByFindById = mockQueryChain(mockDoc); // This creates a fresh query chain object
      // We need model.findById to return this specific object so we can spy on its methods.
      model.findById.mockReturnValue(mockQueryReturnedByFindById);

      // Now spy on the methods of the *specific object* that will be returned and used.
      const populateSpy = jest
        .spyOn(mockQueryReturnedByFindById, "populate")
        .mockReturnThis();
      const execSpy = jest
        .spyOn(mockQueryReturnedByFindById, "exec")
        .mockResolvedValue(mockDoc); // exec is already a mock, spyOn wraps it.

      // Use the res from the beforeEach in the parent describe
      await findByIdAndSend(model, docId, res);

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(populateSpy).toHaveBeenCalledWith("someField");
      expect(execSpy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDoc);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should find a document by ID, populate a field, and send it", async () => {
      const model = mockGeneralModel();
      const query = mockQueryChain(populatedData);
      model.findById.mockReturnValue(query);

      await findByIdAndSend(model, testId, res, "populatedField");

      expect(model.findById).toHaveBeenCalledWith(testId);
      expect(query.populate).toHaveBeenCalledWith("populatedField");
      expect(query.exec).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(populatedData);
    });

    it("should return 404 if document not found", async () => {
      const model = mockGeneralModel("NotFoundModel");
      const query = mockQueryChain(null); // exec resolves to null
      model.findById.mockReturnValue(query);

      await findByIdAndSend(model, testId, res);

      expect(model.findById).toHaveBeenCalledWith(testId);
      expect(query.exec).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "NotFoundModel not found",
      });
    });

    it("should return 500 on database error", async () => {
      const model = mockGeneralModel("ErrorModel");
      const error = new Error("DB Error");
      const query = mockQueryChain(error, true); // exec rejects with error
      model.findById.mockReturnValue(query);

      await findByIdAndSend(model, testId, res);

      expect(model.findById).toHaveBeenCalledWith(testId);
      expect(query.exec).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching data",
        error: error.message,
      });
    });
  });

  // --- findAllAndSend ---
  describe("findAllAndSend", () => {
    const testId = new mongoose.Types.ObjectId().toString(); // testId may not be directly used but testData might be
    const testData = { name: "Test Name", _id: testId };
    const populatedData = {
      ...testData,
      populatedField: { detail: "Populated Detail" },
    };
    // res is inherited from the parent describe's beforeEach

    it("should find all documents and send them", async () => {
      const model = mockGeneralModel();
      const query = mockQueryChain([testData]);
      model.find.mockReturnValue(query);

      await findAllAndSend(model, res);

      expect(model.find).toHaveBeenCalledWith({});
      expect(query.populate).not.toHaveBeenCalled();
      expect(query.exec).toHaveBeenCalled(); // or .then() effectively
      expect(res.json).toHaveBeenCalledWith([testData]);
    });

    it("should find all documents with query options, populate, and send", async () => {
      const model = mockGeneralModel();
      const query = mockQueryChain([populatedData]);
      model.find.mockReturnValue(query);
      const queryOptions = { someFilter: "value" };

      await findAllAndSend(model, res, "populatedField", queryOptions);

      expect(model.find).toHaveBeenCalledWith(queryOptions);
      expect(query.populate).toHaveBeenCalledWith("populatedField");
      expect(query.exec).toHaveBeenCalled(); // or .then() effectively
      expect(res.json).toHaveBeenCalledWith([populatedData]);
    });

    it("should return 500 on database error", async () => {
      const model = mockGeneralModel("ErrorAllModel");
      const error = new Error("DB All Error");
      const query = mockQueryChain(error, true); // exec rejects
      model.find.mockReturnValue(query);

      await findAllAndSend(model, res);

      expect(model.find).toHaveBeenCalledWith({});
      expect(query.exec).toHaveBeenCalled(); // or .then() effectively
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching data",
        error: error.message,
      });
    });
  });

  // --- findByIdAndUpdateAndSend ---
  describe("findByIdAndUpdateAndSend", () => {
    const testId = new mongoose.Types.ObjectId().toString();
    const updateData = { name: "Updated Name" };
    const baseUpdatedDoc = { _id: testId, ...updateData };
    const populatedUpdatedDoc = {
      ...baseUpdatedDoc,
      populatedField: { detail: "Populated Detail" },
    };
    // res is inherited from the parent describe's beforeEach

    it("should find by ID, update, and send the document (no populate)", async () => {
      const model = mockGeneralModel();
      model.findByIdAndUpdate.mockResolvedValue(baseUpdatedDoc);

      await findByIdAndUpdateAndSend(model, testId, updateData, res);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(testId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(res.json).toHaveBeenCalledWith(baseUpdatedDoc);
    });

    it("should find by ID, update, populate (older Mongoose execPopulate), and send", async () => {
      const model = mockGeneralModel();
      const docInstanceReturnedByFindByIdAndUpdate = {
        ...baseUpdatedDoc,
        populate: jest.fn().mockReturnThis(),
        execPopulate: jest.fn().mockResolvedValue(populatedUpdatedDoc),
      };
      model.findByIdAndUpdate.mockResolvedValue(
        docInstanceReturnedByFindByIdAndUpdate
      );

      await findByIdAndUpdateAndSend(
        model,
        testId,
        updateData,
        res,
        "populatedField"
      );

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(testId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(
        docInstanceReturnedByFindByIdAndUpdate.populate
      ).toHaveBeenCalledWith("populatedField");
      expect(
        docInstanceReturnedByFindByIdAndUpdate.execPopulate
      ).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(populatedUpdatedDoc);
    });

    it("should find by ID, update, populate (Mongoose 6+ style), and send", async () => {
      const model = mockGeneralModel();
      const docInstanceReturnedByFindByIdAndUpdate = {
        ...baseUpdatedDoc,
        populate: jest.fn().mockResolvedValue(populatedUpdatedDoc),
      };
      delete (docInstanceReturnedByFindByIdAndUpdate as any).execPopulate; // Simulate Mongoose 6+

      model.findByIdAndUpdate.mockResolvedValue(
        docInstanceReturnedByFindByIdAndUpdate
      );

      await findByIdAndUpdateAndSend(
        model,
        testId,
        updateData,
        res,
        "populatedField"
      );

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(testId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(
        docInstanceReturnedByFindByIdAndUpdate.populate
      ).toHaveBeenCalledWith("populatedField");
      // No execPopulate call in Mongoose 6+ path
      expect(res.json).toHaveBeenCalledWith(populatedUpdatedDoc);
    });

    it("should return 404 if document not found for update", async () => {
      const model = mockGeneralModel("UpdateNotFoundModel");
      model.findByIdAndUpdate.mockResolvedValue(null);

      await findByIdAndUpdateAndSend(model, testId, updateData, res);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(testId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "UpdateNotFoundModel not found",
      });
    });

    it("should return 400 on validation error during update", async () => {
      const model = mockGeneralModel("UpdateValidationModel");
      const validationError = {
        name: "ValidationError",
        errors: { field: "is invalid" },
      };
      model.findByIdAndUpdate.mockRejectedValue(validationError);

      await findByIdAndUpdateAndSend(model, testId, updateData, res);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(testId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Validation Error",
        errors: validationError.errors,
      });
    });

    it("should return 500 on other database error during update", async () => {
      const model = mockGeneralModel("UpdateErrorModel");
      const dbError = new Error("DB Update Error");
      model.findByIdAndUpdate.mockRejectedValue(dbError);

      await findByIdAndUpdateAndSend(model, testId, updateData, res);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(testId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error updating data",
        error: dbError.message,
      });
    });
  });

  // --- findByIdAndDeleteAndSend ---
  describe("findByIdAndDeleteAndSend", () => {
    const testId = new mongoose.Types.ObjectId().toString();
    const testData = { name: "Test Name", _id: testId }; // Sample data returned by findByIdAndDelete
    // res is inherited from the parent describe's beforeEach

    it("should find by ID, delete, and send success message", async () => {
      const model = mockGeneralModel("DeleteModel");
      model.findByIdAndDelete.mockResolvedValue(testData);

      await findByIdAndDeleteAndSend(model, testId, res);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(testId);
      expect(res.json).toHaveBeenCalledWith({
        message: "DeleteModel deleted successfully",
      });
    });

    it("should return 404 if document not found for delete", async () => {
      const model = mockGeneralModel("DeleteNotFoundModel");
      model.findByIdAndDelete.mockResolvedValue(null);

      await findByIdAndDeleteAndSend(model, testId, res);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(testId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "DeleteNotFoundModel not found",
      });
    });

    it("should return 500 on database error during delete", async () => {
      const model = mockGeneralModel("DeleteErrorModel");
      const dbError = new Error("DB Delete Error");
      model.findByIdAndDelete.mockRejectedValue(dbError);

      await findByIdAndDeleteAndSend(model, testId, res);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(testId);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error deleting data",
        error: dbError.message,
      });
    });
  });

  // --- sendSseEvent ---
  describe("sendSseEvent", () => {
    // res is inherited from the parent describe's beforeEach,
    // but we need to ensure it's freshly mocked for each test here if its state matters.
    // The parent beforeEach already does this.

    it("should write event and data to SSE response", () => {
      const eventName = "testEvent";
      const eventData = { info: "SSE Test" };
      sendSseEvent(res, eventName, eventData); // res from parent beforeEach is used

      expect(res.write).toHaveBeenCalledWith(`event: ${eventName}\n`);
      expect(res.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(eventData)}\n\n`
      );
    });

    it("should warn if response object is not SSE compatible (missing write)", () => {
      const nonSseRes: any = { flushHeaders: jest.fn() };
      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      sendSseEvent(nonSseRes, "testEvent", {});

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Attempted to send SSE event on a non-SSE response object."
      );
      consoleWarnSpy.mockRestore();
    });

    it("should warn if response object is not SSE compatible (missing flushHeaders)", () => {
      const nonSseRes: any = { write: jest.fn() };
      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      sendSseEvent(nonSseRes, "testEvent", {});

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Attempted to send SSE event on a non-SSE response object."
      );
      consoleWarnSpy.mockRestore();
    });
  });

  // --- parseQueryParams ---
  describe("parseQueryParams", () => {
    it("should parse query parameters with defaults", () => {
      const query = {};
      const result = parseQueryParams(query);
      expect(result).toEqual({
        filter: {},
        sort: {},
        skip: 0,
        limit: 10,
      });
    });

    it("should parse page, limit, and sort (desc)", () => {
      const query = { page: "2", limit: "5", sort: "name:desc" };
      const result = parseQueryParams(query);
      expect(result).toEqual({
        filter: {},
        sort: { name: -1 },
        skip: 5,
        limit: 5,
      });
    });

    it("should parse page, limit, and sort (asc)", () => {
      const query = { page: "3", limit: "20", sort: "createdAt:asc" };
      const result = parseQueryParams(query);
      expect(result).toEqual({
        filter: {},
        sort: { createdAt: 1 },
        skip: 40,
        limit: 20,
      });
    });

    it("should parse filter parameters, excluding page, limit, sort", () => {
      const query = {
        name: "test",
        category: "A",
        page: "1",
        limit: "10",
        sort: "name:asc",
      };
      // Mimic destructuring in function to get the expected filter
      const { page, limit, sort, ...expectedFilter } = query;
      const result = parseQueryParams(query);

      expect(result.filter).toEqual(expectedFilter);
      expect(result.filter).not.toHaveProperty("page");
      expect(result.filter).not.toHaveProperty("limit");
      expect(result.filter).not.toHaveProperty("sort");
      expect(result.limit).toBe(10); // Default
      expect(result.sort).toEqual({ name: 1 });
    });

    it("should handle sort without specified order (defaults to asc)", () => {
      const query = { sort: "name" };
      const result = parseQueryParams(query);
      expect(result.sort).toEqual({ name: 1 });
    });

    it("should handle empty query gracefully", () => {
      const result = parseQueryParams({});
      expect(result).toEqual({
        filter: {},
        sort: {},
        skip: 0,
        limit: 10,
      });
    });
  });
});
