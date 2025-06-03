import mongoose from "mongoose";
import {
  validateSlidesExist,
  reorderSlidesInSlideshow,
  populateSlideshowSlides,
  getAllSlideshowsWithPopulatedSlides,
} from "../../../api/helpers/slideshow_helper";
import Slide, { SlideType } from "../../../api/models/Slide";
import Slideshow from "../../../api/models/Slideshow";
import { jest } from "@jest/globals";

// Mock mongoose
jest.mock("mongoose", () => ({
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
  },
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => id || "mock-object-id"),
  },
  Schema: jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    Types: {
      ObjectId: "ObjectId",
    },
  })),
  model: jest.fn(),
}));

// Add Schema.Types to the Schema constructor
const mockSchema = jest.requireMock("mongoose").Schema as any;
mockSchema.Types = {
  ObjectId: "ObjectId",
};

// Mock the models
jest.mock("../../../api/models/Slide");
jest.mock("../../../api/models/Slideshow");

describe("Slideshow Helper Functions", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Reset mocks
    jest.clearAllMocks();
  });

  describe("validateSlidesExist", () => {
    it("should return array of existing slide IDs", async () => {
      const slide1 = await Slide.create({
        name: "Test Slide 1",
        type: SlideType.IMAGE,
        data: { url: "test1.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        duration: 5000,
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slide2 = await Slide.create({
        name: "Test Slide 2",
        type: SlideType.IMAGE,
        data: { url: "test2.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        duration: 5000,
        is_public: true,
        tags: [],
        metadata: {},
      });

      const nonExistentId = new mongoose.Types.ObjectId();
      const slideIds = [slide1._id, slide2._id, nonExistentId];

      const result = await validateSlidesExist(
        slideIds.map((id) => String(id))
      );

      expect(result).toHaveLength(2);
      expect(result).toContain(String(slide1._id));
      expect(result).toContain(String(slide2._id));
      expect(result).not.toContain(String(nonExistentId));
    });

    it("should return empty array when no slides exist", async () => {
      const nonExistentId1 = new mongoose.Types.ObjectId();
      const nonExistentId2 = new mongoose.Types.ObjectId();
      const slideIds = [nonExistentId1, nonExistentId2];

      const result = await validateSlidesExist(
        slideIds.map((id) => String(id))
      );

      expect(result).toEqual([]);
    });
  });

  describe("reorderSlidesInSlideshow", () => {
    it("should reorder slides in slideshow", async () => {
      const slide1 = await Slide.create({
        name: "Test Slide 1",
        type: SlideType.IMAGE,
        data: { url: "test1.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        duration: 5000,
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slide2 = await Slide.create({
        name: "Test Slide 2",
        type: SlideType.IMAGE,
        data: { url: "test2.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        duration: 5000,
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slideshow = await Slideshow.create({
        name: "Test Slideshow",
        slides: [slide1._id, slide2._id],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      // Move slide at index 0 to index 1 (reorder slide1 and slide2)
      const result = await reorderSlidesInSlideshow(slideshow, 0, 1);

      expect(result).toBeDefined();
      expect(result._id).toEqual(slideshow._id);
      expect(result.slides[0]).toEqual(slide2._id);
      expect(result.slides[1]).toEqual(slide1._id);

      const updatedSlideshow = await Slideshow.findById(slideshow._id);
      expect(updatedSlideshow?.slides[0]).toEqual(slide2._id);
      expect(updatedSlideshow?.slides[1]).toEqual(slide1._id);
    });
  });

  describe("populateSlideshowSlides", () => {
    it("should populate slideshow with slides", async () => {
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.IMAGE,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        duration: 5000,
        is_public: true,
        tags: [],
        metadata: {},
      });

      const slideshow = await Slideshow.create({
        name: "Test Slideshow",
        slides: [slide._id],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      const result = await populateSlideshowSlides(slideshow);

      expect(result).toBeTruthy();
      expect(result?.slides).toHaveLength(1);
      expect((result?.slides[0] as any).name).toBe("Test Slide");
    });

    it("should return null for null slideshow", async () => {
      const result = await populateSlideshowSlides(null);
      expect(result).toBeNull();
    });
  });

  describe("getAllSlideshowsWithPopulatedSlides", () => {
    it("should get all slideshows with populated slides", async () => {
      const slide = await Slide.create({
        name: "Test Slide",
        type: SlideType.IMAGE,
        data: { url: "test.jpg" },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        duration: 5000,
        is_public: true,
        tags: [],
        metadata: {},
      });

      await Slideshow.create({
        name: "Test Slideshow 1",
        slides: [slide._id],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      await Slideshow.create({
        name: "Test Slideshow 2",
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      });

      const result = await getAllSlideshowsWithPopulatedSlides();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Test Slideshow 1");
      expect(result[1].name).toBe("Test Slideshow 2");
      expect((result[0].slides[0] as any).name).toBe("Test Slide");
    });

    it("should handle empty slideshows collection", async () => {
      const result = await getAllSlideshowsWithPopulatedSlides();
      expect(result).toEqual([]);
    });
  });
});
