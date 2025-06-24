import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDisplaysWithLayouts, IDisplayWithLayout } from './useDisplaysWithLayouts'
import { useActiveLayoutTemplates } from './useLayouts'

/**
 * Combined hook for display selection and layout assignment workflow
 * Provides all the data and actions needed for the display selector feature
 */
export const useDisplaySelector = () => {
  const [selectedDisplay, setSelectedDisplay] = useState<IDisplayWithLayout | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const queryClient = useQueryClient()

  // Fetch displays and layouts
  const displaysQuery = useDisplaysWithLayouts({ includeOffline: true })
  const layoutsQuery = useActiveLayoutTemplates()

  // Handle display selection
  const handleDisplaySelect = useCallback((display: IDisplayWithLayout) => {
    setSelectedDisplay(display)
  }, [])

  // Handle layout assignment
  const assignLayoutToDisplay = useCallback(async (
    displayId: string,
    layoutId: string
  ): Promise<{ success: boolean; message: string }> => {
    setIsAssigning(true)

    try {
      const response = await fetch(`/api/v1/displays/${displayId}/change-layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          layoutId,
          immediate: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign layout')
      }

      // Invalidate and refetch displays to get updated data
      await queryClient.invalidateQueries({ queryKey: ['displays-with-layouts'] })
      
      // Update selected display if it's the one that was modified
      if (selectedDisplay?._id === displayId) {
        const updatedDisplaysData = await displaysQuery.refetch()
        const updatedDisplay = updatedDisplaysData.data?.displays.find(d => d._id === displayId)
        if (updatedDisplay) {
          setSelectedDisplay(updatedDisplay)
        }
      }

      return {
        success: true,
        message: 'Layout assigned successfully. The display will update shortly.',
      }
    } catch (error: any) {
      console.error('Layout assignment error:', error)
      return {
        success: false,
        message: error.message || 'Failed to assign layout. Please try again.',
      }
    } finally {
      setIsAssigning(false)
    }
  }, [selectedDisplay, queryClient, displaysQuery])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedDisplay(null)
  }, [])

  // Refresh data
  const refreshData = useCallback(async () => {
    await Promise.all([
      displaysQuery.refetch(),
      layoutsQuery.refetch(),
    ])
  }, [displaysQuery, layoutsQuery])

  // Get display by ID
  const getDisplayById = useCallback((displayId: string): IDisplayWithLayout | undefined => {
    return displaysQuery.data?.displays.find(d => d._id === displayId)
  }, [displaysQuery.data?.displays])

  // Get layout by ID
  const getLayoutById = useCallback((layoutId: string) => {
    return layoutsQuery.data?.layouts.find(l => l._id === layoutId)
  }, [layoutsQuery.data?.layouts])

  // Filter displays by status
  const getOnlineDisplays = useCallback(() => {
    return displaysQuery.data?.displays.filter(d => d.isOnline) || []
  }, [displaysQuery.data?.displays])

  const getOfflineDisplays = useCallback(() => {
    return displaysQuery.data?.displays.filter(d => !d.isOnline) || []
  }, [displaysQuery.data?.displays])

  // Get displays by layout
  const getDisplaysByLayout = useCallback((layoutId: string) => {
    return displaysQuery.data?.displays.filter(d => d.layout === layoutId) || []
  }, [displaysQuery.data?.displays])

  return {
    // Data
    displays: displaysQuery.data?.displays || [],
    layouts: layoutsQuery.data?.layouts || [],
    selectedDisplay,
    displayStats: displaysQuery.data?.meta,
    groupedByLayout: displaysQuery.data?.groupedByLayout,

    // Loading states
    isLoadingDisplays: displaysQuery.isLoading,
    isLoadingLayouts: layoutsQuery.isLoading,
    isAssigning,

    // Error states
    displaysError: displaysQuery.error,
    layoutsError: layoutsQuery.error,

    // Actions
    handleDisplaySelect,
    assignLayoutToDisplay,
    clearSelection,
    refreshData,

    // Utilities
    getDisplayById,
    getLayoutById,
    getOnlineDisplays,
    getOfflineDisplays,
    getDisplaysByLayout,

    // Query objects for advanced usage
    displaysQuery,
    layoutsQuery,
  }
}

/**
 * Hook for display selector statistics and summary data
 */
export const useDisplaySelectorStats = () => {
  const { displays, layouts, displayStats } = useDisplaySelector()

  const stats = {
    totalDisplays: displayStats?.total || 0,
    onlineDisplays: displayStats?.online || 0,
    offlineDisplays: displayStats?.offline || 0,
    totalLayouts: layouts.length,
    displaysWithoutLayout: displays.filter(d => !d.layout).length,
    uptimePercentage: displayStats?.total > 0 
      ? Math.round((displayStats.online / displayStats.total) * 100) 
      : 0,
  }

  return {
    ...stats,
    isHealthy: stats.uptimePercentage >= 80,
    hasDisplays: stats.totalDisplays > 0,
    hasLayouts: stats.totalLayouts > 0,
  }
}
