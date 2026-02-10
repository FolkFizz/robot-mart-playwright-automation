const fs = require('fs');
const path = require('path');

const targets = ['allure-results', 'allure-report'];

for (const dir of targets) {
  const fullPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`[allure:clean] Skip (not found): ${dir}`);
    continue;
  }

  fs.rmSync(fullPath, { recursive: true, force: true });
  console.log(`[allure:clean] Removed: ${dir}`);
}
