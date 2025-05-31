import mongoose from 'mongoose'; // Will be the mocked version
import { jest } from '@jest/globals';

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  const modelRegistry: { [key: string]: any } = {};

  const mockQuery = {
    exec: jest.fn().mockResolvedValue([]), // Default to empty array for find, null for findOne/findById
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(), // Make select chainable and ultimately call exec
    lean: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
  };

  // Allow exec to be dynamically set
  (mockQuery.select as jest.Mock).mockImplementation(function() {
    // If select is called, it should return the query object itself,
    // so that exec can be called on it.
    // The mockResolvedValue for exec will be set by specific tests.
    return this;
  });


  return {
    ...actualMongoose,
    Types: {
      ...actualMongoose.Types,
      ObjectId: actualMongoose.Types.ObjectId, // Use REAL ObjectId (constructor + static methods)
    },
    model: jest.fn((modelNameOrSchema: string | any, schema?: any) => {
      const modelName = typeof modelNameOrSchema === 'string' ? modelNameOrSchema : modelNameOrSchema.modelName || 'TestModel';

      if (!modelRegistry[modelName]) {
        const ModelConstructor = jest.fn(data => {
          const instance = {
            ...data,
            _id: new actualMongoose.Types.ObjectId(),
            save: jest.fn().mockResolvedValue(instance),
            populate: jest.fn().mockReturnThis(),
            execPopulate: jest.fn().mockResolvedValue(instance),
            toJSON: jest.fn().mockReturnValue({ ...data, _id: (instance as any)._id })
          };
          return instance;
        });
        ModelConstructor.modelName = modelName;

        ['find', 'findById', 'findOne', 'create', 'insertMany', 'updateMany', 'updateOne', 'findByIdAndUpdate', 'findByIdAndDelete', 'deleteMany', 'countDocuments', 'distinct', 'aggregate']
          .forEach(staticMethod => {
            (ModelConstructor as any)[staticMethod] = jest.fn((...args: any[]) => {
              const specificMockQuery = { ...mockQuery }; // Clone to allow individual exec mocks
              specificMockQuery.exec = jest.fn(); // Each static method call gets its own exec

              if (['find', 'findById', 'findOne', 'findByIdAndUpdate', 'findByIdAndDelete'].includes(staticMethod)) {
                 // Set default resolution for exec based on method type
                if (staticMethod.startsWith('find') && !staticMethod.endsWith('One') && !staticMethod.endsWith('ById')) {
                  specificMockQuery.exec.mockResolvedValue([]); // find returns array
                } else {
                  specificMockQuery.exec.mockResolvedValue(null); // findOne/ById returns null/obj
                }
                return specificMockQuery;
              }
              if (staticMethod === 'insertMany' || staticMethod === 'create') {
                const inputData = args[0];
                if (Array.isArray(inputData)) {
                  return Promise.resolve(inputData.map(d => ({ ...d, _id: new actualMongoose.Types.ObjectId() })));
                }
                return Promise.resolve({ ...inputData, _id: new actualMongoose.Types.ObjectId() });
              }
              return Promise.resolve({ acknowledged: true, matchedCount: 0, modifiedCount: 0, deletedCount: 0 });
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

// Import function to test and models
import { validateSlidesExist, reorderSlidesInSlideshow } from '../../../api/helpers/slideshow_helper'; // Adjust path
import Slide from '../../../api/models/Slide'; // Adjust path

describe('validateSlidesExist', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset Slide.find and its chainable methods' mocks
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(), // This will be configured per test
      lean: jest.fn().mockReturnThis(), // Add other chainable methods if used
    };
    (Slide.find as jest.Mock).mockReset().mockReturnValue(mockQuery); // Reset and set default return

    // Ensure the exec on the returned query object is also reset if necessary,
    // but since mockQuery is fresh each time, its exec is fresh.

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

    // Configure the exec method on the object returned by Slide.find()
    const mockQueryReturnedByFind = (Slide.find as jest.Mock).mock.results[0]?.value || Slide.find(); // Get the mock query object
    (mockQueryReturnedByFind.exec as jest.Mock).mockResolvedValue(slideObjectIds.map(id => ({ _id: id })));

    const result = await validateSlidesExist(slideIds);

    expect(Slide.find).toHaveBeenCalledTimes(1);
    expect(Slide.find).toHaveBeenCalledWith({ _id: { $in: slideObjectIds } });
    expect(mockQueryReturnedByFind.select).toHaveBeenCalledWith('_id');
    expect(mockQueryReturnedByFind.exec).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('should return false if some slide IDs do not exist', async () => {
    const existingSlideId1 = new mongoose.Types.ObjectId();
    const nonExistentId = 'nonExistentId62736473aaab'; // Ensure it's a valid hex length if ObjectId constructor is strict
    const existingSlideId2 = new mongoose.Types.ObjectId();

    // For testing, ensure nonExistentId is a string that mongoose.Types.ObjectId.isValid would pass,
    // but it just won't be found in the DB.
    const validNonExistentIdString = new mongoose.Types.ObjectId().toString();


    const slideIds = [existingSlideId1.toString(), validNonExistentIdString, existingSlideId2.toString()];

    const foundSlides = [ // Simulate that only existingSlideId1 and existingSlideId2 are found
      { _id: existingSlideId1 },
      { _id: existingSlideId2 },
    ];

    const mockQueryReturnedByFind = (Slide.find as jest.Mock).mock.results[0]?.value || Slide.find();
    (mockQueryReturnedByFind.exec as jest.Mock).mockResolvedValue(foundSlides);

    const result = await validateSlidesExist(slideIds);

    // Check that Slide.find was called with ObjectIds that could be formed from input
    // The function itself should create ObjectIds from strings for the query.
    // The helper should convert all strings in slideIds to ObjectIds for the query
    const expectedQueryObjectIds = slideIds.map(id => new mongoose.Types.ObjectId(id));
    expect(Slide.find).toHaveBeenCalledWith({ _id: { $in: expectedQueryObjectIds } });
    expect(result).toBe(false);
  });

  it('should return true if the array of slide IDs is empty', async () => {
    const result = await validateSlidesExist([]);
    expect(Slide.find).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return false and log error if Slide.find throws an error', async () => {
    const slideIds = [new mongoose.Types.ObjectId().toString()];
    const dbError = new Error('DB Error');

    const mockQueryReturnedByFind = (Slide.find as jest.Mock).mock.results[0]?.value || Slide.find();
    (mockQueryReturnedByFind.exec as jest.Mock).mockRejectedValue(dbError);

    const result = await validateSlidesExist(slideIds);

    expect(Slide.find).toHaveBeenCalledTimes(1); // Slide.find itself is called once
    expect(mockQueryReturnedByFind.select).toHaveBeenCalledWith('_id'); // select is called
    expect(mockQueryReturnedByFind.exec).toHaveBeenCalledTimes(1); // exec is called
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error validating slides:', dbError);
    expect(result).toBe(false);
  });
});

// Placeholder for deleteSlideFromSystem and getDisplayWithWidgets tests
// describe('deleteSlideFromSystem', () => { /* ... */ });
// describe('getDisplayWithWidgets', () => { /* ... */ });

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
    const updatedSlideshow = await reorderSlidesInSlideshow(slideshowObject as any, 0, 2);
    expect(updatedSlideshow).toBe(slideshowObject); // Mutates and returns same object
    expect(updatedSlideshow.slides.map(id => id.toString())).toEqual([
      slideId2.toString(),
      slideId3.toString(),
      slideId1.toString(),
    ]);
  });

  it('should successfully reorder slides (move backward)', async () => {
    const updatedSlideshow = await reorderSlidesInSlideshow(slideshowObject as any, 2, 0);
    expect(updatedSlideshow.slides.map(id => id.toString())).toEqual([
      slideId3.toString(),
      slideId1.toString(),
      slideId2.toString(),
    ]);
  });

  it('should make no change if oldIndex and newIndex are the same', async () => {
    const originalSlides = [...slideshowObject.slides];
    const updatedSlideshow = await reorderSlidesInSlideshow(slideshowObject as any, 1, 1);
    expect(updatedSlideshow.slides).toEqual(originalSlides);
  });

  it('should throw error for oldIndex out of bounds (negative)', async () => {
    await expect(reorderSlidesInSlideshow(slideshowObject as any, -1, 1))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error for oldIndex out of bounds (too large)', async () => {
    await expect(reorderSlidesInSlideshow(slideshowObject as any, 3, 1))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error for newIndex out of bounds (negative)', async () => {
    await expect(reorderSlidesInSlideshow(slideshowObject as any, 1, -1))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error for newIndex out of bounds (too large)', async () => {
    await expect(reorderSlidesInSlideshow(slideshowObject as any, 1, 3))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });

  it('should throw error if slides array is empty and indices are 0', async () => {
    slideshowObject.slides = [];
    await expect(reorderSlidesInSlideshow(slideshowObject as any, 0, 0))
      .rejects.toThrow('Invalid slide indices for reordering.');
  });
});
