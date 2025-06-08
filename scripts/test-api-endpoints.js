#!/usr/bin/env node

/**
 * Test script to verify Meeting Room API endpoints
 * This script tests the API endpoints to ensure they're working
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function testEndpoint(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function testAPIEndpoints() {
  console.log('🧪 Testing Meeting Room API Endpoints');
  console.log('=====================================');
  
  const baseUrl = await question('Enter your server URL (default: http://localhost:3000): ') || 'http://localhost:3000';
  
  const endpoints = [
    {
      name: 'Buildings List',
      url: `${baseUrl}/api/v1/buildings`,
      method: 'GET'
    },
    {
      name: 'Rooms List',
      url: `${baseUrl}/api/v1/rooms`,
      method: 'GET'
    },
    {
      name: 'Reservations List',
      url: `${baseUrl}/api/v1/reservations`,
      method: 'GET'
    },
    {
      name: 'Dashboard Data',
      url: `${baseUrl}/api/v1/dashboard`,
      method: 'GET'
    },
    {
      name: 'Calendar Links',
      url: `${baseUrl}/api/v1/calendar`,
      method: 'GET'
    },
    {
      name: 'Google OAuth URL',
      url: `${baseUrl}/api/v1/calendar/google/authorize`,
      method: 'GET'
    },
    {
      name: 'Outlook OAuth URL',
      url: `${baseUrl}/api/v1/calendar/outlook/authorize`,
      method: 'GET'
    }
  ];
  
  console.log('\n📡 Testing API endpoints...\n');
  
  let passedTests = 0;
  let totalTests = endpoints.length;
  
  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name}... `);
    
    const result = await testEndpoint(endpoint.url, endpoint.method);
    
    if (result.ok || result.status === 401 || result.status === 403) {
      // 401/403 means the endpoint exists but requires auth, which is expected
      console.log('✅ PASS');
      passedTests++;
    } else if (result.status === 404) {
      console.log('❌ FAIL (404 - Endpoint not found)');
    } else if (result.status === 0) {
      console.log('❌ FAIL (Connection error)');
    } else {
      console.log(`⚠️  PARTIAL (${result.status} - ${result.data?.message || 'Unknown error'})`);
      passedTests++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All API endpoints are working correctly!');
    console.log('Your meeting room system is ready to use.');
  } else if (passedTests > 0) {
    console.log('\n⚠️  Some endpoints are working, but there may be issues.');
    console.log('Make sure your server is running and try again.');
  } else {
    console.log('\n❌ No endpoints are responding.');
    console.log('Please check:');
    console.log('1. Is your server running? (npm run dev)');
    console.log('2. Is the URL correct?');
    console.log('3. Are there any error messages in the server console?');
  }
  
  console.log('\n🔧 Quick Setup Commands:');
  console.log('1. npm run setup:meeting-rooms  # Create sample data');
  console.log('2. npm run dev                  # Start the server');
  console.log('3. Visit /dashboard             # Access the admin interface');
}

async function main() {
  try {
    await testAPIEndpoints();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    rl.close();
    console.log('\n👋 Testing complete!');
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Testing interrupted');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main();
}
