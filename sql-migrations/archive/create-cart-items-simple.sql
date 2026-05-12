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

