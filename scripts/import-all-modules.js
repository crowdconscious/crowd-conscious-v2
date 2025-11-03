// Simple Node.js script to import all platform modules
// Run with: node scripts/import-all-modules.js

const fs = require('fs');
const https = require('https');

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Read the modules data
const modulesData = JSON.parse(fs.readFileSync('./scripts/all-platform-modules.json', 'utf8'));

async function importModule(module, index) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(module);
    
    const options = {
      hostname: API_URL.replace('https://', '').replace('http://', ''),
      port: API_URL.startsWith('https') ? 443 : 80,
      path: '/api/admin/modules/import',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = (API_URL.startsWith('https') ? https : require('http')).request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(responseData);
          console.log(`✅ Module ${index + 1}: ${module.title}`);
          console.log(`   ID: ${result.module.id}`);
          console.log(`   Slug: ${result.module.slug}`);
          console.log(`   Lessons: ${result.module.lessonCount}\n`);
          resolve(result);
        } else {
          console.error(`❌ Module ${index + 1} failed:`, responseData);
          reject(new Error(responseData));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error importing module ${index + 1}:`, error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function importAllModules() {
  console.log('🚀 Starting module import...\n');
  console.log(`📚 Importing ${modulesData.modules.length} modules to ${API_URL}\n`);

  for (let i = 0; i < modulesData.modules.length; i++) {
    try {
      await importModule(modulesData.modules[i], i);
      // Wait 1 second between imports
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to import module ${i + 1}, continuing...`);
    }
  }

  console.log('\n✨ Import complete!');
  console.log(`\nNext steps:`);
  console.log(`1. Go to ${API_URL}/marketplace`);
  console.log(`2. Verify all modules appear`);
  console.log(`3. Check that they're marked as "DESTACADO"`);
}

importAllModules().catch(console.error);

