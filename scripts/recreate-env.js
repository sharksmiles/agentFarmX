const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const backupPath = envPath + '.backup';

console.log('Checking backup file...');
if (!fs.existsSync(backupPath)) {
  console.error('❌ Backup file not found!');
  process.exit(1);
}

// Read backup
const backup = fs.readFileSync(backupPath, 'utf-8');

// The connection string from the test output
const baseUrl = 'postgres://0390b9d4b69e68174cbea2657103ebc996cdeb3a7e67be3be6cdbb391dd917bc:sk_xCoFLavVohsdBTkKmER90@db.prisma.io:5432/postgres?sslmode=require';

// Create properly formatted .env.local
const newContent = `# Database Configuration
POSTGRES_URL="${baseUrl}"
POSTGRES_PRISMA_URL="${baseUrl}&pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="${baseUrl}"

# OpenAI API Key
OPENAI_API_KEY="sk-your-openai-api-key"

# Cron Secret
CRON_SECRET="your-cron-secret-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3001"

# API URL (leave empty for relative paths)
NEXT_PUBLIC_API_URL=""
`;

// Write new content
fs.writeFileSync(envPath, newContent);
console.log('✅ Created new .env.local with proper formatting');

console.log('\n=== Environment Variables ===');
console.log('POSTGRES_URL: ✅');
console.log('POSTGRES_PRISMA_URL: ✅');
console.log('POSTGRES_URL_NON_POOLING: ✅');

console.log('\n✅ Done! Now run: node scripts/push-schema.js');
