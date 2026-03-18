-- ============================================================================
-- FIX: Create market RPCs - separate resolution_criteria from description
-- ============================================================================
-- Bug: create_binary_market and create_multi_market both set resolution_criteria
-- to the same value as description (COALESCE(p_description, ...)).
-- This causes the market detail page to show identical text for both sections.
--
-- Fix: Add optional p_resolution_criteria parameter. When provided, use it for
-- resolution_criteria; otherwise fall back to p_description for backward compat.
-- ============================================================================

-- 1. create_binary_market: add p_resolution_criteria
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_binary_market(
  p_title text,
  p_description text,
  p_category text,
  p_created_by uuid,
  p_end_date timestamptz,
  p_sponsor_name text DEFAULT NULL,
  p_sponsor_logo_url text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_resolution_criteria text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_id uuid;
BEGIN
  INSERT INTO public.prediction_markets (
    title, description, category, created_by, resolution_date,
    resolution_criteria, market_type, sponsor_name, sponsor_logo_url, image_url,
    status, current_probability
  )
  VALUES (
    p_title,
    COALESCE(p_description, 'Standard description'),
    p_category, p_created_by, p_end_date,
    COALESCE(p_resolution_criteria, p_description, 'Standard resolution'),
    'binary',
    p_sponsor_name, p_sponsor_logo_url, p_image_url,
    'active', 50.00
  )
  RETURNING id INTO v_market_id;

  INSERT INTO public.market_outcomes (market_id, label, probability, sort_order)
  VALUES
    (v_market_id, 'Yes', 0.5, 0),
    (v_market_id, 'No', 0.5, 1);

  RETURN v_market_id;
END;
$$;

-- 2. create_multi_market: add p_resolution_criteria
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_multi_market(
  p_title text,
  p_description text,
  p_category text,
  p_created_by uuid,
  p_end_date timestamptz,
  p_outcomes text[],
  p_sponsor_name text DEFAULT NULL,
  p_sponsor_logo_url text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_resolution_criteria text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_id uuid;
  v_label text;
  v_initial_prob numeric;
  v_sort integer := 0;
BEGIN
  v_initial_prob := 1.0 / NULLIF(array_length(p_outcomes, 1), 0);

  INSERT INTO public.prediction_markets (
    title, description, category, created_by, resolution_date,
    resolution_criteria, market_type, sponsor_name, sponsor_logo_url, image_url,
    status, current_probability
  )
  VALUES (
    p_title,
    COALESCE(p_description, 'Standard description'),
    p_category, p_created_by, p_end_date,
    COALESCE(p_resolution_criteria, p_description, 'Standard resolution'),
    'multi',
    p_sponsor_name, p_sponsor_logo_url, p_image_url,
    'active', v_initial_prob * 100
  )
  RETURNING id INTO v_market_id;

  FOREACH v_label IN ARRAY p_outcomes
  LOOP
    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order)
    VALUES (v_market_id, v_label, v_initial_prob, v_sort);
    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_market_id;
END;
$$;
