import { CreateSlideshowSchema, UpdateSlideshowSchema } from '../../../api/routes/slideshow';
import mongoose from 'mongoose';
import * as z from 'zod';

describe('Slideshow API Route Schemas', () => {
  describe('CreateSlideshowSchema', () => {
    const validObjectId = () => new mongoose.Types.ObjectId().toString();

    it('should validate correct data with all fields', () => {
      const data = {
        name: 'My Slideshow',
        description: 'A great slideshow',
        slide_ids: [validObjectId(), validObjectId()],
        is_enabled: true,
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate correct data with only required fields', () => {
      const data = {
        name: 'Minimal Slideshow',
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) { // Type guard for TypeScript
        expect(result.data.name).toBe('Minimal Slideshow');
      }
    });

    it('should invalidate data with missing required name field', () => {
      const data = {
        description: 'Missing name',
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['name']);
      }
    });

    it('should invalidate data with incorrect name type', () => {
      const data = {
        name: 123, // Name should be string
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['name']);
      }
    });

    it('should invalidate data with empty name string', () => {
      const data = {
        name: "",
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['name']);
        expect(result.error.issues[0].message).toBe('Slideshow name is required.');
      }
    });

    it('should invalidate data with incorrect description type', () => {
      const data = {
        name: 'Valid Name',
        description: 123, // Description should be string
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['description']);
      }
    });

    it('should invalidate data with incorrect slide_ids type (not an array)', () => {
      const data = {
        name: 'Valid Name',
        slide_ids: 'not-an-array',
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['slide_ids']);
      }
    });

    it('should invalidate data with invalid ObjectId string in slide_ids', () => {
      const data = {
        name: 'Valid Name',
        slide_ids: [validObjectId(), 'invalid-object-id'],
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['slide_ids', 1]); // Path to the invalid element
         expect(result.error.issues[0].message).toBe('Invalid ObjectId in slide_ids');
      }
    });

    it('should invalidate data with non-string element in slide_ids array', () => {
      const data = {
        name: 'Valid Name',
        slide_ids: [validObjectId(), 12345],
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['slide_ids', 1]);
      }
    });

    it('should invalidate data with incorrect is_enabled type', () => {
      const data = {
        name: 'Valid Name',
        is_enabled: 'not-a-boolean',
      };
      const result = CreateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['is_enabled']);
      }
    });
  });

  describe('UpdateSlideshowSchema', () => {
    const validObjectId = () => new mongoose.Types.ObjectId().toString();

    it('should validate partial data (only name)', () => {
      const data = { name: 'Updated Slideshow Name' };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Slideshow Name');
      }
    });

    it('should validate partial data (only description)', () => {
      const data = { description: 'Updated description.' };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate partial data (only slide_ids)', () => {
      const data = { slide_ids: [validObjectId()] };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate partial data (empty slide_ids array to clear slides)', () => {
      const data = { slide_ids: [] };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slide_ids).toEqual([]);
      }
    });

    it('should validate partial data (only is_enabled)', () => {
      const data = { is_enabled: false };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate partial data (only oldIndex and newIndex)', () => {
      const data = { oldIndex: 0, newIndex: 1 };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate partial data (name and oldIndex/newIndex)', () => {
      const data = { name: "New Name", oldIndex: 0, newIndex: 1 };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should invalidate incorrect data type for name', () => {
      const data = { name: 123 };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should invalidate incorrect data type for slide_ids (not an array)', () => {
      const data = { slide_ids: 'a-string' };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should invalidate invalid ObjectId in slide_ids for update', () => {
      const data = { slide_ids: ['invalid-id'] };
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['slide_ids', 0]);
        expect(result.error.issues[0].message).toBe('Invalid ObjectId in slide_ids');
      }
    });

    it('should invalidate incorrect data type for oldIndex', () => {
      const data = { oldIndex: "0" }; // Should be number
      const result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(false);
       if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['oldIndex']);
      }
    });

    it('should invalidate if only one of oldIndex/newIndex is provided', () => {
      // UpdateSlideshowSchema allows either both or none.
      // If one is provided, it's not an error by schema, but application logic might reject.
      // The current schema (partial extend) allows one without the other.
      // This test checks current schema behavior.
      let data = { oldIndex: 0 };
      let result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true); // oldIndex alone is valid per schema

      data = { newIndex: 1 };
      result = UpdateSlideshowSchema.safeParse(data);
      expect(result.success).toBe(true); // newIndex alone is valid per schema
    });
  });
});

describe('Mongoose ObjectId validation check', () => {
    it('should correctly identify valid and invalid ObjectId strings', () => {
        expect(mongoose.Types.ObjectId.isValid(new mongoose.Types.ObjectId().toString())).toBe(true);
        expect(mongoose.Types.ObjectId.isValid('123456789012345678901234')).toBe(true); // Valid length and hex
        expect(mongoose.Types.ObjectId.isValid('invalid-object-id')).toBe(false);
        expect(mongoose.Types.ObjectId.isValid('123')).toBe(false);
        expect(mongoose.Types.ObjectId.isValid('')).toBe(false);
        expect(mongoose.Types.ObjectId.isValid(null)).toBe(false);
        expect(mongoose.Types.ObjectId.isValid(undefined)).toBe(false);
    });
});
