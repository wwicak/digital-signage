#!/usr/bin/env node

/**
 * Setup script for Meeting Room Reservation System
 * This script helps configure the meeting room system with sample data
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

// Import models
const Building = require('../lib/models/Building').default;
const Room = require('../lib/models/Room').default;
const User = require('../lib/models/User').default;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-signage';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function createSampleBuildings() {
  console.log('\n📍 Creating sample buildings...');
  
  const buildings = [
    {
      name: 'Main Office Building',
      address: '123 Business District, Downtown City'
    },
    {
      name: 'Innovation Center',
      address: '456 Tech Park, Silicon Valley'
    },
    {
      name: 'Conference Center',
      address: '789 Meeting Plaza, Business District'
    }
  ];

  const createdBuildings = [];
  
  for (const buildingData of buildings) {
    try {
      const existingBuilding = await Building.findOne({ name: buildingData.name });
      if (existingBuilding) {
        console.log(`⚠️  Building "${buildingData.name}" already exists`);
        createdBuildings.push(existingBuilding);
      } else {
        const building = new Building(buildingData);
        await building.save();
        console.log(`✅ Created building: ${buildingData.name}`);
        createdBuildings.push(building);
      }
    } catch (error) {
      console.error(`❌ Failed to create building "${buildingData.name}":`, error.message);
    }
  }
  
  return createdBuildings;
}

async function createSampleRooms(buildings) {
  console.log('\n🏢 Creating sample meeting rooms...');
  
  const roomsData = [
    // Main Office Building rooms
    {
      name: 'Executive Boardroom',
      building_id: buildings[0]._id,
      capacity: 20,
      facilities: ['Projector', 'Video Conference', 'Whiteboard', 'Audio System']
    },
    {
      name: 'Conference Room A',
      building_id: buildings[0]._id,
      capacity: 12,
      facilities: ['Projector', 'Whiteboard', 'Phone']
    },
    {
      name: 'Conference Room B',
      building_id: buildings[0]._id,
      capacity: 8,
      facilities: ['TV Display', 'Whiteboard']
    },
    {
      name: 'Small Meeting Room',
      building_id: buildings[0]._id,
      capacity: 4,
      facilities: ['TV Display']
    },
    
    // Innovation Center rooms
    {
      name: 'Innovation Lab',
      building_id: buildings[1]._id,
      capacity: 15,
      facilities: ['Interactive Whiteboard', 'Video Conference', 'Projector', 'Sound System']
    },
    {
      name: 'Brainstorm Room',
      building_id: buildings[1]._id,
      capacity: 6,
      facilities: ['Whiteboard', 'Flip Chart', 'Markers']
    },
    {
      name: 'Tech Demo Room',
      building_id: buildings[1]._id,
      capacity: 10,
      facilities: ['Large Display', 'Video Conference', 'Audio System']
    },
    
    // Conference Center rooms
    {
      name: 'Grand Hall',
      building_id: buildings[2]._id,
      capacity: 100,
      facilities: ['Stage', 'Microphones', 'Projector', 'Audio System', 'Lighting']
    },
    {
      name: 'Seminar Room 1',
      building_id: buildings[2]._id,
      capacity: 30,
      facilities: ['Projector', 'Audio System', 'Whiteboard']
    },
    {
      name: 'Seminar Room 2',
      building_id: buildings[2]._id,
      capacity: 25,
      facilities: ['TV Display', 'Audio System', 'Whiteboard']
    }
  ];

  const createdRooms = [];
  
  for (const roomData of roomsData) {
    try {
      const existingRoom = await Room.findOne({ 
        name: roomData.name, 
        building_id: roomData.building_id 
      });
      
      if (existingRoom) {
        console.log(`⚠️  Room "${roomData.name}" already exists in building`);
        createdRooms.push(existingRoom);
      } else {
        const room = new Room(roomData);
        await room.save();
        console.log(`✅ Created room: ${roomData.name} (${roomData.capacity} capacity)`);
        createdRooms.push(room);
      }
    } catch (error) {
      console.error(`❌ Failed to create room "${roomData.name}":`, error.message);
    }
  }
  
  return createdRooms;
}

async function setupAdminPermissions() {
  console.log('\n👤 Setting up admin permissions for meeting rooms...');
  
  try {
    // Find admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found. Please create an admin user first.');
      console.log('   Run: npm run seed:admin');
      return;
    }
    
    // Add meeting room permissions to admin users
    const meetingRoomPermissions = [
      'building:read',
      'building:create',
      'building:update',
      'building:delete',
      'room:read',
      'room:create',
      'room:update',
      'room:delete',
      'reservation:read',
      'reservation:create',
      'reservation:update',
      'reservation:delete',
      'calendar:read',
      'calendar:create',
      'calendar:update',
      'calendar:delete',
      'dashboard:read'
    ];
    
    for (const admin of adminUsers) {
      let updated = false;
      
      for (const permission of meetingRoomPermissions) {
        if (!admin.permissions.includes(permission)) {
          admin.permissions.push(permission);
          updated = true;
        }
      }
      
      if (updated) {
        await admin.save();
        console.log(`✅ Updated permissions for admin: ${admin.username}`);
      } else {
        console.log(`✅ Admin ${admin.username} already has meeting room permissions`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to setup admin permissions:', error.message);
  }
}

async function displaySummary(buildings, rooms) {
  console.log('\n📊 Setup Summary:');
  console.log('================');
  console.log(`Buildings created: ${buildings.length}`);
  console.log(`Rooms created: ${rooms.length}`);
  
  console.log('\n🏢 Buildings:');
  buildings.forEach(building => {
    const buildingRooms = rooms.filter(room => 
      room.building_id.toString() === building._id.toString()
    );
    console.log(`  • ${building.name} (${buildingRooms.length} rooms)`);
  });
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit the admin panel and navigate to:');
  console.log('   • Dashboard - View system overview');
  console.log('   • Buildings - Manage buildings');
  console.log('   • Meeting Rooms - Manage rooms');
  console.log('   • Reservations - Create and manage bookings');
  console.log('   • Calendar Sync - Connect Google/Outlook calendars');
  console.log('3. Add the Meeting Room Display widget to your digital signage displays');
  
  console.log('\n🔧 Calendar Integration Setup:');
  console.log('To enable calendar integration, you need to:');
  console.log('1. Set up Google OAuth 2.0 credentials');
  console.log('2. Set up Microsoft Graph API credentials');
  console.log('3. Add the credentials to your .env file');
  console.log('4. Restart the server');
  
  console.log('\n✨ Your meeting room reservation system is ready!');
}

async function main() {
  console.log('🚀 Meeting Room Reservation System Setup');
  console.log('========================================');
  
  try {
    await connectToDatabase();
    
    const answer = await question('\nDo you want to create sample buildings and rooms? (y/N): ');
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const buildings = await createSampleBuildings();
      const rooms = await createSampleRooms(buildings);
      await setupAdminPermissions();
      await displaySummary(buildings, rooms);
    } else {
      console.log('Setup cancelled. You can run this script again anytime.');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('\n👋 Goodbye!');
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Setup interrupted');
  rl.close();
  await mongoose.disconnect();
  process.exit(0);
});

if (require.main === module) {
  main();
}
