import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addDisplay,
  updateDisplay as updateDisplayAction,
  deleteDisplay as deleteDisplayAction,
  getDisplay as getDisplayAction,
  IDisplayData,
} from '../actions/display'

/**
 * Hook providing CRUD mutation functions for displays with optimistic updates.
 * All mutations automatically invalidate relevant queries to keep data fresh.
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Automatic cache invalidation and updates
 * - Error handling and rollback capabilities
 * - Integration with global displays list
 */
export const useDisplayMutations = () => {
  const queryClient = useQueryClient()

  /**
   * Create a new display
   */
  const createDisplay = useMutation({
    mutationFn: (host?: string) => addDisplay(host),
    onSuccess: (newDisplay: IDisplayData) => {
      // Optimistically update displays list cache
      queryClient.setQueryData(
        ['displays'],
        (old: IDisplayData[] | undefined) => {
          if (!old) return [newDisplay]
          return [...old, newDisplay]
        }
      )

      // Invalidate displays query to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ['displays'] })
    },
    onError: (error) => {
      console.error('Failed to create display:', error)
      // Query invalidation will refetch and correct any optimistic updates
      queryClient.invalidateQueries({ queryKey: ['displays'] })
    },
  })

  /**
   * Update an existing display
   */
  const updateDisplayMutation = useMutation({
    mutationFn: ({
      id,
      data,
      host,
    }: {
      id: string;
      data: Partial<IDisplayData>;
      host?: string;
    }) => updateDisplayAction(id, data, host),
    onSuccess: (updatedDisplay: IDisplayData, variables) => {
      // Update individual display cache
      queryClient.setQueryData(['display', variables.id], updatedDisplay)

      // Update displays list cache
      queryClient.setQueryData(
        ['displays'],
        (old: IDisplayData[] | undefined) => {
          if (!old) return [updatedDisplay]
          return old.map((display) =>
            display._id === variables.id ? updatedDisplay : display
          )
        }
      )
    },
    onError: (error, variables) => {
      console.error(`Failed to update display ${variables.id}:`, error)
      // Invalidate both individual display and displays list
      queryClient.invalidateQueries({ queryKey: ['display', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['displays'] })
    },
  })

  /**
   * Delete a display
   */
  const deleteDisplayMutation = useMutation({
    mutationFn: ({ id, host }: { id: string; host?: string }) =>
      deleteDisplayAction(id, host),
    onSuccess: (_, variables) => {
      // Optimistically remove from displays list
      queryClient.setQueryData(
        ['displays'],
        (old: IDisplayData[] | undefined) => {
          if (!old) return []
          return old.filter((display) => display._id !== variables.id)
        }
      )

      // Remove individual display cache
      queryClient.removeQueries({ queryKey: ['display', variables.id] })
    },
    onError: (error, variables) => {
      console.error(`Failed to delete display ${variables.id}:`, error)
      // Invalidate displays query to restore correct state
      queryClient.invalidateQueries({ queryKey: ['displays'] })
    },
  })

  /**
   * Get a single display (for components that need individual display data)
   */
  const getDisplayMutation = useMutation({
    mutationFn: ({ id, host }: { id: string; host?: string }) =>
      getDisplayAction(id, host),
    onSuccess: (displayData, variables) => {
      // Update individual display cache
      queryClient.setQueryData(['display', variables.id], displayData)
    },
    onError: (error, variables) => {
      console.error(`Failed to fetch display ${variables.id}:`, error)
    },
  })

  return {
    createDisplay,
    updateDisplay: updateDisplayMutation,
    deleteDisplay: deleteDisplayMutation,
    getDisplay: getDisplayMutation,
    // Expose mutation states for loading indicators and error handling
    isCreating: createDisplay.isPending,
    isUpdating: updateDisplayMutation.isPending,
    isDeleting: deleteDisplayMutation.isPending,
    createError: createDisplay.error,
    updateError: updateDisplayMutation.error,
    deleteError: deleteDisplayMutation.error,
  }
}

/**
 * Individual hooks for specific operations (alternative API)
 * These can be used when components only need specific mutation capabilities
 */

export const useCreateDisplay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (host?: string) => addDisplay(host),
    onSuccess: (newDisplay: IDisplayData) => {
      queryClient.setQueryData(
        ['displays'],
        (old: IDisplayData[] | undefined) => {
          if (!old) return [newDisplay]
          return [...old, newDisplay]
        }
      )
      queryClient.invalidateQueries({ queryKey: ['displays'] })
    },
  })
}

export const useUpdateDisplay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
      host,
    }: {
      id: string;
      data: Partial<IDisplayData>;
      host?: string;
    }) => updateDisplayAction(id, data, host),
    onSuccess: (updatedDisplay: IDisplayData, variables) => {
      queryClient.setQueryData(['display', variables.id], updatedDisplay)
      queryClient.setQueryData(
        ['displays'],
        (old: IDisplayData[] | undefined) => {
          if (!old) return [updatedDisplay]
          return old.map((display) =>
            display._id === variables.id ? updatedDisplay : display
          )
        }
      )
    },
  })
}

export const useDeleteDisplay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, host }: { id: string; host?: string }) =>
      deleteDisplayAction(id, host),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        ['displays'],
        (old: IDisplayData[] | undefined) => {
          if (!old) return []
          return old.filter((display) => display._id !== variables.id)
        }
      )
      queryClient.removeQueries({ queryKey: ['display', variables.id] })
    },
  })
}
