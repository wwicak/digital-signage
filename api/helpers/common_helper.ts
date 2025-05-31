/**
 * @fileoverview Common helper functions for the API
 */

import mongoose from 'mongoose';

// Define a more specific type for Mongoose query results if possible,
// but 'any' is a fallback if the structure is highly variable or complex.
type MongooseQueryResult = any;
type MongooseDocument = mongoose.Document & { _id: mongoose.Types.ObjectId | string, [key: string]: any };


/**
 * Finds a document by ID and sends it as a JSON response.
 * @param {mongoose.Model<any>} model - The Mongoose model to query.
 * @param {string | mongoose.Types.ObjectId} id - The ID of the document to find.
 * @param {any} res - The Express response object.
 * @param {string} [populateField] - Optional field name to populate.
 * @returns {Promise<void>}
 */
export const findByIdAndSend = async (
  model: mongoose.Model<any>,
  id: string | mongoose.Types.ObjectId,
  res: any, // Should be Express.Response, but keeping 'any' if not directly passed from route
  populateField?: string
): Promise<void> => {
  try {
    let query = model.findById(id);
    if (populateField) {
      query = query.populate(populateField);
    }
    const result: MongooseQueryResult = await query;
    if (!result) {
      return res.status(404).json({ message: `${model.modelName} not found` });
    }
    res.json(result);
  } catch (error: any) {
    console.error(`Error finding ${model.modelName} by ID:`, error);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
};

/**
 * Finds all documents in a model and sends them as a JSON response.
 * @param {mongoose.Model<any>} model - The Mongoose model to query.
 * @param {any} res - The Express response object.
 * @param {string} [populateField] - Optional field name to populate.
 * @param {object} [queryOptions] - Optional query options (e.g., filter, sort).
 * @returns {Promise<void>}
 */
export const findAllAndSend = async (
  model: mongoose.Model<any>,
  res: any, // Should be Express.Response
  populateField?: string,
  queryOptions: object = {}
): Promise<void> => {
  try {
    let query = model.find(queryOptions);
    if (populateField) {
      query = query.populate(populateField);
    }
    const results: MongooseQueryResult[] = await query;
    res.json(results);
  } catch (error: any) {
    console.error(`Error finding all ${model.modelName}:`, error);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
};

/**
 * Creates a new document and sends it as a JSON response.
 * @param {mongoose.Model<any>} model - The Mongoose model to use for creation.
 * @param {object} data - The data for the new document.
 * @param {any} res - The Express response object.
 * @returns {Promise<void>}
 */
export const createAndSend = async (
  model: mongoose.Model<any>,
  data: object,
  res: any // Should be Express.Response
): Promise<void> => {
  try {
    const newItem = new model(data);
    const result: MongooseQueryResult = await newItem.save();
    res.status(201).json(result);
  } catch (error: any) {
    console.error(`Error creating ${model.modelName}:`, error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating data', error: error.message });
  }
};

/**
 * Updates a document by ID and sends the updated document as a JSON response.
 * @param {mongoose.Model<any>} model - The Mongoose model to update.
 * @param {string | mongoose.Types.ObjectId} id - The ID of the document to update.
 * @param {object} data - The update data.
 * @param {any} res - The Express response object.
 * @param {string} [populateField] - Optional field name to populate after update.
 * @returns {Promise<void>}
 */
export const findByIdAndUpdateAndSend = async (
  model: mongoose.Model<any>,
  id: string | mongoose.Types.ObjectId,
  data: object,
  res: any, // Should be Express.Response
  populateField?: string
): Promise<void> => {
  try {
    // Ensure 'last_update' is set if your schema doesn't use Mongoose timestamps for it
    // (data as any).last_update = new Date(); // Or handle this via schema middleware
    
    let updatedItem: MongooseDocument | null = await model.findByIdAndUpdate(id, data, { new: true, runValidators: true });

    if (!updatedItem) {
      return res.status(404).json({ message: `${model.modelName} not found` });
    }

    if (populateField && updatedItem.populate) { // Check if populate method exists
        updatedItem = await updatedItem.populate(populateField).execPopulate(); // older Mongoose
        // For Mongoose 6+: await updatedItem.populate(populateField);
    }
    
    res.json(updatedItem);
  } catch (error: any) {
    console.error(`Error updating ${model.modelName}:`, error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Error updating data', error: error.message });
  }
};

/**
 * Deletes a document by ID and sends a success message as a JSON response.
 * @param {mongoose.Model<any>} model - The Mongoose model to delete from.
 * @param {string | mongoose.Types.ObjectId} id - The ID of the document to delete.
 * @param {any} res - The Express response object.
 * @returns {Promise<void>}
 */
export const findByIdAndDeleteAndSend = async (
  model: mongoose.Model<any>,
  id: string | mongoose.Types.ObjectId,
  res: any // Should be Express.Response
): Promise<void> => {
  try {
    const result: MongooseQueryResult = await model.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: `${model.modelName} not found` });
    }
    res.json({ message: `${model.modelName} deleted successfully` });
  } catch (error: any) {
    console.error(`Error deleting ${model.modelName}:`, error);
    res.status(500).json({ message: 'Error deleting data', error: error.message });
  }
};

/**
 * Helper to handle SSE updates. (This is a placeholder, actual implementation might vary)
 * @param {any} res - The Express response object, configured for SSE.
 * @param {string} eventName - The name of the event to send.
 * @param {any} data - The data to send with the event.
 */
export const sendSseEvent = (res: any, eventName: string, data: any): void => {
  // Ensure res is an SSE response stream
  if (res.write && typeof res.flushHeaders === 'function') {
    try {
      const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(message);
      // res.flushHeaders(); // May or may not be needed depending on server setup
    } catch (error) {
      console.error('Failed to write SSE event:', error);
      // Optionally, attempt to close the response or mark it as errored
      // For example, if res.end is available and appropriate:
      // if (typeof res.end === 'function') {
      //   res.end();
      // }
      // Or emit an error event if 'res' is an EventEmitter-like object
      // if (typeof res.emit === 'function') {
      //   res.emit('error', error);
      // }
    }
  } else {
    console.warn('Attempted to send SSE event on a non-SSE response object.');
  }
};

// You can add more common helper functions here as needed.
// For example, a function to parse query parameters for pagination or filtering.
export interface ParsedQueryParams {
  filter: object;
  sort: object;
  skip: number;
  limit: number;
}

export const parseQueryParams = (query: any): ParsedQueryParams => {
  const { page = 1, limit = 10, sort, ...filter } = query;
  const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
  
  let sortOption = {};
  if (sort) {
    const sortParts = (sort as string).split(':');
    sortOption = { [sortParts[0]]: sortParts[1] === 'desc' ? -1 : 1 };
  }

  return {
    filter,
    sort: sortOption,
    skip,
    limit: parseInt(limit as string, 10),
  };
};
