import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createLayout,
  updateLayout,
  deleteLayout,
  duplicateLayout,
  ILayoutCreateData,
  ILayoutUpdateData,
} from "../actions/layouts";

/**
 * Hook for layout mutations (create, update, delete, duplicate).
 * Automatically invalidates relevant queries after successful mutations.
 */
export const useLayoutMutations = () => {
  const queryClient = useQueryClient();

  // Create layout mutation
  const createLayoutMutation = useMutation({
    mutationFn: createLayout,
    onSuccess: (newLayout) => {
      // Invalidate and refetch layouts list
      queryClient.invalidateQueries({ queryKey: ["layouts"] });

      // Add the new layout to the cache
      queryClient.setQueryData(["layout", newLayout._id], newLayout);

      console.log("Layout created successfully:", newLayout.name);
    },
    onError: (error: Error) => {
      console.error("Failed to create layout:", error.message);
    },
  });

  // Update layout mutation
  const updateLayoutMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ILayoutUpdateData }) =>
      updateLayout(id, data),
    onSuccess: (updatedLayout, { id }) => {
      // Update the specific layout in cache
      queryClient.setQueryData(["layout", id], updatedLayout);

      // Invalidate layouts list to reflect changes
      queryClient.invalidateQueries({ queryKey: ["layouts"] });

      // Invalidate displays that might be using this layout
      queryClient.invalidateQueries({ queryKey: ["displays"] });

      console.log("Layout updated successfully:", updatedLayout.name);
    },
    onError: (error: Error) => {
      console.error("Failed to update layout:", error.message);
    },
  });

  // Delete layout mutation
  const deleteLayoutMutation = useMutation({
    mutationFn: deleteLayout,
    onSuccess: (_, deletedId) => {
      // Remove the layout from cache
      queryClient.removeQueries({ queryKey: ["layout", deletedId] });

      // Invalidate layouts list
      queryClient.invalidateQueries({ queryKey: ["layouts"] });

      // Invalidate displays that might have been using this layout
      queryClient.invalidateQueries({ queryKey: ["displays"] });

      console.log("Layout deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Failed to delete layout:", error.message);
    },
  });

  // Duplicate layout mutation
  const duplicateLayoutMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) =>
      duplicateLayout(id, newName),
    onSuccess: (duplicatedLayout) => {
      // Add the duplicated layout to cache
      queryClient.setQueryData(
        ["layout", duplicatedLayout._id],
        duplicatedLayout
      );

      // Invalidate layouts list to show the new layout
      queryClient.invalidateQueries({ queryKey: ["layouts"] });

      console.log("Layout duplicated successfully:", duplicatedLayout.name);
    },
    onError: (error: Error) => {
      console.error("Failed to duplicate layout:", error.message);
    },
  });

  return {
    // Mutation functions
    createLayout: createLayoutMutation.mutate,
    updateLayout: updateLayoutMutation.mutate,
    deleteLayout: deleteLayoutMutation.mutate,
    duplicateLayout: duplicateLayoutMutation.mutate,

    // Async mutation functions (return promises)
    createLayoutAsync: createLayoutMutation.mutateAsync,
    updateLayoutAsync: updateLayoutMutation.mutateAsync,
    deleteLayoutAsync: deleteLayoutMutation.mutateAsync,
    duplicateLayoutAsync: duplicateLayoutMutation.mutateAsync,

    // Mutation states
    isCreating: createLayoutMutation.isPending,
    isUpdating: updateLayoutMutation.isPending,
    isDeleting: deleteLayoutMutation.isPending,
    isDuplicating: duplicateLayoutMutation.isPending,

    // Error states
    createError: createLayoutMutation.error,
    updateError: updateLayoutMutation.error,
    deleteError: deleteLayoutMutation.error,
    duplicateError: duplicateLayoutMutation.error,

    // Reset functions
    resetCreateError: createLayoutMutation.reset,
    resetUpdateError: updateLayoutMutation.reset,
    resetDeleteError: deleteLayoutMutation.reset,
    resetDuplicateError: duplicateLayoutMutation.reset,
  };
};
