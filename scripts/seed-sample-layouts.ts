import dbConnect from '../lib/mongodb';
import Layout from '../lib/models/Layout';
import Widget, { WidgetType } from '../lib/models/Widget';

async function seedSampleLayouts() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB');

    // Check existing layouts
    const existingLayouts = await Layout.find({});
    console.log(`Found ${existingLayouts.length} existing layouts`);

    // Check existing widgets
    const existingWidgets = await Widget.find({});
    console.log(`Found ${existingWidgets.length} existing widgets`);

    // If no layouts exist, create sample layouts
    if (existingLayouts.length === 0) {
      console.log('Creating sample layouts...');

      // Create sample widgets first if they don't exist
      let sampleWidgets = [];
      if (existingWidgets.length === 0) {
        console.log('Creating sample widgets...');
        
        const widgetData = [
          {
            name: 'Clock Widget',
            type: 'clock',
            description: 'Display current time',
            isActive: true,
            data: {
              format: '24h',
              timezone: 'auto'
            }
          },
          {
            name: 'Weather Widget',
            type: 'weather',
            description: 'Display weather information',
            isActive: true,
            data: {
              location: 'auto',
              units: 'metric'
            }
          },
          {
            name: 'Announcement Widget',
            type: 'announcement',
            description: 'Display announcements and messages',
            isActive: true,
            data: {
              title: 'Welcome',
              message: 'Welcome to our digital signage system!'
            }
          },
          {
            name: 'Image Widget',
            type: 'image',
            description: 'Display images',
            isActive: true,
            data: {
              src: '/assets/layout.png',
              alt: 'Sample image'
            }
          },
          {
            name: 'Web Widget',
            type: 'web',
            description: 'Display web content',
            isActive: true,
            data: {
              url: 'https://example.com'
            }
          }
        ];

        for (const widget of widgetData) {
          const newWidget = new Widget(widget);
          await newWidget.save();
          sampleWidgets.push(newWidget);
          console.log(`Created widget: ${widget.name}`);
        }
      } else {
        sampleWidgets = existingWidgets;
      }

      // Create sample layouts
      const layoutsData = [
        {
          name: 'Corporate Dashboard',
          description: 'A professional layout for corporate environments with clock, weather, and announcements',
          orientation: 'landscape',
          layoutType: 'spaced',
          widgets: [
            {
              widget_id: sampleWidgets.find(w => w.type === 'clock')?._id,
              x: 0, y: 0, w: 4, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'weather')?._id,
              x: 4, y: 0, w: 4, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'announcement')?._id,
              x: 0, y: 2, w: 8, h: 4
            }
          ],
          statusBar: {
            enabled: true,
            color: '#1f2937',
            elements: ['clock', 'date']
          },
          isActive: true,
          isTemplate: true,
          gridConfig: {
            cols: 16,
            rows: 9,
            margin: [12, 12],
            rowHeight: 60
          }
        },
        {
          name: 'Information Display',
          description: 'Perfect for lobbies and waiting areas with mixed content',
          orientation: 'landscape',
          layoutType: 'compact',
          widgets: [
            {
              widget_id: sampleWidgets.find(w => w.type === 'announcement')?._id,
              x: 0, y: 0, w: 8, h: 3
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'clock')?._id,
              x: 8, y: 0, w: 4, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'weather')?._id,
              x: 8, y: 2, w: 4, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'image')?._id,
              x: 0, y: 3, w: 6, h: 4
            }
          ],
          statusBar: {
            enabled: true,
            color: '#059669',
            elements: ['clock']
          },
          isActive: true,
          isTemplate: true,
          gridConfig: {
            cols: 16,
            rows: 9,
            margin: [8, 8],
            rowHeight: 60
          }
        },
        {
          name: 'Simple Clock & Weather',
          description: 'Minimal layout with just essential information',
          orientation: 'landscape',
          layoutType: 'spaced',
          widgets: [
            {
              widget_id: sampleWidgets.find(w => w.type === 'clock')?._id,
              x: 2, y: 2, w: 6, h: 3
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'weather')?._id,
              x: 2, y: 5, w: 6, h: 2
            }
          ],
          statusBar: {
            enabled: false,
            elements: []
          },
          isActive: true,
          isTemplate: true,
          gridConfig: {
            cols: 16,
            rows: 9,
            margin: [12, 12],
            rowHeight: 60
          }
        },
        {
          name: 'Portrait Display',
          description: 'Vertical layout optimized for portrait displays',
          orientation: 'portrait',
          layoutType: 'spaced',
          widgets: [
            {
              widget_id: sampleWidgets.find(w => w.type === 'clock')?._id,
              x: 0, y: 0, w: 6, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'announcement')?._id,
              x: 0, y: 2, w: 6, h: 6
            },
            {
              widget_id: sampleWidgets.find(w => w.type === 'weather')?._id,
              x: 0, y: 8, w: 6, h: 3
            }
          ],
          statusBar: {
            enabled: true,
            color: '#7c3aed',
            elements: ['date']
          },
          isActive: true,
          isTemplate: true,
          gridConfig: {
            cols: 9,
            rows: 16,
            margin: [12, 12],
            rowHeight: 60
          }
        }
      ];

      for (const layoutData of layoutsData) {
        const layout = new Layout(layoutData);
        await layout.save();
        console.log(`Created layout: ${layoutData.name}`);
      }

      console.log('Sample layouts created successfully!');
    } else {
      console.log('Layouts already exist, skipping creation');
      
      // List existing layouts
      for (const layout of existingLayouts) {
        console.log(`- ${layout.name} (${layout.orientation}, ${layout.isActive ? 'active' : 'inactive'}, ${layout.isTemplate ? 'template' : 'not template'})`);
      }
    }

    // Final count
    const finalLayouts = await Layout.find({ isActive: true, isTemplate: true });
    console.log(`\nTotal active template layouts: ${finalLayouts.length}`);

  } catch (error) {
    console.error('Error seeding layouts:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
seedSampleLayouts();