const Display = require('../models/Display')
// const CommonHelper = require('./common_helper'); // CommonHelper no longer used for broadcast here

function addWidget(req, res, widgetData) { // New signature
  let widget = widgetData; // Use widgetData
  if (!widget || !widget.display || !widget._id) {
    console.error('[addWidget] Invalid widgetData received:', widgetData);
    // Ensure a response is sent to prevent hanging, matching original error handling style
    return res.status(400).json({ error: 'Invalid widget data provided to addWidget helper.' });
  }
  return Display.findById(widget.display)
    .then(display => {
      if (!display) return res.status(404).json({ error: 'Display not found' });
      display.widgets.push(widget._id);
      return display.save().then(savedDisplay => { // Renamed to avoid confusion
        if (!savedDisplay) return res.status(500).json({ error: 'Display not saved' });
        // The original addWidget returned res.json({ success: true })
        // This helper is now likely called from a hook that expects a promise,
        // and the main route handler sends the actual HTTP response.
        // For now, we'll resolve to indicate success to the hook.
        return Promise.resolve({ success: true, display: savedDisplay }); 
      });
    })
    .catch(err => {
      console.error('[addWidget] Error:', err);
      // Propagate error or handle as per hook's expectation
      return Promise.reject(err); // Or res.status(500).json({ error: err.message });
    });
}

function deleteWidget(req, res, widgetData) { // New signature
  let widget = widgetData; // Use widgetData
  if (!widget || !widget.display || !widget._id) {
    console.error('[deleteWidget] Invalid widgetData received:', widgetData);
    return res.status(400).json({ error: 'Invalid widget data provided to deleteWidget helper.' });
  }
  return Display.findById(widget.display).then(display => {
    if (!display) return res.status(404).json({ error: 'Display not found' });
    display.widgets = display.widgets.filter(function(value) {
      return !widget._id.equals(value);
    });
    return display
      .save()
      // then(() => CommonHelper.broadcastUpdate(res.io)) // Removed broadcast
      .then(savedDisplay => { // Renamed to avoid confusion
        // Similar to addWidget, resolve to indicate success to the hook.
        return Promise.resolve({ success: true, display: savedDisplay });
      });
  })
  .catch(err => {
    console.error('[deleteWidget] Error:', err);
    return Promise.reject(err); // Or res.status(500).json({ error: err.message });
  });
}

module.exports = {
  deleteWidget,
  addWidget
}
