const http = require('http');

const baseUrl = 'http://localhost:3000';

// Test endpoints
const tests = [
  { name: 'Auth - Nonce', path: '/api/auth/nonce', method: 'GET' },
  { name: 'Farm - State', path: '/api/farm/state?userId=test_user', method: 'GET' },
  { name: 'Energy - Status', path: '/api/energy?userId=test_user', method: 'GET' },
  { name: 'Inventory - List', path: '/api/inventory?userId=test_user', method: 'GET' },
  { name: 'Tasks - List', path: '/api/tasks?userId=test_user&type=all', method: 'GET' },
  { name: 'Leaderboard - Coins', path: '/api/leaderboard?type=coins&limit=10', method: 'GET' },
];

async function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = new URL(test.path, baseUrl);
    
    const req = http.request(url, { method: test.method }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode;
        const success = status >= 200 && status < 300;
        resolve({
          name: test.name,
          status,
          success,
          response: data.substring(0, 100)
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        name: test.name,
        status: 0,
        success: false,
        error: err.message
      });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n');
  
  const results = [];
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push(result);
    
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.response) {
      console.log(`   Response: ${result.response}...`);
    }
    console.log('');
  }
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('━'.repeat(50));
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  console.log('━'.repeat(50));
  
  if (passed === total) {
    console.log('\n🎉 All API endpoints are working!');
  } else {
    console.log('\n⚠️ Some endpoints need attention.');
  }
}

runTests().catch(console.error);
