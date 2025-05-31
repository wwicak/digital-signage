import mongoose from 'mongoose';
import {
  findByIdAndSend,
  findAllAndSend,
  createAndSend,
  findByIdAndUpdateAndSend,
  findByIdAndDeleteAndSend,
  sendSseEvent,
  parseQueryParams
} from '../../../api/helpers/common_helper'; // Adjust path as necessary
import { jest } from '@jest/globals'; // Explicitly import jest for mocking if not using globals

// Helper function to create a mock Mongoose query chain
const mockQueryChain = (resolveValue: any = null, methodName: string = 'exec') => {
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
  query[methodName] = jest.fn().mockResolvedValue(resolveValue);
  return query;
};

// Mock Express response object
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.write = jest.fn().mockReturnValue(res);
  res.flushHeaders = jest.fn().mockReturnValue(res);
  return res;
};

// Mock Mongoose Model
const mockModel = (modelName = 'TestModel') => {
  const modelInstanceSaveResolver = jest.fn();
  const ModelConstructorMock = jest.fn((data) => ({
    ...data,
    _id: new mongoose.Types.ObjectId(),
    save: modelInstanceSaveResolver,
    populate: jest.fn(function(this: any) { // Ensure 'this' context for chaining
      // Simulate that populate might return a slightly different object or the same one
      // For simplicity, returning 'this' which now has its own execPopulate mock
      this.execPopulate = jest.fn().mockResolvedValue(this);
      return this;
    }),
    execPopulate: jest.fn(function() { return Promise.resolve(this); }),
  }));

  Object.assign(ModelConstructorMock, {
    modelName,
    findById: jest.fn(() => mockQueryChain()),
    find: jest.fn(() => mockQueryChain([])),
    findByIdAndUpdate: jest.fn(() => mockQueryChain()),
    findByIdAndDelete: jest.fn(() => mockQueryChain()),
  });

  (ModelConstructorMock as any)._mockSaveResolver = modelInstanceSaveResolver;

  return ModelConstructorMock as any;
};


describe('Common Helper Functions', () => {
  let res: any;

  beforeEach(() => {
    res = mockResponse();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Suppress console.warn
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore console spies and any other spies
  });

  describe('findByIdAndSend', () => {
    let model: any;
    const docId = new mongoose.Types.ObjectId().toString();
    const mockDoc = { _id: docId, name: 'Test Doc' };

    beforeEach(() => {
      model = mockModel('MockedItem');
    });

    it('should find a document by ID and send it', async () => {
      const docId = new mongoose.Types.ObjectId().toString(); // Ensure docId is defined for this test
      const mockDoc = { _id: docId, name: 'Test Doc' };
      model = mockModel('MockedItem'); // model is already defined in beforeEach, this re-initializes.

      // Get the query object that model.findById() will return by default from mockQueryChain
      // model.findById is already a jest.fn() that returns a mockQueryChain object.
      // We need to configure the 'exec' and 'populate' on the object *that will be returned*.

      const mockQueryReturnedByFindById = mockQueryChain(mockDoc); // This creates a fresh query chain object
      // We need model.findById to return this specific object so we can spy on its methods.
      model.findById.mockReturnValue(mockQueryReturnedByFindById);

      // Now spy on the methods of the *specific object* that will be returned and used.
      const populateSpy = jest.spyOn(mockQueryReturnedByFindById, 'populate').mockReturnThis();
      const execSpy = jest.spyOn(mockQueryReturnedByFindById, 'exec').mockResolvedValue(mockDoc); // exec is already a mock, spyOn wraps it.

      await findByIdAndSend(model, docId, res, 'someField');

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(populateSpy).toHaveBeenCalledWith('someField');
      expect(execSpy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDoc);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should find a document by ID without populate and send it', async () => {
      const mockQuery = { exec: jest.fn().mockResolvedValue(mockDoc) }; // No populate here
      model.findById.mockReturnValue(mockQuery);

      await findByIdAndSend(model, docId, res); // No populateField

      expect(model.findById).toHaveBeenCalledWith(docId);
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDoc);
    });

    it('should return 404 if document not found', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) };
      mockQuery.populate.mockImplementation(() => mockQuery);
      model.findById.mockReturnValue(mockQuery);

      await findByIdAndSend(model, docId, res, 'someField');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'MockedItem not found' });
    });

    it('should return 500 on database error', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('DB Error')) };
      mockQuery.populate.mockImplementation(() => mockQuery);
      model.findById.mockReturnValue(mockQuery);

      await findByIdAndSend(model, docId, res, 'someField');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching data', error: 'DB Error' });
    });
  });

  describe('findAllAndSend', () => {
    let model: any;
    const mockDocs = [{ name: 'Doc1' }, { name: 'Doc2' }];

    beforeEach(() => {
      model = mockModel('AllItems');
    });

    it('should find all documents and send them', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mockDocs) };
      mockQuery.populate.mockImplementation(() => mockQuery);
      model.find.mockReturnValue(mockQuery);

      await findAllAndSend(model, res, 'someField', { someFilter: 'value' });

      expect(model.find).toHaveBeenCalledWith({ someFilter: 'value' });
      expect(mockQuery.populate).toHaveBeenCalledWith('someField');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDocs);
    });

    it('should find all documents without populate or queryOptions and send them', async () => {
      const mockQuery = { exec: jest.fn().mockResolvedValue(mockDocs) };
      model.find.mockReturnValue(mockQuery);

      await findAllAndSend(model, res);

      expect(model.find).toHaveBeenCalledWith({}); // Default queryOptions is {}
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDocs);
    });

    it('should find all documents with queryOptions but no populate and send them', async () => {
      const mockQuery = { exec: jest.fn().mockResolvedValue(mockDocs) };
      model.find.mockReturnValue(mockQuery);
      const queryOptions = { name: "SpecificName" };

      await findAllAndSend(model, res, undefined, queryOptions);

      expect(model.find).toHaveBeenCalledWith(queryOptions);
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDocs);
    });

    it('should return 500 on database error', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('DB Error')) };
      mockQuery.populate.mockImplementation(() => mockQuery);
      model.find.mockReturnValue(mockQuery);

      await findAllAndSend(model, res, 'someField');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching data', error: 'DB Error' });
    });
  });

  describe('createAndSend', () => {
    let model: any;
    const itemData = { name: 'New Item', value: 100 };
    const savedItem = { ...itemData, _id: new mongoose.Types.ObjectId().toString() };

    beforeEach(() => {
      model = mockModel('CreatedItem');
    });

    it('should create a document and send it with status 201', async () => {
      model._mockSaveResolver.mockResolvedValue(savedItem); // Configure the shared save mock

      await createAndSend(model, itemData, res);

      expect(model).toHaveBeenCalledWith(itemData); // Check constructor call
      expect(model._mockSaveResolver).toHaveBeenCalled(); // Check save call
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedItem);
    });

    it('should return 400 on validation error', async () => {
      const validationError = new Error('Validation failed') as any;
      validationError.name = 'ValidationError';
      validationError.errors = { name: { message: 'Name is required' } };
      model._mockSaveResolver.mockRejectedValue(validationError);

      await createAndSend(model, itemData, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Validation Error', errors: validationError.errors });
    });

    it('should return 500 on other database errors', async () => {
      model._mockSaveResolver.mockRejectedValue(new Error('DB Error'));

      await createAndSend(model, itemData, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error creating data', error: 'DB Error' });
    });
  });

  describe('findByIdAndUpdateAndSend', () => {
    let model: any;
    const docId = new mongoose.Types.ObjectId().toString();
    const updateData = { name: 'Updated Name' };
    const initialDoc = { _id: docId, name: 'Initial Name', populate: jest.fn().mockReturnThis(), execPopulate: jest.fn() };
    const updatedDoc = { ...initialDoc, ...updateData };

    beforeEach(() => {
      model = mockModel('UpdatedItem');
      // Reset execPopulate on the mock object each time if it's part of the mock structure returned by findByIdAndUpdate
      initialDoc.execPopulate.mockReset();
    });

    it('should find by ID, update, populate, and send the document', async () => {
      // Mock findByIdAndUpdate to resolve to an object that has populate/execPopulate
      model.findByIdAndUpdate.mockImplementation(() => {
        // Simulate the document returned by findByIdAndUpdate before populate
        const unpopulatedUpdatedDoc = {
          ...updatedDoc,
          populate: jest.fn().mockImplementation(function() { // Use function to bind 'this'
            // Simulate populate modifying the document or returning a populated one
            Object.assign(this, { populatedField: 'populatedValue' });
            return this; // Return 'this' for chaining to execPopulate
          }),
          execPopulate: jest.fn().mockResolvedValue({ ...updatedDoc, populatedField: 'populatedValue' })
        };
        return mockQueryChain(unpopulatedUpdatedDoc); // findByIdAndUpdate returns a Query
      });

      await findByIdAndUpdateAndSend(model, docId, updateData, res, 'someField');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(docId, updateData, { new: true, runValidators: true });
      // The following depends on how you assert chained calls on the resolved object.
      // This part is tricky because the populate is called on the *result* of findByIdAndUpdate.
      // We need to inspect the object that `findByIdAndUpdate`'s query resolves to.
      // The `unpopulatedUpdatedDoc.populate` and `unpopulatedUpdatedDoc.execPopulate` would be called.
      // A direct assertion on these specific mocks is needed if they are unique per call.

      // For simplicity, we'll check the final res.json if populate worked.
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Name', populatedField: 'populatedValue' }));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should find by ID, update, and send (no populate)', async () => {
      model.findByIdAndUpdate.mockReturnValue(mockQueryChain(updatedDoc));

      await findByIdAndUpdateAndSend(model, docId, updateData, res);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(docId, updateData, { new: true, runValidators: true });
      expect(res.json).toHaveBeenCalledWith(updatedDoc);
    });

    it('should return 404 if document not found for update', async () => {
      model.findByIdAndUpdate.mockReturnValue(mockQueryChain(null));
      await findByIdAndUpdateAndSend(model, docId, updateData, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'UpdatedItem not found' });
    });

    it('should return 400 on validation error during update', async () => {
      const validationError = new Error('Validation failed') as any;
      validationError.name = 'ValidationError';
      model.findByIdAndUpdate.mockReturnValue(mockQueryChain(null).exec.mockRejectedValue(validationError).getMockImplementation()()); // Make exec reject

      await findByIdAndUpdateAndSend(model, docId, updateData, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Validation Error', errors: validationError.errors });
    });

    it('should return 500 on other database errors during update', async () => {
      model.findByIdAndUpdate.mockReturnValue(mockQueryChain(null).exec.mockRejectedValue(new Error('DB Update Error')).getMockImplementation()());
      await findByIdAndUpdateAndSend(model, docId, updateData, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error updating data', error: 'DB Update Error' });
    });
  });

  describe('findByIdAndDeleteAndSend', () => {
    let model: any;
    const docId = new mongoose.Types.ObjectId().toString();
    const mockDeletedDoc = { _id: docId, name: 'Deleted Doc' };

    beforeEach(() => {
      model = mockModel('DeletedItem');
    });

    it('should find by ID, delete, and send success message', async () => {
      model.findByIdAndDelete.mockReturnValue(mockQueryChain(mockDeletedDoc));

      await findByIdAndDeleteAndSend(model, docId, res);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(docId);
      expect(res.json).toHaveBeenCalledWith({ message: 'DeletedItem deleted successfully' });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 404 if document not found for delete', async () => {
      model.findByIdAndDelete.mockReturnValue(mockQueryChain(null));
      await findByIdAndDeleteAndSend(model, docId, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'DeletedItem not found' });
    });

    it('should return 500 on database error during delete', async () => {
      model.findByIdAndDelete.mockReturnValue(mockQueryChain(null).exec.mockRejectedValue(new Error('DB Delete Error')).getMockImplementation()());
      await findByIdAndDeleteAndSend(model, docId, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error deleting data', error: 'DB Delete Error' });
    });
  });

  describe('sendSseEvent', () => {
    it('should write event and data to SSE response stream', () => {
      const eventName = 'testEvent';
      const eventData = { foo: 'bar' };

      sendSseEvent(res, eventName, eventData);

      expect(res.write).toHaveBeenCalledWith(`event: ${eventName}\n`);
      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(eventData)}\n\n`);
      // expect(res.flushHeaders).toHaveBeenCalled(); // Depending on whether you want to enforce this
    });

    it('should warn if res is not a valid SSE stream (missing write)', () => {
      const invalidRes: any = { flushHeaders: jest.fn() }; // Missing write
      sendSseEvent(invalidRes, 'testEvent', {});
      expect(console.warn).toHaveBeenCalledWith('Attempted to send SSE event on a non-SSE response object.');
    });

    it('should warn if res is not a valid SSE stream (missing flushHeaders)', () => {
      const invalidRes: any = { write: jest.fn() }; // Missing flushHeaders
      sendSseEvent(invalidRes, 'testEvent', {});
      expect(console.warn).toHaveBeenCalledWith('Attempted to send SSE event on a non-SSE response object.');
    });
  });

  describe('parseQueryParams', () => {
    it('should parse default query params', () => {
      const query = {};
      const params = parseQueryParams(query);
      expect(params.filter).toEqual({});
      expect(params.sort).toEqual({});
      expect(params.skip).toBe(0);
      expect(params.limit).toBe(10);
    });

    it('should parse page and limit', () => {
      const query = { page: '2', limit: '5' };
      const params = parseQueryParams(query);
      expect(params.skip).toBe(5); // (2-1)*5
      expect(params.limit).toBe(5);
    });

    it('should parse sort ascending', () => {
      const query = { sort: 'name:asc' };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: 1 });
    });

    it('should parse sort descending', () => {
      const query = { sort: 'name:desc' };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: -1 });
    });

    it('should parse sort without explicit direction (defaults to asc)', () => {
      const query = { sort: 'name' };
      const params = parseQueryParams(query);
      expect(params.sort).toEqual({ name: 1 });
    });

    it('should parse filter parameters', () => {
      const query = { name: 'test', category: 'A' };
      const params = parseQueryParams(query);
      expect(params.filter).toEqual({ name: 'test', category: 'A' });
    });

    it('should parse all parameters together', () => {
      const query = { page: '3', limit: '20', sort: 'age:desc', city: 'NY', active: 'true' };
      const params = parseQueryParams(query);
      expect(params.filter).toEqual({ city: 'NY', active: 'true' });
      expect(params.sort).toEqual({ age: -1 });
      expect(params.skip).toBe(40); // (3-1)*20
      expect(params.limit).toBe(20);
    });
  });
});
