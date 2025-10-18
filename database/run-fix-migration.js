/**
 * FIX MIGRATION RUNNER
 * Runs the fix migration to correct data types and primary key
 * 
 * Usage: node database/run-fix-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase Configuration
const SUPABASE_URL = 'https://chxflnoqbapoywpibeba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoeGZsbm9xYmFwb3l3cGliZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NDcyNjQsImV4cCI6MjA2MTMyMzI2NH0.O2jHoFsw_oJvsMJD_FRqzYZJu-pqxlPePCBxFDKm6Ao';

// For migrations, you need the service role key (more privileged)
// Get this from: Supabase Dashboard > Settings > API > service_role key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 Starting Fix Migration...\n');

try {
  // Read the fix migration SQL file
  const migrationPath = join(__dirname, 'migrations', '001_inventory_migration_fix.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('📂 Loaded migration file: 001_inventory_migration_fix.sql');
  console.log('📝 Migration size:', migrationSQL.length, 'characters\n');

  // Execute the migration using Supabase RPC
  console.log('⚙️  Executing fix migration...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.error('❌ Fix Migration failed!');
    console.error('Error:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Make sure you have the service_role key set');
    console.error('2. Run the SQL manually in Supabase SQL Editor');
    console.error('3. Check that the products table exists');
    process.exit(1);
  }

  console.log('✅ Fix Migration completed successfully!\n');
  console.log('📊 Next steps:');
  console.log('1. Refresh your browser to clear any cached data');
  console.log('2. Try saving a bill again');
  console.log('3. Stock updates should now work with decimal values\n');

} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  console.error('\n💡 Alternative: Run the SQL manually');
  console.error('1. Open Supabase Dashboard > SQL Editor');
  console.error('2. Copy contents of database/migrations/001_inventory_migration_fix.sql');
  console.error('3. Paste and run in SQL Editor');
  process.exit(1);
}

