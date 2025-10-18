# Ayubo Cafe - Billing System

A modern React-based billing system for Ayubo Cafe with product management, cart functionality, sales reporting, inventory management, and dynamic product sorting.

## ⚠️ IMPORTANT: Database Migrations Required

**If you're setting up or updating this project, you MUST run database migrations first!**

See: [Database Migrations Guide](database/README.md)

## Features

### Core Features
- **User Roles**: Guest (billing only), Cashier (products & billing), Owner (full access including sales reports)
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

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Supabase** - Backend database
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

## User Credentials

- **Guest**: No password required (billing only)
- **Cashier**: Password: `cashier123`
- **Owner**: Password: `Sokian@1997`

## Project Structure

```
ayubo_cafe/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   └── icons/          # SVG icon components
│   ├── config/
│   │   └── supabase.js     # Supabase client configuration
│   ├── App.jsx             # Main application component
│   ├── main.jsx            # Application entry point
│   └── index.css           # Global styles and Tailwind imports
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Usage

### For Guests
1. Select "Guest" role and login
2. Browse products and add to cart
3. Generate and save bills

### For Cashiers
1. Login with cashier credentials
2. Access product management to add/edit/delete products
3. Manage billing operations

### For Owners
1. Login with owner credentials
2. Full access to all features
3. View sales reports and analytics
4. Delete bills if needed

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

