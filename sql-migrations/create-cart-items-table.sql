-- Cart Items Table for Shopping Cart System
-- Allows corporate admins to add multiple modules to cart before checkout

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_items_corporate_account 
ON cart_items(corporate_account_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_module 
ON cart_items(module_id);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Corporate admins can view their own cart
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

-- Corporate admins can insert into their own cart
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

-- Corporate admins can update their own cart items
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

-- Corporate admins can delete their own cart items
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

-- Trigger to auto-update updated_at
CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();

-- Comments
COMMENT ON TABLE cart_items IS 'Shopping cart items for corporate module purchases';
COMMENT ON COLUMN cart_items.corporate_account_id IS 'Corporate account that owns this cart';
COMMENT ON COLUMN cart_items.module_id IS 'Module in cart';
COMMENT ON COLUMN cart_items.employee_count IS 'Number of employees for this module';
COMMENT ON COLUMN cart_items.price_snapshot IS 'Price at time of adding to cart (prevents price changes)';

-- Verification query
SELECT 
  COUNT(*) as cart_item_count,
  'cart_items table created successfully' as status
FROM cart_items;

