# ============================================================
# CROWD CONSCIOUS — COMPLETE OVERHAUL PROMPTS
# ============================================================
# Run EACH phase as a SEPARATE Cursor prompt.
# Wait for build to pass before moving to next phase.
# 
# Phase 0: Backup (you do this manually)
# Phase 1: Archive non-prediction features
# Phase 2: New multi-outcome market database schema
# Phase 3: New vote API + market detail UI
# Phase 4: New landing page + navigation + unified theme
# Phase 5: World Cup seed markets
# ============================================================


# ============================================================
# PHASE 0: BACKUP (Do this yourself before anything else)
# ============================================================

# In your terminal:
#
#   git add -A && git commit -m "pre-overhaul snapshot"
#   git branch archive/pre-overhaul
#   git checkout -b feature/world-cup-overhaul
#
# In Supabase Dashboard:
#   → Settings → Database → Create a backup / download backup
#
# Save your current .env.local somewhere safe.
#
# DONE? Good. Now proceed with Phase 1.


# ============================================================
# PHASE 1: ARCHIVE NON-PREDICTION FEATURES
# ============================================================
# Goal: Remove everything that isn't predictions, auth, 
# gamification, or Concientizaciones (kept at separate path).
# 
# CRITICAL RULES:
# - Create /archive/ directory at project root
# - MOVE files (don't delete) — preserve directory structure
# - Do NOT touch any Supabase migrations
# - Do NOT drop any database tables
# - Do NOT remove any .env variables yet
# - After moving files, fix ALL build errors before stopping
# ============================================================

## What we're keeping (DO NOT MOVE these):

### Auth & Core
- app/(public)/login/
- app/(public)/signup/
- app/(public)/forgot-password/
- app/(public)/reset-password/
- app/(public)/about/
- app/(public)/privacy/
- app/(public)/terms/
- app/(public)/cookies/
- app/verify/
- app/verify/[code]/
- app/page.tsx (landing — will rewrite in Phase 4)

### Predictions (entire section stays)
- app/(predictions)/ (ALL files and subdirectories)

### Gamification & User
- app/(app)/dashboard/page.tsx (main dashboard only)
- app/(app)/leaderboard/
- app/(app)/achievements/
- app/(app)/profile/
- app/(app)/settings/

### Admin
- app/admin/ (ALL — we need market management)

### Concientizaciones (KEEP but we'll decouple from main nav)
- app/concientizaciones/ (landing page)
- app/employee-portal/ (entire directory)
- app/employee-portal-public/
- app/corporate/ (entire directory)
- app/signup-corporate/

### API routes to keep:
- app/api/auth/
- app/api/predictions/ (ALL)
- app/api/gamification/
- app/api/user/
- app/api/user-stats/
- app/api/admin/
- app/api/landing/
- app/api/webhooks/stripe (keep — sponsors may pay via Stripe later)
- app/api/cron/monthly-impact/
- app/api/modules/ (needed by Concientizaciones)
- app/api/enrollments/ (needed by Concientizaciones)
- app/api/activities/ (needed by Concientizaciones)
- app/api/certificates/ (needed by Concientizaciones)
- app/api/corporate/ (needed by Concientizaciones)
- app/api/esg/ (needed by Concientizaciones)

## Files to MOVE to /archive/:

### Routes to archive:
```
MOVE app/(app)/communities/           → archive/app/(app)/communities/
MOVE app/(app)/discover/              → archive/app/(app)/discover/
MOVE app/(app)/marketplace-browse/    → archive/app/(app)/marketplace-browse/
MOVE app/(app)/marketplace/           → archive/app/(app)/marketplace/
MOVE app/(app)/dashboard/payments/    → archive/app/(app)/dashboard/payments/
MOVE app/marketplace/                 → archive/app/marketplace/
MOVE app/checkout/                    → archive/app/checkout/
MOVE app/creator/                     → archive/app/creator/
MOVE app/demo-hub/                    → archive/app/demo-hub/
MOVE app/enhanced-demo/               → archive/app/enhanced-demo/
MOVE app/enhanced-community-demo/     → archive/app/enhanced-community-demo/
MOVE app/demo-disclaimer/             → archive/app/demo-disclaimer/
MOVE app/demo/                        → archive/app/demo/
MOVE app/design-system/               → archive/app/design-system/
MOVE app/sponsorship/                 → archive/app/sponsorship/
MOVE app/proposal/                    → archive/app/proposal/
MOVE app/module-trial/                → archive/app/module-trial/
MOVE app/assessment/                  → archive/app/assessment/
MOVE app/(public)/share/              → archive/app/(public)/share/
MOVE app/(public)/impact/             → archive/app/(public)/impact/
MOVE app/(app)/setup-admin/           → archive/app/(app)/setup-admin/
```

### API routes to archive:
```
MOVE app/api/communities/     → archive/app/api/communities/
MOVE app/api/comments/        → archive/app/api/comments/
MOVE app/api/share/           → archive/app/api/share/
MOVE app/api/polls/           → archive/app/api/polls/
MOVE app/api/events/          → archive/app/api/events/
MOVE app/api/cart/            → archive/app/api/cart/
MOVE app/api/payments/        → archive/app/api/payments/
MOVE app/api/marketplace/     → archive/app/api/marketplace/
MOVE app/api/treasury/        → archive/app/api/treasury/
MOVE app/api/wallets/         → archive/app/api/wallets/
MOVE app/api/creator/         → archive/app/api/creator/
MOVE app/api/assessment/      → archive/app/api/assessment/
MOVE app/api/stripe/connect/  → archive/app/api/stripe/connect/
MOVE app/api/locations/       → archive/app/api/locations/
MOVE app/api/cron/challenge-reminders/ → archive/app/api/cron/challenge-reminders/
MOVE app/api/cron/event-reminders/     → archive/app/api/cron/event-reminders/
MOVE all app/api/test-* routes         → archive/app/api/
MOVE all app/api/debug-* routes        → archive/app/api/
MOVE all app/api/diagnose-* routes     → archive/app/api/
MOVE app/api/verify-payment/           → archive/app/api/verify-payment/
```

### Components to archive:
```
MOVE these components to archive/components/:
- AnalyticsTracker (if it exists as standalone)
- MarketplacePurchaseButton
- PaymentForm
- SelfEnrollButton  
- WalletCard
- DesignSystemDemo
- Any component ONLY used by archived routes (check imports)
```

**IMPORTANT: Do NOT archive these shared components even if they seem community-related:**
- GamificationSystem (used by dashboard)
- NotificationSystem (used globally)
- DashboardNavigation (will modify)
- MobileNavigation (will modify)
- Footer (will modify)
- CoreValuesSelector (may be used in predictions categories)
- Any UI primitives (Toast, Card, Badge, etc.)

## Navigation Update

Find the navigation components (DashboardNavigation, MobileNavigation, and any sidebar/header nav) and update them:

### Remove these nav items:
- Communities (or any link to /communities)
- Learn & Earn
- Crear Módulo (green button)
- The red "Admin" button from the visible nav bar

### Keep/Add these nav items (in this order):
1. **Dashboard** → /predictions (the predictions dashboard IS the main dashboard)
2. **Markets** → /predictions/markets  
3. **Leaderboard** → /leaderboard
4. **Fund** → /predictions/fund
5. **Profile** → /profile (or user avatar dropdown with Profile + Settings)

### Concientizaciones link:
- Do NOT put Concientizaciones in the main nav
- It keeps its own layout and navigation (the employee-portal layout)
- It's accessible via direct URL: /concientizaciones, /employee-portal/*, /corporate/*
- If there's a CorporateTrainingCard on the dashboard, REMOVE it from the main dashboard
- Later we can add a small footer link "For Businesses → /concientizaciones"

## Predictions Access Gate Removal

Find and remove the predictions gate mechanism:
- The gate page at app/(predictions)/predictions/gate/page.tsx — ARCHIVE it
- Any middleware or cookie check for PREDICTIONS_ACCESS_CODE
- Any redirect logic that sends users to /predictions/gate
- The predictions section should be directly accessible after login
- /dashboard should redirect to /predictions (or they should be merged)

## vercel.json Update

Remove these cron entries:
- challenge-reminders
- event-reminders (if present)

Keep:
- monthly-impact

## Build Fix Strategy

After moving all files, run `npm run build`. You WILL get errors. Here's how to fix them:

### Error type 1: "Module not found" for an archived import
→ Find the file importing it. If the importing file is in a kept route, remove the import and any JSX/code using it. If the importing file should have been archived too, move it.

### Error type 2: Shared component imports something archived
→ The shared component may need a conditional import removed, or the archived feature's code should be extracted from the shared component.

### Error type 3: Layout file references archived nav items
→ Update the layout to remove the archived nav items (you should have already done this in the nav update step).

### Error type 4: Landing page (app/page.tsx) imports archived components
→ For now, just comment out or remove the imports and their JSX. We'll rewrite the landing page in Phase 4.

### Error type 5: API route imports something from archived path
→ If the API route was supposed to be archived, move it. If it's a kept route, fix the import.

**Keep running `npm run build` until it passes with 0 errors.**

## Final Verification Checklist

After build passes, manually test these URLs:

- [ ] / (landing page loads — may look broken, that's OK for now)
- [ ] /login (login page works)
- [ ] /signup (signup works)
- [ ] /predictions (predictions dashboard loads after auth)
- [ ] /predictions/markets (market list loads)
- [ ] /predictions/markets/[pick-any-id] (market detail loads)
- [ ] /predictions/wallet (still loads — we'll transform this in Phase 2)
- [ ] /predictions/fund (conscious fund loads)
- [ ] /leaderboard (leaderboard loads)
- [ ] /achievements (achievements load)
- [ ] /profile (profile loads)
- [ ] /admin (admin loads)
- [ ] /concientizaciones (concientizaciones landing loads)
- [ ] /employee-portal/dashboard (employee portal loads if logged in)

**Report: list of files moved, number of build errors fixed, and any URLs that don't work.**

When build is green and all URLs above work → proceed to Phase 2.


# ============================================================
# PHASE 2: NEW MULTI-OUTCOME MARKET SCHEMA
# ============================================================
# Goal: Add support for markets with 2+ outcomes (not just 
# binary YES/NO). Create the free-to-play vote system.
#
# This phase is DATABASE ONLY. No frontend changes yet.
# Create all changes as a new Supabase migration file.
# ============================================================

## Create a new migration file

Create file: `supabase/migrations/[next-number]_market_overhaul.sql`

Use the next sequential migration number based on existing files.

```sql
-- ============================================================
-- MARKET OVERHAUL: Multi-outcome + Free-to-play
-- ============================================================

-- 1. Market Outcomes Table
-- Each market can have 2+ outcomes (replaces binary YES/NO)
-- For binary markets: create 2 outcomes ("Yes", "No")
-- For multi-outcome: create N outcomes ("Mexico", "South Korea", etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS market_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id uuid REFERENCES prediction_markets(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,                    -- "Yes", "No", "Mexico", "March 31", etc.
  description text,                       -- Optional longer description
  probability numeric DEFAULT 0.5 NOT NULL CHECK (probability >= 0 AND probability <= 1),
  vote_count integer DEFAULT 0 NOT NULL,
  total_confidence integer DEFAULT 0 NOT NULL,  -- sum of all confidence votes
  sort_order integer DEFAULT 0,           -- display order
  is_winner boolean,                      -- null until resolved, true for winning outcome
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_market_outcomes_market ON market_outcomes(market_id);

-- 2. Market Votes Table  
-- Replaces prediction_trades for free-to-play
-- One vote per user per market (they pick ONE outcome)
-- ============================================================

CREATE TABLE IF NOT EXISTS market_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id uuid REFERENCES prediction_markets(id) ON DELETE CASCADE NOT NULL,
  outcome_id uuid REFERENCES market_outcomes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  confidence integer NOT NULL CHECK (confidence >= 1 AND confidence <= 10),
  xp_earned integer NOT NULL DEFAULT 5,
  is_correct boolean,               -- null until resolved
  bonus_xp integer DEFAULT 0,       -- awarded on resolution
  created_at timestamptz DEFAULT now(),
  UNIQUE(market_id, user_id)        -- one vote per market per user
);

CREATE INDEX idx_market_votes_market ON market_votes(market_id);
CREATE INDEX idx_market_votes_user ON market_votes(user_id);
CREATE INDEX idx_market_votes_outcome ON market_votes(outcome_id);

-- 3. Sponsor fields on prediction_markets
-- ============================================================

ALTER TABLE prediction_markets 
ADD COLUMN IF NOT EXISTS sponsor_name text,
ADD COLUMN IF NOT EXISTS sponsor_logo_url text,
ADD COLUMN IF NOT EXISTS sponsor_contribution numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS market_type text DEFAULT 'binary' CHECK (market_type IN ('binary', 'multi')),
ADD COLUMN IF NOT EXISTS total_votes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url text;

-- 4. RLS Policies
-- ============================================================

ALTER TABLE market_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_votes ENABLE ROW LEVEL SECURITY;

-- market_outcomes: anyone can read, only service role creates
CREATE POLICY "Anyone can view outcomes" ON market_outcomes
  FOR SELECT USING (true);

-- market_votes: anyone can read, authenticated users can insert own
CREATE POLICY "Anyone can view votes" ON market_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON market_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Core RPC: Execute a vote
-- ============================================================

CREATE OR REPLACE FUNCTION execute_market_vote(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market prediction_markets%ROWTYPE;
  v_outcome market_outcomes%ROWTYPE;
  v_existing market_votes%ROWTYPE;
  v_xp integer;
  v_vote_id uuid;
  v_outcome_rec RECORD;
  v_total_weight numeric;
BEGIN
  -- Validate market
  SELECT * INTO v_market FROM prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;

  -- Validate outcome belongs to market
  SELECT * INTO v_outcome FROM market_outcomes 
  WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  -- Check user hasn't already voted on this market
  SELECT * INTO v_existing FROM market_votes 
  WHERE market_id = p_market_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already voted on this market');
  END IF;

  -- Validate confidence
  IF p_confidence < 1 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10');
  END IF;

  -- Calculate XP: base 5 + (confidence - 1) bonus = range 5-14
  v_xp := 5 + (p_confidence - 1);

  -- Insert vote
  INSERT INTO market_votes (market_id, outcome_id, user_id, confidence, xp_earned)
  VALUES (p_market_id, p_outcome_id, p_user_id, p_confidence, v_xp)
  RETURNING id INTO v_vote_id;

  -- Update outcome vote count
  UPDATE market_outcomes 
  SET vote_count = vote_count + 1,
      total_confidence = total_confidence + p_confidence
  WHERE id = p_outcome_id;

  -- Update market total votes
  UPDATE prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  -- Recalculate ALL outcome probabilities for this market
  -- Probability = outcome's total_confidence / sum of all outcomes' total_confidence
  SELECT SUM(total_confidence) INTO v_total_weight
  FROM market_outcomes WHERE market_id = p_market_id;

  IF v_total_weight > 0 THEN
    FOR v_outcome_rec IN 
      SELECT id, total_confidence FROM market_outcomes WHERE market_id = p_market_id
    LOOP
      UPDATE market_outcomes 
      SET probability = v_outcome_rec.total_confidence::numeric / v_total_weight
      WHERE id = v_outcome_rec.id;
    END LOOP;
  END IF;

  -- Update market's current_probability (for binary markets, use the "Yes" outcome)
  -- For multi-outcome markets, store the highest probability
  IF v_market.market_type = 'binary' THEN
    UPDATE prediction_markets
    SET current_probability = (
      SELECT probability FROM market_outcomes 
      WHERE market_id = p_market_id AND LOWER(label) IN ('yes', 'sí', 'si')
      LIMIT 1
    )
    WHERE id = p_market_id;
  ELSE
    UPDATE prediction_markets
    SET current_probability = (
      SELECT MAX(probability) FROM market_outcomes WHERE market_id = p_market_id
    )
    WHERE id = p_market_id;
  END IF;

  -- Insert history point
  INSERT INTO prediction_market_history (market_id, probability, volume)
  VALUES (p_market_id, 
    (SELECT probability FROM market_outcomes WHERE id = p_outcome_id),
    (SELECT total_votes FROM prediction_markets WHERE id = p_market_id));

  -- Award XP
  INSERT INTO user_xp (user_id, amount, source, description)
  VALUES (p_user_id, v_xp, 'prediction_vote', 
    'Predicted: ' || LEFT(v_outcome.label, 30) || ' on ' || LEFT(v_market.title, 40));

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM market_outcomes WHERE id = p_outcome_id),
    'confidence', p_confidence
  );
END;
$$;

-- 6. Resolve market RPC (with multi-outcome support)
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_market_free(
  p_market_id uuid,
  p_winning_outcome_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vote RECORD;
  v_bonus integer;
  v_correct integer := 0;
  v_total integer := 0;
BEGIN
  -- Validate winning outcome belongs to market
  IF NOT EXISTS (
    SELECT 1 FROM market_outcomes 
    WHERE id = p_winning_outcome_id AND market_id = p_market_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome');
  END IF;

  -- Mark market resolved
  UPDATE prediction_markets 
  SET status = 'resolved',
      resolution = (SELECT label FROM market_outcomes WHERE id = p_winning_outcome_id),
      resolved_at = now()
  WHERE id = p_market_id;

  -- Mark winning outcome
  UPDATE market_outcomes SET is_winner = true WHERE id = p_winning_outcome_id;
  UPDATE market_outcomes SET is_winner = false 
  WHERE market_id = p_market_id AND id != p_winning_outcome_id;

  -- Award XP to correct voters
  FOR v_vote IN 
    SELECT * FROM market_votes WHERE market_id = p_market_id
  LOOP
    v_total := v_total + 1;

    IF v_vote.outcome_id = p_winning_outcome_id THEN
      -- Correct! Bonus scales with confidence: 5 to 50 XP
      v_bonus := GREATEST(5, (50 * v_vote.confidence) / 10);
      v_correct := v_correct + 1;

      UPDATE market_votes 
      SET is_correct = true, bonus_xp = v_bonus 
      WHERE id = v_vote.id;

      INSERT INTO user_xp (user_id, amount, source, description)
      VALUES (v_vote.user_id, v_bonus, 'prediction_correct', 
        'Correct prediction! Bonus XP');
    ELSE
      UPDATE market_votes 
      SET is_correct = false, bonus_xp = 0 
      WHERE id = v_vote.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_voters', v_total,
    'correct_voters', v_correct,
    'winning_outcome', (SELECT label FROM market_outcomes WHERE id = p_winning_outcome_id)
  );
END;
$$;

-- 7. Helper: Create a binary market with outcomes
-- ============================================================

CREATE OR REPLACE FUNCTION create_binary_market(
  p_title text,
  p_description text,
  p_category text,
  p_created_by uuid,
  p_end_date timestamptz,
  p_sponsor_name text DEFAULT NULL,
  p_sponsor_logo_url text DEFAULT NULL,
  p_image_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market_id uuid;
BEGIN
  INSERT INTO prediction_markets (title, description, category, created_by, end_date, 
    market_type, sponsor_name, sponsor_logo_url, image_url, status, current_probability)
  VALUES (p_title, p_description, p_category, p_created_by, p_end_date,
    'binary', p_sponsor_name, p_sponsor_logo_url, p_image_url, 'active', 0.5)
  RETURNING id INTO v_market_id;

  INSERT INTO market_outcomes (market_id, label, probability, sort_order)
  VALUES 
    (v_market_id, 'Yes', 0.5, 0),
    (v_market_id, 'No', 0.5, 1);

  RETURN v_market_id;
END;
$$;

-- 8. Helper: Create a multi-outcome market
-- ============================================================

CREATE OR REPLACE FUNCTION create_multi_market(
  p_title text,
  p_description text,
  p_category text,
  p_created_by uuid,
  p_end_date timestamptz,
  p_outcomes text[],              -- array of outcome labels
  p_sponsor_name text DEFAULT NULL,
  p_sponsor_logo_url text DEFAULT NULL,
  p_image_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market_id uuid;
  v_label text;
  v_initial_prob numeric;
  v_sort integer := 0;
BEGIN
  v_initial_prob := 1.0 / array_length(p_outcomes, 1);

  INSERT INTO prediction_markets (title, description, category, created_by, end_date,
    market_type, sponsor_name, sponsor_logo_url, image_url, status, current_probability)
  VALUES (p_title, p_description, p_category, p_created_by, p_end_date,
    'multi', p_sponsor_name, p_sponsor_logo_url, p_image_url, 'active', v_initial_prob)
  RETURNING id INTO v_market_id;

  FOREACH v_label IN ARRAY p_outcomes
  LOOP
    INSERT INTO market_outcomes (market_id, label, probability, sort_order)
    VALUES (v_market_id, v_label, v_initial_prob, v_sort);
    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_market_id;
END;
$$;
```

## After creating the migration:

1. Apply it to your Supabase database (either via CLI `supabase db push` or paste the SQL into the SQL editor in the Supabase dashboard)
2. Verify the tables exist: `SELECT * FROM market_outcomes LIMIT 1;` and `SELECT * FROM market_votes LIMIT 1;`
3. Test creating a binary market:
```sql
SELECT create_binary_market(
  'Test: Will it rain tomorrow?',
  'Testing binary market creation',
  'test',
  (SELECT id FROM auth.users LIMIT 1),
  now() + interval '7 days'
);
```
4. Verify 2 outcomes were created: `SELECT * FROM market_outcomes;`
5. Test creating a multi-outcome market:
```sql
SELECT create_multi_market(
  'Who will win World Cup Group A?',
  'Mexico, South Korea, South Africa, or UEFA Playoff D?',
  'world_cup',
  (SELECT id FROM auth.users LIMIT 1),
  now() + interval '90 days',
  ARRAY['Mexico', 'South Korea', 'South Africa', 'UEFA Playoff D']
);
```
6. Verify 4 outcomes were created with equal probabilities (~0.25 each)

**Report: confirm migration applied, tables created, test markets work.**

When confirmed → proceed to Phase 3.


# ============================================================
# PHASE 3: NEW VOTE API + MARKET UI TRANSFORMATION
# ============================================================
# Goal: Replace the money-based trading UI with free-to-play
# voting. Support both binary and multi-outcome markets.
# ============================================================

## 3A: New API Route for Voting

Create a new API route at `app/api/predictions/vote/route.ts`:

```typescript
// POST /api/predictions/vote
// Body: { market_id: string, outcome_id: string, confidence: number }
// 
// 1. Get authenticated user from session
// 2. Validate inputs (market_id, outcome_id are UUIDs, confidence is 1-10)
// 3. Call execute_market_vote RPC
// 4. Return the result
//
// Error handling:
// - 401 if not authenticated
// - 400 if invalid inputs
// - 400 if RPC returns success: false (already voted, market closed, etc.)
// - 500 for unexpected errors
```

Implement this using the existing patterns from other prediction API routes in the codebase. Use `createClient` from the supabase-server util. Call the RPC like:

```typescript
const { data, error } = await supabase.rpc('execute_market_vote', {
  p_user_id: user.id,
  p_market_id: body.market_id,
  p_outcome_id: body.outcome_id,
  p_confidence: body.confidence,
});
```

## 3B: New API Route for Market Outcomes

Create `app/api/predictions/markets/[id]/outcomes/route.ts`:

```typescript
// GET /api/predictions/markets/[id]/outcomes
// Returns all outcomes for a market, ordered by sort_order
// Include: id, label, probability, vote_count, total_confidence, is_winner
```

## 3C: API Route for User's Vote on a Market

Create or update to include user's vote status:

```typescript
// GET /api/predictions/markets/[id]/my-vote
// Returns the user's vote on this market (if any)
// Include: outcome_id, outcome_label, confidence, xp_earned, is_correct, bonus_xp
// Returns null/404 if user hasn't voted
```

## 3D: Update Admin Market Resolution

Update the admin resolve page/API at `/predictions/admin/resolve` to:
1. Fetch all outcomes for the market
2. Let admin select the winning outcome from a dropdown
3. Call `resolve_market_free` RPC instead of `resolve_prediction_market`
4. Show results: total voters, correct voters, XP distributed

## 3E: Transform Market Detail Page

This is the biggest UI change. Update `app/(predictions)/predictions/markets/[id]/page.tsx`:

### Data Fetching:
- Fetch market data (existing)
- Fetch outcomes from market_outcomes table (NEW)
- Fetch user's vote from market_votes (NEW)
- Fetch history from prediction_market_history (existing)

### Layout for BINARY markets (2 outcomes):
Keep the current layout roughly, but replace the Trade panel:

```
┌──────────────────────────────────────────────────────────┐
│ [Category Tag]                                           │
│ Market Title                                             │
│ Created by [user] on [date]                    [active]  │
├──────────────────────────┬───────────────────────────────┤
│                          │                               │
│  Current probability     │  Make Your Prediction         │
│  ████████████ 55% YES    │                               │
│                          │  ┌─────────┐  ┌─────────┐    │
│  Probability chart       │  │ I think  │  │ I think │    │
│  (keep existing)         │  │   YES ✓  │  │   NO ✗  │    │
│                          │  └─────────┘  └─────────┘    │
│  [Total votes] voters    │                               │
│                          │  How sure are you?            │
│  Sponsored by [logo]     │  ○○○○○○●○○○  7/10            │
│  (if sponsor exists)     │  "Pretty sure"                │
│                          │                               │
│                          │  ┌─────────────────────┐      │
│                          │  │     Predict          │      │
│                          │  └─────────────────────┘      │
│                          │                               │
│                          │  ── Your Prediction ──        │
│                          │  ✓ YES at confidence 7        │
│                          │  +12 XP earned                │
│                          │  (shows after voting)         │
│                          │                               │
├──────────────────────────┴───────────────────────────────┤
│ Market Info: Resolution date, Total votes, Category      │
│ Conscious Fund: $X.XX funded by sponsor                  │
└──────────────────────────────────────────────────────────┘
```

### Layout for MULTI-OUTCOME markets (3+ outcomes):

```
┌──────────────────────────────────────────────────────────┐
│ [Category Tag]          Sponsored by [Brand Logo]        │
│ Market Title                                             │
│ Description text                                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Mexico               82%  ▲33%   [ Predict ]   │     │
│  │ $11.2M volume · ████████████████████░░░░░       │     │
│  ├─────────────────────────────────────────────────┤     │
│  │ South Korea           8%  ▼2%    [ Predict ]   │     │
│  │ $977K volume · ██░░░░░░░░░░░░░░░░░░░░░░░       │     │
│  ├─────────────────────────────────────────────────┤     │
│  │ South Africa          5%  ▼1%    [ Predict ]   │     │
│  │ $987K volume · █░░░░░░░░░░░░░░░░░░░░░░░░       │     │
│  ├─────────────────────────────────────────────────┤     │
│  │ UEFA Playoff D        5%         [ Predict ]   │     │
│  │ $500K volume · █░░░░░░░░░░░░░░░░░░░░░░░░       │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  When user clicks [Predict] on an outcome:               │
│  Show confidence slider (1-10) inline or in modal        │
│  Then submit vote via API                                │
│                                                          │
│  After voting, highlight their chosen outcome and show:  │
│  "Your pick: Mexico at confidence 8 · +13 XP"           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Probability chart · Market rules · Resolution date       │
└──────────────────────────────────────────────────────────┘
```

### Confidence Slider Labels:
- 1: "Wild guess"
- 2-3: "Just a hunch"  
- 4-5: "I think so"
- 6-7: "Pretty sure"
- 8-9: "Very confident"
- 10: "Absolutely certain"

### UI State Management:
- **Before voting:** Show all outcomes with [Predict] buttons
- **Selecting:** When user clicks an outcome, highlight it and show confidence slider
- **After voting:** Disable all [Predict] buttons, highlight user's choice with a checkmark, show XP earned
- **Resolved market:** Show which outcome won, whether user was correct, and bonus XP

## 3F: Update Market List Page

Update `app/(predictions)/predictions/markets/page.tsx`:

For each market card:
- Show market title, category, total votes count
- For binary: show YES probability as before
- For multi: show the leading outcome + its probability (e.g., "Mexico 82%")
- Replace "Volume: $20" with "[N] predictions"
- Add sponsor badge if sponsor_name exists
- Add market image if image_url exists
- Show sparkline chart (keep existing)

## 3G: Update Predictions Dashboard

Update `app/(predictions)/predictions/page.tsx`:

Replace:
- "Portfolio Value: $X" → "Prediction Score: [total XP] XP"
- "Total P&L: +$X" → "Accuracy: X%" (count of correct / total resolved votes)  
- "Conscious Impact: $X" → keep, but label as "Sponsor-funded impact"

"Your Active Positions" → "Your Predictions":
- Fetch from market_votes joined with prediction_markets and market_outcomes
- Show: market title, your pick (outcome label), confidence, XP earned
- For resolved: show ✓ or ✗ and bonus XP

Remove from sidebar:
- "Wallet" link → remove entirely
- "My Trades" → rename to "My Predictions" and show votes instead of trades

## 3H: Remove Money References

Search the ENTIRE codebase for these terms and remove/replace:
- "wallet" in prediction UI → remove
- "deposit" in prediction UI → remove
- "MXN" in prediction UI → remove
- "$" followed by amounts in prediction UI → replace with XP or probability %
- "shares" in prediction UI → replace with "predictions" or "votes"
- "trade" in prediction UI → replace with "prediction" or "vote"
- "portfolio" in prediction UI → replace with "prediction score"
- "P&L" or "profit" → replace with "accuracy"
- "Buy Yes" / "Buy No" → "I think Yes" / "I think No"

Do NOT remove money references from:
- Concientizaciones/corporate (they may still use Stripe for course purchases)
- Admin sections (you may need monetary tracking for sponsors later)
- Stripe webhook handler (keep for future sponsor payments)

## Build and Test

Run `npm run build` — fix all errors.

Test:
1. Visit a market → see outcomes listed
2. Click "Predict" on an outcome → see confidence slider
3. Submit prediction → see XP earned message
4. Visit another market, try multi-outcome → works
5. Visit /predictions dashboard → see prediction score, accuracy, your predictions
6. Admin: resolve a market → select winning outcome → correct voters get bonus XP
7. Leaderboard reflects new XP

**Report results.**


# ============================================================
# PHASE 4: LANDING PAGE + UNIFIED THEME
# ============================================================
# Goal: New World Cup-ready landing page, dark theme everywhere,
# onboarding flow.
# ============================================================

## Landing Page Rewrite (app/page.tsx)

Rewrite the landing page completely. Design direction: dark theme matching the predictions section. The prediction market IS the product now.

### Hero Section:
- Background: dark with subtle gradient (match predictions dark theme)
- Headline: "Predict what matters. Fund real change."
- Subheadline: "Free predictions on the World Cup, your city, and the issues you care about. No money needed — brands sponsor the impact."
- Primary CTA: "Start Predicting" → /signup (bright green button)
- Secondary CTA: "Browse Markets" → /predictions/markets
- Show 2-3 live market cards from the actual database (top markets by total_votes)

### How It Works (3 steps):
1. "Pick a market" — World Cup, sustainability, policy, culture
2. "Share your prediction" — Vote with confidence. Earn XP. Climb the leaderboard.
3. "Fund real impact" — Brand sponsors fund the Conscious Fund. Your engagement decides where it goes.

### Live Markets Preview:
- Show 3-4 trending markets (actual data from DB)
- Each shows: title, leading outcome %, total votes, category
- "See all markets →" link

### Conscious Fund Section:
- Brief explanation: "Every prediction drives real impact"
- Show fund total, causes funded
- "Learn more →" link to /predictions/fund

### Footer:
- Keep legal links (terms, privacy, cookies)
- Add: "For Businesses" → /concientizaciones
- Add: "About" → /about
- Remove: Communities, Brands, Impact links
- Keep the ES/EN language toggle

### Do NOT include:
- Communities section
- Corporate training section  
- Creator economy section
- "How Crowd Conscious Works" (old 3-column)
- TrustedBrands component (unless we have real sponsors)

## Unified Dark Theme

The predictions section uses a dark theme that looks great. Apply it to ALL authenticated pages:

1. The app layout wrapper should use the dark background (#0a0f14 or whatever the predictions section uses)
2. Leaderboard, achievements, profile, settings — all dark theme
3. The main navigation should match the predictions sidebar style
4. Keep Concientizaciones/employee-portal with its own lighter theme (it's a separate product)

## Simple Onboarding

When a NEW user signs up and visits /predictions for the first time:
1. Show a brief welcome overlay: "Welcome to Crowd Conscious! Make your first prediction to earn XP."
2. Highlight 3 trending markets
3. After their first vote: show confetti animation + "You earned [N] XP! You're on the leaderboard."
4. Store a flag in their profile or localStorage so this only shows once

## Build and test the full flow:
1. Visit / → see new landing page with live markets
2. Click "Start Predicting" → signup → login → dashboard
3. See welcome overlay → pick a market → vote → see XP
4. Navigate to leaderboard → see yourself
5. Navigate to fund → see conscious fund
6. Visit /concientizaciones → still works with its own theme

**Report results.**


# ============================================================
# PHASE 5: SEED WORLD CUP MARKETS (Run after Phase 4)
# ============================================================
# Goal: Populate the platform with compelling World Cup markets.
# Run this SQL in Supabase SQL editor.
# Replace the user ID with your actual admin user ID.
# ============================================================

-- Get your user ID first:
-- SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL';
-- Replace 'YOUR_USER_ID' below with the actual UUID.

-- BINARY MARKETS (Yes/No)
SELECT create_binary_market(
  '¿Avanzará México a octavos de final en el Mundial FIFA 2026?',
  'Mexico plays in Group A with South Korea, South Africa, and a UEFA playoff team. Will they advance to the Round of 32?',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-06-25T00:00:00Z'::timestamptz, NULL, NULL,
  NULL
);

SELECT create_binary_market(
  '¿Habrá más de 2.5 goles en México vs Sudáfrica?',
  'The opening match of the World Cup at Estadio Azteca. Over or under 2.5 goals?',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-06-11T23:00:00Z'::timestamptz
);

SELECT create_binary_market(
  '¿Se llenará el Azteca para el partido inaugural?',
  'Will Estadio Azteca reach full capacity (87,000+) for Mexico vs South Africa on June 11?',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-06-12T00:00:00Z'::timestamptz
);

SELECT create_binary_market(
  '¿Colombia llegará a semifinales?',
  'Colombia is in Group B. Can they make it to the Final Four?',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-07-13T00:00:00Z'::timestamptz
);

SELECT create_binary_market(
  '¿Mejorará la calidad del aire en CDMX durante el Mundial?',
  'With restricted traffic and green initiatives for the World Cup, will air quality improve vs. the same period in 2025?',
  'sustainability', 'YOUR_USER_ID'::uuid,
  '2026-07-20T00:00:00Z'::timestamptz
);

SELECT create_binary_market(
  '¿Habrá nueva ley de apuestas en México antes del Mundial?',
  'SEGOB has been working on gambling reform. Will new legislation pass before June 11?',
  'government', 'YOUR_USER_ID'::uuid,
  '2026-06-11T00:00:00Z'::timestamptz
);

-- MULTI-OUTCOME MARKETS
SELECT create_multi_market(
  '¿Quién ganará el Grupo A del Mundial 2026?',
  'Group A: Mexico, South Korea, South Africa, UEFA Playoff D. Who finishes first?',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-06-25T00:00:00Z'::timestamptz,
  ARRAY['México', 'Corea del Sur', 'Sudáfrica', 'Repechaje UEFA D']
);

SELECT create_multi_market(
  '¿Quién ganará la Bota de Oro del Mundial 2026?',
  'Top scorer of the tournament. Who will win the Golden Boot?',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-07-19T23:00:00Z'::timestamptz,
  ARRAY['Mbappé', 'Haaland', 'Vinicius Jr.', 'Kane', 'Otro jugador']
);

SELECT create_multi_market(
  '¿Quién ganará la Copa del Mundo 2026?',
  'The biggest prediction of them all. 48 teams, one champion.',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-07-19T23:00:00Z'::timestamptz,
  ARRAY['Argentina', 'Francia', 'Brasil', 'Inglaterra', 'España', 'Alemania', 'México', 'Otro']
);

SELECT create_multi_market(
  '¿Cuál será el mejor Fan Fest del Mundial?',
  'FIFA Fan Festivals across 16 cities. Which one will be the most iconic?',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-07-20T00:00:00Z'::timestamptz,
  ARRAY['CDMX (Zócalo)', 'New York/New Jersey', 'Los Angeles', 'Guadalajara', 'Otra ciudad']
);

SELECT create_multi_market(
  '¿Cuántos goles marcará México en la fase de grupos?',
  'Mexico plays 3 group stage matches. Total goals scored.',
  'world_cup', 'YOUR_USER_ID'::uuid,
  '2026-06-25T00:00:00Z'::timestamptz,
  ARRAY['0-2 goles', '3-4 goles', '5-6 goles', '7+ goles']
);

-- Verify:
SELECT pm.title, pm.market_type, pm.category, 
  (SELECT COUNT(*) FROM market_outcomes mo WHERE mo.market_id = pm.id) as outcome_count
FROM prediction_markets pm
ORDER BY pm.created_at DESC;