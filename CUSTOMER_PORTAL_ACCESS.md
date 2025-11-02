# Customer Portal Access Guide

## 🎉 What Was Done

I've successfully integrated the customer portal into your application and added navigation links between the staff and customer portals.

## 🔗 How to Access the Portals

### **Customer Portal** (Customer Signup & Login)
- **URL**: `http://localhost:3000/customer`
- **Purpose**: Customers can sign up, log in, browse products, and place orders

### **Staff Portal** (Default)
- **URL**: `http://localhost:3000/`
- **Purpose**: Staff members can manage inventory, process orders, and access admin features

## 📝 Changes Made

### 1. **Integrated Customer Portal into Main App** (`src/main.jsx`)
   - Added routing logic to detect `/customer` path
   - Customer portal uses `CustomerAuthContext`
   - Staff portal uses `AuthContext`

### 2. **Added Navigation Link in Staff Login** (`src/components/auth/LoginForm.jsx`)
   - Added "Go to Customer Portal" link at the bottom of staff login page
   - Located below the security note

### 3. **Added Navigation Link in Customer Login** (`src/components/customer/CustomerLogin.jsx`)
   - Added "Go to Staff Portal" link at the bottom of customer login page
   - Allows customers to navigate back if they're staff

## 🚀 How to Use

### For Customers:
1. Visit `http://localhost:3000/customer`
2. You'll see the customer login page with a beautiful gradient design (🍰 Ayubo Cafe)
3. Click **"Sign up"** to create a new account:
   - **Step 1**: Enter your Sri Lankan phone number (+94 format)
   - **Step 2**: Enter the 6-digit OTP code sent to your phone
   - **Step 3**: Complete your profile (name, email, birthday, address)
4. Once signed up, you can:
   - Browse products
   - Add items to cart
   - Request custom cakes
   - Track orders
   - Manage your profile

### For Staff:
1. Visit `http://localhost:3000/` (default)
2. Log in with staff credentials
3. Access all admin features (billing, products, sales, users, audit logs)

## 🔄 Navigation Between Portals

### From Staff Login → Customer Portal:
At the bottom of the staff login page, click **"Go to Customer Portal"**

### From Customer Login → Staff Portal:
At the bottom of the customer login page, click **"Go to Staff Portal"**

## 📱 Customer Portal Features

The customer portal already includes:
- ✅ **Phone-based authentication** (OTP via SMS)
- ✅ **Multi-step signup form** with validation
- ✅ **Product browsing gallery** with categories & search
- ✅ **Shopping cart** with quantity management
- ✅ **Custom cake requests**
- ✅ **Order tracking**
- ✅ **Customer profile management**
- ✅ **Mobile-first responsive design**

## 🎨 Design Differences

### Staff Portal:
- Blue gradient background
- Professional business interface
- Desktop-focused layout

### Customer Portal:
- Pink-to-purple gradient background
- Consumer-friendly interface
- Mobile-first design with bottom navigation
- Large, touch-friendly buttons

## 🧪 Testing

To test the customer portal:

```bash
# Start the development server
npm run dev

# Visit in your browser
http://localhost:3000/customer
```

**Note**: In development mode, OTP codes will be logged to the browser console for testing purposes.

## 📂 Key Files

- **Router**: `src/main.jsx`
- **Customer Portal**: `src/components/customer/CustomerApp.jsx`
- **Customer Login**: `src/components/customer/CustomerLogin.jsx`
- **Customer Signup**: `src/components/customer/CustomerSignup.jsx`
- **Staff Login**: `src/components/auth/LoginForm.jsx`
- **Staff Portal**: `src/App.jsx`

## ✨ Summary

The customer signup page **already had navigation** to the login page (and vice versa) via the `onSwitchToLogin` and `onSwitchToSignup` callbacks. What was missing was a way to access the customer portal from the main application.

Now you have:
- ✅ **URL-based routing** (`/customer` for customers, `/` for staff)
- ✅ **Cross-portal navigation** (links between staff and customer portals)
- ✅ **Separate authentication contexts** for staff and customers
- ✅ **Beautiful, mobile-friendly customer interface**

Enjoy your integrated customer ordering system! 🎉

