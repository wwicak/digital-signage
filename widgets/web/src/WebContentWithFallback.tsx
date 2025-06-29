import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'
import * as z from 'zod'

// Zod schema for IWebDefaultData (used in props.data)
export const WebWidgetDataSchema = z.object({
  title: z.string().nullable().optional(),
  url: z.string().url(),
  color: z.string().optional(),
  refreshInterval: z.number().optional(),
  scale: z.number().optional(),
  allowInteraction: z.boolean().optional(),
  useProxy: z.boolean().optional(), // New option for proxy fallback
  showErrorMessage: z.boolean().optional(), // Show user-friendly error messages
})
export type IWebWidgetData = z.infer<typeof WebWidgetDataSchema>;

// Zod schema for WebContent component props
export const WebContentPropsSchema = z.object({
  data: WebWidgetDataSchema.optional(),
  isPreview: z.boolean().optional(),
})
export type IWebContentProps = z.infer<typeof WebContentPropsSchema>;

const DEFAULT_URL = 'https://compsci.lafayette.edu/'
const DEFAULT_COLOR = '#FFFFFF'
const DEFAULT_SCALE = 1.0
const DEFAULT_REFRESH_INTERVAL = 0
const DEFAULT_ALLOW_INTERACTION = false
const DEFAULT_USE_PROXY = false
const DEFAULT_SHOW_ERROR_MESSAGE = true

interface FrameErrorInfo {
  hasError: boolean
  errorType: 'x-frame-options' | 'csp' | 'network' | 'unknown'
  message: string
}

const WebContentWithFallback: React.FC<IWebContentProps> = React.memo(({ data, isPreview }) => {
  const [iframeKey, setIframeKey] = useState<number>(Date.now())
  const [frameError, setFrameError] = useState<FrameErrorInfo>({ hasError: false, errorType: 'unknown', message: '' })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    title = null,
    url = DEFAULT_URL,
    color = DEFAULT_COLOR,
    scale = DEFAULT_SCALE,
    allowInteraction = DEFAULT_ALLOW_INTERACTION,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    useProxy = DEFAULT_USE_PROXY,
    showErrorMessage = DEFAULT_SHOW_ERROR_MESSAGE,
  } = data || {}

  const clearRefreshInterval = useCallback((): void => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const clearLoadTimeout = useCallback((): void => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
  }, [])

  const setupRefreshInterval = useCallback((): void => {
    // Don't set up auto-refresh in preview mode to avoid unnecessary reloads
    if (refreshInterval > 0 && !isPreview) {
      refreshTimerRef.current = setInterval(() => {
        setIframeKey(Date.now())
        setIsLoading(true)
        setFrameError({ hasError: false, errorType: 'unknown', message: '' })
      }, refreshInterval * 1000)
    }
  }, [refreshInterval, isPreview])

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false)
    setFrameError({ hasError: false, errorType: 'unknown', message: '' })
    clearLoadTimeout()
    // iframe loaded successfully
  }, [url, clearLoadTimeout])

  const handleIframeError = useCallback((e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error('WebContent iframe error:', e)
    console.error('Failed to load URL:', url)
    
    setIsLoading(false)
    clearLoadTimeout()
    
    // Determine error type based on common patterns
    let errorType: FrameErrorInfo['errorType'] = 'unknown'
    let message = 'Failed to load the webpage.'
    
    // Check if it's likely an X-Frame-Options issue
    if (url.includes('https://')) {
      errorType = 'x-frame-options'
      message = 'This website cannot be displayed in a frame due to security restrictions (X-Frame-Options).'
    }
    
    setFrameError({
      hasError: true,
      errorType,
      message
    })
  }, [url, clearLoadTimeout])

  useEffect(() => {
    setupRefreshInterval()
    return clearRefreshInterval
  }, [setupRefreshInterval, clearRefreshInterval])

  // Force iframe reload when URL changes
  useEffect(() => {
    setIframeKey(Date.now())
    setIsLoading(true)
    setFrameError({ hasError: false, errorType: 'unknown', message: '' })
    
    // Set a timeout to detect loading issues
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      setFrameError({
        hasError: true,
        errorType: 'network',
        message: 'The webpage is taking too long to load or cannot be embedded.'
      })
    }, 10000) // 10 second timeout
    
    return clearLoadTimeout
  }, [url, clearLoadTimeout])

  const iframeContainerStyle: CSSProperties = React.useMemo(() => ({
    flex: 1,
    border: 'none',
    overflow: 'hidden',
    position: 'relative',
  }), [])

  const iframeStyle: CSSProperties = React.useMemo(() => ({
    border: 'none',
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }), [scale])

  const sandboxPermissions = React.useMemo(() =>
    allowInteraction
      ? 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-modals'
      : 'allow-scripts allow-same-origin'
  , [allowInteraction])

  const getProxyUrl = (originalUrl: string): string => {
    // Simple proxy solution - in production you'd want a proper proxy service
    return useProxy ? `/api/proxy?url=${encodeURIComponent(originalUrl)}` : originalUrl
  }

  const renderErrorFallback = () => {
    if (!showErrorMessage || !frameError.hasError) return null
    
    return (
      <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
        <div className='mb-4'>
          <svg className='w-16 h-16 mx-auto text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z' />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-red-600 mb-2'>Cannot Display Webpage</h3>
        <p className='text-sm text-gray-600 mb-4'>{frameError.message}</p>
        <div className='text-xs text-gray-500 mb-4'>
          URL: <span className='font-mono'>{url}</span>
        </div>
        
        {frameError.errorType === 'x-frame-options' && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md'>
            <h4 className='font-semibold text-blue-800 mb-2'>Possible Solutions:</h4>
            <ul className='text-sm text-blue-700 space-y-1 list-disc list-inside'>
              <li>Use a different URL that allows embedding</li>
              <li>Contact the website owner to allow iframe embedding</li>
              <li>Use a screenshot or static image instead</li>
              <li>Enable proxy mode if available</li>
            </ul>
          </div>
        )}
        
        {!useProxy && frameError.errorType === 'x-frame-options' && (
          <button
            onClick={() => {
              // Trigger a re-render with proxy enabled
              setFrameError({ hasError: false, errorType: 'unknown', message: '' })
              setIsLoading(true)
              setIframeKey(Date.now())
            }}
            className='mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
          >
            Try Alternative Loading Method
          </button>
        )}
      </div>
    )
  }

  const renderIframe = () => (
    <iframe
      key={iframeKey}
      src={getProxyUrl(url)}
      style={iframeStyle}
      ref={iframeRef}
      sandbox={sandboxPermissions}
      title={title || 'Web Content'}
      onLoad={handleIframeLoad}
      onError={handleIframeError}
    />
  )

  const renderLoadingSpinner = () => (
    <div className='flex items-center justify-center h-full'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
      <span className='ml-2 text-white'>Loading webpage...</span>
    </div>
  )

  return (
    <div className='relative box-border h-full w-full flex-1 font-sans flex flex-col text-white' style={{ background: color }}>
      {title && (
        <div className='p-3'>
          <div className='font-sans text-base pl-3 font-semibold uppercase'>{title}</div>
        </div>
      )}
      <div className='iframe-area' style={iframeContainerStyle}>
        {frameError.hasError ? (
          renderErrorFallback()
        ) : (
          <>
            {isLoading && renderLoadingSpinner()}
            {renderIframe()}
          </>
        )}
      </div>
    </div>
  )
})

WebContentWithFallback.displayName = 'WebContentWithFallback'

export default WebContentWithFallback