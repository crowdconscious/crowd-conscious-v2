# 🚨 RUN THIS SQL MIGRATION NOW

## The Problem
Your console shows: **"Failed to load resource: 500"** for `/api/cart:1`

This is because the `cart_items` table doesn't exist in your database yet.

---

## ✅ THE SOLUTION (2 minutes)

### **Step 1: Go to Supabase**
1. Open: https://supabase.com/dashboard
2. Select your project: `crowd-conscious-v2`
3. Click **SQL Editor** in the left sidebar

### **Step 2: Copy the SQL**
Open this file in your project:
```
sql-migrations/create-cart-items-simple.sql
```

**OR** copy this SQL directly:

```sql
-- Cart Items Table for Shopping Cart System
-- Run this in Supabase SQL Editor

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  employee_count INTEGER NOT NULL DEFAULT 50,
  price_snapshot NUMERIC(10,2) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(corporate_account_id, module_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_corporate_account 
ON cart_items(corporate_account_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_module 
ON cart_items(module_id);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Corporate admins can view own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can delete own cart items" ON cart_items;

-- RLS Policies
CREATE POLICY "Corporate admins can view own cart"
ON cart_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.corporate_account_id = cart_items.corporate_account_id
    AND profiles.corporate_role = 'admin'
  )
);

CREATE POLICY "Corporate admins can add to own cart"
ON cart_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.corporate_account_id = cart_items.corporate_account_id
    AND profiles.corporate_role = 'admin'
  )
);

CREATE POLICY "Corporate admins can update own cart items"
ON cart_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.corporate_account_id = cart_items.corporate_account_id
    AND profiles.corporate_role = 'admin'
  )
);

CREATE POLICY "Corporate admins can delete own cart items"
ON cart_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.corporate_account_id = cart_items.corporate_account_id
    AND profiles.corporate_role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();

-- Verify
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'cart_items'
ORDER BY ordinal_position;
```

### **Step 3: Run the SQL**
1. Paste the SQL into the Supabase SQL Editor
2. Click **"Run"** button (or press Cmd/Ctrl + Enter)
3. Wait for success message

### **Step 4: Verify**
You should see output showing the `cart_items` table columns:
- id (uuid)
- corporate_account_id (uuid)
- module_id (uuid)
- employee_count (integer)
- price_snapshot (numeric)
- added_at (timestamp)
- updated_at (timestamp)

---

## 🧪 Test After Running SQL

1. **Refresh the module page** in your browser
2. **Click "Agregar al Carrito"**
3. **Expected Results:**
   - ✅ No more 500 errors in console
   - ✅ Success message: "¡Agregado al carrito!"
   - ✅ Cart button shows badge with count (e.g., "1")
   - ✅ Cart sidebar opens when you click the cart button

---

## 🐛 If You Still See Errors

### **Error: "Only corporate admins can access cart"**
**Solution:** You need to be logged in as a corporate admin.

**Quick fix:**
```sql
-- Check your user's role
SELECT id, email, corporate_role, corporate_account_id 
FROM profiles 
WHERE id = auth.uid();

-- If corporate_role is NULL, update it:
UPDATE profiles 
SET 
  corporate_role = 'admin',
  corporate_account_id = (SELECT id FROM corporate_accounts LIMIT 1)
WHERE id = auth.uid();
```

### **Error: "Module already owned"**
This means your corporate account already owns this module. Try a different module or check:
```sql
SELECT * FROM course_enrollments 
WHERE corporate_account_id = (
  SELECT corporate_account_id FROM profiles WHERE id = auth.uid()
);
```

---

## 📋 What This SQL Creates

1. **`cart_items` table** - Stores shopping cart items
2. **Indexes** - For fast queries on corporate_account_id and module_id
3. **RLS Policies** - Security rules (only corporate admins can access their own cart)
4. **Trigger** - Auto-updates `updated_at` timestamp
5. **Unique constraint** - Prevents duplicate items (same module in same cart)

---

## ✅ Success Criteria

After running the SQL, you should be able to:
- ✅ Add modules to cart without errors
- ✅ See cart count badge on cart button
- ✅ Open cart sidebar and see items
- ✅ Update quantities
- ✅ Remove items
- ✅ Proceed to checkout

---

## 🚀 Next Steps After SQL Migration

1. Test adding modules to cart
2. Test cart sidebar functionality
3. Test checkout flow
4. Report back with results!

**Run the SQL now and let me know when it's done!** 🎯

