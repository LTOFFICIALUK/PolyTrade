/**
 * Script to run database migrations on Railway TimescaleDB
 * 
 * Usage: 
 *   DATABASE_URL="postgresql://..." node scripts/run-railway-migration.js
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is required')
  console.error('Usage: DATABASE_URL="postgresql://..." node scripts/run-railway-migration.js')
  process.exit(1)
}

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway.internal') ? false : { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 Connecting to Railway TimescaleDB...')
    
    // Test connection
    const client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_price_history.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📝 Running migration: 001_create_price_history.sql')
    console.log('This will:')
    console.log('  - Enable TimescaleDB extension')
    console.log('  - Create price_history table')
    console.log('  - Convert to hypertable')
    console.log('  - Create indexes')
    console.log('')
    
    // Run migration
    await client.query(migrationSQL)
    
    console.log('✅ Migration completed successfully!')
    
    // Verify
    console.log('\n🔍 Verifying migration...')
    const result = await client.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE tablename = 'price_history'
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ price_history table exists!')
    } else {
      console.log('⚠️  Warning: price_history table not found')
    }
    
    // Check if hypertable
    const hypertableResult = await client.query(`
      SELECT * FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'price_history'
    `)
    
    if (hypertableResult.rows.length > 0) {
      console.log('✅ price_history is configured as a hypertable!')
    } else {
      console.log('⚠️  Warning: price_history is not a hypertable')
    }
    
    client.release()
    await pool.end()
    
    console.log('\n🎉 All done! Your TimescaleDB is ready to store price history.')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

runMigration()
