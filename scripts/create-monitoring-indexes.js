#!/usr/bin/env node

/**
 * Script to create database indexes for optimal monitoring performance
 * Run with: node scripts/create-monitoring-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Indexes for Display collection
    await db.collection('displays').createIndex({ layout: 1 });
    await db.collection('displays').createIndex({ last_update: -1 });
    await db.collection('displays').createIndex({ building: 1, location: 1 });
    console.log('✅ Created Display collection indexes');

    // Critical indexes for DisplayHeartbeat collection
    await db.collection('displayheartbeats').createIndex({ displayId: 1, timestamp: -1 });
    await db.collection('displayheartbeats').createIndex({ timestamp: -1 });
    await db.collection('displayheartbeats').createIndex({ 
      displayId: 1, 
      timestamp: -1 
    }, { 
      partialFilterExpression: { 
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      } 
    });
    console.log('✅ Created DisplayHeartbeat collection indexes');

    // Compound index for monitoring queries
    await db.collection('displayheartbeats').createIndex({
      displayId: 1,
      timestamp: -1,
      responseTime: 1
    });
    console.log('✅ Created compound monitoring index');

    console.log('🎉 All indexes created successfully!');
    
    // Show index information
    const displayIndexes = await db.collection('displays').indexes();
    const heartbeatIndexes = await db.collection('displayheartbeats').indexes();
    
    console.log('\n📊 Display Collection Indexes:');
    displayIndexes.forEach((idx, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(idx.key)} - ${idx.name}`);
    });
    
    console.log('\n📊 DisplayHeartbeat Collection Indexes:');
    heartbeatIndexes.forEach((idx, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(idx.key)} - ${idx.name}`);
    });

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

createIndexes();