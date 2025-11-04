# 🛒 Cart & Checkout Setup Guide

## ✅ What's Been Fixed

### 1. **React Hydration Error** 
- **Issue**: "Uncaught Error: Minified React error #310"
- **Cause**: Accessing `window.location.href` during server-side rendering
- **Fix**: Added `typeof window === 'undefined'` check in `handleShare` function

### 2. **Cart API 500 Errors**
- **Issue**: `/api/cart:1` failing with 500 status
- **Cause**: Cart table might not exist, and error handling wasn't graceful
- **Fix**: Added proper error handling for 401/403 responses (non-authenticated users)

---

## 🗄️ STEP 1: Create Cart Items Table

**You need to run this SQL migration in Supabase!**

### Instructions:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of: `sql-migrations/create-cart-items-simple.sql`
3. Paste and run the SQL
4. Verify the table was created successfully

### What this creates:
- ✅ `cart_items` table with proper schema
- ✅ Foreign key relationships to `corporate_accounts` and `marketplace_modules`
- ✅ Indexes for performance
- ✅ RLS policies for security (only corporate admins can access their cart)
- ✅ Trigger to auto-update `updated_at` timestamp

---

## 🧪 STEP 2: Test the Module Detail Page

Once the deployment is complete (and **before** running the SQL):

1. Go to: `crowdconscious.app/marketplace`
2. Click on any of the 4 modules
3. **Expected Behavior**:
   - ✅ Page loads without errors
   - ✅ Module info displays correctly
   - ✅ Cart button appears (showing 0 items if not logged in)
   - ✅ No console errors
   - ✅ "Agregar al Carrito" button is visible

---

## 🛒 STEP 3: Test Cart Functionality (After SQL Migration)

### **A. Test as Unauthenticated User**
1. Log out (if logged in)
2. Visit marketplace and click on a module
3. Try clicking "Agregar al Carrito"
4. **Expected**: Alert saying "Por favor inicia sesión como administrador corporativo"

### **B. Test as Corporate Admin**
1. Log in as a corporate admin account
2. Visit marketplace: `crowdconscious.app/marketplace`
3. Click on a module
4. Set employee count (e.g., 75)
5. Click "Agregar al Carrito"
6. **Expected**:
   - ✅ Success message: "¡Agregado al carrito!"
   - ✅ Cart button shows badge with count (e.g., "1")
   - ✅ Cart button has a bouncing animation

### **C. Test Cart Sidebar**
1. Click the floating cart button (bottom right)
2. **Expected**:
   - ✅ Sidebar slides in from the right
   - ✅ Shows module details
   - ✅ Shows employee count
   - ✅ Shows total price
   - ✅ "Proceder al Pago" button is visible

### **D. Test Quantity Update**
1. In the cart sidebar, change employee count
2. **Expected**:
   - ✅ Price updates automatically
   - ✅ "Actualizar" button appears
   - ✅ Click "Actualizar" → success message

### **E. Test Remove Item**
1. Click trash icon next to an item
2. **Expected**:
   - ✅ Confirmation prompt
   - ✅ Item removed from cart
   - ✅ Badge count decreases

### **F. Test Checkout Flow**
1. In cart sidebar, click "Proceder al Pago"
2. **Expected**: Redirects to `/corporate/checkout`
3. **Checkout page should show**:
   - ✅ Cart items summary
   - ✅ Total price
   - ✅ "Pagar con Stripe" button

---

## 🐛 Troubleshooting

### **Cart button shows 0 items but I added something**
- Check browser console for errors
- Verify you're logged in as a corporate admin
- Verify SQL migration ran successfully
- Try refreshing the page

### **"Failed to add to cart" error**
- Check if you already own the module
- Verify you're a corporate admin (not a regular employee)
- Check Supabase logs for RLS policy errors

### **Cart sidebar is empty**
- Check browser console for fetch errors
- Verify RLS policies exist on `cart_items` table
- Try logging out and back in

### **500 error on /api/cart**
- Most likely: `cart_items` table doesn't exist yet
- **Solution**: Run the SQL migration from Step 1

---

## 📋 SQL Migration Checklist

Run these in order in Supabase SQL Editor:

- [ ] ✅ `sql-migrations/create-cart-items-simple.sql` ← **START HERE**
- [ ] ✅ `sql-migrations/update-revenue-logic-platform-modules.sql` (already done)
- [ ] ✅ `sql-migrations/add-platform-module-flag.sql` (already done)
- [ ] ✅ `sql-migrations/add-template-flag.sql` (already done)

---

## 🚀 What Happens Next (Automatic via Stripe Webhook)

When a corporate admin completes checkout:

1. **Stripe Checkout Session** is created with module IDs and prices
2. User pays via Stripe
3. **Stripe Webhook** receives `checkout.session.completed` event
4. **Webhook Handler** (`/api/webhooks/stripe/route.ts`) automatically:
   - ✅ Calls `process_module_sale()` RPC for revenue distribution
   - ✅ Fetches all employees of the corporate account
   - ✅ Enrolls **ALL employees** in the purchased module(s)
   - ✅ Clears the cart
   - ✅ Redirects user to success page with confetti 🎉

---

## 🎯 Testing the Full Checkout Flow

### Prerequisites:
- Stripe is already connected (via environment variables)
- You have a test card: `4242 4242 4242 4242` (any future expiry, any CVC)

### Steps:
1. Add 1-2 modules to cart
2. Go to checkout
3. Click "Pagar con Stripe"
4. Fill in Stripe checkout form (use test card)
5. Complete payment
6. **Expected**:
   - ✅ Redirects to `/corporate/checkout/success`
   - ✅ Confetti animation plays
   - ✅ Success message appears
   - ✅ All employees are enrolled in the module
   - ✅ Cart is cleared

---

## 📊 Verifying Revenue Distribution

After a test purchase, check Supabase tables:

```sql
-- Check wallet balances
SELECT * FROM wallets 
WHERE corporate_account_id = 'YOUR_CORPORATE_ACCOUNT_ID';

-- Check sales records
SELECT * FROM marketplace_module_sales
ORDER BY created_at DESC
LIMIT 10;

-- Check enrollments
SELECT * FROM course_enrollments
WHERE corporate_account_id = 'YOUR_CORPORATE_ACCOUNT_ID'
ORDER BY created_at DESC;
```

**Expected for a platform module** (e.g., "Aire Limpio"):
- ✅ Platform wallet gets 100% of payment
- ✅ Creator and community wallets get $0
- ✅ All employees enrolled automatically

**Expected for a community module**:
- ✅ Creator wallet gets 30%
- ✅ Community wallet gets 50%
- ✅ Platform wallet gets 20%
- ✅ All employees enrolled automatically

---

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ Module detail pages load without errors
2. ✅ Cart button is visible and functional
3. ✅ Can add modules to cart
4. ✅ Cart sidebar displays items correctly
5. ✅ Can update quantities and remove items
6. ✅ Checkout page loads with cart summary
7. ✅ Stripe checkout works (test mode)
8. ✅ After payment: employees are enrolled
9. ✅ After payment: revenue is distributed correctly
10. ✅ Cart is cleared after successful purchase

---

## 📞 Next Steps

**Once the deployment is live:**

1. Test module detail pages (should work now)
2. Run the cart SQL migration
3. Test adding items to cart
4. Test the full checkout flow
5. Report back with results!

**I'm here to help debug any issues!** 🚀

