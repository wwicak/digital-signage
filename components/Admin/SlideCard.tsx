import React, { useState, useRef } from "react";
import {
  Edit,
  Trash2,
  Play,
  Globe,
  FileImage,
  FileText,
  FileVideo,
  Clock,
} from "lucide-react";
import * as z from "zod";

import SlideEditDialog from "./SlideEditDialog";
import { deleteSlide, SlideActionDataSchema } from "../../actions/slide";

// Zod schema for the 'value' prop, extending SlideActionDataSchema
const SlideCardValueSchema = SlideActionDataSchema.extend({
  order: z.number().optional(),
  title: z.string().optional(), // To cover the ExtendedSlideData interface's title field
});

// Zod schema for SlideCard props
export const SlideCardPropsSchema = z.object({
  value: SlideCardValueSchema,
  refresh: z.function(z.tuple([]), z.void()).optional(),
  // Draggable props would be added here if needed, e.g., using z.any() or more specific schemas
});

// Derive TypeScript type from Zod schema
export type ISlideCardProps = z.infer<typeof SlideCardPropsSchema>;

// Define and export ExtendedSlideData based on the schema for the value prop
export type ExtendedSlideData = z.infer<typeof SlideCardValueSchema>;

const SlideCard: React.FC<ISlideCardProps> = ({
  value,
  refresh = () => {},
}) => {
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<SlideEditDialog>(null);

  const handleEdit = (): void => {
    dialogRef.current?.open();
  };

  const handleDelete = (): void => {
    if (loading) return;

    setLoading(true);
    deleteSlide(value._id)
      .then(() => {
        refresh();
        // No need to setLoading(false) if component is unmounted by refresh
      })
      .catch((error) => {
        console.error("Failed to delete slide:", error);
        setLoading(false);
      });
  };

  const getThumbnailIcon = (slideType: string) => {
    switch (slideType) {
      case "youtube":
      case "video":
        return Play;
      case "web":
        return Globe;
      case "image":
      case "photo":
        return FileImage;
      case "markdown":
        return FileText;
      default:
        return FileVideo;
    }
  };

  const getThumbnailBackgroundColor = (slideType: string): string => {
    switch (slideType) {
      case "youtube":
      case "video":
        return "#c23616"; // Dark red
      case "web":
        return "#0097e6"; // Blue
      case "image":
      case "photo":
        return "transparent"; // No background if image is shown via backgroundImage
      case "markdown":
        return "#333"; // Dark grey for markdown
      default:
        return "#grey"; // Default grey
    }
  };

  const slideTitle = value.title || value.name || "Untitled slide";
  const slideType = value.type || "unknown"; // Ensure type has a fallback

  // Determine if thumbnail should be an icon or background image
  const showBackgroundImage = slideType === "image";
  const thumbnailStyle: React.CSSProperties = {
    backgroundImage:
      showBackgroundImage && value.data ? `url(${value.data})` : "none",
    backgroundColor: getThumbnailBackgroundColor(slideType),
  };

  return (
    <div className="p-3 font-sans rounded bg-white my-3 flex flex-row items-center relative z-10 shadow-sm hover:shadow-md transition-shadow duration-200">
      {typeof value.order === "number" && (
        <div className="absolute -top-1 -left-1 bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold z-20">
          {value.order}
        </div>
      )}
      <div className="justify-center pr-3">
        <div
          className="h-12 w-12 rounded bg-cover bg-center flex justify-center items-center border border-gray-200"
          style={thumbnailStyle}
        >
          {!showBackgroundImage &&
            React.createElement(getThumbnailIcon(slideType), {
              className: "w-6 h-6 text-white",
            })}
        </div>
      </div>
      <div className="font-sans flex flex-col justify-center pr-2 flex-1 min-w-0">
        <div className="font-sans text-base overflow-hidden whitespace-nowrap text-ellipsis text-gray-600 mb-1">
          {slideTitle}
        </div>
        <div className="font-sans text-sm text-gray-500 flex items-center">
          <div className="mr-1">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <span>{value.duration || 0}s</span>
        </div>
      </div>
      <div className="flex flex-row font-sans items-center">
        <div
          className="ml-2 p-2 rounded-full cursor-pointer transition-colors duration-200 hover:bg-gray-100"
          onClick={handleEdit}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === "Enter" || e.key === " ") handleEdit();
          }}
          aria-label="Edit slide"
        >
          <Edit className="w-4 h-4 text-gray-500" />
        </div>
        <div
          className={`ml-2 p-2 rounded-full transition-colors duration-200 ${loading ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"}`}
          onClick={!loading ? handleDelete : undefined}
          role="button"
          tabIndex={!loading ? 0 : -1}
          onKeyPress={(e) => {
            if (!loading && (e.key === "Enter" || e.key === " "))
              handleDelete();
          }}
          aria-label="Delete slide"
          aria-disabled={loading}
        >
          <Trash2 className="w-4 h-4" />
        </div>
      </div>
      <SlideEditDialog ref={dialogRef} slideId={value._id} refresh={refresh} />
    </div>
  );
};

// Not wrapped with view() in original, so keeping it that way.
export default SlideCard;
