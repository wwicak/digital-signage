import { SlideshowSchemaZod } from '../../../api/models/Slideshow';
import mongoose from 'mongoose';
import * as z from 'zod';

describe('Slideshow Model Zod Schema (SlideshowSchemaZod)', () => {
  const validObjectId = () => new mongoose.Types.ObjectId();

  it('should validate correct slideshow data with all fields', () => {
    const data = {
      _id: validObjectId(),
      name: 'Test Slideshow',
      description: 'A description for the test slideshow.',
      slides: [validObjectId(), validObjectId()],
      creator_id: validObjectId(),
      creation_date: new Date(),
      last_update: new Date(),
      is_enabled: true,
      __v: 0,
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate correct data with only required fields (name, creator_id)', () => {
    // Optional fields with defaults: slides, is_enabled
    // Optional fields without defaults: _id, description, creation_date, last_update, __v
    const data = {
      name: 'Minimal Slideshow',
      creator_id: validObjectId(),
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Minimal Slideshow');
      expect(result.data.slides).toEqual([]); // Default value
      expect(result.data.is_enabled).toBe(true); // Default value
    }
  });

  it('should invalidate data with missing required name field', () => {
    const data = {
      creator_id: validObjectId(),
      description: 'Missing name',
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
    }
  });

  it('should invalidate data with missing required creator_id field', () => {
    const data = {
      name: 'Missing creator_id',
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['creator_id']);
    }
  });

  it('should invalidate data with incorrect name type (not a string)', () => {
    const data = {
      name: 123,
      creator_id: validObjectId(),
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
    }
  });

  it('should invalidate data with incorrect creator_id type (not an ObjectId)', () => {
    const data = {
      name: 'Test',
      creator_id: 'not-an-object-id',
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['creator_id']);
    }
  });

  it('should invalidate data with incorrect slides type (not an array)', () => {
    const data = {
      name: 'Test',
      creator_id: validObjectId(),
      slides: 'not-an-array',
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['slides']);
    }
  });

  it('should invalidate data with non-ObjectId element in slides array', () => {
    const data = {
      name: 'Test',
      creator_id: validObjectId(),
      slides: [validObjectId(), 'not-an-object-id-instance'],
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      // The error could be on `slides` itself due to the union, or on `slides[1]`
      // Zod's behavior with unions and arrays can be complex for error reporting.
      // It will report that the input for `slides[1]` does not match `instanceof ObjectId` AND does not match `any()`,
      // which is impossible. Let's check the path to the problematic element.
      expect(result.error.issues[0].path).toContain('slides'); // Check if path includes 'slides'
    }
  });

   it('should validate slides array with mixed content (ObjectId and any for populated)', () => {
    const data = {
      name: 'Test Mixed Slides',
      creator_id: validObjectId(),
      slides: [validObjectId(), { title: 'Populated Slide', type: 'image', data: {url: 'http://example.com/img.png'} }],
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(true);
  });


  it('should invalidate data with incorrect is_enabled type (not a boolean)', () => {
    const data = {
      name: 'Test',
      creator_id: validObjectId(),
      is_enabled: 'not-a-boolean',
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['is_enabled']);
    }
  });

  it('should invalidate data with incorrect creation_date type (not a Date)', () => {
    const data = {
      name: 'Test',
      creator_id: validObjectId(),
      creation_date: 'not-a-date',
    };
    const result = SlideshowSchemaZod.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['creation_date']);
    }
  });
});
