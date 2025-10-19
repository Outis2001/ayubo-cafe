# Ayubo Cafe - Billing System

A modern React-based billing system for Ayubo Cafe with product management, cart functionality, sales reporting, inventory management, and dynamic product sorting.

## ⚠️ IMPORTANT: Database Migrations Required

**If you're setting up or updating this project, you MUST run database migrations first!**

See: [Database Migrations Guide](database/README.md)

## Features

### Core Features
- **🔐 Database-Driven Authentication**: Secure login system with password hashing and session management
- **👥 User Management**: Owner can create, edit, and deactivate user accounts
- **🔒 Password Recovery**: Email-based password reset with owner override capability
- **📋 Audit Logging**: Complete tracking of authentication events and user actions
- **User Roles**: Guest (billing only), Cashier (products & billing), Owner (full access)
- **Product Management**: Add, edit, and delete products with support for weight-based pricing
- **Cart System**: Add products to cart, adjust quantities, and generate bills
- **Sales Reports**: Track daily sales, total sales, and item-wise sales (Owner only)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Database**: Powered by Supabase for data persistence

### 🆕 Inventory Management
- **📦 Stock Tracking**: Real-time inventory levels for all products
- **📋 Daily Check-In**: Automated daily stock updates with bulk editing
- **⚠️ Low Stock Alerts**: Color-coded warnings for products running low
- **🚫 Out-of-Stock Prevention**: Automatic blocking of unavailable products
- **📊 Stock Validation**: Prevents over-selling with real-time checks
- **🔄 Automatic Deduction**: Stock automatically decreases after sales
- **⚖️ Weight-Based Support**: Precise decimal tracking for kg-based products

### 🆕 Dynamic Product Sorting (NEW!)
- **🔥 Smart Sorting**: Products automatically arranged by sales performance
- **⚙️ Configurable Window**: Owner can set N value (all-time or last N orders)
- **📊 Sales Badges**: Fire emoji 🔥 on mobile, "Sold: X" on desktop (owner-only)
- **💾 5-Minute Cache**: Reduces database load while keeping data fresh
- **🔄 Real-Time Updates**: Products resort automatically after each sale
- **🎯 Efficiency Boost**: Popular items appear first for faster checkout
- **📱 Responsive**: Works beautifully on all devices

### 🆕 Authentication & Security
- **🔐 Secure Login**: bcrypt password hashing with session-based authentication
- **🔑 Password Management**: Self-service password change and forgot password flow
- **📧 Email Integration**: Gmail SMTP for password reset and user notifications
- **🛡️ Session Security**: Automatic expiration (8 hours default, 7 days with "Remember Me")
- **⏱️ Inactivity Timeout**: 30-minute inactivity detection for short sessions
- **🚫 Rate Limiting**: 5 failed attempts = 15-minute lockout
- **👤 Role-Based Sessions**: Owner (1 session max), Cashier (3 sessions max)
- **📊 Audit Logs**: Complete tracking of logins, logouts, password changes, and user management

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Supabase** - Backend database (PostgreSQL)
- **bcryptjs** - Password hashing
- **Nodemailer** - Email service (optional, for password reset)
- **JavaScript (ES6+)** - Programming language

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository** (or ensure you're in the project directory):
   ```bash
   cd ayubo_cafe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Supabase** (Optional):
   
   The project comes with default Supabase credentials. If you want to use your own:
   
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Database Setup**:
   
   Make sure your Supabase database has the following tables:

   **products** table:
   ```sql
   CREATE TABLE products (
     id BIGINT PRIMARY KEY,
     name TEXT NOT NULL,
     price DECIMAL NOT NULL,
     is_weight_based BOOLEAN DEFAULT FALSE
   );
   ```

   **bills** table:
   ```sql
   CREATE TABLE bills (
     id SERIAL PRIMARY KEY,
     date TEXT NOT NULL,
     product_id BIGINT,
     product_name TEXT NOT NULL,
     product_price DECIMAL NOT NULL,
     quantity DECIMAL NOT NULL,
     total DECIMAL NOT NULL,
     paid_amount DECIMAL,
     balance DECIMAL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

## Running the Application

### Development Mode

Start the development server:
```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

### Build for Production

Create an optimized production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Authentication Setup

### Initial Owner Account

After running the database migration (`004_user_authentication_migration.sql`), an owner account is automatically created:

- **Username**: `owner`
- **Email**: `benujith@gmail.com`
- **Password**: `Cafe@2025`
- **Role**: Owner (full access)

⚠️ **IMPORTANT**: Change this password immediately after first login!

### Creating Additional Users

**As Owner:**
1. Login to the application
2. Navigate to **Users** page (owner-only access)
3. Click **"Create User"**
4. Fill in user details:
   - First Name & Last Name
   - Username (3-50 characters)
   - Email (must be unique)
   - Temporary Password
   - Role (Owner or Cashier)
5. User receives welcome email with credentials (in development, check console)

### Password Requirements

All passwords must meet these requirements:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter
- ✅ At least 1 number
- ✅ At least 1 special character (!@#$%^&*())

### Session Management

**Owner Accounts:**
- Maximum 1 active session
- New login automatically logs out all other devices
- Strictest security for privileged accounts

**Cashier Accounts:**
- Maximum 3 active sessions
- Can use multiple devices simultaneously
- Oldest session removed when limit exceeded

**Session Duration:**
- **Standard**: 8 hours (with 30-minute inactivity timeout)
- **Remember Me**: 7 days (no inactivity timeout)

### Password Recovery

**Self-Service:**
1. Click **"Forgot Password?"** on login page
2. Enter username or email
3. Receive reset link via email (check console in dev mode)
4. Click link and set new password
5. Reset links expire after 1 hour

**Owner Override:**
1. Login as Owner
2. Go to **Users** page
3. Click 🔑 button next to any user
4. Set new temporary password
5. User's other sessions are invalidated

### Email Configuration (Optional)

For production password reset emails, configure Gmail SMTP:

1. **Create `.env` file** in project root:
   ```env
   # Email Configuration (Gmail SMTP)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM="Ayubo Cafe <your-email@gmail.com>"
   EMAIL_DEBUG=false
   ```

2. **Generate Gmail App Password**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Search for "App passwords"
   - Generate password for "Mail"
   - Copy 16-character password to `EMAIL_PASSWORD`

3. **Test in Development**:
   - Emails are logged to console by default
   - Set `EMAIL_DEBUG=true` to see full email content
   - In production, actual emails will be sent

📚 **Full Setup Guide**: See [EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md)

### Audit Logs (Owner Only)

Track all security events:
- ✅ User logins and logouts
- ✅ Failed login attempts (with rate limiting)
- ✅ Password changes (self-service & admin reset)
- ✅ User account creation, updates, deactivation
- ✅ Session expirations (inactivity, timeout, manual)

**Access:** Navigate to **Audit** page from owner dashboard

**Features:**
- Filter by username, action, status, IP address
- Date range filtering
- Pagination (20 logs per page)
- Export to CSV
- Detailed event information

## Project Structure

```
ayubo_cafe/
├── database/
│   ├── migrations/
│   │   ├── 004_user_authentication_migration.sql       # Authentication schema
│   │   └── 004_user_authentication_rollback.sql       # Rollback script
│   ├── run-auth-migration.js    # Migration guide script
│   └── README.md                 # Database setup guide
├── public/
│   └── index.html                # HTML template
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx              # Login interface
│   │   │   ├── ForgotPasswordForm.jsx     # Password recovery
│   │   │   ├── ResetPasswordForm.jsx      # Password reset
│   │   │   └── ChangePasswordForm.jsx     # Self-service password change
│   │   ├── icons/                         # SVG icon components
│   │   ├── UserManagement.jsx             # User CRUD (owner only)
│   │   ├── AuditLogs.jsx                  # Audit log viewer (owner only)
│   │   ├── ProductsPage.jsx               # Product management page
│   │   ├── SalesPage.jsx                  # Sales analytics page
│   │   └── DailyStockCheckIn.jsx          # Stock update modal
│   ├── context/
│   │   └── AuthContext.jsx                # Authentication state management
│   ├── config/
│   │   └── supabase.js                    # Supabase client configuration
│   ├── hooks/
│   │   ├── useSession.js                  # Session management hook
│   │   ├── useSortConfig.js               # Product sorting hook
│   │   └── useStockCheckIn.js             # Stock check-in hook
│   ├── utils/
│   │   ├── auth.js                        # Password hashing, token generation
│   │   ├── validation.js                  # Input validation
│   │   ├── session.js                     # Session CRUD operations
│   │   ├── rateLimiter.js                 # Login rate limiting
│   │   ├── email.js                       # Email sending (Nodemailer)
│   │   ├── auditLog.js                    # Audit logging utilities
│   │   ├── inventory.js                   # Stock management
│   │   └── productSorting.js              # Sales-based sorting
│   ├── App.jsx                            # Main application component
│   ├── main.jsx                           # Application entry point
│   └── index.css                          # Global styles and Tailwind imports
├── tasks/
│   └── 0003-prd-database-user-authentication.md   # Authentication PRD & tasks
├── .env.example                           # Environment variables template
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── EMAIL_SETUP_GUIDE.md                   # Gmail SMTP setup guide
└── README.md
```

## Usage

### First-Time Setup

1. **Run Database Migration**: Follow [Database Migrations Guide](database/README.md)
2. **Login as Owner**: Use initial credentials (`owner` / `Cafe@2025`)
3. **Change Password**: Immediately change the default password
4. **(Optional) Configure Email**: Set up Gmail SMTP for password recovery
5. **Create Cashier Accounts**: Add staff members through User Management

### For Cashiers

**Login:**
1. Enter username and password provided by owner
2. Choose "Remember Me" for 7-day session (optional)
3. Access billing and product management

**Features:**
- ✅ View and manage products
- ✅ Process sales and generate bills
- ✅ Update stock quantities
- ✅ Change own password
- ✅ Request password reset via email

### For Owners

**Login:**
1. Use owner credentials
2. Single session policy (new login kicks out other devices)

**Features:**
- ✅ All cashier features, plus:
- ✅ View sales analytics and reports
- ✅ Create, edit, and deactivate user accounts
- ✅ Reset passwords for any user
- ✅ View complete audit logs
- ✅ Configure product sorting (N-value)
- ✅ Access user management dashboard

## Features in Detail

### Product Management
- Add new products with name, price, and weight-based pricing option
- Edit existing products
- Delete products (with confirmation)
- Weight-based products (e.g., cakes sold by kg)

### Billing System
- Search and filter products
- Add products to cart
- Adjust quantities
- Special handling for weight-based products
- Calculate total, paid amount, and balance
- Save bills to database

### Sales Reports (Owner Only)
- Today's sales summary
- Total sales across all time
- Item-wise sales analysis
- Recent bills with details
- Delete bills functionality

## Deployment

### Deploy to Vercel
```bash
npm run build
# Deploy the 'dist' folder to Vercel
```

### Deploy to Netlify
```bash
npm run build
# Deploy the 'dist' folder to Netlify
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, Vite will automatically use the next available port.

### Database Connection Issues
- Verify your Supabase URL and API key in `.env`
- Check your Supabase project is active
- Ensure tables are created with correct schema

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `rm -rf .vite`

## License

This project is private and proprietary to Ayubo Cafe.

## Support

For issues or questions, contact the development team.

---

**Note**: The original single-file HTML version has been preserved as `index.html` in the root directory for reference.

