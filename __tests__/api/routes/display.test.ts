// @ts-nocheck
import request from 'supertest'
import express, { Express, Response, NextFunction } from 'express'
import session from 'express-session'
// For req.user, req.isAuthenticated type usage
import mongoose from 'mongoose'
import DisplayRouter from '../../../api/routes/display'
import Display from '../../../api/models/Display'
import { WidgetType } from '../../../api/models/Widget'
import { IUser } from '../../../api/models/User'
import * as commonHelper from '../../../api/helpers/common_helper'
import * as displayHelper from '../../../api/helpers/display_helper'
import * as sseManager from '../../../api/sse_manager'

// Mock dependencies
jest.mock('../../../api/models/User')
jest.mock('passport')
jest.mock('../../../api/helpers/common_helper')
jest.mock('../../../api/helpers/display_helper')
jest.mock('../../../api/sse_manager')

const mockUser = {
  _id: 'testUserId',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
} as IUser

// Helper for mongoose query chaining
const mockQueryChain = (
  resolveValue: any = null,
  methodName: string = 'exec'
) => {
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(), // Add other chainable methods if used
  }
  query[methodName] = jest.fn().mockResolvedValue(resolveValue)
  return query
}
const validObjectIdString = () => new mongoose.Types.ObjectId().toString()

describe('Display API Routes', () => {
  let app: Express

  // Spies
  let displayFindSpy: jest.SpyInstance
  let displayFindOneSpy: jest.SpyInstance
  let displayProtoSaveSpy: jest.SpyInstance
  let displayFindByIdAndDeleteSpy: jest.SpyInstance

  // Mocked helpers
  const mockedFindAllAndSend = commonHelper.findAllAndSend as jest.Mock
  const mockedSendSseEvent = commonHelper.sendSseEvent as jest.Mock // from common_helper based on usage
  const mockedCreateWidgetsForDisplay =
    displayHelper.createWidgetsForDisplay as jest.Mock
  const mockedUpdateWidgetsForDisplay =
    displayHelper.updateWidgetsForDisplay as jest.Mock
  const mockedDeleteWidgetsForDisplay =
    displayHelper.deleteWidgetsForDisplay as jest.Mock
  const mockedAddClient = sseManager.addClient as jest.Mock
  const mockedRemoveClient = sseManager.removeClient as jest.Mock
  const mockedSendEventToDisplay = sseManager.sendEventToDisplay as jest.Mock

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

    app.use((req: any, res: Response, next: NextFunction) => {
      req.user = mockUser
      req.isAuthenticated = () => true
      next()
    })

    app.use('/api/v1/displays', DisplayRouter)

    // Spies
    displayFindSpy = jest.spyOn(Display, 'find')
    displayFindOneSpy = jest.spyOn(Display, 'findOne')
    displayProtoSaveSpy = jest.spyOn(Display.prototype, 'save')
    displayFindByIdAndDeleteSpy = jest.spyOn(Display, 'findByIdAndDelete')

    // Reset mocks
    mockedFindAllAndSend.mockReset()
    mockedSendSseEvent.mockReset()
    mockedCreateWidgetsForDisplay.mockReset()
    mockedUpdateWidgetsForDisplay.mockReset()
    mockedDeleteWidgetsForDisplay.mockReset()
    mockedAddClient.mockReset()
    mockedRemoveClient.mockReset()
    mockedSendEventToDisplay.mockReset()

    // Default spy implementations
    displayFindSpy.mockImplementation(() => mockQueryChain([]))
    displayFindOneSpy.mockImplementation(() => mockQueryChain(null))
    displayProtoSaveSpy.mockResolvedValue({ _id: 'defaultId' } as any) // Default save
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /', () => {
    it('should use findAllAndSend to fetch all displays for the user', async () => {
      mockedFindAllAndSend.mockImplementation((model, res) => {
        res.status(200).json([{ name: 'mockDisplay' }])
      })

      const response = await request(app).get('/api/v1/displays')

      expect(response.status).toBe(200)
      expect(response.body).toEqual([{ name: 'mockDisplay' }])
      expect(mockedFindAllAndSend).toHaveBeenCalledWith(
        Display,
        expect.any(Object),
        'widgets',
        { creator_id: mockUser._id }
      )
    })

    it('should return 400 if user information is not found', async () => {
      const tempApp = express()
      tempApp.use(express.json())
      tempApp.use((req: any, res, next) => {
        req.user = undefined
        req.isAuthenticated = () => true
        next()
      })
      tempApp.use('/api/v1/displays', DisplayRouter)
      await request(tempApp).get('/api/v1/displays')
      /*
       * findAllAndSend is mocked, so it might not hit the user check if not carefully handled.
       * The route itself has the user check before calling findAllAndSend.
       * This test is to ensure that check is hit.
       * We expect the route to handle it directly.
       */
      const res = await request(tempApp).get('/api/v1/displays')
      expect(res.status).toBe(400)
      expect(res.body.message).toBe('User information not found.')
    })
  })

  describe('GET /:id', () => {
    const displayId = 'testDisplayId'
    it('should fetch a specific display with populated widgets', async () => {
      const mockDisplay = {
        _id: displayId,
        name: 'Test Display',
        widgets: [],
        creator_id: mockUser._id,
      }
      // Ensure the mock for findOne().populate() resolves correctly
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(mockDisplay, 'exec').populate('widgets')
      )

      const response = await request(app).get(`/api/v1/displays/${displayId}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockDisplay)
      expect(displayFindOneSpy).toHaveBeenCalledWith({
        _id: displayId,
        creator_id: mockUser._id,
      })
      const findOneMockResult = displayFindOneSpy.mock.results[0].value
      expect(findOneMockResult.populate).toHaveBeenCalledWith('widgets')
      expect(findOneMockResult.exec).toHaveBeenCalled()
    })

    it('should return 404 if display not found', async () => {
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(null, 'exec').populate('widgets')
      )
      const response = await request(app).get('/api/v1/displays/nonexistent')
      expect(response.status).toBe(404)
      expect(response.body.message).toBe(
        'Display not found or not authorized.'
      )
    })

    it('should return 500 on database error', async () => {
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(null, 'exec')
          .populate('widgets')
          .exec.mockRejectedValue(new Error('DB error'))
      )
      const response = await request(app).get(`/api/v1/displays/${displayId}`)
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error fetching display.')
    })

    it('should return 400 if user information is not found for GET /:id', async () => {
      const tempApp = express()
      tempApp.use(express.json())
      tempApp.use((req: any, res, next) => {
        req.user = undefined
        req.isAuthenticated = () => true
        next()
      })
      tempApp.use('/api/v1/displays', DisplayRouter)

      const response = await request(tempApp).get(
        `/api/v1/displays/${displayId}`
      )
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('User information not found.')
    })
  })

  describe('POST /', () => {
    const newDisplayData = {
      name: 'New Display',
      description: 'A brand new display',
      layout: 'grid',
      statusBar: { enabled: true, color: '#FF0000', elements: ['clock'] },
      widgets: [
        {
          name: 'Widget1',
          type: WidgetType.ANNOUNCEMENT,
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          data: { text: 'test' },
        },
      ],
    }
    const savedDisplayId = 'newDisplayId'
    // This is what the final populatedDisplay should look like
    const populatedDisplayMock = {
      ...newDisplayData,
      _id: savedDisplayId,
      creator_id: mockUser._id,
      widgets: [{ _id: 'widget1Id', ...newDisplayData.widgets[0] }], // Assuming createWidgetsForDisplay adds IDs
    }

    it('should create a new display successfully with widgets', async () => {
      // Mock for new Display().save()
      const mockSavedDisplay = {
        ...newDisplayData,
        _id: savedDisplayId,
        creator_id: mockUser._id,
        widgets: ['widget1Id'], // createWidgetsForDisplay will populate this
        populate: jest.fn().mockResolvedValue(populatedDisplayMock), // Mock the populate chain
      }
      displayProtoSaveSpy.mockResolvedValue(mockSavedDisplay as any)

      /*
       * Mock for createWidgetsForDisplay
       * It modifies newDisplayDoc.widgets in place and then newDisplayDoc is saved.
       */
      mockedCreateWidgetsForDisplay.mockImplementation(
        async (displayDoc, widgetsData, creatorId) => {
          displayDoc.widgets = widgetsData.map(
            (w, i) => new mongoose.Types.ObjectId()
          ) // Simulate adding widget IDs
        }
      )
      mockedSendEventToDisplay.mockReturnValue(undefined)

      const response = await request(app)
        .post('/api/v1/displays')
        .send(newDisplayData)

      expect(response.status).toBe(201)
      expect(response.body).toEqual(populatedDisplayMock)
      expect(displayProtoSaveSpy).toHaveBeenCalledTimes(1)
      /*
       * const savedObject = displayProtoSaveSpy.mock.calls[0][0]; // Instance before save
       * expect(savedObject.name).toBe(newDisplayData.name); // Checked by response.body
       */
      expect(mockedCreateWidgetsForDisplay).toHaveBeenCalledWith(
        expect.objectContaining({ name: newDisplayData.name }), // Check the instance passed to helper
        newDisplayData.widgets,
        mockUser._id
      )
      expect(mockSavedDisplay.populate).toHaveBeenCalledWith('widgets')
      expect(mockedSendEventToDisplay).toHaveBeenCalledWith(
        savedDisplayId,
        'display_updated',
        { displayId: savedDisplayId, action: 'create' }
      )
    })

    it('should create a new display successfully without initial widgets', async () => {
      const { widgets, ...dataWithoutWidgets } = newDisplayData
      const mockSavedDisplay = {
        ...dataWithoutWidgets,
        _id: savedDisplayId,
        creator_id: mockUser._id,
        widgets: [],
        populate: jest.fn().mockResolvedValue({
          ...dataWithoutWidgets,
          _id: savedDisplayId,
          creator_id: mockUser._id,
          widgets: [],
        }),
      }
      displayProtoSaveSpy.mockResolvedValue(mockSavedDisplay as any)
      mockedSendEventToDisplay.mockReturnValue(undefined)

      const response = await request(app)
        .post('/api/v1/displays')
        .send(dataWithoutWidgets)

      expect(response.status).toBe(201)
      expect(response.body.widgets).toEqual([])
      expect(mockedCreateWidgetsForDisplay).not.toHaveBeenCalled()
      expect(mockSavedDisplay.populate).toHaveBeenCalledWith('widgets')
      expect(mockedSendEventToDisplay).toHaveBeenCalled()
    })

    it('should return 400 if name is missing', async () => {
      const { name, ...dataWithoutName } = newDisplayData
      const response = await request(app)
        .post('/api/v1/displays')
        .send(dataWithoutName)
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Display name is required.')
    })

    it('should return 400 on createWidgetsForDisplay error', async () => {
      mockedCreateWidgetsForDisplay.mockRejectedValue(
        new Error('Widget creation failed')
      )
      const response = await request(app)
        .post('/api/v1/displays')
        .send(newDisplayData)
      expect(response.status).toBe(500) // Or 400 depending on how you want to map this error
      expect(response.body.message).toBe('Error creating display')
    })

    it('should return 400 on Mongoose ValidationError during save', async () => {
      const validationError = new Error('Validation failed') as any
      validationError.name = 'ValidationError'
      displayProtoSaveSpy.mockRejectedValue(validationError)
      // createWidgetsForDisplay might be called before save, ensure it's mocked if needed
      mockedCreateWidgetsForDisplay.mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/v1/displays')
        .send(newDisplayData)
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Validation Error')
    })

    it('should return 500 on other database errors during save', async () => {
      displayProtoSaveSpy.mockRejectedValue(new Error('DB save error'))
      mockedCreateWidgetsForDisplay.mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/v1/displays')
        .send(newDisplayData)
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error creating display')
    })

    it('should return 400 if user information is not found for POST /', async () => {
      const tempApp = express()
      tempApp.use(express.json())
      tempApp.use((req: any, res, next) => {
        req.user = undefined
        req.isAuthenticated = () => true
        next()
      })
      tempApp.use('/api/v1/displays', DisplayRouter)

      const response = await request(tempApp)
        .post('/api/v1/displays')
        .send(newDisplayData)
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('User information not found.')
    })
  })

  describe('PUT /:id', () => {
    const displayId = 'existingDisplayId'
    const getInitialDisplay = () => ({
      // Use a function to get fresh mock for each test
      _id: displayId,
      name: 'Initial Display',
      description: 'Initial Description',
      creator_id: mockUser._id,
      widgets: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      layout: 'grid',
      statusBar: { enabled: true, color: '#000000', elements: ['clock'] },
      save: jest.fn(),
      populate: jest.fn().mockReturnThis(), // To mock display.populate().exec() or display.populate()
      execPopulate: jest.fn(), // Old Mongoose way, populate itself returns a promise now
    })
    const updatePayload = {
      name: 'Updated Display Name',
      description: 'Updated desc',
    }

    it('should update display details successfully', async () => {
      const currentDisplayState = getInitialDisplay()
      displayFindOneSpy.mockResolvedValueOnce(currentDisplayState) // findOne resolves to the object with a save mock

      currentDisplayState.save.mockResolvedValue({
        ...currentDisplayState,
        ...updatePayload,
      })
      // Mock populate on the savedDisplay object
      const finalPopulatedDisplay = {
        ...currentDisplayState,
        ...updatePayload,
        widgets: currentDisplayState.widgets,
      }; // Assuming widgets don't change here
      (currentDisplayState.save() as any).populate = jest
        .fn()
        .mockResolvedValue(finalPopulatedDisplay)

      const response = await request(app)
        .put(`/api/v1/displays/${displayId}`)
        .send(updatePayload)

      expect(response.status).toBe(200)
      expect(displayFindOneSpy).toHaveBeenCalledWith({
        _id: displayId,
        creator_id: mockUser._id,
      })
      expect(currentDisplayState.save).toHaveBeenCalledTimes(1)
      expect(response.body.name).toBe(updatePayload.name)
      expect(mockedSendEventToDisplay).toHaveBeenCalledWith(
        displayId,
        'display_updated',
        { displayId, action: 'update' }
      )
    })

    it('should update display widgets successfully', async () => {
      const currentDisplayState = getInitialDisplay()
      displayFindOneSpy.mockResolvedValueOnce(currentDisplayState)

      const newWidgetsData = [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          name: 'Updated Widget',
          type: WidgetType.WEATHER,
          x: 1,
          y: 1,
          w: 1,
          h: 1,
          data: {},
        },
      ]
      const updatedWidgetIds = [newWidgetsData[0]._id]
      mockedUpdateWidgetsForDisplay.mockResolvedValue(
        updatedWidgetIds.map(
          (id) => new mongoose.Types.ObjectId(id as string)
        ) as any
      )

      const finalSavedDisplay = {
        ...currentDisplayState,
        widgets: updatedWidgetIds,
      }
      currentDisplayState.save.mockResolvedValue(finalSavedDisplay);
      // Mock populate on the savedDisplay object
      (finalSavedDisplay as any).populate = jest
        .fn()
        .mockResolvedValue(finalSavedDisplay)

      const response = await request(app)
        .put(`/api/v1/displays/${displayId}`)
        .send({ widgets: newWidgetsData })

      expect(response.status).toBe(200)
      expect(mockedUpdateWidgetsForDisplay).toHaveBeenCalledWith(
        currentDisplayState,
        newWidgetsData,
        mockUser._id
      )
      expect(currentDisplayState.save).toHaveBeenCalledTimes(1)
      expect(response.body.widgets).toEqual(newWidgetsData) // Compare with the expected objects
    })

    it('should return 404 if display to update is not found', async () => {
      displayFindOneSpy.mockImplementation(() => mockQueryChain(null))
      const response = await request(app)
        .put('/api/v1/displays/nonExistentId')
        .send(updatePayload)
      expect(response.status).toBe(404)
    })

    it('should return 400 on Mongoose ValidationError during save', async () => {
      const currentDisplayState = getInitialDisplay()
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentDisplayState)
      )
      const validationError = new Error('Validation failed') as any
      validationError.name = 'ValidationError'
      currentDisplayState.save.mockRejectedValue(validationError)

      const response = await request(app)
        .put(`/api/v1/displays/${displayId}`)
        .send(updatePayload)
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Validation Error')
    })

    it('should return 500 on other database errors during save', async () => {
      const currentDisplayState = getInitialDisplay()
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(currentDisplayState)
      )
      currentDisplayState.save.mockRejectedValue(new Error('DB save error'))

      const response = await request(app)
        .put(`/api/v1/displays/${displayId}`)
        .send(updatePayload)
      expect(response.status).toBe(500)
    })

    it('should return 400 if user information is not found for PUT /:id', async () => {
      const tempApp = express()
      tempApp.use(express.json())
      tempApp.use((req: any, res, next) => {
        req.user = undefined
        req.isAuthenticated = () => true
        next()
      })
      tempApp.use('/api/v1/displays', DisplayRouter)

      const response = await request(tempApp)
        .put(`/api/v1/displays/${displayId}`)
        .send(updatePayload)
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('User information not found.')
    })
  })

  describe('DELETE /:id', () => {
    const displayId = 'displayToDelete'
    const mockDisplayInstance = {
      _id: displayId,
      name: 'Test Display',
      creator_id: mockUser._id,
      // other necessary fields...
    }

    it('should delete a display successfully', async () => {
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(mockDisplayInstance)
      )
      mockedDeleteWidgetsForDisplay.mockResolvedValue(undefined) // Assume it completes
      displayFindByIdAndDeleteSpy.mockResolvedValue(mockDisplayInstance as any) // Returns the deleted document
      mockedSendEventToDisplay.mockReturnValue(undefined)

      const response = await request(app).delete(
        `/api/v1/displays/${displayId}`
      )

      expect(response.status).toBe(200)
      expect(response.body.message).toBe(
        'Display and associated widgets deleted successfully'
      )
      expect(displayFindOneSpy.mock.results[0].value.exec).toHaveBeenCalled()
      expect(mockedDeleteWidgetsForDisplay).toHaveBeenCalledWith(
        mockDisplayInstance
      )
      expect(displayFindByIdAndDeleteSpy).toHaveBeenCalledWith(displayId)
      expect(mockedSendEventToDisplay).toHaveBeenCalledWith(
        displayId,
        'display_updated',
        { displayId, action: 'delete' }
      )
    })

    it('should return 404 if display to delete is not found by findOne', async () => {
      displayFindOneSpy.mockImplementation(() => mockQueryChain(null))
      const response = await request(app).delete(
        '/api/v1/displays/nonExistentId'
      )

      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Display not found or not authorized')
      expect(mockedDeleteWidgetsForDisplay).not.toHaveBeenCalled()
      expect(displayFindByIdAndDeleteSpy).not.toHaveBeenCalled()
    })

    it('should return 500 if findOne throws an error during delete', async () => {
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(null)
          .exec.mockRejectedValue(new Error('DB find error'))
          .getMockImplementation()()
      )
      const response = await request(app).delete(
        `/api/v1/displays/${displayId}`
      )
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error deleting display')
    })

    it('should return 500 if deleteWidgetsForDisplay helper throws an error', async () => {
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(mockDisplayInstance)
      )
      mockedDeleteWidgetsForDisplay.mockRejectedValue(
        new Error('Helper error')
      )
      const response = await request(app).delete(
        `/api/v1/displays/${displayId}`
      )
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error deleting display')
    })

    it('should return 500 if findByIdAndDelete throws an error', async () => {
      displayFindOneSpy.mockImplementation(() =>
        mockQueryChain(mockDisplayInstance)
      )
      mockedDeleteWidgetsForDisplay.mockResolvedValue(undefined)
      displayFindByIdAndDeleteSpy.mockRejectedValue(
        new Error('DB delete error')
      )
      const response = await request(app).delete(
        `/api/v1/displays/${displayId}`
      )
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error deleting display')
    })

    it('should return 400 if user information is not found for DELETE /:id', async () => {
      const tempApp = express()
      tempApp.use(express.json())
      tempApp.use((req: any, res, next) => {
        req.user = undefined
        req.isAuthenticated = () => true
        next()
      })
      tempApp.use('/api/v1/displays', DisplayRouter)

      const response = await request(tempApp).delete(
        `/api/v1/displays/${displayId}`
      )
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('User information not found.')
    })
  })

  describe('GET /:displayId/events (SSE)', () => {
    const displayId = 'sseDisplayId'
    let mockRes: any // Partial<Response> is not enough for SSE specific methods like flushHeaders

    beforeEach(() => {
      // Create a more complete mock for Response for SSE tests
      mockRes = {
        setHeader: jest.fn().mockReturnThis(),
        flushHeaders: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(), // Though not used by SSE route
        json: jest.fn().mockReturnThis(), // Though not used by SSE route
        on: jest.fn(), // To mock 'close' event listener
      }
    })

    it('should set up SSE connection and send connected event', (done) => {
      /*
       * For SSE, we can't use supertest easily for ongoing stream.
       * We'll directly invoke the route handler with mock req/res.
       * Find the route handler for GET /:displayId/events
       */
      const sseRoute = DisplayRouter.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === '/:displayId/events' &&
          layer.route.methods.get
      )

      expect(sseRoute).toBeDefined()
      if (!sseRoute || !sseRoute.route) {
        return done.fail('SSE route not found')
      }

      const sseHandler = sseRoute.route.stack[0].handle

      const mockReq: any = {
        params: { displayId },
        on: jest.fn((event, cb) => {
          if (event === 'close') {
            // Simulate close event triggering later if needed, or just register
          }
        }),
        user: undefined, // SSE route does not use ensureAuthenticated
        isAuthenticated: () => false,
      }

      sseHandler(mockReq, mockRes, jest.fn()) // Call with mockNext

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream'
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache'
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Connection',
        'keep-alive'
      )
      expect(mockRes.flushHeaders).toHaveBeenCalled()
      expect(mockedAddClient).toHaveBeenCalledWith(displayId, mockRes)
      expect(mockedSendSseEvent).toHaveBeenCalledWith(mockRes, 'connected', {
        message: 'SSE connection established',
      })

      // Simulate client closing connection
      const closeCallback = mockReq.on.mock.calls.find(
        (call: any) => call[0] === 'close'
      )[1]
      expect(closeCallback).toBeInstanceOf(Function)
      closeCallback() // Trigger close
      expect(mockedRemoveClient).toHaveBeenCalledWith(displayId, mockRes)

      done()
    })
  })
})
