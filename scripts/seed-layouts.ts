import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Layout from '../lib/models/Layout';
import Widget, { WidgetType, IWidget } from '../lib/models/Widget';
import User from '../lib/models/User';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set!");
  console.error("Please set MONGODB_URI in your .env file");
  process.exit(1);
}

async function seedLayouts() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB successfully');

    // Find admin user to use as creator
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run the admin creation script first.');
      process.exit(1);
    }

    // Check existing layouts
    const existingLayouts = await Layout.find({});
    console.log(`Found ${existingLayouts.length} existing layouts`);

    // Check existing widgets
    const existingWidgets = await Widget.find({});
    console.log(`Found ${existingWidgets.length} existing widgets`);

    // Create sample widgets if they don't exist
    let sampleWidgets: IWidget[] = [];
    
    if (existingWidgets.length === 0) {
      console.log('Creating sample widgets...');
      
      const widgetData = [
        {
          name: 'Welcome Announcement',
          type: WidgetType.ANNOUNCEMENT,
          x: 0, y: 0, w: 4, h: 2,
          data: {
            title: 'Welcome',
            content: 'Welcome to our digital signage system!',
            color: '#ffffff',
            backgroundColor: '#3b82f6'
          },
          creator_id: adminUser._id
        },
        {
          name: 'Weather Display',
          type: WidgetType.WEATHER,
          x: 0, y: 0, w: 4, h: 3,
          data: {
            title: 'Current Weather',
            location: 'auto',
            units: 'metric',
            color: '#1f2937'
          },
          creator_id: adminUser._id
        },
        {
          name: 'Company Image',
          type: WidgetType.IMAGE,
          x: 0, y: 0, w: 4, h: 3,
          data: {
            title: 'Company Logo',
            url: '/assets/layout.png',
            fit: 'contain',
            color: '#ffffff',
            altText: 'Company logo'
          },
          creator_id: adminUser._id
        },
        {
          name: 'Information List',
          type: WidgetType.LIST,
          x: 0, y: 0, w: 4, h: 4,
          data: {
            title: 'Today\'s Schedule',
            items: [
              '9:00 AM - Team Meeting',
              '11:00 AM - Client Presentation',
              '2:00 PM - Training Session',
              '4:00 PM - Project Review'
            ],
            color: '#374151'
          },
          creator_id: adminUser._id
        },
        {
          name: 'Web Content',
          type: WidgetType.WEB,
          x: 0, y: 0, w: 6, h: 4,
          data: {
            title: 'Company Website',
            url: 'https://example.com',
            color: '#ffffff',
            refreshInterval: 300,
            scale: 1.0,
            allowInteraction: false
          },
          creator_id: adminUser._id
        }
      ];

      for (const widget of widgetData) {
        const newWidget = new Widget(widget);
        const savedWidget = await newWidget.save();
        sampleWidgets.push(savedWidget);
        console.log(`✅ Created widget: ${widget.name}`);
      }
    } else {
      sampleWidgets = existingWidgets;
      console.log('Using existing widgets');
    }

    // Create sample layouts if they don't exist
    if (existingLayouts.length === 0) {
      console.log('Creating sample layouts...');

      const layoutsData = [
        {
          name: 'Corporate Dashboard',
          description: 'A professional layout for corporate environments with announcements, weather, and information',
          orientation: 'landscape',
          layoutType: 'spaced',
          widgets: [
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.ANNOUNCEMENT)?._id,
              x: 0, y: 0, w: 8, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.WEATHER)?._id,
              x: 8, y: 0, w: 4, h: 3
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.LIST)?._id,
              x: 0, y: 2, w: 8, h: 4
            }
          ],
          statusBar: {
            enabled: true,
            color: '#1f2937',
            elements: ['time', 'date']
          },
          isActive: true,
          isTemplate: true,
          creator_id: adminUser._id,
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
              widget_id: sampleWidgets.find(w => w.type === WidgetType.ANNOUNCEMENT)?._id,
              x: 0, y: 0, w: 6, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.IMAGE)?._id,
              x: 6, y: 0, w: 4, h: 3
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.WEATHER)?._id,
              x: 10, y: 0, w: 4, h: 3
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.LIST)?._id,
              x: 0, y: 2, w: 6, h: 4
            }
          ],
          statusBar: {
            enabled: true,
            color: '#059669',
            elements: ['time']
          },
          isActive: true,
          isTemplate: true,
          creator_id: adminUser._id,
          gridConfig: {
            cols: 16,
            rows: 9,
            margin: [8, 8],
            rowHeight: 60
          }
        },
        {
          name: 'Simple Weather & Announcements',
          description: 'Minimal layout with essential information',
          orientation: 'landscape',
          layoutType: 'spaced',
          widgets: [
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.ANNOUNCEMENT)?._id,
              x: 2, y: 2, w: 8, h: 3
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.WEATHER)?._id,
              x: 2, y: 5, w: 6, h: 2
            }
          ],
          statusBar: {
            enabled: false,
            elements: []
          },
          isActive: true,
          isTemplate: true,
          creator_id: adminUser._id,
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
              widget_id: sampleWidgets.find(w => w.type === WidgetType.ANNOUNCEMENT)?._id,
              x: 0, y: 0, w: 6, h: 3
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.LIST)?._id,
              x: 0, y: 3, w: 6, h: 6
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.WEATHER)?._id,
              x: 0, y: 9, w: 6, h: 3
            }
          ],
          statusBar: {
            enabled: true,
            color: '#7c3aed',
            elements: ['date']
          },
          isActive: true,
          isTemplate: true,
          creator_id: adminUser._id,
          gridConfig: {
            cols: 9,
            rows: 16,
            margin: [12, 12],
            rowHeight: 60
          }
        },
        {
          name: 'Web Content Display',
          description: 'Layout focused on web content with supporting widgets',
          orientation: 'landscape',
          layoutType: 'compact',
          widgets: [
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.WEB)?._id,
              x: 0, y: 0, w: 10, h: 6
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.ANNOUNCEMENT)?._id,
              x: 10, y: 0, w: 6, h: 2
            },
            {
              widget_id: sampleWidgets.find(w => w.type === WidgetType.WEATHER)?._id,
              x: 10, y: 2, w: 6, h: 4
            }
          ],
          statusBar: {
            enabled: true,
            color: '#dc2626',
            elements: ['time', 'date']
          },
          isActive: true,
          isTemplate: true,
          creator_id: adminUser._id,
          gridConfig: {
            cols: 16,
            rows: 9,
            margin: [8, 8],
            rowHeight: 60
          }
        }
      ];

      for (const layoutData of layoutsData) {
        const layout = new Layout(layoutData);
        await layout.save();
        console.log(`✅ Created layout: ${layoutData.name}`);
      }

      console.log('🎉 Sample layouts created successfully!');
    } else {
      console.log('Layouts already exist, skipping creation');
      
      // List existing layouts
      for (const layout of existingLayouts) {
        console.log(`- ${layout.name} (${layout.orientation}, ${layout.isActive ? 'active' : 'inactive'}, ${layout.isTemplate ? 'template' : 'not template'})`);
      }
    }

    // Final count
    const finalLayouts = await Layout.find({ isActive: true, isTemplate: true });
    const finalWidgets = await Widget.find({});
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total active template layouts: ${finalLayouts.length}`);
    console.log(`- Total widgets: ${finalWidgets.length}`);
    console.log(`\n🚀 You can now use the display selector to choose from these layouts!`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding layouts:', error);
    process.exit(1);
  }
}

// Run the script
seedLayouts();