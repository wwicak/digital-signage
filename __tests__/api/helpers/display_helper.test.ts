import mongoose from 'mongoose';
import { jest } from '@jest/globals'; // Explicitly import jest for mocking if not using globals

// Comprehensive Mongoose mock to prevent actual DB connection attempts
jest.mock('mongoose', () => {
  const originalMongoose = jest.requireActual('mongoose');
  return {
    ...originalMongoose,
    connect: jest.fn().mockResolvedValue(undefined), // Mock connect
    connection: { // Mock connection object
      readyState: 1, // Simulate connected state
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      // Add other properties/methods of connection if needed by code under test
      db: {
        admin: () => ({
          command: jest.fn().mockResolvedValue({ ok: 1 }) // For things like ping
        })
      }
    },
    // Retain original Schema, Types, models, etc., but ensure model() is robust
    Schema: originalMongoose.Schema,
    Types: originalMongoose.Types,
    model: jest.fn((name, schema) => {
      const MockedModelConstructor = jest.fn(data => {
        const idForThisInstance = new originalMongoose.Types.ObjectId();
        const instanceData = { ...data, _id: idForThisInstance };
        return {
          ...instanceData, // Includes _id on the instance itself
          save: jest.fn().mockResolvedValue({ // save resolves with data + _id
            ...data, // original data passed to constructor
            _id: idForThisInstance
          }),
          toJSON: jest.fn().mockReturnValue({ ...data, _id: idForThisInstance }),
        };
      });
      Object.assign(MockedModelConstructor, {
        modelName: name,
        find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        findByIdAndUpdate: jest.fn(),
        deleteMany: jest.fn(), // Added mock for deleteMany
        insertMany: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        create: jest.fn(async (data: any) => { // Mock create
          // Simulate create: new object, add _id, return it (as a promise)
          // Ensure it does not rely on variables outside this scope like 'creatorId'
          return { ...data, _id: new originalMongoose.Types.ObjectId() };
        }),
        // Add other commonly used static methods if necessary
      });
      originalMongoose.models[name] = MockedModelConstructor; // Store this mock for lookup
      return MockedModelConstructor;
    }),
    models: originalMongoose.models, // Keep track of already compiled models (populated by the mock above)
    // Add any other specific Mongoose exports if they are used directly and need mocking
  };
});

// Assuming paths for models - adjust if necessary
// These are imported for type information and potentially static properties like .modelName
// They will be mocked by mockModel in tests.
import Display from '../../../api/models/display_model'; // Adjust path as necessary
import Widget, { WidgetType } from '../../../api/models/Widget';   // Adjust path as necessary

// Import the function to test
import { createWidgetsForDisplay, updateWidgetsForDisplay } from '../../../api/helpers/display_helper'; // Adjust path as necessary


// Helper function to create a mock Mongoose query chain
const mockQueryChain = (resolveValue: any = null, methodName: string = 'exec') => {
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
  query[methodName] = jest.fn().mockResolvedValue(resolveValue);
  if (resolveValue instanceof Error && methodName === 'exec') {
    query[methodName] = jest.fn().mockRejectedValue(resolveValue);
  }
  return query;
};

// Mock Express response object (Not strictly needed for createWidgetsForDisplay but good for consistency if other helpers are added)
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
    populate: jest.fn(function(this: any) {
      this.execPopulate = jest.fn().mockResolvedValue(this);
      return this;
    }),
    execPopulate: jest.fn(function() { return Promise.resolve(this); }),
  }));

  Object.assign(ModelConstructorMock, {
    modelName,
    // Add static model methods that might be used by helpers
    findById: jest.fn(() => mockQueryChain()),
    find: jest.fn(() => mockQueryChain([])),
    findByIdAndUpdate: jest.fn(() => mockQueryChain()),
    findByIdAndDelete: jest.fn(() => mockQueryChain()),
    insertMany: jest.fn(), // Specifically for createWidgetsForDisplay
    // Add other static methods as needed, e.g., create, updateOne, deleteOne, etc.
  });

  (ModelConstructorMock as any)._mockSaveResolver = modelInstanceSaveResolver;
  return ModelConstructorMock as any;
};

describe('Display Helper Functions', () => {
  describe('createWidgetsForDisplay', () => {
    // MockedWidget is no longer the primary handle for insertMany if the helper uses its own import.
    // We will configure Widget (the imported module, which is mocked by jest.mock('mongoose'))
    let displayObject: any;
    const creatorId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
      // Widget itself is mocked via jest.mock('mongoose') which affects mongoose.model("Widget", schema)
      // So, Widget.insertMany should be a jest.fn() from that global mock.
      if (Widget && Widget.insertMany && (Widget.insertMany as jest.Mock).mockReset) {
        (Widget.insertMany as jest.Mock).mockReset();
      }

      const MockedDisplayModel = mockModel('Display'); // mockModel is our local utility
      displayObject = new MockedDisplayModel({
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Test Display',
        widgets: [],
      });
      // Ensure essential mocked methods if they might be called by the helper
      // mockModel's constructor by default gives a basic object with a 'save' mock.
      // If 'markModified' is specifically needed beyond what mockModel provides by default:
      if (!displayObject.markModified) { // Or if it needs specific behavior
          displayObject.markModified = jest.fn();
      }
      if (!displayObject.save) { // Or if it needs specific behavior
          displayObject.save = jest.fn().mockResolvedValue(displayObject);
      }

      // Suppress console.warn but allow console.error for debugging this specific failure
      // jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should successfully create widgets and add their IDs to the display', async () => {
      const widgetsData = [
        { name: 'My Announcement Widget', type: WidgetType.ANNOUNCEMENT, content: 'Hello' },
        { name: 'My Image Widget', type: WidgetType.IMAGE, url: 'http://example.com/img.png' },
      ];
      const createdWidgetDocs = widgetsData.map(data => ({
        ...data, // type will now be the string value from the enum e.g. "announcement"
        _id: new mongoose.Types.ObjectId(),
        creator_id: creatorId,
      }));

      (Widget.insertMany as jest.Mock).mockResolvedValue(createdWidgetDocs); // Configure the imported (and globally mocked) Widget

      // Pass a Widget model to the function, assuming it might use it.
      // If it uses its own import, our global mongoose mock should catch it.
      const resultWidgetIds = await createWidgetsForDisplay(displayObject, widgetsData, creatorId, Widget as any);

      const expectedWidgetDataToInsert = widgetsData.map(data => ({
        ...data,
        creator_id: creatorId,
      }));
      expect(Widget.insertMany).toHaveBeenCalledWith(expectedWidgetDataToInsert); // Assert on the imported (and globally mocked) Widget

      const expectedWidgetIds = createdWidgetDocs.map(doc => doc._id.toString());
      // Adjust the expectation for resultWidgetIds based on observed output (array of ObjectIds)
      expect(resultWidgetIds.map((id: any) => id.toString())).toEqual(expectedWidgetIds);
      // Compare widget IDs as strings for robustness
      const displayWidgetIdsAsStrings = displayObject.widgets.map((id: any) => id.toString());
      expect(displayWidgetIdsAsStrings).toEqual(expect.arrayContaining(expectedWidgetIds));
    });

    it('should not call insertMany and return empty array if widgetsData is empty', async () => {
      const widgetsData: any[] = [];
      const originalWidgets = [...displayObject.widgets];

      // Pass Widget as the model. If createWidgetsForDisplay uses its import, Widget.insertMany (mocked) should not be called.
      // If it uses the param, it also shouldn't be called.
      const resultWidgetIds = await createWidgetsForDisplay(displayObject, widgetsData, creatorId, Widget as any);

      expect(Widget.insertMany).not.toHaveBeenCalled();
      expect(resultWidgetIds).toEqual([]);
      expect(displayObject.widgets).toEqual(originalWidgets);
    });

    it('should not call insertMany and return empty array if widgetsData is undefined', async () => {
      const originalWidgets = [...displayObject.widgets];

      const resultWidgetIds = await createWidgetsForDisplay(displayObject, undefined, creatorId, Widget as any);

      expect(Widget.insertMany).not.toHaveBeenCalled();
      expect(resultWidgetIds).toEqual([]);
      expect(displayObject.widgets).toEqual(originalWidgets);
    });

    it('should not call insertMany and return empty array if widgetsData is null', async () => {
      const originalWidgets = [...displayObject.widgets];

      const resultWidgetIds = await createWidgetsForDisplay(displayObject, null, creatorId, Widget as any);

      expect(Widget.insertMany).not.toHaveBeenCalled();
      expect(resultWidgetIds).toEqual([]);
      expect(displayObject.widgets).toEqual(originalWidgets);
    });

    it('should throw an error if Widget.insertMany rejects', async () => {
      const widgetsData = [{ name: 'Valid Widget Name', type: WidgetType.ANNOUNCEMENT, content: 'Fail case' }]; // Use valid data structure
      const dbError = new Error('Database insert failed');
      (Widget.insertMany as jest.Mock).mockRejectedValue(dbError); // Configure the imported (and globally mocked) Widget

      await expect(createWidgetsForDisplay(displayObject, widgetsData, creatorId, Widget as any))
        .rejects
        .toThrow('Failed to create widgets for display.');

      expect(displayObject.widgets).toEqual([]); // Ensure display object is not mutated on error
    });
  });

  describe('updateWidgetsForDisplay', () => {
    let MockedWidget: any;
    let MockedDisplay: any; // May not be strictly needed if display is just an object
    let displayObject: any;
    const creatorId = new mongoose.Types.ObjectId().toString();
    const existingWidgetId1 = new mongoose.Types.ObjectId();
    const existingWidgetId2 = new mongoose.Types.ObjectId();
    const existingWidgetId3 = new mongoose.Types.ObjectId();

    beforeEach(() => {
      // Mock Mongoose models
      // Widget model needs findById, findByIdAndUpdate, deleteMany, and potentially instances need save
      MockedWidget = mockModel('Widget'); // Our utility correctly mocks static methods
      // For instance.save(), mockModel's constructor assigns a _mockSaveResolver.
      // We will use jest.spyOn(MockedWidget.prototype, 'save') if needed, or rely on _mockSaveResolver.
      // Let's ensure prototype.save is a mock for direct instance.save() calls.
      // The mockModel already returns a constructor. Instances created from it have a .save mock.

      // For `new Widget().save()` type operations as described in test case 1,
      // we need to ensure that `new Widget()` actually uses our `MockedWidget` constructor.
      // This is handled by jest.mock('mongoose') which makes `mongoose.model('Widget', ...)` return our MockedWidget constructor.
      // So, when the code under test does `new Widget({...})`, it should use the mocked constructor.
      // We then need to ensure that the `save` method on these instances is the one we can control.
      // The `mockModel` utility's `modelInstanceSaveResolver` can be used or we can spy.


      MockedDisplay = mockModel('Display');

      // Reset mocks on the globally mocked Widget (from jest.mock('mongoose'))
      const modelMocksToReset = [
        Widget.insertMany,
        Widget.findByIdAndUpdate,
        Widget.deleteMany,
        Widget.create, // Add create to reset
        // Add other static Widget methods if they are used and mocked
      ];
      modelMocksToReset.forEach(mockFn => {
        if (mockFn && (mockFn as jest.Mock).mockReset) {
          (mockFn as jest.Mock).mockReset();
        }
      });

      const MockedDisplayModel = mockModel('Display'); // mockModel is our local utility
      displayObject = new MockedDisplayModel({
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Test Display',
        widgets: [existingWidgetId1, existingWidgetId2, existingWidgetId3], // Array of ObjectIds
      });
      // Configure instance mocks after creation
      displayObject.markModified = jest.fn();
      (displayObject.save as jest.Mock).mockResolvedValue(displayObject);

      // Suppress console.warn, keep console.error unmocked for now.
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      // jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // Remove placeholder and add new tests

    it('should only create new widgets when newWidgetsData contains only new widgets', async () => {
      displayObject.widgets = []; // Start with an empty display
      const newWidgetData1 = { name: 'New Widget 1', type: WidgetType.ANNOUNCEMENT, x:0, y:0, w:1, h:1, data: { content: 'First' } };
      const newWidgetData2 = { name: 'New Widget 2', type: WidgetType.IMAGE, x:0, y:0, w:1, h:1, data: { url: 'http://new.png' } };
      const newWidgetsToSubmit = [newWidgetData1, newWidgetData2];

      const createdWidgetId1 = new mongoose.Types.ObjectId();
      const createdWidgetId2 = new mongoose.Types.ObjectId();

      (Widget.create as jest.Mock)
        .mockResolvedValueOnce({ ...newWidgetData1, _id: createdWidgetId1, creator_id: creatorId })
        .mockResolvedValueOnce({ ...newWidgetData2, _id: createdWidgetId2, creator_id: creatorId });

      const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

      expect(Widget.create).toHaveBeenCalledTimes(2);
      expect(Widget.create).toHaveBeenCalledWith({ ...newWidgetData1, creator_id: creatorId });
      expect(Widget.create).toHaveBeenCalledWith({ ...newWidgetData2, creator_id: creatorId });
      expect(Widget.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(Widget.deleteMany).not.toHaveBeenCalled(); // No initial widgets, so no deletions triggered by comparing new set to empty current set

      expect(resultWidgetIds.map(id => id.toString()).sort()).toEqual([createdWidgetId1.toString(), createdWidgetId2.toString()].sort());
      expect(displayObject.widgets).toEqual([]); // Should not be modified
    });

    it('should only update existing widgets when newWidgetsData contains only existing widgets', async () => {
      // displayObject.widgets already has existingWidgetId1, existingWidgetId2, existingWidgetId3
      const updateData1 = { _id: existingWidgetId1.toString(), name: 'Updated Widget 1', data: { content: 'Updated C1' } };
      const updateData2 = { _id: existingWidgetId2.toString(), name: 'Updated Widget 2', data: { url: 'http://updated.png' } };
      const newWidgetsToSubmit = [updateData1, updateData2]; // Not updating existingWidgetId3

      (Widget.findByIdAndUpdate as jest.Mock)
        .mockResolvedValueOnce({ ...updateData1, _id: existingWidgetId1 })
        .mockResolvedValueOnce({ ...updateData2, _id: existingWidgetId2 });

      (Widget.deleteMany as jest.Mock).mockResolvedValue({ acknowledged: true, deletedCount: 1 }); // For existingWidgetId3

      const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

      expect(Widget.create).not.toHaveBeenCalled();
      expect(Widget.findByIdAndUpdate).toHaveBeenCalledTimes(2);
      expect(Widget.findByIdAndUpdate).toHaveBeenCalledWith(existingWidgetId1.toString(), updateData1, { new: true, runValidators: true });
      expect(Widget.findByIdAndUpdate).toHaveBeenCalledWith(existingWidgetId2.toString(), updateData2, { new: true, runValidators: true });

      // Deletion WILL be called for existingWidgetId3 because it's not in newWidgetsToSubmit
      expect(Widget.deleteMany).toHaveBeenCalledWith({ _id: { $in: [existingWidgetId3] } });


      const expectedReturnedIds = [existingWidgetId1.toString(), existingWidgetId2.toString()].sort();
      expect(resultWidgetIds.map(id => id.toString()).sort()).toEqual(expectedReturnedIds);
      expect(displayObject.widgets).toEqual([existingWidgetId1, existingWidgetId2, existingWidgetId3]); // Should not be modified
    });

    it('should only delete widgets when newWidgetsData is empty', async () => {
      // displayObject.widgets has existingWidgetId1, existingWidgetId2, existingWidgetId3
      const newWidgetsToSubmit: any[] = [];

      (Widget.deleteMany as jest.Mock).mockResolvedValue({ acknowledged: true, deletedCount: 3 });

      const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

      expect(Widget.create).not.toHaveBeenCalled();
      expect(Widget.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(Widget.deleteMany).toHaveBeenCalledTimes(1);
      expect(Widget.deleteMany).toHaveBeenCalledWith({ _id: { $in: [existingWidgetId1, existingWidgetId2, existingWidgetId3] } });

      expect(resultWidgetIds).toEqual([]);
      expect(displayObject.widgets).toEqual([existingWidgetId1, existingWidgetId2, existingWidgetId3]); // Should not be modified
    });

    it('should handle mixed operations: create, update, and delete', async () => {
      // displayObject.widgets = [existingWidgetId1, existingWidgetId2, existingWidgetId3]
      // existingWidgetId1 will be updated
      // existingWidgetId2 will be deleted (not in newWidgetsToSubmit)
      // existingWidgetId3 will be kept (implicitly, by being updated)
      // one new widget will be created

      const newWidgetData = { name: 'Brand New Widget', type: WidgetType.WEB, x:1,y:1,w:1,h:1, data: {url: 'http://new.com'} };
      const updateDataForId1 = { _id: existingWidgetId1.toString(), name: 'Updated Name for W1' };
      const updateDataForId3 = { _id: existingWidgetId3.toString(), name: 'Updated Name for W3' }; // Keep W3 by updating it

      const newWidgetsToSubmit = [newWidgetData, updateDataForId1, updateDataForId3];

      const createdWidgetId = new mongoose.Types.ObjectId();
      (Widget.create as jest.Mock).mockResolvedValueOnce({ ...newWidgetData, _id: createdWidgetId, creator_id: creatorId });
      (Widget.findByIdAndUpdate as jest.Mock)
        .mockImplementation(async (id, data) => {
          if (id.toString() === existingWidgetId1.toString()) return { ...data, _id: existingWidgetId1 };
          if (id.toString() === existingWidgetId3.toString()) return { ...data, _id: existingWidgetId3 };
          return null;
        });
      (Widget.deleteMany as jest.Mock).mockResolvedValue({ acknowledged: true, deletedCount: 1 }); // For existingWidgetId2

      const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

      expect(Widget.create).toHaveBeenCalledTimes(1);
      expect(Widget.create).toHaveBeenCalledWith({ ...newWidgetData, creator_id: creatorId });

      expect(Widget.findByIdAndUpdate).toHaveBeenCalledTimes(2);
      expect(Widget.findByIdAndUpdate).toHaveBeenCalledWith(existingWidgetId1.toString(), updateDataForId1, { new: true, runValidators: true });
      expect(Widget.findByIdAndUpdate).toHaveBeenCalledWith(existingWidgetId3.toString(), updateDataForId3, { new: true, runValidators: true });

      expect(Widget.deleteMany).toHaveBeenCalledTimes(1);
      // Only existingWidgetId2 should be deleted
      expect(Widget.deleteMany).toHaveBeenCalledWith({ _id: { $in: [existingWidgetId2] } });


      const expectedReturnedIds = [createdWidgetId.toString(), existingWidgetId1.toString(), existingWidgetId3.toString()].sort();
      expect(resultWidgetIds.map(id => id.toString()).sort()).toEqual(expectedReturnedIds);
      expect(displayObject.widgets).toEqual([existingWidgetId1, existingWidgetId2, existingWidgetId3]); // Should not be modified
    });

    it('should make no DB calls for create/delete if widgets are only updated (no change in set)', async () => {
        // displayObject.widgets has existingWidgetId1, existingWidgetId2, existingWidgetId3
        const updateData1 = { _id: existingWidgetId1.toString(), name: "Name 1" };
        const updateData2 = { _id: existingWidgetId2.toString(), name: "Name 2" };
        const updateData3 = { _id: existingWidgetId3.toString(), name: "Name 3" };
        const newWidgetsToSubmit = [updateData1, updateData2, updateData3];

        (Widget.findByIdAndUpdate as jest.Mock)
            .mockResolvedValueOnce({ ...updateData1, _id: existingWidgetId1 })
            .mockResolvedValueOnce({ ...updateData2, _id: existingWidgetId2 })
            .mockResolvedValueOnce({ ...updateData3, _id: existingWidgetId3 });
        // deleteMany should not be called if all current widgets are in newWidgetsToSubmit

        const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

        expect(Widget.create).not.toHaveBeenCalled();
        expect(Widget.findByIdAndUpdate).toHaveBeenCalledTimes(3);
        expect(Widget.deleteMany).not.toHaveBeenCalled(); // Crucial for this test

        const expectedReturnedIds = [existingWidgetId1.toString(), existingWidgetId2.toString(), existingWidgetId3.toString()].sort();
        expect(resultWidgetIds.map(id => id.toString()).sort()).toEqual(expectedReturnedIds);
        expect(displayObject.widgets).toEqual([existingWidgetId1, existingWidgetId2, existingWidgetId3]);
    });

    describe('Error Handling', () => {
      let consoleErrorSpy: jest.SpyInstance;
      // Use existingWidgetId1, existingWidgetId2 from outer scope for simplicity if they fit
      // displayObject will be reset using these IDs in beforeEach of this inner describe

      beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        // Reset displayObject to a known state for error tests
        displayObject.widgets = [existingWidgetId1, existingWidgetId2]; // Keep it simple
      });

      afterEach(() => {
        consoleErrorSpy.mockRestore();
      });

      it('should log error and continue if Widget.create fails for one widget', async () => {
        const newWidgetGood = { name: 'Good New Widget', type:WidgetType.TEXT, x:0,y:0,w:1,h:1,data:{text:"good"} };
        const newWidgetBad = { name: 'Bad New Widget', type:WidgetType.TEXT, x:0,y:0,w:1,h:1,data:{text:"bad"} };
        const updateData = { _id: existingWidgetId1.toString(), name: 'Update during create fail' };
        const newWidgetsToSubmit = [newWidgetGood, newWidgetBad, updateData];

        const goodCreatedId = new mongoose.Types.ObjectId();
        const creationError = new Error('DB create failed');

        (Widget.create as jest.Mock)
          .mockImplementation(async (data: any) => {
            if (data.name === 'Good New Widget') return { ...data, _id: goodCreatedId, creator_id: creatorId };
            if (data.name === 'Bad New Widget') throw creationError;
            return null; // Should not happen
          });
        (Widget.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...updateData, _id: existingWidgetId1 });
        // existingWidgetId2 should be deleted
        (Widget.deleteMany as jest.Mock).mockResolvedValue({ acknowledged: true, deletedCount: 1 });


        const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating new widget:', creationError);
        expect(Widget.create).toHaveBeenCalledTimes(2); // Both attempts
        expect(Widget.findByIdAndUpdate).toHaveBeenCalledTimes(1); // Update should still happen
        expect(Widget.deleteMany).toHaveBeenCalledWith({ _id: { $in: [existingWidgetId2] } }); // Deletion should still happen

        const expectedReturnedIds = [goodCreatedId.toString(), existingWidgetId1.toString()].sort();
        expect(resultWidgetIds.map(id => id.toString()).sort()).toEqual(expectedReturnedIds);
        expect(displayObject.widgets).toEqual([existingWidgetId1, existingWidgetId2]); // Not modified
      });

      it('should log error and continue if Widget.findByIdAndUpdate fails for one widget', async () => {
        const newWidgetGood = { name: 'Good New Widget during update fail', type:WidgetType.TEXT, x:0,y:0,w:1,h:1,data:{text:"good"} };
        const updateDataGood = { _id: existingWidgetId1.toString(), name: 'Good Update' };
        const updateDataBad = { _id: existingWidgetId2.toString(), name: 'Bad Update' }; // This one will fail
        const newWidgetsToSubmit = [newWidgetGood, updateDataGood, updateDataBad];

        const goodCreatedId = new mongoose.Types.ObjectId();
        const updateError = new Error('DB update failed');

        (Widget.create as jest.Mock).mockResolvedValue({ ...newWidgetGood, _id: goodCreatedId, creator_id: creatorId });
        (Widget.findByIdAndUpdate as jest.Mock)
          .mockImplementation(async (id, data) => {
            if (id.toString() === existingWidgetId1.toString()) return { ...data, _id: existingWidgetId1 };
            if (id.toString() === existingWidgetId2.toString()) throw updateError;
            return null;
          });
        // No deletions in this specific setup as all original widgets are in newWidgetsToSubmit (either updated or failed update)
        (Widget.deleteMany as jest.Mock).mockResolvedValue({ acknowledged: true, deletedCount: 0 });


        const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

        expect(consoleErrorSpy).toHaveBeenCalledWith(`Error updating widget ${existingWidgetId2.toString()}:`, updateError);
        expect(Widget.create).toHaveBeenCalledTimes(1);
        expect(Widget.findByIdAndUpdate).toHaveBeenCalledTimes(2); // Both attempts
        // Deletion will be called with an empty list if current widgets = new widgets (after create/update logic)
        // display.widgets = [eW1, eW2]. newWidgetIds before delete = [goodCreatedId, eW1 (good update), eW2 (bad update, but id still passed for update attempt)]
        // String lists for delete: current=[eW1, eW2], new=[goodCreatedId, eW1, eW2]. So no actual IDs to delete.
        expect(Widget.deleteMany).toHaveBeenCalledWith({ _id: { $in: [] } });


        const expectedReturnedIds = [goodCreatedId.toString(), existingWidgetId1.toString()].sort();
         // existingWidgetId2 is not returned as its update failed
        expect(resultWidgetIds.map(id => id.toString()).sort()).toEqual(expectedReturnedIds);
        expect(displayObject.widgets).toEqual([existingWidgetId1, existingWidgetId2]); // Not modified
      });

      it('should log error and continue if Widget.deleteMany fails', async () => {
        // existingWidgetId1 will be updated, existingWidgetId2 will be targeted for deletion
        const newWidgetGood = { name: 'Good New Widget during delete fail', type:WidgetType.TEXT,x:0,y:0,w:1,h:1,data:{text:"good"}};
        const updateDataGood = { _id: existingWidgetId1.toString(), name: 'Good Update during delete fail' };
        const newWidgetsToSubmit = [newWidgetGood, updateDataGood]; // existingWidgetId2 is omitted, so it should be deleted

        const goodCreatedId = new mongoose.Types.ObjectId();
        const deleteError = new Error('DB delete failed');

        (Widget.create as jest.Mock).mockResolvedValue({ ...newWidgetGood, _id: goodCreatedId, creator_id: creatorId });
        (Widget.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...updateDataGood, _id: existingWidgetId1 });
        (Widget.deleteMany as jest.Mock).mockRejectedValue(deleteError);

        const resultWidgetIds = await updateWidgetsForDisplay(displayObject, newWidgetsToSubmit, creatorId);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting old widgets:', deleteError);
        expect(Widget.create).toHaveBeenCalledTimes(1);
        expect(Widget.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(Widget.deleteMany).toHaveBeenCalledWith({ _id: { $in: [existingWidgetId2] } }); // Attempted deletion

        const expectedReturnedIds = [goodCreatedId.toString(), existingWidgetId1.toString()].sort();
        expect(resultWidgetIds.map(id => id.toString()).sort()).toEqual(expectedReturnedIds);
        expect(displayObject.widgets).toEqual([existingWidgetId1, existingWidgetId2]); // Not modified
      });
    });
  });
});
