const express = require('express')
const router = express.Router()
const generateCrudRoutes = require('mongoose-crud-generator'); // Use generateCrudRoutes
const { sendSSEUpdate } = require('../helpers/sse_helper'); // Added SSE Helper

const Widget = require('../models/Widget')
// const CommonHelper = require('../helpers/common_helper'); // CommonHelper removed
const WidgetHelper = require('../helpers/widget_helper')

/**
 *  list    - GET /widgets/
 *  create  - POST /widgets/
 *  read    - GET /widgets/{id}/
 *  update  - PUT /widgets/{id}/
 *  delete  - DELETE /widgets/{id}/
 */

const widgetRoutes = generateCrudRoutes({
  model: Widget,
  modelName: 'Widget',
  postHooksOptions: {
    create: async (req, res, responseObject) => {
      console.log('Hook Type: create, typeof responseObject:', typeof responseObject);
      console.log('Hook Type: create, responseObject:', JSON.stringify(responseObject, null, 2));
      
      if (typeof WidgetHelper.addWidget === 'function') {
        console.log('[widgets.js] Calling WidgetHelper.addWidget');
        try {
          if (responseObject && responseObject.data) {
            await WidgetHelper.addWidget(req, res, responseObject.data); // Corrected call
          } else {
            console.error('[widgets.js] responseObject.data is undefined, cannot call WidgetHelper.addWidget effectively.');
          }
        } catch (e) {
          console.error('[widgets.js] Error calling WidgetHelper.addWidget:', e);
        }
      } else {
        console.log('[widgets.js] WidgetHelper.addWidget is not a function.');
      }

      if (responseObject && responseObject.data) {
        sendSSEUpdate({ eventType: 'widget_created', widget: responseObject.data });
      } else {
        sendSSEUpdate({ eventType: 'widget_created_error', error: 'ResponseObject or responseObject.data is undefined' });
      }
    },
    update: async (req, res, responseObject) => {
      console.log('Hook Type: update, typeof responseObject:', typeof responseObject);
      console.log('Hook Type: update, responseObject:', JSON.stringify(responseObject, null, 2));
      
      if (responseObject && responseObject.data) {
        sendSSEUpdate({ eventType: 'widget_updated', widget: responseObject.data });
      } else {
        sendSSEUpdate({ eventType: 'widget_updated_error', error: 'ResponseObject or responseObject.data is undefined' });
      }
    },
    delete: async (req, res, responseObject) => {
      console.log('Hook Type: delete, typeof responseObject:', typeof responseObject);
      console.log('Hook Type: delete, responseObject:', JSON.stringify(responseObject, null, 2));
      // const dummyNext = () => {}; // dummyNext removed

      if (typeof WidgetHelper.deleteWidget === 'function') {
        console.log('[widgets.js] Calling WidgetHelper.deleteWidget');
        try {
          if (responseObject && responseObject.data) {
            await WidgetHelper.deleteWidget(req, res, responseObject.data); // Corrected call
          } else {
            // If responseObject.data is not available, but responseObject itself might be the doc (e.g. for delete)
            // Or if mongoose-crud-generator passes the ID in req.params for delete actions.
            // For now, we rely on responseObject.data as per the general pattern.
            // If this fails, specific handling for delete might be needed if responseObject differs.
            console.error('[widgets.js] responseObject.data is undefined for deleteWidget. Attempting with req.params.id or responseObject itself might be needed if this fails.');
            // As a fallback, if deleteWidget is designed to take an ID from req.params for example:
            // await WidgetHelper.deleteWidget(req, res, { _id: req.params.id }); // This is speculative
          }
        } catch (e) {
          console.error('[widgets.js] Error calling WidgetHelper.deleteWidget:', e);
        }
      } else {
        console.log('[widgets.js] WidgetHelper.deleteWidget is not a function.');
      }
      
      const deletedWidgetId = (responseObject && responseObject.data && responseObject.data._id) 
                               ? responseObject.data._id 
                               : (req.params && req.params.id);
      
      if (deletedWidgetId) {
        sendSSEUpdate({ eventType: 'widget_deleted', widgetId: deletedWidgetId });
      } else {
        sendSSEUpdate({ eventType: 'widget_deleted_error', error: 'Could not determine deleted widget ID' });
      }
    }
  }
});

router.use('/', widgetRoutes);

module.exports = router;
