import {
  SlideSchemaZod,
  SlideType,
  SlideTypeZod,
  ImageSlideDataSchema,
  VideoSlideDataSchema,
  WebSlideDataSchema,
  MarkdownSlideDataSchema,
  PhotoSlideDataSchema,
  YoutubeSlideDataSchema
} from '../../../api/models/Slide'
import mongoose from 'mongoose'
import * as z from 'zod'

describe('Slide Model Zod Schema (SlideSchemaZod)', () => {
  const validObjectId = () => new mongoose.Types.ObjectId()

  const baseValidSlide = {
    _id: validObjectId(),
    name: 'Test Slide',
    creator_id: validObjectId(),
    creation_date: new Date(),
    last_update: new Date(),
    duration: 10,
    is_enabled: true,
    __v: 0,
  }

  describe('Basic Slide Structure Validation', () => {
    it('should validate a correct basic slide structure (type IMAGE with valid data)', () => {
      const data = {
        ...baseValidSlide,
        type: SlideType.IMAGE,
        data: { url: 'https://example.com/image.png' },
      }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should invalidate if name is missing', () => {
      const data = { ...baseValidSlide, type: SlideType.IMAGE, data: { url: 'https://example.com/image.png' } }
      delete (data as any).name
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toEqual(['name'])
    })

    it('should invalidate if creator_id is missing', () => {
      const data = { ...baseValidSlide, type: SlideType.IMAGE, data: { url: 'https://example.com/image.png' } }
      delete (data as any).creator_id
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toEqual(['creator_id'])
    })

    it('should invalidate if type is missing', () => {
      const data = { ...baseValidSlide, data: { url: 'https://example.com/image.png' } }
      delete (data as any).type
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toEqual(['type'])
    })

    it('should invalidate if data is missing (and type is not one that allows empty data if we had such types)', () => {
      /*
       * Note: SlideDataZod is a union, not optional itself in SlideSchemaZod.
       * The .superRefine checks data structure based on type. If data is entirely missing,
       * it will likely fail the specific sub-schema check (e.g. ImageSlideDataSchema).
       */
      const data = { ...baseValidSlide, type: SlideType.IMAGE }
      delete (data as any).data
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toEqual(['data'])
    })
  })

  describe('Discriminated Union Validation (superRefine)', () => {
    // Test for IMAGE type
    it('should validate IMAGE type with correct data', () => {
      const data = { ...baseValidSlide, type: SlideType.IMAGE, data: { url: 'https://example.com/image.jpg' } }
      expect(SlideSchemaZod.safeParse(data).success).toBe(true)
    })
    it('should invalidate IMAGE type with incorrect data (missing url)', () => {
      const data = { ...baseValidSlide, type: SlideType.IMAGE, data: { alt: 'Wrong data' } } // url is missing
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        // Restore original assertion and remove console.log
        expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match IMAGE type schema')).toBe(true)
      }
    })
     it('should invalidate IMAGE type with incorrect data (url not a string)', () => {
      const data = { ...baseValidSlide, type: SlideType.IMAGE, data: { url: 123 } }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
         expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match IMAGE type schema')).toBe(true)
      }
    })


    // Test for VIDEO type
    it('should validate VIDEO type with correct data', () => {
      const data = { ...baseValidSlide, type: SlideType.VIDEO, data: { url: 'https://example.com/video.mp4' } }
      expect(SlideSchemaZod.safeParse(data).success).toBe(true)
    })
    it('should invalidate VIDEO type with incorrect data (e.g., content instead of url)', () => {
      const data = { ...baseValidSlide, type: SlideType.VIDEO, data: { content: 'some content' } }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match VIDEO type schema')).toBe(true)
      }
    })

    // Test for WEB type
    it('should validate WEB type with correct data', () => {
      const data = { ...baseValidSlide, type: SlideType.WEB, data: { url: 'https://example.com' } }
      expect(SlideSchemaZod.safeParse(data).success).toBe(true)
    })
    it('should invalidate WEB type with incorrect data', () => {
      const data = { ...baseValidSlide, type: SlideType.WEB, data: { videoId: '123' } }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match WEB type schema')).toBe(true)
      }
    })

    // Test for MARKDOWN type
    it('should validate MARKDOWN type with correct data', () => {
      const data = { ...baseValidSlide, type: SlideType.MARKDOWN, data: { content: '# Hello' } }
      expect(SlideSchemaZod.safeParse(data).success).toBe(true)
    })
    it('should invalidate MARKDOWN type with incorrect data (missing content)', () => {
      const data = { ...baseValidSlide, type: SlideType.MARKDOWN, data: { theme: 'dark' } }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match MARKDOWN type schema')).toBe(true)
      }
    })

    // Test for PHOTO type (similar to IMAGE)
    it('should validate PHOTO type with correct data', () => {
      const data = { ...baseValidSlide, type: SlideType.PHOTO, data: { url: 'https://example.com/photo.jpg' } }
      expect(SlideSchemaZod.safeParse(data).success).toBe(true)
    })
    it('should invalidate PHOTO type with incorrect data', () => {
      const data = { ...baseValidSlide, type: SlideType.PHOTO, data: { text: 'a photo' } }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
       if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match PHOTO type schema')).toBe(true)
      }
    })

    // Test for YOUTUBE type
    it('should validate YOUTUBE type with correct data', () => {
      const data = {
        // ...baseValidSlide, // Using minimal data first
        name: 'Test Youtube',
        type: SlideType.YOUTUBE,
        data: { videoId: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        creator_id: validObjectId(),
        // Optional fields with defaults (duration, is_enabled) will be handled by Zod's .default()
      }
      const result = SlideSchemaZod.safeParse(data)
      // Removed console.log
      expect(result.success).toBe(true)
    })
    it('should invalidate YOUTUBE type with incorrect data (missing videoId)', () => {
      const data = { ...baseValidSlide, type: SlideType.YOUTUBE, data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match YOUTUBE type schema')).toBe(true)
      }
    })
     it('should invalidate YOUTUBE type with incorrect data (missing url)', () => {
      const data = { ...baseValidSlide, type: SlideType.YOUTUBE, data: { videoId: 'dQw4w9WgXcQ' } }
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('data') && issue.message === 'Data does not match YOUTUBE type schema')).toBe(true)
      }
    })
  })

  describe('Default value handling', () => {
    it('should apply default for duration if not provided', () => {
      const data = { ...baseValidSlide, type: SlideType.IMAGE, data: { url: 'https://example.com/image.png' } }
      delete (data as any).duration
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.duration).toBe(10)
      }
    })

    it('should apply default for is_enabled if not provided', () => {
       const data = { ...baseValidSlide, type: SlideType.IMAGE, data: { url: 'https://example.com/image.png' } }
      delete (data as any).is_enabled
      const result = SlideSchemaZod.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_enabled).toBe(true)
      }
    })
  })
})
