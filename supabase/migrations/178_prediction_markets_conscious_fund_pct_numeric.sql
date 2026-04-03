-- conscious_fund_percentage was DECIMAL(3,2) — max 9.99 — but CHECK allows 0–100 and the UI
-- stores whole percentages (e.g. 20 for 20%). Widen so PATCH / admin saves do not overflow.
ALTER TABLE public.prediction_markets
  ALTER COLUMN conscious_fund_percentage TYPE NUMERIC(5, 2);

-- Same pattern as fee_percentage (CHECK 0–100); avoid future overflow if fees exceed 9.99%.
ALTER TABLE public.prediction_markets
  ALTER COLUMN fee_percentage TYPE NUMERIC(5, 2);
