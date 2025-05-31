import mongoose from "mongoose";
import Display, { IDisplay } from "../../../api/models/Display";
import Widget, { IWidget, WidgetType } from "../../../api/models/Widget";
import {
  createWidgetsForDisplay,
  updateWidgetsForDisplay,
  deleteWidgetsForDisplay,
  getDisplayWithWidgets,
} from "../../../api/helpers/display_helper";

const MONGODB_URI =
  "mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

describe("Display Helper Functions", () => {
  let creatorId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    creatorId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await Display.deleteMany({});
    await Widget.deleteMany({});
  });

  describe("createWidgetsForDisplay", () => {
    it("should create widgets and add them to display", async () => {
      // Create a test display
      const display = await Display.create({
        name: "Test Display",
        description: "Test Description",
        creator_id: creatorId,
        widgets: [],
        layout: "spaced",
        statusBar: {
          enabled: true,
          elements: ["clock"],
        },
      });

      const widgetsData = [
        {
          name: "Test Widget 1",
          type: WidgetType.ANNOUNCEMENT,
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          data: { title: "Test Title 1" },
        },
        {
          name: "Test Widget 2",
          type: WidgetType.IMAGE,
          x: 1,
          y: 0,
          w: 1,
          h: 1,
          data: { url: "http://example.com/image.jpg" },
        },
      ];

      const widgetIds = await createWidgetsForDisplay(
        display,
        widgetsData,
        creatorId
      );

      expect(widgetIds).toHaveLength(2);
      expect(display.widgets).toHaveLength(2);

      // Verify widgets were created in database
      const createdWidgets = await Widget.find({
        _id: { $in: widgetIds },
      });
      expect(createdWidgets).toHaveLength(2);
      expect(createdWidgets[0].name).toBe("Test Widget 1");
      expect(createdWidgets[1].name).toBe("Test Widget 2");
    });

    it("should handle empty widgets data", async () => {
      const display = await Display.create({
        name: "Test Display",
        description: "Test Description",
        creator_id: creatorId,
        widgets: [],
        layout: "spaced",
        statusBar: {
          enabled: true,
          elements: [],
        },
      });

      const widgetIds = await createWidgetsForDisplay(display, [], creatorId);

      expect(widgetIds).toHaveLength(0);
      expect(display.widgets).toHaveLength(0);
    });
  });

  describe("updateWidgetsForDisplay", () => {
    let display: IDisplay;
    let existingWidget1: IWidget;
    let existingWidget2: IWidget;

    beforeEach(async () => {
      // Create test display
      display = await Display.create({
        name: "Test Display",
        description: "Test Description",
        creator_id: creatorId,
        widgets: [],
        layout: "spaced",
        statusBar: {
          enabled: true,
          elements: [],
        },
      });

      // Create existing widgets
      existingWidget1 = await Widget.create({
        name: "Existing Widget 1",
        type: WidgetType.ANNOUNCEMENT,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        data: { title: "Original Title 1" },
        creator_id: creatorId,
      });

      existingWidget2 = await Widget.create({
        name: "Existing Widget 2",
        type: WidgetType.IMAGE,
        x: 1,
        y: 0,
        w: 1,
        h: 1,
        data: { url: "http://example.com/original.jpg" },
        creator_id: creatorId,
      });

      // Add widgets to display
      display.widgets = [
        existingWidget1._id as mongoose.Types.ObjectId,
        existingWidget2._id as mongoose.Types.ObjectId,
      ];
      await display.save();
    });

    it("should update existing widgets and create new ones", async () => {
      const widgetsData = [
        // Update existing widget
        {
          _id: (existingWidget1._id as mongoose.Types.ObjectId).toString(),
          name: "Updated Widget 1",
          type: WidgetType.ANNOUNCEMENT,
          x: 0,
          y: 0,
          w: 2,
          h: 1,
          data: { title: "Updated Title 1" },
        },
        // Create new widget
        {
          name: "New Widget",
          type: WidgetType.WEATHER,
          x: 2,
          y: 0,
          w: 1,
          h: 1,
          data: { location: "Jakarta" },
        },
      ];

      const resultWidgetIds = await updateWidgetsForDisplay(
        display,
        widgetsData,
        creatorId.toString()
      );

      expect(resultWidgetIds).toHaveLength(2);

      // Check updated widget
      const updatedWidget = await Widget.findById(existingWidget1._id);
      expect(updatedWidget?.name).toBe("Updated Widget 1");
      expect(updatedWidget?.w).toBe(2);
      expect(updatedWidget?.data).toEqual({ title: "Updated Title 1" });

      // Check new widget was created
      const allWidgets = await Widget.find({});
      const newWidget = allWidgets.find((w) => w.name === "New Widget");
      expect(newWidget).toBeDefined();
      expect(newWidget?.type).toBe(WidgetType.WEATHER);

      // Check that widget2 was deleted (not in the update data)
      const deletedWidget = await Widget.findById(existingWidget2._id);
      expect(deletedWidget).toBeNull();
    });

    it("should handle empty widgets data by deleting all widgets", async () => {
      const resultWidgetIds = await updateWidgetsForDisplay(
        display,
        [],
        creatorId.toString()
      );

      expect(resultWidgetIds).toHaveLength(0);

      // Check that all widgets were deleted
      const remainingWidgets = await Widget.find({
        _id: { $in: [existingWidget1._id, existingWidget2._id] },
      });
      expect(remainingWidgets).toHaveLength(0);
    });
  });

  describe("deleteWidgetsForDisplay", () => {
    let display: IDisplay;
    let widget1: IWidget;
    let widget2: IWidget;

    beforeEach(async () => {
      // Create test display
      display = await Display.create({
        name: "Test Display",
        description: "Test Description",
        creator_id: creatorId,
        widgets: [],
        layout: "spaced",
        statusBar: {
          enabled: true,
          elements: [],
        },
      });

      // Create test widgets
      widget1 = await Widget.create({
        name: "Widget 1",
        type: WidgetType.ANNOUNCEMENT,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        data: { title: "Title 1" },
        creator_id: creatorId,
      });

      widget2 = await Widget.create({
        name: "Widget 2",
        type: WidgetType.IMAGE,
        x: 1,
        y: 0,
        w: 1,
        h: 1,
        data: { url: "http://example.com/image.jpg" },
        creator_id: creatorId,
      });

      // Add widgets to display
      display.widgets = [
        widget1._id as mongoose.Types.ObjectId,
        widget2._id as mongoose.Types.ObjectId,
      ];
      await display.save();
    });

    it("should delete all widgets and empty the display widgets array", async () => {
      await deleteWidgetsForDisplay(display);

      // Check that widgets were deleted from database
      const remainingWidgets = await Widget.find({
        _id: { $in: [widget1._id, widget2._id] },
      });
      expect(remainingWidgets).toHaveLength(0);

      // Check that display widgets array is empty
      expect(display.widgets).toHaveLength(0);
    });

    it("should not fail if display has no widgets", async () => {
      display.widgets = [];
      await display.save();

      await expect(deleteWidgetsForDisplay(display)).resolves.not.toThrow();
      expect(display.widgets).toHaveLength(0);
    });

    it("should throw error if widget deletion fails", async () => {
      // Close the connection to simulate database error
      await mongoose.connection.close();

      await expect(deleteWidgetsForDisplay(display)).rejects.toThrow(
        "Failed to delete widgets for display."
      );

      // Reconnect for cleanup
      await mongoose.connect(MONGODB_URI);
    });
  });

  describe("getDisplayWithWidgets", () => {
    let display: IDisplay;
    let widget1: IWidget;
    let widget2: IWidget;

    beforeEach(async () => {
      // Create test widgets
      widget1 = await Widget.create({
        name: "Widget 1",
        type: WidgetType.ANNOUNCEMENT,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        data: { title: "Title 1" },
        creator_id: creatorId,
      });

      widget2 = await Widget.create({
        name: "Widget 2",
        type: WidgetType.IMAGE,
        x: 1,
        y: 0,
        w: 1,
        h: 1,
        data: { url: "http://example.com/image.jpg" },
        creator_id: creatorId,
      });

      // Create test display with widgets
      display = await Display.create({
        name: "Test Display",
        description: "Test Description",
        creator_id: creatorId,
        widgets: [
          widget1._id as mongoose.Types.ObjectId,
          widget2._id as mongoose.Types.ObjectId,
        ],
        layout: "spaced",
        statusBar: {
          enabled: true,
          elements: ["clock"],
        },
      });
    });

    it("should return display with populated widgets", async () => {
      const result = await getDisplayWithWidgets(
        (display._id as mongoose.Types.ObjectId).toString()
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Display");
      expect(result?.widgets).toHaveLength(2);

      // Check that widgets are populated (not just ObjectIds)
      const populatedWidgets = result?.widgets as IWidget[];
      expect(populatedWidgets[0].name).toBeDefined();
      expect(populatedWidgets[1].name).toBeDefined();
      expect(populatedWidgets.find((w) => w.name === "Widget 1")).toBeDefined();
      expect(populatedWidgets.find((w) => w.name === "Widget 2")).toBeDefined();
    });

    it("should return null if display is not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await getDisplayWithWidgets(nonExistentId);

      expect(result).toBeNull();
    });

    it("should handle ObjectId parameter", async () => {
      const result = await getDisplayWithWidgets(
        display._id as mongoose.Types.ObjectId
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Display");
    });

    it("should return null and handle database errors gracefully", async () => {
      // Close connection to simulate database error
      await mongoose.connection.close();

      const result = await getDisplayWithWidgets(
        (display._id as mongoose.Types.ObjectId).toString()
      );

      expect(result).toBeNull();

      // Reconnect for cleanup
      await mongoose.connect(MONGODB_URI);
    });
  });
});
