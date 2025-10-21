c# Point of Sale (POS) System

## Overview

A modern, full-featured Point of Sale system with QR code scanning, product images, and an intuitive interface suitable for supermarkets, hotels, restaurants, wholesalers, and retail businesses.

## Features

### 🎯 Core Features

1. **QR Code Scanning**
   - Real-time QR code scanner using device camera
   - Automatic product addition to cart
   - Duplicate QR scans increase quantity automatically
   - Fast and accurate barcode recognition

2. **Product Management with Images**
   - Display product images in POS grid
   - Image preview in product form
   - Support for external image URLs (Imgur, Cloudinary, etc.)
   - Generate unique QR codes for each product
   - Print QR codes for product labels

3. **Smart Shopping Cart**
   - Add products by clicking or scanning
   - Increase/decrease quantities with +/- buttons
   - Real-time stock validation
   - Visual product thumbnails
   - Remove items easily
   - Running total calculation

4. **Flexible Checkout**
   - Multiple payment methods (Cash, Card, Bank Transfer)
   - Discount percentage application
   - Tax percentage calculation
   - Change calculation for cash payments
   - Customer selection (optional)
   - Walk-in customer support

5. **Professional Receipts**
   - Printable receipts
   - Complete transaction details
   - Itemized list with quantities
   - Discount and tax breakdown
   - Payment method display
   - Date and time stamp

6. **User-Friendly Interface**
   - Full-screen immersive experience
   - Beautiful gradient design
   - Responsive grid layout
   - Search products by name, SKU, or category
   - Visual stock indicators
   - Real-time updates

## Installation & Setup

### 1. Install Dependencies

The required packages are already added to `package.json`:

```json
{
  "qrcode": "^1.5.3",
  "react-qr-scanner": "^1.0.0-alpha.11"
}
```

To install:
```bash
cd frontend
npm install
```

### 2. Database Setup

The database schema has been updated to include:
- `image_url` (VARCHAR 500) - Product image URL
- `qr_code` (TEXT) - QR code data (optional, generated dynamically)

Tables will auto-update on next server start.

### 3. Start the Application

```bash
# Backend
cd backend
npm start

# Frontend (new terminal)
cd frontend
npm start
```

### 4. Access POS

Navigate to: `http://localhost:3000/pos`

## Usage Guide

### For Store Managers

#### Adding Product Images

1. Go to **Product Management**
2. Click "Add Product" or edit existing product
3. In the form, find "Product Image URL" field
4. Enter the image URL (e.g., from Imgur, Cloudinary, or your server)
5. See live preview below the input
6. Save the product

**Tip:** Use free image hosting services:
- [Imgur](https://imgur.com/) - Free, no account needed
- [Cloudinary](https://cloudinary.com/) - Free tier available
- [ImgBB](https://imgbb.com/) - Free image hosting

#### Generating QR Codes

1. Go to **Product Management**
2. Find the product in the list
3. Click the **🔍 QR Code icon** (green)
4. QR code appears in modal
5. Options:
   - **Download** - Save as PNG
   - **Print** - Print labels
   - Scan with POS scanner to test

**Best Practice:**
- Print QR codes and attach to products
- Use label printer for professional results
- Include product name and price on label

### For Cashiers (POS Operation)

#### Method 1: Scan QR Code

1. Click **"Scan QR"** button (top right)
2. Camera activates
3. Point camera at product QR code
4. Product automatically added to cart
5. Scan same product again to increase quantity

#### Method 2: Search & Click

1. Use search bar at top
2. Type product name, SKU, or category
3. Click product card to add to cart
4. Browse grid for visual selection

#### Managing Cart

- **Increase Quantity:** Click + button
- **Decrease Quantity:** Click - button
- **Remove Item:** Click trash icon 🗑️
- **Clear Cart:** Click "Clear" button (top right)

#### Applying Discounts & Tax

1. Scroll down in cart sidebar
2. Enter discount percentage (0-100%)
3. Enter tax percentage (if applicable)
4. Totals update automatically

#### Processing Payment

1. Click **"Proceed to Payment"** button
2. Select payment method:
   - **Cash**: Enter amount paid
   - **Card**: Process immediately
3. For cash: System calculates change
4. Click **"Complete Sale"**
5. Receipt displays automatically

#### After Sale

- **Print Receipt** - Print for customer
- **New Sale** - Start fresh transaction
- Receipt auto-generated with all details

## UI Components

### Product Grid

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Image  │ │  Image  │ │  Image  │ │  Image  │
├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤
│ Product │ │ Product │ │ Product │ │ Product │
│  $19.99 │ │  $29.99 │ │  $39.99 │ │  $49.99 │
│ 15 left │ │ 8 left  │ │ 23 left │ │ Out     │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Cart Sidebar

```
┌────────────────────┐
│  Customer: Select  │
├────────────────────┤
│ [Product 1] x2 [$] │
│ [Product 2] x1 [$] │
├────────────────────┤
│ Discount: [___] %  │
│ Tax: [___] %       │
├────────────────────┤
│ Subtotal: $100.00  │
│ Discount: -$10.00  │
│ Tax: +$2.70        │
│ TOTAL: $92.70      │
├────────────────────┤
│ [Proceed to Pay]   │
└────────────────────┘
```

## QR Code Format

Products are encoded as JSON:

```json
{
  "sku": "PROD-12345",
  "name": "Product Name",
  "price": 19.99
}
```

Scanner reads SKU and matches with database.

## Features by User Type

### Supermarkets
- Fast checkout with barcode scanning
- Bulk item quantity management
- Quick product search
- Stock level visibility
- Receipt printing

### Hotels/Restaurants
- Customer name tracking
- Service charge/tax calculation
- Multiple payment methods
- Professional receipts
- Order tracking

### Wholesale
- Large quantity handling
- Volume discounts
- Business customer selection
- Detailed invoicing
- Stock alerts

### Retail
- Visual product browsing
- Image-based selection
- Quick search
- Customer-friendly interface
- Multiple payment options

## Technical Architecture

### Frontend Components

- **`PointOfSale.jsx`** - Main POS interface
- **`ProductManagement.jsx`** - Product CRUD with QR generation
- **`ProductForm.jsx`** - Product form with image upload
- **`QrScanner`** - Camera-based QR scanner component

### Backend Schema

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  selling_price DECIMAL(10,2),
  current_stock INT,
  image_url VARCHAR(500),    -- NEW
  qr_code TEXT,              -- NEW
  ...
);
```

### API Endpoints

```
GET    /api/products          - List all products
POST   /api/products          - Create product
PUT    /api/products/:id      - Update product (with image_url)
POST   /api/sales             - Create sale from POS
GET    /api/customers         - Get customers for selection
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Esc` | Clear search / Close modals |
| `Enter` | Proceed to payment (when cart has items) |
| `Ctrl+N` | New sale |
| `Ctrl+P` | Print receipt |

## Best Practices

### 1. Product Setup
- ✅ Add clear product images
- ✅ Use consistent image sizes (square recommended)
- ✅ Generate QR codes for frequently sold items
- ✅ Print and laminate QR code labels
- ✅ Keep product info up to date

### 2. Store Operation
- ✅ Train staff on both scan and click methods
- ✅ Test QR scanner before opening
- ✅ Keep backup labels for damaged QR codes
- ✅ Regularly update stock levels
- ✅ Clean camera lens for best scanning

### 3. Customer Experience
- ✅ Fast checkout process
- ✅ Always provide receipts
- ✅ Double-check totals before payment
- ✅ Handle returns gracefully
- ✅ Keep interface clean and simple

### 4. Security
- ✅ Limit POS access to authorized staff
- ✅ Log all transactions
- ✅ Regular cash drawer reconciliation
- ✅ Secure payment terminal
- ✅ Backup daily sales data

## Troubleshooting

### QR Scanner Not Working

**Issue:** Camera not activating
- **Solution:** Grant camera permissions in browser
- **Check:** Browser supports `getUserMedia` API
- **Try:** Use HTTPS (required for camera access)

**Issue:** QR code not recognized
- **Solution:** Ensure good lighting
- **Check:** QR code not damaged
- **Try:** Re-generate and print QR code

### Product Images Not Displaying

**Issue:** Image shows placeholder
- **Solution:** Verify image URL is accessible
- **Check:** URL starts with `https://`
- **Try:** Test URL in new browser tab
- **Fix:** Use image hosting service

### Cart Issues

**Issue:** Can't add more quantity
- **Solution:** Check stock availability
- **Check:** Stock level in product management
- **Try:** Receive new stock first

**Issue:** Price wrong
- **Solution:** Update product selling price
- **Check:** Discount percentage applied
- **Verify:** Tax calculation

## Performance Optimization

### Large Product Catalogs

For 1000+ products:
1. **Search First** - Type to filter
2. **Categories** - Organize by category
3. **Favorites** - Keep frequently sold items accessible
4. **Image Optimization** - Use compressed images
5. **Lazy Loading** - Images load on demand

### Fast Checkout

Average checkout time:
- **QR Scan:** 3-5 seconds per item
- **Click & Search:** 5-10 seconds per item
- **Payment:** 10-15 seconds
- **Total:** 1-2 minutes for 5 items

## Integration

### With Inventory System
- Stock automatically decreases on sale
- Low stock alerts trigger
- Real-time stock updates

### With Accounting
- Sales recorded in daybook
- Customer payments tracked
- Commission calculated for salespeople

### With Reports
- Daily sales summaries
- Top-selling products
- Revenue analytics
- Staff performance

## Future Enhancements

- 📱 Mobile app version
- 🖨️ Integrated printer support
- 💳 Card terminal integration
- 📊 Real-time analytics dashboard
- 🌐 Multi-store synchronization
- 📦 Inventory alerts
- 🎁 Loyalty program integration
- 💰 Split payment methods

## Support

For technical issues or feature requests:
1. Check this documentation
2. Review troubleshooting section
3. Contact system administrator
4. Check browser console for errors

## License

Part of Business Management System
All rights reserved.

---

## Quick Start Checklist

- [ ] Install npm packages
- [ ] Update database schema
- [ ] Add product images
- [ ] Generate QR codes
- [ ] Print QR labels
- [ ] Test QR scanner
- [ ] Train staff
- [ ] Set up receipt printer
- [ ] Configure tax rates
- [ ] Create test sales
- [ ] Go live! 🎉

---

**Happy Selling! 💰**

