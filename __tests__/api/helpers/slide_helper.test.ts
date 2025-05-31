import mongoose from 'mongoose'; // Will be the mocked version
import { jest } from '@jest/globals';

// Mock mongoose
// const actualMongoose = jest.requireActual('mongoose'); // Moved inside

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose'); // Moved inside
  const modelRegistry: { [key: string]: any } = {};

  return {
    ...actualMongoose, // Spread real Mongoose
    Types: {
      ...actualMongoose.Types, // Spread real Types
      ObjectId: jest.fn((id?: string | number | null) => new actualMongoose.Types.ObjectId(id)), // Mock ObjectId to return a real one
    },
    model: jest.fn((modelNameOrSchema: string | any, schema?: any) => {
      const modelName = typeof modelNameOrSchema === 'string' ? modelNameOrSchema : modelNameOrSchema.modelName || 'TestModel';

      if (!modelRegistry[modelName]) {
        const ModelConstructor = jest.fn(data => { // Mock constructor
          const instance = {
            ...data,
            _id: new actualMongoose.Types.ObjectId(),
            save: jest.fn().mockResolvedValue(instance), // 'this' would be tricky here, resolve with instance data
            populate: jest.fn().mockReturnThis(),
            execPopulate: jest.fn().mockResolvedValue(instance),
            toJSON: jest.fn().mockReturnValue({ ...data, _id: (instance as any)._id })
          };
          return instance;
        });
        ModelConstructor.modelName = modelName;

        // Add common static mocks
        ['find', 'findById', 'findOne', 'create', 'insertMany', 'updateMany', 'updateOne', 'findByIdAndUpdate', 'findByIdAndDelete', 'deleteMany', 'countDocuments', 'distinct', 'aggregate']
          .forEach(staticMethod => {
            (ModelConstructor as any)[staticMethod] = jest.fn((...args: any[]) => {
              if (['find', 'findById', 'findOne', 'findByIdAndUpdate', 'findByIdAndDelete'].includes(staticMethod)) {
                const query = {
                  populate: jest.fn().mockReturnThis(),
                  select: jest.fn().mockReturnThis(),
                  sort: jest.fn().mockReturnThis(),
                  limit: jest.fn().mockReturnThis(),
                  skip: jest.fn().mockReturnThis(),
                  lean: jest.fn().mockReturnThis(),
                  exec: jest.fn().mockResolvedValue(staticMethod.startsWith('find') && !staticMethod.endsWith('One') ? [] : null),
                };
                return query;
              }
              // Default for create, insertMany, updateMany etc.
              if (staticMethod === 'insertMany' || staticMethod === 'create') {
                // args[0] is the data or array of data
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
    Model: jest.fn(), // Mock base Model class constructor
    get models() { // Use a getter to return the current state of our registry
      return modelRegistry;
    },
    Schema: actualMongoose.Schema, // Use real Schema
  };
});

// Mock addSlideToSlideshows and removeSlideFromSlideshows from the same helper file
// This needs to be before the actual import of these functions for testing handleSlideInSlideshows
jest.mock('../../../api/helpers/slide_helper', () => ({
  ...jest.requireActual('../../../api/helpers/slide_helper'), // Import and retain other functions
  addSlideToSlideshows: jest.fn().mockResolvedValue(undefined),
  removeSlideFromSlideshows: jest.fn().mockResolvedValue(undefined),
}));

// Step 3 & 4: Import functions and models
// Adjust paths as necessary
// Import the real handleSlideInSlideshows, and the mocked versions of add/remove
import {
  handleSlideInSlideshows,
  addSlideToSlideshows as mockAddSlideToSlideshows, // This will be the jest.fn() from the mock above
  removeSlideFromSlideshows as mockRemoveSlideFromSlideshows // This will be the jest.fn() from the mock above
} from '../../../api/helpers/slide_helper';
import Slide from '../../../api/models/Slide'; // These are mocked by jest.mock('mongoose')
import Slideshow from '../../../api/models/Slideshow'; // These are mocked by jest.mock('mongoose')

// For testing the actual addSlideToSlideshows and removeSlideFromSlideshows:
const actualSlideHelper = jest.requireActual('../../../api/helpers/slide_helper');


// Ensure that after jest.mock, Slide and Slideshow are indeed our mocked versions

// Step 5: Describe block for addSlideToSlideshows
describe('addSlideToSlideshows', () => {
  let mockSlide: any;
  let slideshowIds: string[];
  let slideshowObjectIds: mongoose.Types.ObjectId[];

  beforeEach(() => {
    // Reset relevant mocks before each test
    if (Slideshow && Slideshow.updateMany && (Slideshow.updateMany as jest.Mock).mockReset) {
        (Slideshow.updateMany as jest.Mock).mockReset();
    }


    mockSlide = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Slide',
      // Add other necessary slide properties if the function uses them
    };

    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    slideshowObjectIds = [id1, id2];
    slideshowIds = slideshowObjectIds.map(id => id.toString());
  });

  // Step 7: Write tests
  it('should successfully add slide to multiple slideshows', async () => {
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: slideshowIds.length, matchedCount: slideshowIds.length });

    await actualSlideHelper.addSlideToSlideshows(mockSlide, slideshowIds);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $addToSet: { slides: mockSlide._id } }
    );
  });

  it('should handle a single slideshow ID string', async () => {
    const singleSlideshowId = slideshowObjectIds[0];
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1, matchedCount: 1 });

    await actualSlideHelper.addSlideToSlideshows(mockSlide, singleSlideshowId.toString());

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [singleSlideshowId] } }, // Expecting an array even for a single ID
      { $addToSet: { slides: mockSlide._id } }
    );
  });

  it('should handle a single slideshow ObjectId', async () => {
    const singleSlideshowObjectId = slideshowObjectIds[0];
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1, matchedCount: 1 });

    await actualSlideHelper.addSlideToSlideshows(mockSlide, singleSlideshowObjectId);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [singleSlideshowObjectId] } },
      { $addToSet: { slides: mockSlide._id } }
    );
  });


  it('should not call updateMany if slideshowIds array is empty', async () => {
    await actualSlideHelper.addSlideToSlideshows(mockSlide, []);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is undefined', async () => {
    await actualSlideHelper.addSlideToSlideshows(mockSlide, undefined as any); // Cast to any to bypass type check for testing
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is null', async () => {
    await actualSlideHelper.addSlideToSlideshows(mockSlide, null as any);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });


  it('should throw an error if Slideshow.updateMany rejects', async () => {
    const dbError = new Error('DB Error');
    (Slideshow.updateMany as jest.Mock).mockRejectedValue(dbError);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(actualSlideHelper.addSlideToSlideshows(mockSlide, slideshowIds))
      .rejects.toThrow('Failed to add slide to slideshows.');

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding slide to slideshows:', dbError);
    consoleErrorSpy.mockRestore();
  });
});

describe('handleSlideInSlideshows', () => {
  let mockSlide: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear mocks and set default resolved values before each test
    (mockAddSlideToSlideshows as jest.Mock).mockReset().mockResolvedValue(undefined);
    (mockRemoveSlideFromSlideshows as jest.Mock).mockReset().mockResolvedValue(undefined);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockSlide = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Slide',
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should only call addSlideToSlideshows when new slideshows are provided', async () => {
    const originalSlideshowIds: string[] = [];
    const newSlideshowIdsStrings = [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()];

    await handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIds);

    expect(mockAddSlideToSlideshows).toHaveBeenCalledTimes(1);
    expect(mockAddSlideToSlideshows).toHaveBeenCalledWith(mockSlide,
      expect.arrayContaining(newSlideshowIdsStrings.map(id => new mongoose.Types.ObjectId(id)))
    );
    expect(mockRemoveSlideFromSlideshows).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should only call removeSlideFromSlideshows when slideshows are removed', async () => {
    const originalSlideshowIdsStrings = [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()];
    const newSlideshowIdsStrings: string[] = [];

    await handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIdsStrings);

    expect(mockRemoveSlideFromSlideshows).toHaveBeenCalledTimes(1);
    expect(mockRemoveSlideFromSlideshows).toHaveBeenCalledWith(mockSlide._id,
      expect.arrayContaining(originalSlideshowIdsStrings.map(id => new mongoose.Types.ObjectId(id)))
    );
    expect(mockAddSlideToSlideshows).not.toHaveBeenCalled();
  });

  it('should call add and remove when there is a mix of changes', async () => {
    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    const id3 = new mongoose.Types.ObjectId();

    const originalSlideshowIdsAsStrings = [id1.toString(), id2.toString()];
    const newSlideshowIdsAsStrings = [id2.toString(), id3.toString()]; // id1 removed, id3 added, id2 same

    await handleSlideInSlideshows(mockSlide, newSlideshowIdsAsStrings, originalSlideshowIdsAsStrings);

    expect(mockAddSlideToSlideshows).toHaveBeenCalledTimes(1);
    // addSlideToSlideshows is called with slide object and an array of ObjectIds to add
    expect(mockAddSlideToSlideshows).toHaveBeenCalledWith(mockSlide,
      expect.arrayContaining([id3]) // id3 is new, ensure it's ObjectId
    );

    expect(mockRemoveSlideFromSlideshows).toHaveBeenCalledTimes(1);
    // removeSlideFromSlideshows is called with slideId and an array of ObjectIds to remove from
    expect(mockRemoveSlideFromSlideshows).toHaveBeenCalledWith(mockSlide._id,
      expect.arrayContaining([id1]) // id1 is removed, ensure it's ObjectId
    );
  });

  it('should not call add or remove if slideshow IDs are the same', async () => {
    const id1 = new mongoose.Types.ObjectId().toString();
    const id2 = new mongoose.Types.ObjectId().toString();
    const originalSlideshowIds = [id1, id2];
    const newSlideshowIds = [id1, id2]; // Same IDs

    await handleSlideInSlideshows(mockSlide, newSlideshowIds, originalSlideshowIds);

    expect(mockAddSlideToSlideshows).not.toHaveBeenCalled();
    expect(mockRemoveSlideFromSlideshows).not.toHaveBeenCalled();
  });

  it('should handle all string inputs for IDs correctly', async () => {
    const id1Str = new mongoose.Types.ObjectId().toString();
    const id2Str = new mongoose.Types.ObjectId().toString();
    const id3Str = new mongoose.Types.ObjectId().toString();

    const originalSlideshowIdsStr = [id1Str, id2Str];
    const newSlideshowIdsStr = [id2Str, id3Str];

    await handleSlideInSlideshows(mockSlide, newSlideshowIdsStr, originalSlideshowIdsStr);

    expect(mockAddSlideToSlideshows).toHaveBeenCalledWith(mockSlide,
      expect.arrayContaining([new mongoose.Types.ObjectId(id3Str)])
    );
    expect(mockRemoveSlideFromSlideshows).toHaveBeenCalledWith(mockSlide._id,
      expect.arrayContaining([new mongoose.Types.ObjectId(id1Str)])
    );
  });


  it('should throw error if addSlideToSlideshows fails', async () => {
    const originalSlideshowIdsStrings: string[] = [];
    const newSlideshowIdsStrings = [new mongoose.Types.ObjectId().toString()];
    const addError = new Error('Test Add Failed');
    (mockAddSlideToSlideshows as jest.Mock).mockRejectedValueOnce(addError);

    await expect(handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIdsStrings))
      .rejects.toThrow('Failed to update slide presence in slideshows.');

    // Check for the specific call to console.error from handleSlideInSlideshows's catch block
    const relevantCall = (consoleErrorSpy.mock.calls as any[]).find(
      call => call[0] === 'Error handling slide in slideshows:' && call[1]?.message === 'Test Add Failed'
    );
    expect(relevantCall).toBeDefined();
  });

  it('should throw error if removeSlideFromSlideshows fails', async () => {
    const originalSlideshowIdsStrings = [new mongoose.Types.ObjectId().toString()];
    const newSlideshowIdsStrings: string[] = [];
    const removeError = new Error('Remove failed');
    (mockRemoveSlideFromSlideshows as jest.Mock).mockRejectedValueOnce(removeError);

    await expect(handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIdsStrings))
      .rejects.toThrow('Failed to update slide presence in slideshows.');

    const relevantCall = (consoleErrorSpy.mock.calls as any[]).find(
      call => call[0] === 'Error handling slide in slideshows:' && call[1]?.message === 'Remove failed'
    );
    expect(relevantCall).toBeDefined();
  });
});

describe('removeSlideFromSlideshows', () => {
  let mockSlideId: mongoose.Types.ObjectId;
  let mockSlideObject: { _id: mongoose.Types.ObjectId; name: string };
  let slideshowIds: string[];
  let slideshowObjectIds: mongoose.Types.ObjectId[];

  beforeEach(() => {
    if (Slideshow && Slideshow.updateMany && (Slideshow.updateMany as jest.Mock).mockReset) {
      (Slideshow.updateMany as jest.Mock).mockReset();
    }

    mockSlideId = new mongoose.Types.ObjectId();
    mockSlideObject = { _id: mockSlideId, name: 'Test Slide Object' };

    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    slideshowObjectIds = [id1, id2];
    slideshowIds = slideshowObjectIds.map(id => id.toString());
  });

  it('should successfully remove slide from multiple slideshows using slide ObjectId', async () => {
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: slideshowIds.length });

    await actualSlideHelper.removeSlideFromSlideshows(mockSlideId, slideshowIds);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $pull: { slides: mockSlideId } }
    );
  });

  it('should successfully remove slide from multiple slideshows using slide object', async () => {
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: slideshowIds.length });

    await actualSlideHelper.removeSlideFromSlideshows(mockSlideObject, slideshowIds);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $pull: { slides: mockSlideObject._id } } // Should use mockSlideObject._id
    );
  });

  it('should handle a single slideshow ID string', async () => {
    const singleSlideshowIdString = slideshowObjectIds[0].toString();
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

    await actualSlideHelper.removeSlideFromSlideshows(mockSlideId, singleSlideshowIdString);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [slideshowObjectIds[0]] } }, // Expecting ObjectId in array
      { $pull: { slides: mockSlideId } }
    );
  });

  it('should handle a single slideshow ObjectId', async () => {
    const singleSlideshowObjectId = slideshowObjectIds[0];
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

    await actualSlideHelper.removeSlideFromSlideshows(mockSlideId, singleSlideshowObjectId);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [singleSlideshowObjectId] } },
      { $pull: { slides: mockSlideId } }
    );
  });

  it('should handle slideOrSlideId as a string ID', async () => {
    const slideIdString = mockSlideId.toString();
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: slideshowIds.length });

    await actualSlideHelper.removeSlideFromSlideshows(slideIdString, slideshowIds);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $pull: { slides: mockSlideId } } // Expecting it to be converted to ObjectId
    );
  });

  it('should not call updateMany if slideshowIds array is empty', async () => {
    await actualSlideHelper.removeSlideFromSlideshows(mockSlideId, []);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is undefined', async () => {
    await actualSlideHelper.removeSlideFromSlideshows(mockSlideId, undefined as any);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is null', async () => {
    await actualSlideHelper.removeSlideFromSlideshows(mockSlideId, null as any);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should throw an error if Slideshow.updateMany rejects', async () => {
    const dbError = new Error('DB Error');
    (Slideshow.updateMany as jest.Mock).mockRejectedValue(dbError);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(actualSlideHelper.removeSlideFromSlideshows(mockSlideId, slideshowIds))
      .rejects.toThrow('Failed to remove slide from slideshows.');

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error removing slide from slideshows:', dbError);
    consoleErrorSpy.mockRestore();
  });
});
