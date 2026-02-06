const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// 1. Load .env file
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Warning: .env file not found or could not be loaded.');
} else {
  console.log('✅ Loaded environment variables from .env');
}

// 2. Parse arguments
// Usage: node scripts/run-k6.js <script-path> [extra-args]
// Example: node scripts/run-k6.js performance/scripts/smoke.k6.js
const args = process.argv.slice(2);
const scriptFile = args[0];

if (!scriptFile) {
  console.error('❌ Error: Please specify a k6 script to run.');
  process.exit(1);
}

// 3. Construct k6 command
// We pass current process.env which now includes .env variables
const k6 = spawn('k6', ['run', ...args], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env } // Pass all env vars including loaded ones
});

k6.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ k6 process exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('✅ Performance test completed successfully.');
  }
});
