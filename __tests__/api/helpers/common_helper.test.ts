import mongoose from 'mongoose'
import {
  findByIdAndSend,
  findAllAndSend,
  createAndSend,
  findByIdAndUpdateAndSend,
  findByIdAndDeleteAndSend,
  parseQueryParams,
  sendSseEvent,
} from '../../../api/helpers/common_helper'
import { jest } from '@jest/globals'

// Connect to the provided MongoDB database
beforeAll(async () => {
  await mongoose.connect(
    'mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
  )
})

afterAll(async () => {
  await mongoose.connection.close()
})

const mockResponse = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

// Simple test model
const TestModel = mongoose.model(
  'TestModel',
  new mongoose.Schema({
    name: String,
    value: Number,
    fieldToPopulate: { type: mongoose.Schema.Types.ObjectId, ref: 'RefModel' },
  })
)

// Reference model for populate tests
const RefModel = mongoose.model(
  'RefModel',
  new mongoose.Schema({
    data: String,
  })
)

describe('Common Helper Functions', () => {
  let res: any

  beforeEach(() => {
    res = mockResponse()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    await TestModel.deleteMany({})
    await RefModel.deleteMany({})
  })

  describe('createAndSend', () => {
    it('should create a document and send it with status 201', async () => {
      const itemData = { name: 'Test Item', value: 100 }
      await createAndSend(TestModel, itemData, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining(itemData))
    })

    it('should handle errors during creation', async () => {
      // Force an error by passing invalid data
      const invalidData = { value: 'invalid_number' }
      await createAndSend(TestModel, invalidData, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error creating data',
        })
      )
    })
  })

  describe('findByIdAndUpdateAndSend', () => {
    it('should update a document and send it', async () => {
      const item = await TestModel.create({ name: 'Test Item', value: 100 })
      const updateData = { name: 'Updated Item', value: 200 }
      await findByIdAndUpdateAndSend(
        TestModel,
        String(item._id),
        updateData,
        res
      )

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining(updateData)
      )
    })

    it('should send 404 if document not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      await findByIdAndUpdateAndSend(TestModel, nonExistentId, {}, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'TestModel not found',
      })
    })
  })

  describe('findByIdAndDeleteAndSend', () => {
    it('should delete a document and send success message', async () => {
      const item = await TestModel.create({ name: 'Test Item' })
      await findByIdAndDeleteAndSend(TestModel, String(item._id), res)

      expect(res.json).toHaveBeenCalledWith({
        message: 'TestModel deleted successfully',
      })
    })

    it('should send 404 if document not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      await findByIdAndDeleteAndSend(TestModel, nonExistentId, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'TestModel not found',
      })
    })
  })

  describe('findByIdAndSend', () => {
    it('should find document by ID and send with status 200', async () => {
      const item = await TestModel.create({ name: 'Test Item', value: 100 })
      await findByIdAndSend(TestModel, String(item._id), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Item',
          value: 100,
        })
      )
    })

    it('should send 404 if document not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      await findByIdAndSend(TestModel, nonExistentId, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'TestModel not found',
      })
    })

    it('should find document by ID with populate and send it', async () => {
      const refItem = await RefModel.create({ data: 'populated data' })
      const item = await TestModel.create({
        name: 'Test Item',
        value: 100,
        fieldToPopulate: refItem._id,
      })

      await findByIdAndSend(
        TestModel,
        String(item._id),
        res,
        'fieldToPopulate'
      )

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Item',
          value: 100,
          fieldToPopulate: expect.objectContaining({
            data: 'populated data',
          }),
        })
      )
    })
  })

  describe('findAllAndSend', () => {
    it('should find all documents and send them', async () => {
      await TestModel.create({ name: 'Item 1', value: 100 })
      await TestModel.create({ name: 'Item 2', value: 200 })

      await findAllAndSend(TestModel, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Item 1' }),
          expect.objectContaining({ name: 'Item 2' }),
        ])
      )
    })

    it('should handle empty collection', async () => {
      await findAllAndSend(TestModel, res)

      expect(res.json).toHaveBeenCalledWith([])
    })
  })

  describe('sendSseEvent', () => {
    it('should send SSE event when res has SSE headers', () => {
      const sseRes = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        getHeader: jest.fn((name: string) => 'text/event-stream'),
      }

      sendSseEvent(sseRes, 'test-event', { message: 'test data' })

      expect(sseRes.write).toHaveBeenCalledWith(
        `event: test-event\ndata: ${JSON.stringify({
          message: 'test data',
        })}\n\n`
      )
    })

    it('should log error for non-SSE response', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const regularRes = {
        getHeader: jest.fn((name: string) => 'application/json'),
      }

      sendSseEvent(regularRes, 'test-event', { message: 'test data' })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Attempted to send SSE event on a non-SSE response object.'
      )
    })
  })

  describe('parseQueryParams', () => {
    it('should parse default query params', () => {
      const query = {}
      const params = parseQueryParams(query)
      expect(params.filter).toEqual({})
      expect(params.sort).toEqual({})
      expect(params.skip).toBe(0)
      expect(params.limit).toBe(10)
    })

    it('should parse page and limit', () => {
      const query = { page: '2', limit: '5' }
      const params = parseQueryParams(query)
      expect(params.skip).toBe(5)
      expect(params.limit).toBe(5)
    })

    it('should parse ascending sort', () => {
      const query = { sort: 'name:asc' }
      const params = parseQueryParams(query)
      expect(params.sort).toEqual({ name: 1 })
    })

    it('should parse descending sort', () => {
      const query = { sort: 'name:desc' }
      const params = parseQueryParams(query)
      expect(params.sort).toEqual({ name: -1 })
    })

    it('should parse sort without direction (defaults to asc)', () => {
      const query = { sort: 'name' }
      const params = parseQueryParams(query)
      expect(params.sort).toEqual({ name: 1 })
    })

    it('should parse filter params', () => {
      const query = { name: 'test', category: 'A' }
      const params = parseQueryParams(query)
      expect(params.filter).toEqual({ name: 'test', category: 'A' })
    })

    it('should parse all parameters together', () => {
      const query = {
        page: '3',
        limit: '20',
        sort: 'age:desc',
        city: 'NY',
        active: 'true',
      }
      const params = parseQueryParams(query)
      expect(params.filter).toEqual({ city: 'NY', active: 'true' })
      expect(params.sort).toEqual({ age: -1 })
      expect(params.skip).toBe(40)
      expect(params.limit).toBe(20)
    })
  })
})
