# PRD-0003: Database-Driven User Authentication & Password Recovery

## Introduction/Overview

Currently, the Ayubo Cafe application uses hardcoded credentials stored in the frontend code for user authentication. This approach has several limitations: credentials are visible in the code, user management is difficult, and there's no way to recover forgotten passwords or track user activity.

This feature will migrate the authentication system to use Supabase database tables, implement a secure password recovery mechanism (with both email-based reset and owner override), add comprehensive user management capabilities, and track all authentication events through audit logging.

**Problem Statement:** 
- Credentials are hardcoded and insecure
- No way to add/remove users without code changes
- No password recovery mechanism
- No accountability or audit trail for user actions

**Solution Goal:**
Implement a secure, database-driven authentication system with password recovery, user management, and comprehensive audit logging.

---

## Goals

1. **Secure Authentication:** Migrate from hardcoded credentials to database-stored, hashed passwords
2. **User Management:** Enable Owner to create, edit, and deactivate user accounts through UI
3. **Password Recovery:** Implement dual password recovery: email-based reset + owner override capability
4. **Self-Service:** Allow users to change their own password while logged in
5. **Session Management:** Implement "Remember Me" option with short (8 hours) and long (7 days) session durations
6. **Audit Logging:** Track all authentication events (logins, logouts, password changes, failed attempts)
7. **Maintain Guest Access:** Preserve the existing Guest role functionality (no login required)

---

## User Stories

### Owner Stories
1. **As an Owner**, I want to create new Cashier accounts so that I can give staff access to the system
2. **As an Owner**, I want to view all user accounts and their status so that I can manage my team
3. **As an Owner**, I want to deactivate user accounts so that former employees can't access the system
4. **As an Owner**, I want to reset any user's password so that I can help staff who forgot their credentials
5. **As an Owner**, I want to see who logged in and when so that I can track accountability
6. **As an Owner**, I want to receive my default credentials through database migration so that I can access the system after deployment

### Cashier Stories
1. **As a Cashier**, I want to log in with my username and password so that I can access the system
2. **As a Cashier**, I want to reset my password via email if I forget it so that I can regain access without bothering the owner
3. **As a Cashier**, I want to change my password while logged in so that I can keep my account secure
4. **As a Cashier**, I want a "Remember Me" option so that I don't have to log in repeatedly during my shift

### Guest Stories
1. **As a Guest**, I want to select "Guest" mode without any login so that I can quickly process transactions

---

## Functional Requirements

### FR1: Database Schema

**FR1.1:** Create a `users` table in Supabase with the following columns:
- `user_id` (UUID, primary key, auto-generated)
- `username` (VARCHAR, unique, not null, 3-50 characters)
- `email` (VARCHAR, unique, not null, valid email format)
- `password_hash` (VARCHAR, not null, bcrypt hashed)
- `first_name` (VARCHAR, not null, 1-50 characters)
- `last_name` (VARCHAR, not null, 1-50 characters)
- `phone` (VARCHAR, nullable, for contact purposes)
- `role` (ENUM: 'owner', 'cashier', not null)
- `is_active` (BOOLEAN, default true, for soft-delete)
- `created_at` (TIMESTAMP, auto-generated)
- `updated_at` (TIMESTAMP, auto-updated)
- `last_login_at` (TIMESTAMP, nullable)

**FR1.2:** Create an `audit_logs` table in Supabase with the following columns:
- `audit_id` (UUID, primary key, auto-generated)
- `user_id` (UUID, foreign key to users.user_id, nullable for failed login attempts)
- `username_attempted` (VARCHAR, nullable, captures username even if user doesn't exist)
- `action` (ENUM: 'login', 'logout', 'password_change', 'password_reset', 'failed_login', 'user_created', 'user_updated', 'user_deactivated', 'session_expired')
- `ip_address` (VARCHAR, nullable)
- `user_agent` (TEXT, nullable, browser/device info)
- `status` (ENUM: 'success', 'failure')
- `details` (JSONB, nullable, for additional context including expiration_reason: 'inactivity', 'timeout', 'manual')
- `timestamp` (TIMESTAMP, auto-generated)

**FR1.3:** Create a `password_reset_tokens` table in Supabase:
- `token_id` (UUID, primary key, auto-generated)
- `user_id` (UUID, foreign key to users.user_id)
- `reset_token` (VARCHAR, unique, random 64-character string)
- `expires_at` (TIMESTAMP, token valid for 1 hour)
- `used_at` (TIMESTAMP, nullable, marks token as consumed)
- `created_at` (TIMESTAMP, auto-generated)

**FR1.4:** Create a `user_sessions` table in Supabase:
- `session_id` (UUID, primary key, auto-generated)
- `user_id` (UUID, foreign key to users.user_id)
- `session_token` (VARCHAR, unique, random token)
- `remember_me` (BOOLEAN, default false)
- `expires_at` (TIMESTAMP, 8 hours or 7 days based on remember_me)
- `created_at` (TIMESTAMP, auto-generated)
- `last_activity_at` (TIMESTAMP, updated on each request)

**FR1.5:** Create initial Owner account via database migration:
- Username: `owner`
- Email: `benujith@gmail.com`
- Password: `Sokian@1997` (same as current, hashed with bcrypt)
- First Name: `Cafe`
- Last Name: `Owner`
- Role: `owner`
- Is Active: `true`

### FR2: Login Flow

**FR2.1:** Replace the current login screen with a database-driven authentication form

**FR2.2:** Login form must include:
- Username field (required)
- Password field (required, masked)
- "Remember Me" checkbox
- "Forgot Password?" link
- "Login as Guest" button (preserves existing guest functionality)
- Submit button

**FR2.3:** On login attempt, system must:
1. Query `users` table for matching username
2. Verify `is_active = true`
3. Compare password using bcrypt
4. Create session in `user_sessions` table
5. Update `last_login_at` in `users` table
6. Log successful login to `audit_logs`
7. Store session token in localStorage or sessionStorage (based on "Remember Me")

**FR2.4:** On failed login attempt, system must:
1. Log failed attempt to `audit_logs` with username_attempted
2. Display generic error: "Invalid username or password"
3. After 5 failed attempts from same IP within 15 minutes, temporarily lock account for 15 minutes
4. Display lockout message: "Too many failed attempts. Please try again in 15 minutes."

**FR2.5:** Guest login must work as before (no database interaction, immediate access)

### FR3: Session Management

**FR3.1:** Short session (default): 8 hours from last activity
**FR3.2:** Long session ("Remember Me" checked): 7 days from creation
**FR3.3:** On each page load/request, system must verify session token validity
**FR3.4:** Expired sessions must redirect to login screen
**FR3.5:** Logout must invalidate session token and log to `audit_logs`
**FR3.6:** Session expiration must be logged to `audit_logs` with:
- Action: `session_expired`
- Details: `expiration_reason` field indicating reason ('inactivity' for 30-min timeout, 'timeout' for absolute expiration, 'manual' for logout)

### FR4: Password Recovery - Email Method

**FR4.1:** "Forgot Password?" link opens password reset request form

**FR4.2:** Password reset request form includes:
- Email or Username field
- Submit button
- Back to Login link

**FR4.3:** On password reset request:
1. Find user by email or username
2. Generate unique reset token (64 random characters)
3. Insert token into `password_reset_tokens` with 1-hour expiration
4. Send email with reset link: `https://[app-url]/reset-password?token=[token]`
5. Display success message: "If an account exists, a password reset email has been sent"
6. Log action to `audit_logs`

**FR4.4:** Password reset email must contain:
- Greeting with user's first name
- Clear explanation that they requested a password reset
- Clickable reset link (valid for 1 hour)
- Warning: "If you didn't request this, ignore this email"
- Ayubo Cafe branding

**FR4.5:** Password reset page (`/reset-password?token=...`) must:
1. Verify token exists and is not expired or used
2. Display form with:
   - New password field (with strength indicator)
   - Confirm password field
   - Submit button
3. Validate new password meets requirements (FR7)
4. Update password_hash in `users` table
5. Mark token as used in `password_reset_tokens`
6. Invalidate all existing sessions for that user
7. Log password_reset to `audit_logs`
8. Redirect to login with success message

**FR4.6:** If token is invalid/expired/used:
- Display error: "This password reset link is invalid or has expired"
- Provide link to request a new reset

### FR5: Password Recovery - Owner Override

**FR5.1:** Owner must have access to "User Management" section in Settings

**FR5.2:** User Management interface must show list of all users with:
- First Name
- Last Name
- Username
- Email
- Role
- Active Status
- Last Login
- Action buttons: Edit, Deactivate/Activate, Reset Password

**FR5.3:** "Reset Password" button for Owner must:
1. Open modal/form asking for new password (or generate random password)
2. Option A: Owner enters new temporary password
3. Option B: System generates random password and displays it once
4. Update password_hash for selected user
5. Invalidate all sessions for that user
6. Log action to `audit_logs` with details showing owner_id who performed reset
7. Optionally: Send email to user notifying them of password change
8. Force user to change password on next login

### FR6: Self-Service Password Change

**FR6.1:** Logged-in users (Owner, Cashier) must see "Change Password" option in user menu/settings

**FR6.2:** Change Password form must include:
- Current password field (required, for verification)
- New password field (with strength indicator)
- Confirm new password field
- Submit button

**FR6.3:** On password change:
1. Verify current password is correct
2. Validate new password meets requirements (FR7)
3. Verify new password != current password
4. Update password_hash in `users` table
5. Invalidate all other sessions (keep current session active)
6. Log password_change to `audit_logs`
7. Display success message

### FR7: Password Requirements & Validation

**FR7.1:** All new passwords must meet these criteria:
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

**FR7.2:** Password strength indicator must show:
- Weak (red): Fails some requirements
- Medium (yellow): Meets all requirements but < 10 characters
- Strong (green): Meets all requirements and >= 10 characters

**FR7.3:** Display specific error messages for each failed requirement

**FR7.4:** Passwords must be hashed using bcrypt with salt rounds = 10 before storage

### FR8: User Management UI (Owner Only)

**FR8.1:** Owner must have "User Management" panel in Settings

**FR8.2:** "Create New User" form must include:
- First Name (required)
- Last Name (required)
- Username (required, unique validation)
- Email (required, unique validation, email format validation)
- Phone (optional)
- Role dropdown (Owner, Cashier)
- Temporary Password (auto-generated or manual entry)
- "Send credentials via email" checkbox
- Submit button

**FR8.3:** On user creation:
1. Validate all required fields
2. Check username and email uniqueness
3. Hash password
4. Insert into `users` table
5. Log user_created to `audit_logs`
6. If email checkbox selected, send credentials to new user
7. Display success message

**FR8.4:** "Edit User" form must allow Owner to update:
- First Name
- Last Name
- Email (with uniqueness validation)
- Phone
- Role
- Active Status

**FR8.5:** "Deactivate User" must:
1. Set `is_active = false` in `users` table
2. Invalidate all sessions for that user
3. Log user_deactivated to `audit_logs`
4. Display confirmation message

**FR8.6:** Cashiers must NOT have access to User Management

**FR8.7:** Cashiers must see only "Change Password" option for their own account

### FR9: Audit Logging

**FR9.1:** Owner must have "Audit Logs" panel in Settings showing:
- Date/Time
- Username
- Action
- Status (Success/Failure)
- IP Address
- Details
- Pagination (50 logs per page)
- Filter options (Date range, User, Action type, Status)

**FR9.2:** System must automatically log these events:
- User login (success and failure)
- User logout
- Password change (self-service)
- Password reset (email or owner override)
- User created
- User updated
- User deactivated
- Failed login attempts (with username attempted)
- Session expired (with expiration_reason in details: 'inactivity', 'timeout', or 'manual')

**FR9.3:** Audit logs must be append-only (no deletion or editing)

**FR9.4:** Audit logs should be retained indefinitely (or configurable retention period)

**FR9.5:** Logs must capture IP address and user agent when available

### FR10: Security Considerations

**FR10.1:** All password operations must use bcrypt hashing (never store plain text)

**FR10.2:** Session tokens must be cryptographically random (use crypto.randomBytes or equivalent)

**FR10.3:** Password reset tokens must be single-use only

**FR10.4:** Implement rate limiting: Max 5 login attempts per IP per 15 minutes

**FR10.5:** All authentication-related database queries must use parameterized queries (Supabase client handles this)

**FR10.6:** Session tokens must be cleared from storage on logout

**FR10.7:** Password reset tokens must expire after 1 hour

**FR10.8:** Display generic error messages for login failures (don't reveal if username exists)

---

## Non-Goals (Out of Scope)

1. **Two-Factor Authentication (2FA):** Not included in this phase
2. **OAuth/Social Login:** No Google/Facebook login integration
3. **Email Service Setup:** Assumes email service (SendGrid, AWS SES, etc.) is already configured or will be configured separately
4. **User Registration (Public):** No public self-registration; only Owner can create accounts
5. **Password History:** Not preventing password reuse
6. **Biometric Authentication:** No fingerprint/face recognition
7. **Multi-Tenancy:** Single cafe instance only
8. **Role-Based Permissions (Granular):** Only two roles (Owner, Cashier); no custom permissions
9. **API Rate Limiting:** Basic IP-based rate limiting only for login attempts

---

## Design Considerations

### Login Screen Design
- Clean, centered card layout (similar to current design)
- Ayubo Cafe branding at top
- Clear visual separation between database login and guest access
- Password visibility toggle icon
- Remember Me checkbox styled consistently with app theme
- Responsive design for mobile devices

### User Management Interface
- Table view for user list (sortable, filterable)
- Modal/slide-out panels for Create/Edit user forms
- Color-coded status indicators (Active: green, Inactive: gray)
- Confirmation dialogs for destructive actions (deactivate, reset password)
- Search/filter functionality for large user lists

### Password Strength Indicator
- Visual bar indicator (red → yellow → green)
- Real-time feedback as user types
- List of requirements with checkmarks when met

### Audit Logs Interface
- Chronological table with latest first
- Color coding: Success (green), Failure (red)
- Expandable rows for detailed information
- Export functionality (CSV) for compliance purposes

### Responsive Considerations
- All forms must work on mobile devices
- Touch-friendly buttons and inputs
- Simplified table views on small screens

---

## Technical Considerations

### Database Setup
1. Create Supabase migration file for all tables
2. Set up foreign key constraints with CASCADE on delete for audit logs
3. Create indexes on frequently queried columns:
   - `users.username`
   - `users.email`
   - `audit_logs.user_id`
   - `audit_logs.timestamp`
   - `user_sessions.session_token`
   - `password_reset_tokens.reset_token`

### Email Configuration (Gmail SMTP)
- **Service:** Gmail SMTP (free, using owner's personal Gmail account)
- **Configuration via Environment Variables:**
  ```
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_SECURE=true
  EMAIL_USER=your-gmail@gmail.com
  EMAIL_PASSWORD=your-16-char-app-password
  EMAIL_FROM="Ayubo Cafe <your-gmail@gmail.com>"
  ```
- **Prerequisites:** 
  - Gmail account with 2-Step Verification enabled
  - Gmail App Password generated (not regular Gmail password)
- **Sending Limits:** Gmail allows ~500 emails/day (sufficient for cafe operations)
- Email templates should be stored separately (HTML + plain text fallback)
- Implement email sending utility function with error handling and retry logic
- Use **Nodemailer** library for Node.js email sending
- For better deliverability, add "Reply-To" header with owner's email

### Frontend Changes
- Create new authentication context/hook for managing user state
- Update all components to check user authentication status
- Create protected routes that require valid session
- Implement session refresh logic (extend session on activity)

### Backend/Supabase Functions
- Create Supabase Edge Function or RLS policies for:
  - User authentication
  - Password hashing verification
  - Session validation
  - Rate limiting logic
  - Audit log creation

### Libraries/Dependencies
- **bcryptjs** or **bcrypt:** For password hashing (if not using Supabase Auth)
- **crypto:** For generating secure tokens (Node.js built-in)
- **validator:** For email and input validation
- **nodemailer:** For sending emails via Gmail SMTP (confirmed choice)
- **react-hook-form** or **Formik:** For form handling and validation
- **dotenv:** For managing environment variables securely

### Migration Strategy
1. Create new database tables without disrupting current system
2. Add feature flag to switch between old and new auth
3. Test thoroughly with new system
4. Migrate existing user data (owner account) via migration script
5. Deploy and enable new authentication
6. Remove old hardcoded credentials after verification

### Supabase Considerations
- Consider using **Supabase Auth** service instead of custom tables (evaluate pros/cons)
- If using custom auth: Disable Supabase Auth or configure it separately
- Set up Row Level Security (RLS) policies for all tables
- Create database functions/triggers for automated tasks (e.g., session cleanup)

---

## Success Metrics

1. **Security:** Zero plain-text passwords in database or code
2. **Usability:** 95% of users can log in successfully on first attempt
3. **Password Recovery:** Average time to reset password < 5 minutes
4. **Audit Coverage:** 100% of authentication events logged
5. **Performance:** Login response time < 2 seconds
6. **Session Management:** Zero unauthorized access from expired sessions
7. **User Management:** Owner can create new user in < 2 minutes
8. **Adoption:** All users migrated from hardcoded to database auth within 1 week

---

## Open Questions

1. ~~**Email Service:**~~ **RESOLVED** - Use Gmail SMTP with owner's personal Gmail account and App Password
2. **Email Templates:** Do you have brand guidelines for email design, or should we use simple text emails? simple text emails
3. **Owner Email:** What email address should be used for the initial owner account? benujith@gmail.com
4. ~~**Password Reset Email Sender:**~~ **RESOLVED** - Use owner's personal Gmail address (same as #1)
5. **Supabase Auth vs Custom:** Should we use Supabase's built-in Auth service or build custom authentication? (Supabase Auth provides much of this out-of-the-box) simplest method
6. **IP Address Capture:** Are we comfortable capturing and storing IP addresses for audit/security purposes? (Privacy consideration) yes
7. **Account Lockout Duration:** Is 15 minutes appropriate for temporary lockout after failed attempts, or should it be longer/shorter? its okay
8. **Session Inactivity:** Should sessions expire after X minutes of inactivity, or only based on absolute time? 30 minutes of inactivity ONLY short sessions expire.
9. **Email Verification:** Should new users verify their email address before gaining access? yes
10. **Password Complexity Override:** Should Owner be able to override password requirements when creating users (e.g., for temporary accounts)? no

---

## Implementation Notes for Developer

### Suggested Implementation Order

1. **Phase 1: Database Setup (Days 1-2)**
   - Create migration files for all tables
   - Set up initial owner account
   - Configure indexes and constraints
   - Test database schema

2. **Phase 2: Basic Authentication (Days 3-5)**
   - Implement login form with database validation
   - Create session management
   - Implement logout functionality
   - Add audit logging for login/logout
   - Test authentication flow

3. **Phase 3: Password Recovery (Days 6-8)**
   - Implement forgot password form
   - Create email service integration
   - Build password reset page
   - Test email flow end-to-end

4. **Phase 4: User Management (Days 9-11)**
   - Create user management UI (Owner only)
   - Implement create/edit/deactivate user
   - Add owner override password reset
   - Test all user management operations

5. **Phase 5: Self-Service Password Change (Days 12-13)**
   - Add change password functionality
   - Implement password strength indicator
   - Test password change flow

6. **Phase 6: Audit Logs UI (Days 14-15)**
   - Build audit logs viewer
   - Add filtering and pagination
   - Test log display and filtering

7. **Phase 7: Security Hardening & Testing (Days 16-18)**
   - Implement rate limiting
   - Add session expiration logic
   - Security testing (SQL injection, XSS, etc.)
   - Performance testing

8. **Phase 8: Migration & Deployment (Days 19-20)**
   - Run database migrations in production
   - Deploy new authentication system
   - Monitor for issues
   - Remove old hardcoded credentials

### Gmail SMTP Setup Instructions (For Owner/Developer)

**Step 1: Enable 2-Step Verification on Gmail**
1. Go to https://myaccount.google.com/security
2. Under "Signing in to Google", click "2-Step Verification"
3. Follow the prompts to enable 2FA (use phone number or authenticator app)

**Step 2: Generate App Password**
1. After 2FA is enabled, go back to https://myaccount.google.com/security
2. Under "Signing in to Google", click "App passwords"
3. Select "Mail" as the app, and "Other" as the device
4. Enter "Ayubo Cafe App" as the device name
5. Click "Generate"
6. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)
7. **Important:** Save this password securely - you can't view it again!

**Step 3: Add to Environment Variables**
Create a `.env` file in your project root:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=yourname@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # Your 16-char app password (remove spaces)
EMAIL_FROM="Ayubo Cafe <yourname@gmail.com>"
```

**Step 4: Test Email Sending**
Before deploying, test sending a password reset email to ensure Gmail SMTP is working correctly.

**Troubleshooting:**
- If emails don't send, check that 2FA is enabled
- Verify the app password is correct (copy-paste, remove spaces)
- Check Gmail's "Less secure app access" is NOT blocking (shouldn't be needed with app passwords)
- Ensure port 587 is not blocked by your firewall/network

### Key Testing Scenarios

- Happy path: Login → Use app → Logout
- Forgot password: Request reset → Receive email → Reset password → Login
- **Gmail delivery test:** Send password reset email and verify it arrives in inbox (not spam)
- Owner creates user → User receives email → User logs in first time
- Failed login attempts → Account lockout → Wait → Retry successfully
- Session expiration scenarios (short and long sessions)
- Concurrent sessions on multiple devices
- Owner resets cashier password → Cashier receives notification
- Audit log captures all events correctly

---

**Document Version:** 1.2  
**Created:** 2025-10-18  
**Last Updated:** 2025-10-18  
**Status:** Ready for Implementation  
**Email Service:** Gmail SMTP (Confirmed)  
**Changes in v1.2:** 
- Changed `full_name` to `first_name` and `last_name` for better data structure
- Added `session_expired` action to audit_logs enum
- Added session expiration tracking with `expiration_reason` in details (inactivity, timeout, manual)

