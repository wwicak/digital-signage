import mongoose from 'mongoose'
import {
  addSlideToSlideshows,
  removeSlideFromSlideshows,
  handleSlideInSlideshows,
  deleteSlideAndCleanReferences,
} from '../../../api/helpers/slide_helper'
import Slide, { SlideType } from '../../../api/models/Slide'
import Slideshow from '../../../api/models/Slideshow'
import { jest } from '@jest/globals'

// MongoDB connection string
const MONGODB_URI =
  'mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

describe('Slide Helper Functions', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI)
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  afterEach(async () => {
    // Clean up test data after each test
    await Slide.deleteMany({})
    await Slideshow.deleteMany({})
  })

  describe('addSlideToSlideshows', () => {
    it('should add a slide to multiple slideshows', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Create test slideshows
      const slideshow1 = await Slideshow.create({
        name: 'Slideshow 1',
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      const slideshow2 = await Slideshow.create({
        name: 'Slideshow 2',
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Add slide to slideshows
      await addSlideToSlideshows(slide, [
        slideshow1._id as mongoose.Types.ObjectId,
        slideshow2._id as mongoose.Types.ObjectId,
      ])

      // Verify slide was added to both slideshows
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id)
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id)

      expect(updatedSlideshow1?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      )
      expect(updatedSlideshow2?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      )
    })

    it('should add a slide to a single slideshow', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Create test slideshow
      const slideshow = await Slideshow.create({
        name: 'Test Slideshow',
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Add slide to slideshow
      await addSlideToSlideshows(
        slide,
        slideshow._id as mongoose.Types.ObjectId
      )

      // Verify slide was added
      const updatedSlideshow = await Slideshow.findById(slideshow._id)
      expect(updatedSlideshow?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      )
    })

    it('should handle empty slideshow IDs', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Should not throw error with null/undefined slideshow IDs
      await expect(
        addSlideToSlideshows(slide, null as any)
      ).resolves.not.toThrow()
      await expect(
        addSlideToSlideshows(slide, undefined as any)
      ).resolves.not.toThrow()
      await expect(addSlideToSlideshows(slide, [])).resolves.not.toThrow()
    })
  })

  describe('removeSlideFromSlideshows', () => {
    it('should remove a slide from multiple slideshows', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Create test slideshows with the slide already added
      const slideshow1 = await Slideshow.create({
        name: 'Slideshow 1',
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      const slideshow2 = await Slideshow.create({
        name: 'Slideshow 2',
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Remove slide from slideshows
      await removeSlideFromSlideshows(slide, [
        slideshow1._id as mongoose.Types.ObjectId,
        slideshow2._id as mongoose.Types.ObjectId,
      ])

      // Verify slide was removed from both slideshows
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id)
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id)

      expect(updatedSlideshow1?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      )
      expect(updatedSlideshow2?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      )
    })

    it('should remove a slide using slide ID', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Create test slideshow with the slide already added
      const slideshow = await Slideshow.create({
        name: 'Test Slideshow',
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Remove slide using slide ID
      await removeSlideFromSlideshows(
        slide._id as mongoose.Types.ObjectId,
        slideshow._id as mongoose.Types.ObjectId
      )

      // Verify slide was removed
      const updatedSlideshow = await Slideshow.findById(slideshow._id)
      expect(updatedSlideshow?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      )
    })
  })

  describe('handleSlideInSlideshows', () => {
    it('should add slide to new slideshows and remove from old ones', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Create test slideshows
      const slideshow1 = await Slideshow.create({
        name: 'Slideshow 1',
        slides: [slide._id as mongoose.Types.ObjectId], // Initially contains the slide
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      const slideshow2 = await Slideshow.create({
        name: 'Slideshow 2',
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      const slideshow3 = await Slideshow.create({
        name: 'Slideshow 3',
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Handle slide changes: remove from slideshow1, add to slideshow2 and slideshow3
      await handleSlideInSlideshows(
        slide,
        [
          slideshow2._id as mongoose.Types.ObjectId,
          slideshow3._id as mongoose.Types.ObjectId,
        ], // new slideshows
        [slideshow1._id as mongoose.Types.ObjectId] // original slideshows
      )

      // Verify changes
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id)
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id)
      const updatedSlideshow3 = await Slideshow.findById(slideshow3._id)

      expect(updatedSlideshow1?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      )
      expect(updatedSlideshow2?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      )
      expect(updatedSlideshow3?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      )
    })

    it('should handle empty original slideshow IDs', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Create test slideshow
      const slideshow = await Slideshow.create({
        name: 'Test Slideshow',
        slides: [],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Handle slide changes with no original slideshows
      await handleSlideInSlideshows(slide, [
        slideshow._id as mongoose.Types.ObjectId,
      ])

      // Verify slide was added
      const updatedSlideshow = await Slideshow.findById(slideshow._id)
      expect(updatedSlideshow?.slides).toContain(
        slide._id as mongoose.Types.ObjectId
      )
    })
  })

  describe('deleteSlideAndCleanReferences', () => {
    it('should delete slide and remove it from all slideshows', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Create test slideshows with the slide
      const slideshow1 = await Slideshow.create({
        name: 'Slideshow 1',
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      const slideshow2 = await Slideshow.create({
        name: 'Slideshow 2',
        slides: [slide._id as mongoose.Types.ObjectId],
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Delete slide and clean references
      const deletedSlide = await deleteSlideAndCleanReferences(
        slide._id as mongoose.Types.ObjectId
      )

      // Verify slide was returned
      expect(deletedSlide).toBeDefined()
      expect(deletedSlide?._id).toEqual(slide._id)

      // Verify slide was deleted
      const foundSlide = await Slide.findById(slide._id)
      expect(foundSlide).toBeNull()

      // Verify slide was removed from all slideshows
      const updatedSlideshow1 = await Slideshow.findById(slideshow1._id)
      const updatedSlideshow2 = await Slideshow.findById(slideshow2._id)

      expect(updatedSlideshow1?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      )
      expect(updatedSlideshow2?.slides).not.toContain(
        slide._id as mongoose.Types.ObjectId
      )
    })

    it('should return null for non-existent slide', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const result = await deleteSlideAndCleanReferences(nonExistentId)
      expect(result).toBeNull()
    })

    it('should handle string slide ID', async () => {
      // Create test slide
      const slide = await Slide.create({
        name: 'Test Slide',
        type: SlideType.PHOTO,
        data: { url: 'test.jpg' },
        creator_id: new mongoose.Types.ObjectId(),
        creation_date: new Date(),
        modification_date: new Date(),
        is_public: true,
        tags: [],
        metadata: {},
      })

      // Delete slide using string ID
      const deletedSlide = await deleteSlideAndCleanReferences(
        (slide._id as mongoose.Types.ObjectId).toString()
      )

      // Verify slide was deleted
      expect(deletedSlide).toBeDefined()
      expect(deletedSlide?._id).toEqual(slide._id)

      const foundSlide = await Slide.findById(slide._id)
      expect(foundSlide).toBeNull()
    })
  })
})
