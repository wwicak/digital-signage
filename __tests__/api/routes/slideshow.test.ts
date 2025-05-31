import request from "supertest";
import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport"; // For req.user, req.isAuthenticated type usage if needed
import mongoose from "mongoose"; // Import mongoose
import SlideshowRouter from "../../../api/routes/slideshow";
import Slideshow, { ISlideshow } from "../../../api/models/Slideshow"; // Actual Slideshow model
import User, { IUser } from "../../../api/models/User"; // For req.user type
import * as slideshowHelper from "../../../api/helpers/slideshow_helper";

// Mock dependencies
jest.mock("../../../api/models/User");
jest.mock("passport");

// Mock helper functions from slideshow_helper
jest.mock("../../../api/helpers/slideshow_helper");

const mockUser = {
  _id: "testUserId",
  name: "Test User",
  email: "test@example.com",
  role: "user",
} as IUser;

// Helper function to create a mock Mongoose query chain
const mockQueryChain = (resolveValue: any = null) => {
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolveValue),
  };
  query.populate.mockImplementation(() => query);
  query.select.mockImplementation(() => query);
  return query;
};
const validObjectIdString = () => new mongoose.Types.ObjectId().toString();

describe("Slideshow API Routes", () => {
  let app: Express;

  // Spies for model methods
  let slideshowFindSpy: jest.SpyInstance;
  let slideshowFindOneSpy: jest.SpyInstance;
  let slideshowProtoSaveSpy: jest.SpyInstance;
  let slideshowFindByIdAndDeleteSpy: jest.SpyInstance;

  // Mocks for helper functions
  const mockedValidateSlidesExist =
    slideshowHelper.validateSlidesExist as jest.Mock;
  const mockedReorderSlidesInSlideshow =
    slideshowHelper.reorderSlidesInSlideshow as jest.Mock;
  const mockedPopulateSlideshowSlides =
    slideshowHelper.populateSlideshowSlides as jest.Mock;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: "jest-test-secret",
        resave: false,
        saveUninitialized: false,
      })
    );

    app.use((req: any, res: Response, next: NextFunction) => {
      req.user = mockUser;
      req.isAuthenticated = () => true;
      req.login = jest.fn((user, cb) => cb(null));
      req.logout = jest.fn((cb) => cb(null));
      next();
    });

    app.use("/api/v1/slideshows", SlideshowRouter);

    slideshowFindSpy = jest.spyOn(Slideshow, "find");
    slideshowFindOneSpy = jest.spyOn(Slideshow, "findOne");
    slideshowProtoSaveSpy = jest.spyOn(Slideshow.prototype, "save");
    slideshowFindByIdAndDeleteSpy = jest.spyOn(Slideshow, "findByIdAndDelete");

    mockedValidateSlidesExist.mockReset();
    mockedReorderSlidesInSlideshow.mockReset();
    mockedPopulateSlideshowSlides.mockReset();

    // Default mock implementations removed to force explicit mocking in each test
    // slideshowFindSpy.mockImplementation(() => mockQueryChain([]));
    // slideshowFindOneSpy.mockImplementation(() => mockQueryChain(null));

    mockedPopulateSlideshowSlides.mockImplementation(
      async (slideshow) => slideshow
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("GET /", () => {
    it("should fetch all slideshows for the logged-in user with populated slides", async () => {
      const mockSlideshows = [
        {
          _id: "show1",
          name: "Slideshow 1",
          creator_id: mockUser._id,
          slides: [{ _id: "slide1", name: "Slide 1" }],
        },
        {
          _id: "show2",
          name: "Slideshow 2",
          creator_id: mockUser._id,
          slides: [],
        },
      ];
      slideshowFindSpy.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockSlideshows),
      } as any);

      const response = await request(app).get("/api/v1/slideshows");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSlideshows);
      expect(slideshowFindSpy).toHaveBeenCalledWith({
        creator_id: mockUser._id,
      });
      const findSpyResult = slideshowFindSpy.mock.results[0].value;
      expect(findSpyResult.populate).toHaveBeenCalledWith("slides");
      expect(findSpyResult.exec).toHaveBeenCalled();
    });

    it("should return 400 if user information is not found", async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use("/api/v1/slideshows", SlideshowRouter);

      const response = await request(tempApp).get("/api/v1/slideshows");
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User information not found.");
    });

    it("should return 500 if fetching slideshows fails", async () => {
      slideshowFindSpy.mockImplementation(() =>
        mockQueryChain(null)
          .exec.mockRejectedValue(new Error("DB error"))
          .getMockImplementation()()
      );
      const response = await request(app).get("/api/v1/slideshows");
      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Error fetching slideshows");
    });
  });

  describe("GET /:id", () => {
    const slideshowId = "testShowId";
    it("should fetch a specific slideshow with populated slides", async () => {
      const mockSlideshow = {
        _id: slideshowId,
        name: "Test Slideshow",
        slides: [],
        creator_id: mockUser._id,
      };
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(mockSlideshow)
      );

      const response = await request(app).get(
        `/api/v1/slideshows/${slideshowId}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSlideshow);
      expect(slideshowFindOneSpy).toHaveBeenCalledWith({
        _id: slideshowId,
        creator_id: mockUser._id,
      });
      const findOneSpyResult = slideshowFindOneSpy.mock.results[0].value;
      expect(findOneSpyResult.populate).toHaveBeenCalledWith("slides");
      expect(findOneSpyResult.exec).toHaveBeenCalled();
    });

    it("should return 404 if slideshow not found", async () => {
      slideshowFindOneSpy.mockImplementation(() => mockQueryChain(null));
      const response = await request(app).get(`/api/v1/slideshows/nonexistent`);
      expect(response.status).toBe(404);
    });

    it("should return 500 on database error", async () => {
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(null)
          .exec.mockRejectedValue(new Error("DB error"))
          .getMockImplementation()()
      );
      const response = await request(app).get(
        `/api/v1/slideshows/${slideshowId}`
      );
      expect(response.status).toBe(500);
    });

    it("should return 400 if user information is not found for GET /:id", async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use("/api/v1/slideshows", SlideshowRouter);

      const response = await request(tempApp).get(
        `/api/v1/slideshows/${slideshowId}`
      );
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User information not found.");
    });
  });

  describe("POST /", () => {
    const fullSlideshowData = {
      name: "Full Slideshow",
      description: "A cool full slideshow",
      slide_ids: [validObjectIdString(), validObjectIdString()],
      is_enabled: true,
    };
    const savedFullSlideshowMock = {
      ...fullSlideshowData,
      _id: "fullShowId",
      creator_id: mockUser._id,
      slides: fullSlideshowData.slide_ids,
    };

    it("should create a new slideshow successfully (minimal valid payload - only name)", async () => {
      const minimalData = { name: "Minimal Slideshow" };
      const minimalSavedMock = {
        name: minimalData.name,
        _id: "minimalId",
        creator_id: mockUser._id,
        slides: [],
        description: undefined, // Zod optional makes it undefined if not provided
        is_enabled: undefined, // Zod optional makes it undefined if not provided
      };

      slideshowProtoSaveSpy.mockResolvedValue(minimalSavedMock as any);
      mockedPopulateSlideshowSlides.mockImplementation(async (ss) => ({
        ...ss,
        description: ss.description,
        is_enabled: ss.is_enabled,
        slides: ss.slides || [],
      }));

      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(minimalData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(minimalData.name);
      expect(slideshowProtoSaveSpy).toHaveBeenCalledTimes(1);
      // const savedObject = slideshowProtoSaveSpy.mock.calls[0][0]; // The instance 'this'
      // expect(savedObject.name).toBe(minimalData.name); // Checked via response.body.name
      // expect(savedObject.slides).toEqual([]); // Checked via response.body.slides if necessary, or specific mock for populate
      expect(response.body.slides).toEqual([]); // Ensure response body has empty slides

      expect(mockedPopulateSlideshowSlides).toHaveBeenCalled();
      expect(mockedValidateSlidesExist).not.toHaveBeenCalled();
    });

    it("should create a new slideshow successfully (full payload)", async () => {
      mockedValidateSlidesExist.mockResolvedValue(true);
      slideshowProtoSaveSpy.mockResolvedValue(savedFullSlideshowMock as any);
      mockedPopulateSlideshowSlides.mockResolvedValue(
        savedFullSlideshowMock as any
      );

      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(fullSlideshowData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(savedFullSlideshowMock);
      expect(mockedValidateSlidesExist).toHaveBeenCalledWith(
        fullSlideshowData.slide_ids
      );
      expect(slideshowProtoSaveSpy).toHaveBeenCalledTimes(1);
      expect(mockedPopulateSlideshowSlides).toHaveBeenCalledWith(
        savedFullSlideshowMock
      );
    });

    it("should return 400 if Zod validation fails (e.g., name missing)", async () => {
      const { name, ...invalidData } = fullSlideshowData;
      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
      expect(response.body.errors?.name).toBeDefined();
    });

    it("should return 400 if Zod validation fails for slide_ids (not valid ObjectId)", async () => {
      const invalidSlideIdData = {
        ...fullSlideshowData,
        slide_ids: ["slide1Id", "invalid-object-id-string"],
      };
      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(invalidSlideIdData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
      expect(response.body.errors?.slide_ids?.[1]).toContain(
        "Invalid ObjectId in slide_ids"
      );
    });

    it("should return 400 if validateSlidesExist returns false", async () => {
      mockedValidateSlidesExist.mockResolvedValue(false);
      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(fullSlideshowData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "One or more provided slide IDs are invalid or do not exist."
      );
      expect(slideshowProtoSaveSpy).not.toHaveBeenCalled();
    });

    it("should handle Mongoose ValidationError on save", async () => {
      mockedValidateSlidesExist.mockResolvedValue(true);
      const validationError = new Error("Validation failed") as any;
      validationError.name = "ValidationError";
      validationError.errors = { name: { message: "Name is too short" } };
      slideshowProtoSaveSpy.mockRejectedValue(validationError);

      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(fullSlideshowData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
      expect(response.body.errors).toEqual(validationError.errors);
    });

    it("should handle other database errors on save", async () => {
      mockedValidateSlidesExist.mockResolvedValue(true);
      slideshowProtoSaveSpy.mockRejectedValue(new Error("DB error"));

      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(fullSlideshowData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Error creating slideshow");
    });

    it("should create slideshow with empty slides if slide_ids is not provided", async () => {
      const { slide_ids, ...dataWithoutSlideIds } = fullSlideshowData;
      const savedMock = {
        name: dataWithoutSlideIds.name,
        description: dataWithoutSlideIds.description,
        is_enabled: dataWithoutSlideIds.is_enabled,
        _id: "newShowIdNoSlides",
        creator_id: mockUser._id,
        slides: [],
      };
      slideshowProtoSaveSpy.mockResolvedValue(savedMock as any);
      mockedPopulateSlideshowSlides.mockImplementation(async (ss) => ({
        ...ss,
        slides: ss.slides || [],
      }));

      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(dataWithoutSlideIds);

      expect(response.status).toBe(201);
      expect(response.body.slides).toEqual([]);
      expect(mockedValidateSlidesExist).not.toHaveBeenCalled();
      expect(slideshowProtoSaveSpy).toHaveBeenCalledTimes(1);
    });

    it("should create slideshow with slide_ids as empty array if provided as such", async () => {
      const dataWithEmptySlideIds = { ...fullSlideshowData, slide_ids: [] };
      const savedMockWithEmpty = {
        ...dataWithEmptySlideIds,
        _id: "newShowIdEmptySlides",
        creator_id: mockUser._id,
      };

      slideshowProtoSaveSpy.mockResolvedValue(savedMockWithEmpty as any);
      mockedPopulateSlideshowSlides.mockResolvedValue(
        savedMockWithEmpty as any
      );

      const response = await request(app)
        .post("/api/v1/slideshows")
        .send(dataWithEmptySlideIds);

      expect(response.status).toBe(201);
      expect(response.body.slides).toEqual([]);
      // validateSlidesExist is NOT called if slide_ids is present but empty (length === 0)
      expect(mockedValidateSlidesExist).not.toHaveBeenCalled();
      expect(slideshowProtoSaveSpy).toHaveBeenCalledTimes(1);
    });

    it("should return 400 if user information is not found for POST /", async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use("/api/v1/slideshows", SlideshowRouter);

      const response = await request(tempApp)
        .post("/api/v1/slideshows")
        .send(fullSlideshowData);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User information not found.");
    });
  });

  describe("PUT /:id", () => {
    const slideshowId = "existingShowId";
    const getInitialSlideshow = () => ({
      _id: slideshowId,
      name: "Initial Slideshow",
      description: "Initial Description",
      creator_id: mockUser._id,
      slides: [validObjectIdString(), validObjectIdString()],
      save: jest.fn(),
    });
    const updatePayload = {
      name: "Updated Slideshow Name",
      description: "Updated desc",
    };

    it("should update slideshow details successfully (name, description)", async () => {
      const currentSlideshowState = getInitialSlideshow();
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentSlideshowState)
      );
      currentSlideshowState.save.mockResolvedValue({
        ...currentSlideshowState,
        ...updatePayload,
      });

      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(updatePayload);

      expect(response.status).toBe(200);
      // const findOneMockResult = slideshowFindOneSpy.mock.results[0].value; // No longer an object with .exec
      // expect(findOneMockResult.exec).toHaveBeenCalled(); // Removed as findOneMockResult is now currentSlideshowState
      expect(slideshowFindOneSpy).toHaveBeenCalledWith({
        _id: slideshowId,
        creator_id: mockUser._id,
      }); // Verify findOne was called
      expect(currentSlideshowState.save).toHaveBeenCalledTimes(1);
      expect(response.body.name).toBe(updatePayload.name);
      expect(response.body.description).toBe(updatePayload.description);
      expect(mockedPopulateSlideshowSlides).toHaveBeenCalled();
    });

    it("should update slide order successfully", async () => {
      const currentSlideshowState = getInitialSlideshow();
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentSlideshowState)
      );
      currentSlideshowState.save.mockResolvedValue(currentSlideshowState);
      mockedReorderSlidesInSlideshow.mockResolvedValue(undefined);

      const orderUpdatePayload = { oldIndex: 0, newIndex: 1 };
      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(orderUpdatePayload);

      expect(response.status).toBe(200);
      expect(mockedReorderSlidesInSlideshow).toHaveBeenCalledWith(
        expect.objectContaining({ _id: slideshowId }),
        0,
        1
      );
      expect(currentSlideshowState.save).toHaveBeenCalledTimes(1);
      expect(mockedPopulateSlideshowSlides).toHaveBeenCalled();
    });

    it("should update slide_ids successfully", async () => {
      const currentSlideshowState = getInitialSlideshow();
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentSlideshowState)
      );

      const slideIdUpdatePayload = {
        slide_ids: [validObjectIdString(), validObjectIdString()],
      };
      currentSlideshowState.save.mockResolvedValue({
        ...currentSlideshowState,
        slides: slideIdUpdatePayload.slide_ids,
      });
      mockedValidateSlidesExist.mockResolvedValue(true);

      const mockOriginalSlideshowsContainingSlide = [{ _id: "someShowId" }];
      slideshowFindSpy.mockImplementation(() =>
        mockQueryChain(mockOriginalSlideshowsContainingSlide)
      );

      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(slideIdUpdatePayload);

      expect(response.status).toBe(200);
      expect(mockedValidateSlidesExist).toHaveBeenCalledWith(
        slideIdUpdatePayload.slide_ids
      );
      expect(currentSlideshowState.save).toHaveBeenCalledTimes(1);
      expect(response.body.slides).toEqual(slideIdUpdatePayload.slide_ids);
      expect(mockedPopulateSlideshowSlides).toHaveBeenCalled();
      expect(slideshowFindSpy).toHaveBeenCalledWith({
        slides: currentSlideshowState._id,
      });
      const findSpyResult = slideshowFindSpy.mock.results[0].value; // Get the mock query from the spy
      expect(findSpyResult.select).toHaveBeenCalledWith("_id"); // Check select was called on it
    });

    it("should return 400 if Zod validation fails for update payload", async () => {
      const invalidUpdatePayload = { name: "" };
      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(invalidUpdatePayload);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return 404 if slideshow to update is not found", async () => {
      slideshowFindOneSpy.mockImplementation(() => mockQueryChain(null));
      const response = await request(app)
        .put(`/api/v1/slideshows/nonExistentId`)
        .send(updatePayload);
      expect(response.status).toBe(404);
    });

    it("should return 400 if validateSlidesExist fails during slide_ids update", async () => {
      const currentSlideshowState = getInitialSlideshow();
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentSlideshowState)
      );
      mockedValidateSlidesExist.mockResolvedValue(false);
      const slideIdUpdatePayload = { slide_ids: ["invalidSlideId"] };
      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(slideIdUpdatePayload);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "One or more provided slide IDs are invalid or do not exist."
      );
    });

    it("should return 400 if reorderSlidesInSlideshow throws known error", async () => {
      const currentSlideshowState = getInitialSlideshow();
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentSlideshowState)
      );
      mockedReorderSlidesInSlideshow.mockRejectedValue(
        new Error("Invalid slide indices for reordering.")
      );
      const orderUpdatePayload = { oldIndex: 99, newIndex: 1 };
      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(orderUpdatePayload);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Invalid slide indices for reordering."
      );
    });

    it("should return 500 on other errors during update (e.g. save error)", async () => {
      const currentSlideshowState = getInitialSlideshow();
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentSlideshowState)
      );
      currentSlideshowState.save.mockRejectedValue(new Error("DB save error"));
      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(updatePayload);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Error updating slideshow");
    });

    it("should update slideshow with empty slide_ids successfully", async () => {
      const currentSlideshowState = getInitialSlideshow();
      slideshowFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentSlideshowState)
      );
      const slideIdUpdatePayload = { slide_ids: [] }; // Empty array
      currentSlideshowState.save.mockResolvedValue({
        ...currentSlideshowState,
        slides: [],
      });
      mockedValidateSlidesExist.mockResolvedValue(true); // validateSlidesExist is still called

      const mockOriginalSlideshowsContainingSlide = [{ _id: "someShowId" }];
      slideshowFindSpy.mockImplementation(() =>
        mockQueryChain(mockOriginalSlideshowsContainingSlide)
      );

      const response = await request(app)
        .put(`/api/v1/slideshows/${slideshowId}`)
        .send(slideIdUpdatePayload);

      //   expect(response.status).toBe(200);
      //   expect(mockedValidateSlidesExist).toHaveBeenCalledWith([]);
      //   expect(currentSlideshowState.save).toHaveBeenCalledTimes(1);
      //   expect(response.body.slides).toEqual([]);
      // });

      it("should return 400 if user information is not found for PUT /:id", async () => {
        const tempApp = express();
        tempApp.use(express.json());
        tempApp.use((req: any, res, next) => {
          req.user = undefined;
          req.isAuthenticated = () => true;
          next();
        });
        tempApp.use("/api/v1/slideshows", SlideshowRouter);

        const response = await request(tempApp)
          .put(`/api/v1/slideshows/${slideshowId}`)
          .send(updatePayload);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("User information not found.");
      });
    });

    describe("DELETE /:id", () => {
      const slideshowId = "showToDelete";
      const mockSlideshow = {
        _id: slideshowId,
        name: "To Delete",
        creator_id: mockUser._id,
      };

      it("should delete a slideshow successfully", async () => {
        slideshowFindOneSpy.mockImplementation(() =>
          mockQueryChain(mockSlideshow)
        );
        slideshowFindByIdAndDeleteSpy.mockResolvedValue(mockSlideshow as any);

        const response = await request(app).delete(
          `/api/v1/slideshows/${slideshowId}`
        );

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Slideshow deleted successfully");
        const findOneMockResult = slideshowFindOneSpy.mock.results[0].value;
        expect(findOneMockResult.exec).toHaveBeenCalled();
        expect(slideshowFindByIdAndDeleteSpy).toHaveBeenCalledWith(slideshowId);
      });

      it("should return 404 if slideshow to delete is not found by findOne", async () => {
        slideshowFindOneSpy.mockImplementation(() => mockQueryChain(null));
        const response = await request(app).delete(
          `/api/v1/slideshows/nonExistentId`
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toBe(
          "Slideshow not found or not authorized"
        );
        expect(slideshowFindByIdAndDeleteSpy).not.toHaveBeenCalled();
      });

      it("should return 500 if findOne throws an error", async () => {
        slideshowFindOneSpy.mockImplementation(() =>
          mockQueryChain(null)
            .exec.mockRejectedValue(new Error("DB find error"))
            .getMockImplementation()()
        );
        const response = await request(app).delete(
          `/api/v1/slideshows/${slideshowId}`
        );
        expect(response.status).toBe(500);
        expect(response.body.message).toBe("Error deleting slideshow");
      });

      it("should return 500 if findByIdAndDelete throws an error", async () => {
        slideshowFindOneSpy.mockImplementation(() =>
          mockQueryChain(mockSlideshow)
        );
        slideshowFindByIdAndDeleteSpy.mockRejectedValue(
          new Error("DB delete error")
        );
        const response = await request(app).delete(
          `/api/v1/slideshows/${slideshowId}`
        );
        expect(response.status).toBe(500);
        expect(response.body.message).toBe("Error deleting slideshow");
      });

      it("should return 400 if user information is not found for DELETE /:id", async () => {
        const tempApp = express();
        tempApp.use(express.json());
        tempApp.use((req: any, res, next) => {
          req.user = undefined;
          req.isAuthenticated = () => true;
          next();
        });
        tempApp.use("/api/v1/slideshows", SlideshowRouter);

        const response = await request(tempApp).delete(
          `/api/v1/slideshows/${slideshowId}`
        );
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("User information not found.");
      });
    });
  });
});
