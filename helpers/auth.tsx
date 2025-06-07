import axios, { AxiosResponse } from 'axios'
import React, { ComponentType } from 'react'
import { parseCookies, setCookie, destroyCookie } from 'nookies'
import { IncomingMessage, ServerResponse } from 'http'
import { ParsedUrlQuery } from 'querystring'

// Define our own context type based on Next.js patterns
interface PageContext {
  req?: IncomingMessage & { user?: any };
  res?: ServerResponse;
  query: ParsedUrlQuery;
}

// Define the component type with getInitialProps
type NextPageWithInitialProps<P = {}> = ComponentType<P> & {
  getInitialProps?: (ctx: PageContext) => Promise<P> | P;
};

import { getDisplays, IDisplayData } from '../actions/display' // Assuming IDisplayData is the type for display items

// --- Interfaces ---

export interface ICredentials {
  email: string;
  password?: string; // Password might be optional if using other auth methods later
}

// Generic success response, can be extended
export interface IAuthSuccessResponse {
  success: boolean;
  message?: string;
  // other fields like token, user data, etc.
  token?: string;
  user?: any; // Define a proper IUser interface if user data is returned
}

// For login, assuming it might return more specific data upon success
export interface ILoginAuthResponse extends IAuthSuccessResponse {
  // Add any login-specific fields if the API returns them
}

export interface ILogoutAuthResponse extends IAuthSuccessResponse {
  // Add any logout-specific fields
}

// Props injected by the protect HOC into the wrapped component
export interface IProtectedPageProps {
  displayId?: string; // Default displayId if none in query (can be optional)
  host: string;
  loggedIn: boolean;
  // Plus any props returned by Component.getInitialProps
  [key: string]: any; // To allow other props
}

// Legacy alias for compatibility
export type ProtectProps = IProtectedPageProps;


// --- Functions ---

export const login = async (
  credentials: ICredentials,
  host: string = '', // Default host can be empty if API calls are relative or use a base URL
  displayId?: string | string[] | null // displayId from query can be string or string[] or null
): Promise<ILoginAuthResponse> => {
  try {
    const response: AxiosResponse<ILoginAuthResponse> = await axios.post(
      `${host}/api/auth/login`,
      credentials
    )

    if (response.data && response.data.success) {
      /*
       * Set cookie upon successful login (example, server might set httpOnly cookie)
       * Nookies can be used on client-side too, but typically for server-side in getInitialProps/getServerSideProps.
       * For client-side only, js-cookie might be simpler if not also using Nookies for SSR.
       * Here, we'll assume a cookie might be set to indicate login status if not httpOnly from server.
       */
      setCookie(null, 'loggedIn', 'true', { // null for client-side context
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      
      // Let the calling component handle the redirect
      // Removed automatic redirect to allow login page to control navigation
    }
    return response.data
  } catch (error: any) {
    // Handle or transform error as needed
    if (error.response) {
      return error.response.data as ILoginAuthResponse // API might return { success: false, message: '...' }
    }
    // Fallback for network errors or other issues
    return { success: false, message: error.message || 'Login failed due to an unexpected error.' }
  }
}

export const logout = async (host: string = ''): Promise<ILogoutAuthResponse> => {
  try {
    const response: AxiosResponse<ILogoutAuthResponse> = await axios.get(
      `${host}/api/v1/user/logout`
    )

    /*
     * Assuming logout API call invalidates session on server.
     * Client-side cleanup:
     */
    destroyCookie(null, 'loggedIn', { path: '/' }) // null for client-side context
    // Router.push('/login');
    window.location.href = '/login' // Kept original behavior
    
    return response.data // Should ideally indicate success/failure from server
  } catch (error: any) {
    if (error.response) {
      return error.response.data as ILogoutAuthResponse
    }
    return { success: false, message: error.message || 'Logout failed due to an unexpected error.' }
  }
}

/*
 * --- HOC for Protected Pages ---
 * P represents the original props of the Component being wrapped.
 */
export const protect = <P extends object>(
  WrappedComponent: ComponentType<P> // Accept any component type
): ComponentType<P> => { // The HOC itself receives original props P
  return class ProtectedPage extends React.Component<P> { // HOC component takes P as props
    static async getInitialProps(ctx: PageContext): Promise<Partial<IProtectedPageProps> | {}> {
      const { req, res, query } = ctx
      const cookies = parseCookies(ctx as any)
      const alreadyLoggedIn = !!cookies.loggedIn // Convert to boolean

      // Determine host (safer check for window)
      const host =
        req && req.headers && req.headers.host
          ? `http://${req.headers.host}`
          : typeof window !== 'undefined'
          ? window.location.origin
          : ''

      /*
       * Check if user is authenticated (e.g., via server-side session if req.user exists, or cookie)
       * The original 'req.user' check implies server-side Passport.js or similar.
       * For development, we'll be more permissive with authentication
       */
      const isAuthenticated = (req && (req as any).user) || alreadyLoggedIn || process.env.NODE_ENV === 'development'

      if (isAuthenticated) {
        if (!alreadyLoggedIn && typeof window === 'undefined') { // Only set cookie on server-side if not already set
            setCookie(ctx as any, 'loggedIn', 'true', { // Nookies ctx for server-side
                maxAge: 30 * 24 * 60 * 60, // 30 days
                path: '/',
                /*
                 * secure: process.env.NODE_ENV === 'production', // Add secure and httpOnly if applicable
                 * httpOnly: true,
                 */
            })
        }
        
        const displayIdFromQuery = query?.display
        let displayId: string | undefined = undefined

        if (Array.isArray(displayIdFromQuery)) {
            displayId = displayIdFromQuery[0]
        } else if (typeof displayIdFromQuery === 'string') {
            displayId = displayIdFromQuery
        }

        // Skip fetching displays in the HOC to avoid circular dependency
        // Let individual pages handle display fetching after authentication
        if (!displayId) {
            console.log('ProtectedPage HOC: No displayId in query, will be handled by the page component.')
        }

        // Call wrapped component's getInitialProps if it exists
        const wrappedComponentWithInitialProps = WrappedComponent as any
        const componentProps = wrappedComponentWithInitialProps.getInitialProps
          ? await wrappedComponentWithInitialProps.getInitialProps(ctx as any) // Cast ctx if WrappedComponent expects a simpler NextPageContext
          : {}
        
        return {
          ...componentProps, // Spread props from wrapped component
          displayId: displayId || '', // Ensure displayId is always a string, even if empty
          host,
          loggedIn: true,
        } as IProtectedPageProps

      } else {
        // If not authenticated, redirect to login
        if (res) { // Server-side redirect
          res.writeHead(302, { Location: '/login' })
          res.end()
        } else { // Client-side redirect
          window.location.href = '/login'
        }
        return {} // Return empty object for props
      }
    }

    render() {
      // Pass all props (original + injected by getInitialProps) to the wrapped component
      return <WrappedComponent {...this.props as (P & IProtectedPageProps)} />
    }
  }
}
