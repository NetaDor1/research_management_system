const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, '..', 'server');
const envPath = path.join(serverDir, '.env');
const examplePath = path.join(serverDir, '.env.example');

if (fs.existsSync(envPath)) {
  console.log(`[setup:server] Already exists: ${envPath}`);
  console.log('Edit GEMINI_API_KEY there, then run: npm run start:server');
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.error('[setup:server] Missing server/.env.example');
  process.exit(1);
}

fs.copyFileSync(examplePath, envPath);
console.log(`[setup:server] Created ${envPath}`);
console.log('');
console.log('Next steps:');
console.log('  1. Open https://aistudio.google.com/apikey — create a Gemini API key');
console.log('  2. Edit server/.env — set GEMINI_API_KEY=<your_key> (no space after =, no quotes)');
console.log('  3. Run: npm run dev');
