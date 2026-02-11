/**
 * =============================================================================
 * STOCK SETUP HELPER - Increase Inventory Before Load Testing
 * =============================================================================
 *
 * Purpose:
 * - Ensures sufficient stock before load tests
 * - Prevents 400 errors due to inventory depletion
 * - Allows for realistic checkout testing
 *
 * Usage:
 * 1. Set environment variables:
 *    - DB_HOST (default: localhost)
 *    - DB_PORT (default: 5432)
 *    - DB_NAME (default: robot_store)
 *    - DB_USER (default: postgres)
 *    - DB_PASSWORD (default: postgres)
 *
 * 2. Run before load test:
 *    node performance/helpers/setup-stock.js
 *
 * 3. Run your load test:
 *    npm run test:perf:load-strict
 *
 * =============================================================================
 */

require('dotenv').config();
const { Client } = require('pg');

// Database configuration
// Supports both DATABASE_URL (Neon, Railway, etc.) and individual params
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'robot_store',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    };

// Stock configuration
// Default to 300 for higher-throughput perf scenarios.
const STOCK_AMOUNT = (() => {
  const raw = process.env.PERF_STOCK_ALL;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
})();

async function setupStock() {
  const client = new Client(dbConfig);

  try {
    console.log('========================================');
    console.log('📦 STOCK SETUP HELPER');
    console.log('========================================');

    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`Connecting to: ${url.host}${url.pathname} (SSL)`);
    } else {
      console.log(`Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    }

    await client.connect();
    console.log('✅ Database connected');

    // Update ALL products (not hardcoded IDs)
    console.log(`\n🔄 Updating stock for all products...`);

    const result = await client.query('UPDATE products SET stock = $1 RETURNING id, name, stock', [
      STOCK_AMOUNT
    ]);

    console.log(`\n✅ Updated ${result.rows.length} products:\n`);

    result.rows.forEach((product) => {
      console.log(`   ✓ Product #${product.id}: ${product.name} → ${product.stock} units`);
    });

    console.log('\n✅ Stock setup completed successfully!');
    console.log('========================================');
    console.log('💡 You can now run your load test:');
    console.log('   npm run test:perf:load');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ Error setting up stock:');
    console.error(error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Database connection refused. Make sure:');
      console.error('   1. PostgreSQL is running');
      console.error('   2. Database exists');
      console.error('   3. Connection details are correct');
    } else if (error.code === '42P01') {
      console.error('\n⚠️  Table not found. Make sure migrations are run.');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  setupStock();
}

module.exports = { setupStock };
