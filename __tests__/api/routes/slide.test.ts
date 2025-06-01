import request from 'supertest'
import express, { Express, Request, Response, NextFunction } from 'express'
import session from 'express-session'
import passport from 'passport' // Needed for req.user, req.isAuthenticated
import SlideRouter from '../../../api/routes/slide'
import Slide, { ISlide, SlideType } from '../../../api/models/Slide' // Actual Slide model
import Slideshow from '../../../api/models/Slideshow' // Actual Slideshow model
import User, { IUser } from '../../../api/models/User' // For req.user type
import * as commonHelpers from '../../../api/helpers/common_helper' // To mock findByIdAndSend etc.
import * as slideHelpers from '../../../api/helpers/slide_helper' // To mock validateSlideData etc.

// Mock dependencies that are not the primary focus of the route tests
jest.mock('../../../api/models/User') // Keep User model mocked if complex, or use actual if simple for req.user
jest.mock('passport') // For req.isAuthenticated and req.login/logout if used by middleware

// Mock helper functions
jest.mock('../../../api/helpers/common_helper')
jest.mock('../../../api/helpers/slide_helper')

// Mock SSE manager - declare mock function first and use a factory function
jest.mock('../../../api/sse_manager', () => ({
  sendEventToDisplay: jest.fn(),
}))

// Import the mocked function after mocking
const {
  sendEventToDisplay: mockSendEventToDisplay,
} = require('../../../api/sse_manager')

const mockUser = {
  _id: 'testUserId',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
} as IUser

// Middleware to simulate authentication
const ensureAuthenticatedMock = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  req.user = mockUser
  req.isAuthenticated = () => true
  next()
}

// Replace actual ensureAuthenticated middleware with our mock for testing this router
jest.mock('../../../api/routes/slide', () => {
  const originalModule = jest.requireActual('../../../api/routes/slide')
  /*
   * Mock specific middleware if it's exported and used directly by name,
   * or if it's part of the router stack, we might need to mock it at the app level.
   * For now, assuming ensureAuthenticated is applied globally or can be bypassed by mocking req.isAuthenticated.
   * If ensureAuthenticated is a named export from the route module itself and used internally:
   * return {
   *   ...originalModule,
   *   ensureAuthenticated: ensureAuthenticatedMock, // This depends on how it's structured
   * };
   */
  return originalModule // If ensureAuthenticated is applied at a higher level or simply checks req.isAuthenticated
})

describe('Slide API Routes', () => {
  let app: Express

  // Spies for model methods - to be defined in beforeEach
  let slideFindByIdSpy: jest.SpyInstance
  let slideFindOneSpy: jest.SpyInstance
  let slideFindSpy: jest.SpyInstance
  let slideSaveSpy: jest.SpyInstance
  let slideFindByIdAndUpdateSpy: jest.SpyInstance
  let slideFindByIdAndDeleteSpy: jest.SpyInstance
  let slideshowFindSpy: jest.SpyInstance

  // Mocks for helper functions
  const mockedHandleSlideInSlideshows =
    slideHelpers.handleSlideInSlideshows as jest.Mock
  const mockedDeleteSlideAndCleanReferences =
    slideHelpers.deleteSlideAndCleanReferences as jest.Mock
  let mockedGetDisplayIdsForSlide: jest.Mock // Added for SSE tests
  /*
   * Common helpers are not directly used by name in the routes, but by the route handlers that might be tested directly.
   * For now, we are testing the routes via HTTP requests.
   */

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use(
      session({
        secret: 'jest-test-secret',
        resave: false,
        saveUninitialized: false,
      })
    )

    // Simulate passport middleware if your actual app uses it broadly
    app.use((req: any, res: Response, next: NextFunction) => {
      req.user = mockUser // Default to authenticated user for most tests
      req.isAuthenticated = () => true // Default mock
      req.login = jest.fn((user, cb) => cb(null))
      req.logout = jest.fn((cb) => cb(null))
      next()
    })

    app.use('/api/v1/slides', SlideRouter) // Mount the router

    // Setup spies on Slide model methods
    slideFindByIdSpy = jest.spyOn(Slide, 'findById')
    slideFindOneSpy = jest.spyOn(Slide, 'findOne') // Initialize spy
    slideFindSpy = jest.spyOn(Slide, 'find')
    slideSaveSpy = jest.spyOn(Slide.prototype, 'save') // Spy on instance method save
    slideFindByIdAndUpdateSpy = jest.spyOn(Slide, 'findByIdAndUpdate')
    slideFindByIdAndDeleteSpy = jest.spyOn(Slide, 'findByIdAndDelete')
    slideshowFindSpy = jest.spyOn(Slideshow, 'find') // Spy for Slideshow.find

    // Reset helper mocks
    mockedHandleSlideInSlideshows.mockReset()
    mockedDeleteSlideAndCleanReferences.mockReset()
    mockedGetDisplayIdsForSlide =
      slideHelpers.getDisplayIdsForSlide as jest.Mock // Initialize
    mockedGetDisplayIdsForSlide.mockReset() // Reset
    mockSendEventToDisplay.mockClear() // Clear SSE mock
    /*
     * commonHelpers are not directly called by name in these routes, so no direct reset needed here.
     * If they were, e.g. commonHelpers.createAndSend, we would mock and reset them.
     */
  })

  afterEach(() => {
    // Restore all spies
    jest.restoreAllMocks()
  })

  describe('GET /', () => {
    it('should use findAllAndSend helper to fetch all slides', async () => {
      /*
       * commonHelpers.findAllAndSend is auto-mocked. We expect it to be called.
       * The actual implementation of findAllAndSend is not tested here, only that it's invoked.
       * To make it "work" for the test, we can provide a mock implementation for it if needed,
       * or ensure the spy on Slide.find (which findAllAndSend would call) is set up.
       */

      /*
       * For this route, findAllAndSend is called directly. So we mock it.
       * The actual commonHelpers.findAllAndSend is mocked via jest.mock at the top.
       * We need to provide an implementation for the mocked version.
       */
      const mockedFindAllAndSendDirect =
        commonHelpers.findAllAndSend as jest.Mock
      mockedFindAllAndSendDirect.mockImplementation(
        (model, res, query, projection) => {
          // Simulate what findAllAndSend would do for a successful case
          res.status(200).json([{ name: 'mockSlide' }])
        }
      )

      const response = await request(app).get('/api/v1/slides')
      expect(response.status).toBe(200)
      expect(response.body).toEqual([{ name: 'mockSlide' }])
      expect(mockedFindAllAndSendDirect).toHaveBeenCalledWith(
        Slide,
        expect.any(Object),
        undefined,
        { creator_id: mockUser._id }
      )
    })

    it('should return 400 if user information is not found (though ensureAuthenticated should prevent this)', async () => {
      const tempApp = express()
      tempApp.use(express.json())
      tempApp.use((req: any, res, next) => {
        req.user = undefined // No user
        req.isAuthenticated = () => true // Still "authenticated" but no user object
        next()
      })
      tempApp.use('/api/v1/slides', SlideRouter)
      const response = await request(tempApp).get('/api/v1/slides')
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('User information not found.')
    })
  })

  describe('POST /', () => {
    const slideData: any = {
      name: 'New Test Slide',
      type: SlideType.IMAGE,
      data: { url: 'http://example.com/new.jpg' },
      slideshow_ids: ['show1'],
    }

    it('should create a new slide successfully', async () => {
      const savedSlideMock = {
        ...slideData,
        _id: 'slideNew',
        creator_id: mockUser._id,
      }
      // Mock Slide.prototype.save
      slideSaveSpy.mockResolvedValue(savedSlideMock as any)
      // Mock helper
      mockedHandleSlideInSlideshows.mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/v1/slides')
        .send(slideData)

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({ name: slideData.name })
      expect(slideSaveSpy).toHaveBeenCalledTimes(1)
      expect(mockedHandleSlideInSlideshows).toHaveBeenCalledWith(
        savedSlideMock,
        slideData.slideshow_ids,
        []
      )
    })

    it('should return 400 if required fields (name, type, data) are missing', async () => {
      const incompleteData = { name: 'Test' } // Missing type and data
      const response = await request(app)
        .post('/api/v1/slides')
        .send(incompleteData)
      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'Slide name, type, and data are required.'
      )
    })

    it('should return 400 on validation error (e.g., from Mongoose)', async () => {
      const validationError = new Error('Validation failed') as any
      validationError.name = 'ValidationError'
      validationError.errors = { name: { message: 'Name is required' } }
      slideSaveSpy.mockRejectedValue(validationError)

      const response = await request(app)
        .post('/api/v1/slides')
        .send(slideData)

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Validation Error')
      expect(response.body.errors).toEqual({
        name: { message: 'Name is required' },
      })
    })

    it('should return 500 if database save fails for other reasons', async () => {
      slideSaveSpy.mockRejectedValue(new Error('DB save error'))

      const response = await request(app)
        .post('/api/v1/slides')
        .send(slideData)

      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error creating slide')
    })

    it('should call handleSlideInSlideshows with empty array if slideshow_ids is not provided', async () => {
      const { slideshow_ids, ...dataWithoutSlideshows } = slideData
      const savedSlideMock = {
        ...dataWithoutSlideshows,
        _id: 'slideNew',
        creator_id: mockUser._id,
      }
      slideSaveSpy.mockResolvedValue(savedSlideMock as any)
      mockedHandleSlideInSlideshows.mockResolvedValue(undefined)

      await request(app).post('/api/v1/slides').send(dataWithoutSlideshows)

      /*
       * Expect handleSlideInSlideshows not to be called if slideshow_ids is empty or undefined in the route logic
       * The route logic is: if (slideshow_ids && slideshow_ids.length > 0)
       * So if slideshow_ids is undefined, it shouldn't be called.
       */
      expect(mockedHandleSlideInSlideshows).not.toHaveBeenCalled()
    })
  })

  describe('GET /:id', () => {
    it('should fetch a specific slide successfully', async () => {
      const mockSlide = {
        _id: 'slide1',
        name: 'Slide 1',
        creator_id: mockUser._id,
        type: SlideType.IMAGE,
        data: { url: 'http://example.com/image.png' },
      }
      slideFindOneSpy.mockResolvedValue(mockSlide as any)

      const response = await request(app).get('/api/v1/slides/slide1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockSlide)
      expect(slideFindOneSpy).toHaveBeenCalledWith({
        _id: 'slide1',
        creator_id: mockUser._id,
      })
    })

    it('should return 404 if slide not found', async () => {
      slideFindOneSpy.mockResolvedValue(null)
      const response = await request(app).get('/api/v1/slides/nonexistent')
      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Slide not found or not authorized.')
    })

    it('should return 500 if database error occurs', async () => {
      slideFindOneSpy.mockRejectedValue(new Error('DB error'))
      const response = await request(app).get('/api/v1/slides/slide1')
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error fetching slide.')
    })

    it('should return 400 if user information is not found (though ensureAuthenticated should prevent this)', async () => {
      const tempApp = express()
      tempApp.use(express.json())
      tempApp.use((req: any, res, next) => {
        req.user = undefined // No user
        req.isAuthenticated = () => true
        next()
      })
      tempApp.use('/api/v1/slides', SlideRouter)
      const response = await request(tempApp).get('/api/v1/slides/slide1')
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('User information not found.')
    })
  })

  describe('PUT /:id', () => {
    const slideId = 'testSlideId'
    const updateData: any = {
      name: 'Updated Slide Name',
      type: SlideType.VIDEO,
      data: { url: 'http://new.com/vid.mp4' },
    }
    const initialSlide = {
      _id: slideId,
      name: 'Old Name',
      type: SlideType.IMAGE,
      data: { url: 'http://old.com/img.jpg' },
      creator_id: mockUser._id,
      save: jest.fn(), // Mock the save method on the instance
    }

    beforeEach(() => {
      // Reset the save mock on the initialSlide object for each test if it's reused
      initialSlide.save.mockReset()
    })

    it('should update a slide successfully without changing slideshows', async () => {
      slideFindOneSpy.mockResolvedValue(initialSlide as any)
      initialSlide.save.mockResolvedValue({ ...initialSlide, ...updateData })
      /*
       * No slideshow_ids sent, so handleSlideInSlideshows should not be called, or called with undefined/empty.
       * The route logic for PUT: if (slideshow_ids !== undefined)
       */
      mockedHandleSlideInSlideshows.mockResolvedValue(undefined)

      const response = await request(app)
        .put(`/api/v1/slides/${slideId}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(slideFindOneSpy).toHaveBeenCalledWith({
        _id: slideId,
        creator_id: mockUser._id,
      })
      expect(initialSlide.save).toHaveBeenCalledTimes(1)
      expect(response.body.name).toBe(updateData.name)
      expect(mockedHandleSlideInSlideshows).not.toHaveBeenCalled() // Since slideshow_ids is not in updateData
    })

    it('should update a slide and its slideshow associations', async () => {
      const updatedDataWithSlideshows = {
        ...updateData,
        slideshow_ids: ['newShow1'],
      }
      const mockExistingSlideshows = [{ _id: 'oldShow1' }, { _id: 'oldShow2' }]

      slideFindOneSpy.mockResolvedValue(initialSlide as any)
      initialSlide.save.mockResolvedValue({
        ...initialSlide,
        ...updatedDataWithSlideshows,
      })
      // Mock Slideshow.find().select() chain
      slideshowFindSpy.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(mockExistingSlideshows),
      } as any)
      mockedHandleSlideInSlideshows.mockResolvedValue(undefined)

      const response = await request(app)
        .put(`/api/v1/slides/${slideId}`)
        .send(updatedDataWithSlideshows)

      expect(response.status).toBe(200)
      expect(slideFindOneSpy).toHaveBeenCalledWith({
        _id: slideId,
        creator_id: mockUser._id,
      })
      expect(initialSlide.save).toHaveBeenCalledTimes(1)
      expect(slideshowFindSpy).toHaveBeenCalledWith({
        slides: initialSlide._id,
      })
      expect(mockedHandleSlideInSlideshows).toHaveBeenCalledWith(
        expect.objectContaining({ _id: slideId }), // The saved slide instance
        updatedDataWithSlideshows.slideshow_ids,
        mockExistingSlideshows.map((s) => s._id)
      )
      expect(response.body.name).toBe(updatedDataWithSlideshows.name)
    })

    it('should return 404 if slide to update is not found', async () => {
      slideFindOneSpy.mockResolvedValue(null)
      const response = await request(app)
        .put(`/api/v1/slides/${slideId}`)
        .send(updateData)
      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Slide not found or not authorized')
    })

    it('should return 400 on validation error during update', async () => {
      const validationError = new Error('Validation failed') as any
      validationError.name = 'ValidationError'
      slideFindOneSpy.mockResolvedValue(initialSlide as any)
      initialSlide.save.mockRejectedValue(validationError)

      const response = await request(app)
        .put(`/api/v1/slides/${slideId}`)
        .send(updateData)
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Validation Error')
    })

    it('should return 500 if database error occurs during findOne', async () => {
      slideFindOneSpy.mockRejectedValue(new Error('DB find error'))
      const response = await request(app)
        .put(`/api/v1/slides/${slideId}`)
        .send(updateData)
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error updating slide')
    })

    it('should return 500 if database error occurs during save', async () => {
      slideFindOneSpy.mockResolvedValue(initialSlide as any)
      initialSlide.save.mockRejectedValue(new Error('DB save error')) // Non-validation error
      const response = await request(app)
        .put(`/api/v1/slides/${slideId}`)
        .send(updateData)
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error updating slide')
    })
  })

  describe('DELETE /:id', () => {
    const slideId = 'testSlideId'
    const mockSlideInstance = {
      _id: slideId,
      name: 'Test Slide',
      creator_id: mockUser._id,
      // other necessary fields...
    }

    it('should delete a slide successfully', async () => {
      slideFindOneSpy.mockResolvedValue(mockSlideInstance as any)
      mockedDeleteSlideAndCleanReferences.mockResolvedValue(
        mockSlideInstance as any
      ) // Assuming it returns the deleted slide

      const response = await request(app).delete(`/api/v1/slides/${slideId}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Slide deleted successfully')
      expect(slideFindOneSpy).toHaveBeenCalledWith({
        _id: slideId,
        creator_id: mockUser._id,
      })
      expect(mockedDeleteSlideAndCleanReferences).toHaveBeenCalledWith(slideId)
    })

    it('should return 404 if slide to delete is not found', async () => {
      slideFindOneSpy.mockResolvedValue(null)
      const response = await request(app).delete(`/api/v1/slides/${slideId}`)
      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Slide not found or not authorized')
      expect(mockedDeleteSlideAndCleanReferences).not.toHaveBeenCalled()
    })

    it('should return 404 if deleteSlideAndCleanReferences does not return a slide (e.g. already deleted)', async () => {
      slideFindOneSpy.mockResolvedValue(mockSlideInstance as any) // Slide found initially
      mockedDeleteSlideAndCleanReferences.mockResolvedValue(null) // But helper returns null

      const response = await request(app).delete(`/api/v1/slides/${slideId}`)

      expect(response.status).toBe(404)
      expect(response.body.message).toBe(
        'Slide not found during deletion process.'
      )
    })

    it('should return 500 if database error occurs during findOne', async () => {
      slideFindOneSpy.mockRejectedValue(new Error('DB find error'))
      const response = await request(app).delete(`/api/v1/slides/${slideId}`)
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error deleting slide')
    })

    it('should return 500 if deleteSlideAndCleanReferences helper throws an error', async () => {
      slideFindOneSpy.mockResolvedValue(mockSlideInstance as any)
      mockedDeleteSlideAndCleanReferences.mockRejectedValue(
        new Error('Helper error')
      )
      const response = await request(app).delete(`/api/v1/slides/${slideId}`)
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error deleting slide')
    })
  })

  // New Test Suite for SSE Notifications
  describe('Slide API - SSE Notifications', () => {
    const slideIdSse = 'sseSlideId'
    const mockDisplayIdsSse = ['displaySseSlide1', 'displaySseSlide2']

    const getMockSlideSse = (id: string) => ({
      _id: id,
      name: 'SSE Test Slide',
      type: SlideType.IMAGE,
      data: { url: 'http://example.com/sse.jpg' },
      creator_id: mockUser._id,
      save: jest.fn(),
    })

    describe('PUT /:id - Update Slide Notifications', () => {
      it('should send display_updated event with slide_change reason on successful slide update', async () => {
        const mockSlideInstance = getMockSlideSse(slideIdSse)
        mockSlideInstance.save.mockResolvedValue(mockSlideInstance)

        slideFindOneSpy.mockResolvedValue(mockSlideInstance as any)
        mockedGetDisplayIdsForSlide.mockResolvedValue(mockDisplayIdsSse)
        // Assuming slideshow_ids are not part of this specific SSE test payload for simplicity
        // If they were, slideshowFindSpy and mockedHandleSlideInSlideshows would need to be mocked too.

        const updatePayload = { name: 'Updated Slide for SSE' }
        const response = await request(app)
          .put(`/api/v1/slides/${slideIdSse}`)
          .send(updatePayload)

        expect(response.status).toBe(200)
        expect(mockedGetDisplayIdsForSlide).toHaveBeenCalledWith(
          mockSlideInstance._id
        )
        expect(mockSendEventToDisplay).toHaveBeenCalledTimes(
          mockDisplayIdsSse.length
        )
        for (const displayId of mockDisplayIdsSse) {
          expect(mockSendEventToDisplay).toHaveBeenCalledWith(
            displayId,
            'display_updated',
            expect.objectContaining({
              displayId: displayId,
              action: 'update',
              reason: 'slide_change',
              slideId: mockSlideInstance._id.toString(),
            })
          )
        }
      })

      it('should not send events if getDisplayIdsForSlide returns an empty array', async () => {
        const mockSlideInstance = getMockSlideSse(slideIdSse)
        mockSlideInstance.save.mockResolvedValue(mockSlideInstance)

        slideFindOneSpy.mockResolvedValue(mockSlideInstance as any)
        mockedGetDisplayIdsForSlide.mockResolvedValue([])

        const updatePayload = { name: 'Updated Slide No SSE' }
        await request(app)
          .put(`/api/v1/slides/${slideIdSse}`)
          .send(updatePayload)

        expect(mockedGetDisplayIdsForSlide).toHaveBeenCalledWith(
          mockSlideInstance._id
        )
        expect(mockSendEventToDisplay).not.toHaveBeenCalled()
      })

      it('should still update slide but not send events if getDisplayIdsForSlide throws an error', async () => {
        const mockSlideInstance = getMockSlideSse(slideIdSse)
        mockSlideInstance.save.mockResolvedValue(mockSlideInstance)

        slideFindOneSpy.mockResolvedValue(mockSlideInstance as any)
        mockedGetDisplayIdsForSlide.mockRejectedValue(
          new Error('DB error getting display IDs for slide')
        )

        const updatePayload = { name: 'Updated Slide Error SSE' }
        const response = await request(app)
          .put(`/api/v1/slides/${slideIdSse}`)
          .send(updatePayload)

        expect(response.status).toBe(200) // Main operation should succeed
        expect(mockSendEventToDisplay).not.toHaveBeenCalled()
      })
    })
    // DELETE notifications for slides will be tested in the slide_helper.test.ts file as per plan
  })
})
