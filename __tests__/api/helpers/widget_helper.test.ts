import { addWidget, deleteWidget } from "../../../api/helpers/widget_helper"; // Adjusted path assuming widget_helper.ts is in root of helpers
import Display from "../../../api/models/Display"; // Adjusted path
import { Request, Response } from "express"; // For typing req/res

// Mock models
jest.mock("../../../api/models/Display");
jest.mock("../../../api/models/Widget");
jest.mock("../../../api/models/Slideshow");

import mongoose from 'mongoose'; // Import mongoose for ObjectId
import { WidgetType } from '../../../api/models/Widget'; // Import WidgetType
import {
  validateWidgetData,
  removeWidgetFromAllDisplays,
  deleteWidgetAndCleanReferences
} from '../../../api/helpers/widget_helper'; // Import the new functions
import Widget from '../../../api/models/Widget'; // For mocking
import Slideshow from '../../../api/models/Slideshow'; // For mocking

// Define interfaces for cleaner typing
interface MockWidgetData {
  _id: string | { equals: (val: string) => boolean };
  display: string;
  // Add other widget properties if necessary
}

interface MockDisplayInstance {
  _id: string;
  widgets: string[] | any[]; // Allow any[] for flexibility with mock objects having .equals
  save: jest.Mock<Promise<any>>; // Mock function returning a Promise
  // Add other display properties if necessary
}

describe("widget_helper", () => {
  let mockReq: Partial<Request>; // Use Partial for mocks, can be more specific if needed
  let mockRes: Partial<Response>; // Use Partial for mocks

  beforeEach(() => {
    mockReq = {}; // Minimal mock
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks before each test
    (Display.findById as jest.Mock).mockClear();
    if (Display.prototype.save) { // Ensure save is a mock only if it exists (it should due to jest.mock)
        (Display.prototype.save as jest.Mock).mockClear();
    } else {
        Display.prototype.save = jest.fn();
    }
    (Widget.findById as jest.Mock)?.mockClear();
    (Widget.findByIdAndDelete as jest.Mock)?.mockClear();
    (Display.updateMany as jest.Mock)?.mockClear();
    (Slideshow.findById as jest.Mock)?.mockClear();
  });

  // Existing tests for addWidget and deleteWidget remain here...
  // ... (tests for addWidget and deleteWidget) ...

  describe("addWidget", () => {
    it("should add a widget to a display and resolve successfully", async () => {
      const mockWidgetData: MockWidgetData = {
        _id: "widget123",
        display: "display123",
      };
      // Define mockDisplayInstance before it's used in save: jest.fn().mockResolvedValue(mockDisplayInstance),
      let mockDisplayInstance: MockDisplayInstance;

      mockDisplayInstance = {
        _id: "display123",
        widgets: [],
        save: jest.fn(), // Initialize save as a mock function
      };
      // Now that mockDisplayInstance is defined, set its resolved value
      mockDisplayInstance.save.mockResolvedValue(mockDisplayInstance);
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance);
      (mockDisplayInstance.save as jest.Mock).mockResolvedValue(
        mockDisplayInstance
      );

      await expect(
        addWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).resolves.toEqual({ success: true, display: mockDisplayInstance });

      expect(Display.findById).toHaveBeenCalledWith("display123");
      expect(mockDisplayInstance.widgets).toContain("widget123");
      expect(mockDisplayInstance.save).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should return 404 via res if display not found", async () => {
      const mockWidgetData: MockWidgetData = {
        _id: "widget123",
        display: "display_not_found",
      };
      (Display.findById as jest.Mock).mockResolvedValue(null);

      await addWidget(mockReq as Request, mockRes as Response, mockWidgetData);

      expect(Display.findById).toHaveBeenCalledWith("display_not_found");
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Display not found" });
    });

    it("should return 500 via res if display save fails (returns null/false)", async () => {
      const mockWidgetData: MockWidgetData = {
        _id: "widget123",
        display: "display123",
      };
      const mockDisplayInstance: MockDisplayInstance = {
        _id: "display123",
        widgets: [],
        save: jest.fn().mockResolvedValue(null), // Simulate failed save
      };
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance);

      await addWidget(mockReq as Request, mockRes as Response, mockWidgetData);

      expect(mockDisplayInstance.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Display not saved" });
    });

    it("should reject or allow error to propagate for DB findById errors", async () => {
      const mockWidgetData: MockWidgetData = {
        _id: "widget123",
        display: "display123",
      };
      const error = new Error("DB findById error");
      (Display.findById as jest.Mock).mockRejectedValue(error);

      await expect(
        addWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow("DB findById error");
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should reject or allow error to propagate for DB save errors", async () => {
      const mockWidgetData: MockWidgetData = {
        _id: "widget123",
        display: "display123",
      };
      const mockDisplayInstance: MockDisplayInstance = {
        _id: "display123",
        widgets: [],
        save: jest.fn().mockRejectedValue(new Error("DB save error")),
      };
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance);

      await expect(
        addWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow("DB save error");
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should call res.status(400) if widgetData is invalid (missing display)", async () => {
      const invalidWidgetData: any = { _id: "widget123" }; // Missing display
      await addWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid widget data provided to addWidget helper.",
      });
    });

    it("should call res.status(400) if widgetData is invalid (missing _id)", async () => {
      const invalidWidgetData: any = { display: "display123" }; // Missing _id
      await addWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid widget data provided to addWidget helper.",
      });
    });
  });

  describe("deleteWidget", () => {
    it("should delete a widget from a display and resolve successfully", async () => {
      const mockWidgetId = "widget123";
      const mockWidgetData: MockWidgetData = { // Changed _id to be a string
        _id: mockWidgetId,
        display: "display123",
      };
      // Define mockDisplayInstance before it's used in mockResolvedValue
      let mockDisplayInstance: MockDisplayInstance;

      mockDisplayInstance = {
        _id: "display123",
        widgets: [mockWidgetId, "widget456"],
        save: jest.fn(), // Initialize save as a mock function
      };
      // Now that mockDisplayInstance is defined, set its resolved value
      mockDisplayInstance.save.mockResolvedValue(mockDisplayInstance);
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance);
      (mockDisplayInstance.save as jest.Mock).mockResolvedValue(
        mockDisplayInstance
      );

      await expect(
        deleteWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).resolves.toEqual({ success: true, display: mockDisplayInstance });

      expect(Display.findById).toHaveBeenCalledWith("display123");
      expect(mockDisplayInstance.widgets.length).toBe(1);
      expect(mockDisplayInstance.widgets[0]).toBe("widget456");
      expect(mockDisplayInstance.save).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should return 404 via res if display not found for delete", async () => {
      const mockWidgetData: MockWidgetData = {
        _id: "widget123",
        display: "display_not_found",
      };
      (Display.findById as jest.Mock).mockResolvedValue(null);

      await deleteWidget(
        mockReq as Request,
        mockRes as Response,
        mockWidgetData
      );

      expect(Display.findById).toHaveBeenCalledWith("display_not_found");
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Display not found" });
    });

    it("should reject or allow error to propagate for DB findById errors during delete", async () => {
      const mockWidgetData: MockWidgetData = {
        _id: "widget123",
        display: "display123",
      };
      const error = new Error("DB findById error for delete");
      (Display.findById as jest.Mock).mockRejectedValue(error);

      await expect(
        deleteWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow("DB findById error for delete");
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should reject or allow error to propagate for DB save errors during delete", async () => {
      const mockWidgetData: MockWidgetData = { // _id is now a string
        _id: "widget123",
        display: "display123",
      };
      const mockDisplayInstance: MockDisplayInstance = {
        _id: "display123",
        widgets: ["widget123"],
        save: jest
          .fn()
          .mockRejectedValue(new Error("DB save error for delete")),
      };
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance);

      await expect(
        deleteWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow("DB save error for delete");
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should call res.status(400) if widgetData is invalid for delete (missing display)", async () => {
      const invalidWidgetData: any = { _id: "widget123" }; // Missing display
      await deleteWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid widget data provided to deleteWidget helper.",
      });
    });

    it("should call res.status(400) if widgetData is invalid for delete (missing _id)", async () => {
      const invalidWidgetData: any = { display: "display123" }; // Missing _id
      await deleteWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid widget data provided to deleteWidget helper.",
      });
    });
  });

  describe("validateWidgetData", () => {
    beforeEach(() => {
        (Slideshow.findById as jest.Mock).mockReset(); // Reset Slideshow mock specifically for these tests
    });

    it("should return true for valid ANNOUNCEMENT data", async () => {
      const data = { title: "Hello", message: "World" };
      await expect(validateWidgetData(WidgetType.ANNOUNCEMENT, data)).resolves.toBe(true);
    });

    it("should throw error for invalid ANNOUNCEMENT data (missing title)", async () => {
      const data = { message: "World" };
      await expect(validateWidgetData(WidgetType.ANNOUNCEMENT, data)).rejects.toThrow(
        "Invalid data for Announcement widget: title and message must be strings."
      );
    });

    it("should return true for valid IMAGE data", async () => {
        const data = { url: "http://example.com/image.png" };
        await expect(validateWidgetData(WidgetType.IMAGE, data)).resolves.toBe(true);
    });

    it("should throw for invalid IMAGE data (bad extension)", async () => {
        const data = { url: "http://example.com/image.txt" };
        await expect(validateWidgetData(WidgetType.IMAGE, data)).rejects.toThrow(
            "Invalid data for Image widget: URL must be a valid image URL (jpeg, jpg, gif, png)."
        );
    });

    it("should return true for valid SLIDESHOW data with existing slideshow_id", async () => {
        const data = { slideshow_id: new mongoose.Types.ObjectId().toHexString() };
        (Slideshow.findById as jest.Mock).mockResolvedValue({ _id: data.slideshow_id }); // Simulate slideshow exists
        await expect(validateWidgetData(WidgetType.SLIDESHOW, data)).resolves.toBe(true);
        expect(Slideshow.findById).toHaveBeenCalledWith(data.slideshow_id);
    });

    it("should throw for SLIDESHOW data with non-existing slideshow_id", async () => {
        const data = { slideshow_id: new mongoose.Types.ObjectId().toHexString() };
        (Slideshow.findById as jest.Mock).mockResolvedValue(null); // Simulate slideshow does not exist
        await expect(validateWidgetData(WidgetType.SLIDESHOW, data)).rejects.toThrow(
            `Slideshow with id ${data.slideshow_id} not found.`
        );
    });

    it("should throw for SLIDESHOW data with invalid slideshow_id format", async () => {
        const data = { slideshow_id: "invalid-id" };
        await expect(validateWidgetData(WidgetType.SLIDESHOW, data)).rejects.toThrow(
            "Invalid data for Slideshow widget: slideshow_id must be a valid ObjectId string."
        );
    });

    it("should return true for EMPTY widget type with any data (or no data)", async () => {
        await expect(validateWidgetData(WidgetType.EMPTY, {})).resolves.toBe(true);
        await expect(validateWidgetData(WidgetType.EMPTY, null)).resolves.toBe(true);
    });

    it("should warn and return true for unknown widget types", async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-ignore testing unknown type
        await expect(validateWidgetData("UNKNOWN_TYPE" as WidgetType, {})).resolves.toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith("Validation not implemented for widget type: UNKNOWN_TYPE");
        consoleWarnSpy.mockRestore();
    });

    // Add tests for CONGRATS
    it("should return true for valid CONGRATS data", async () => {
      const data = { title: "Congrats!", message: "You did it!", recipient: "Team" };
      await expect(validateWidgetData(WidgetType.CONGRATS, data)).resolves.toBe(true);
    });
    it("should throw for invalid CONGRATS data (missing recipient)", async () => {
      const data = { title: "Congrats!", message: "You did it!" };
      await expect(validateWidgetData(WidgetType.CONGRATS, data)).rejects.toThrow("Invalid data for Congrats widget: title, message, and recipient must be strings.");
    });

    // Add tests for LIST
    it("should return true for valid LIST data", async () => {
      const data = { title: "My List", items: ["item1", "item2"] };
      await expect(validateWidgetData(WidgetType.LIST, data)).resolves.toBe(true);
    });
    it("should throw for invalid LIST data (items not array)", async () => {
      const data = { title: "My List", items: "not-an-array" };
      await expect(validateWidgetData(WidgetType.LIST, data)).rejects.toThrow("Invalid data for List widget: items must be an array of strings.");
    });
    it("should throw for invalid LIST data (invalid title type)", async () => {
      const data = { title: 123, items: ["item1"] };
      await expect(validateWidgetData(WidgetType.LIST, data)).rejects.toThrow("Invalid data for List widget: title, if provided, must be a string.");
    });

    // Add tests for WEATHER
    it("should return true for valid WEATHER data (string location)", async () => {
      const data = { location: "London", unit: "metric" };
      await expect(validateWidgetData(WidgetType.WEATHER, data)).resolves.toBe(true);
    });
    it("should return true for valid WEATHER data (object location)", async () => {
      const data = { location: { city: "Paris" }, unit: "imperial" };
      await expect(validateWidgetData(WidgetType.WEATHER, data)).resolves.toBe(true);
    });
    it("should throw for invalid WEATHER data (missing location)", async () => {
      const data = { unit: "metric" };
      await expect(validateWidgetData(WidgetType.WEATHER, data)).rejects.toThrow("Invalid data for Weather widget: location (string or object with city) is required.");
    });
    it("should throw for invalid WEATHER data (invalid unit)", async () => {
      const data = { location: "Berlin", unit: "kelvin" };
      await expect(validateWidgetData(WidgetType.WEATHER, data)).rejects.toThrow('Invalid data for Weather widget: unit must be "metric" or "imperial".');
    });

    // Add tests for WEB
    it("should return true for valid WEB data", async () => {
      const data = { url: "http://example.com" };
      await expect(validateWidgetData(WidgetType.WEB, data)).resolves.toBe(true);
    });
    it("should throw for invalid WEB data (not http/https)", async () => {
      const data = { url: "ftp://example.com" };
      await expect(validateWidgetData(WidgetType.WEB, data)).rejects.toThrow("Invalid data for Web widget: URL must be a valid web URL.");
    });

    // Add tests for YOUTUBE
    it("should return true for valid YOUTUBE data", async () => {
      const data = { video_id: "dQw4w9WgXcQ" };
      await expect(validateWidgetData(WidgetType.YOUTUBE, data)).resolves.toBe(true);
    });
    it("should throw for invalid YOUTUBE data (video_id not string)", async () => {
      const data = { video_id: 12345 };
      await expect(validateWidgetData(WidgetType.YOUTUBE, data)).rejects.toThrow("Invalid data for YouTube widget: video_id must be a string.");
    });

  });

  describe("removeWidgetFromAllDisplays", () => {
    it("should call Display.updateMany with correct arguments (ObjectId)", async () => {
      const widgetId = new mongoose.Types.ObjectId();
      (Display.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 }); // Simulate success

      await removeWidgetFromAllDisplays(widgetId);

      expect(Display.updateMany).toHaveBeenCalledWith(
        { widgets: widgetId },
        { $pull: { widgets: widgetId } }
      );
    });

    it("should call Display.updateMany with correct arguments (string ID)", async () => {
      const widgetIdString = new mongoose.Types.ObjectId().toHexString();
      const widgetObjectId = new mongoose.Types.ObjectId(widgetIdString);
      (Display.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 });

      await removeWidgetFromAllDisplays(widgetIdString);

      expect(Display.updateMany).toHaveBeenCalledWith(
        { widgets: widgetObjectId },
        { $pull: { widgets: widgetObjectId } }
      );
    });

    it("should throw an error if Display.updateMany fails", async () => {
      const widgetId = new mongoose.Types.ObjectId();
      const dbError = new Error("DB updateMany failed");
      (Display.updateMany as jest.Mock).mockRejectedValue(dbError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(removeWidgetFromAllDisplays(widgetId)).rejects.toThrow("Failed to remove widget from displays.");
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Error removing widget ${widgetId} from displays:`, dbError);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteWidgetAndCleanReferences", () => {
    const widgetObjectId = new mongoose.Types.ObjectId();
    const widgetIdString = widgetObjectId.toHexString();
    const mockWidgetDoc = { _id: widgetObjectId, name: "Test Widget" };

    it("should delete widget and clean references successfully (ObjectId)", async () => {
      (Widget.findById as jest.Mock).mockResolvedValue(mockWidgetDoc);
      (Display.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 });
      (Widget.findByIdAndDelete as jest.Mock).mockResolvedValue(mockWidgetDoc);

      const result = await deleteWidgetAndCleanReferences(widgetObjectId);

      expect(Widget.findById).toHaveBeenCalledWith(widgetObjectId);
      expect(Display.updateMany).toHaveBeenCalledWith({ widgets: widgetObjectId }, { $pull: { widgets: widgetObjectId } });
      expect(Widget.findByIdAndDelete).toHaveBeenCalledWith(widgetObjectId);
      expect(result).toEqual(mockWidgetDoc);
    });

    it("should delete widget and clean references successfully (string ID)", async () => {
      (Widget.findById as jest.Mock).mockResolvedValue(mockWidgetDoc);
      (Display.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 });
      (Widget.findByIdAndDelete as jest.Mock).mockResolvedValue(mockWidgetDoc);

      const result = await deleteWidgetAndCleanReferences(widgetIdString);

      expect(Widget.findById).toHaveBeenCalledWith(widgetObjectId); // Should be converted to ObjectId
      expect(Display.updateMany).toHaveBeenCalledWith({ widgets: widgetObjectId }, { $pull: { widgets: widgetObjectId } });
      expect(Widget.findByIdAndDelete).toHaveBeenCalledWith(widgetObjectId);
      expect(result).toEqual(mockWidgetDoc);
    });

    it("should return null if widget not found", async () => {
      (Widget.findById as jest.Mock).mockResolvedValue(null);

      const result = await deleteWidgetAndCleanReferences(widgetObjectId); // Use widgetObjectId

      expect(result).toBeNull();
      expect(Display.updateMany).not.toHaveBeenCalled();
      expect(Widget.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it("should throw error if removeWidgetFromAllDisplays fails", async () => {
      (Widget.findById as jest.Mock).mockResolvedValue(mockWidgetDoc);
      const updateError = new Error("Failed to update displays");
      (Display.updateMany as jest.Mock).mockRejectedValue(updateError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(deleteWidgetAndCleanReferences(widgetObjectId)).rejects.toThrow( // Use widgetObjectId
        `Failed to delete widget ${widgetObjectId} and clean references.`
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error deleting widget and cleaning references:", expect.any(Error)); // The error is wrapped
      expect(Widget.findByIdAndDelete).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should throw error if Widget.findByIdAndDelete fails", async () => {
      (Widget.findById as jest.Mock).mockResolvedValue(mockWidgetDoc);
      (Display.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 });
      const deleteError = new Error("Failed to delete widget");
      (Widget.findByIdAndDelete as jest.Mock).mockRejectedValue(deleteError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(deleteWidgetAndCleanReferences(widgetObjectId)).rejects.toThrow( // Use widgetObjectId
        `Failed to delete widget ${widgetObjectId} and clean references.`
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error deleting widget and cleaning references:", deleteError);
      consoleErrorSpy.mockRestore();
    });
  });
});
