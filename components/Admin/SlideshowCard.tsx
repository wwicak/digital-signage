import React from "react";
import { Clock, Images, Trash2, Play } from "lucide-react";
import Link from "next/link";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  deleteSlideshow,
  SlideshowActionDataSchema,
} from "../../actions/slideshow";
import { ISlideData } from "../../actions/slide"; // This is z.infer<typeof SlideActionDataSchema>
import { useDisplayContext } from "../../contexts/DisplayContext";

// Zod schema for SlideshowCard props
export const SlideshowCardPropsSchema = z.object({
  value: SlideshowActionDataSchema, // Use the Zod schema for slideshow data
  refresh: z.function(z.tuple([]), z.void()).optional(), // Function with no args, returns void, optional
});

// Derive TypeScript type from Zod schema
export type ISlideshowCardProps = z.infer<typeof SlideshowCardPropsSchema>;

const SlideshowCard: React.FC<ISlideshowCardProps> = ({
  value,
  refresh = () => {},
}) => {
  const { state: displayState } = useDisplayContext();
  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault(); // Prevent Link navigation when clicking delete icon
    event.stopPropagation(); // Stop event from bubbling further

    if (value && value._id) {
      deleteSlideshow(value._id)
        .then(() => {
          refresh();
        })
        .catch((error) => {
          console.error("Failed to delete slideshow:", error);
          // Optionally, provide user feedback here
        });
    }
  };

  const calculateTotalDuration = (): number => {
    if (value && value.slides && value.slides.length > 0) {
      // Check if slides are populated (ISlideData) or just IDs (string)
      if (typeof value.slides[0] === "object") {
        // Slides are populated ISlideData objects
        return (value.slides as ISlideData[]).reduce(
          (acc, slide) => acc + (slide.duration || 0),
          0,
        );
      }
      /*
       * If slides are just string IDs, we cannot calculate duration here without fetching them.
       * For now, return 0 or indicate 'unknown'.
       * This might require fetching populated slides if duration is critical.
       */
      console.warn(
        "SlideshowCard: Slides are not populated, cannot calculate total duration.",
      );
      return 0;
    }
    return 0;
  };

  const totalDuration = calculateTotalDuration();
  const slideCount = value.slides ? value.slides.length : 0;
  const displayId = displayState.id || ""; // Fallback if displayState.id is null

  // Original JS used value.title, ISlideshowData uses value.name
  const slideshowTitle = value.name || "Untitled Slideshow";

  return (
    <Card className='group my-4 transition-all duration-200 hover:shadow-lg cursor-pointer'>
      <Link
        href={`/slideshow/${value._id}?display=${displayId}`}
        className='block'
      >
        <CardContent className='p-4'>
          <div className='flex items-center space-x-4'>
            {/* Slideshow Thumbnail */}
            <div className='flex-shrink-0'>
              <div className='h-12 w-12 rounded-lg bg-blue-500 flex items-center justify-center'>
                <Play className='h-6 w-6 text-white' />
              </div>
            </div>

            {/* Slideshow Info */}
            <div className='flex-1 min-w-0'>
              <h3 className='text-base font-semibold text-foreground truncate mb-2'>
                {slideshowTitle}
              </h3>

              <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
                <div className='flex items-center gap-1'>
                  <Clock className='h-4 w-4' />
                  <span>{totalDuration}s</span>
                </div>
                <div className='flex items-center gap-1'>
                  <Images className='h-4 w-4' />
                  <span>{slideCount} slides</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className='flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
              <Button
                variant='ghost'
                size='icon'
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(e);
                }}
                aria-label='Delete Slideshow'
                className='h-8 w-8 text-destructive hover:text-destructive'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default SlideshowCard;
