import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// --- Explicit Mock for Slide Model ---
const MockSlideQueryObject_execFn = jest.fn();
const MockSlideQueryObject_selectFn = jest.fn();
const MockSlideQueryObject_leanFn = jest.fn();
const MockSlideQueryObject = {
  select: MockSlideQueryObject_selectFn,
  exec: MockSlideQueryObject_execFn,
  lean: MockSlideQueryObject_leanFn,
};
MockSlideQueryObject_selectFn.mockImplementation(() => MockSlideQueryObject); // Explicitly return the object
MockSlideQueryObject_leanFn.mockImplementation(() => MockSlideQueryObject);   // Explicitly return the object

const MockSlideConstructor = {
  find: jest.fn(() => MockSlideQueryObject),
};
jest.mock('../../../api/models/Slide', () => ({
  __esModule: true,
  default: MockSlideConstructor,
}));

// --- Explicit Mock for Slideshow Model ---
const MockSlideshowQueryObject_populateFn = jest.fn();
const MockSlideshowQueryObject_execFn = jest.fn();
const MockSlideshowQueryObject = {
  populate: MockSlideshowQueryObject_populateFn,
  exec: MockSlideshowQueryObject_execFn,
};
MockSlideshowQueryObject_populateFn.mockImplementation(() => MockSlideshowQueryObject); // Explicitly return the object

const MockSlideshowConstructor = {
  findById: jest.fn(() => MockSlideshowQueryObject),
  updateMany: jest.fn(),
};
jest.mock('../../../api/models/Slideshow', () => ({
  __esModule: true,
  default: MockSlideshowConstructor,
}));


// --- Mongoose Mock ---
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  // Note: modelRegistry is not strictly necessary here since we are explicitly mocking Slide and Slideshow modules.
  // However, keeping a generic fallback might be useful if other models are ever imported by these helpers.
  const modelRegistry: { [key: string]: any } = {};

  const createMockQuery = () => ({ // This is for generic models, not Slide/Slideshow
    exec: jest.fn(),
    populate: jest.fn(function(this: any) { return this; }),
    sort: jest.fn(function(this: any) { return this; }),
    select: jest.fn(function(this: any) { return this; }),
    lean: jest.fn(function(this: any) { return this; }),
    limit: jest.fn(function(this: any) { return this; }),
    skip: jest.fn(function(this: any) { return this; }),
  });

  return {
    ...actualMongoose,
    Types: {
      ...actualMongoose.Types,
      ObjectId: actualMongoose.Types.ObjectId,
    },
    model: jest.fn((modelName: string, schema?: any) => {
      if (modelName === 'Slide') {
        return MockSlideConstructor; // Return our explicit mock
      }
      if (modelName === 'Slideshow') {
        return MockSlideshowConstructor; // Return our explicit mock
      }

      if (!modelRegistry[modelName]) {
        const ModelConstructor = jest.fn(data => { /* Generic instance */ });
        ModelConstructor.modelName = modelName;
        ['find', 'findById', 'findOne', 'create', 'insertMany', 'updateMany', 'updateOne', 'findByIdAndUpdate', 'findByIdAndDelete', 'deleteMany', 'countDocuments', 'distinct', 'aggregate']
          .forEach(staticMethod => {
            (ModelConstructor as any)[staticMethod] = jest.fn((...args: any[]) => {
              const query = createMockQuery();
              if (staticMethod.startsWith('find') && !staticMethod.endsWith('One') && !staticMethod.endsWith('ById')) {
                (query.exec as jest.Mock).mockResolvedValue([]);
              } else if (['findById', 'findOne', 'findByIdAndUpdate', 'findByIdAndDelete'].includes(staticMethod)) {
                (query.exec as jest.Mock).mockResolvedValue(null);
              } else if (staticMethod === 'insertMany' || staticMethod === 'create') {
                // ... generic create/insertMany
              } else {
                return Promise.resolve({ acknowledged: true, matchedCount: 0, modifiedCount: 0, deletedCount: 0 });
              }
              return query;
            });
          });
        modelRegistry[modelName] = ModelConstructor;
      }
      return modelRegistry[modelName];
    }),
    Model: jest.fn(),
    get models() { return modelRegistry; },
    Schema: actualMongoose.Schema,
  };
});


import * as slideHelper from '../../../api/helpers/slideshow_helper';
import Slide from '../../../api/models/Slide';
import Slideshow from '../../../api/models/Slideshow';


describe('validateSlidesExist', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    (MockSlideConstructor.find as jest.Mock).mockClear().mockReturnValue(MockSlideQueryObject);
    MockSlideQueryObject_selectFn.mockClear().mockImplementation(() => MockSlideQueryObject);
    MockSlideQueryObject_execFn.mockClear();
    MockSlideQueryObject_leanFn.mockClear().mockImplementation(() => MockSlideQueryObject);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return true if all slide IDs exist', async () => {
    const slideId1 = new mongoose.Types.ObjectId();
    const slideId2 = new mongoose.Types.ObjectId();
    const slideIds = [slideId1.toString(), slideId2.toString()];
    const slideObjectIds = slideIds.map(id => new mongoose.Types.ObjectId(id));

    MockSlideQueryObject_execFn.mockResolvedValue(slideObjectIds.map(id => ({ _id: id })));

    const result = await slideHelper.validateSlidesExist(slideIds);

    expect(MockSlideConstructor.find).toHaveBeenCalledTimes(1);
    expect(MockSlideConstructor.find).toHaveBeenCalledWith({ _id: { $in: slideObjectIds } });
    expect(MockSlideQueryObject_selectFn).toHaveBeenCalledWith('_id');
    expect(MockSlideQueryObject_execFn).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('should return false if some slide IDs do not exist', async () => {
    const existingSlideId1 = new mongoose.Types.ObjectId();
    const validNonExistentIdString = new mongoose.Types.ObjectId().toString();
    const existingSlideId2 = new mongoose.Types.ObjectId();
    const slideIds = [existingSlideId1.toString(), validNonExistentIdString, existingSlideId2.toString()];
    const expectedQueryObjectIds = slideIds.map(id => new mongoose.Types.ObjectId(id));
    const foundSlides = [ { _id: existingSlideId1 }, { _id: existingSlideId2 } ];

    MockSlideQueryObject_execFn.mockResolvedValue(foundSlides);

    const result = await slideHelper.validateSlidesExist(slideIds);
    expect(MockSlideConstructor.find).toHaveBeenCalledWith({ _id: { $in: expectedQueryObjectIds } });
    expect(result).toBe(false);
  });

  it('should return true if the array of slide IDs is empty', async () => {
    const result = await slideHelper.validateSlidesExist([]);
    expect(MockSlideConstructor.find).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return false and log error if Slide.find throws an error', async () => {
    const slideIds = [new mongoose.Types.ObjectId().toString()];
    const dbError = new Error('DB Error');
    MockSlideQueryObject_execFn.mockRejectedValue(dbError);

    const result = await slideHelper.validateSlidesExist(slideIds);

    expect(MockSlideConstructor.find).toHaveBeenCalledTimes(1);
    expect(MockSlideQueryObject_selectFn).toHaveBeenCalledWith('_id');
    expect(MockSlideQueryObject_execFn).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error validating slides:', dbError);
    expect(result).toBe(false);
  });
});


describe('populateSlideshowSlides', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockSlideshowId: mongoose.Types.ObjectId;
  let mockSlides: any[];

  beforeEach(() => {
    mockSlideshowId = new mongoose.Types.ObjectId();
    mockSlides = [{ _id: new mongoose.Types.ObjectId(), name: 'Slide 1' }];
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (MockSlideshowConstructor.findById as jest.Mock).mockClear().mockReturnValue(MockSlideshowQueryObject);
    MockSlideshowQueryObject_populateFn.mockClear().mockImplementation(() => MockSlideshowQueryObject);
    MockSlideshowQueryObject_execFn.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should populate slides using slideshow.populate if it exists', async () => {
    const mockPopulatedSlideshow = {
        _id: mockSlideshowId,
        name: 'Populated Slideshow',
        slides: mockSlides
    };
    const mockSlideshowInstance = {
      _id: mockSlideshowId,
      name: 'Test Slideshow Instance',
      slides: [],
      populate: jest.fn().mockResolvedValue(mockPopulatedSlideshow),
    };

    const result = await slideHelper.populateSlideshowSlides(mockSlideshowInstance as any);

    expect(mockSlideshowInstance.populate).toHaveBeenCalledTimes(1);
    expect(mockSlideshowInstance.populate).toHaveBeenCalledWith('slides');
    expect(MockSlideshowConstructor.findById).not.toHaveBeenCalled();
    expect(result).toEqual(mockPopulatedSlideshow);
  });

  it('should populate slides using Slideshow.findById().populate() if slideshow.populate does not exist', async () => {
    const plainSlideshowObject = {
      _id: mockSlideshowId,
      name: 'Plain Slideshow Object',
      slides: [],
    };
    const mockPopulatedSlideshowDoc = {
        _id: mockSlideshowId,
        name: 'Populated Via FindById',
        slides: mockSlides
    };

    MockSlideshowQueryObject_execFn.mockResolvedValue(mockPopulatedSlideshowDoc);

    const result = await slideHelper.populateSlideshowSlides(plainSlideshowObject as any);

    expect(MockSlideshowConstructor.findById).toHaveBeenCalledTimes(1);
    expect(MockSlideshowConstructor.findById).toHaveBeenCalledWith(plainSlideshowObject._id);
    expect(MockSlideshowQueryObject_populateFn).toHaveBeenCalledTimes(1);
    expect(MockSlideshowQueryObject_populateFn).toHaveBeenCalledWith('slides');
    expect(MockSlideshowQueryObject_execFn).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockPopulatedSlideshowDoc);
  });

  it('should return null if input slideshow is null', async () => {
    const result = await slideHelper.populateSlideshowSlides(null);
    expect(result).toBeNull();
    expect(MockSlideshowConstructor.findById).not.toHaveBeenCalled();
  });

  it('should return original slideshow and log error if slideshow.populate fails', async () => {
    const dbError = new Error('Populate failed');
    const mockSlideshowInstance = {
      _id: mockSlideshowId,
      name: 'Test Slideshow Instance Error',
      slides: [],
      populate: jest.fn().mockRejectedValue(dbError),
    };

    const result = await slideHelper.populateSlideshowSlides(mockSlideshowInstance as any);

    expect(mockSlideshowInstance.populate).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Error populating slideshow ${mockSlideshowId}:`, dbError);
    expect(result).toEqual(mockSlideshowInstance);
  });

  it('should return original slideshow and log error if Slideshow.findById().populate() fails', async () => {
    const plainSlideshowObject = {
      _id: mockSlideshowId,
      name: 'Plain Slideshow Object Error',
      slides: [],
    };
    const dbError = new Error('FindById or populate failed');

    MockSlideshowQueryObject_execFn.mockRejectedValue(dbError);

    const result = await slideHelper.populateSlideshowSlides(plainSlideshowObject as any);

    expect(MockSlideshowConstructor.findById).toHaveBeenCalledTimes(1);
    expect(MockSlideshowQueryObject_populateFn).toHaveBeenCalledWith('slides');
    expect(MockSlideshowQueryObject_execFn).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Error populating slideshow ${mockSlideshowId}:`, dbError);
    expect(result).toEqual(plainSlideshowObject);
  });
});

describe('reorderSlidesInSlideshow', () => {
  let slideId1: mongoose.Types.ObjectId;
  let slideId2: mongoose.Types.ObjectId;
  let slideId3: mongoose.Types.ObjectId;
  let slideshowObject: { name: string; slides: mongoose.Types.ObjectId[] };

  beforeEach(() => {
    slideId1 = new mongoose.Types.ObjectId();
    slideId2 = new mongoose.Types.ObjectId();
    slideId3 = new mongoose.Types.ObjectId();
    slideshowObject = {
      name: 'Test Slideshow',
      slides: [slideId1, slideId2, slideId3],
    };
  });

  it('should successfully reorder slides (move forward)', async () => {
    const updatedSlideshow = await slideHelper.reorderSlidesInSlideshow(slideshowObject as any, 0, 2);
    expect(updatedSlideshow).toBe(slideshowObject);
    expect(updatedSlideshow.slides.map(id => id.toString())).toEqual([
      slideId2.toString(),
      slideId3.toString(),
      slideId1.toString(),
    ]);
  });

  it('should successfully reorder slides (move backward)', async () => {
    const updatedSlideshow = await slideHelper.reorderSlidesInSlideshow(slideshowObject as any, 2, 0);
    expect(updatedSlideshow.slides.map(id => id.toString())).toEqual([
      slideId3.toString(),
      slideId1.toString(),
      slideId2.toString(),
    ]);
  });

  it('should make no change if oldIndex and newIndex are the same', async () => {
    const originalSlides = [...slideshowObject.slides];
    const updatedSlideshow = await slideHelper.reorderSlidesInSlideshow(slideshowObject as any, 1, 1);
    expect(updatedSlideshow.slides).toEqual(originalSlides);
  });

  it('should throw error for oldIndex out of bounds (negative)', async () => {
    await expect(slideHelper.reorderSlidesInSlideshow(slideshowObject as any, -1, 1))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error for oldIndex out of bounds (too large)', async () => {
    await expect(slideHelper.reorderSlidesInSlideshow(slideshowObject as any, 3, 1))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error for newIndex out of bounds (negative)', async () => {
    await expect(slideHelper.reorderSlidesInSlideshow(slideshowObject as any, 1, -1))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error for newIndex out of bounds (too large)', async () => {
    await expect(slideHelper.reorderSlidesInSlideshow(slideshowObject as any, 1, 3))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error if slides array is empty and indices are 0', async () => {
    slideshowObject.slides = [];
    await expect(slideHelper.reorderSlidesInSlideshow(slideshowObject as any, 0, 0))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });
});
