import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  const modelRegistry: { [key: string]: any } = {};

  return {
    ...actualMongoose,
    Types: {
      ...actualMongoose.Types,
      ObjectId: jest.fn((id?: string | number | null) => new actualMongoose.Types.ObjectId(id)),
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
    get models() {
      return modelRegistry;
    },
    Schema: actualMongoose.Schema,
  };
});

// Import all functions from the helper using a namespace import
import * as slideHelper from '../../../api/helpers/slide_helper';
import Slide from '../../../api/models/Slide';
import Slideshow from '../../../api/models/Slideshow';


describe('addSlideToSlideshows', () => {
  let mockSlide: any;
  let slideshowIds: string[];
  let slideshowObjectIds: mongoose.Types.ObjectId[];

  beforeEach(() => {
    if (Slideshow && Slideshow.updateMany && (Slideshow.updateMany as jest.Mock).mockReset) {
        (Slideshow.updateMany as jest.Mock).mockReset();
    }
    mockSlide = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Slide',
    };
    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    slideshowObjectIds = [id1, id2];
    slideshowIds = slideshowObjectIds.map(id => id.toString());
  });

  it('should successfully add slide to multiple slideshows', async () => {
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: slideshowIds.length, matchedCount: slideshowIds.length });
    await slideHelper.addSlideToSlideshows(mockSlide, slideshowIds); // Call actual function via namespace
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $addToSet: { slides: mockSlide._id } }
    );
  });

  it('should handle a single slideshow ID string', async () => {
    const singleSlideshowId = slideshowObjectIds[0];
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1, matchedCount: 1 });
    await slideHelper.addSlideToSlideshows(mockSlide, singleSlideshowId.toString());
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [singleSlideshowId] } },
      { $addToSet: { slides: mockSlide._id } }
    );
  });

  it('should handle a single slideshow ObjectId', async () => {
    const singleSlideshowObjectId = slideshowObjectIds[0];
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1, matchedCount: 1 });
    await slideHelper.addSlideToSlideshows(mockSlide, singleSlideshowObjectId);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [singleSlideshowObjectId] } },
      { $addToSet: { slides: mockSlide._id } }
    );
  });

  it('should not call updateMany if slideshowIds array is empty', async () => {
    await slideHelper.addSlideToSlideshows(mockSlide, []);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is undefined', async () => {
    await slideHelper.addSlideToSlideshows(mockSlide, undefined as any);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is null', async () => {
    await slideHelper.addSlideToSlideshows(mockSlide, null as any);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should throw an error if Slideshow.updateMany rejects', async () => {
    const dbError = new Error('DB Error');
    (Slideshow.updateMany as jest.Mock).mockRejectedValue(dbError);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(slideHelper.addSlideToSlideshows(mockSlide, slideshowIds))
      .rejects.toThrow('Failed to add slide to slideshows.');
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding slide to slideshows:', dbError);
    consoleErrorSpy.mockRestore();
  });
});

describe('handleSlideInSlideshows', () => {
  let mockSlide: any;
  let consoleErrorSpy: jest.SpyInstance;
  let addSlideSpy: jest.SpyInstance;
  let removeSlideSpy: jest.SpyInstance;

  beforeEach(() => {
    addSlideSpy = jest.spyOn(slideHelper, 'addSlideToSlideshows').mockResolvedValue(undefined);
    removeSlideSpy = jest.spyOn(slideHelper, 'removeSlideFromSlideshows').mockResolvedValue(undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSlide = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Slide',
    };
  });

  afterEach(() => {
    addSlideSpy.mockRestore();
    removeSlideSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should only call addSlideToSlideshows when new slideshows are provided', async () => {
    const originalSlideshowIds: string[] = [];
    const newSlideshowObjectIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    const newSlideshowIdsStrings = newSlideshowObjectIds.map(id => id.toString());

    await slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIds);

    expect(addSlideSpy).toHaveBeenCalledTimes(1);
    const actualArgsForAdd = addSlideSpy.mock.calls[0];
    const actualSlideArg = actualArgsForAdd[0];
    const actualIdsArrayArg = actualArgsForAdd[1];
    expect(actualSlideArg).toEqual(mockSlide);
    const actualIdsAsStrings = actualIdsArrayArg.map((id: mongoose.Types.ObjectId) => id.toString());
    const expectedIdsAsStrings = newSlideshowObjectIds.map(id => id.toString());
    expect(actualIdsAsStrings.sort()).toEqual(expectedIdsAsStrings.sort());
    expect(removeSlideSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should only call removeSlideFromSlideshows when slideshows are removed', async () => {
    const originalSlideshowObjectIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    const originalSlideshowIdsStrings = originalSlideshowObjectIds.map(id => id.toString());
    const newSlideshowIdsStrings: string[] = [];

    await slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIdsStrings);

    expect(removeSlideSpy).toHaveBeenCalledTimes(1);
    const actualArgsForRemove = removeSlideSpy.mock.calls[0];
    const actualSlideIdArg = actualArgsForRemove[0];
    const actualIdsArrayArg = actualArgsForRemove[1];
    expect(actualSlideIdArg.toString()).toEqual(mockSlide._id.toString());
    const actualIdsAsStrings = actualIdsArrayArg.map((id: mongoose.Types.ObjectId) => id.toString());
    const expectedIdsAsStrings = originalSlideshowObjectIds.map(id => id.toString());
    expect(actualIdsAsStrings.sort()).toEqual(expectedIdsAsStrings.sort());
    expect(addSlideSpy).not.toHaveBeenCalled();
  });

  it('should call add and remove when there is a mix of changes', async () => {
    const id1_obj = new mongoose.Types.ObjectId();
    const id2_obj = new mongoose.Types.ObjectId();
    const id3_obj = new mongoose.Types.ObjectId();
    const originalSlideshowIdsAsStrings = [id1_obj.toString(), id2_obj.toString()];
    const newSlideshowIdsAsStrings = [id2_obj.toString(), id3_obj.toString()];

    await slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIdsAsStrings, originalSlideshowIdsAsStrings);

    expect(addSlideSpy).toHaveBeenCalledTimes(1);
    const addArgs = addSlideSpy.mock.calls[0];
    expect(addArgs[0]).toEqual(mockSlide);
    const addedIdsAsStrings = addArgs[1].map((id: mongoose.Types.ObjectId) => id.toString());
    expect(addedIdsAsStrings.sort()).toEqual([id3_obj.toString()].sort());

    expect(removeSlideSpy).toHaveBeenCalledTimes(1);
    const removeArgs = removeSlideSpy.mock.calls[0];
    expect(removeArgs[0].toString()).toEqual(mockSlide._id.toString());
    const removedIdsAsStrings = removeArgs[1].map((id: mongoose.Types.ObjectId) => id.toString());
    expect(removedIdsAsStrings.sort()).toEqual([id1_obj.toString()].sort());
  });

  it('should not call add or remove if slideshow IDs are the same (passing ObjectIds)', async () => {
    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    const originalSlideshowIds = [id1, id2];
    const newSlideshowIds = [id2, id1];

    await slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIds, originalSlideshowIds);

    expect(addSlideSpy).not.toHaveBeenCalled();
    expect(removeSlideSpy).not.toHaveBeenCalled();
  });

  it('should not call add or remove if slideshow IDs are the same (passing strings)', async () => {
    const id1Str = new mongoose.Types.ObjectId().toString();
    const id2Str = new mongoose.Types.ObjectId().toString();
    const originalSlideshowIds = [id1Str, id2Str];
    const newSlideshowIds = [id2Str, id1Str];

    await slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIds, originalSlideshowIds);

    expect(addSlideSpy).not.toHaveBeenCalled();
    expect(removeSlideSpy).not.toHaveBeenCalled();
  });

  it('should handle all string inputs for IDs correctly (variation of mixed changes)', async () => {
    const id1Str = new mongoose.Types.ObjectId().toString();
    const id2Str = new mongoose.Types.ObjectId().toString();
    const id3Str = new mongoose.Types.ObjectId().toString();
    const originalSlideshowIdsStr = [id1Str, id2Str];
    const newSlideshowIdsStr = [id2Str, id3Str];

    await slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIdsStr, originalSlideshowIdsStr);

    expect(addSlideSpy).toHaveBeenCalledTimes(1);
    const addArgs = addSlideSpy.mock.calls[0];
    expect(addArgs[0]).toEqual(mockSlide);
    const addedIdsAsStrings = addArgs[1].map((id: mongoose.Types.ObjectId) => id.toString());
    expect(addedIdsAsStrings.sort()).toEqual([id3Str].sort());

    expect(removeSlideSpy).toHaveBeenCalledTimes(1);
    const removeArgs = removeSlideSpy.mock.calls[0];
    expect(removeArgs[0].toString()).toEqual(mockSlide._id.toString());
    const removedIdsAsStrings = removeArgs[1].map((id: mongoose.Types.ObjectId) => id.toString());
    expect(removedIdsAsStrings.sort()).toEqual([id1Str].sort());
  });

  it('should throw error if addSlideToSlideshows fails', async () => {
    consoleErrorSpy.mockClear();
    const originalSlideshowIdsStrings: string[] = [];
    const newSlideshowIdsStrings = [new mongoose.Types.ObjectId().toString()];
    const addError = new Error('Test Add Failed');
    addSlideSpy.mockRejectedValueOnce(addError);

    await expect(slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIdsStrings))
      .rejects.toThrow('Failed to update slide presence in slideshows.');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling slide in slideshows:', addError);
  });

  it('should throw error if removeSlideFromSlideshows fails', async () => {
    consoleErrorSpy.mockClear();
    const originalSlideshowIdsStrings = [new mongoose.Types.ObjectId().toString()];
    const newSlideshowIdsStrings: string[] = [];
    const removeError = new Error('Remove failed');
    removeSlideSpy.mockRejectedValueOnce(removeError);

    await expect(slideHelper.handleSlideInSlideshows(mockSlide, newSlideshowIdsStrings, originalSlideshowIdsStrings))
      .rejects.toThrow('Failed to update slide presence in slideshows.');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling slide in slideshows:', removeError);
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
    await slideHelper.removeSlideFromSlideshows(mockSlideId, slideshowIds);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $pull: { slides: mockSlideId } }
    );
  });

  it('should successfully remove slide from multiple slideshows using slide object', async () => {
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: slideshowIds.length });
    await slideHelper.removeSlideFromSlideshows(mockSlideObject, slideshowIds);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $pull: { slides: mockSlideObject._id } }
    );
  });

  it('should handle a single slideshow ID string', async () => {
    const singleSlideshowIdString = slideshowObjectIds[0].toString();
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    await slideHelper.removeSlideFromSlideshows(mockSlideId, singleSlideshowIdString);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [slideshowObjectIds[0]] } },
      { $pull: { slides: mockSlideId } }
    );
  });

  it('should handle a single slideshow ObjectId', async () => {
    const singleSlideshowObjectId = slideshowObjectIds[0];
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    await slideHelper.removeSlideFromSlideshows(mockSlideId, singleSlideshowObjectId);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [singleSlideshowObjectId] } },
      { $pull: { slides: mockSlideId } }
    );
  });

  it('should handle slideOrSlideId as a string ID', async () => {
    const slideIdString = mockSlideId.toString();
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: slideshowIds.length });
    await slideHelper.removeSlideFromSlideshows(slideIdString, slideshowIds);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { _id: { $in: slideshowObjectIds } },
      { $pull: { slides: mockSlideId } }
    );
  });

  it('should not call updateMany if slideshowIds array is empty', async () => {
    await slideHelper.removeSlideFromSlideshows(mockSlideId, []);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is undefined', async () => {
    await slideHelper.removeSlideFromSlideshows(mockSlideId, undefined as any);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should not call updateMany if slideshowIds is null', async () => {
    await slideHelper.removeSlideFromSlideshows(mockSlideId, null as any);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
  });

  it('should throw an error if Slideshow.updateMany rejects', async () => {
    const dbError = new Error('DB Error');
    (Slideshow.updateMany as jest.Mock).mockRejectedValue(dbError);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(slideHelper.removeSlideFromSlideshows(mockSlideId, slideshowIds))
      .rejects.toThrow('Failed to remove slide from slideshows.');
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error removing slide from slideshows:', dbError);
    consoleErrorSpy.mockRestore();
  });
});

describe('deleteSlideAndCleanReferences', () => {
  let mockSlideId: mongoose.Types.ObjectId;
  let mockSlideData: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSlideId = new mongoose.Types.ObjectId();
    mockSlideData = {
      _id: mockSlideId,
      name: 'Test Slide to Delete',
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    if ((Slide.findById as jest.Mock)?.mockReset) {
      (Slide.findById as jest.Mock).mockReset();
    }
    if ((Slideshow.updateMany as jest.Mock)?.mockReset) {
      (Slideshow.updateMany as jest.Mock).mockReset();
    }
    if ((Slide.findByIdAndDelete as jest.Mock)?.mockReset) {
      (Slide.findByIdAndDelete as jest.Mock).mockReset();
    }

    (Slide.findById as jest.Mock).mockResolvedValue(mockSlideData);
    (Slideshow.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    (Slide.findByIdAndDelete as jest.Mock).mockResolvedValue(mockSlideData);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should successfully delete a slide and clean references', async () => {
    const result = await slideHelper.deleteSlideAndCleanReferences(mockSlideId.toString());

    expect(Slide.findById).toHaveBeenCalledTimes(1);
    expect(Slide.findById).toHaveBeenCalledWith(mockSlideId);

    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledWith(
      { slides: mockSlideId },
      { $pull: { slides: mockSlideId } }
    );

    expect(Slide.findByIdAndDelete).toHaveBeenCalledTimes(1);
    expect(Slide.findByIdAndDelete).toHaveBeenCalledWith(mockSlideId);

    expect(result).toEqual(mockSlideData);
  });

  it('should return null if slide is not found', async () => {
    (Slide.findById as jest.Mock).mockResolvedValue(null);

    const result = await slideHelper.deleteSlideAndCleanReferences(mockSlideId.toString());

    expect(Slide.findById).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
    expect(Slide.findByIdAndDelete).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should handle slideId as ObjectId type correctly', async () => {
    await slideHelper.deleteSlideAndCleanReferences(mockSlideId);

    expect(Slide.findById).toHaveBeenCalledWith(mockSlideId);
    expect(Slideshow.updateMany).toHaveBeenCalledWith({ slides: mockSlideId }, { $pull: { slides: mockSlideId } });
    expect(Slide.findByIdAndDelete).toHaveBeenCalledWith(mockSlideId);
  });

  it('should throw error if Slide.findById fails', async () => {
    const dbError = new Error('FindById failed');
    (Slide.findById as jest.Mock).mockRejectedValue(dbError);

    await expect(slideHelper.deleteSlideAndCleanReferences(mockSlideId.toString()))
      .rejects.toThrow('Failed to delete slide and update slideshows.');

    expect(Slide.findById).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).not.toHaveBeenCalled();
    expect(Slide.findByIdAndDelete).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting slide and cleaning references:', dbError);
  });

  it('should throw error if Slideshow.updateMany fails', async () => {
    const dbError = new Error('UpdateMany failed');
    (Slideshow.updateMany as jest.Mock).mockRejectedValue(dbError);

    await expect(slideHelper.deleteSlideAndCleanReferences(mockSlideId.toString()))
      .rejects.toThrow('Failed to delete slide and update slideshows.');

    expect(Slide.findById).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slide.findByIdAndDelete).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting slide and cleaning references:', dbError);
  });

  it('should throw error if Slide.findByIdAndDelete fails', async () => {
    const dbError = new Error('FindByIdAndDelete failed');
    (Slide.findByIdAndDelete as jest.Mock).mockRejectedValue(dbError);

    await expect(slideHelper.deleteSlideAndCleanReferences(mockSlideId.toString()))
      .rejects.toThrow('Failed to delete slide and update slideshows.');

    expect(Slide.findById).toHaveBeenCalledTimes(1);
    expect(Slideshow.updateMany).toHaveBeenCalledTimes(1);
    expect(Slide.findByIdAndDelete).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting slide and cleaning references:', dbError);
  });
});
