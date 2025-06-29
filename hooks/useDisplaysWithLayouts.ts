import { useQuery } from '@tanstack/react-query'

export interface IDisplayWithLayout {
  _id: string
  name: string
  location?: string
  building?: string
  layout?: string
  layoutName?: string
  isOnline: boolean
  last_update?: string
  created_at?: string
  updated_at?: string
}

export interface IDisplaysWithLayoutsResponse {
  displays: IDisplayWithLayout[]
  groupedByLayout: Record<string, IDisplayWithLayout[]>
  meta: {
    total: number
    online: number
    offline: number
  }
}

/**
 * Hook for fetching displays with their layout information
 * Optimized for display selection and management
 */
export const useDisplaysWithLayouts = (options?: {
  includeOffline?: boolean
  layoutId?: string
}) => {
  const { includeOffline = true, layoutId } = options || {}

  return useQuery({
    queryKey: ['displays-with-layouts', { includeOffline, layoutId }],
    queryFn: async (): Promise<IDisplaysWithLayoutsResponse> => {
      const searchParams = new URLSearchParams()
      
      if (includeOffline) {
        searchParams.append('includeOffline', 'true')
      }
      
      if (layoutId) {
        searchParams.append('layoutId', layoutId)
      }

      const url = `/api/displays${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch displays')
      }

      const data = await response.json()
      
      // Enhance displays with layout names if needed
      const enhancedDisplays = await Promise.all(
        data.displays.map(async (display: IDisplayWithLayout) => {
          let layoutName = 'No Layout'
          
          if (display.layout) {
            try {
              const layoutResponse = await fetch(`/api/layouts/${display.layout}`, {
                credentials: 'include',
              })
              
              if (layoutResponse.ok) {
                const layoutData = await layoutResponse.json()
                layoutName = layoutData.layout?.name || 'Unknown Layout'
              }
            } catch (error) {
              console.warn(`Failed to fetch layout name for display ${display._id}:`, error)
            }
          }
          
          return {
            ...display,
            layoutName,
          }
        })
      )

      return {
        displays: enhancedDisplays,
        groupedByLayout: data.groupedByLayout || {},
        meta: data.meta || { total: 0, online: 0, offline: 0 },
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for real-time display management
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for display status
  })
}
