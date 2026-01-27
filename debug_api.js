const https = require('https');

const options = {
  hostname: 'robot-store-sandbox.onrender.com',
  port: 443,
  path: '/api/products/reset-stock',
  method: 'POST',
  headers: {
    'X-RESET-KEY': 'resetstock2026'
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
