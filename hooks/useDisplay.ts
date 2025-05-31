import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDisplay, updateDisplay, IDisplayData } from '../actions/display'

// Hook for fetching a single display
export const useDisplay = (id: string | null) => {
  return useQuery({
    queryKey: ['display', id],
    queryFn: () => getDisplay(id!),
    enabled: !!id, // Only run query if id is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

// Hook for updating a display
export const useUpdateDisplay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IDisplayData> }) =>
      updateDisplay(id, data),
    onSuccess: (data, variables) => {
      // Update the specific display cache
      queryClient.invalidateQueries({ queryKey: ['display', variables.id] })
    },
  })
}
