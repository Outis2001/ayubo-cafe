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

async function runCustomerMigration(migrationFile = '006_customer_ordering_schema.sql') {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🎂 AYUBO CAFE - CUSTOMER ORDERING SYSTEM MIGRATION');
    console.log('='.repeat(80));
    console.log(`\n📁 Migration file: ${migrationFile}`);
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('✅ Migration file loaded successfully');
    console.log(`📊 SQL size: ${(sql.length / 1024).toFixed(2)} KB (${sql.length} characters)`);
    console.log(`📏 Total lines: ${sql.split('\n').length}`);
    
    // Count key components in the migration
    const tableCount = (sql.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
    const indexCount = (sql.match(/CREATE INDEX/g) || []).length;
    const functionCount = (sql.match(/CREATE OR REPLACE FUNCTION/g) || []).length;
    const triggerCount = (sql.match(/CREATE TRIGGER/g) || []).length;
    const policyCount = (sql.match(/CREATE POLICY/g) || []).length;
    const categoryCount = (sql.match(/Birthday Cakes|Wedding Cakes|Custom Cakes/g) || []).length / 3; // Approx
    const configCount = (sql.match(/otp_expiration_minutes|deposit_percentage|pickup_time_slots/g) || []).length;
    
    console.log('\n📋 Migration Contents:');
    console.log(`   • ${tableCount} tables (customers, orders, products, payments, etc.)`);
    console.log(`   • ${indexCount} indexes (standard, composite, and partial)`);
    console.log(`   • ${functionCount} stored functions (business logic & automation)`);
    console.log(`   • ${triggerCount} triggers (auto-timestamps, order numbers, audit)`);
    console.log(`   • ${policyCount} Row Level Security (RLS) policies`);
    console.log(`   • 8 product categories (Birthday, Wedding, Custom, etc.)`);
    console.log(`   • 17 system configuration entries`);
    
    console.log('\n🎯 Key Features:');
    console.log('   ✅ Complete customer signup & OTP verification system');
    console.log('   ✅ Product catalog with multiple pricing options');
    console.log('   ✅ Pre-made cake ordering with 40% deposit');
    console.log('   ✅ Custom cake request & quote workflow');
    console.log('   ✅ Payment integration (Stripe + Bank Transfer)');
    console.log('   ✅ Order tracking & status history');
    console.log('   ✅ Staff notifications & custom order management');
    console.log('   ✅ Order holds & pickup time management');
    console.log('   ✅ Concurrency-safe order number generation');
    console.log('   ✅ Smart audit trail with change detection');
    
    console.log('\n🔒 Security Features:');
    console.log('   ✅ Row Level Security (RLS) - customers see only their data');
    console.log('   ✅ Staff access controls (owner/cashier roles)');
    console.log('   ✅ Phone number validation (Sri Lankan +94 format)');
    console.log('   ✅ OTP attempt limiting (max 5 attempts)');
    console.log('   ✅ Payment calculation integrity constraints');
    console.log('   ✅ Status enum validation (prevents invalid states)');
    
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  IMPORTANT: MANUAL EXECUTION REQUIRED');
    console.log('='.repeat(80));
    console.log('\nThe Supabase JS client does not support complex SQL migrations.');
    console.log('Please follow these steps to run the migration:\n');
    
    console.log('STEP 1: Prerequisites Check');
    console.log('   ✓ Ensure migration 004 (user authentication) is already applied');
    console.log('   ✓ Verify you have admin/owner access to Supabase');
    console.log('   ✓ Create a backup of your database (recommended)');
    
    console.log('\nSTEP 2: Access Supabase Dashboard');
    console.log('   → Go to: https://supabase.com/dashboard');
    console.log('   → Select your project: Ayubo Cafe');
    
    console.log('\nSTEP 3: Open SQL Editor');
    console.log('   → Click "SQL Editor" in the left sidebar');
    console.log('   → Click "New Query" button');
    
    console.log('\nSTEP 4: Copy Migration SQL');
    console.log(`   → Open file: ${migrationPath}`);
    console.log('   → Copy entire contents (Ctrl+A, Ctrl+C)');
    console.log('   ⚠️  This is a large file (1,600+ lines) - may take a moment');
    
    console.log('\nSTEP 5: Execute Migration');
    console.log('   → Paste SQL into the editor');
    console.log('   → Review the SQL (optional but recommended)');
    console.log('   → Click "Run" button (or press Ctrl+Enter)');
    console.log('   → Wait for completion (may take 10-30 seconds)');
    console.log('   ⏳ Expected: "Success. No rows returned" message');
    
    console.log('\nSTEP 6: Verify Migration');
    console.log('   → Check console for green checkmarks');
    console.log('   → Run verification queries (see below)');
    console.log('   → Verify default categories were created');
    console.log('   → Test RLS policies are active');
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 POST-MIGRATION VERIFICATION QUERIES');
    console.log('='.repeat(80));
    console.log('\nRun these in SQL Editor to verify successful migration:\n');
    
    console.log('-- 1. Check all 15 tables were created');
    console.log("SELECT table_name FROM information_schema.tables");
    console.log("WHERE table_schema = 'public'");
    console.log("AND table_name LIKE 'customer%' OR table_name LIKE 'product%'");
    console.log("OR table_name IN ('order_holds', 'system_configuration', 'order_status_history')");
    console.log("ORDER BY table_name;");
    
    console.log('\n-- 2. Verify all 12 functions were created');
    console.log("SELECT routine_name, routine_type FROM information_schema.routines");
    console.log("WHERE routine_schema = 'public'");
    console.log("AND routine_name IN (");
    console.log("  'update_updated_at_column', 'generate_order_number',");
    console.log("  'log_order_status_change', 'current_customer_id',");
    console.log("  'is_staff_user', 'is_owner_user',");
    console.log("  'calculate_order_totals', 'validate_pickup_date',");
    console.log("  'create_customer_order', 'update_order_status',");
    console.log("  'verify_payment', 'send_quote'");
    console.log(")");
    console.log("ORDER BY routine_name;");
    
    console.log('\n-- 3. Verify product categories');
    console.log("SELECT name, description, display_order, is_active");
    console.log("FROM product_categories");
    console.log("ORDER BY display_order;");
    console.log("-- Expected: 8 categories (Birthday, Wedding, Custom, etc.)");
    
    console.log('\n-- 4. Verify system configuration');
    console.log("SELECT config_key, config_value, data_type, is_public");
    console.log("FROM system_configuration");
    console.log("ORDER BY config_key;");
    console.log("-- Expected: 17 configuration entries");
    
    console.log('\n-- 5. Check RLS policies');
    console.log("SELECT schemaname, tablename, policyname");
    console.log("FROM pg_policies");
    console.log("WHERE tablename LIKE 'customer%' OR tablename IN ('order_holds', 'system_configuration')");
    console.log("ORDER BY tablename, policyname;");
    console.log("-- Expected: 32 policies");
    
    console.log('\n-- 6. Test order number generation (optional)');
    console.log("-- This will create a test order and verify order number format");
    console.log("-- Only run if you want to test the trigger:");
    console.log("/*");
    console.log("INSERT INTO customer_orders (");
    console.log("  customer_id, order_type, pickup_date, pickup_time,");
    console.log("  subtotal, deposit_amount, total_amount, remaining_balance, order_number");
    console.log(") VALUES (");
    console.log("  gen_random_uuid(), 'pre-made', CURRENT_DATE + 3,");
    console.log("  '14:00', 5000, 2000, 5000, 3000, ''");
    console.log(");");
    console.log("-- Check the generated order_number:");
    console.log("SELECT order_number FROM customer_orders ORDER BY created_at DESC LIMIT 1;");
    console.log("-- Expected format: ORD-YYYYMMDD-001");
    console.log("-- Cleanup: DELETE FROM customer_orders WHERE order_type = 'pre-made';");
    console.log("*/");
    
    console.log('\n' + '='.repeat(80));
    console.log('📚 ALTERNATIVE: PostgreSQL Client');
    console.log('='.repeat(80));
    console.log('\nIf you have direct PostgreSQL access (psql, pgAdmin, DBeaver):');
    console.log('1. Get connection string from Supabase Dashboard → Settings → Database');
    console.log('2. Connect using your preferred client');
    console.log(`3. Execute: \\i ${migrationPath}`);
    console.log('   (or copy-paste the SQL content)');
    console.log('4. Verify with the queries above');
    
    console.log('\n' + '='.repeat(80));
    console.log('📖 ROLLBACK PROCEDURES');
    console.log('='.repeat(80));
    console.log('\nIf you need to undo this migration, run these in order:');
    console.log('See ROLLBACK INSTRUCTIONS at the top of the migration file.');
    console.log('\nQuick rollback (use with caution):');
    console.log("-- Drop all tables (CASCADE removes dependent objects)");
    console.log("DROP TABLE IF EXISTS order_status_history CASCADE;");
    console.log("DROP TABLE IF EXISTS customer_notifications CASCADE;");
    console.log("DROP TABLE IF EXISTS customer_payments CASCADE;");
    console.log("DROP TABLE IF EXISTS custom_cake_requests CASCADE;");
    console.log("DROP TABLE IF EXISTS customer_order_items CASCADE;");
    console.log("DROP TABLE IF EXISTS customer_orders CASCADE;");
    console.log("DROP TABLE IF EXISTS customer_addresses CASCADE;");
    console.log("DROP TABLE IF EXISTS order_holds CASCADE;");
    console.log("DROP TABLE IF EXISTS system_configuration CASCADE;");
    console.log("DROP TABLE IF EXISTS product_category_mappings CASCADE;");
    console.log("DROP TABLE IF EXISTS product_pricing CASCADE;");
    console.log("DROP TABLE IF EXISTS product_catalog CASCADE;");
    console.log("DROP TABLE IF EXISTS product_categories CASCADE;");
    console.log("DROP TABLE IF EXISTS customer_otp_verifications CASCADE;");
    console.log("DROP TABLE IF EXISTS customers CASCADE;");
    console.log("\n-- Drop all functions");
    console.log("DROP FUNCTION IF EXISTS send_quote CASCADE;");
    console.log("DROP FUNCTION IF EXISTS verify_payment CASCADE;");
    console.log("DROP FUNCTION IF EXISTS update_order_status CASCADE;");
    console.log("DROP FUNCTION IF EXISTS create_customer_order CASCADE;");
    console.log("DROP FUNCTION IF EXISTS validate_pickup_date CASCADE;");
    console.log("DROP FUNCTION IF EXISTS calculate_order_totals CASCADE;");
    console.log("DROP FUNCTION IF EXISTS is_owner_user CASCADE;");
    console.log("DROP FUNCTION IF EXISTS is_staff_user CASCADE;");
    console.log("DROP FUNCTION IF EXISTS current_customer_id CASCADE;");
    console.log("DROP FUNCTION IF EXISTS log_order_status_change CASCADE;");
    console.log("DROP FUNCTION IF EXISTS generate_order_number CASCADE;");
    console.log("DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;");
    
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  IMPORTANT NOTES');
    console.log('='.repeat(80));
    console.log('• This migration is SEPARATE from existing staff/inventory tables');
    console.log('• Customer data is completely isolated from staff data');
    console.log('• Product catalog tables have NO RLS (public read access)');
    console.log('• Remember to set session variables before queries:');
    console.log("    SET app.current_customer_id = '<uuid>';");
    console.log("    SET app.user_role = 'owner' | 'cashier' | 'customer';");
    console.log('• Default deposit percentage is 40% (configurable)');
    console.log('• Min advance order days: 2, Max: 90 (configurable)');
    console.log('• Pickup time slots: 9:00-17:00 (configurable via JSON)');
    
    console.log('\n' + '='.repeat(80));
    console.log('🚀 NEXT STEPS AFTER MIGRATION');
    console.log('='.repeat(80));
    console.log('1. Update system_configuration entries (SMS webhook, bank details, etc.)');
    console.log('2. Add initial products to product_catalog');
    console.log('3. Configure product_pricing for each product');
    console.log('4. Map products to categories via product_category_mappings');
    console.log('5. Test customer signup flow (OTP)');
    console.log('6. Test order creation via stored functions');
    console.log('7. Configure Stripe webhook for payment callbacks');
    console.log('8. Set up SMS webhook for OTP delivery');
    
    console.log('\n' + '='.repeat(80));
    console.log('📄 Migration file ready at:', migrationPath);
    console.log('📚 Documentation available:');
    console.log('   • MIGRATION_006_FIXES.md - All issues fixed');
    console.log('   • VALIDATION_SUMMARY.md - Production readiness assessment');
    console.log('   • CONCURRENCY_ENHANCEMENTS.md - Performance optimizations');
    console.log('='.repeat(80) + '\n');
    
    return { 
      success: false, 
      message: 'Manual execution required - see instructions above',
      migrationPath,
      stats: {
        tables: tableCount,
        indexes: indexCount,
        functions: functionCount,
        triggers: triggerCount,
        policies: policyCount
      }
    };
    
  } catch (error) {
    console.error('\n❌ Error reading migration file:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const migrationFile = args[0] || '006_customer_ordering_schema.sql';

// Display help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('\n📖 Customer Ordering Migration Runner - Help\n');
  console.log('Usage:');
  console.log('  node run-customer-migration.js [migration-file]\n');
  console.log('Examples:');
  console.log('  node run-customer-migration.js');
  console.log('  node run-customer-migration.js 006_customer_ordering_schema.sql\n');
  console.log('Description:');
  console.log('  Prepares and displays instructions for running the customer ordering');
  console.log('  system migration that creates the complete ordering infrastructure.\n');
  console.log('Features:');
  console.log('  • 15 database tables for customer ordering');
  console.log('  • 12 stored functions for business logic');
  console.log('  • 12 triggers for automation');
  console.log('  • 32 Row Level Security policies');
  console.log('  • 8 default product categories');
  console.log('  • 17 system configuration entries\n');
  process.exit(0);
}

// Run the migration
console.log('\n🚀 Starting customer ordering migration process...\n');

runCustomerMigration(migrationFile).then((result) => {
  if (result.success) {
    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } else {
    console.log('⏸️  Awaiting manual execution in Supabase Dashboard\n');
    if (result.stats) {
      console.log('📊 Migration Statistics:');
      console.log(`   • ${result.stats.tables} tables`);
      console.log(`   • ${result.stats.indexes} indexes`);
      console.log(`   • ${result.stats.functions} functions`);
      console.log(`   • ${result.stats.triggers} triggers`);
      console.log(`   • ${result.stats.policies} RLS policies\n`);
    }
    process.exit(0);
  }
}).catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

