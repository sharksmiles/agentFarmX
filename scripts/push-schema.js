const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
  // Skip comments and empty lines
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) return;
  
  const match = trimmedLine.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let value = match[2].trim();
    
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    envVars[key] = value;
  }
});

// Set environment variables
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

// Run prisma db push
try {
  console.log('Pushing schema to database...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Schema pushed successfully!');
} catch (error) {
  console.error('❌ Failed to push schema:', error.message);
  process.exit(1);
}
