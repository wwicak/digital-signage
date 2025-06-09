import { ILayout, ILayoutWidget } from "../lib/models/Layout";
import { IWidget } from "../lib/models/Widget";

// Base API URL
const API_BASE = "/api/layouts";

// Extended layout data with populated widgets
export interface ILayoutData extends Omit<ILayout, "creator_id" | "widgets"> {
  creator_id: {
    _id: string;
    name: string;
    email: string;
  };
  widgets: Array<
    ILayoutWidget & {
      widget?: IWidget; // Populated widget data
    }
  >;
  displays?: Array<{
    _id: string;
    name: string;
    location?: string;
    building?: string;
    isOnline?: boolean;
    last_update?: Date;
  }>;
}

// For creating layouts - simplified widget structure
export interface ILayoutCreateData {
  name: string;
  description?: string;
  orientation: "landscape" | "portrait";
  layoutType: "spaced" | "compact";
  widgets: Array<{
    widget_id: string; // Reference to existing widget
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  statusBar: {
    enabled: boolean;
    color?: string;
    elements: string[];
  };
  isActive?: boolean;
  isTemplate?: boolean;
  gridConfig?: {
    cols: number;
    rows: number;
    margin: [number, number];
    rowHeight: number;
  };
  thumbnail?: string;
  previewUrl?: string;
}

export interface ILayoutUpdateData extends Partial<ILayoutCreateData> {}

export interface ILayoutQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  orientation?: "landscape" | "portrait";
  isActive?: boolean;
  isTemplate?: boolean;
  creator_id?: string;
}

export interface ILayoutsResponse {
  layouts: ILayoutData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Fetch all layouts with optional filtering and pagination
export async function getLayouts(
  params: ILayoutQueryParams = {}
): Promise<ILayoutsResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${API_BASE}${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch layouts");
  }

  return response.json();
}

// Fetch a single layout by ID
export async function getLayout(id: string): Promise<ILayoutData> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch layout");
  }

  const data = await response.json();
  return data.layout;
}

// Create a new layout
export async function createLayout(
  layoutData: ILayoutCreateData
): Promise<ILayoutData> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(layoutData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create layout");
  }

  const data = await response.json();
  return data.layout;
}

// Update an existing layout
export async function updateLayout(
  id: string,
  layoutData: ILayoutUpdateData
): Promise<ILayoutData> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(layoutData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update layout");
  }

  const data = await response.json();
  return data.layout;
}

// Delete a layout
export async function deleteLayout(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete layout");
  }
}

// Duplicate a layout
export async function duplicateLayout(
  id: string,
  newName?: string
): Promise<ILayoutData> {
  // First, fetch the existing layout
  const existingLayout = await getLayout(id);

  // Create a new layout based on the existing one
  const duplicateData: ILayoutCreateData = {
    name: newName || `${existingLayout.name} (Copy)`,
    description: existingLayout.description,
    orientation: existingLayout.orientation,
    layoutType: existingLayout.layoutType,
    widgets: existingLayout.widgets,
    statusBar: existingLayout.statusBar,
    isActive: existingLayout.isActive,
    isTemplate: existingLayout.isTemplate,
    gridConfig: existingLayout.gridConfig,
  };

  return createLayout(duplicateData);
}

// Get layouts for display selector (active templates only)
export async function getActiveLayoutTemplates(): Promise<ILayoutData[]> {
  const response = await getLayouts({
    isActive: true,
    isTemplate: true,
    limit: 100, // Get all active templates
  });

  return response.layouts;
}

// Add widget to layout
export async function addWidgetToLayout(
  layoutId: string,
  widgetData: {
    type: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    data?: any;
  }
): Promise<any> {
  const response = await fetch(`/api/layouts/${layoutId}/widgets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(widgetData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add widget to layout");
  }

  return response.json();
}

// Update widget positions in layout
export async function updateWidgetPositions(
  layoutId: string,
  positions: Array<{
    widget_id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>
): Promise<any> {
  const response = await fetch(`/api/layouts/${layoutId}/widgets`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(positions),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update widget positions");
  }

  return response.json();
}

// Remove widget from layout
export async function removeWidgetFromLayout(
  layoutId: string,
  widgetId: string
): Promise<void> {
  const response = await fetch(
    `/api/layouts/${layoutId}/widgets?widget_id=${widgetId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove widget from layout");
  }
}

// Create a default layout template (now creates actual widgets)
export async function createDefaultLayout(): Promise<ILayoutData> {
  // First create the layout without widgets
  const defaultLayoutData: Omit<ILayoutCreateData, "widgets"> = {
    name: "Default Layout",
    description: "A basic layout template with essential widgets",
    orientation: "landscape",
    layoutType: "spaced",
    widgets: [], // Start empty
    statusBar: {
      enabled: true,
      color: "#000000",
      elements: ["clock", "date"],
    },
    isActive: true,
    isTemplate: true,
    gridConfig: {
      cols: 16,
      rows: 9,
      margin: [12, 12],
      rowHeight: 60,
    },
  };

  const layout = await createLayout(defaultLayoutData as ILayoutCreateData);

  // Then add default widgets
  const defaultWidgets = [
    { type: "clock", name: "Clock Widget", x: 0, y: 0, w: 4, h: 2, data: {} },
    {
      type: "weather",
      name: "Weather Widget",
      x: 4,
      y: 0,
      w: 4,
      h: 2,
      data: {},
    },
    {
      type: "announcement",
      name: "Announcement Widget",
      x: 0,
      y: 2,
      w: 8,
      h: 4,
      data: {},
    },
  ];

  for (const widget of defaultWidgets) {
    await addWidgetToLayout(layout._id, widget);
  }

  // Return the updated layout
  return getLayout(layout._id);
}
