-- ============================================================================
-- AYUBO CAFE USER AUTHENTICATION ROLLBACK
-- Version: 004 Rollback
-- Date: 2025-10-19
-- Description: Rolls back the authentication system migration
--              WARNING: This will DELETE all authentication data!
-- ============================================================================

-- ⚠️  WARNING: This script will permanently delete:
--    - All user accounts (except you'll need to restore owner manually)
--    - All user sessions
--    - All password reset tokens
--    - All audit logs
--    - Custom types and functions
--
-- ⚠️  BACKUP YOUR DATA BEFORE RUNNING THIS SCRIPT!

-- ============================================================================
-- STEP 1: DROP TABLES (in reverse dependency order)
-- ============================================================================

-- Drop audit logs table
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Drop password reset tokens table
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Drop user sessions table
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Drop users table
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- STEP 2: DROP CUSTOM TYPES
-- ============================================================================

-- Drop audit status enum
DROP TYPE IF EXISTS audit_status CASCADE;

-- Drop audit action enum
DROP TYPE IF EXISTS audit_action CASCADE;

-- Drop user role enum
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================================
-- STEP 3: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify rollback was successful:

-- Check that tables are gone
-- Expected: Should return 0 rows or error that table doesn't exist
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM user_sessions;
-- SELECT COUNT(*) FROM password_reset_tokens;
-- SELECT COUNT(*) FROM audit_logs;

-- Check that types are gone
-- Expected: Should not list user_role, audit_action, or audit_status
-- SELECT typname FROM pg_type WHERE typname IN ('user_role', 'audit_action', 'audit_status');

-- ============================================================================
-- STEP 4: POST-ROLLBACK INSTRUCTIONS
-- ============================================================================

-- After rolling back, you'll need to:
--
-- 1. Remove authentication-related files from your codebase:
--    - src/utils/auth.js
--    - src/utils/validation.js
--    - src/utils/session.js
--    - src/utils/rateLimiter.js
--    - src/utils/email.js
--    - src/utils/auditLog.js
--    - src/context/AuthContext.jsx
--    - src/hooks/useSession.js
--    - src/components/auth/*
--    - src/components/UserManagement.jsx
--    - src/components/AuditLogs.jsx
--
-- 2. Restore hardcoded authentication in App.jsx:
--    - Add back the hardcoded owner/cashier credentials
--    - Remove AuthProvider wrapper
--    - Remove protected routes
--
-- 3. Remove email-related packages from package.json:
--    - nodemailer
--    - bcryptjs
--    - validator
--
-- 4. Clear any stored session tokens from browser:
--    - localStorage.removeItem('session_token');
--    - sessionStorage.removeItem('session_token');

-- ============================================================================
-- NOTES
-- ============================================================================

-- This rollback script does NOT:
-- - Remove extensions (pgcrypto, uuid-ossp) as they may be used by other tables
-- - Restore your old hardcoded authentication - you must do that manually
-- - Backup your data - always backup before running destructive operations

-- ============================================================================
-- EXECUTION INSTRUCTIONS
-- ============================================================================

-- 1. BACKUP your database first!
-- 2. Open Supabase Dashboard → SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire script
-- 5. Review the warnings above
-- 6. Click "Run" to execute
-- 7. Verify with the queries in STEP 3
-- 8. Follow POST-ROLLBACK INSTRUCTIONS in STEP 4


