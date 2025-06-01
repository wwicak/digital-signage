import mongoose from "mongoose";
import {
  addSlideToSlideshows,
  removeSlideFromSlideshows,
  handleSlideInSlideshows,
  deleteSlideAndCleanReferences,
} from "../../../api/helpers/slide_helper";
import Slide, { SlideType } from "../../../api/models/Slide";
import Slideshow from "../../../api/models/Slideshow";
import { jest } from "@jest/globals";

// MongoDB connection string
const MONGODB_URI =
  "mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

describe("Slide Helper Functions", () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await Slide.deleteMany({});
    await Slideshow.deleteMany({});
  });

  describe("addSlideToSlideshows", () => {
    it("should add a slide to multiple slideshows", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Create test slideshows
      const slideshow1 = await Slideshow.create({
        name: "Slideshow 1",
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slideshow2 = await Slideshow.create({
        name: "Slideshow 2",
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Add slide to slideshows
      await addSlideToSlideshows(slide, [
        slideshow1._id as mongoose.Types.ObjectId,
        slideshow2._id as mongoose.Types.ObjectId,
      ]);

      // Verify slide was added to both slideshows
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id);
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id);

      expect(updatedSlideshow1?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      );
      expect(updatedSlideshow2?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      );
    });

    it("should add a slide to a single slideshow", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Create test slideshow
      const slideshow = await Slideshow.create({
        name: "Test Slideshow",
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Add slide to slideshow
      await addSlideToSlideshows(
        slide,
        slideshow._id as mongoose.Types.ObjectId
      );

      // Verify slide was added
      const updatedSlideshow = await Slideshow.findById(slideshow._id);
      expect(updatedSlideshow?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      );
    });

    it("should handle empty slideshow IDs", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Should not throw error with null/undefined slideshow IDs
      await expect(
        addSlideToSlideshows(slide, null as any)
      ).resolves.not.toThrow();
      await expect(
        addSlideToSlideshows(slide, undefined as any)
      ).resolves.not.toThrow();
      await expect(addSlideToSlideshows(slide, [])).resolves.not.toThrow();
    });
  });

  describe("removeSlideFromSlideshows", () => {
    it("should remove a slide from multiple slideshows", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Create test slideshows with the slide already added
      const slideshow1 = await Slideshow.create({
        name: "Slideshow 1",
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slideshow2 = await Slideshow.create({
        name: "Slideshow 2",
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Remove slide from slideshows
      await removeSlideFromSlideshows(slide, [
        slideshow1._id as mongoose.Types.ObjectId,
        slideshow2._id as mongoose.Types.ObjectId,
      ]);

      // Verify slide was removed from both slideshows
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id);
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id);

      expect(updatedSlideshow1?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      );
      expect(updatedSlideshow2?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      );
    });

    it("should remove a slide using slide ID", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Create test slideshow with the slide already added
      const slideshow = await Slideshow.create({
        name: "Test Slideshow",
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Remove slide using slide ID
      await removeSlideFromSlideshows(
        slide._id as mongoose.Types.ObjectId,
        slideshow._id as mongoose.Types.ObjectId
      );

      // Verify slide was removed
      const updatedSlideshow = await Slideshow.findById(slideshow._id);
      expect(updatedSlideshow?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      );
    });
  });

  describe("handleSlideInSlideshows", () => {
    it("should add slide to new slideshows and remove from old ones", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Create test slideshows
      const slideshow1 = await Slideshow.create({
        name: "Slideshow 1",
        slides: [slide._id as mongoose.Types.ObjectId], // Initially contains the slide
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slideshow2 = await Slideshow.create({
        name: "Slideshow 2",
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slideshow3 = await Slideshow.create({
        name: "Slideshow 3",
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Handle slide changes: remove from slideshow1, add to slideshow2 and slideshow3
      await handleSlideInSlideshows(
        slide,
        [
          slideshow2._id as mongoose.Types.ObjectId,
          slideshow3._id as mongoose.Types.ObjectId,
        ], // new slideshows
        [slideshow1._id as mongoose.Types.ObjectId] // original slideshows
      );

      // Verify changes
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id);
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id);
      const updatedSlideshow3 = await Slideshow.findById(slideshow3._id);

      expect(updatedSlideshow1?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      );
      expect(updatedSlideshow2?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      );
      expect(updatedSlideshow3?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      );
    });

    it("should handle empty original slideshow IDs", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Create test slideshow
      const slideshow = await Slideshow.create({
        name: "Test Slideshow",
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Handle slide changes with no original slideshows
      await handleSlideInSlideshows(slide, [
        slideshow._id as mongoose.Types.ObjectId,
      ]);

      // Verify slide was added
      const updatedSlideshow = await Slideshow.findById(slideshow._id);
      expect(updatedSlideshow?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      );
    });
  });

  describe("deleteSlideAndCleanReferences", () => {
    it("should delete slide and remove it from all slideshows", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Create test slideshows with the slide
      const slideshow1 = await Slideshow.create({
        name: "Slideshow 1",
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slideshow2 = await Slideshow.create({
        name: "Slideshow 2",
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Delete slide and clean references
      const deletedSlide = await deleteSlideAndCleanReferences(
        slide._id as mongoose.Types.ObjectId
      );

      // Verify slide was returned
      expect(deletedSlide).toBeDefined();
      expect(deletedSlide?._id).toEqual(slide._id);

      // Verify slide was deleted
      const foundSlide = await Slide.findById(slide._id);
      expect(foundSlide).toBeNull();

      // Verify slide was removed from all slideshows
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id);
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id);

      expect(updatedSlideshow1?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      );
      expect(updatedSlideshow2?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      );
    });

    it("should return null for non-existent slide", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await deleteSlideAndCleanReferences(nonExistentId);
      expect(result).toBeNull();
    });

    it("should handle string slide ID", async () => {
      // Create test slide
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.PHOTO,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Delete slide using string ID
      const deletedSlide = await deleteSlideAndCleanReferences(
        (slide._id as mongoose.Types.ObjectId).toString()
      );

      // Verify slide was deleted
      expect(deletedSlide).toBeDefined();
      expect(deletedSlide?._id).toEqual(slide._id);

      const foundSlide = await Slide.findById(slide._id);
      expect(foundSlide).toBeNull();
    });
  });
});

// Mock dependencies for SSE unit tests
jest.mock("../../../api/models/Slide");
jest.mock("../../../api/models/Slideshow");
jest.mock("../../../api/sse_manager");
jest.mock("../../../api/helpers/slideshow_helper"); // Used by getDisplayIdsForSlide

import * as slideHelperModule from "../../../api/helpers/slide_helper"; // Import namespace for spy
import { sendEventToDisplay } from "../../../api/sse_manager";
import SlideMongooseModel from "../../../api/models/Slide";
import SlideshowMongooseModel from "../../../api/models/Slideshow";
import { getDisplayIdsForSlideshow as mockGetDisplayIdsForSlideshowHelper } from "../../../api/helpers/slideshow_helper";

// Setup spies and mocks for SSE unit tests
// spiedGetDisplayIdsForSlide will be initialized before the describe block for unit tests
let spiedGetDisplayIdsForSlide: jest.SpyInstance;
const mockSendEventToDisplay = sendEventToDisplay as jest.Mock;
const mockedGetDisplayIdsForSlideshow =
  mockGetDisplayIdsForSlideshowHelper as jest.Mock;

describe("Slide Helper - deleteSlideAndCleanReferences - SSE Unit Tests", () => {
  const slideId = new mongoose.Types.ObjectId().toString();
  const mockDisplayIds = ["displaySseSlideHelper1", "displaySseSlideHelper2"];

  beforeEach(() => {
    // Initialize spy here where slideHelperModule is in scope
    spiedGetDisplayIdsForSlide = jest.spyOn(
      slideHelperModule,
      "getDisplayIdsForSlide"
    );

    // Reset mocks for each unit test
    (SlideMongooseModel.findById as jest.Mock).mockReset();
    (SlideMongooseModel.findByIdAndDelete as jest.Mock).mockReset();
    (SlideshowMongooseModel.updateMany as jest.Mock).mockReset();
    spiedGetDisplayIdsForSlide.mockReset();
    mockSendEventToDisplay.mockClear();
    mockedGetDisplayIdsForSlideshow.mockReset();
  });

  afterEach(() => {
    // Restore the spy after each test to avoid conflicts
    spiedGetDisplayIdsForSlide.mockRestore();
  });

  it("should send display_updated event with slide_deleted reason for each display ID on successful delete", async () => {
    const mockSlide = { _id: slideId, name: "Test Slide for SSE delete" };
    (SlideMongooseModel.findById as jest.Mock).mockResolvedValue(mockSlide);
    (SlideMongooseModel.findByIdAndDelete as jest.Mock).mockResolvedValue(
      mockSlide
    );
    (SlideshowMongooseModel.updateMany as jest.Mock).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });

    spiedGetDisplayIdsForSlide.mockResolvedValue(mockDisplayIds);

    await slideHelperModule.deleteSlideAndCleanReferences(slideId);

    expect(spiedGetDisplayIdsForSlide).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId(slideId)
    );
    expect(SlideMongooseModel.findByIdAndDelete).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId(slideId)
    );
    expect(mockSendEventToDisplay).toHaveBeenCalledTimes(mockDisplayIds.length);
    for (const displayId of mockDisplayIds) {
      expect(mockSendEventToDisplay).toHaveBeenCalledWith(
        displayId,
        "display_updated",
        expect.objectContaining({
          displayId: displayId,
          action: "update",
          reason: "slide_deleted",
          slideId: slideId.toString(),
        })
      );
    }
  });

  it("should not send events if getDisplayIdsForSlide (spied) returns an empty array", async () => {
    const mockSlide = { _id: slideId, name: "Test Slide No SSE" };
    (SlideMongooseModel.findById as jest.Mock).mockResolvedValue(mockSlide);
    (SlideMongooseModel.findByIdAndDelete as jest.Mock).mockResolvedValue(
      mockSlide
    );
    (SlideshowMongooseModel.updateMany as jest.Mock).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });
    spiedGetDisplayIdsForSlide.mockResolvedValue([]);

    await slideHelperModule.deleteSlideAndCleanReferences(slideId);

    expect(spiedGetDisplayIdsForSlide).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId(slideId)
    );
    expect(mockSendEventToDisplay).not.toHaveBeenCalled();
  });

  it("should still delete slide but not send events if getDisplayIdsForSlide (spied) throws an error", async () => {
    const mockSlide = { _id: slideId, name: "Test Slide Error SSE" };
    (SlideMongooseModel.findById as jest.Mock).mockResolvedValue(mockSlide);
    (SlideMongooseModel.findByIdAndDelete as jest.Mock).mockResolvedValue(
      mockSlide
    );
    (SlideshowMongooseModel.updateMany as jest.Mock).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });
    spiedGetDisplayIdsForSlide.mockRejectedValue(
      new Error("Error from getDisplayIdsForSlide spy")
    );

    await slideHelperModule.deleteSlideAndCleanReferences(slideId);

    expect(SlideMongooseModel.findByIdAndDelete).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId(slideId)
    );
    expect(mockSendEventToDisplay).not.toHaveBeenCalled();
  });

  it("should return null and not send events if slide to delete is not found (findById returns null)", async () => {
    (SlideMongooseModel.findById as jest.Mock).mockResolvedValue(null);
    spiedGetDisplayIdsForSlide.mockResolvedValue(mockDisplayIds); // Mock this so it doesn't throw before findById check

    const result = await slideHelperModule.deleteSlideAndCleanReferences(
      slideId
    );

    expect(result).toBeNull();
    expect(spiedGetDisplayIdsForSlide).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId(slideId)
    );
    expect(SlideMongooseModel.findByIdAndDelete).not.toHaveBeenCalled();
    expect(SlideshowMongooseModel.updateMany).not.toHaveBeenCalled();
    expect(mockSendEventToDisplay).not.toHaveBeenCalled();
  });
});

describe("Slide Helper - getDisplayIdsForSlide - Unit Tests", () => {
  const testSlideId = new mongoose.Types.ObjectId().toString();
  const mockSlideshowsContainingSlide = [
    { _id: new mongoose.Types.ObjectId() },
    { _id: new mongoose.Types.ObjectId() },
  ];

  beforeEach(() => {
    (SlideshowMongooseModel.find as jest.Mock).mockReset();
    mockedGetDisplayIdsForSlideshow.mockReset();
  });

  it("should call getDisplayIdsForSlideshow for each slideshow and aggregate unique display IDs", async () => {
    (SlideshowMongooseModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockSlideshowsContainingSlide),
    } as any);

    mockedGetDisplayIdsForSlideshow
      .mockResolvedValueOnce(["display1", "display2"])
      .mockResolvedValueOnce(["display2", "display3"]);

    const result = await slideHelperModule.getDisplayIdsForSlide(testSlideId);

    expect(SlideshowMongooseModel.find).toHaveBeenCalledWith({
      slides: new mongoose.Types.ObjectId(testSlideId),
    });
    expect(mockedGetDisplayIdsForSlideshow).toHaveBeenCalledTimes(
      mockSlideshowsContainingSlide.length
    );
    expect(mockedGetDisplayIdsForSlideshow).toHaveBeenCalledWith(
      mockSlideshowsContainingSlide[0]._id
    );
    expect(mockedGetDisplayIdsForSlideshow).toHaveBeenCalledWith(
      mockSlideshowsContainingSlide[1]._id
    );
    expect(result).toEqual(
      expect.arrayContaining(["display1", "display2", "display3"])
    );
    expect(result.length).toBe(3);
  });

  it("should return empty array if no slideshows contain the slide", async () => {
    (SlideshowMongooseModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    } as any);

    const result = await slideHelperModule.getDisplayIdsForSlide(testSlideId);
    expect(result).toEqual([]);
    expect(mockedGetDisplayIdsForSlideshow).not.toHaveBeenCalled();
  });

  it("should return empty array if getDisplayIdsForSlideshow returns empty for all slideshows", async () => {
    (SlideshowMongooseModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockSlideshowsContainingSlide),
    } as any);
    mockedGetDisplayIdsForSlideshow.mockResolvedValue([]);

    const result = await slideHelperModule.getDisplayIdsForSlide(testSlideId);
    expect(result).toEqual([]);
    expect(mockedGetDisplayIdsForSlideshow).toHaveBeenCalledTimes(
      mockSlideshowsContainingSlide.length
    );
  });
});
