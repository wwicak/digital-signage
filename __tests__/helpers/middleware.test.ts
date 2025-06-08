import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../middleware'

// Mock NextResponse.next() and NextResponse.redirect()
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    next: jest.fn(() => ({
      headers: {
        set: jest.fn(),
      },
    })),
    redirect: jest.fn(),
  },
}))

const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>

describe('Middleware Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createMockRequest = (pathname: string, cookies: Record<string, string> = {}) => {
    const mockCookies = new Map()
    Object.entries(cookies).forEach(([key, value]) => {
      mockCookies.set(key, { name: key, value })
    })

    return {
      nextUrl: { pathname },
      method: 'GET',
      cookies: {
        get: (name: string) => mockCookies.get(name),
      },
      url: `http://localhost:3000${pathname}`,
    } as unknown as NextRequest
  }

  describe('Protected Routes', () => {
    const protectedPaths = [
      '/layout-admin',
      '/layout',
      '/screens',
      '/slideshows',
      '/slideshows-with-query',
      '/slideshow',
      '/preview',
      '/users'
    ]

    protectedPaths.forEach(path => {
      describe(`${path} route`, () => {
        it('should redirect to login when no authentication cookies are present', () => {
          const request = createMockRequest(path)
          
          middleware(request)

          expect(mockNextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({
              href: expect.stringContaining('/login'),
              searchParams: expect.objectContaining({
                get: expect.any(Function)
              })
            })
          )
        })

        it('should allow access when loggedIn cookie is true', () => {
          const request = createMockRequest(path, { loggedIn: 'true' })
          
          const result = middleware(request)

          expect(mockNextResponse.redirect).not.toHaveBeenCalled()
          expect(mockNextResponse.next).toHaveBeenCalled()
        })

        it('should allow access when auth-token cookie is present', () => {
          const request = createMockRequest(path, { 'auth-token': 'valid-jwt-token' })
          
          const result = middleware(request)

          expect(mockNextResponse.redirect).not.toHaveBeenCalled()
          expect(mockNextResponse.next).toHaveBeenCalled()
        })

        it('should redirect when loggedIn cookie is false', () => {
          const request = createMockRequest(path, { loggedIn: 'false' })
          
          middleware(request)

          expect(mockNextResponse.redirect).toHaveBeenCalled()
        })

        it('should allow access when both cookies are present', () => {
          const request = createMockRequest(path, { 
            loggedIn: 'true', 
            'auth-token': 'valid-jwt-token' 
          })
          
          const result = middleware(request)

          expect(mockNextResponse.redirect).not.toHaveBeenCalled()
          expect(mockNextResponse.next).toHaveBeenCalled()
        })
      })
    })
  })

  describe('Unprotected Routes', () => {
    const unprotectedPaths = [
      '/',
      '/login',
      '/display/123',
      '/api/auth/login',
      '/_next/static/css/app.css',
      '/favicon.ico'
    ]

    unprotectedPaths.forEach(path => {
      it(`should allow access to ${path} without authentication`, () => {
        const request = createMockRequest(path)
        
        const result = middleware(request)

        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
        expect(mockNextResponse.next).toHaveBeenCalled()
      })
    })
  })

  describe('CORS Headers', () => {
    it('should add CORS headers to all responses', () => {
      const request = createMockRequest('/')
      const mockResponse = { headers: { set: jest.fn() } }
      mockNextResponse.next.mockReturnValue(mockResponse)
      
      middleware(request)

      expect(mockResponse.headers.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      )
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      )
    })
  })

  describe('OPTIONS Requests', () => {
    it('should handle preflight OPTIONS requests', () => {
      const request = createMockRequest('/screens')
      request.method = 'OPTIONS'
      
      const result = middleware(request)

      // Should return a Response with status 200, not redirect or call next()
      expect(result).toBeInstanceOf(Response)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.next).not.toHaveBeenCalled()
    })
  })
})
