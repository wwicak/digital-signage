import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'
// FontAwesome configuration is handled globally

import * as z from 'zod'
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

// Zod schema for IWebDefaultData (used in props.data)
export const WebWidgetDataSchema = z.object({
  title: z.string().nullable().optional(),
  url: z.string().url(),
  color: z.string().optional(),
  refreshInterval: z.number().optional(),
  scale: z.number().optional(),
  allowInteraction: z.boolean().optional(),
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

const WebContent: React.FC<IWebContentProps> = React.memo(({ data, isPreview }) => {
  const [iframeKey, setIframeKey] = useState<number>(Date.now())
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    title = null,
    url = DEFAULT_URL,
    color = DEFAULT_COLOR,
    scale = DEFAULT_SCALE,
    allowInteraction = DEFAULT_ALLOW_INTERACTION,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
  } = data || {}

  const clearRefreshInterval = useCallback((): void => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const setupRefreshInterval = useCallback((): void => {
    if (refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        setIframeKey(Date.now())
      }, refreshInterval * 1000)
    }
  }, [refreshInterval])

  useEffect(() => {
    setupRefreshInterval()
    return clearRefreshInterval
  }, [setupRefreshInterval, clearRefreshInterval])

  // Force iframe reload when URL changes
  useEffect(() => {
    setIframeKey(Date.now())
  }, [url])

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

  return (
    <div className="relative box-border h-full w-full flex-1 font-sans flex flex-col text-white" style={{ background: color }}>
      {title && (
        <div className="p-3">
          <div className="font-sans text-base pl-3 font-semibold uppercase">{title}</div>
        </div>
      )}
      <div className='iframe-area' style={iframeContainerStyle}>
        <iframe
          key={iframeKey}
          src={url}
          style={iframeStyle}
          ref={iframeRef}
          sandbox={sandboxPermissions}
          title={title || 'Web Content'}
        />
      </div>
      
    </div>
  )
})

WebContent.displayName = 'WebContent'

export default WebContent