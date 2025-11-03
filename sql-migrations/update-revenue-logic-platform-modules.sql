-- Update process_module_sale function to handle platform modules (100% revenue)
CREATE OR REPLACE FUNCTION process_module_sale(
  p_module_id UUID,
  p_corporate_account_id UUID,
  p_total_amount NUMERIC,
  p_creator_donates BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_module RECORD;
  v_community_wallet_id UUID;
  v_creator_wallet_id UUID;
  v_platform_wallet_id UUID;
  v_platform_fee NUMERIC;
  v_community_share NUMERIC;
  v_creator_share NUMERIC;
  v_transaction_ids JSONB := '[]';
  v_trans_id UUID;
BEGIN
  -- Get module details
  SELECT * INTO v_module FROM marketplace_modules WHERE id = p_module_id;
  
  -- Check if this is a platform module
  IF v_module.is_platform_module = TRUE THEN
    -- Platform modules: 100% to platform
    v_platform_fee := p_total_amount; -- 100%
    v_community_share := 0.00;
    v_creator_share := 0.00;
    
    -- Only get platform wallet
    v_platform_wallet_id := get_or_create_wallet('platform', NULL);
    v_community_wallet_id := NULL;
    v_creator_wallet_id := NULL;
  ELSE
    -- Community modules: Standard split (30/50/20)
    v_platform_fee := p_total_amount * 0.30; -- 30%
    
    IF p_creator_donates THEN
      v_community_share := p_total_amount * 0.70; -- 50% + 20% donation
      v_creator_share := 0.00;
    ELSE
      v_community_share := p_total_amount * 0.50; -- 50%
      v_creator_share := p_total_amount * 0.20; -- 20%
    END IF;
    
    -- Get or create wallets for community modules
    v_community_wallet_id := get_or_create_wallet('community', v_module.creator_community_id);
    v_creator_wallet_id := get_or_create_wallet('user', v_module.creator_user_id);
    v_platform_wallet_id := get_or_create_wallet('platform', NULL);
  END IF;
  
  -- Create sale record
  INSERT INTO module_sales (
    module_id,
    corporate_account_id,
    total_amount,
    platform_fee,
    community_share,
    creator_share,
    creator_donated_to_community,
    community_wallet_id,
    creator_wallet_id,
    platform_wallet_id,
    status
  ) VALUES (
    p_module_id,
    p_corporate_account_id,
    p_total_amount,
    v_platform_fee,
    v_community_share,
    v_creator_share,
    p_creator_donates,
    v_community_wallet_id,
    v_creator_wallet_id,
    v_platform_wallet_id,
    'completed'
  ) RETURNING id INTO v_sale_id;
  
  -- Credit platform wallet
  INSERT INTO wallet_transactions (
    wallet_id,
    type,
    amount,
    source,
    source_id,
    description,
    status,
    balance_before,
    balance_after
  )
  SELECT 
    v_platform_wallet_id,
    'credit',
    v_platform_fee,
    'module_sale',
    v_sale_id,
    CASE 
      WHEN v_module.is_platform_module THEN 'Platform module sale (100%): ' || v_module.title
      ELSE 'Platform fee (30%): ' || v_module.title
    END,
    'completed',
    balance,
    balance + v_platform_fee
  FROM wallets WHERE id = v_platform_wallet_id
  RETURNING id INTO v_trans_id;
  
  v_transaction_ids := jsonb_insert(v_transaction_ids, '{0}', to_jsonb(v_trans_id));
  
  -- Update platform wallet balance
  UPDATE wallets 
  SET balance = balance + v_platform_fee,
      updated_at = NOW()
  WHERE id = v_platform_wallet_id;
  
  -- Only credit community and creator wallets for non-platform modules
  IF v_module.is_platform_module = FALSE THEN
    -- Credit community wallet
    IF v_community_share > 0 THEN
      INSERT INTO wallet_transactions (
        wallet_id,
        type,
        amount,
        source,
        source_id,
        description,
        status,
        balance_before,
        balance_after
      )
      SELECT 
        v_community_wallet_id,
        'credit',
        v_community_share,
        'module_sale',
        v_sale_id,
        'Module sale (50%): ' || v_module.title,
        'completed',
        balance,
        balance + v_community_share
      FROM wallets WHERE id = v_community_wallet_id
      RETURNING id INTO v_trans_id;
      
      v_transaction_ids := jsonb_insert(v_transaction_ids, '{1}', to_jsonb(v_trans_id));
      
      UPDATE wallets 
      SET balance = balance + v_community_share,
          updated_at = NOW()
      WHERE id = v_community_wallet_id;
    END IF;
    
    -- Credit creator wallet (if not donated)
    IF v_creator_share > 0 THEN
      INSERT INTO wallet_transactions (
        wallet_id,
        type,
        amount,
        source,
        source_id,
        description,
        status,
        balance_before,
        balance_after
      )
      SELECT 
        v_creator_wallet_id,
        'credit',
        v_creator_share,
        'module_sale',
        v_sale_id,
        'Module sale (20%): ' || v_module.title,
        'completed',
        balance,
        balance + v_creator_share
      FROM wallets WHERE id = v_creator_wallet_id
      RETURNING id INTO v_trans_id;
      
      v_transaction_ids := jsonb_insert(v_transaction_ids, '{2}', to_jsonb(v_trans_id));
      
      UPDATE wallets 
      SET balance = balance + v_creator_share,
          updated_at = NOW()
      WHERE id = v_creator_wallet_id;
    END IF;
  END IF;
  
  -- Update sale record with transaction IDs
  UPDATE module_sales 
  SET transaction_ids = v_transaction_ids
  WHERE id = v_sale_id;
  
  -- Update module stats
  UPDATE marketplace_modules
  SET purchase_count = purchase_count + 1
  WHERE id = p_module_id;
  
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION process_module_sale IS 
'Process module sale with revenue split. Platform modules (is_platform_module=TRUE) receive 100% to platform wallet. Community modules split 30/50/20 between platform/community/creator.';

