/**
 * Display utilities for aspect ratio calculations and grid constraints
 * Based on standard TV/monitor aspect ratios
 */

export type DisplayOrientation = "landscape" | "portrait";

export interface AspectRatioConfig {
  ratio: number;
  width: number;
  height: number;
  cssRatio: string;
  description: string;
}

export interface GridConstraints {
  cols: number;
  rows: number;
  aspectRatio: number;
  containerAspectRatio: string;
  minItemWidth: number;
  maxItemWidth: number;
  minItemHeight: number;
  maxItemHeight: number;
  recommendedRowHeight: number;
  recommendedMargin: [number, number];
}

/**
 * Standard aspect ratios for digital displays
 */
export const ASPECT_RATIOS: Record<DisplayOrientation, AspectRatioConfig> = {
  landscape: {
    ratio: 16 / 9,
    width: 16,
    height: 9,
    cssRatio: "16/9",
    description:
      "Standard widescreen (16:9) - Most TVs, monitors, and projectors",
  },
  portrait: {
    ratio: 9 / 16,
    width: 9,
    height: 16,
    cssRatio: "9/16",
    description: "Portrait mode (9:16) - Vertical displays, digital signage",
  },
};

/**
 * Calculate grid constraints based on orientation and aspect ratio
 */
export function calculateGridConstraints(
  orientation: DisplayOrientation
): GridConstraints {
  const config = ASPECT_RATIOS[orientation];
  const isPortrait = orientation === "portrait";

  return {
    cols: config.width,
    rows: config.height,
    aspectRatio: config.ratio,
    containerAspectRatio: config.cssRatio,
    minItemWidth: 1,
    maxItemWidth: config.width,
    minItemHeight: 1,
    maxItemHeight: Math.min(8, config.height), // Reasonable max height
    recommendedRowHeight: isPortrait ? 40 : 60, // Smaller rows for portrait
    recommendedMargin: isPortrait ? [8, 8] : [12, 12], // Tighter spacing for portrait
  };
}

/**
 * Validate widget dimensions against grid constraints
 */
export function validateWidgetDimensions(
  x: number,
  y: number,
  w: number,
  h: number,
  constraints: GridConstraints
): { x: number; y: number; w: number; h: number; isValid: boolean } {
  const validatedX = Math.max(0, Math.min(x, constraints.cols - w));
  const validatedY = Math.max(0, y);
  const validatedW = Math.max(
    constraints.minItemWidth,
    Math.min(w, constraints.maxItemWidth)
  );
  const validatedH = Math.max(
    constraints.minItemHeight,
    Math.min(h, constraints.maxItemHeight)
  );

  // Ensure widget doesn't exceed grid boundaries
  const finalX = Math.max(
    0,
    Math.min(validatedX, constraints.cols - validatedW)
  );
  const finalW =
    validatedX + validatedW > constraints.cols
      ? constraints.cols - finalX
      : validatedW;

  const isValid =
    finalX === x && validatedY === y && finalW === w && validatedH === h;

  return {
    x: finalX,
    y: validatedY,
    w: finalW,
    h: validatedH,
    isValid,
  };
}

/**
 * Calculate optimal widget size based on content type and orientation
 */
export function getOptimalWidgetSize(
  widgetType: string,
  orientation: DisplayOrientation
): { w: number; h: number } {
  const constraints = calculateGridConstraints(orientation);
  const isPortrait = orientation === "portrait";

  // Default sizes based on widget type and orientation
  const sizeMap: Record<
    string,
    { landscape: [number, number]; portrait: [number, number] }
  > = {
    // [width, height] for each orientation
    clock: { landscape: [4, 3], portrait: [3, 2] },
    weather: { landscape: [5, 4], portrait: [4, 3] },
    calendar: { landscape: [6, 5], portrait: [5, 4] },
    slideshow: { landscape: [8, 6], portrait: [6, 8] },
    announcement: { landscape: [10, 4], portrait: [7, 5] },
    image: { landscape: [6, 4], portrait: [4, 6] },
    web: { landscape: [8, 6], portrait: [6, 8] },
    youtube: { landscape: [8, 5], portrait: [6, 7] },
    "media-player": { landscape: [8, 5], portrait: [6, 7] },
    "meeting-room": { landscape: [6, 4], portrait: [5, 6] },
    list: { landscape: [5, 6], portrait: [4, 8] },
    congrats: { landscape: [8, 4], portrait: [6, 5] },
  };

  const defaultSize = isPortrait ? [3, 4] : [4, 3];
  const [w, h] = sizeMap[widgetType]?.[orientation] || defaultSize;

  // Ensure sizes respect constraints
  return {
    w: Math.min(w, constraints.maxItemWidth),
    h: Math.min(h, constraints.maxItemHeight),
  };
}

/**
 * Get display information for UI
 */
export function getDisplayInfo(orientation: DisplayOrientation) {
  const config = ASPECT_RATIOS[orientation];
  const constraints = calculateGridConstraints(orientation);

  return {
    aspectRatio: config.cssRatio,
    description: config.description,
    gridSize: `${constraints.cols}×${constraints.rows}`,
    orientation: orientation.charAt(0).toUpperCase() + orientation.slice(1),
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
  };
}

/**
 * Calculate container styles for the layout preview
 */
export function getContainerStyles(
  orientation: DisplayOrientation,
  layout: "spaced" | "compact" = "spaced"
) {
  const config = ASPECT_RATIOS[orientation];
  const isPortrait = orientation === "portrait";

  return {
    aspectRatio: config.cssRatio,
    maxWidth: isPortrait ? "600px" : "100%",
    minHeight: isPortrait ? "800px" : "450px",
    margin: isPortrait ? "0 auto" : "0",
    borderRadius: layout === "spaced" ? "12px" : "8px",
    width: "100%",
  };
}
