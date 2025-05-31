import mongoose from 'mongoose';
import Slide, { ISlide } from '../../../api/models/Slide';
import Slideshow from '../../../api/models/Slideshow';
import * as slideHelper from '../../../api/helpers/slide_helper'; // Import all as slideHelper for spying

// Mock Mongoose models
jest.mock('../../../api/models/Slide');
jest.mock('../../../api/models/Slideshow');

const mockObjectId = () => new mongoose.Types.ObjectId();
const mockObjectIdString = () => new mongoose.Types.ObjectId().toHexString();

const mockSlide = (id?: mongoose.Types.ObjectId | string, data?: Partial<ISlide>): Partial<ISlide> => ({
  _id: id || mockObjectId(),
  name: 'Test Slide',
  type: 'image', // Assuming 'image' is a valid ISlide['type']
  data: { url: 'http://example.com/image.png' },
  duration: 10,
  order: 0,
  ...data,
});

describe('slide_helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addSlideToSlideshows', () => {
    it('should add slide to specified slideshows using $addToSet', async () => {
      const slide = mockSlide(mockObjectId()) as ISlide;
      const slideshowIds = [mockObjectId(), mockObjectIdString()];
      const objectIdSlideshowIds = slideshowIds.map(id => new mongoose.Types.ObjectId(id.toString()));

      (Slideshow.updateMany as jest.Mock).mockResolvedValue({ nModified: slideshowIds.length });

      await slideHelper.addSlideToSlideshows(slide, slideshowIds);

      expect(Slideshow.updateMany).toHaveBeenCalledWith(
        { _id: { $in: objectIdSlideshowIds } },
        { $addToSet: { slides: slide._id } }
      );
    });

    it('should handle a single slideshow ID string', async () => {
      const slide = mockSlide(mockObjectId()) as ISlide;
      const slideshowId = mockObjectIdString();
      (Slideshow.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 });

      await slideHelper.addSlideToSlideshows(slide, slideshowId);
      expect(Slideshow.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [new mongoose.Types.ObjectId(slideshowId)] } },
        { $addToSet: { slides: slide._id } }
      );
    });

    it('should handle a single slideshow ID ObjectId', async () => {
      const slide = mockSlide(mockObjectId()) as ISlide;
      const slideshowId = mockObjectId();
      (Slideshow.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 });

      await slideHelper.addSlideToSlideshows(slide, slideshowId);
      expect(Slideshow.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [slideshowId] } },
        { $addToSet: { slides: slide._id } }
      );
    });

    it('should do nothing if slideshowIds is null or empty array', async () => {
      const slide = mockSlide() as ISlide;
      await slideHelper.addSlideToSlideshows(slide, null as any);
      await slideHelper.addSlideToSlideshows(slide, []);
      expect(Slideshow.updateMany).not.toHaveBeenCalled();
    });

    it('should throw an error if Slideshow.updateMany fails', async () => {
      const slide = mockSlide(mockObjectId()) as ISlide;
      const slideshowIds = [mockObjectId()];
      const error = new Error('Update failed');
      (Slideshow.updateMany as jest.Mock).mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(slideHelper.addSlideToSlideshows(slide, slideshowIds))
        .rejects.toThrow('Failed to add slide to slideshows.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding slide to slideshows:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('removeSlideFromSlideshows', () => {
    it('should remove slide from specified slideshows using $pull', async () => {
      const slideId = mockObjectId();
      const slideshowIds = [mockObjectId(), mockObjectIdString()];
      const objectIdSlideshowIds = slideshowIds.map(id => new mongoose.Types.ObjectId(id.toString()));
      (Slideshow.updateMany as jest.Mock).mockResolvedValue({ nModified: slideshowIds.length });

      await slideHelper.removeSlideFromSlideshows(slideId, slideshowIds);

      expect(Slideshow.updateMany).toHaveBeenCalledWith(
        { _id: { $in: objectIdSlideshowIds } },
        { $pull: { slides: slideId } }
      );
    });

    it('should accept ISlide object as first argument', async () => {
      const slide = mockSlide(mockObjectId()) as ISlide;
      const slideshowId = mockObjectId();
      (Slideshow.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 });

      await slideHelper.removeSlideFromSlideshows(slide, [slideshowId]);
      expect(Slideshow.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [slideshowId] } },
        { $pull: { slides: slide._id } }
      );
    });


    it('should do nothing if slideshowIds is null or empty array', async () => {
      await slideHelper.removeSlideFromSlideshows(mockObjectId(), null as any);
      await slideHelper.removeSlideFromSlideshows(mockObjectId(), []);
      expect(Slideshow.updateMany).not.toHaveBeenCalled();
    });

    it('should throw an error if Slideshow.updateMany fails', async () => {
      const slideId = mockObjectId();
      const slideshowIds = [mockObjectId()];
      const error = new Error('Update failed');
      (Slideshow.updateMany as jest.Mock).mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(slideHelper.removeSlideFromSlideshows(slideId, slideshowIds))
        .rejects.toThrow('Failed to remove slide from slideshows.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error removing slide from slideshows:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleSlideInSlideshows', () => {
    let slide: ISlide;
    let addSlideToSlideshowsSpy: jest.SpyInstance;
    let removeSlideFromSlideshowsSpy: jest.SpyInstance;

    beforeEach(() => {
      slide = mockSlide(mockObjectId()) as ISlide;
      addSlideToSlideshowsSpy = jest.spyOn(slideHelper, 'addSlideToSlideshows').mockResolvedValue(undefined);
      removeSlideFromSlideshowsSpy = jest.spyOn(slideHelper, 'removeSlideFromSlideshows').mockResolvedValue(undefined);
    });

    afterEach(() => {
      addSlideToSlideshowsSpy.mockRestore();
      removeSlideFromSlideshowsSpy.mockRestore();
    });

    it('should call addSlideToSlideshows for new slideshows', async () => {
      const newSlideshowIds = [mockObjectIdString(), mockObjectIdString()];
      await slideHelper.handleSlideInSlideshows(slide, newSlideshowIds, []);
      expect(addSlideToSlideshowsSpy).toHaveBeenCalledWith(slide, newSlideshowIds.map(id => new mongoose.Types.ObjectId(id)));
      expect(removeSlideFromSlideshowsSpy).not.toHaveBeenCalled();
    });

    it('should call removeSlideFromSlideshows for removed slideshows', async () => {
      const oldSlideshowIds = [mockObjectIdString(), mockObjectIdString()];
      await slideHelper.handleSlideInSlideshows(slide, [], oldSlideshowIds);
      expect(removeSlideFromSlideshowsSpy).toHaveBeenCalledWith(slide._id, oldSlideshowIds.map(id => new mongoose.Types.ObjectId(id)));
      expect(addSlideToSlideshowsSpy).not.toHaveBeenCalled();
    });

    it('should call both add and remove for mixed changes', async () => {
      const oldId1 = mockObjectId();
      const commonId = mockObjectId();
      const newId2 = mockObjectId();

      const originalSlideshowIds = [oldId1, commonId];
      const newSlideshowIds = [commonId, newId2];

      await slideHelper.handleSlideInSlideshows(slide, newSlideshowIds, originalSlideshowIds);

      expect(addSlideToSlideshowsSpy).toHaveBeenCalledWith(slide, [newId2]);
      expect(removeSlideFromSlideshowsSpy).toHaveBeenCalledWith(slide._id, [oldId1]);
    });

    it('should handle string and ObjectId types correctly', async () => {
        const oldIdStr = mockObjectIdString();
        const commonIdObj = mockObjectId();
        const newIdStr = mockObjectIdString();

        await slideHelper.handleSlideInSlideshows(slide, [commonIdObj.toHexString(), newIdStr], [oldIdStr, commonIdObj]);
        expect(addSlideToSlideshowsSpy).toHaveBeenCalledWith(slide, [new mongoose.Types.ObjectId(newIdStr)]);
        expect(removeSlideFromSlideshowsSpy).toHaveBeenCalledWith(slide._id, [new mongoose.Types.ObjectId(oldIdStr)]);
    });


    it('should do nothing if no changes in slideshows', async () => {
      const commonIds = [mockObjectIdString(), mockObjectId()];
      await slideHelper.handleSlideInSlideshows(slide, commonIds, commonIds);
      expect(addSlideToSlideshowsSpy).not.toHaveBeenCalled();
      expect(removeSlideFromSlideshowsSpy).not.toHaveBeenCalled();
    });

    it('should throw error if addSlideToSlideshows fails', async () => {
        const error = new Error("Add failed");
        addSlideToSlideshowsSpy.mockRejectedValue(error);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(slideHelper.handleSlideInSlideshows(slide, [mockObjectIdString()], []))
            .rejects.toThrow('Failed to update slide presence in slideshows.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling slide in slideshows:', error);
        consoleErrorSpy.mockRestore();
    });

    it('should throw error if removeSlideFromSlideshows fails', async () => {
        const error = new Error("Remove failed");
        removeSlideFromSlideshowsSpy.mockRejectedValue(error);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(slideHelper.handleSlideInSlideshows(slide, [], [mockObjectIdString()]))
            .rejects.toThrow('Failed to update slide presence in slideshows.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling slide in slideshows:', error);
        consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteSlideAndCleanReferences', () => {
    it('should delete slide and remove references from slideshows', async () => {
      const slideId = mockObjectId();
      const mockSlideDoc = mockSlide(slideId) as ISlide;

      (Slide.findById as jest.Mock).mockResolvedValue(mockSlideDoc);
      (Slideshow.updateMany as jest.Mock).mockResolvedValue({ nModified: 1 }); // Assume 1 slideshow was updated
      (Slide.findByIdAndDelete as jest.Mock).mockResolvedValue(mockSlideDoc);

      const deletedSlide = await slideHelper.deleteSlideAndCleanReferences(slideId);

      expect(Slide.findById).toHaveBeenCalledWith(slideId);
      expect(Slideshow.updateMany).toHaveBeenCalledWith(
        { slides: slideId },
        { $pull: { slides: slideId } }
      );
      expect(Slide.findByIdAndDelete).toHaveBeenCalledWith(slideId);
      expect(deletedSlide).toEqual(mockSlideDoc);
    });

    it('should return null if slide not found', async () => {
      const slideId = mockObjectId();
      (Slide.findById as jest.Mock).mockResolvedValue(null);

      const deletedSlide = await slideHelper.deleteSlideAndCleanReferences(slideId);

      expect(Slide.findById).toHaveBeenCalledWith(slideId);
      expect(Slideshow.updateMany).not.toHaveBeenCalled();
      expect(Slide.findByIdAndDelete).not.toHaveBeenCalled();
      expect(deletedSlide).toBeNull();
    });

    it('should throw error if Slideshow.updateMany fails', async () => {
        const slideId = mockObjectId();
        const mockSlideDoc = mockSlide(slideId) as ISlide;
        const error = new Error("updateMany failed");

        (Slide.findById as jest.Mock).mockResolvedValue(mockSlideDoc);
        (Slideshow.updateMany as jest.Mock).mockRejectedValue(error);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(slideHelper.deleteSlideAndCleanReferences(slideId))
            .rejects.toThrow('Failed to delete slide and update slideshows.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting slide and cleaning references:', error);
        consoleErrorSpy.mockRestore();
    });

    it('should throw error if Slide.findByIdAndDelete fails', async () => {
        const slideId = mockObjectId();
        const mockSlideDoc = mockSlide(slideId) as ISlide;
        const error = new Error("findByIdAndDelete failed");

        (Slide.findById as jest.Mock).mockResolvedValue(mockSlideDoc);
        (Slideshow.updateMany as jest.Mock).mockResolvedValue({nModified: 0});
        (Slide.findByIdAndDelete as jest.Mock).mockRejectedValue(error);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(slideHelper.deleteSlideAndCleanReferences(slideId))
            .rejects.toThrow('Failed to delete slide and update slideshows.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting slide and cleaning references:', error);
        consoleErrorSpy.mockRestore();
    });
  });
});
