import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSlideshows,
  addSlideshow,
  getSlideshow,
  deleteSlideshow,
  updateSlideshow,
  ISlideshowData,
} from "../actions/slideshow";

// Hook for fetching all slideshows
export const useSlideshows = () => {
  return useQuery({
    queryKey: ["slideshows"],
    queryFn: () => getSlideshows(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Hook for fetching a single slideshow
export const useSlideshow = (id: string) => {
  return useQuery({
    queryKey: ["slideshow", id],
    queryFn: () => getSlideshow(id),
    enabled: !!id, // Only run query if id is provided
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

// Hook for adding a new slideshow
export const useAddSlideshow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      initialData?: Partial<Omit<ISlideshowData, "_id" | "slides">>
    ) => addSlideshow(initialData),
    onSuccess: () => {
      // Invalidate and refetch slideshows list
      queryClient.invalidateQueries({ queryKey: ["slideshows"] });
    },
  });
};

// Hook for updating a slideshow
export const useUpdateSlideshow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<ISlideshowData, "_id" | "slides">>;
    }) => updateSlideshow(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch slideshows list
      queryClient.invalidateQueries({ queryKey: ["slideshows"] });
      // Update the specific slideshow cache
      queryClient.invalidateQueries({ queryKey: ["slideshow", variables.id] });
    },
  });
};

// Hook for deleting a slideshow
export const useDeleteSlideshow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSlideshow(id),
    onSuccess: () => {
      // Invalidate and refetch slideshows list
      queryClient.invalidateQueries({ queryKey: ["slideshows"] });
    },
  });
};
