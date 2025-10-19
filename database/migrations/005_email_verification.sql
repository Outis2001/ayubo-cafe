-- ============================================================================
-- AYUBO CAFE EMAIL VERIFICATION MIGRATION
-- Version: 005
-- Date: 2025-10-19
-- Description: Adds email verification functionality to the authentication system
--              - Adds email_verified column to users table
--              - Creates email_verification_tokens table
--              - Auto-verifies owner account
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD EMAIL_VERIFIED COLUMN TO USERS TABLE
-- ============================================================================

-- Add email_verified column (default false for new users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL;

-- Add index for email_verified (for filtering unverified users)
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Add comment
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address (required for login)';

-- ============================================================================
-- SECTION 2: CREATE EMAIL_VERIFICATION_TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    verification_token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_email_verification_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
);

-- Create indexes for email_verification_tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(verification_token);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires_at ON email_verification_tokens(expires_at);

-- Add comments for documentation
COMMENT ON TABLE email_verification_tokens IS 'Stores email verification tokens for new user account verification';
COMMENT ON COLUMN email_verification_tokens.token_id IS 'Unique identifier for the verification token';
COMMENT ON COLUMN email_verification_tokens.user_id IS 'Reference to the user who needs to verify their email';
COMMENT ON COLUMN email_verification_tokens.verification_token IS 'Unique verification token sent to user email (64 character hex)';
COMMENT ON COLUMN email_verification_tokens.expires_at IS 'Timestamp when the verification token expires (24 hours from creation)';
COMMENT ON COLUMN email_verification_tokens.used_at IS 'Timestamp when the token was used (null if not yet used)';
COMMENT ON COLUMN email_verification_tokens.created_at IS 'Timestamp when the token was created';

-- ============================================================================
-- SECTION 3: AUTO-VERIFY OWNER ACCOUNT
-- ============================================================================

-- Auto-verify the owner account (no email verification needed for owner)
UPDATE users 
SET email_verified = true 
WHERE role = 'owner';

-- ============================================================================
-- SECTION 4: VERIFICATION QUERIES (FOR TESTING)
-- ============================================================================

/*
-- Check that email_verified column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_verified';

-- Verify owner account is auto-verified
SELECT username, email, role, email_verified
FROM users
WHERE role = 'owner';

-- Check that email_verification_tokens table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'email_verification_tokens';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'email_verification_tokens'
ORDER BY ordinal_position;

-- Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname = 'idx_users_email_verified';

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'email_verification_tokens'
ORDER BY indexname;

-- Check foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'email_verification_tokens';
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration 005 completed successfully!
-- Next steps:
-- 1. Verify all tables and columns were created correctly
-- 2. Confirm owner account is email_verified = true
-- 3. Test email verification flow with new user creation

