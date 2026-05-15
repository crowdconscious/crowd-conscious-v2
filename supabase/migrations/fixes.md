# ============================================================
# CROWD CONSCIOUS — COMPREHENSIVE FIX & IMPROVE
# ============================================================
# Priority 1: Fix the voting error (database constraint)
# Priority 2: Fix Conscious Fund page  
# Priority 3: Stripe-powered sponsorship checkout
# Priority 4: Profile page overhaul
# Priority 5: UI polish across app
# Priority 6: Email system setup
# ============================================================


# ============================================================
# PRIORITY 1: FIX VOTING ERROR
# Run this SQL in Supabase SQL Editor IMMEDIATELY
# ============================================================

-- The error: "xp_transactions_action_type_check" constraint violation
-- The cause: user_xp table has a CHECK constraint on the source/action_type 
-- column that doesn't include 'prediction_vote' or 'prediction_correct'

-- First, let's see what the constraint allows:
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_xp'::regclass OR conrelid = 'xp_transactions'::regclass;

-- Check table name (might be user_xp or xp_transactions):
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('user_xp', 'xp_transactions') 
AND column_name IN ('source', 'action_type', 'type');

-- FIX: Drop the old constraint and recreate with new vote types
-- (Run the appropriate one based on which table/constraint exists)

-- If constraint is on user_xp table:
ALTER TABLE user_xp DROP CONSTRAINT IF EXISTS xp_transactions_action_type_check;
ALTER TABLE user_xp DROP CONSTRAINT IF EXISTS user_xp_action_type_check;
ALTER TABLE user_xp DROP CONSTRAINT IF EXISTS user_xp_source_check;

-- If there's a separate xp_transactions table:
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_action_type_check;

-- Now add back the constraint with prediction types included
-- (Adjust column name — might be 'source', 'action_type', or 'type')
-- First check what values already exist:
SELECT DISTINCT source FROM user_xp;
-- OR
SELECT DISTINCT action_type FROM user_xp;

-- Then recreate with ALL needed values. Example:
-- ALTER TABLE user_xp ADD CONSTRAINT user_xp_source_check 
--   CHECK (source IN ('community_vote', 'content_creation', 'comment', 
--     'module_completion', 'lesson_completion', 'achievement', 'streak',
--     'prediction_vote', 'prediction_correct', 'prediction_trade',
--     'sponsorship', 'daily_login', 'referral', 'other'));

-- OR if you want to just remove the constraint entirely (simplest fix):
-- The constraint is unnecessary — any string source is fine for analytics
-- Just dropping it is safest:

-- Run these (both — one will succeed based on which exists):
DO $$ BEGIN
  ALTER TABLE user_xp DROP CONSTRAINT IF EXISTS xp_transactions_action_type_check;
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_action_type_check;
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Also fix the probability display issue (showing 0% and 0.42% instead of 42%)
-- The backfill might have stored decimal values that the UI reads wrong
-- Check:
SELECT id, label, probability FROM market_outcomes 
WHERE market_id IN (SELECT id FROM prediction_markets WHERE title LIKE '%Banxico%');

-- If probability shows as 0.42 but UI shows "0%", the UI might be 
-- expecting a whole number (42) or the value got corrupted.
-- Normalize all outcomes to decimal (0-1 range):
UPDATE market_outcomes SET probability = probability / 100 
WHERE probability > 1;

-- Verify the execute_market_vote function references the correct table:
-- It should INSERT INTO user_xp, not xp_transactions
-- Check:
SELECT prosrc FROM pg_proc WHERE proname = 'execute_market_vote';

-- If the function inserts into xp_transactions instead of user_xp,
-- we need to update it. Create a fixed version:

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
  v_xp_table text;
BEGIN
  -- Validate market
  SELECT * INTO v_market FROM prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;

  -- Validate outcome
  SELECT * INTO v_outcome FROM market_outcomes 
  WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome');
  END IF;

  -- Check not already voted
  SELECT * INTO v_existing FROM market_votes 
  WHERE market_id = p_market_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already voted');
  END IF;

  IF p_confidence < 1 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10');
  END IF;

  v_xp := 5 + (p_confidence - 1);

  -- Insert vote
  INSERT INTO market_votes (market_id, outcome_id, user_id, confidence, xp_earned)
  VALUES (p_market_id, p_outcome_id, p_user_id, p_confidence, v_xp)
  RETURNING id INTO v_vote_id;

  -- Update outcome
  UPDATE market_outcomes 
  SET vote_count = vote_count + 1, total_confidence = total_confidence + p_confidence
  WHERE id = p_outcome_id;

  -- Update market
  UPDATE prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1, updated_at = now()
  WHERE id = p_market_id;

  -- Recalculate probabilities
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

  -- Update market probability
  IF v_market.market_type = 'binary' THEN
    UPDATE prediction_markets
    SET current_probability = (
      SELECT probability FROM market_outcomes 
      WHERE market_id = p_market_id AND LOWER(label) IN ('yes', 'sí', 'si')
      LIMIT 1
    ) WHERE id = p_market_id;
  ELSE
    UPDATE prediction_markets
    SET current_probability = (
      SELECT MAX(probability) FROM market_outcomes WHERE market_id = p_market_id
    ) WHERE id = p_market_id;
  END IF;

  -- History
  INSERT INTO prediction_market_history (market_id, probability, volume)
  VALUES (p_market_id, 
    (SELECT probability FROM market_outcomes WHERE id = p_outcome_id),
    (SELECT total_votes FROM prediction_markets WHERE id = p_market_id));

  -- Award XP — try user_xp first, fall back to xp_transactions
  BEGIN
    INSERT INTO user_xp (user_id, amount, source, description)
    VALUES (p_user_id, v_xp, 'prediction_vote', 
      'Predicted: ' || LEFT(v_outcome.label, 30) || ' on ' || LEFT(v_market.title, 40));
  EXCEPTION WHEN OTHERS THEN
    -- If user_xp fails (constraint issue), try without source constraint
    -- or insert into alternative table
    BEGIN
      INSERT INTO user_xp (user_id, amount, source, description)
      VALUES (p_user_id, v_xp, 'other', 
        'Prediction vote: ' || LEFT(v_outcome.label, 30));
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail the vote
      RAISE NOTICE 'XP insert failed: %', SQLERRM;
    END;
  END;

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

-- TEST: Try voting now (replace with actual IDs)
-- SELECT execute_market_vote(
--   'YOUR_USER_ID'::uuid,
--   'MARKET_ID'::uuid, 
--   'OUTCOME_ID'::uuid,
--   7
-- );


# ============================================================
# PRIORITY 2-6: CURSOR PROMPT
# Paste this into Cursor after the SQL fix is applied
# ============================================================

## Context
Crowd Conscious is a free-to-play prediction platform. We just completed 
the major overhaul. Now we need to fix remaining issues and improve UX.

## CRITICAL: Fix probability display

The market detail page shows "0% YES" and "0.42%" in the donut chart 
for the Banxico market. This is because the probability is stored as 
a decimal (0.42) but the UI is either:
a) Not multiplying by 100 for display, or
b) The probability got corrupted during backfill

Find where probability is displayed on the market detail page and 
ensure it's shown as a percentage:
- If probability is 0.42, display "42%"
- If probability is 0.0042, that's wrong — multiply by 100
- The progress bar should also reflect the correct percentage
- The donut chart should show "42%" not "0.42%"

Check BOTH:
1. The market detail page component (VotePanel, probability display)
2. The market cards on the list page

The rule: probabilities in the database are stored as decimals (0-1).
The UI ALWAYS multiplies by 100 and shows as "XX%".

---

## PRIORITY 2: Conscious Fund Page Overhaul

The Conscious Fund page (/predictions/fund) currently shows old 
transaction data from the money-based trading system ($15.4K MXN 
collected, sponsor fees, etc.). This needs to be completely rethought 
for the free-to-play model.

**Rewrite the Conscious Fund page with these sections:**

### Section 1: Fund Overview
- "The Conscious Fund" — headline
- "Powered by sponsors. Directed by you." — subtitle
- Explanation: "When brands sponsor prediction markets on Crowd 
  Conscious, a portion of their contribution goes to the Conscious 
  Fund. Users vote on which community causes receive grants each month."

Stats (fetch from database or show placeholder):
- "Total Fund" — sum of sponsor contributions × 15%
- "Causes Supported" — count of fund_causes
- "Monthly Allocation" — upcoming or last allocation amount
- "Your Impact" — XP earned by this user from predictions

### Section 2: Vote for Causes
Show active causes from fund_causes table. Each cause has:
- Name and description
- Category (Clean Air, Clean Water, Safe Cities, Zero Waste, etc.)
- Current vote count
- "Vote" button (one vote per user per month)

If the user has already voted this month, show their vote highlighted.

### Section 3: Past Allocations
Show resolved/past fund allocations (if any exist).
If none exist yet, show: "The first Conscious Fund allocation will 
happen when we reach $10,000 MXN in sponsor contributions. Help us 
get there by sharing Crowd Conscious with brands you believe in."

### Section 4: Sponsors Making It Possible
List sponsors who have contributed (from prediction_markets where 
sponsor_name IS NOT NULL and sponsor_contribution > 0).
Show their logos and the markets they sponsored.
If none yet: "Be the first sponsor → /sponsor"

**Remove entirely:**
- "Current Balance: $15.4K MXN" (old money system data)
- "Total Collected / Total Disbursed" cards
- "Recent Transactions" showing sponsor fees from trades
- Any reference to trade-based fund collection

---

## PRIORITY 3: Stripe Sponsorship Checkout

Instead of mailto/WhatsApp for sponsorship, create a real Stripe 
checkout flow. We already have Stripe integrated.

### 3A: Sponsor Checkout API

Create `app/api/sponsor/checkout/route.ts`:

```typescript
// POST /api/sponsor/checkout
// Body: { 
//   market_id?: string,     // specific market to sponsor (optional)
//   category?: string,      // category to sponsor (optional)  
//   tier: 'market' | 'category' | 'impact' | 'patron',
//   sponsor_name: string,
//   sponsor_url?: string,
//   sponsor_logo_url?: string,
//   email: string
// }
//
// Creates a Stripe Checkout Session with the appropriate price:
// market: 2000 MXN ($2,000 cents in MXN)
// category: 10000 MXN
// impact: 50000 MXN  
// patron: custom (redirect to contact)
//
// On success, redirect to /sponsor/success
// On cancel, redirect to /sponsor/cancelled
```

Use Stripe Checkout (not PaymentIntents) for simplicity:

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'mxn',
      product_data: {
        name: `Crowd Conscious - ${tierLabel} Sponsorship`,
        description: marketTitle 
          ? `Sponsor: ${marketTitle}` 
          : `${categoryLabel} Category Sponsorship`,
      },
      unit_amount: priceInCentsMXN, // 200000 for $2,000 MXN
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${baseUrl}/sponsor/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/sponsor?cancelled=true`,
  metadata: {
    type: 'market_sponsorship',
    tier: tier,
    market_id: marketId || '',
    category: category || '',
    sponsor_name: sponsorName,
    sponsor_url: sponsorUrl || '',
    sponsor_email: email,
  },
});
```

### 3B: Webhook Handler

In the existing Stripe webhook handler (`app/api/webhooks/stripe/route.ts`),
add a case for sponsorship payments:

When `checkout.session.completed` fires with metadata.type === 'market_sponsorship':
1. Extract sponsor info from metadata
2. If market_id provided: update that market's sponsor fields
3. If category provided: store for manual assignment
4. Calculate 15% for Conscious Fund, insert into conscious_fund
5. Send confirmation email via Resend

### 3C: Update Sponsor Page UI

On the /sponsor page, replace the mailto/WhatsApp CTAs with proper 
checkout buttons.

For each sponsorship tier card:
- Add a "Sponsor Now" button that:
  1. Shows a modal/form asking for: name, email, company URL (optional), 
     logo URL (optional)
  2. On submit, calls POST /api/sponsor/checkout
  3. Redirects to Stripe Checkout
  4. On success, shows /sponsor/success page

For "Sponsor this market" on individual market cards:
- Same flow but with market_id pre-filled

### 3D: Success Page

Create `app/sponsor/success/page.tsx`:
- "Thank you for sponsoring!"
- Show what they sponsored
- "Your brand will appear on the market within 24 hours"
  (or instantly if webhook updates the market)
- "Share your sponsorship" with social sharing links
- Link back to the market they sponsored

### 3E: Cancelled Page  

Create `app/sponsor/cancelled/page.tsx`:
- "Sponsorship not completed"
- "Still interested? Contact us directly" with email link
- Link back to /sponsor

---

## PRIORITY 4: Profile Page

The profile page still shows communities and old stats. Replace with 
prediction-focused content.

**Keep:**
- Avatar, name, email, location
- Edit Profile / Settings buttons

**Replace stats with:**
- Total Predictions (count from market_votes)
- Accuracy Rate (% correct from resolved market_votes)
- Total XP (from user_xp sum)
- Leaderboard Rank (position among all users)

**Replace "My Communities" with "My Predictions":**
- Show last 10 market_votes with market title, outcome, confidence, 
  XP earned, ✓/✗ for resolved
- "See all →" link to /predictions/trades

**Replace "Achievements" section with:**
- Show top 3 achievements earned inline
- "View all achievements →" link to /achievements

**Add "Impact" section:**
- "Your predictions have contributed to [X] XP of collective intelligence"
- If they've voted on Conscious Fund causes, show their allocation votes

**Remove:**
- Communities section entirely
- Followers / Following counts
- Founded count
- Any community-related content

---

## PRIORITY 5: UI Polish

### 5A: Achievements page dark theme
The achievements page (screenshot 4) still has a light/gray theme.
Apply the same dark theme as the rest of the app:
- Dark background
- Cards with dark backgrounds and subtle borders
- Green accent color for progress bars and active states
- White/light gray text

Achievement categories should be updated:
- "Learning" → "Prediction" (or remove if only module-related)
- "Community" → keep if it tracks community-engagement achievements
- "Creation" → remove (was for module creation)
- Add "Accuracy" category for prediction-related achievements
- "Progression" → keep
- "Consistency" → keep (streaks)

### 5B: Make VotePanel more intuitive

The current vote panel shows "I think YES" and "I think NO" buttons 
with a confidence slider. Improve the UX:

1. Add clearer visual feedback when selecting YES/NO:
   - Selected option gets a solid fill (green for YES, red for NO)
   - Unselected option becomes ghosted/outlined

2. The confidence slider labels should be more visible:
   - Show the current label prominently: "Pretty sure (7/10)"
   - Add emoji for fun: 🤔 (1-3), 🤷 (4-5), 😏 (6-7), 😎 (8-9), 🔥 (10)

3. After voting, show a celebratory state:
   - Confetti animation (you have canvas-confetti installed)
   - "Nice! You earned 12 XP" with a green checkmark
   - Show updated probability reflecting their vote
   - "Share your prediction" button (for future social sharing)

4. For multi-outcome markets, make it clearer which option to pick:
   - Each outcome row should be clearly clickable
   - Selected outcome gets highlighted with green border
   - Show confidence slider INLINE below the selected outcome, 
     not in a separate panel

### 5C: Market detail — fix probability display

Ensure probability displays correctly everywhere:
- Main display: "42% YES" (not "0% YES")
- Donut chart: "42%" (not "0.42%")
- Progress bar: green portion = probability, red = 1 - probability
- Market cards: same treatment

The fix: wherever probability is read from the database, ensure 
the display code does: `Math.round(probability * 100)` if the 
value is between 0 and 1, or just `Math.round(probability)` if 
already a percentage.

### 5D: Sidebar nav — remove "Insights"

The "AI Insights" sidebar item shows seed data that isn't real.
Remove it from the sidebar navigation until we build actual 
AI-powered insights. Keep the route but remove the nav link.

---

## PRIORITY 6: Email System (Cursor prompt for later)

This is lower priority but note it for the next session:

1. Welcome email on signup (using Resend)
2. Prediction confirmation email ("You predicted YES on [market]")
3. Market resolution email ("The market resolved! You were right/wrong")
4. Monthly impact newsletter
5. Sponsor confirmation email

For now, just ensure the Resend integration is configured and the 
welcome email fires on signup. The rest can be built incrementally.

---

## Build & Test

After all changes:

1. `npm run build` — 0 errors

2. Test voting:
   - Go to any binary market → click YES or NO → set confidence → Predict
   - Should NOT show the xp_transactions error
   - Should show XP earned and updated probability

3. Test probability display:
   - Markets should show correct percentages (42%, not 0.42%)
   - Donut chart, progress bar, and text all match

4. Test Conscious Fund:
   - /predictions/fund shows new design
   - Cause voting works
   - No old transaction data visible

5. Test Sponsor checkout:
   - /sponsor page loads
   - Click "Sponsor Now" on a tier → form → Stripe checkout
   - Test with Stripe test card (4242 4242 4242 4242)
   - Success page loads

6. Test profile:
   - Shows prediction stats, not community stats
   - Dark theme
   - Recent predictions listed

7. Test achievements:
   - Dark theme applied
   - Categories make sense for predictions

**Report all changes.**