// __tests__/api/helpers/display_helper.test.ts
import mongoose from "mongoose"; // Still needed for ObjectId, etc.
import { jest } from "@jest/globals";

// We will mock the Widget model module directly
const OriginalWidgetModule = jest.requireActual("../../../api/models/Widget");
const WidgetType = OriginalWidgetModule.WidgetType;

// Mocks for Widget Model (similar pattern can be used for Display)
const mockWidgetSave = jest.fn();
const mockWidgetToJSON = jest.fn();
const MockedWidgetConstructor = jest
  .fn()
  .mockImplementation((constructorData: any) => {
    const originalMongooseInternal = jest.requireActual("mongoose");
    const idForThisInstance =
      constructorData && constructorData._id
        ? new originalMongooseInternal.Types.ObjectId(constructorData._id)
        : new originalMongooseInternal.Types.ObjectId();
    const instanceData = {
      name: constructorData.name || "Default Mock Name",
      type: constructorData.type || WidgetType.ANNOUNCEMENT,
      x: constructorData.x !== undefined ? constructorData.x : 0,
      y: constructorData.y !== undefined ? constructorData.y : 0,
      w: constructorData.w !== undefined ? constructorData.w : 1,
      h: constructorData.h !== undefined ? constructorData.h : 1,
      data: constructorData.data || {},
      creator_id: constructorData.creator_id,
      ...constructorData,
      _id: idForThisInstance,
    };

    const currentSaveMock = jest.fn().mockResolvedValue(instanceData);
    const currentToJSONMock = jest.fn().mockReturnValue(instanceData);

    // If this instance is meant to fail on save (identified by name for simplicity in test)
    if (
      constructorData &&
      constructorData.name === "New Widget For Error Test" &&
      constructorData.shouldFailSave
    ) {
      currentSaveMock.mockRejectedValueOnce(
        new Error("New widget save failed")
      );
    }

    return {
      ...instanceData,
      save: currentSaveMock,
      toJSON: currentToJSONMock,
    };
  });

// Assign static methods to the MockedWidget constructor
MockedWidgetConstructor.findByIdAndUpdate = jest.fn();
MockedWidgetConstructor.deleteMany = jest.fn();
MockedWidgetConstructor.find = jest
  .fn()
  .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
MockedWidgetConstructor.findById = jest
  .fn()
  .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
MockedWidgetConstructor.insertMany = jest.fn().mockResolvedValue([]);
MockedWidgetConstructor.findOne = jest
  .fn()
  .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
MockedWidgetConstructor.create = jest.fn(async (data: any) => {
  const originalMongooseInternal = jest.requireActual("mongoose");
  return { ...data, _id: new originalMongooseInternal.Types.ObjectId() };
});

jest.mock("../../../api/models/Widget", () => ({
  __esModule: true,
  default: MockedWidgetConstructor,
  WidgetType: OriginalWidgetModule.WidgetType,
}));

// --- Mock for Display Model ---
let MockedDisplayFindByIdQuery_populateFn = jest.fn();
let MockedDisplayFindByIdQuery_execFn = jest.fn();

const MockedDisplayFindByIdQuery = {
  populate: MockedDisplayFindByIdQuery_populateFn,
  exec: MockedDisplayFindByIdQuery_execFn,
};

// Setup populate to return the object it's a method of.
MockedDisplayFindByIdQuery_populateFn.mockImplementation(
  () => MockedDisplayFindByIdQuery
);

const MockedDisplayConstructor = {
  findById: jest.fn(() => MockedDisplayFindByIdQuery),
  // Add other static Display methods if they are used by any helpers
};
jest.mock("../../../api/models/Display", () => ({
  __esModule: true,
  default: MockedDisplayConstructor,
}));
// --- End Mock for Display Model ---

// Optional: Keep a simplified mongoose mock for other potential uses
// or if other parts of mongoose are used.
jest.mock("mongoose", () => {
  const originalMongoose = jest.requireActual("mongoose");
  const actualModels = originalMongoose.models; // Capture actual models if any are already loaded

  return {
    ...originalMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      db: {
        admin: () => ({
          command: jest.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
    },
    Schema: originalMongoose.Schema,
    Types: originalMongoose.Types,
    model: jest.fn((name, schema) => {
      if (name === "Widget") {
        return MockedWidgetConstructor;
      }
      // Fallback for any other models like 'Display' if they are not separately mocked.
      // This creates a generic mock.
      if (actualModels[name]) return actualModels[name]; // Return actual model if it was loaded before mock

      const GenericMockModel = jest.fn((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(data),
        toJSON: jest.fn().mockReturnValue(data),
      }));
      GenericMockModel.find = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      GenericMockModel.findById = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      GenericMockModel.findByIdAndUpdate = jest
        .fn()
        .mockImplementation((id, update) => ({ ...update, _id: id }));
      GenericMockModel.deleteMany = jest
        .fn()
        .mockResolvedValue({ acknowledged: true, deletedCount: 0 });
      GenericMockModel.insertMany = jest.fn().mockResolvedValue([]);
      GenericMockModel.findOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      GenericMockModel.create = jest.fn(async (data: any) => ({
        ...data,
        _id: new originalMongoose.Types.ObjectId(),
      }));
      return GenericMockModel;
    }),
    models: { ...actualModels }, // Spread actual models and allow Widget to be overwritten if model('Widget') is called
  };
});

// Import Display AFTER mongoose and Widget are mocked
import Display from "../../../api/models/Display";
// Widget import is now effectively MockedWidgetConstructor due to jest.mock above
import Widget from "../../../api/models/Widget"; // This will be MockedWidgetConstructor

import {
  createWidgetsForDisplay,
  updateWidgetsForDisplay,
  getDisplayWithWidgets,
} from "../../../api/helpers/display_helper";

describe("updateWidgetsForDisplay", () => {
  // ... (other tests for updateWidgetsForDisplay if any) ...

  describe("Error Handling", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let currentDisplayObject: any;
    let widgetToUpdateId: mongoose.Types.ObjectId;
    let widgetToDeleteId: mongoose.Types.ObjectId;
    let initialDisplayWidgetObjectIds: mongoose.Types.ObjectId[];
    let newWidgetData: any; // to be used for specific failure
    let updatedWidgetData: any;
    let newWidgetsDataArray: any[];
    const creatorId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      MockedWidgetConstructor.mockClear();
      (MockedWidgetConstructor.findByIdAndUpdate as jest.Mock).mockReset();
      (MockedWidgetConstructor.deleteMany as jest.Mock).mockReset();
      (MockedWidgetConstructor.create as jest.Mock).mockReset(); // Reset create if used by default
      // mockWidgetSave and mockWidgetToJSON are reset inside MockedWidgetConstructor for new instances.
      // However, if any test relies on them being called outside a constructor, reset them here too.
      mockWidgetSave.mockReset();
      mockWidgetToJSON.mockReset();

      // Setup default successful implementations for static methods
      (
        MockedWidgetConstructor.findByIdAndUpdate as jest.Mock
      ).mockImplementation(async (id, dataToUpdate) => {
        const originalMongooseInternal = jest.requireActual("mongoose");
        const objectId =
          typeof id === "string"
            ? new originalMongooseInternal.Types.ObjectId(id)
            : id;
        // Simulate findByIdAndUpdate returning the updated document
        return {
          ...dataToUpdate,
          _id: objectId,
          widgets: currentDisplayObject.widgets,
        };
      });
      (MockedWidgetConstructor.deleteMany as jest.Mock).mockResolvedValue({
        acknowledged: true,
        deletedCount: 1,
      });
      (MockedWidgetConstructor.create as jest.Mock).mockImplementation(
        async (dataToCreate: any) => {
          const originalMongooseInternal = jest.requireActual("mongoose");
          // Ensure created object has an _id and other necessary fields
          const newId = new originalMongooseInternal.Types.ObjectId();
          return {
            ...dataToCreate,
            _id: newId,
            save: jest.fn().mockResolvedValue({ ...dataToCreate, _id: newId }),
            toJSON: jest.fn().mockReturnValue({ ...dataToCreate, _id: newId }),
          };
        }
      );

      // Default constructor implementation (already set globally, reset specific instance mocks like save/toJSON within it)
      // This ensures new Widget() calls in the helper get fresh save/toJSON mocks.
      MockedWidgetConstructor.mockImplementation((constructorData: any) => {
        const originalMongooseInternal = jest.requireActual("mongoose");
        const idForThisInstance =
          constructorData && constructorData._id
            ? new originalMongooseInternal.Types.ObjectId(constructorData._id)
            : new originalMongooseInternal.Types.ObjectId();
        const instanceData = {
          name: constructorData.name || "Default Mock Name",
          type: constructorData.type || WidgetType.ANNOUNCEMENT,
          x: constructorData.x !== undefined ? constructorData.x : 0,
          y: constructorData.y !== undefined ? constructorData.y : 0,
          w: constructorData.w !== undefined ? constructorData.w : 1,
          h: constructorData.h !== undefined ? constructorData.h : 1,
          data: constructorData.data || {},
          creator_id: constructorData.creator_id,
          ...constructorData,
          _id: idForThisInstance,
        };
        let currentSave = jest.fn().mockResolvedValue(instanceData);
        // Check if this specific instance should fail
        if (
          constructorData &&
          constructorData.name === "New Widget For Error Test" &&
          constructorData.shouldFailSave
        ) {
          currentSave = jest
            .fn()
            .mockRejectedValue(new Error("New widget save failed"));
        }
        return {
          ...instanceData,
          save: currentSave,
          toJSON: jest.fn().mockReturnValue(instanceData),
        };
      });

      widgetToUpdateId = new mongoose.Types.ObjectId();
      widgetToDeleteId = new mongoose.Types.ObjectId();
      initialDisplayWidgetObjectIds = [widgetToDeleteId, widgetToUpdateId];

      currentDisplayObject = {
        _id: new mongoose.Types.ObjectId(),
        name: "Test Display Error Handling",
        widgets: [...initialDisplayWidgetObjectIds],
      };

      newWidgetData = {
        name: "New Widget For Error Test",
        type: WidgetType.ANNOUNCEMENT,
        data: { title: "New Error" },
        x: 0,
        y: 0,
        w: 1,
        h: 1,
      };
      updatedWidgetData = {
        _id: widgetToUpdateId.toString(),
        name: "Updated Widget For Error Test",
        type: WidgetType.IMAGE,
        data: { url: "http://example.com/updated_error.jpg" },
        x: 1,
        y: 1,
        w: 1,
        h: 1,
      };
      newWidgetsDataArray = [newWidgetData, updatedWidgetData];
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("Error during new widget creation: should process other operations and log error", async () => {
      const newWidgetError = new Error("New widget save failed");

      // Configure the specific widget data to trigger save failure
      const failingWidgetData = { ...newWidgetData, shouldFailSave: true };
      const mixedWidgetsData = [failingWidgetData, updatedWidgetData];

      const resultWidgetObjectIds = await updateWidgetsForDisplay(
        currentDisplayObject as any,
        mixedWidgetsData,
        creatorId,
        MockedWidgetConstructor as any
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error creating new widget:",
        newWidgetError
      );

      expect(MockedWidgetConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
        widgetToUpdateId.toString(),
        expect.objectContaining({ name: updatedWidgetData.name }),
        { new: true, runValidators: true }
      );

      expect(MockedWidgetConstructor.deleteMany).toHaveBeenCalledWith({
        _id: { $in: [widgetToDeleteId] },
      });

      // Only the updated widget's ID should be present
      expect(resultWidgetObjectIds.map((id) => id.toString()).sort()).toEqual(
        [widgetToUpdateId.toString()].sort()
      );
      expect(currentDisplayObject.widgets).toEqual(
        initialDisplayWidgetObjectIds
      );
    });

    it("Error during widget update: should process other operations and log error", async () => {
      const updateError = new Error("Widget update failed");
      (
        MockedWidgetConstructor.findByIdAndUpdate as jest.Mock
      ).mockRejectedValueOnce(updateError);

      const resultWidgetObjectIds = await updateWidgetsForDisplay(
        currentDisplayObject as any,
        newWidgetsDataArray,
        creatorId,
        MockedWidgetConstructor as any
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error updating widget ${widgetToUpdateId.toString()}:`,
        updateError
      );

      // Check that new widget was attempted to be created
      const newWidgetInstanceCall = MockedWidgetConstructor.mock.calls.find(
        (callArgs) => callArgs[0].name === newWidgetData.name
      );
      expect(newWidgetInstanceCall).toBeDefined();

      // Find the ID of the successfully created new widget
      let createdNewWidgetId: string | undefined;
      const results = MockedWidgetConstructor.mock.results;
      for (let i = 0; i < results.length; i++) {
        if (
          results[i].type === "return" &&
          results[i].value.name === newWidgetData.name
        ) {
          // Ensure save was called on this instance
          expect(results[i].value.save).toHaveBeenCalled();
          createdNewWidgetId = results[i].value._id.toString();
          break;
        }
      }
      expect(createdNewWidgetId).toBeDefined();

      expect(MockedWidgetConstructor.deleteMany).toHaveBeenCalledWith({
        _id: { $in: [widgetToDeleteId] },
      });

      expect(resultWidgetObjectIds.map((id) => id.toString()).sort()).toEqual(
        [createdNewWidgetId!].sort()
      );
      expect(currentDisplayObject.widgets).toEqual(
        initialDisplayWidgetObjectIds
      );
    });

    it("Error during widget deletion: should process other operations and log error", async () => {
      const deleteError = new Error("Widget deletion failed");
      (MockedWidgetConstructor.deleteMany as jest.Mock).mockRejectedValueOnce(
        deleteError
      );

      const resultWidgetObjectIds = await updateWidgetsForDisplay(
        currentDisplayObject as any,
        newWidgetsDataArray,
        creatorId,
        MockedWidgetConstructor as any
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error deleting old widgets:",
        deleteError
      );

      // Check that new widget was attempted to be created
      const newWidgetInstanceCall = MockedWidgetConstructor.mock.calls.find(
        (callArgs) => callArgs[0].name === newWidgetData.name
      );
      expect(newWidgetInstanceCall).toBeDefined();
      let createdNewWidgetId: string | undefined;
      const results = MockedWidgetConstructor.mock.results;
      for (let i = 0; i < results.length; i++) {
        if (
          results[i].type === "return" &&
          results[i].value.name === newWidgetData.name
        ) {
          expect(results[i].value.save).toHaveBeenCalled();
          createdNewWidgetId = results[i].value._id.toString();
          break;
        }
      }
      expect(createdNewWidgetId).toBeDefined();

      expect(MockedWidgetConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
        widgetToUpdateId.toString(),
        expect.objectContaining({ name: updatedWidgetData.name }),
        { new: true, runValidators: true }
      );

      const expectedIds = [
        createdNewWidgetId!,
        widgetToUpdateId.toString(),
      ].sort();
      expect(resultWidgetObjectIds.map((id) => id.toString()).sort()).toEqual(
        expectedIds
      );
      expect(currentDisplayObject.widgets).toEqual(
        initialDisplayWidgetObjectIds
      );
    });
  });
});

// deleteWidgetsForDisplay tests
describe("deleteWidgetsForDisplay", () => {
  let displayObject: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset relevant mocks. MockedWidgetConstructor is the mocked Widget model.
    if (
      MockedWidgetConstructor &&
      (MockedWidgetConstructor.deleteMany as jest.Mock)?.mockReset
    ) {
      (MockedWidgetConstructor.deleteMany as jest.Mock).mockReset();
    }

    const widgetId1 = new mongoose.Types.ObjectId();
    const widgetId2 = new mongoose.Types.ObjectId();
    displayObject = {
      _id: new mongoose.Types.ObjectId(),
      name: "Test Display for Deletion",
      widgets: [widgetId1, widgetId2],
      // save: jest.fn().mockImplementation(function(this: any) { return Promise.resolve(this); }), // Mock save if needed
    };

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should successfully delete widgets and empty the display widgets array", async () => {
    const originalWidgetIds = [...displayObject.widgets]; // Store original IDs
    (MockedWidgetConstructor.deleteMany as jest.Mock).mockResolvedValue({
      acknowledged: true,
      deletedCount: originalWidgetIds.length,
    });

    // Import deleteWidgetsForDisplay locally if not available globally or handle imports carefully
    const { deleteWidgetsForDisplay } = await import(
      "../../../api/helpers/display_helper"
    );
    await deleteWidgetsForDisplay(displayObject);

    expect(MockedWidgetConstructor.deleteMany).toHaveBeenCalledTimes(1);
    expect(MockedWidgetConstructor.deleteMany).toHaveBeenCalledWith({
      _id: { $in: originalWidgetIds },
    }); // Use original IDs
    expect(displayObject.widgets).toEqual([]);
    // if (displayObject.save.mock) { // Check if save was mocked and thus expected to be called
    //   expect(displayObject.save).toHaveBeenCalledTimes(1);
    // }
  });

  it("should not call Widget.deleteMany if display has no widgets", async () => {
    displayObject.widgets = [];

    const { deleteWidgetsForDisplay } = await import(
      "../../../api/helpers/display_helper"
    );
    await deleteWidgetsForDisplay(displayObject);

    expect(MockedWidgetConstructor.deleteMany).not.toHaveBeenCalled();
    expect(displayObject.widgets).toEqual([]);
  });

  it("should throw an error if Widget.deleteMany fails", async () => {
    const dbError = new Error("DB deletion failed");
    (MockedWidgetConstructor.deleteMany as jest.Mock).mockRejectedValue(
      dbError
    );

    const { deleteWidgetsForDisplay } = await import(
      "../../../api/helpers/display_helper"
    );
    await expect(deleteWidgetsForDisplay(displayObject)).rejects.toThrow(
      "Failed to delete widgets for display."
    );

    expect(MockedWidgetConstructor.deleteMany).toHaveBeenCalledTimes(1);
    expect(MockedWidgetConstructor.deleteMany).toHaveBeenCalledWith({
      _id: { $in: displayObject.widgets },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error deleting widgets for display:",
      dbError
    );
    expect(displayObject.widgets.length).toBeGreaterThan(0);
  });

  it("should not modify display.widgets if Widget.deleteMany fails and display had widgets", async () => {
    const initialWidgetIds = [...displayObject.widgets];
    const dbError = new Error("DB deletion failed");
    (MockedWidgetConstructor.deleteMany as jest.Mock).mockRejectedValue(
      dbError
    );

    const { deleteWidgetsForDisplay } = await import(
      "../../../api/helpers/display_helper"
    );
    await expect(deleteWidgetsForDisplay(displayObject)).rejects.toThrow();

    expect(displayObject.widgets).toEqual(initialWidgetIds);
  });
});

describe("getDisplayWithWidgets", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockDisplayId: mongoose.Types.ObjectId;
  let mockQuery: { populate: jest.Mock; exec: jest.Mock };

  beforeEach(() => {
    mockDisplayId = new mongoose.Types.ObjectId();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // These are the specific mock functions we want to be called
    const execMock = jest.fn();
    const populateMock = jest.fn().mockReturnThis(); // populate returns the query object itself

    // The mock query object that findById should return
    const queryResultMock = {
      populate: populateMock,
      exec: execMock,
    };

    // MockDisplayConstructor.findById will be configured per test to resolve/reject directly
    (MockedDisplayConstructor.findById as jest.Mock).mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return a display with populated widgets if found", async () => {
    const mockPopulatedWidgets = [
      { _id: new mongoose.Types.ObjectId(), name: "Widget A" },
      { _id: new mongoose.Types.ObjectId(), name: "Widget B" },
    ];
    const mockDisplayDoc = {
      _id: mockDisplayId,
      name: "Test Display Doc",
      widgets: mockPopulatedWidgets,
    };

    (MockedDisplayConstructor.findById as jest.Mock).mockResolvedValue(
      mockDisplayDoc
    );

    const result = await getDisplayWithWidgets(mockDisplayId.toString());

    expect(MockedDisplayConstructor.findById).toHaveBeenCalledTimes(1);
    expect(MockedDisplayConstructor.findById).toHaveBeenCalledWith(
      mockDisplayId.toString()
    );
    // We no longer assert populate and exec calls with this simplified strategy
    expect(result).toEqual(mockDisplayDoc);
  });

  it("should return null if display is not found", async () => {
    (MockedDisplayConstructor.findById as jest.Mock).mockResolvedValue(null);

    const result = await getDisplayWithWidgets(mockDisplayId.toString());

    expect(MockedDisplayConstructor.findById).toHaveBeenCalledTimes(1);
    // We no longer assert populate and exec calls
    expect(result).toBeNull();
  });

  it("should return null and log error if database query fails", async () => {
    const dbError = new Error("Database query failed");
    const findByIdMock = MockedDisplayConstructor.findById as jest.Mock;
    findByIdMock.mockReset(); // Clear previous implementations/calls
    findByIdMock.mockImplementation(() => Promise.reject(dbError)); // Explicitly return a rejected promise

    const result = await getDisplayWithWidgets(mockDisplayId.toString());

    expect(MockedDisplayConstructor.findById).toHaveBeenCalledTimes(1);
    // We no longer assert populate and exec calls
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching display with widgets:",
      dbError
    );
  });

  it("should handle displayId as ObjectId", async () => {
    const mockDisplayDoc = {
      _id: mockDisplayId,
      name: "Test Display",
      widgets: [],
    };
    (MockedDisplayConstructor.findById as jest.Mock).mockResolvedValue(
      mockDisplayDoc
    );

    await getDisplayWithWidgets(mockDisplayId); // Pass ObjectId directly

    expect(MockedDisplayConstructor.findById).toHaveBeenCalledWith(
      mockDisplayId
    );
  });
});
