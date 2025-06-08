#!/usr/bin/env node

/**
 * Simple Setup script for Meeting Room Reservation System
 * This script creates sample data using direct MongoDB operations
 */

const { MongoClient } = require('mongodb');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-signage';
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function createSampleBuildings(db) {
  console.log('\n📍 Creating sample buildings...');
  
  const buildings = [
    {
      name: 'Main Office Building',
      address: '123 Business District, Downtown City',
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Innovation Center',
      address: '456 Tech Park, Silicon Valley',
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Conference Center',
      address: '789 Meeting Plaza, Business District',
      creation_date: new Date(),
      last_update: new Date()
    }
  ];

  const buildingsCollection = db.collection('buildings');
  const createdBuildings = [];
  
  for (const buildingData of buildings) {
    try {
      const existingBuilding = await buildingsCollection.findOne({ name: buildingData.name });
      if (existingBuilding) {
        console.log(`⚠️  Building "${buildingData.name}" already exists`);
        createdBuildings.push(existingBuilding);
      } else {
        const result = await buildingsCollection.insertOne(buildingData);
        const building = { ...buildingData, _id: result.insertedId };
        console.log(`✅ Created building: ${buildingData.name}`);
        createdBuildings.push(building);
      }
    } catch (error) {
      console.error(`❌ Failed to create building "${buildingData.name}":`, error.message);
    }
  }
  
  return createdBuildings;
}

async function createSampleRooms(db, buildings) {
  console.log('\n🏢 Creating sample meeting rooms...');
  
  const roomsData = [
    // Main Office Building rooms
    {
      name: 'Executive Boardroom',
      building_id: buildings[0]._id,
      capacity: 20,
      facilities: ['Projector', 'Video Conference', 'Whiteboard', 'Audio System'],
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Conference Room A',
      building_id: buildings[0]._id,
      capacity: 12,
      facilities: ['Projector', 'Whiteboard', 'Phone'],
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Conference Room B',
      building_id: buildings[0]._id,
      capacity: 8,
      facilities: ['TV Display', 'Whiteboard'],
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Small Meeting Room',
      building_id: buildings[0]._id,
      capacity: 4,
      facilities: ['TV Display'],
      creation_date: new Date(),
      last_update: new Date()
    },
    
    // Innovation Center rooms
    {
      name: 'Innovation Lab',
      building_id: buildings[1]._id,
      capacity: 15,
      facilities: ['Interactive Whiteboard', 'Video Conference', 'Projector', 'Sound System'],
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Brainstorm Room',
      building_id: buildings[1]._id,
      capacity: 6,
      facilities: ['Whiteboard', 'Flip Chart', 'Markers'],
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Tech Demo Room',
      building_id: buildings[1]._id,
      capacity: 10,
      facilities: ['Large Display', 'Video Conference', 'Audio System'],
      creation_date: new Date(),
      last_update: new Date()
    },
    
    // Conference Center rooms
    {
      name: 'Grand Hall',
      building_id: buildings[2]._id,
      capacity: 100,
      facilities: ['Stage', 'Microphones', 'Projector', 'Audio System', 'Lighting'],
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Seminar Room 1',
      building_id: buildings[2]._id,
      capacity: 30,
      facilities: ['Projector', 'Audio System', 'Whiteboard'],
      creation_date: new Date(),
      last_update: new Date()
    },
    {
      name: 'Seminar Room 2',
      building_id: buildings[2]._id,
      capacity: 25,
      facilities: ['TV Display', 'Audio System', 'Whiteboard'],
      creation_date: new Date(),
      last_update: new Date()
    }
  ];

  const roomsCollection = db.collection('rooms');
  const createdRooms = [];
  
  for (const roomData of roomsData) {
    try {
      const existingRoom = await roomsCollection.findOne({ 
        name: roomData.name, 
        building_id: roomData.building_id 
      });
      
      if (existingRoom) {
        console.log(`⚠️  Room "${roomData.name}" already exists in building`);
        createdRooms.push(existingRoom);
      } else {
        const result = await roomsCollection.insertOne(roomData);
        const room = { ...roomData, _id: result.insertedId };
        console.log(`✅ Created room: ${roomData.name} (${roomData.capacity} capacity)`);
        createdRooms.push(room);
      }
    } catch (error) {
      console.error(`❌ Failed to create room "${roomData.name}":`, error.message);
    }
  }
  
  return createdRooms;
}

async function setupAdminPermissions(db) {
  console.log('\n👤 Setting up admin permissions for meeting rooms...');
  
  try {
    const usersCollection = db.collection('users');
    
    // Find admin users
    let adminUsers = await usersCollection.find({ role: 'admin' }).toArray();
    
    if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found. Creating a default admin user...');
      
      // Create a default admin user
      const defaultAdmin = {
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        permissions: [],
        creation_date: new Date(),
        last_update: new Date()
      };
      
      const result = await usersCollection.insertOne(defaultAdmin);
      adminUsers = [{ ...defaultAdmin, _id: result.insertedId }];
      console.log('✅ Created default admin user (username: admin, email: admin@example.com)');
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
      const currentPermissions = admin.permissions || [];
      const newPermissions = [...new Set([...currentPermissions, ...meetingRoomPermissions])];
      
      if (newPermissions.length > currentPermissions.length) {
        await usersCollection.updateOne(
          { _id: admin._id },
          { 
            $set: { 
              permissions: newPermissions,
              last_update: new Date()
            }
          }
        );
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
  
  console.log('\n✨ Your meeting room reservation system is ready!');
}

async function main() {
  console.log('🚀 Meeting Room Reservation System Setup');
  console.log('========================================');
  
  let client;
  
  try {
    client = await connectToDatabase();
    const db = client.db();
    
    const answer = await question('\nDo you want to create sample buildings and rooms? (y/N): ');
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const buildings = await createSampleBuildings(db);
      const rooms = await createSampleRooms(db, buildings);
      await setupAdminPermissions(db);
      await displaySummary(buildings, rooms);
    } else {
      console.log('Setup cancelled. You can run this script again anytime.');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
    if (client) {
      await client.close();
    }
    console.log('\n👋 Goodbye!');
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Setup interrupted');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main();
}
