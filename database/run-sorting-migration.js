/**
 * PRODUCT SORTING MIGRATION RUNNER
 * Runs migration 002: Creates settings table for product sorting configuration
 * 
 * Usage: node database/run-sorting-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://chxflnoqbapoywpibeba.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoeGZsbm9xYmFwb3l3cGliZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODA4MTcsImV4cCI6MjA3NTc1NjgxN30.UCG58nLvxLthBNFp7WQd7N8F9uJ33oZ8uCv-YZP8hO4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runMigration(migrationFile) {
  try {
    console.log('\n🎯 Product Sorting Feature Migration');
    console.log('='.repeat(60));
    console.log(`\n📦 Migration: ${migrationFile}`);
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('✅ Migration file loaded successfully');
    console.log(`📊 SQL size: ${sql.length} characters`);
    console.log('\n' + '='.repeat(60));
    
    // Note: The standard Supabase client doesn't support raw SQL execution
    // You need to run this in the Supabase SQL Editor or use a PostgreSQL client
    console.log('\n⚠️  IMPORTANT: Direct SQL execution via Supabase JS client is not supported.\n');
    console.log('📝 Please follow these steps:\n');
    console.log('  1. Go to: https://supabase.com/dashboard');
    console.log('  2. Select your project: ayubo_cafe');
    console.log('  3. Navigate to: SQL Editor (left sidebar)');
    console.log('  4. Click: "New Query"');
    console.log(`  5. Copy and paste contents of: ${migrationFile}`);
    console.log('  6. Click: "Run" button (or press Ctrl+Enter)\n');
    
    console.log('📂 Migration file location:');
    console.log(`   ${migrationPath}\n`);
    
    console.log('✨ What this migration does:');
    console.log('   • Creates "settings" table for configuration storage');
    console.log('   • Adds auto-update trigger for timestamps');
    console.log('   • Inserts default sort window: N=-1 (all-time sales)');
    console.log('   • Enables dynamic product sorting feature\n');
    
    console.log('='.repeat(60));
    console.log('\n💡 Alternative: PostgreSQL Client');
    console.log('   If you have psql or pgAdmin, you can connect directly');
    console.log('   to your Supabase database and run the migration.\n');
    
    return { success: false, message: 'Manual execution required' };
    
  } catch (error) {
    console.error('\n❌ Error reading migration file:', error.message);
    console.error('   Make sure the migration file exists in database/migrations/\n');
    return { success: false, error: error.message };
  }
}

// Run the migration
const migrationFile = process.argv[2] || '002_product_sorting_migration.sql';

console.log('\n🚀 Ayubo Cafe - Product Sorting Migration Runner');
console.log('   Version: 002');
console.log('   Date: ' + new Date().toLocaleDateString());

runMigration(migrationFile).then((result) => {
  if (result.success) {
    console.log('\n✅ Migration completed successfully!\n');
    console.log('🎉 Product sorting feature is now ready to use!\n');
  } else {
    console.log('\n⏸️  Awaiting manual execution in Supabase SQL Editor');
    console.log('   Once executed, you can proceed with the feature implementation.\n');
  }
});

