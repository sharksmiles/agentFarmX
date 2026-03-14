const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
console.log('Reading from:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('\n=== File Content (first 500 chars) ===');
  console.log(envContent.substring(0, 500));
  
  // Parse environment variables
  const envVars = {};
  envContent.split('\n').forEach((line, index) => {
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
      
      // Only show database-related vars
      if (key.includes('POSTGRES')) {
        console.log(`\nLine ${index + 1}: ${key}`);
        console.log(`  Raw value: ${match[2]}`);
        console.log(`  Parsed value: ${value.substring(0, 50)}...`);
      }
    }
  });
  
  console.log('\n=== Parsed POSTGRES Variables ===');
  Object.keys(envVars).forEach(key => {
    if (key.includes('POSTGRES')) {
      console.log(`${key}: ${envVars[key].substring(0, 80)}...`);
    }
  });
}
