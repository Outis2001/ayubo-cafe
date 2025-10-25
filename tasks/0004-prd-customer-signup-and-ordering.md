# PRD: Customer Signup and Ordering System

## Introduction/Overview

This document outlines the requirements for implementing a complete customer-facing ordering system for Ayubo Cafe. The system will allow customers to sign up using their phone numbers with SMS OTP verification, browse available cakes, place orders for pre-made cakes, and request custom cakes. The feature will also include enhanced order management pages for owners and cashiers to process customer orders, send quotes for custom cakes, and manage the order lifecycle.

**Problem Statement:** Currently, the cafe management system is designed for internal staff (admin, owner, cashier) only. There is no way for customers to directly browse products and place orders online, requiring all orders to be taken manually.

**Goal:** Enable customers to independently sign up, browse the cafe's cake offerings, place orders with advance payments, and track their orders, while providing staff with tools to manage these customer orders efficiently.

## Goals

1. Enable secure customer registration using phone number verification via SMS OTP
2. Create a dedicated customer portal for browsing and ordering cakes
3. Support both pre-made cake orders and custom cake requests
4. Implement partial payment (40% deposit) with support for online payment and bank transfer
5. Provide order tracking and history for customers
6. Create enhanced order management interface for owners and cashiers
7. Enable staff to review custom cake requests and send quotes(price with weight) to customers
8. Maintain clear separation between customer and staff user roles and permissions

## User Stories

### Customer Stories

1. **As a new customer**, I want to sign up using my phone number with OTP verification so that I can securely create an account.

2. **As a customer**, I want to optionally provide my email address during signup so that I can receive order confirmations and promotional offers.

3. **As a customer**, I want to browse available cakes organized by categories so that I can find the perfect cake for my occasion.

4. **As a customer**, I want to order a pre-made cake with delivery details so that I can have it delivered on my chosen date.

5. **As a customer**, I want to upload an image of a custom cake design with notes so that I can request a personalized cake.

6. **As a customer**, I want to receive price quotes for custom cake requests so that I can decide whether to proceed with the order.

7. **As a customer**, I want to pay 40% deposit via online payment or bank transfer so that I can confirm my order.

8. **As a customer**, I want to track my orders and view order history so that I know the status of my purchases.

### Staff Stories

9. **As an owner/cashier**, I want to view all customer orders in a dedicated page so that I can process them efficiently.

10. **As an owner/cashier**, I want to review custom cake requests with uploaded images so that I can determine pricing and feasibility.

11. **As an owner/cashier**, I want to send price quotes with quantity options to customers so that they can confirm custom orders.

12. **As an owner/cashier**, I want to update order status so that customers can track their orders in real-time.

## Functional Requirements

### 1. Customer Authentication & Signup

#### 1.1 Phone Number Registration
- The system must allow new users to sign up using a valid Sri Lankan phone number (LK +94 format)
- Phone number validation must enforce correct format (e.g., +94XXXXXXXXX or 0XXXXXXXXX)
- The system must prevent duplicate phone numbers from being registered

#### 1.2 OTP Verification
- The system must send a 6-digit OTP code to the provided phone number via SMS using a configurable webhook URL
- OTP expiration time must be configurable (stored in environment/config)
- OTP resend attempts must be limited to 5 attempts per signup session
- The system must rate-limit OTP requests to prevent abuse (e.g., max 3 OTP requests per phone number per hour)
- Users must verify their phone number before gaining access to the customer portal

#### 1.3 User Information Collection
- The system must collect the following during signup:
  - Phone number (required)
  - Email address (optional)
  - First name (required)
  - Last name (required)
  - Address (optional)
  - Birthday (optional)
- The system should make these fields configurable if possible (for future flexibility)
- All new users must be assigned the role "customer" by default
- Customer accounts must be marked as "pending verification" until phone OTP is confirmed

#### 1.4 Phone Number Usage via Webhook URL
  - Order confirmation messages
  - Promotional messages
  - Password reset functionality (future consideration)
  - Custom cake quote notifications

#### 1.5 Email Usage
- If email is provided, the system must use it for:
  - Order confirmation emails
  - Promotional emails
  - Password reset functionality (future consideration)
  - Custom cake quote notifications

### 2. Customer Portal - Product Browsing

#### 2.1 Cake Gallery Display
- The system must display a comprehensive gallery of all available cakes
- Cakes must be organized into categories (e.g., Birthday Cakes, Wedding Cakes, Cupcakes, etc.)
  - Categories must be configurable list
- The system must highlight featured/popular cakes
- Each cake listing must display:
  - Cake image
  - Name
  - Description
  - Multiple price options with corresponding weights (e.g., 500g - LKR 1500, 1kg - LKR 2800)
  - Category/Categories
  - Availability status

#### 2.2 Product Search & Filtering
- Customers must be able to filter cakes by category
- Customers should be able to search cakes by name

#### 2.3 Product Details
- Customers must be able to view detailed information about each cake
- Detail view should include multiple images if available

### 3. Customer Portal - Pre-made Cake Orders

#### 3.1 Order Placement
- Customers must be able to add pre-made cakes to an order
- For each pre-made cake order, customers must provide:
  - Weight/size option (which determines the price)
  - Quantity
  - Pickup date and time
  - Special instructions (optional text field)
- Date selection validation:
  - System must check `order_holds` table to prevent selection of blocked dates
  - Dates with active holds should be visually disabled in date picker
  - If customer attempts to select a blocked date, show error message with hold reason
  - System should enforce minimum and maximum advance order days (configurable)

#### 3.2 Order Summary
- The system must display an order summary showing:
  - Selected items with quantities
  - Subtotal
  - Required deposit amount (40% of total)
  - Total amount
  - Remaining balance due on delivery/pickup

### 4. Customer Portal - Custom Cake Requests

#### 4.1 Custom Cake Request Submission
- Customers must be able to submit custom cake requests
- For each custom request, customers must provide:
  - Image upload (reference image of desired cake design)
  - Text notes describing requirements (Occasion, Age, Colors, Writing)
  - Desired pickup date and time
- Image uploads must be validated (file type: JPG, PNG, max size: 10MB)
- Date selection validation:
  - Same validation as pre-made orders
  - System must check `order_holds` table to prevent selection of blocked dates
  - Enforce minimum/maximum advance order days

#### 4.2 Custom Cake Quote Process
- After submission, custom requests must be marked as "pending review"
- Customers must be able to view the status of their custom requests
- When staff reviews the request and sends a quote, customer must receive:
  - Notification (SMS and/or email)
  - Price quote
  - Quantity/size options
  - Estimated preparation time
- Customers must be able to approve or negotiate the quote
- Upon approval, the system must convert the request into an order requiring deposit payment

### 5. Payment Processing

#### 5.1 Payment Methods
- The system must support two payment methods:
  1. Online payment gateway integration
  2. Bank transfer (manual verification)

#### 5.2 Deposit Requirement
- The system must calculate and require 40% deposit payment at order placement
- The system must clearly display:
  - Deposit amount (40%)
  - Remaining balance (60%)
  - Total amount
  - Payment due on delivery/pickup

#### 5.3 Bank Transfer Process
- For bank transfer option, the system must:
  - Display bank account details
  - Request upload of payment receipt
  - Mark order as "pending payment verification"
  - Allow staff to verify and confirm payment

#### 5.4 Online Payment Process
- For online payment, the system must:
  - Integrate with payment gateway(Stripe)
  - Process payment securely
  - Automatically update order status on successful payment
  - Handle failed payments gracefully

### 6. Order Tracking & History

#### 6.1 Order Status Tracking
- Customers must be able to view real-time status of their orders
- Order statuses include:
  - Pending Payment
  - Payment Verified
  - Confirmed
  - In Preparation
  - Ready for Delivery/Pickup
  - Completed
  - Cancelled

#### 6.2 Order History
- Customers must be able to view a complete history of all orders
- Order history must display:
  - Order date
  - Order items
  - Total amount
  - Payment status
  - Delivery status
  - Order status

#### 6.3 Notifications
- Customers must receive notifications for:
  - Order confirmation
  - Payment verification
  - Custom cake quotes
  - Order status updates
  - Delivery/pickup reminders

### 7. Staff Portal - Customer Order Management

#### 7.1 Customer Orders Page (New)
- The system must create a new dedicated page for viewing customer orders
- Both "owner" and "cashier" roles must have access to this page
- The page must display all customer orders with:
  - Customer name and phone
  - Order ID
  - Order date
  - Order type (pre-made/custom)
  - Status
  - Payment status
  - Delivery date
  - Total amount

#### 7.2 Order Filtering & Search
- Staff must be able to filter orders by:
  - Status
  - Date range
  - Payment status
  - Order type
- Staff must be able to search orders by:
  - Customer name
  - Phone number
  - Order ID

#### 7.3 Order Details & Management
- Staff must be able to click on an order to view full details
- For each order, staff must be able to:
  - Update order status
  - Verify payments (for bank transfers)
  - View customer information
  - View delivery details
  - Add internal notes

#### 7.4 Custom Cake Request Review
- Staff must see custom cake requests highlighted/separated
- For each custom request, staff must be able to:
  - View uploaded reference image
  - Read customer notes
  - View requested delivery date
  - Send quote with:
    - Multiple price options with corresponding weights (e.g., 1kg - LKR 3500, 1.5kg - LKR 5000)
    - Estimated preparation time
    - Additional notes
- The system must automatically notify customer when quote is sent

#### 7.5 Notifications & Custom Orders Page (New)
- The system must create a dedicated "Notifications" page for staff to manage custom cake requests
- Both "owner" and "cashier" roles must have access to this page
- The page must display:
  - All pending custom cake requests requiring review
  - Recent custom cake requests with their status
  - Customer details (name, phone, email)
  - Request details (image, notes, delivery date)
  - Quick action buttons to send quotes
- The page must support:
  - Filtering by status (pending review, quoted, approved, rejected)
  - Sorting by date, delivery date
  - Search by customer name or phone
- Real-time or periodic updates when new custom requests arrive
- Visual indicators for urgent requests (delivery date approaching)

#### 7.6 Order Holds Management (Owner Only)
- The system must provide a way for owners to manage order holds (blocked dates)
- ONLY users with "owner" role can access this functionality
- Owners must be able to:
  - View all current and upcoming order holds
  - Create new order holds by selecting date(s) and providing a reason
  - Deactivate/remove order holds
  - View which dates are blocked for customer orders
- When an order hold is active:
  - Customers cannot select that date for pickup when placing orders
  - The date picker should disable or mark blocked dates
  - A message should explain why the date is unavailable
- Use cases for order holds:
  - Kitchen at full capacity for a specific date
  - Holidays or special events when the cafe is closed
  - Planned maintenance or renovations
  - Peak dates that are already fully booked

#### 7.7 In-App Notifications System
- The system must implement an in-app notification system for staff
- Notification bell icon in staff interface showing unread count
- Notification panel/dropdown showing recent notifications with:
  - Notification type (new order, custom request, payment pending, quote response)
  - Customer name
  - Brief description
  - Timestamp
  - Read/unread status
- Clicking a notification should:
  - Navigate to the relevant order or custom request
  - Mark the notification as read
- Notifications should auto-refresh periodically (e.g., every 30 seconds)
- Staff should be able to:
  - View all notifications
  - Mark all as read
  - Clear old notifications
- Notification types:
  - New Order Placed
  - New Custom Cake Request
  - Bank Transfer Payment Pending Verification
  - Customer Approved Quote
  - Customer Rejected Quote

### 8. Staff Portal - Product Catalog Management

#### 8.1 Product Catalog Management Page (Owner Only)
- The system must create a dedicated product catalog management interface
- ONLY users with "owner" role can access this page
- This is separate from the existing inventory management system

#### 8.2 Product Management Features
- Owners must be able to:
  - **View Products:**
    - List all products in the catalog
    - Filter by category, availability status
    - Search products by name
    - View product details including all pricing options
  - **Add New Products:**
    - Enter product name, description
    - Upload multiple product images (with drag-and-drop)
    - Set thumbnail image
    - Assign to one or multiple categories
    - Mark as featured
    - Set availability status
    - Add allergen information
    - Set preparation time
  - **Add Pricing Options:**
    - Create multiple weight/price combinations for each product
    - Specify weight (e.g., "500g", "1kg")
    - Set price for each weight option
    - Add servings information
    - Set display order for pricing options
    - Mark specific pricing options as unavailable
  - **Edit Products:**
    - Update any product information
    - Add/remove images
    - Modify pricing options
    - Change categories
    - Toggle featured status
    - Mark as available/unavailable
  - **Delete Products:**
    - Soft delete (mark as inactive rather than permanent deletion)
    - Confirm before deletion
    - Cannot delete products that have active orders

#### 8.3 Category Management
- Owners must be able to:
  - Create new categories
  - Edit category names and descriptions
  - Set display order for categories
  - Upload category icons
  - Deactivate categories (hide from customer view)
- When a category is deactivated, products in that category should still be accessible via other categories or search

#### 8.4 Image Management
- Support for multiple images per product
- Image upload with validation (JPG, PNG, max 5MB per image)
- Image preview before upload
- Set primary/thumbnail image
- Reorder images via drag-and-drop
- Delete images
- Automatic image optimization and thumbnail generation

### 9. Role-Based Access Control

#### 9.1 Customer Role Restrictions
- Customers must NOT have access to:
  - Inventory management pages
  - Sales pages
  - Stock check-in pages
  - User management pages
  - Audit logs
  - Product catalog management
  - Any existing staff-only functionality

#### 9.2 Customer Role Permissions
- Customers must ONLY have access to:
  - Customer portal (cake browsing and ordering)
  - Their own order history
  - Their profile settings
  - Their order tracking

#### 9.3 Staff Role Enhancements
- Owner and cashier roles must have access to:
  - All existing staff pages
  - New customer orders management page
  - Custom cake request review functionality
  - Notifications page for custom cake requests
  - In-app notifications panel
- Owner role exclusively has access to:
  - Order holds management (blocking dates)
  - Product catalog management (adding/editing cakes with pricing, categories)

#### 9.4 Order Cancellation Restrictions
- Customers CANNOT cancel orders through the interface
- Only staff (owner/cashier) can cancel orders
- Staff must provide a mandatory cancellation reason
- All cancellation actions must be logged in audit trail

### 10. Database Schema Requirements

**Important Note:** All tables below are NEW tables specifically for the customer ordering system. They are completely separate from existing staff/inventory management tables to maintain clear boundaries and easier system management.

#### 10.1 `customers` Table
Stores customer account information (completely separate from staff users table).

```sql
CREATE TABLE customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  phone_verified BOOLEAN DEFAULT false,
  email VARCHAR(255) NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birthday DATE NULL,
  default_address TEXT NULL,
  profile_image_url TEXT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created_at ON customers(created_at);
```

**Fields:**
- `customer_id`: UUID primary key
- `phone_number`: Unique phone number in +94XXXXXXXXX format
- `phone_verified`: Boolean indicating if phone is verified via OTP
- `email`: Optional email address for notifications
- `first_name`, `last_name`: Customer name
- `birthday`: Date of birth
- `default_address`: Default delivery address
- `profile_image_url`: Optional profile picture
- `is_active`: Soft delete flag
- `created_at`, `updated_at`: Timestamps
- `last_login_at`: Track last login

#### 10.2 `customer_otp_verifications` Table
Stores OTP codes for phone verification.

```sql
CREATE TABLE customer_otp_verifications (
  otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) NOT NULL,
  otp_code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  attempts INTEGER DEFAULT 0,
  resend_count INTEGER DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_otp_phone ON customer_otp_verifications(phone_number);
CREATE INDEX idx_otp_expires ON customer_otp_verifications(expires_at);
CREATE INDEX idx_otp_created_at ON customer_otp_verifications(created_at);
```

**Fields:**
- `otp_id`: UUID primary key
- `phone_number`: Phone number for this OTP
- `otp_code_hash`: Hashed OTP code (never store plain text)
- `expires_at`: Expiration timestamp (configurable, default 10 minutes)
- `verified`: Whether OTP was successfully verified
- `verified_at`: When it was verified
- `attempts`: Failed verification attempts
- `resend_count`: Number of times OTP was resent
- `ip_address`, `user_agent`: For security logging
- `created_at`: Creation timestamp

#### 10.3 `product_catalog` Table
Customer-facing product catalog (separate from internal inventory).

```sql
CREATE TABLE product_catalog (
  product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  image_urls TEXT[] NOT NULL,
  thumbnail_url TEXT NULL,
  allergens TEXT NULL,
  preparation_time VARCHAR(100) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_product_available ON product_catalog(is_available);
CREATE INDEX idx_product_featured ON product_catalog(is_featured);
CREATE INDEX idx_product_display_order ON product_catalog(display_order);
```

**Fields:**
- `product_id`: UUID primary key
- `name`: Product name
- `description`: Detailed description
- `display_order`: For custom sorting
- `is_featured`: Show in featured section
- `is_available`: Availability flag
- `image_urls`: Array of image URLs
- `thumbnail_url`: Thumbnail for gallery view
- `allergens`: Allergen information
- `preparation_time`: Time needed to prepare

**Note:** Product pricing and categories are handled in separate tables for flexibility.

#### 10.4 `product_pricing` Table
Store multiple price/weight combinations for each product.

```sql
CREATE TABLE product_pricing (
  pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES product_catalog(product_id) ON DELETE CASCADE,
  weight VARCHAR(50) NOT NULL,
  weight_value DECIMAL(10, 2) NULL,
  weight_unit VARCHAR(20) NULL,
  price DECIMAL(10, 2) NOT NULL,
  servings VARCHAR(50) NULL,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pricing_product ON product_pricing(product_id);
CREATE INDEX idx_pricing_available ON product_pricing(is_available);
CREATE INDEX idx_pricing_display_order ON product_pricing(display_order);
```

**Fields:**
- `pricing_id`: UUID primary key
- `product_id`: Foreign key to product catalog
- `weight`: Display weight (e.g., "500g", "1kg", "1.5kg")
- `weight_value`: Numeric weight value for calculations (e.g., 500, 1000, 1500)
- `weight_unit`: Unit of measurement (e.g., "g", "kg", "lbs")
- `price`: Price for this weight option
- `servings`: Estimated servings for this size
- `is_available`: Availability flag for this specific size
- `display_order`: Order in which to display pricing options

**Example Data:**
```sql
-- For a "Chocolate Cake" product
INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, display_order) VALUES
  ('product-uuid', '500g', 500, 'g', 1500.00, '4-6 servings', 1),
  ('product-uuid', '1kg', 1000, 'g', 2800.00, '8-10 servings', 2),
  ('product-uuid', '1.5kg', 1500, 'g', 4000.00, '12-15 servings', 3);
```

#### 10.5 `product_category_mappings` Table
Many-to-many relationship between products and categories.

```sql
CREATE TABLE product_category_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES product_catalog(product_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_categories(category_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, category_id)
);

-- Indexes
CREATE INDEX idx_mapping_product ON product_category_mappings(product_id);
CREATE INDEX idx_mapping_category ON product_category_mappings(category_id);
```

**Fields:**
- `mapping_id`: UUID primary key
- `product_id`: Foreign key to product catalog
- `category_id`: Foreign key to product categories
- `created_at`: When mapping was created

**Note:** This allows a product to belong to multiple categories (e.g., a cake can be both "Birthday Cakes" and "Chocolate Cakes")

#### 10.6 `product_categories` Table
Categories for organizing products in customer portal.

```sql
CREATE TABLE product_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  display_order INTEGER DEFAULT 0,
  icon_url TEXT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_category_display_order ON product_categories(display_order);
```

**Fields:**
- `category_id`: UUID primary key
- `name`: Category name (e.g., "Birthday Cakes", "Wedding Cakes")
- `description`: Category description
- `display_order`: For custom ordering
- `icon_url`: Optional category icon
- `is_active`: Active flag

#### 10.7 `customer_orders` Table
Main orders table for all customer orders.

```sql
CREATE TABLE customer_orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('pre-made', 'custom')),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  special_instructions TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10, 2) NOT NULL,
  deposit_percentage INTEGER DEFAULT 40,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  remaining_balance DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NULL,
  staff_notes TEXT NULL,
  processed_by UUID NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE NULL,
  cancellation_reason TEXT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_customer ON customer_orders(customer_id);
CREATE INDEX idx_orders_status ON customer_orders(status);
CREATE INDEX idx_orders_payment_status ON customer_orders(payment_status);
CREATE INDEX idx_orders_pickup_date ON customer_orders(pickup_date);
CREATE INDEX idx_orders_order_type ON customer_orders(order_type);
CREATE INDEX idx_orders_created_at ON customer_orders(created_at);
CREATE INDEX idx_orders_number ON customer_orders(order_number);
```

**Fields:**
- `order_id`: UUID primary key
- `order_number`: Human-readable order number (e.g., "ORD-20240122-001")
- `customer_id`: Foreign key to customers table
- `order_type`: 'pre-made' or 'custom'
- `order_date`: When order was placed
- `pickup_date`, `pickup_time`: Requested pickup date and time
- `special_instructions`: Customer notes
- `status`: Order status (see enum below)
- `payment_status`: Payment status (see enum below)
- `subtotal`: Before any calculations
- `deposit_percentage`: Configurable deposit percentage
- `deposit_amount`: Calculated deposit (40% by default)
- `total_amount`: Total order value
- `remaining_balance`: Amount due on pickup
- `payment_method`: 'online' or 'bank_transfer'
- `staff_notes`: Internal notes by staff
- `processed_by`: Staff member who processed
- `cancelled_at`, `cancellation_reason`: Cancellation info
- `completed_at`: When order was completed

**Status Enum Values:**
- `pending_payment`: Awaiting payment
- `payment_pending_verification`: Bank transfer awaiting verification
- `payment_verified`: Payment confirmed
- `confirmed`: Order confirmed, ready for preparation
- `in_preparation`: Being prepared
- `ready_for_pickup`: Ready for customer pickup
- `completed`: Successfully picked up
- `cancelled`: Order cancelled

**Payment Status Enum Values:**
- `pending`: No payment received
- `deposit_paid`: 40% deposit paid
- `fully_paid`: 100% paid
- `refunded`: Payment refunded
- `failed`: Payment failed

#### 10.8 `customer_order_items` Table
Individual items in each order.

```sql
CREATE TABLE customer_order_items (
  order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES customer_orders(order_id) ON DELETE CASCADE,
  product_id UUID NULL REFERENCES product_catalog(product_id),
  pricing_id UUID NULL REFERENCES product_pricing(pricing_id),
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('pre-made', 'custom')),
  product_name VARCHAR(255) NOT NULL,
  weight VARCHAR(50) NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  custom_specifications TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_items_order ON customer_order_items(order_id);
CREATE INDEX idx_order_items_product ON customer_order_items(product_id);
CREATE INDEX idx_order_items_pricing ON customer_order_items(pricing_id);
```

**Fields:**
- `order_item_id`: UUID primary key
- `order_id`: Foreign key to orders
- `product_id`: Foreign key to product catalog (nullable for custom cakes)
- `pricing_id`: Foreign key to product pricing (which weight/price option was selected)
- `item_type`: 'pre-made' or 'custom'
- `product_name`: Denormalized product name for historical records
- `weight`: Weight option selected (denormalized for historical record)
- `quantity`: Number of items
- `unit_price`: Price per unit (for this specific weight)
- `total_price`: quantity × unit_price
- `custom_specifications`: For custom items

#### 10.9 `custom_cake_requests` Table
Custom cake design requests and quotes.

```sql
CREATE TABLE custom_cake_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NULL REFERENCES customer_orders(order_id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  reference_image_url TEXT NOT NULL,
  customer_notes TEXT NOT NULL,
  requested_pickup_date DATE NOT NULL,
  requested_pickup_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
  quote_price DECIMAL(10, 2) NULL,
  quote_weight VARCHAR(100) NULL,
  quote_servings VARCHAR(50) NULL,
  quote_preparation_time VARCHAR(100) NULL,
  quote_notes TEXT NULL,
  quoted_by UUID NULL,
  quoted_at TIMESTAMP WITH TIME ZONE NULL,
  customer_response VARCHAR(20) NULL CHECK (customer_response IN ('approved', 'rejected', NULL)),
  customer_response_at TIMESTAMP WITH TIME ZONE NULL,
  customer_response_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_custom_requests_customer ON custom_cake_requests(customer_id);
CREATE INDEX idx_custom_requests_status ON custom_cake_requests(status);
CREATE INDEX idx_custom_requests_created_at ON custom_cake_requests(created_at);
CREATE INDEX idx_custom_requests_pickup_date ON custom_cake_requests(requested_pickup_date);
```

**Fields:**
- `request_id`: UUID primary key
- `order_id`: Foreign key to orders (set when quote is approved)
- `customer_id`: Foreign key to customers
- `reference_image_url`: URL to uploaded reference image
- `customer_notes`: Customer description of requirements (Occasion, Age, Colors, Writing, etc.)
- `requested_pickup_date`, `requested_pickup_time`: Desired pickup date/time
- `status`: 'pending_review', 'quoted', 'approved', 'rejected', 'expired'
- `quote_price`: Staff-provided price quote
- `quote_weight`: Weight/size option quoted (e.g., "1kg", "1.5kg", "2kg")
- `quote_servings`: Number of servings
- `quote_preparation_time`: Time needed to prepare
- `quote_notes`: Additional notes from staff
- `quoted_by`: Staff member who created quote
- `quoted_at`: When quote was sent
- `customer_response`: Customer's decision
- `customer_response_at`: When customer responded
- `customer_response_notes`: Customer's notes on approval/rejection

**Note:** Multiple price/weight options can be provided by creating multiple quote records or storing as JSON in quote_notes. Staff can send various pricing tiers (e.g., "1kg - LKR 3500, 1.5kg - LKR 5000").

#### 10.10 `customer_payments` Table
Payment transaction records.

```sql
CREATE TABLE customer_payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES customer_orders(order_id),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('deposit', 'balance', 'full')),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('online', 'bank_transfer', 'cash')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  gateway_name VARCHAR(100) NULL,
  gateway_transaction_id VARCHAR(255) NULL,
  gateway_response TEXT NULL,
  bank_reference_number VARCHAR(255) NULL,
  receipt_image_url TEXT NULL,
  verified_by UUID NULL,
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  verification_notes TEXT NULL,
  failed_reason TEXT NULL,
  refund_id UUID NULL,
  refunded_at TIMESTAMP WITH TIME ZONE NULL,
  refund_reason TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_order ON customer_payments(order_id);
CREATE INDEX idx_payments_customer ON customer_payments(customer_id);
CREATE INDEX idx_payments_status ON customer_payments(payment_status);
CREATE INDEX idx_payments_created_at ON customer_payments(created_at);
CREATE INDEX idx_payments_gateway_txn ON customer_payments(gateway_transaction_id);
```

**Fields:**
- `payment_id`: UUID primary key
- `order_id`: Foreign key to orders
- `customer_id`: Foreign key to customers
- `amount`: Payment amount
- `payment_type`: 'deposit' (40%), 'balance' (60%), or 'full' (100%)
- `payment_method`: 'online', 'bank_transfer', or 'cash'
- `payment_status`: 'pending', 'success', 'failed', 'refunded'
- `gateway_name`: Payment gateway used (e.g., "PayHere", "Stripe")
- `gateway_transaction_id`: Transaction ID from gateway
- `gateway_response`: Full response from gateway
- `bank_reference_number`: For bank transfers
- `receipt_image_url`: Uploaded receipt for bank transfers
- `verified_by`: Staff member who verified
- `verified_at`: Verification timestamp
- `verification_notes`: Staff notes on verification
- `failed_reason`: Reason if payment failed
- `refund_id`, `refunded_at`, `refund_reason`: Refund information

#### 10.11 `customer_notifications` Table
Track all notifications sent to customers.

```sql
CREATE TABLE customer_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  order_id UUID NULL REFERENCES customer_orders(order_id),
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email', 'in-app')),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NULL,
  read_at TIMESTAMP WITH TIME ZONE NULL,
  error_message TEXT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_customer ON customer_notifications(customer_id);
CREATE INDEX idx_notifications_order ON customer_notifications(order_id);
CREATE INDEX idx_notifications_type ON customer_notifications(notification_type);
CREATE INDEX idx_notifications_status ON customer_notifications(status);
CREATE INDEX idx_notifications_created_at ON customer_notifications(created_at);
```

**Fields:**
- `notification_id`: UUID primary key
- `customer_id`: Foreign key to customers
- `order_id`: Related order (if applicable)
- `notification_type`: 'order_confirmation', 'payment_verified', 'quote_received', 'status_update', 'delivery_reminder', etc.
- `channel`: 'sms', 'email', or 'in-app'
- `recipient`: Phone number or email address
- `subject`: Email subject (null for SMS)
- `message`: Notification content
- `status`: 'pending', 'sent', 'delivered', 'failed'
- `sent_at`: When sent
- `delivered_at`: When delivered (from webhook)
- `read_at`: When read (for in-app notifications)
- `error_message`: Error details if failed
- `retry_count`: Number of retry attempts

#### 10.12 `order_status_history` Table
Audit trail of order status changes.

```sql
CREATE TABLE order_status_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES customer_orders(order_id) ON DELETE CASCADE,
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  old_payment_status VARCHAR(50) NULL,
  new_payment_status VARCHAR(50) NULL,
  changed_by UUID NULL,
  changed_by_type VARCHAR(20) CHECK (changed_by_type IN ('staff', 'customer', 'system')),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_status_history_created_at ON order_status_history(created_at);
```

**Fields:**
- `history_id`: UUID primary key
- `order_id`: Foreign key to orders
- `old_status`, `new_status`: Status change
- `old_payment_status`, `new_payment_status`: Payment status change
- `changed_by`: User ID who made change
- `changed_by_type`: 'staff', 'customer', or 'system'
- `notes`: Reason or notes about change

#### 10.13 `customer_addresses` Table
Support multiple delivery addresses per customer (optional enhancement).

```sql
CREATE TABLE customer_addresses (
  address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  label VARCHAR(50) NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255) NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NULL,
  phone_number VARCHAR(15) NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX idx_addresses_default ON customer_addresses(is_default);
```

**Fields:**
- `address_id`: UUID primary key
- `customer_id`: Foreign key to customers
- `label`: Address label (e.g., "Home", "Office")
- `address_line1`, `address_line2`: Street address
- `city`: City name
- `postal_code`: Postal/ZIP code
- `phone_number`: Contact number for this address
- `is_default`: Default address flag

#### 10.14 `order_holds` Table
Manage dates when orders are not accepted (peak dates, holidays, capacity limits).

```sql
CREATE TABLE order_holds (
  hold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_date DATE NOT NULL UNIQUE,
  reason VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hold_date ON order_holds(hold_date);
CREATE INDEX idx_hold_active ON order_holds(is_active);
```

**Fields:**
- `hold_id`: UUID primary key
- `hold_date`: Date when orders should be blocked
- `reason`: Reason for hold (e.g., "Fully Booked", "Holiday", "Kitchen Maintenance")
- `is_active`: Whether hold is currently active
- `created_by`: Owner who created this hold (only owners can create holds)
- `created_at`, `updated_at`: Timestamps

**Note:** Only users with "owner" role can create, update, or delete order holds. The system should check this table before allowing customers to select a pickup date.

#### 10.15 `system_configuration` Table
Store configurable system parameters.

```sql
CREATE TABLE system_configuration (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT NULL,
  is_public BOOLEAN DEFAULT false,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_config_key ON system_configuration(config_key);
```

**Fields & Example Values:**
- `config_key`: Configuration key name
  - `otp_expiration_minutes`: "10"
  - `otp_resend_limit`: "5"
  - `deposit_percentage`: "40"
  - `sms_webhook_url`: "https://..."
  - `bank_account_details`: JSON with account info
  - `payment_gateway_name`: "Stripe"
  - `min_advance_order_days`: "2" (minimum days in advance to place order)
  - `max_advance_order_days`: "90" (maximum days in advance to place order)
- `config_value`: Value as string (parse based on data_type)
- `data_type`: Type for parsing
- `description`: Human-readable description
- `is_public`: Whether customers can see this config
- `updated_by`: Last staff member who updated

### 10.16 Relationship Summary

```
customers (1) ----< (M) customer_orders
customers (1) ----< (M) custom_cake_requests
customers (1) ----< (M) customer_payments
customers (1) ----< (M) customer_notifications
customers (1) ----< (M) customer_addresses
customers (1) ----< (M) customer_otp_verifications

customer_orders (1) ----< (M) customer_order_items
customer_orders (1) ----< (M) customer_payments
customer_orders (1) ----< (M) order_status_history
customer_orders (1) ----< (1) custom_cake_requests (optional link)

product_catalog (1) ----< (M) product_pricing
product_catalog (1) ----< (M) product_category_mappings
product_catalog (1) ----< (M) customer_order_items

product_categories (1) ----< (M) product_category_mappings

product_pricing (1) ----< (M) customer_order_items

custom_cake_requests (M) ----< (1) customers
custom_cake_requests (1) ----< (1) customer_orders (when approved)
```

### 10.17 Database Migration Notes

1. **Separation from Existing System:**
   - All tables use the `customer_` or `product_` prefix
   - No foreign keys to existing staff/inventory tables
   - Complete isolation for security and maintainability

2. **Initial Data Requirements:**
   - Populate `product_categories` with default categories (Birthday Cakes, Wedding Cakes, Custom Cakes, Cupcakes, etc.)
   - Populate `product_catalog` from existing inventory (manual or migration script)
   - For each product in `product_catalog`, create multiple entries in `product_pricing` with different weight/price combinations
   - Link products to categories via `product_category_mappings`
   - Set up `system_configuration` with default values

3. **Row Level Security (RLS) Policies:**
   - Customers can only read/update their own records
   - Staff can read all customer data but cannot update customer-created data directly
   - Separate policies for staff vs customer access

4. **Triggers Needed:**
   - Auto-update `updated_at` timestamps on record changes
   - Auto-generate `order_number` for new orders
   - Auto-calculate prices and balances on order creation
   - Create status history entry on order status changes
   - Send notifications on status changes (via background job)

5. **Stored Procedures/Functions:**
   - `create_customer_order()`: Transaction-safe order creation with pricing validation
   - `update_order_status()`: Update with history tracking
   - `verify_payment()`: Verify and update payment status
   - `send_quote()`: Create quote and send notification
   - `calculate_order_totals()`: Calculate deposit and totals based on selected pricing options
   - `get_product_with_pricing()`: Retrieve product with all pricing options
   - `validate_pricing_selection()`: Ensure selected pricing_id belongs to selected product_id

### 11. Configuration Requirements

#### 11.1 SMS Configuration
- SMS webhook URL must be stored as environment variable
- SMS provider credentials must be securely stored
- OTP expiration time must be configurable (default: 10 minutes)
- OTP resend limit must be configurable (default: 5 attempts)

#### 11.2 Payment Configuration
- Payment gateway credentials must be stored as environment variables
- Bank account details must be configurable
- Deposit percentage must be configurable (default: 40%)

#### 11.3 User Fields Configuration
- System should support configurable required/optional fields for customer signup (future enhancement consideration)

### 12. Security Requirements

#### 12.1 Authentication
- OTP codes must be securely generated and stored (hashed)
- Phone numbers must be validated and sanitized
- Session management must prevent unauthorized access to customer data

#### 12.2 Authorization
- Strict role-based access control must prevent customers from accessing staff pages
- Customers must only access their own data
- API endpoints must validate user roles before processing requests

#### 12.3 Data Protection
- Payment information must be handled according to PCI compliance standards
- Customer personal information must be encrypted at rest
- File uploads must be scanned and validated

## Non-Goals (Out of Scope)

1. **NIC Verification:** While mentioned as a future plan, NIC (National Identity Card) verification will NOT be included in this initial implementation
2. **In-app Chat/Messaging:** Direct messaging between customers and staff
3. **Loyalty/Rewards Program:** Points or rewards for repeat customers
4. **Multi-language Support:** Initial version will be in English only
5. **Social Media Integration:** Sign up via Facebook/Google
6. **Delivery Tracking:** Real-time GPS tracking of delivery personnel
7. **Reviews/Ratings:** Customer reviews and ratings for cakes
8. **Inventory Deduction:** Automatic inventory adjustment when orders are placed (this may conflict with existing inventory management)
9. **Automated Pricing:** AI-based pricing for custom cakes
10. **Mobile Apps:** Native iOS/Android applications (web-responsive only)

## Design Considerations

### Customer Portal UI/UX
- The customer portal should have a distinct, customer-friendly design separate from the staff interface
- Use a card-based layout for cake gallery with high-quality images
- Implement clear visual hierarchy for call-to-action buttons
- Mobile-first responsive design is critical as many customers will access via mobile
- Use progress indicators for multi-step processes (order placement, custom requests)
- Implement clear visual feedback for all user actions

### Staff Order Management UI/UX
- The customer orders page should follow the existing design patterns of the staff interface
- Use a table/list view with filtering options for easy order management
- Implement clear status badges with color coding
- Provide quick actions (approve, reject, update status) without navigating away
- Use modal dialogs for sending quotes to maintain context

### Navigation
- Customer portal should have its own navigation structure
- Staff interface should add a new "Customer Orders" navigation item
- Clear logout and account settings access for customers

### Responsive Design
- All customer-facing pages must be fully responsive and mobile-optimized
- Touch-friendly buttons and form inputs for mobile users
- Image upload should work seamlessly on mobile devices

## Technical Considerations

### Integration with Existing System
- Leverage existing Supabase authentication infrastructure
- Extend current user/auth system to support customer role
- Use existing audit logging for staff actions on customer orders
- Maintain compatibility with existing database schema

### SMS Integration
- Implement webhook-based SMS sending for flexibility
- Include retry logic for failed SMS deliveries
- Log all SMS attempts for debugging
- Consider using Supabase Edge Functions or Netlify Functions for webhook handling

### Image Upload & Storage
- Use Supabase Storage or similar for uploaded images
- Implement image compression on upload to save storage space
- Generate thumbnails for gallery views
- Secure file access with signed URLs

### Payment Gateway Integration
- Use established payment gateway SDK/API (Stripe)
- Implement webhook handlers for payment confirmation
- Store minimal payment information in database
- Handle payment gateway downtime gracefully

### Performance Considerations
- Implement pagination for order lists (customer and staff views)
- Use lazy loading for cake gallery images
- Cache product catalog data
- Optimize database queries with proper indexing

### State Management
- Extend existing AuthContext to handle customer authentication
- Create OrderContext for managing cart and order state
- Use React hooks for local state management

### API Structure
- Create separate API routes/functions for customer operations
- Implement proper error handling and validation
- Use transaction management for order placement to ensure data consistency

## Success Metrics

1. **Adoption Rate:** At least 50 customers sign up within the first month of launch
2. **Order Completion Rate:** At least 70% of customers who start an order complete the payment
3. **Custom Cake Requests:** Receive at least 10 custom cake requests in the first month
4. **Quote Conversion:** At least 60% of custom cake quotes result in confirmed orders
5. **Payment Success Rate:** At least 90% of online payments process successfully
6. **Customer Satisfaction:** Reduce order-taking time for staff by 50% (measured by time spent on phone/manual orders)
7. **Order Accuracy:** Reduce order errors by 30% due to clear digital order specifications
8. **System Performance:** Page load times under 3 seconds for customer portal
9. **Mobile Usage:** At least 60% of customer orders placed via mobile devices

## Additional Requirements Based on Stakeholder Input

### Product Catalog Management
- The system must include a separate product management module (not part of existing inventory)
- ONLY users with "owner" role can manage the product catalog
- Owners must be able to:
  - Add new products with name, description, images, categories
  - Create multiple pricing options (weight/price combinations) for each product
  - Edit existing products and their pricing
  - Mark products as featured or unavailable
  - Organize products into categories
  - Upload and manage product images
- Changes to product catalog should be immediately reflected in customer portal

### Order Cancellation Policy
- Customers CANNOT cancel orders after they are placed
- No refund policy - all payments are final
- The system should clearly display this policy during checkout
- Staff (owner/cashier) may cancel orders in exceptional circumstances with proper documentation
- If staff cancel an order, they must provide a cancellation reason
- Cancelled orders should still appear in order history with "Cancelled" status

### Staff Notifications
- The system must implement in-app notifications for staff
- Staff should receive notifications for:
  - New customer orders placed
  - New custom cake requests submitted
  - Payment verifications pending (bank transfers)
  - Customer responses to quotes (approved/rejected)
- Notifications should appear in the staff interface with:
  - Badge count of unread notifications
  - Notification panel with recent alerts
  - Click-to-navigate to relevant order/request
- Notifications should be marked as read when staff views the related order/request

### Testing & Development Environment
- The system must support separate testing/development environments
- Test environment must include:
  - Test SMS webhook that logs messages instead of sending actual SMS
  - Stripe test mode with test API keys
  - Separate test database
  - Clear indicators when in test mode
- Test environment should allow simulating:
  - OTP verification without actual SMS
  - Payment success/failure scenarios
  - Payment gateway webhooks

### Order Minimums
- No minimum order value required for customers
- Customers can order a single item at any price point

## Open Questions

While most requirements are now clear, please clarify the following:

1. **Product Management Permissions:** Can cashiers view product pricing and catalog details, or is this information owner-only? (They need pricing to quote custom cakes) Cashiers can view product pricing and catalog details

2. **Order Modifications:** Can customers modify their order (change items, quantities, pickup date/time) BEFORE payment is completed? yes
What about after payment? before store accepts the order customer ccan edit it, or cancel.

3. **Custom Request Response Time:** Should there be a time limit for staff to respond to custom cake requests? (e.g., must quote within 24 hours) within 3 hours.

4. **Quote Expiration:** How long should a custom cake quote remain valid? one week
Should it expire after a certain time? it expire after one week

5. **No-Show Policy:** What happens if a customer doesn't pick up their order at the scheduled time? alert the staff
Should the system have reminders? system should have SMS reminders.

6. **Pickup Time Slots:** Are there specific pickup time slots (e.g., 9 AM - 6 PM only), or can customers choose any time? there must be a specific time slots, that can be configured by the owner.

7. **Balance Payment:** When should customers pay the remaining 60% balance? At pickup only, or should they be able to pay it online beforehand? they should be able to pay it online beforehand, 40% must be paid no matter what but if customer is okay he can pay the full amount.

8. **Customer Account Management:** Can customers update their profile information (phone, email, name) after signup? yes
Should phone number changes require re-verification? yes

9. **Order History Visibility:** Should customers be able to view rejected custom cake requests in their history, or only approved orders? they can view both

10. **Staff Role for Quotes:** Can both owner and cashier send quotes for custom cakes, or owner only? owner only.

## Priority Order (Implementation Sequence)

Based on stakeholder input, the recommended implementation order is:

1. **Customer dashboard/page** (UI foundation for everything else)
2. **Phone signup with OTP** (authentication and user creation)
3. **Pre-made cake ordering** (core ordering functionality)
4. **Order history & tracking** (customer visibility into orders)
5. **Custom cake ordering** (value-add feature)
6. **NIC verification** (future phase, not in initial scope)

## Dependencies

- Supabase database and authentication
- SMS webhook service for OTP delivery
- Payment gateway account and credentials
- Image storage solution (Supabase Storage or similar)
- Netlify Functions or Supabase Edge Functions for serverless endpoints

## Assumptions

1. The cafe has an established process for fulfilling custom cake orders
2. Staff (owner and cashiers) have the expertise to price custom cakes based on images and descriptions
3. All orders are pickup-only; no delivery service is provided
4. Customers will have internet access to browse and place orders via mobile or desktop
5. The existing product inventory includes cakes suitable for the online catalog
6. Staff are comfortable using web-based tools for order management
7. The cafe operates during business hours with defined pickup times
8. Customers understand and accept the no-cancellation, no-refund policy
9. The owner will dedicate time to manage the product catalog (adding products, pricing, images)
10. Staff will monitor in-app notifications regularly for new orders and requests
11. Stripe payment gateway is accessible in Sri Lanka for online payments
12. The cafe has adequate storage capacity for reference images uploaded by customers