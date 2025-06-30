/**
 * @fileoverview Common helper functions for the API
 */

import mongoose, { FilterQuery } from "mongoose";
// Removed unused import: Response from express

// Generic type for Mongoose documents - simplified to work with Mongoose types
type MongooseDocument<T = Record<string, unknown>> = mongoose.Document & {
  _id: mongoose.Types.ObjectId | string;
  toObject?: () => T & { _id: mongoose.Types.ObjectId | string };
} & T;

// Generic type for Mongoose query results
type MongooseQueryResult<T = Record<string, unknown>> = (mongoose.Document & T) | null;

// Type for Express-like response objects
interface ExpressResponse {
  status: (code: number) => ExpressResponse;
  json: (data: unknown) => void;
  getHeader?: (name: string) => string | undefined;
  write?: (data: string) => void;
}

// Type for validation errors
interface ValidationError extends Error {
  name: "ValidationError";
  errors: Record<string, {
    message?: string;
    kind?: string;
    path?: string;
    value?: unknown;
  }>;
}

// Type for SSE response
interface SSEResponse {
  getHeader?: (name: string) => string | number | string[] | undefined;
  write?: (data: string) => void;
}

// Type for MongoDB filter query
type MongoFilterQuery<T = Record<string, unknown>> = FilterQuery<T>;

// Type for update data
interface UpdateData {
  [key: string]: unknown;
  last_update?: Date;
}

/**
 * Finds a document by ID and sends it as a JSON response.
 * @param {mongoose.Model<T>} model - The Mongoose model to query.
 * @param {string | mongoose.Types.ObjectId} id - The ID of the document to find.
 * @param {ExpressResponse} res - The Express response object.
 * @param {string} [populateField] - Optional field name to populate.
 * @returns {Promise<void>}
 */
export const findByIdAndSend = async <T = Record<string, unknown>>(
  model: mongoose.Model<T>,
  id: string | mongoose.Types.ObjectId,
  res: ExpressResponse,
  populateField?: string
): Promise<void> => {
  try {
    let query = model.findById(id);
    if (populateField) {
      query = query.populate(populateField);
    }
    const result = await query;
    if (!result) {
      res.status(404).json({ message: `${model.modelName} not found` });
      return;
    }
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error finding ${model.modelName} by ID:`, error);
    res
      .status(500)
      .json({ message: "Error fetching data", error: errorMessage });
  }
};

/**
 * Finds all documents in a model and sends them as a JSON response.
 * @param {mongoose.Model<T>} model - The Mongoose model to query.
 * @param {ExpressResponse} res - The Express response object.
 * @param {string} [populateField] - Optional field name to populate.
 * @param {QueryOptions} [queryOptions] - Optional query options (e.g., filter, sort).
 * @returns {Promise<void>}
 */
export const findAllAndSend = async <T = Record<string, unknown>>(
  model: mongoose.Model<T>,
  res: ExpressResponse,
  populateField?: string,
  queryOptions: MongoFilterQuery<T> = {} as MongoFilterQuery<T>
): Promise<void> => {
  try {
    let query = model.find(queryOptions);
    if (populateField) {
      query = query.populate(populateField);
    }
    const results = await query;
    res.json(results);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error finding all ${model.modelName}:`, error);
    res
      .status(500)
      .json({ message: "Error fetching data", error: errorMessage });
  }
};

/**
 * Creates a new document and sends it as a JSON response.
 * @param {mongoose.Model<T>} model - The Mongoose model to use for creation.
 * @param {Partial<T>} data - The data for the new document.
 * @param {ExpressResponse} res - The Express response object.
 * @returns {Promise<void>}
 */
export const createAndSend = async <T = Record<string, unknown>>(
  model: mongoose.Model<T>,
  data: Partial<T>,
  res: ExpressResponse
): Promise<void> => {
  try {
    const newItem = new model(data);
    const result = await newItem.save();
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error(`Error creating ${model.modelName}:`, error);
    if (error instanceof Error) {
      if ((error as ValidationError).name === "ValidationError") {
        res.status(400).json({ message: "Validation Error", errors: (error as ValidationError).errors });
        return;
      }
      res
        .status(500)
        .json({ message: "Error creating data", error: error.message });
    } else {
      res
        .status(500)
        .json({ message: "Error creating data", error: "Unknown error" });
    }
  }
};

/**
 * Updates a document by ID and sends the updated document as a JSON response.
 * @param {mongoose.Model<T>} model - The Mongoose model to update.
 * @param {string | mongoose.Types.ObjectId} id - The ID of the document to update.
 * @param {Partial<T>} data - The update data.
 * @param {ExpressResponse} res - The Express response object.
 * @param {string} [populateField] - Optional field name to populate after update.
 * @returns {Promise<void>}
 */
export const findByIdAndUpdateAndSend = async <T = Record<string, unknown>>(
  model: mongoose.Model<T>,
  id: string | mongoose.Types.ObjectId,
  data: Partial<T>,
  res: ExpressResponse,
  populateField?: string
): Promise<void> => {
  try {
    /*
     * Ensure 'last_update' is set if your schema doesn't use Mongoose timestamps for it
     * (data as any).last_update = new Date(); // Or handle this via schema middleware
     */

    let updatedItem = await model.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      res.status(404).json({ message: `${model.modelName} not found` });
      return;
    }

    if (populateField && updatedItem) {
      try {
        // Use model.populate for better type safety
        updatedItem = await model.populate(updatedItem, populateField);
      } catch (populateError) {
        // If populate fails, log error but continue with unpopulated result
        console.warn(`Failed to populate field '${populateField}':`, populateError);
      }
    }

    res.json(updatedItem);
  } catch (error: unknown) {
    console.error(`Error updating ${model.modelName}:`, error);
    if (error instanceof Error) {
      if ((error as ValidationError).name === "ValidationError") {
        res.status(400).json({ message: "Validation Error", errors: (error as ValidationError).errors });
        return;
      }
      res
        .status(500)
        .json({ message: "Error updating data", error: error.message });
    } else {
      res
        .status(500)
        .json({ message: "Error updating data", error: "Unknown error" });
    }
  }
};

/**
 * Deletes a document by ID and sends a success message as a JSON response.
 * @param {mongoose.Model<T>} model - The Mongoose model to delete from.
 * @param {string | mongoose.Types.ObjectId} id - The ID of the document to delete.
 * @param {ExpressResponse} res - The Express response object.
 * @returns {Promise<void>}
 */
export const findByIdAndDeleteAndSend = async <T = Record<string, unknown>>(
  model: mongoose.Model<T>,
  id: string | mongoose.Types.ObjectId,
  res: ExpressResponse
): Promise<void> => {
  try {
    const result = await model.findByIdAndDelete(id);
    if (!result) {
      res.status(404).json({ message: `${model.modelName} not found` });
      return;
    }
    res.json({ message: `${model.modelName} deleted successfully` });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error deleting ${model.modelName}:`, error);
    res
      .status(500)
      .json({ message: "Error deleting data", error: errorMessage });
  }
};

/**
 * Helper to handle SSE updates. (This is a placeholder, actual implementation might vary)
 * @param {SSEResponse} res - The Express response object, configured for SSE.
 * @param {string} eventName - The name of the event to send.
 * @param {unknown} data - The data to send with the event.
 */
export const sendSseEvent = (res: SSEResponse, eventName: string, data: unknown): void => {
  // Check if this is an SSE response by looking for text/event-stream content type
  const contentType = res.getHeader && res.getHeader("Content-Type");
  if (contentType === "text/event-stream") {
    if (res.write) {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  } else {
    console.error("Attempted to send SSE event on a non-SSE response object.");
  }
};

/*
 * You can add more common helper functions here as needed.
 * For example, a function to parse query parameters for pagination or filtering.
 */
export interface ParsedQueryParams {
  filter: object;
  sort: object;
  skip: number;
  limit: number;
}

export const parseQueryParams = (query: Record<string, unknown>): ParsedQueryParams => {
  const { page = 1, limit = 10, sort, ...filter } = query;
  const skip =
    (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

  let sortOption = {};
  if (sort) {
    const sortParts = (sort as string).split(":");
    sortOption = { [sortParts[0]]: sortParts[1] === "desc" ? -1 : 1 };
  }

  return {
    filter,
    sort: sortOption,
    skip,
    limit: parseInt(limit as string, 10),
  };
};

/**
 * Augments display objects with clientCount and isOnline properties
 * @param {T[]} displays - Array of display objects
 * @param {Function} getClientCount - Function to get client count for a display ID
 * @returns {(T & { clientCount: number; isOnline: boolean })[]} - Augmented display objects
 */
export const augmentDisplaysWithClientInfo = <T extends { _id: mongoose.Types.ObjectId | string; toObject?: () => T & { _id: mongoose.Types.ObjectId | string } }>(
  displays: T[],
  getClientCount: (displayId: string) => number
): (T & { clientCount: number; isOnline: boolean })[] => {
  return displays.map((display) => {
    const displayObj = display.toObject ? display.toObject() : display;
    const clientCount = getClientCount(displayObj._id.toString());
    return {
      ...displayObj,
      clientCount,
      isOnline: clientCount > 0,
    };
  });
};

/**
 * Augments a single display object with clientCount and isOnline properties
 * @param {T} display - Display object
 * @param {Function} getClientCount - Function to get client count for a display ID
 * @returns {T & { clientCount: number; isOnline: boolean }} - Augmented display object
 */
export const augmentDisplayWithClientInfo = <T extends { _id: mongoose.Types.ObjectId | string; toObject?: () => T & { _id: mongoose.Types.ObjectId | string } }>(
  display: T,
  getClientCount: (displayId: string) => number
): T & { clientCount: number; isOnline: boolean } => {
  const displayObj = display.toObject ? display.toObject() : display;
  const clientCount = getClientCount(displayObj._id.toString());
  return {
    ...displayObj,
    clientCount,
    isOnline: clientCount > 0,
  };
};
