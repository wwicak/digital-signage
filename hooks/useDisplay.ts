import { useQuery, useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import {
  getDisplay,
  updateDisplay,
  addDisplay,
  deleteDisplay,
  IDisplayData
} from "../actions/display";

// Define a type for the response from deleteDisplay if not already available globally
interface IDeleteResponse {
  message: string;
  // Potentially other fields like id of deleted item
}

// Hook for fetching a single display
export const useDisplay = (id: string | null) => {
  return useQuery({
    queryKey: ["display", id],
    queryFn: () => getDisplay(id!),
    enabled: !!id, // Only run query if id is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Hook for updating a display
export const useUpdateDisplay = () => {
  const queryClient = useQueryClient();

  return useMutation<IDisplayData, Error, { id: string; data: Partial<IDisplayData>; host?: string }>({
    mutationFn: ({ id, data, host }) => updateDisplay(id, data, host || ""),
    onSuccess: (data, variables) => {
      // Invalidate the specific display query
      queryClient.invalidateQueries({ queryKey: ["display", variables.id] });
      // Invalidate the global list of displays
      queryClient.invalidateQueries({ queryKey: ['displays'] });
    },
  });
};

// Hook for adding a new display
export const useAddDisplay = (options?: UseMutationOptions<IDisplayData, Error, { host?: string }>) => {
  const queryClient = useQueryClient();

  return useMutation<IDisplayData, Error, { host?: string } | void>({ // void if called with no args
    mutationFn: (variables) => addDisplay(variables?.host || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['displays'] });
    },
    ...options,
  });
};

// Hook for deleting a display
export const useDeleteDisplay = (options?: UseMutationOptions<IDeleteResponse, Error, { id: string; host?: string }>) => {
  const queryClient = useQueryClient();

  return useMutation<IDeleteResponse, Error, { id: string; host?: string }>({
    mutationFn: (variables) => deleteDisplay(variables.id, variables.host || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['displays'] });
    },
    ...options,
  });
};
