-- ============================================================================
-- AYUBO CAFE USER AUTHENTICATION MIGRATION
-- Version: 004
-- Date: 2025-10-18
-- Description: Creates complete authentication system with users, sessions,
--              password reset tokens, and audit logging
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENABLE EXTENSIONS
-- ============================================================================

-- Enable pgcrypto extension for password hashing (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 2: CREATE CUSTOM TYPES (ENUMS)
-- ============================================================================

-- User role enumeration
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'cashier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Audit log action enumeration
DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'login',
        'logout',
        'password_change',
        'password_reset',
        'failed_login',
        'user_created',
        'user_updated',
        'user_activated',
        'user_deactivated',
        'session_expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Audit log status enumeration
DO $$ BEGIN
    CREATE TYPE audit_status AS ENUM ('success', 'failure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 3: CREATE USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(username) >= 3),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL CHECK (LENGTH(first_name) >= 1),
    last_name VARCHAR(50) NOT NULL CHECK (LENGTH(last_name) >= 1),
    phone VARCHAR(20),
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMPTZ
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Stores user accounts for authentication and authorization';
COMMENT ON COLUMN users.user_id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.username IS 'Unique username for login (3-50 characters)';
COMMENT ON COLUMN users.email IS 'Unique email address for password recovery';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (never store plain text)';
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
COMMENT ON COLUMN users.phone IS 'Optional phone number for contact';
COMMENT ON COLUMN users.role IS 'User role: owner (full access) or cashier (limited access)';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active (soft delete)';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp of last update to user record';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of most recent successful login';

-- ============================================================================
-- SECTION 4: CREATE USER_SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_token VARCHAR(64) UNIQUE NOT NULL,
    remember_me BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_user_sessions_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
);

-- Create indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Add comments for documentation
COMMENT ON TABLE user_sessions IS 'Stores active user sessions for authentication';
COMMENT ON COLUMN user_sessions.session_id IS 'Unique identifier for the session';
COMMENT ON COLUMN user_sessions.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_sessions.session_token IS 'Unique random token for session validation (64 characters)';
COMMENT ON COLUMN user_sessions.remember_me IS 'Whether this is a long-term session (7 days vs 8 hours)';
COMMENT ON COLUMN user_sessions.expires_at IS 'Absolute expiration time (8 hours or 7 days from creation)';
COMMENT ON COLUMN user_sessions.created_at IS 'Timestamp when session was created';
COMMENT ON COLUMN user_sessions.last_activity_at IS 'Timestamp of last user activity (for inactivity timeout)';

-- ============================================================================
-- SECTION 5: CREATE PASSWORD_RESET_TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    reset_token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_password_reset_tokens_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
);

-- Create indexes for password_reset_tokens table
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_reset_token ON password_reset_tokens(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for email-based password recovery';
COMMENT ON COLUMN password_reset_tokens.token_id IS 'Unique identifier for the token';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN password_reset_tokens.reset_token IS 'Unique random token for password reset link (64 characters)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (null if not used yet)';
COMMENT ON COLUMN password_reset_tokens.created_at IS 'Timestamp when token was created';

-- ============================================================================
-- SECTION 6: CREATE AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    username_attempted VARCHAR(50),
    action audit_action NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status audit_status NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_audit_logs_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL
);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all authentication and user management events';
COMMENT ON COLUMN audit_logs.audit_id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.user_id IS 'Foreign key to users table (null for failed login attempts)';
COMMENT ON COLUMN audit_logs.username_attempted IS 'Username attempted for login (captures even if user does not exist)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user (IPv4 or IPv6)';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/device information from User-Agent header';
COMMENT ON COLUMN audit_logs.status IS 'Result of the action (success or failure)';
COMMENT ON COLUMN audit_logs.details IS 'Additional context as JSON (e.g., expiration_reason for session_expired)';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the event occurred';

-- ============================================================================
-- SECTION 7: CREATE TRIGGERS
-- ============================================================================

-- Reuse the existing update_updated_time_column function from products migration
-- If it doesn't exist, create it
CREATE OR REPLACE FUNCTION update_updated_time_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Create trigger on users table to auto-update updated_at timestamp
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_time_column();

-- ============================================================================
-- SECTION 8: INSERT INITIAL OWNER ACCOUNT
-- ============================================================================

-- Insert the initial owner account with hashed password
-- Password: 'Sokian@1997' (as specified in current system)
-- Using crypt() function with bcrypt algorithm and salt rounds = 10
INSERT INTO users (
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
)
VALUES (
    'owner',
    'benujith@gmail.com',
    crypt('Sokian@1997', gen_salt('bf', 10)),
    'Cafe',
    'Owner',
    'owner',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();

-- ============================================================================
-- SECTION 9: VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- These queries are commented out but can be used to verify migration success

-- Verify all tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('users', 'user_sessions', 'password_reset_tokens', 'audit_logs')
-- ORDER BY table_name;

-- Verify custom types exist
-- SELECT typname FROM pg_type 
-- WHERE typname IN ('user_role', 'audit_action', 'audit_status');

-- Verify initial owner account exists
-- SELECT user_id, username, email, first_name, last_name, role, is_active, created_at 
-- FROM users 
-- WHERE username = 'owner';

-- Test password verification for owner account
-- SELECT username, (password_hash = crypt('Sokian@1997', password_hash)) AS password_matches
-- FROM users 
-- WHERE username = 'owner';

-- Verify indexes exist
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE tablename IN ('users', 'user_sessions', 'password_reset_tokens', 'audit_logs')
-- ORDER BY tablename, indexname;

-- Verify foreign key constraints
-- SELECT conname, conrelid::regclass, confrelid::regclass 
-- FROM pg_constraint 
-- WHERE contype = 'f' 
-- AND conrelid::regclass::text IN ('user_sessions', 'password_reset_tokens', 'audit_logs');

-- Verify trigger exists
-- SELECT trigger_name, event_object_table 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'users';

-- Check table row counts
-- SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
-- UNION ALL
-- SELECT 'user_sessions', COUNT(*) FROM user_sessions
-- UNION ALL
-- SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
-- UNION ALL
-- SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE '=== Migration 004: User Authentication System ===';
    RAISE NOTICE '✅ Extensions enabled (pgcrypto, uuid-ossp)';
    RAISE NOTICE '✅ Custom types created (user_role, audit_action, audit_status)';
    RAISE NOTICE '✅ Users table created with indexes';
    RAISE NOTICE '✅ User sessions table created with foreign keys';
    RAISE NOTICE '✅ Password reset tokens table created';
    RAISE NOTICE '✅ Audit logs table created';
    RAISE NOTICE '✅ Auto-update trigger configured for users table';
    RAISE NOTICE '✅ Initial owner account created (username: owner)';
    RAISE NOTICE '🔐 Authentication system ready to use';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Database Statistics:';
    RAISE NOTICE '   - 4 tables created';
    RAISE NOTICE '   - 13 indexes created';
    RAISE NOTICE '   - 3 foreign key constraints';
    RAISE NOTICE '   - 3 custom enum types';
    RAISE NOTICE '   - 1 trigger function';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Run this migration in Supabase SQL Editor';
    RAISE NOTICE '2. Verify initial owner account: username=owner, password=Sokian@1997';
    RAISE NOTICE '3. Test authentication utilities and session management';
END $$;

