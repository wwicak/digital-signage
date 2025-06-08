/**
 * Simple JavaScript script to initialize feature flags via API
 * This script makes an HTTP request to the initialization endpoint
 */

const https = require('https');
const http = require('http');

async function initFeatureFlags() {
  console.log('🚀 Initializing feature flags...');
  
  // You'll need to update these values based on your setup
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiPath = '/api/feature-flags/initialize';
  
  console.log(`📡 Making request to: ${baseUrl}${apiPath}`);
  console.log('⚠️  Note: You must be logged in as a super admin for this to work.');
  console.log('💡 Alternative: Use the API endpoint directly from your browser after logging in.');
  
  // Parse the URL
  const url = new URL(baseUrl + apiPath);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: In a real scenario, you'd need to include authentication headers
      // For now, this script serves as documentation
    }
  };

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ Feature flags initialized successfully!');
            console.log('📋 Response:', response);
            resolve(response);
          } else {
            console.error('❌ Failed to initialize feature flags');
            console.error('📋 Status:', res.statusCode);
            console.error('📋 Response:', response);
            reject(new Error(`HTTP ${res.statusCode}: ${response.message || 'Unknown error'}`));
          }
        } catch (error) {
          console.error('❌ Failed to parse response:', error);
          console.error('📋 Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
      reject(error);
    });

    req.end();
  });
}

// Instructions for manual initialization
function printInstructions() {
  console.log('\n📖 Manual Initialization Instructions:');
  console.log('=====================================');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Log in as a super admin user');
  console.log('3. Open your browser and navigate to: http://localhost:3000/api/feature-flags/initialize');
  console.log('4. Make a POST request (you can use browser dev tools or a tool like Postman)');
  console.log('5. Or visit the feature flags admin page at: http://localhost:3000/feature-flags');
  console.log('\n🔧 Alternative: Use curl after logging in:');
  console.log('curl -X POST http://localhost:3000/api/feature-flags/initialize \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Cookie: your-session-cookie"');
  console.log('\n💡 The feature flags will be created with these defaults:');
  console.log('📋 Menu Items: Dashboard, Screens, Layout, Preview, Slideshows, Buildings, Rooms, etc.');
  console.log('🧩 Widgets: Meeting Room, Announcement, Image, List, Slideshow, Weather, Web, YouTube, Media Player');
  console.log('⭐ Features: Meeting Rooms, Calendar Sync, User Management');
  console.log('🎯 All flags are enabled by default for appropriate user roles');
}

// Run the script
if (require.main === module) {
  console.log('🎯 Feature Flag Initialization Script');
  console.log('=====================================\n');
  
  printInstructions();
  
  console.log('\n🔄 Attempting automatic initialization...');
  initFeatureFlags()
    .then(() => {
      console.log('\n🎉 Initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.log('\n⚠️  Automatic initialization failed (this is expected if not logged in)');
      console.log('📖 Please follow the manual instructions above.');
      process.exit(1);
    });
}

module.exports = { initFeatureFlags };
