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

async function runAuthMigration(migrationFile = '004_user_authentication_migration.sql') {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 AYUBO CAFE - USER AUTHENTICATION MIGRATION');
    console.log('='.repeat(70));
    console.log(`\n📁 Migration file: ${migrationFile}`);
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('✅ Migration file loaded successfully');
    console.log(`📊 SQL size: ${(sql.length / 1024).toFixed(2)} KB (${sql.length} characters)`);
    
    // Count key components in the migration
    const tableCount = (sql.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
    const indexCount = (sql.match(/CREATE INDEX IF NOT EXISTS/g) || []).length;
    const enumCount = (sql.match(/CREATE TYPE .* AS ENUM/g) || []).length;
    
    console.log('\n📋 Migration Contents:');
    console.log(`   • ${tableCount} tables (users, user_sessions, password_reset_tokens, audit_logs)`);
    console.log(`   • ${indexCount} indexes for optimal performance`);
    console.log(`   • ${enumCount} custom enum types (user_role, audit_action, audit_status)`);
    console.log('   • Foreign key constraints with CASCADE delete');
    console.log('   • Auto-update trigger for users table');
    console.log('   • Initial owner account with bcrypt password');
    
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  IMPORTANT: MANUAL EXECUTION REQUIRED');
    console.log('='.repeat(70));
    console.log('\nThe Supabase JS client does not support raw SQL execution.');
    console.log('Please follow these steps to run the migration:\n');
    
    console.log('STEP 1: Access Supabase Dashboard');
    console.log('   → Go to: https://supabase.com/dashboard');
    console.log('   → Select your project: Ayubo Cafe');
    
    console.log('\nSTEP 2: Open SQL Editor');
    console.log('   → Click "SQL Editor" in the left sidebar');
    console.log('   → Click "New Query" button');
    
    console.log('\nSTEP 3: Copy Migration SQL');
    console.log(`   → Open file: ${migrationPath}`);
    console.log('   → Copy entire contents (Ctrl+A, Ctrl+C)');
    
    console.log('\nSTEP 4: Execute Migration');
    console.log('   → Paste SQL into the editor');
    console.log('   → Click "Run" button (or press Ctrl+Enter)');
    console.log('   → Wait for "Success. No rows returned" message');
    
    console.log('\nSTEP 5: Verify Migration');
    console.log('   → Check the console output for green checkmarks');
    console.log('   → Verify initial owner account was created');
    console.log('   → Test login: username=owner, password=Sokian@1997');
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 POST-MIGRATION VERIFICATION QUERIES');
    console.log('='.repeat(70));
    console.log('\nRun these in SQL Editor to verify successful migration:\n');
    
    console.log('-- Check all tables were created');
    console.log("SELECT table_name FROM information_schema.tables");
    console.log("WHERE table_name IN ('users', 'user_sessions', 'password_reset_tokens', 'audit_logs');");
    
    console.log('\n-- Verify owner account');
    console.log("SELECT user_id, username, email, first_name, last_name, role, is_active");
    console.log("FROM users WHERE username = 'owner';");
    
    console.log('\n-- Test password verification');
    console.log("SELECT username, ");
    console.log("  (password_hash = crypt('Sokian@1997', password_hash)) AS password_valid");
    console.log("FROM users WHERE username = 'owner';");
    
    console.log('\n' + '='.repeat(70));
    console.log('📚 ALTERNATIVE: PostgreSQL Client');
    console.log('='.repeat(70));
    console.log('\nIf you have direct PostgreSQL access (psql, pgAdmin, DBeaver):');
    console.log('1. Get connection string from Supabase Dashboard → Settings → Database');
    console.log('2. Connect using your preferred client');
    console.log(`3. Execute: \\i ${migrationPath}`);
    console.log('   (or copy-paste the SQL content)');
    
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  SECURITY REMINDERS');
    console.log('='.repeat(70));
    console.log('• Initial owner password: Sokian@1997 (change after first login)');
    console.log('• All passwords stored as bcrypt hashes (never plain text)');
    console.log('• Session tokens are cryptographically random');
    console.log('• Row Level Security (RLS) should be configured after migration');
    console.log('\n' + '='.repeat(70));
    console.log('📄 Migration file ready at:', migrationPath);
    console.log('='.repeat(70) + '\n');
    
    return { 
      success: false, 
      message: 'Manual execution required - see instructions above',
      migrationPath 
    };
    
  } catch (error) {
    console.error('\n❌ Error reading migration file:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const migrationFile = args[0] || '004_user_authentication_migration.sql';

// Display help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('\n📖 Authentication Migration Runner - Help\n');
  console.log('Usage:');
  console.log('  node run-auth-migration.js [migration-file]\n');
  console.log('Examples:');
  console.log('  node run-auth-migration.js');
  console.log('  node run-auth-migration.js 004_user_authentication_migration.sql\n');
  console.log('Description:');
  console.log('  Prepares and displays instructions for running the authentication');
  console.log('  migration that creates the complete user management system.\n');
  process.exit(0);
}

// Run the migration
console.log('\n🚀 Starting authentication migration process...\n');

runAuthMigration(migrationFile).then((result) => {
  if (result.success) {
    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } else {
    console.log('⏸️  Awaiting manual execution in Supabase Dashboard\n');
    process.exit(0);
  }
}).catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

