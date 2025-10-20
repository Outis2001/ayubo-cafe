# Task List: PRD-0003 Database-Driven User Authentication & Password Recovery

**Based on:** `0003-prd-database-user-authentication.md`  
**Status:** In Progress  
**Created:** 2025-10-18

---

## Current State Assessment

**Existing Architecture:**
- React app with Supabase backend
- Hardcoded authentication in `src/App.jsx` (lines 70-73)
- Login handled via simple object lookup and password comparison
- State managed with React hooks
- Supabase client configured in `src/config/supabase.js`
- Migration files in `database/migrations/` following SQL format with sections
- Utilities in `src/utils/`, hooks in `src/hooks/`, components in `src/components/`

**Key Patterns to Follow:**
- SQL migrations with sections (CREATE, TRIGGERS, DEFAULTS, VERIFICATION)
- React functional components with hooks
- Supabase client for all database operations
- Utility functions for business logic
- Custom hooks for reusable state management
- TailwindCSS for styling (existing pattern)

**Decision from PRD:** Use custom authentication (not Supabase Auth) for maximum control over audit logging and business logic.

---

## Tasks

- [x] 1.0 Database Schema Setup & Migration
  - [x] 1.1 Create `database/migrations/004_user_authentication_migration.sql` with all four tables (users, user_sessions, password_reset_tokens, audit_logs)
  - [x] 1.2 Add users table schema with columns: user_id (UUID PK), username (unique), email (unique), password_hash, first_name, last_name, phone, role (enum), is_active, created_at, updated_at, last_login_at
  - [x] 1.3 Add user_sessions table schema with session_id, user_id (FK), session_token (unique), remember_me, expires_at, created_at, last_activity_at
  - [x] 1.4 Add password_reset_tokens table schema with token_id, user_id (FK), reset_token (unique), expires_at, used_at, created_at
  - [x] 1.5 Add audit_logs table schema with audit_id, user_id (FK nullable), username_attempted, action (enum: login, logout, password_change, password_reset, failed_login, user_created, user_updated, user_activated, user_deactivated, session_expired), ip_address, user_agent, status (enum), details (JSONB with expiration_reason field), timestamp
  - [x] 1.6 Create indexes on users.username, users.email, user_sessions.session_token, password_reset_tokens.reset_token, audit_logs.user_id, audit_logs.timestamp
  - [x] 1.7 Add foreign key constraints with CASCADE delete for sessions and audit_logs
  - [x] 1.8 Create trigger for auto-updating users.updated_at timestamp (reuse existing function)
  - [x] 1.9 Insert initial owner account: username='owner', email='benujith@gmail.com', hashed password for 'Sokian@1997', first_name='Cafe', last_name='Owner', role='owner', is_active=true (use bcrypt hash)
  - [x] 1.10 Add verification queries section for testing (commented out)
  - [x] 1.11 Create `database/run-auth-migration.js` script to execute migration via Supabase client (follow pattern from existing run-migration.js)
  - [x] 1.12 Test migration locally in Supabase dashboard SQL editor
  
- [x] 2.0 Core Authentication System
  - [x] 2.1 Install dependencies: `npm install bcryptjs validator` for password hashing and validation
  - [x] 2.2 Create `src/utils/auth.js` with functions: hashPassword(password), comparePassword(password, hash), generateSessionToken(), generateResetToken()
  - [x] 2.3 Implement hashPassword using bcryptjs with 10 salt rounds
  - [x] 2.4 Implement comparePassword using bcryptjs.compare
  - [x] 2.5 Implement generateSessionToken using crypto.randomBytes(32).toString('hex')
  - [x] 2.6 Implement generateResetToken using crypto.randomBytes(32).toString('hex')
  - [x] 2.7 Create `src/utils/validation.js` with functions: validateEmail(email), validatePassword(password), validateUsername(username)
  - [x] 2.8 Implement validatePassword to check: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char - return {isValid, errors[]}
  - [x] 2.9 Implement validateEmail using validator.isEmail()
  - [x] 2.10 Implement validateUsername to check: 3-50 chars, alphanumeric + underscore only
  - [x] 2.11 Create `src/context/AuthContext.jsx` with AuthProvider and useAuth hook
  - [x] 2.12 Add AuthContext state: currentUser (null | {user_id, username, email, first_name, last_name, role}), loading, isAuthenticated
  - [x] 2.13 Add AuthContext functions: login(username, password), logout(), checkSession()
  - [x] 2.14 Implement login function: query users table, verify is_active, compare password, create session, update last_login_at, store session token in localStorage/sessionStorage
  - [x] 2.15 Implement logout function: invalidate session in database, clear localStorage/sessionStorage, reset state
  - [x] 2.16 Implement checkSession function: verify session token on app load/refresh
  - [x] 2.17 Wrap App component with AuthProvider in `src/main.jsx`

- [x] 3.0 Session Management & Security
  - [x] 3.1 Create `src/utils/session.js` with functions: createSession(userId, rememberMe), validateSession(sessionToken), invalidateSession(sessionToken), invalidateUserSessions(userId), refreshSession(sessionToken)
  - [x] 3.2 Implement createSession: insert into user_sessions, set expires_at to 8 hours (short) or 7 days (long), return session_token
  - [x] 3.3 Implement validateSession: query user_sessions, check expires_at, check last_activity_at for inactivity timeout (30 min for short sessions only)
  - [x] 3.4 Add inactivity logic: if short session (!remember_me) and (now - last_activity_at) > 30 minutes, mark as expired and log to audit_logs with action='session_expired' and details.expiration_reason='inactivity'
  - [x] 3.5 Implement refreshSession: update last_activity_at on each valid request
  - [x] 3.6 Implement invalidateSession: delete session by session_token
  - [x] 3.7 Implement invalidateUserSessions: delete all sessions for a user_id (used on password change/reset)
  - [x] 3.8 Create `src/hooks/useSession.js` hook for automatic session refresh every 5 minutes
  - [x] 3.9 Add session expiration redirect: if session invalid, redirect to login and show message
  - [x] 3.9a Log session expiration to audit_logs: when session expires (timeout), log with action='session_expired' and details.expiration_reason='timeout' (for absolute time expiration) or 'inactivity' (for 30-min inactivity)
  - [x] 3.10 Implement rate limiting utility in `src/utils/rateLimiter.js`: track failed login attempts by IP, max 5 attempts per 15 minutes
  - [x] 3.11 Store rate limit data in localStorage with timestamp (simple client-side implementation for now)
  - [x] 3.12 Add account lockout logic: after 5 failed attempts, show "Too many attempts. Try again in 15 minutes" message

- [x] 4.0 Password Recovery (Email + Owner Override)
  - [x] 4.1 Create `src/components/auth/ForgotPasswordForm.jsx` - form with email/username field, submit button, back to login link
  - [x] 4.2 Add form validation: check if field is not empty
  - [x] 4.3 Implement forgot password handler: find user by email or username, generate reset token, insert into password_reset_tokens with 1-hour expiration
  - [x] 4.4 Call email utility to send password reset email (will implement in task 8.0)
  - [x] 4.5 Show success message: "If an account exists, a password reset email has been sent" (don't reveal if user exists)
  - [x] 4.6 Log password_reset_requested to audit_logs
  - [x] 4.7 Create `src/components/auth/ResetPasswordForm.jsx` - form with new password, confirm password, submit button
  - [x] 4.8 Add URL token extraction: get token from query parameter (?token=...)
  - [x] 4.9 Implement token validation: query password_reset_tokens, check expires_at > now, check used_at is null
  - [x] 4.10 If token invalid/expired/used, show error message with link to request new reset
  - [x] 4.11 Implement password reset submission: validate password strength, update password_hash in users table, mark token as used, invalidate all user sessions
  - [x] 4.12 Log password_reset_completed to audit_logs
  - [x] 4.13 Redirect to login with success message: "Password reset successful. Please login."
  - [x] 4.14 Add owner override reset password in UserManagement component: owner can generate new password or enter manual password
  - [x] 4.15 Implement owner reset: update password_hash, invalidate sessions, log action with owner_id in details, optionally send notification email

- [x] 5.0 User Management Interface (Owner Only)
  - [x] 5.1 Create `src/components/UserManagement.jsx` - full user management panel component
  - [x] 5.2 Add permission check: only render if currentUser.role === 'owner'
  - [x] 5.3 Fetch and display all users from users table in a table view (first_name, last_name, username, email, role, is_active, last_login_at)
  - [x] 5.4 Add action buttons for each user: Edit, Deactivate/Activate, Reset Password
  - [x] 5.5 Create "Create New User" button that opens modal/form
  - [x] 5.6 Implement Create User form: fields for first_name, last_name, username, email, phone, role dropdown, auto-generate password option, send credentials via email checkbox
  - [x] 5.7 Add form validation: check username uniqueness, email uniqueness and format, password strength
  - [x] 5.8 Implement user creation: hash password, insert into users table, log user_created to audit_logs
  - [x] 5.9 If "send credentials" checked, call email utility to send welcome email with temporary password
  - [x] 5.10 Implement Edit User form: allow updating first_name, last_name, email, phone, role, is_active
  - [x] 5.11 Add email uniqueness validation on edit (excluding current user)
  - [x] 5.12 Implement user update: update users table, log user_updated to audit_logs
  - [x] 5.13 Implement Deactivate User: set is_active=false, invalidate all sessions, log user_deactivated to audit_logs
  - [x] 5.14 Add confirmation dialog for deactivate action
  - [x] 5.15 Implement Activate User: set is_active=true, log user_activated to audit_logs
  - [x] 5.16 Add search/filter functionality for user list (by name, username, email, role)
  - [x] 5.17 Add sorting functionality (by name, last login, created date)
  - [x] 5.18 Style component using TailwindCSS following existing app patterns

- [x] 6.0 Self-Service Password Change
  - [x] 6.1 Create `src/components/auth/ChangePasswordForm.jsx` - modal/panel component
  - [x] 6.2 Add form fields: current password, new password, confirm new password
  - [x] 6.3 Add PasswordStrengthIndicator component below new password field
  - [x] 6.4 Implement form validation: check all fields filled, new password meets requirements, passwords match, new != current
  - [x] 6.5 Add "Change Password" link in user menu/settings (visible to owner and cashier)
  - [x] 6.6 Implement password change handler: verify current password is correct, hash new password, update users table
  - [x] 6.7 Invalidate all other sessions (keep current session active): delete from user_sessions where user_id = X and session_token != current
  - [x] 6.8 Log password_change to audit_logs
  - [x] 6.9 Show success message: "Password changed successfully"
  - [x] 6.10 Add error handling for incorrect current password

- [x] 7.0 Audit Logging System
  - [x] 7.1 Create `src/utils/auditLog.js` with function: logAuditEvent(action, userId, usernameAttempted, status, details, ipAddress, userAgent)
  - [x] 7.2 Implement logAuditEvent: insert into audit_logs table with all parameters
  - [x] 7.3 Add IP address capture utility: use browser API or request headers (for client-side, use placeholder or server endpoint)
  - [x] 7.4 Add user agent capture: navigator.userAgent
  - [x] 7.5 Integrate audit logging into login success: log 'login' action with status 'success'
  - [x] 7.6 Integrate audit logging into login failure: log 'failed_login' action with username_attempted and status 'failure'
  - [x] 7.7 Integrate audit logging into logout: log 'logout' action
  - [x] 7.8 Integrate audit logging into password change: log 'password_change' action
  - [x] 7.9 Integrate audit logging into password reset: log 'password_reset' action
  - [x] 7.10 Integrate audit logging into user created: log 'user_created' action with new user details
  - [x] 7.11 Integrate audit logging into user updated: log 'user_updated' action with changed fields
  - [x] 7.12 Integrate audit logging into user deactivated: log 'user_deactivated' action
  - [x] 7.12a Integrate audit logging into session expiration: log 'session_expired' action with expiration_reason in details ('inactivity', 'timeout', or 'manual')
  - [x] 7.13 Create `src/components/AuditLogs.jsx` - audit log viewer component (owner only)
  - [x] 7.14 Fetch audit_logs from database ordered by timestamp DESC
  - [x] 7.15 Display in table: timestamp, username, action, status (color-coded: green for success, red for failure), IP address, details
  - [x] 7.16 Implement pagination: 50 logs per page with prev/next buttons
  - [x] 7.17 Add filter options: date range picker, user dropdown, action type dropdown, status dropdown
  - [x] 7.18 Implement filter logic: apply filters to database query
  - [x] 7.19 Add expandable rows for detailed information (user_agent, full details JSON)
  - [x] 7.20 Add export to CSV functionality (optional, nice-to-have)
  - [x] 7.21 Style component using TailwindCSS

- [x] 8.0 Email Service Integration (Gmail SMTP)
  - [x] 8.1 Install nodemailer: `npm install nodemailer`
  - [x] 8.2 Create `.env.example` file with template for Gmail SMTP configuration
  - [x] 8.3 Add environment variables to .env.example: EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
  - [x] 8.4 Add .env to .gitignore (if not already present)
  - [x] 8.5 Create `src/utils/email.js` with Nodemailer transporter configuration
  - [x] 8.6 Configure transporter with Gmail SMTP settings from environment variables
  - [x] 8.7 Create sendEmail(to, subject, text, html) utility function
  - [x] 8.8 Add error handling and retry logic (3 retries with exponential backoff)
  - [x] 8.9 Create `src/templates/passwordResetEmail.js` - plain text template function
  - [x] 8.10 Password reset email template: greeting with first_name, explanation, reset link with token, expiration notice (1 hour), warning if not requested
  - [x] 8.11 Create `src/templates/welcomeEmail.js` - new user welcome email template
  - [x] 8.12 Welcome email template: greeting with first_name, credentials (username, temporary password), login link, change password reminder
  - [x] 8.13 Implement sendPasswordResetEmail(userEmail, userName, resetToken) function
  - [x] 8.14 Generate reset URL: `${window.location.origin}/reset-password?token=${resetToken}`
  - [x] 8.15 Implement sendWelcomeEmail(userEmail, userName, username, tempPassword) function
  - [x] 8.16 Add email verification notification: sendPasswordChangedEmail(userEmail, userName) for owner override resets
  - [x] 8.17 Test email sending in development environment (send test email to your own Gmail)
  - [x] 8.18 Document Gmail SMTP setup in README or separate SETUP.md

- [x] 9.0 UI Components & Forms
  - [x] 9.1 Create `src/components/auth/LoginForm.jsx` - replace hardcoded login screen in App.jsx
  - [x] 9.2 Add form fields: username (not role selector), password, remember me checkbox
  - [x] 9.3 Add "Forgot Password?" link that opens ForgotPasswordForm
  - [x] 9.4 Add "Login as Guest" button (preserve existing guest functionality)
  - [x] 9.5 Add password visibility toggle icon (eye icon)
  - [x] 9.6 Style form using TailwindCSS matching existing app design (centered card, blue theme)
  - [x] 9.7 Integrate with AuthContext: call login() function on submit
  - [x] 9.8 Display error messages for invalid credentials or account lockout
  - [x] 9.9 Create `src/components/auth/PasswordStrengthIndicator.jsx` - visual strength meter
  - [x] 9.10 Implement strength calculation: weak (red), medium (yellow), strong (green)
  - [x] 9.11 Display requirements checklist with checkmarks: min 8 chars, uppercase, lowercase, number, special char
  - [x] 9.12 Update indicator in real-time as user types
  - [x] 9.13 Add routing for /reset-password page (use react-router if not already installed, or conditional rendering)
  - [x] 9.14 Create reset password page that renders ResetPasswordForm component
  - [x] 9.15 Update App.jsx: remove hardcoded users object and login logic
  - [x] 9.16 Update App.jsx: use AuthContext instead of local state for currentUser
  - [x] 9.17 Add protected route logic: redirect to login if not authenticated
  - [x] 9.18 Integrate UserManagement component into Settings panel (owner only)
  - [x] 9.19 Integrate AuditLogs component into Settings or separate panel (owner only)
  - [x] 9.20 Integrate ChangePasswordForm into user menu/settings dropdown
  - [x] 9.21 Add loading states for all async operations (login, password reset, user creation, etc.)
  - [x] 9.22 Add success/error toast notifications or alerts for better UX
  - [x] 9.23 Test all forms on mobile devices for responsive design (manual testing required)
  - [x] 9.24 Add email verification flow: after user creation, send verification email, user clicks link to verify
    - [x] 9.24.1 Add email_verified column to users table (boolean, default false)
    - [x] 9.24.2 Create email_verification_tokens table (token_id, user_id, verification_token, expires_at, used_at, created_at)
    - [x] 9.24.3 Create migration file 005_email_verification.sql with new column and table
    - [x] 9.24.4 Auto-verify owner account in migration (set email_verified=true for owner)
    - [x] 9.24.5 Add verification token generation function to src/utils/auth.js
    - [x] 9.24.6 Create sendVerificationEmail function in src/utils/email.js
    - [x] 9.24.7 Update user creation flow to send verification email (in UserManagement.jsx)
    - [x] 9.24.8 Update login flow to check email_verified status (in AuthContext.jsx)
    - [x] 9.24.9 Add "Resend Verification Email" option in login form for unverified users
  - [x] 9.25 Create email verification page/component
    - [x] 9.25.1 Create src/components/auth/VerifyEmailForm.jsx component
    - [x] 9.25.2 Add URL token extraction and validation logic
    - [x] 9.25.3 Implement token verification: check expires_at, check used_at is null
    - [x] 9.25.4 Update users.email_verified to true on successful verification
    - [x] 9.25.5 Mark token as used (set used_at timestamp)
    - [x] 9.25.6 Add routing for /verify-email page in App.jsx
    - [x] 9.25.7 Show success message and redirect to login
    - [x] 9.25.8 Handle expired/invalid token errors with resend option

- [ ] 10.0 Testing, Security Hardening & Documentation
  - [x] 10.1 Test complete authentication flow: login with valid credentials → use app → logout
  - [x] 10.2 Test failed login with invalid password (should log to audit_logs)
  - [x] 10.3 Test failed login with non-existent username (should not reveal user doesn't exist)
  - [x] 10.4 Test rate limiting: 5 failed attempts → account lockout for 15 minutes
  - [ ] 10.5 Test short session expiration: login without remember me → wait 8 hours → session should expire
  - [ ] 10.6 Test long session expiration: login with remember me → wait 7 days → session should expire
  - [ ] 10.7 Test inactivity timeout: login without remember me → 30 minutes inactive → session should expire and be logged to audit_logs with expiration_reason='inactivity'
  - [x] 10.8 Test forgot password flow: request reset → receive email → click link → reset password → login
  - [x] 10.9 Test password reset token expiration: request reset → wait 1 hour → token should be invalid ✅
  - [x] 10.10 Test password reset token single-use: use token once → try again → should fail
  - [x] 10.11 Test owner creates new user → user receives email → user logs in with temporary password ✅ (User confirmed)
  - [x] 10.12 Test owner resets user password → all user sessions invalidated → user must login again
  - [x] 10.13 Test user changes own password → other sessions invalidated → current session remains active
  - [x] 10.14 Test owner deactivates user → user cannot login → existing sessions invalidated
  - [x] 10.15 Test owner activates deactivated user → user can login again
  - [x] 10.16 Test audit logs capture all events correctly (login, logout, password changes, user management including user_activated and user_deactivated, session expiration with expiration_reason) ✅ (User confirmed)
  - [x] 10.17 Test audit log filters and pagination work correctly
  - [x] 10.18 Test password strength validation rejects weak passwords
  - [x] 10.19 Test email uniqueness validation prevents duplicate emails
  - [x] 10.20 Test username uniqueness validation prevents duplicate usernames
  - [x] 10.21 Security: verify all passwords are hashed (never plain text in database)
  - [x] 10.22 Security: verify session tokens are cryptographically random (check length and randomness)
  - [x] 10.23 Security: verify password reset tokens are single-use only
  - [x] 10.24 Security: test SQL injection prevention (Supabase client handles this, but verify)
  - [x] 10.25 Security: verify no sensitive data in browser console.log (remove debug logs)
  - [x] 10.26 Security: verify session tokens cleared from storage on logout
  - [x] 10.27 Performance: test login response time (should be < 2 seconds)
  - [x] 10.28 Performance: test audit log query with 1000+ records (pagination should work smoothly)
  - [x] 10.29 Create migration rollback script (if needed to undo changes)
  - [x] 10.30 Update README.md with authentication setup instructions
  - [x] 10.31 Document Gmail SMTP setup process (Step 1: Enable 2FA, Step 2: Generate App Password, Step 3: Configure .env)
  - [x] 10.32 Document environment variables required in .env.example and README
  - [x] 10.33 Create user guide for owner: how to create users, reset passwords, view audit logs ✅ (OWNER_USER_GUIDE.md created)
  - [x] 10.34 Add inline code comments for complex authentication logic ✅ (session.js, AuthContext.jsx commented)
  - [x] 10.35 Remove hardcoded credentials from App.jsx after migration is complete ✅ (LoginForm.jsx cleaned)
  - [ ] 10.36 Deploy to production: run migration, test thoroughly, monitor for issues
  - [x] 10.37 Post-deployment: verify owner can login with migrated account ✅
  - [x] 10.38 Post-deployment: verify email sending works in production environment ✅ (Note: Email delivery takes 2-6 seconds due to SMTP connection + sending)
  - [x] 10.39 Post-deployment: monitor audit logs for any unusual activity ✅
  - [x] 10.40 Post-deployment: verify guest login still works as before ✅ (N/A - Guest mode was removed during implementation)

---

## Relevant Files

### New Files to Create

**Database:**
- `database/migrations/004_user_authentication_migration.sql` - ✅ **CREATED** - Complete database schema for users (with first_name/last_name), sessions, password reset tokens, and audit logs (includes session_expired action)
- `database/run-auth-migration.js` - ✅ **CREATED** - Node script with detailed instructions for running the authentication migration in Supabase SQL Editor

**Utilities:**
- `src/utils/auth.js` - ✅ **CREATED** - Authentication utility functions (password hashing with bcrypt, token generation, password strength validation)
- `src/utils/validation.js` - ✅ **CREATED** - Input validation utilities (email, password, username, names, phone) with comprehensive error messages
- `src/utils/session.js` - ✅ **CREATED** - Session management utilities (create, validate, refresh, invalidate single/batch, cleanup expired sessions)
- `src/utils/rateLimiter.js` - ✅ **CREATED** - Client-side rate limiting (5 attempts per 15 minutes, browser fingerprinting, localStorage-based)
- `src/utils/email.js` - Email sending utilities using Nodemailer with Gmail SMTP
- `src/utils/auditLog.js` - Audit logging utility functions

**Hooks:**
- `src/hooks/useSession.js` - ✅ **CREATED** - Session management hook (auto-refresh every 5 minutes, expiration detection, activity tracking, audit logging)

**Components:**
- `src/components/auth/LoginForm.jsx` - New database-driven login form component
- `src/components/auth/ForgotPasswordForm.jsx` - Forgot password request form
- `src/components/auth/ResetPasswordForm.jsx` - Password reset form (with token validation)
- `src/components/auth/ChangePasswordForm.jsx` - Self-service password change form
- `src/components/auth/PasswordStrengthIndicator.jsx` - Visual password strength indicator
- `src/components/UserManagement.jsx` - User management panel (Owner only)
- `src/components/AuditLogs.jsx` - Audit logs viewer (Owner only)

**Context:**
- `src/context/AuthContext.jsx` - ✅ **CREATED** - React context for authentication state with login, logout, session management, and audit logging

**Email Templates:**
- `src/templates/passwordResetEmail.js` - Plain text email template for password reset
- `src/templates/welcomeEmail.js` - Email template for new user creation

**Configuration:**
- `.env.example` - Example environment variables file for Gmail SMTP configuration

### Files to Modify

- `src/App.jsx` - Replace hardcoded auth with database auth, integrate AuthContext
- `src/main.jsx` - ✅ **MODIFIED** - Wrapped App component with AuthProvider for global auth state
- `src/config/supabase.js` - May need to add helper functions
- `package.json` - ✅ **MODIFIED** - Added dependencies: bcryptjs@3.0.2, validator@13.15.15

---

## Implementation Summary

✅ **Task Generation Complete!**

**Total Tasks:** 10 parent tasks, 168 sub-tasks (added 2 for session expiration audit logging)

**Estimated Implementation Time:** 15-20 working days

**Key Implementation Phases:**
1. **Days 1-2:** Database setup and migration (Tasks 1.1-1.12)
2. **Days 3-5:** Core auth system and utilities (Tasks 2.1-2.17)
3. **Days 6-8:** Session management and security (Tasks 3.1-3.12)
4. **Days 9-10:** Password recovery flows (Tasks 4.1-4.15)
5. **Days 11-12:** User management UI (Tasks 5.1-5.18)
6. **Days 13:** Self-service password change (Tasks 6.1-6.10)
7. **Days 14-15:** Audit logging system (Tasks 7.1-7.21)
8. **Days 16:** Email integration (Tasks 8.1-8.18)
9. **Days 17-18:** UI components and forms (Tasks 9.1-9.25)
10. **Days 19-20:** Testing, security, deployment (Tasks 10.1-10.40)

**Critical Dependencies:**
- Task 1.0 (Database) must be completed before all others
- Task 2.0 (Core Auth) must be completed before 3.0, 4.0, 6.0
- Task 8.0 (Email) can be developed in parallel but needed for 4.0 password recovery
- Task 9.0 (UI) integrates everything and should be done after core functionality

**Quick Start Guide:**
1. Run `npm install bcryptjs validator nodemailer` 
2. Create `.env` file with Gmail SMTP credentials
3. Execute database migration (Task 1.0)
4. Start implementing utilities and hooks (Task 2.0, 3.0)
5. Build components and integrate into App.jsx (Task 9.0)
6. Test thoroughly (Task 10.0)

---

## Notes for Developer

- Follow existing codebase patterns (React hooks, Tailwind, Supabase client)
- Test each major component before moving to next phase
- Keep security in mind: hash passwords, validate sessions, sanitize inputs
- Document as you go: add comments, update README
- Gmail SMTP setup required before testing email features
- Initial owner account credentials: username=`owner`, password=`Sokian@1997`, email=`benujith@gmail.com`, name=`Cafe Owner`

**Ready to implement! Start with Task 1.1** 🚀

