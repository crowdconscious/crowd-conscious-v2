# Predictions Feature — Implementation Status

This document summarizes what has been implemented vs. what is still missing from the PREDICTIONS-CONTEXT.md roadmap.

---

## ✅ IMPLEMENTED

### 1. Database (Migrations 119 + 120)

**Tables (migration 119):**
| Table | Status | Notes |
|-------|--------|-------|
| `prediction_markets` | ✅ | Full schema with search_vector, categories, status |
| `prediction_trades` | ✅ | Tracks individual trades |
| `prediction_positions` | ✅ | User positions per market/side |
| `prediction_wallets` | ✅ | User wallets for trading |
| `conscious_fund` | ✅ | Single-row fund balance |
| `conscious_fund_transactions` | ✅ | Audit trail for fund inflows |
| `prediction_market_history` | ✅ | Probability/volume snapshots |
| `agent_content` | ✅ | AI-generated content (news, summaries) |
| `sentiment_scores` | ✅ | Sentiment per market |

**Indexes:** All specified indexes created.

**RLS Policies:**
- `prediction_markets`: SELECT for authenticated, INSERT/UPDATE for admins only
- `prediction_trades`: SELECT own trades, INSERT for authenticated
- `prediction_positions`: SELECT own, INSERT/UPDATE own (via system)
- `prediction_wallets`: SELECT/INSERT/UPDATE own only
- `conscious_fund`: SELECT for authenticated
- `conscious_fund_transactions`: SELECT for authenticated
- `prediction_market_history`: SELECT for authenticated
- `agent_content`: SELECT for authenticated where published = true
- `sentiment_scores`: SELECT for authenticated

**Functions:**
| Function | Status | Notes |
|----------|--------|-------|
| `get_or_create_prediction_wallet(p_user_id)` | ✅ | Returns wallet, creates if needed |
| `execute_prediction_trade(p_user_id, p_market_id, p_side, p_amount)` | ✅ | Full trade flow: balance check, position update, fund allocation |
| `resolve_prediction_market(p_market_id, p_outcome)` | ✅ | Admin-only: resolve market, pay winners |
| `get_market_trades_anon(p_market_id)` | ✅ | Returns anonymized trades for activity feed |

**Triggers:**
- `trg_prediction_trade_history`: After INSERT on prediction_trades → inserts into prediction_market_history
- `trg_prediction_markets_updated_at`: Before UPDATE on prediction_markets

**XP Rewards (migration 120):**
- `prediction_trade`: 25 XP
- `prediction_first_trade`: 50 XP

---

### 2. Access Gate & Middleware

| Item | Status |
|------|--------|
| `middleware.ts` predictions gate | ✅ |
| Cookie `predictions_access` check | ✅ |
| Redirect to `/predictions/gate` if no cookie | ✅ |
| `/predictions/gate` page | ✅ |
| `POST /api/predictions/verify-code` | ✅ |
| Rate limit: 5 attempts/min | ✅ |

---

### 3. API Routes

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/predictions/verify-code` | POST | ✅ | Gate verification |
| `/api/predictions/markets` | GET | ✅ | List with category, status, search, pagination |
| `/api/predictions/markets/[id]` | GET | ✅ | Single market + history, agent_content, sentiment, trades |
| `/api/predictions/markets/[id]/user-stats` | GET | ✅ | User positions + contribution for market |
| `/api/predictions/wallet` | GET | ✅ | get_or_create_prediction_wallet |
| `/api/predictions/wallet` | POST | ✅ | Stripe PaymentIntent for deposits |
| `/api/predictions/trade` | POST | ✅ | Zod validation, rate limit 10/min, audit log, XP |
| `/api/predictions/positions` | GET | ✅ | Positions + unrealized P&L |
| `/api/predictions/fund` | GET | ✅ | Fund stats + recent tx + user contribution |
| `/api/predictions/fund/transactions` | GET | ✅ | Paginated transactions with market info |
| `/api/predictions/history/[marketId]` | GET | ✅ | Probability history with timeframe (1d, 7d, 30d, all) |
| `/api/predictions/stats` | GET | ✅ | Aggregate stats |

**Validation:** `lib/prediction-schemas.ts` — tradeSchema, depositSchema

---

### 4. UI Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Access gate | `/predictions/gate` | ✅ | Code entry form |
| Dashboard | `/predictions` | ✅ | Hero, markets grid, category tabs, MarketCards |
| Markets list | `/predictions/markets` | ✅ | Full market browser |
| Market detail | `/predictions/markets/[id]` | ✅ | Two-column layout, charts, trade panel |
| Wallet | `/predictions/wallet` | ✅ | Balance display, "Deposit coming soon" |
| Fund | `/predictions/fund` | ⚠️ | Placeholder only |
| Trades | `/predictions/trades` | ⚠️ | Placeholder only |

---

### 5. UI Components

| Component | Status | Notes |
|-----------|--------|-------|
| `PredictionsShell` | ✅ | Layout with nav |
| `PredictionsDashboardClient` | ✅ | Dashboard client logic |
| `MarketCard` | ✅ | Category badge, probability, volume, trade buttons |
| `TradeModal` | ✅ | Quick trade from dashboard |
| `TradePanel` | ✅ | BUY YES/NO, amount, shares, fees, position |
| `MarketDetailClient` | ✅ | Full market detail with charts |

---

## ❌ NOT IMPLEMENTED / INCOMPLETE

### Stage 3: Payments Integration

| Item | Status |
|------|--------|
| `lib/mercadopago.ts` | ❌ |
| `app/api/predictions/deposit/route.ts` | ❌ (Deposit uses wallet POST, not separate) |
| `app/api/webhooks/mercadopago/route.ts` | ❌ |
| Stripe webhook handler for `prediction_deposit` | ❌ **Critical** — Wallet POST creates PaymentIntent but no webhook credits the wallet |
| Wallet page: deposit modal with Stripe Elements | ❌ |
| Wallet page: Mercado Pago option | ❌ |
| Wallet page: transaction history | ❌ |

### Stage 4: AI Agents

| Item | Status |
|------|--------|
| `lib/agents/base-agent.ts` | ❌ |
| `lib/agents/news-monitor.ts` | ❌ |
| `lib/agents/sentiment-tracker.ts` | ❌ |
| `lib/agents/data-watchdog.ts` | ❌ |
| `lib/agents/content-creator.ts` | ❌ |
| `app/api/cron/agents/news/route.ts` | ❌ |
| `app/api/cron/agents/sentiment/route.ts` | ❌ |
| `app/api/cron/agents/data/route.ts` | ❌ |
| `app/api/cron/agents/content/route.ts` | ❌ |
| `agent_logs` table | ❌ |
| `vercel.json` crons config | ❌ |

### Stage 5: Conscious Fund UI (Full)

| Item | Status |
|------|--------|
| Fund page: full dashboard | ❌ |
| Inflow chart (Recharts) | ❌ |
| Transaction feed | ❌ |
| Fund allocation section | ❌ |
| Impact stories from agent_content | ❌ |

### Stage 6: Seed Data

| Item | Status |
|------|--------|
| `scripts/seed-prediction-markets.ts` | ❌ |
| 8 seed markets | ❌ |
| History + agent_content seed data | ❌ |

### Stage 7: XP & Gamification (Full)

| Item | Status |
|------|--------|
| `prediction_correct`, `prediction_deposit`, `prediction_streak_3`, `prediction_cause_trade` in xp_rewards | ❌ |
| Achievements: first_prediction, prediction_veteran, etc. | ❌ |
| `execute_prediction_trade` calling award_xp for cause markets | ❌ |
| `app/(predictions)/predictions/achievements/page.tsx` | ❌ |

### Admin & Other

| Item | Status |
|------|--------|
| `app/(predictions)/predictions/admin/create-market/page.tsx` | ❌ |
| `app/api/predictions/admin/markets` | ❌ |
| `app/api/predictions/admin/test-agent/route.ts` | ❌ |
| My Trades page (full implementation) | ❌ |
| Positions page | ❌ (route exists but no `/predictions/positions` page) |

---

## 🚨 Critical Gaps

1. **Stripe webhook for prediction deposits** — Users can create a PaymentIntent but the wallet is never credited when payment succeeds.
2. **Fund dashboard** — Full UI with charts and transaction feed not built.
3. **My Trades page** — Placeholder only.
4. **Deposit flow** — No Stripe Elements or modal; wallet page shows "coming soon".
5. **Seed script** — No markets to test with unless manually inserted.

---

## Quick Reference: File Map (Current vs. Context)

| Context File | Exists? | Status |
|--------------|---------|--------|
| `app/(predictions)/layout.tsx` | ✅ | ✅ |
| `app/(predictions)/predictions/page.tsx` | ✅ | ✅ |
| `app/(predictions)/predictions/layout.tsx` | ✅ | ✅ |
| `app/(predictions)/predictions/gate/page.tsx` | ✅ | ✅ |
| `app/(predictions)/predictions/markets/[id]/page.tsx` | ✅ | ✅ |
| `app/(predictions)/predictions/wallet/page.tsx` | ✅ | ⚠️ Basic |
| `app/(predictions)/predictions/fund/page.tsx` | ✅ | ⚠️ Placeholder |
| `app/(predictions)/predictions/positions/page.tsx` | ❌ | — |
| `app/(predictions)/predictions/achievements/page.tsx` | ❌ | — |
| `app/(predictions)/predictions/admin/create-market/page.tsx` | ❌ | — |
| `app/api/predictions/deposit/route.ts` | ❌ | — (wallet POST used instead) |
| `app/api/webhooks/mercadopago/route.ts` | ❌ | — |
| `lib/mercadopago.ts` | ❌ | — |
| `lib/prediction-schemas.ts` | ✅ | ✅ |
| `lib/agents/*` | ❌ | — |
| `scripts/seed-prediction-markets.ts` | ❌ | — |
