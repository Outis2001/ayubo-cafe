# 👤 Owner User Guide - Ayubo Cafe

**For:** System Administrators and Owners  
**Version:** 1.0  
**Last Updated:** October 19, 2025

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Creating New Users](#creating-new-users)
3. [Managing Users](#managing-users)
4. [Resetting User Passwords](#resetting-user-passwords)
5. [Viewing Audit Logs](#viewing-audit-logs)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Getting Started

### Your Owner Account

**Username:** `owner`  
**Initial Password:** `Sokian@1997` (Change this immediately!)  
**Email:** Your configured email address

### Accessing the System

1. Open Ayubo Cafe in your web browser
2. Enter your username and password
3. Check "Remember Me" for longer sessions (7 days)
4. Click "Login"

### Your Dashboard

As an owner, you have access to all features:
- **Billing** - Process sales and manage cart
- **Products** - Add, edit, and manage product inventory
- **Sales** - View sales reports and analytics
- **Users** - Manage user accounts (Owner only)
- **Audit Logs** - View system activity logs (Owner only)
- **Settings** - Change your password and configure system

---

## 👥 Creating New Users

### Step-by-Step Guide

**1. Navigate to User Management**
- Click your name in the top-right corner
- Select **"Users"** from the dropdown menu

**2. Start User Creation**
- Click the blue **"Create User"** button at the top

**3. Fill in User Information**

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Username** | ✅ Yes | Login username (3-50 chars, alphanumeric + underscore) | `john_doe` |
| **Email** | ✅ Yes | User's email address (for password resets) | `john@example.com` |
| **First Name** | ✅ Yes | User's first name | `John` |
| **Last Name** | ✅ Yes | User's last name | `Doe` |
| **Phone** | ❌ No | Contact phone number (optional) | `+94771234567` |
| **Role** | ✅ Yes | User role (Owner or Cashier) | `Cashier` |
| **Password** | ✅ Yes | Temporary password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char) | `TempPass@123` |

**4. Review Password Requirements**

The password strength indicator will show:
- ⚫ **Weak** - Missing requirements (red)
- 🟡 **Medium** - Meets requirements, 8-9 characters (yellow)
- 🟢 **Strong** - Meets requirements, 10+ characters (green)

**5. Submit**
- Click **"Create User"**
- Wait for confirmation message

**6. What Happens Next**

The new user will receive **TWO emails**:

1. **Welcome Email** 📧
   - Contains their username and temporary password
   - Instructions for first login

2. **Verification Email** ✉️
   - Contains a verification link (valid for 24 hours)
   - User MUST click this link to verify their email before logging in

**7. Inform the User**

Tell the new user to:
1. Check their email inbox (and spam folder)
2. Click the "Verify Email Address" button
3. Login with the credentials you provided
4. Change their password after first login

---

## 🔧 Managing Users

### View All Users

From the Users page, you can see:
- Username
- Full Name (First + Last)
- Email
- Role (Owner/Cashier)
- Status (Active/Inactive)
- Last Login time

### Edit User Details

**1. Find the User**
- Use the search bar to filter by name, username, or email
- Click the **Edit** icon (✏️) next to the user

**2. Update Information**

You can change:
- ✅ First Name
- ✅ Last Name
- ✅ Email (must be unique)
- ✅ Phone
- ✅ Role (Owner/Cashier)
- ❌ Username (cannot be changed)

**3. Save Changes**
- Click **"Update User"**
- Changes are saved immediately

### Deactivate/Activate Users

**Deactivate a User:**
1. Click the **Deactivate** button (🚫) next to the user
2. Confirm the action
3. User is immediately locked out
4. All active sessions are terminated

**What happens when deactivated:**
- ❌ User cannot login
- ❌ All sessions are invalidated
- ✅ User data is preserved
- ✅ Can be reactivated anytime

**Activate a User:**
1. Click the **Activate** button (✅) next to the inactive user
2. User can immediately login again

---

## 🔑 Resetting User Passwords

There are **two ways** to reset a user's password:

### Method 1: Owner Override (Immediate)

**When to use:** User forgot password and needs immediate access

**Steps:**
1. Navigate to **Users** page
2. Find the user
3. Click the **Reset Password** icon (🔑)
4. Enter a new temporary password
5. Click **"Reset Password"**

**What happens:**
- Password is changed immediately
- All user's sessions are invalidated
- User is logged out from all devices
- User receives notification email

**After reset:**
- Give the new temporary password to the user
- Tell them to login and change their password immediately

### Method 2: Email Reset Link (User Self-Service)

**When to use:** User can access their email

**Steps:**
1. User clicks **"Forgot Password?"** on login page
2. User enters their email or username
3. User receives password reset email (valid for 1 hour)
4. User clicks the reset link
5. User enters new password
6. User can login with new password

**As Owner, you don't need to do anything!** This is fully automated.

---

## 📊 Viewing Audit Logs

### Accessing Audit Logs

1. Click your name in the top-right corner
2. Select **"Audit Logs"** from the dropdown menu

### What You Can See

Audit logs record all system activities:

| Event Type | Description |
|------------|-------------|
| **login** | Successful user login |
| **logout** | User logged out |
| **failed_login** | Failed login attempt (with reason) |
| **password_change** | User changed their own password |
| **password_reset** | Password reset via email or owner override |
| **user_created** | New user account created |
| **user_updated** | User details modified |
| **user_activated** | Inactive user was activated |
| **user_deactivated** | User was deactivated |
| **session_expired** | Session expired (timeout or inactivity) |

### Reading the Logs

Each log entry shows:
- **Timestamp** - When the event occurred
- **User** - Who performed the action (or who was affected)
- **Action** - What happened
- **Status** - Success (green) or Failure (red)
- **IP Address** - Where the action came from
- **Details** - Additional context (click to expand)

### Filtering Logs

Use the filters at the top:
- **Date Range** - Select start and end dates
- **User** - Filter by specific user
- **Action Type** - Filter by event type
- **Status** - Show only successes or failures

### Exporting Logs (Optional)

If you need to save logs:
1. Use the filters to show only relevant logs
2. Take a screenshot, or
3. Contact your developer to add CSV export feature

### Security Monitoring

**Watch for:**
- 🔴 Multiple failed login attempts (possible attack)
- 🔴 Logins from unusual IP addresses
- 🔴 Password changes you didn't authorize
- 🔴 User accounts created that you don't recognize

---

## ✅ Best Practices

### User Management

**Do:**
- ✅ Create strong temporary passwords (10+ characters)
- ✅ Tell users to change their password after first login
- ✅ Deactivate users who leave the company immediately
- ✅ Review active users monthly
- ✅ Check audit logs weekly

**Don't:**
- ❌ Share your owner password with anyone
- ❌ Create users with weak passwords
- ❌ Forget to deactivate former employees
- ❌ Use the same temporary password for multiple users

### Password Security

**Strong Password Example:** `MyC@fe2025!Secure`
- 10+ characters ✅
- Uppercase and lowercase ✅
- Numbers ✅
- Special characters ✅
- Not a dictionary word ✅

**Weak Password Example:** `password123`
- Too short ❌
- No special characters ❌
- Common word ❌
- Easily guessed ❌

### Session Management

**Understanding Sessions:**
- **Without "Remember Me"** - 8 hours, 30-minute inactivity timeout
- **With "Remember Me"** - 7 days, no inactivity timeout

**Session Limits:**
- **Owner** - Only 1 active session (your login will kick out any other active owner session)
- **Cashier** - Up to 3 active sessions (useful for shift changes)

### Email Verification

**Important:**
- All new users MUST verify their email before logging in
- Verification links expire after 24 hours
- Users can request a new link from the login page
- Owner account is pre-verified (no verification needed)

---

## 🐛 Troubleshooting

### User Can't Login

**Problem:** "Please verify your email before logging in"

**Solution:**
1. User needs to check their email for verification link
2. Click "Resend Verification Email" button on login page
3. Check spam folder
4. As owner, you can deactivate and reactivate the user to trigger a new verification email

---

**Problem:** "Invalid username or password"

**Solution:**
1. Check if username is spelled correctly (case-sensitive)
2. Check if Caps Lock is on
3. Reset password using owner override
4. Check if user account is active

---

**Problem:** "Account is deactivated"

**Solution:**
1. Go to Users page
2. Find the user
3. Click "Activate" button

---

**Problem:** "Too many failed attempts. Try again in 15 minutes"

**Solution:**
- User is temporarily locked out after 5 failed login attempts
- Wait 15 minutes, or
- Use a different device/browser (lockout is per-device)

---

### Email Not Received

**Problem:** User didn't receive welcome/verification email

**Solution:**
1. Check user's spam/junk folder
2. Verify email address is correct in Users page
3. User can request resend from login page
4. Contact your system administrator to check email configuration

---

### Password Reset Issues

**Problem:** Reset link expired

**Solution:**
- Reset links are valid for 1 hour only
- Request a new reset link
- Or use owner override to reset immediately

---

**Problem:** Reset link already used

**Solution:**
- Each reset link can only be used once
- Request a new reset link if needed

---

### Audit Log Questions

**Problem:** Can't find specific event

**Solution:**
1. Use date range filter to narrow down timeframe
2. Use user filter to show only one user's actions
3. Use action type filter to show only specific events
4. Remember: logs are sorted newest first

---

**Problem:** Too many failed login attempts in logs

**Solution:**
1. Check if it's a specific user (could be forgotten password)
2. Check if it's from unusual IP (possible security issue)
3. Consider resetting that user's password
4. If many different users, could be an attack - contact IT support

---

## 📞 Support

### Getting Help

**For technical issues:**
- Contact your system administrator
- Check the main README.md file
- Review EMAIL_SETUP_GUIDE.md for email issues

**For feature requests:**
- Document what you need
- Discuss with your development team

### Emergency Contacts

**Lost Owner Password:**
- If you lose your owner password and can't reset it, you'll need database access
- Contact your system administrator or developer
- They can reset it directly in the database

**System Down:**
- Check if server is running
- Check internet connection
- Contact hosting provider
- Contact system administrator

---

## 📚 Quick Reference

### Common Tasks Checklist

**Creating a New Cashier:**
- [ ] Click Users → Create User
- [ ] Fill in all required fields
- [ ] Set role to "Cashier"
- [ ] Create strong temporary password
- [ ] Click "Create User"
- [ ] Inform user to check email
- [ ] Tell user to verify email
- [ ] Provide temporary password
- [ ] Remind them to change password after login

**Resetting a User's Password:**
- [ ] Click Users → Find user
- [ ] Click Reset Password icon (🔑)
- [ ] Enter new temporary password
- [ ] Click "Reset Password"
- [ ] Give new password to user
- [ ] Tell user to change it immediately

**Deactivating a User:**
- [ ] Click Users → Find user
- [ ] Click Deactivate button
- [ ] Confirm action
- [ ] User is immediately logged out

**Checking Audit Logs:**
- [ ] Click your name → Audit Logs
- [ ] Set date range filter
- [ ] Select user/action filters if needed
- [ ] Review entries
- [ ] Note any suspicious activity

---

## 🎓 Training Resources

### New Owner Training

**Day 1: Basics**
- Login and navigation
- Understanding the dashboard
- Creating your first user
- Changing your password

**Day 2: User Management**
- Creating multiple users
- Editing user details
- Activating/deactivating users
- Password resets

**Day 3: Security & Monitoring**
- Understanding audit logs
- Identifying security issues
- Best practices for password management
- Session management

### Practice Exercises

**Exercise 1: Create a Test User**
1. Create a cashier named "Test Cashier"
2. Use your own email to receive the emails
3. Verify the email
4. Login as the test user
5. Change the password
6. Logout

**Exercise 2: Password Reset**
1. As test user, use "Forgot Password?"
2. Receive reset email
3. Click reset link
4. Set new password
5. Login with new password

**Exercise 3: Audit Log Review**
1. Go to Audit Logs
2. Find your login event
3. Find the test user creation event
4. Find the password change event
5. Practice using filters

---

**Document Version:** 1.0  
**Created:** October 19, 2025  
**For:** Ayubo Cafe System Owners  
**Status:** ✅ Complete

---

**Remember:** With great power comes great responsibility! As an owner, you have full access to the system. Use it wisely and keep your credentials secure. 🔐

