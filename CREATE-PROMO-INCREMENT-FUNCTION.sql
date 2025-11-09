-- =====================================================
-- Create function to increment promo code usage
-- =====================================================
-- This function is called by the Stripe webhook after
-- a successful purchase with a promo code

CREATE OR REPLACE FUNCTION increment_promo_code_uses(promo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = promo_id;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION increment_promo_code_uses(UUID) TO authenticated, service_role;

-- Verify function was created
SELECT 
  'Function increment_promo_code_uses created successfully' as status,
  'Webhook can now increment promo code usage counters' as note;

