import { addWidget, deleteWidget } from '../../../api/helpers/widget_helper' // Adjusted path assuming widget_helper.ts is in root of helpers
import Display from '../../../api/models/Display' // Adjusted path
import { Request, Response } from 'express' // For typing req/res
// Using Jest globals: describe, beforeEach, it, expect, jest

// Mock the Display model
jest.mock('../../../api/models/Display')

// Define interfaces for cleaner typing
interface MockWidgetData {
  _id: string | { equals: (val: string) => boolean };
  display: string;
  // Add other widget properties if necessary
}

interface MockDisplayInstance {
  _id: string;
  widgets: string[] | any[]; // Allow any[] for flexibility with mock objects having .equals
  save: jest.Mock<Promise<any>>; // Mock function returning a Promise
  // Add other display properties if necessary
}

describe('widget_helper', () => {
  let mockReq: Partial<Request> // Use Partial for mocks, can be more specific if needed
  let mockRes: Partial<Response> // Use Partial for mocks

  beforeEach(() => {
    mockReq = {} // Minimal mock
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }

    // Clear all mocks before each test
    if (typeof (Display.findById as jest.Mock)?.mockClear === 'function') { // Check if it's a Jest mock
        (Display.findById as jest.Mock).mockClear()
    }
    // A new mock for each test for prototype methods like save
    (Display.prototype.save as jest.Mock) = jest.fn() // Re-assign to a fresh Jest mock
  })

  describe('addWidget', () => {
    it('should add a widget to a display and resolve successfully', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: 'widget123',
        display: 'display123',
      }
      // Define mockDisplayInstance before it's used in save: jest.fn().mockResolvedValue(mockDisplayInstance),
      let mockDisplayInstance: MockDisplayInstance

      mockDisplayInstance = {
        _id: 'display123',
        widgets: [],
        save: jest.fn(), // Initialize save as a Jest mock function
      }
      // Now that mockDisplayInstance is defined, set its resolved value
      mockDisplayInstance.save.mockResolvedValue(mockDisplayInstance);
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance)
      /*
       * Ensure the save mock on the instance is the one being called and checked
       * (mockDisplayInstance.save as jest.Mock).mockResolvedValue(mockDisplayInstance); // Already done by line above
       * This line below was trying to assert on a different mock instance if not careful
       * For this test, we are checking that Display.findById returns an object whose .save method is called.
       *   mockDisplayInstance // Removed dangling variable
       * ); // Removed dangling parenthesis
       */

      await expect(
        addWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).resolves.toEqual({ success: true, display: mockDisplayInstance })

      expect(Display.findById).toHaveBeenCalledWith('display123')
      expect(mockDisplayInstance.widgets).toContain('widget123')
      expect(mockDisplayInstance.save).toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should return 404 via res if display not found', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: 'widget123',
        display: 'display_not_found',
      };
      (Display.findById as jest.Mock).mockResolvedValue(null)

      await addWidget(mockReq as Request, mockRes as Response, mockWidgetData)

      expect(Display.findById).toHaveBeenCalledWith('display_not_found')
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Display not found' })
    })

    it('should return 500 via res if display save fails (returns null/false)', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: 'widget123',
        display: 'display123',
      }
      const mockDisplayInstance: MockDisplayInstance = {
        _id: 'display123',
        widgets: [],
        save: jest.fn().mockResolvedValue(null), // Simulate failed save with a Jest mock
      };
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance)

      await addWidget(mockReq as Request, mockRes as Response, mockWidgetData)

      expect(mockDisplayInstance.save).toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Display not saved' })
    })

    it('should reject or allow error to propagate for DB findById errors', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: 'widget123',
        display: 'display123',
      }
      const error = new Error('DB findById error');
      (Display.findById as jest.Mock).mockRejectedValue(error)

      await expect(
        addWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow('DB findById error')
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should reject or allow error to propagate for DB save errors', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: 'widget123',
        display: 'display123',
      }
      const mockDisplayInstance: MockDisplayInstance = {
        _id: 'display123',
        widgets: [],
        save: jest.fn().mockRejectedValue(new Error('DB save error')), // Jest mock
      };
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance)

      await expect(
        addWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow('DB save error')
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should call res.status(400) if widgetData is invalid (missing display)', async () => {
      const invalidWidgetData: any = { _id: 'widget123' } // Missing display
      await addWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      )
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid widget data provided to addWidget helper.',
      })
    })

    it('should call res.status(400) if widgetData is invalid (missing _id)', async () => {
      const invalidWidgetData: any = { display: 'display123' } // Missing _id
      await addWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      )
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid widget data provided to addWidget helper.',
      })
    })
  })

  describe('deleteWidget', () => {
    it('should delete a widget from a display and resolve successfully', async () => {
      const mockWidgetId = 'widget123'
      // Ensure mockWidgetData._id is a string for the helper's current logic
      const mockWidgetData = {
        _id: mockWidgetId, // Use string ID directly
        display: 'display123',
      }

      let mockDisplayInstance: MockDisplayInstance
      mockDisplayInstance = {
        _id: 'display123',
        widgets: [mockWidgetId, 'widget456'], // widgets array contains strings
        save: jest.fn(),
      }
      mockDisplayInstance.save.mockResolvedValue(mockDisplayInstance);
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance)

      await expect(
        deleteWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).resolves.toEqual({ success: true, display: mockDisplayInstance })

      expect(Display.findById).toHaveBeenCalledWith('display123')
      // After successful deletion, the widgetId should be removed from the array
      expect(mockDisplayInstance.widgets.length).toBe(1)
      expect(mockDisplayInstance.widgets[0]).toBe('widget456')
      expect(mockDisplayInstance.save).toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should return 404 via res if display not found for delete', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: 'widget123',
        display: 'display_not_found',
      };
      (Display.findById as jest.Mock).mockResolvedValue(null)

      await deleteWidget(
        mockReq as Request,
        mockRes as Response,
        mockWidgetData
      )

      expect(Display.findById).toHaveBeenCalledWith('display_not_found')
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Display not found' })
    })

    it('should reject or allow error to propagate for DB findById errors during delete', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: 'widget123',
        display: 'display123',
      }
      const error = new Error('DB findById error for delete');
      (Display.findById as jest.Mock).mockRejectedValue(error)

      await expect(
        deleteWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow('DB findById error for delete')
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should reject or allow error to propagate for DB save errors during delete', async () => {
      const mockWidgetData: MockWidgetData = {
        _id: { equals: (val) => val === 'widget123' },
        display: 'display123',
      }
      const mockDisplayInstance: MockDisplayInstance = {
        _id: 'display123',
        widgets: ['widget123'],
        save: jest.fn() // Jest mock
          .mockRejectedValue(new Error('DB save error for delete')),
      };
      (Display.findById as jest.Mock).mockResolvedValue(mockDisplayInstance)

      await expect(
        deleteWidget(mockReq as Request, mockRes as Response, mockWidgetData)
      ).rejects.toThrow('DB save error for delete')
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should call res.status(400) if widgetData is invalid for delete (missing display)', async () => {
      const invalidWidgetData: any = { _id: 'widget123' } // Missing display
      await deleteWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      )
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid widget data provided to deleteWidget helper.',
      })
    })

    it('should call res.status(400) if widgetData is invalid for delete (missing _id)', async () => {
      const invalidWidgetData: any = { display: 'display123' } // Missing _id
      await deleteWidget(
        mockReq as Request,
        mockRes as Response,
        invalidWidgetData
      )
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid widget data provided to deleteWidget helper.',
      })
    })
  })
})
