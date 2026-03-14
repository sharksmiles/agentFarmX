const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

console.log('Reading .env.local...');
const content = fs.readFileSync(envPath, 'utf-8');

// Fix line breaks in connection strings
let fixed = content
  // Remove line breaks within connection strings
  .replace(/=postgres:\/\/([^\n]+)\n([^\n=]+)/g, '=postgres://$1$2')
  // Remove any trailing whitespace
  .split('\n')
  .map(line => line.trimEnd())
  .join('\n');

// Backup original file
const backupPath = envPath + '.backup';
fs.writeFileSync(backupPath, content);
console.log('✅ Backup created:', backupPath);

// Write fixed content
fs.writeFileSync(envPath, fixed);
console.log('✅ Fixed .env.local');

console.log('\n=== Checking fixed variables ===');
const lines = fixed.split('\n');
lines.forEach((line, index) => {
  if (line.includes('POSTGRES') && !line.startsWith('#')) {
    const hasLineBreak = line.includes('\n');
    console.log(`Line ${index + 1}: ${hasLineBreak ? '❌ Still has line break' : '✅ OK'}`);
    console.log(`  ${line.substring(0, 80)}...`);
  }
});

console.log('\n✅ Done! Now run: node scripts/push-schema.js');
