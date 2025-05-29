const { addWidget, deleteWidget } = require('./widget_helper');
const Display = require('../models/Display');

// Mock the Display model
jest.mock('../models/Display');

describe('widget_helper', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {}; // Minimal mock for req as it's not heavily used by current helpers
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    Display.findById.mockClear();
    // Ensure we have a fresh mock for each test, including a new prototype for .save
    Display.prototype.save = jest.fn(); 
  });

  describe('addWidget', () => {
    it('should add a widget to a display and resolve successfully', async () => {
      const mockWidgetData = { _id: 'widget123', display: 'display123' };
      const mockDisplayInstance = {
        _id: 'display123',
        widgets: [],
        // save will be defined below to avoid ReferenceError
      };
      mockDisplayInstance.save = jest.fn().mockResolvedValue(mockDisplayInstance); // Define save here
      Display.findById.mockResolvedValue(mockDisplayInstance);

      // Expect the promise to resolve (not reject)
      // The refactored helper returns { success: true, display: savedDisplay }
      // For this version of tests, we expect it to resolve with the display instance
      await expect(addWidget(mockReq, mockRes, mockWidgetData)).resolves.toEqual({success: true, display: mockDisplayInstance});


      expect(Display.findById).toHaveBeenCalledWith('display123');
      expect(mockDisplayInstance.widgets).toContain('widget123');
      expect(mockDisplayInstance.save).toHaveBeenCalled();
      // res.json should NOT have been called by the helper on success
      expect(mockRes.json).not.toHaveBeenCalled(); 
    });

    it('should return 404 via res if display not found', async () => {
      const mockWidgetData = { _id: 'widget123', display: 'display_not_found' };
      Display.findById.mockResolvedValue(null);

      // The helper directly calls res.status().json() in this error path.
      await addWidget(mockReq, mockRes, mockWidgetData);

      expect(Display.findById).toHaveBeenCalledWith('display_not_found');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Display not found' });
    });

    it('should return 500 via res if display save fails (returns null/false)', async () => {
      const mockWidgetData = { _id: 'widget123', display: 'display123' };
      const mockDisplayInstance = {
        _id: 'display123',
        widgets: [],
        save: Display.prototype.save.mockResolvedValue(null) // Simulate failed save
      };
      Display.findById.mockResolvedValue(mockDisplayInstance);

      // The helper directly calls res.status().json() in this error path.
      await addWidget(mockReq, mockRes, mockWidgetData);

      expect(mockDisplayInstance.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Display not saved' });
    });
    
    it('should reject or allow error to propagate for DB findById errors', async () => {
      const mockWidgetData = { _id: 'widget123', display: 'display123' };
      const error = new Error('DB findById error');
      Display.findById.mockRejectedValue(error);

      // Based on current helper: it catches and returns Promise.reject(err)
      await expect(addWidget(mockReq, mockRes, mockWidgetData)).rejects.toThrow('DB findById error');
      // Ensure res.status().json() was not called by the helper in this specific path
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should reject or allow error to propagate for DB save errors', async () => {
      const mockWidgetData = { _id: 'widget123', display: 'display123' };
      const mockDisplayInstance = {
        _id: 'display123',
        widgets: [],
        save: Display.prototype.save.mockRejectedValue(new Error('DB save error'))
      };
      Display.findById.mockResolvedValue(mockDisplayInstance);
      
      // Based on current helper: it catches and returns Promise.reject(err)
      await expect(addWidget(mockReq, mockRes, mockWidgetData)).rejects.toThrow('DB save error');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    // Test for invalid widgetData input as per helper's own validation
    it('should call res.status(400) if widgetData is invalid (missing display)', async () => {
      const invalidWidgetData = { _id: 'widget123' }; // Missing display
      await addWidget(mockReq, mockRes, invalidWidgetData);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid widget data provided to addWidget helper.' });
    });

    it('should call res.status(400) if widgetData is invalid (missing _id)', async () => {
      const invalidWidgetData = { display: 'display123' }; // Missing _id
      await addWidget(mockReq, mockRes, invalidWidgetData);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid widget data provided to addWidget helper.' });
    });
  });

  describe('deleteWidget', () => {
    it('should delete a widget from a display and resolve successfully', async () => {
      const mockWidgetId = 'widget123';
      // For deleteWidget, the _id in widgetData needs an .equals method for the filter
      const mockWidgetData = { 
        _id: { 
          equals: (val) => val === mockWidgetId || (val && val.toString() === mockWidgetId) 
        }, 
        display: 'display123' 
      };
      const mockDisplayInstance = {
        _id: 'display123',
        widgets: [mockWidgetId, 'widget456'], // Store as plain strings for simpler mock
        // save will be defined below
      };
      mockDisplayInstance.save = jest.fn().mockResolvedValue(mockDisplayInstance); // Define save here
      Display.findById.mockResolvedValue(mockDisplayInstance);

      // The refactored helper returns { success: true, display: savedDisplay }
      await expect(deleteWidget(mockReq, mockRes, mockWidgetData)).resolves.toEqual({ success: true, display: mockDisplayInstance });

      expect(Display.findById).toHaveBeenCalledWith('display123');
      // After filtering, 'widget123' should be removed.
      expect(mockDisplayInstance.widgets.length).toBe(1); 
      expect(mockDisplayInstance.widgets[0]).toBe('widget456');
      expect(mockDisplayInstance.save).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled(); // Helper resolves, controller sends JSON
    });

    it('should return 404 via res if display not found for delete', async () => {
      const mockWidgetData = { _id: 'widget123', display: 'display_not_found' }; // _id can be string here
      Display.findById.mockResolvedValue(null);

      await deleteWidget(mockReq, mockRes, mockWidgetData);

      expect(Display.findById).toHaveBeenCalledWith('display_not_found');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Display not found' });
    });

    it('should reject or allow error to propagate for DB findById errors during delete', async () => {
      const mockWidgetData = { _id: 'widget123', display: 'display123' };
      const error = new Error('DB findById error for delete');
      Display.findById.mockRejectedValue(error);

      await expect(deleteWidget(mockReq, mockRes, mockWidgetData)).rejects.toThrow('DB findById error for delete');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should reject or allow error to propagate for DB save errors during delete', async () => {
      const mockWidgetData = { 
        _id: { equals: (val) => val === 'widget123' }, // Mock .equals for filter
        display: 'display123' 
      };
      const mockDisplayInstance = {
        _id: 'display123',
        widgets: ['widget123'], // Ensure a widget that can be "found" by filter
        save: Display.prototype.save.mockRejectedValue(new Error('DB save error for delete'))
      };
      Display.findById.mockResolvedValue(mockDisplayInstance);

      await expect(deleteWidget(mockReq, mockRes, mockWidgetData)).rejects.toThrow('DB save error for delete');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    // Test for invalid widgetData input as per helper's own validation
    it('should call res.status(400) if widgetData is invalid for delete (missing display)', async () => {
      const invalidWidgetData = { _id: 'widget123' }; // Missing display
      await deleteWidget(mockReq, mockRes, invalidWidgetData);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid widget data provided to deleteWidget helper.' });
    });
    
    it('should call res.status(400) if widgetData is invalid for delete (missing _id)', async () => {
      const invalidWidgetData = { display: 'display123' }; // Missing _id
      await deleteWidget(mockReq, mockRes, invalidWidgetData);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid widget data provided to deleteWidget helper.' });
    });
  });
});
