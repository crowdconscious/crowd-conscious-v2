# Achievements Not Unlocking – Fix

## Problem
Achievements like **Active Predictor** (10 predictions), **Fund Voice** (first fund vote), and **Voice Heard** (first prediction) were not unlocking even when users met the requirements.

## Root Causes

1. **RLS blocking inserts** – The retroactive achievements API used the user’s Supabase client. `user_achievements` only had a SELECT policy, so inserts failed silently.

2. **Wrong data sources** – `check_achievements` used the legacy `votes` table (content voting) instead of `market_votes` (predictions) and `fund_votes`.

3. **No real-time checks** – Achievement checks were not run when casting prediction votes or fund votes.

## Fixes Applied

### 1. Retroactive achievements API (`app/api/gamification/retroactive-achievements/route.ts`)
- Switched to `createAdminClient()` for reads and inserts so RLS does not block inserts.
- Achievements page still runs this on load to unlock any missed achievements.

### 2. `check_achievements` function (`sql-migrations/FIX-achievements-market-votes-fund-votes.sql`)
- Uses `market_votes` for prediction achievements: FIRST_VOTE, VOTE_10, VOTE_50.
- Uses `fund_votes` (distinct cycles) for: FIRST_FUND_VOTE, FUND_CHAMPION.
- Uses `market_votes` where `is_correct = true` for: FIRST_CORRECT, CORRECT_10.
- Keeps legacy checks for content and sponsorships.

### 3. `execute_market_vote` function
- Calls `check_achievements` after each vote so prediction achievements unlock immediately.

### 4. Fund vote API (`app/api/predictions/fund/vote/route.ts`)
- Calls `check_achievements` after each fund vote so fund achievements unlock immediately.

## Deployment

1. Run the SQL migration in Supabase:
   ```bash
   # In Supabase SQL Editor, run:
   sql-migrations/FIX-achievements-market-votes-fund-votes.sql
   ```

2. Deploy the app changes (retroactive API and fund vote route).

## Verification

- Visit `/achievements` – retroactive check runs on load and unlocks any eligible achievements.
- Cast a prediction – Voice Heard / Active Predictor should unlock when thresholds are met.
- Cast a fund vote – Fund Voice / Fund Champion should unlock when thresholds are met.
