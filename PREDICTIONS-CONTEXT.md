# Crowd Conscious V3 — Cursor Agent Implementation Guide

**Purpose**: Step-by-step prompts and instructions for building the prediction/collective consciousness features into the existing Crowd Conscious V2 platform using Cursor's agent.  
**Stack**: Next.js 15 (App Router) | Supabase | Stripe | Mercado Pago | Resend | Vercel  
**Key Constraint**: All new features are **hidden behind `/predictions` routes** with access-code gating. Nothing touches the existing public site until you're ready.

---

## Pre-Flight Checklist (Do These First)

Before giving Cursor any prompts, you need:

### 1. Environment Variables to Add

Add these to your `.env.local` and Vercel project settings:

```bash
# Mercado Pago (get from https://www.mercadopago.com.mx/developers)
MERCADO_PAGO_ACCESS_TOKEN=your_production_token
MERCADO_PAGO_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=your_public_key

# AI Agents (get from https://console.anthropic.com)
ANTHROPIC_API_KEY=your_claude_api_key

# News APIs (get from respective sites)
NEWS_API_KEY=your_newsapi_key           # newsapi.org
GNEWS_API_KEY=your_gnews_key            # gnews.io

# Feature Flags
NEXT_PUBLIC_PREDICTIONS_ENABLED=true
PREDICTIONS_ACCESS_CODE=conscious2026    # change this to your secret code

# Optional: Social APIs for sentiment (can add later)
# TWITTER_BEARER_TOKEN=your_token
# GOOGLE_TRENDS_API_KEY=your_key
```

### 2. NPM Packages to Install

```bash
npm install mercadopago @anthropic-ai/sdk recharts date-fns
```

### 3. Create a Context File for Cursor

Save this entire document as `PREDICTIONS-CONTEXT.md` in your project root. Every Cursor prompt should reference it:

```
@PREDICTIONS-CONTEXT.md
```

---

## Architecture Decision: Hidden Feature Gate

All prediction features live under a **gated route group** that is:
- Not linked from any existing navigation
- Protected by an access code stored in a cookie
- Only accessible via direct URL: `crowdconscious.app/predictions`
- Completely isolated from your existing `(app)` and `(public)` route groups

This means **zero risk** to your live platform. When you're ready to go public, you simply remove the gate and add nav links.

---

## STAGE 1: Foundation (Week 1)

### Step 1.1 — Create the Gated Route Group & Access Gate

**What this does**: Creates a `/predictions` route group with an access code wall. Anyone visiting `/predictions` sees a simple code entry form. Correct code sets a cookie and grants access.

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @types/database.ts

Create a new protected route group for our predictions/collective consciousness feature. This must be COMPLETELY ISOLATED from the existing app - no changes to any existing files.

## File Structure to Create:

app/(predictions)/
├── layout.tsx              # Layout with access gate check
├── predictions/
│   ├── page.tsx            # Main predictions dashboard
│   ├── gate/
│   │   └── page.tsx        # Access code entry page
│   └── layout.tsx          # Inner layout with predictions nav

middleware.ts updates:
- Add matcher for /predictions/* routes
- Check for 'predictions_access' cookie
- If no cookie, redirect to /predictions/gate
- If cookie value !== process.env.PREDICTIONS_ACCESS_CODE, redirect to gate

## Access Gate Page (predictions/gate/page.tsx):
- Clean, minimal page with Crowd Conscious branding
- Single input field: "Enter access code"
- On submit, POST to /api/predictions/verify-code
- If correct, set HttpOnly cookie 'predictions_access' with 30-day expiry
- Redirect to /predictions
- If wrong, show error "Invalid access code"
- Style with existing Tailwind classes, dark theme, centered card layout

## API Route: app/api/predictions/verify-code/route.ts
- Accept POST with { code: string }
- Compare against process.env.PREDICTIONS_ACCESS_CODE
- If match: set cookie, return { success: true }
- If no match: return { success: false, error: "Invalid code" }
- Rate limit: max 5 attempts per minute using existing lib/rate-limit.ts

## Layout (predictions/layout.tsx):
- Import existing providers (Supabase, auth) from lib/
- Require authenticated user (redirect to /login if not logged in)
- Simple sidebar nav with links: Dashboard, Markets, My Trades, Conscious Fund
- "Back to Main App" link to /dashboard
- Green accent theme consistent with existing brand
- Mobile responsive

DO NOT modify any existing files except middleware.ts (add the new matcher). All new code only.
```

### Step 1.2 — Database Migration: Prediction Tables

**What this does**: Creates all the new Supabase tables needed for predictions. This is a pure additive migration — no changes to existing tables.

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @types/database.ts @sql-migrations/

Create a new SQL migration file: sql-migrations/119_predictions_tables.sql

This migration adds the prediction/collective consciousness tables to our existing Supabase database. CRITICAL: Do NOT modify any existing tables. All new tables only.

## Tables to Create:

### prediction_markets
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- title TEXT NOT NULL
- description TEXT NOT NULL
- category TEXT NOT NULL CHECK (category IN ('world', 'government', 'corporate', 'community', 'cause'))
- subcategory TEXT (e.g., 'water', 'education', 'sports', 'politics')
- resolution_criteria TEXT NOT NULL
- resolution_date TIMESTAMPTZ NOT NULL
- created_by UUID REFERENCES auth.users(id) NOT NULL
- verification_sources TEXT[] (array of source descriptions)
- status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'active', 'trading', 'resolved', 'disputed', 'cancelled'))
- resolved_outcome BOOLEAN (null until resolved)
- resolved_at TIMESTAMPTZ
- resolution_evidence JSONB
- current_probability DECIMAL(5,2) DEFAULT 50.00
- total_volume DECIMAL(20,2) DEFAULT 0
- fee_percentage DECIMAL(3,2) DEFAULT 2.5
- conscious_fund_percentage DECIMAL(3,2) DEFAULT 7.5
- min_trade DECIMAL(10,2) DEFAULT 10.00
- tags TEXT[]
- metadata JSONB DEFAULT '{}'
- search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description,'')), 'B')
  ) STORED
- created_at TIMESTAMPTZ DEFAULT now()
- updated_at TIMESTAMPTZ DEFAULT now()

### prediction_trades
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- market_id UUID REFERENCES prediction_markets(id) NOT NULL
- user_id UUID REFERENCES auth.users(id) NOT NULL
- side TEXT NOT NULL CHECK (side IN ('yes', 'no'))
- amount DECIMAL(20,2) NOT NULL CHECK (amount > 0)
- price DECIMAL(5,4) NOT NULL CHECK (price > 0 AND price < 1)
- fee_amount DECIMAL(20,2) NOT NULL
- conscious_fund_amount DECIMAL(20,2) NOT NULL
- status TEXT DEFAULT 'filled' CHECK (status IN ('pending', 'filled', 'cancelled'))
- created_at TIMESTAMPTZ DEFAULT now()

### prediction_positions
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id UUID REFERENCES auth.users(id) NOT NULL
- market_id UUID REFERENCES prediction_markets(id) NOT NULL
- side TEXT NOT NULL CHECK (side IN ('yes', 'no'))
- shares DECIMAL(20,4) NOT NULL DEFAULT 0
- average_price DECIMAL(5,4)
- created_at TIMESTAMPTZ DEFAULT now()
- updated_at TIMESTAMPTZ DEFAULT now()
- UNIQUE(user_id, market_id, side)

### prediction_wallets
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL
- balance DECIMAL(20,2) NOT NULL DEFAULT 0 CHECK (balance >= 0)
- total_deposited DECIMAL(20,2) DEFAULT 0
- total_withdrawn DECIMAL(20,2) DEFAULT 0
- total_won DECIMAL(20,2) DEFAULT 0
- total_lost DECIMAL(20,2) DEFAULT 0
- currency TEXT DEFAULT 'MXN'
- created_at TIMESTAMPTZ DEFAULT now()
- updated_at TIMESTAMPTZ DEFAULT now()

### conscious_fund
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- total_collected DECIMAL(20,2) DEFAULT 0
- total_disbursed DECIMAL(20,2) DEFAULT 0
- current_balance DECIMAL(20,2) DEFAULT 0
- updated_at TIMESTAMPTZ DEFAULT now()

-- Insert single row:
INSERT INTO conscious_fund DEFAULT VALUES;

### conscious_fund_transactions
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- amount DECIMAL(20,2) NOT NULL
- source_type TEXT NOT NULL CHECK (source_type IN ('trade_fee', 'donation', 'sponsorship'))
- source_id UUID (references trade or other source)
- market_id UUID REFERENCES prediction_markets(id)
- description TEXT
- created_at TIMESTAMPTZ DEFAULT now()

### prediction_market_history
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- market_id UUID REFERENCES prediction_markets(id) NOT NULL
- probability DECIMAL(5,2) NOT NULL
- volume_24h DECIMAL(20,2) DEFAULT 0
- trade_count INTEGER DEFAULT 0
- recorded_at TIMESTAMPTZ DEFAULT now()

### agent_content
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- market_id UUID REFERENCES prediction_markets(id)
- agent_type TEXT NOT NULL CHECK (agent_type IN ('news_monitor', 'sentiment_tracker', 'data_watchdog', 'content_creator'))
- content_type TEXT NOT NULL CHECK (content_type IN ('news_summary', 'sentiment_report', 'data_alert', 'social_post', 'weekly_digest', 'market_insight'))
- title TEXT NOT NULL
- body TEXT NOT NULL
- language TEXT DEFAULT 'es'
- metadata JSONB DEFAULT '{}'
- published BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ DEFAULT now()

### sentiment_scores
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- market_id UUID REFERENCES prediction_markets(id) NOT NULL
- score DECIMAL(5,2) NOT NULL CHECK (score >= -100 AND score <= 100)
- source TEXT NOT NULL
- keywords TEXT[]
- sample_size INTEGER
- recorded_at TIMESTAMPTZ DEFAULT now()

## Indexes:
CREATE INDEX idx_pred_markets_status ON prediction_markets(status);
CREATE INDEX idx_pred_markets_category ON prediction_markets(category);
CREATE INDEX idx_pred_markets_search ON prediction_markets USING GIN(search_vector);
CREATE INDEX idx_pred_trades_market ON prediction_trades(market_id);
CREATE INDEX idx_pred_trades_user ON prediction_trades(user_id);
CREATE INDEX idx_pred_positions_user ON prediction_positions(user_id);
CREATE INDEX idx_pred_positions_market ON prediction_positions(market_id);
CREATE INDEX idx_pred_history_market ON prediction_market_history(market_id, recorded_at DESC);
CREATE INDEX idx_agent_content_market ON agent_content(market_id);
CREATE INDEX idx_sentiment_market ON sentiment_scores(market_id, recorded_at DESC);

## Row Level Security:
- prediction_markets: SELECT for all authenticated, INSERT/UPDATE for admins only (for now)
- prediction_trades: SELECT own trades only, INSERT for authenticated
- prediction_positions: SELECT own positions only
- prediction_wallets: SELECT/UPDATE own wallet only
- conscious_fund: SELECT for all authenticated (transparency)
- conscious_fund_transactions: SELECT for all authenticated
- agent_content: SELECT for all authenticated where published = true
- sentiment_scores: SELECT for all authenticated

## Functions:
1. get_or_create_prediction_wallet(p_user_id UUID) - returns wallet, creates if not exists
2. execute_prediction_trade(p_user_id UUID, p_market_id UUID, p_side TEXT, p_amount DECIMAL)
   - Checks wallet balance
   - Calculates shares based on current probability (LMSR or simple AMM)
   - Deducts from wallet
   - Creates trade record
   - Updates position
   - Calculates fee + conscious fund allocation
   - Updates market probability and volume
   - Inserts conscious_fund_transaction
   - Updates conscious_fund totals
   - Returns the trade
3. resolve_prediction_market(p_market_id UUID, p_outcome BOOLEAN)
   - Sets market status to 'resolved'
   - Calculates payouts for winning positions
   - Credits prediction_wallets for winners
   - Records resolution evidence

## Trigger:
- After INSERT on prediction_trades → record entry in prediction_market_history with updated probability

Generate the complete SQL file with comments explaining each section. Use our existing patterns from the migrations folder.
```

### Step 1.3 — Regenerate Supabase Types

After running the migration in Supabase:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

Or prompt Cursor:

```
@types/database.ts

The prediction tables have been added to Supabase. Manually add the TypeScript types for the new tables to the existing database.ts file. Add them in a new section at the bottom clearly marked with:

// ═══════════════════════════════════════
// PREDICTION / COLLECTIVE CONSCIOUSNESS
// ═══════════════════════════════════════

Add types for: prediction_markets, prediction_trades, prediction_positions, prediction_wallets, conscious_fund, conscious_fund_transactions, prediction_market_history, agent_content, sentiment_scores.

Follow the exact same pattern used by the existing table types in this file (Row, Insert, Update types for each).
```

---

## STAGE 2: Core Trading UI (Week 2)

### Step 2.1 — Predictions Dashboard & Market Browser

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @types/database.ts @components/ui/ @app/(predictions)/

Build the main predictions dashboard at app/(predictions)/predictions/page.tsx

## Requirements:

### Hero Section:
- "Collective Consciousness" heading with subtext: "Your predictions fund solutions"
- Live counter showing: Total Markets Active, Total Volume, Conscious Fund Balance
- Fetch these from Supabase in a server component

### Market Categories:
- Horizontal scrollable filter tabs: All, World, Government, Corporate, Community, Cause
- Each tab has an icon and count of active markets
- "World" tab has subtle different styling (it's the engine)

### Market Cards Grid:
- Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Each MarketCard shows:
  - Category badge (color coded: world=blue, government=red, corporate=purple, community=green, cause=amber)
  - Title (truncated to 2 lines)
  - Current probability as a large percentage with YES/NO bar visualization
  - Total volume traded
  - Resolution date with countdown (e.g., "Resolves in 8 months")
  - Conscious Fund contribution badge: "This market has funded $X for [cause]"
  - Quick trade buttons: "Yes ↑" and "No ↓" that open trade modal

### Search:
- Full-text search using the search_vector column
- Debounced input at top of page

### Conscious Fund Banner:
- Persistent banner at bottom showing:
  "Every trade funds solutions. Conscious Fund Balance: $X | Grants Awarded: Y"

### Data Fetching:
- Server component with Supabase query
- Filter by status = 'active' or 'trading'
- Order by total_volume DESC (most popular first)
- Client-side category filtering

Use existing UI components from @components/ui/ (Button, Card, Badge, Input).
Use Tailwind with our green brand color scheme.
Keep it clean and professional — think Bloomberg meets Kickstarter.
```

### Step 2.2 — Individual Market Page

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @types/database.ts @app/(predictions)/

Create the individual market detail page at:
app/(predictions)/predictions/markets/[id]/page.tsx

## Layout (two-column on desktop, stacked on mobile):

### Left Column (65%):

**Market Header:**
- Category badge + Title
- Created by [user] on [date]
- Status indicator (active, trading, resolved)

**Probability Display:**
- Large circular or bar chart showing current YES/NO probability
- Historical probability chart using Recharts (line chart, last 30 days from prediction_market_history)
- Volume chart below probability

**Research Center (Pro-Consciousness Section):**
- "Understand This Issue" expandable section with:
  - Market description (full text)
  - Resolution criteria (clearly stated)
  - Verification sources (linked list)
  - Tags

**AI Insights:**
- Latest agent_content entries for this market (where published = true)
- News summaries, sentiment reports
- "Last updated: [timestamp]"

**Sentiment Indicator:**
- Latest sentiment_score displayed as gauge (-100 to +100)
- Mini sparkline of sentiment over time

**Activity Feed:**
- Recent trades on this market (anonymized: "Someone bought 50 YES shares at $0.62")
- Fetch from prediction_trades ordered by created_at DESC, limit 20

### Right Column (35%):

**Trade Panel (sticky on scroll):**
- Tab toggle: BUY YES / BUY NO
- Amount input in MXN
- Shows: "You get X shares at $Y.YY per share"
- Estimated payout if correct
- Fee breakdown: "Platform fee: $X | Conscious Fund: $Y"
- "Trade" button (disabled if no wallet balance)
- "Deposit funds first" link if wallet empty
- Current position display if user has one

**Market Info Card:**
- Resolution date
- Total volume
- Number of traders
- Fee rate
- Conscious Fund rate

**Conscious Impact Card:**
- Total conscious fund contributions from this market
- Related causes/organizations
- "Your trades have contributed $X"

## Data Fetching:
- Server component: fetch market by ID with all related data
- Client component for trade panel (needs interactivity)
- Use Supabase RLS — user only sees their own positions

## Trade Execution:
- POST to /api/predictions/trade
- Validate: authenticated, has wallet, sufficient balance
- Call Supabase RPC: execute_prediction_trade
- Optimistic UI update
- Show success toast with confetti (reuse existing achievement animation)
- Award XP via existing award_xp function: action_type = 'prediction_trade', amount = 25

Use existing components and patterns. Recharts for charts. Framer Motion for animations.
```

### Step 2.3 — Trading API Routes

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @types/database.ts @lib/auth-server.ts @lib/validation-schemas.ts @lib/rate-limit.ts

Create the prediction trading API routes. Follow existing API patterns from app/api/.

## Routes to Create:

### app/api/predictions/markets/route.ts
- GET: List markets with filtering (category, status, search query)
  - Pagination with cursor-based or offset
  - Include current probability and volume
  - Public data — any authenticated user

### app/api/predictions/markets/[id]/route.ts
- GET: Single market with full details
  - Include: latest 5 agent_content entries, latest sentiment_score, trade count
  - Join with creator profile for display name

### app/api/predictions/wallet/route.ts
- GET: Get user's prediction wallet (call get_or_create_prediction_wallet RPC)
- POST: Deposit funds (create Stripe or Mercado Pago payment intent)

### app/api/predictions/trade/route.ts
- POST: Execute a trade
  - Body: { market_id: string, side: 'yes' | 'no', amount: number }
  - Validate with Zod schema
  - Check rate limit (max 10 trades per minute)
  - Call execute_prediction_trade RPC
  - On success: award XP (25 for trade, 50 for first trade)
  - Return trade details

### app/api/predictions/positions/route.ts
- GET: User's current positions across all markets
  - Join with market data for display
  - Calculate unrealized P&L based on current probability

### app/api/predictions/fund/route.ts
- GET: Conscious fund stats (balance, total collected, recent transactions)
  - Public data for any authenticated user

### app/api/predictions/fund/transactions/route.ts
- GET: Recent conscious fund transactions with market info
  - Paginated, most recent first

### app/api/predictions/history/[marketId]/route.ts
- GET: Price/probability history for a market
  - Query prediction_market_history
  - Support timeframe: 1d, 7d, 30d, all

## Validation Schemas (add to lib/validation-schemas.ts or create lib/prediction-schemas.ts):

```typescript
const tradeSchema = z.object({
  market_id: z.string().uuid(),
  side: z.enum(['yes', 'no']),
  amount: z.number().min(10).max(100000),
});

const depositSchema = z.object({
  amount: z.number().min(50).max(500000),
  payment_method: z.enum(['stripe', 'mercadopago']),
});
```

## Security:
- All routes require authenticated user (use existing getUser() from lib/auth-server.ts)
- Trade routes check wallet ownership
- Rate limiting on trade execution
- Log all trades to audit_logs table

Follow existing error handling patterns: try/catch, NextResponse.json with appropriate status codes.
```

---

## STAGE 3: Payments Integration (Week 2-3)

### Step 3.1 — Mercado Pago Integration

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @lib/stripe.ts @app/api/webhooks/stripe/route.ts

Create the Mercado Pago integration for prediction wallet deposits. This works alongside Stripe — users choose their preferred payment method.

## Create: lib/mercadopago.ts
```typescript
// Initialize Mercado Pago client
// Export helper functions for:
// - createPreference(amount, userId, description) → returns preference with redirect URLs
// - processPayment(paymentId) → verifies and returns payment details
// - createRefund(paymentId) → creates refund
```

## Create: app/api/predictions/deposit/route.ts
- POST body: { amount: number, payment_method: 'stripe' | 'mercadopago' }
- If stripe: create PaymentIntent as we do now
- If mercadopago: create MercadoPago Preference with:
  - back_urls: { success, failure, pending } pointing to /predictions/wallet?status=success|failure|pending
  - auto_return: "approved"
  - external_reference: JSON string with user_id and wallet_id
  - notification_url: our webhook URL

## Create: app/api/webhooks/mercadopago/route.ts
- Receives IPN (Instant Payment Notification) from Mercado Pago
- Verify the notification is legitimate (query MP API with payment ID)
- If payment approved:
  - Credit user's prediction_wallet
  - Log wallet_transaction
  - Send confirmation email via Resend
- If payment pending/rejected: log and ignore
- Return 200 OK quickly (MP expects fast response)
- Add to Vercel config: this route must NOT use body parser (raw body for verification)

## Create: app/(predictions)/predictions/wallet/page.tsx
- Wallet dashboard showing:
  - Current balance (large, prominent)
  - Deposit button → opens modal with amount input
  - Payment method selector: Stripe (card) | Mercado Pago (OXXO, SPEI, card, QR)
  - If Mercado Pago selected, redirect to MP Checkout Pro
  - If Stripe selected, use existing Stripe Elements
  - Transaction history table
  - Withdraw button (future — disabled for now with "Coming soon" tooltip)

## Important for Mercado Pago in Mexico:
- Default currency: MXN
- OXXO payments are async (user pays at convenience store, webhook confirms)
- SPEI transfers are near-instant
- Handle all three states: approved, pending, rejected
- Show "Waiting for payment" status for pending OXXO payments

Use the mercadopago npm package. Don't forget to handle the IPN webhook signature verification.
```

---

## STAGE 4: AI Agents (Week 3-4)

### Step 4.1 — Agent Infrastructure

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @app/api/cron/ @lib/

Create the AI agent infrastructure. Agents run as Vercel Cron Jobs that call API routes.

## Create: lib/agents/base-agent.ts
- Base class/module with:
  - Anthropic Claude client initialization (using ANTHROPIC_API_KEY)
  - Supabase admin client for DB operations
  - Common functions: saveContent(), updateSentiment(), logAgentRun()
  - Error handling and retry logic
  - Rate limit awareness (respect API limits)

## Create: lib/agents/news-monitor.ts
- Fetches news from NewsAPI and GNews
- For each active market, searches for related news using market title and tags
- Sends relevant articles to Claude API with prompt:
  "Summarize this news article's relevance to the prediction market: [market title]. 
   Write a 2-3 paragraph summary in Spanish explaining how this news might affect 
   the probability of this outcome. Be factual and balanced."
- Saves results to agent_content table with type='news_summary'
- Runs every 30 minutes

## Create: lib/agents/sentiment-tracker.ts
- For each active market, generates search queries from market title/tags
- Queries Google Trends API for interest-over-time data
- Uses Claude to analyze the trend: "Given this Google Trends data for [keywords] 
  related to [market title], provide a sentiment score from -100 (very bearish) 
  to +100 (very bullish) and a one-sentence explanation."
- Saves to sentiment_scores table
- Runs every hour

## Create: lib/agents/data-watchdog.ts
- Connects to Mexican government open data APIs:
  - INEGI API (stats.inegi.org.mx/api)
  - SHCP Transparency Portal
- For markets with verification_sources containing 'INEGI' or 'SHCP', fetches latest data
- Compares against market resolution criteria
- Uses Claude to generate analysis: "New data has been published by [source]. 
  Compare this against the market resolution criteria: [criteria]. 
  How does this data affect the likelihood of this outcome?"
- Saves to agent_content with type='data_alert'
- Runs every 6 hours

## Create: lib/agents/content-creator.ts
- Takes recent agent_content (news summaries, data alerts, sentiment) 
- Uses Claude to create shareable content:
  - Weekly market digest (all markets summary)
  - Individual market social posts (tweet-length)
  - Conscious Fund impact report (monthly)
- Generates in both Spanish and English
- Saves with published=true (these are user-facing)
- Runs daily at 9am CST

## Create Cron API Routes:

### app/api/cron/agents/news/route.ts
- Vercel Cron header verification (CRON_SECRET)
- Calls news monitor agent
- Logs execution time and results

### app/api/cron/agents/sentiment/route.ts
- Same pattern for sentiment tracker

### app/api/cron/agents/data/route.ts
- Same for data watchdog

### app/api/cron/agents/content/route.ts
- Same for content creator

## Add to vercel.json crons config:
```json
{
  "crons": [
    { "path": "/api/cron/agents/news", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/agents/sentiment", "schedule": "0 * * * *" },
    { "path": "/api/cron/agents/data", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/agents/content", "schedule": "0 15 * * *" }
  ]
}
```

Each agent should be resilient: catch errors per-market, continue processing others, log failures to a new `agent_logs` table for debugging.
```

---

## STAGE 5: Conscious Fund UI (Week 3)

### Step 5.1 — Fund Dashboard

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @types/database.ts @app/(predictions)/

Create the Conscious Fund dashboard at:
app/(predictions)/predictions/fund/page.tsx

## Design: Think of this as the "transparency" page. Everything visible, everything auditable.

### Fund Overview (top):
- Current Balance (large number with currency)
- Total Collected (since inception)
- Total Disbursed (grants given)
- Number of organizations supported

### Inflow Chart:
- Recharts area chart showing daily/weekly fund inflows
- Color-coded by source: trade fees (green), donations (blue), sponsorships (purple)
- Time range selector: 7d, 30d, 90d, all

### Transaction Feed:
- Scrollable list of recent conscious_fund_transactions
- Each shows: amount, source type, related market name, timestamp
- "Your contributions: $X" personalized stat at top

### Fund Allocation Section:
- Placeholder for voting/grant allocation (future feature)
- Show: "Coming soon: Vote on which organizations receive grants"
- List of causes with allocation targets (from market metadata)

### Impact Stories (from agent_content):
- Cards showing content_creator agent's impact reports
- Monthly fund reports

This page must be viewable by ALL authenticated users (radical transparency principle).
Use Recharts for charts. Framer Motion for number animations.
```

---

## STAGE 6: Seed Data & Testing (Week 4)

### Step 6.1 — Seed Markets

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @types/database.ts

Create a seed script at scripts/seed-prediction-markets.ts that I can run to populate initial markets.

Create 8 seed markets:

## World Markets (3):
1. "Will Mexico's national team advance past the group stage in the 2026 FIFA World Cup?"
   - Category: world, subcategory: sports
   - Resolution: July 2026, verified by FIFA official results
   - Initial probability: 55%

2. "Will Banxico lower the reference interest rate below 8% by December 2026?"
   - Category: world, subcategory: economics
   - Resolution: Dec 2026, verified by Banxico official communications
   - Initial probability: 40%

3. "Will the peso trade below 19 MXN/USD at any point in 2026?"
   - Category: world, subcategory: economics
   - Resolution: Dec 2026, verified by Bloomberg/Reuters data
   - Initial probability: 25%

## Government Accountability (2):
4. "Will Mexico City complete 80% of the Cablebús Line 3 construction by December 2026?"
   - Category: government, subcategory: infrastructure
   - Resolution: Dec 2026, verified by CDMX government reports + media
   - Initial probability: 35%

5. "Will the 2026 federal budget allocate more than 5% to environmental programs?"
   - Category: government, subcategory: policy
   - Resolution: Jan 2026 (when budget is published), verified by SHCP
   - Initial probability: 30%

## Corporate (1):
6. "Will FEMSA reduce single-use plastics in OXXO stores by 25% by end of 2026?"
   - Category: corporate, subcategory: sustainability
   - Resolution: Dec 2026, verified by FEMSA sustainability report
   - Initial probability: 45%

## Cause (2):
7. "Will air quality in CDMX (PM2.5 annual average) improve by 10% compared to 2025?"
   - Category: cause, subcategory: environment
   - Resolution: March 2027, verified by SEMARNAT
   - Initial probability: 38%

8. "Will the number of femicides in Mexico decrease by 15% in 2026 vs 2025?"
   - Category: cause, subcategory: social_justice
   - Resolution: Feb 2027, verified by SESNSP official data
   - Initial probability: 22%

For each market, also seed:
- 5 prediction_market_history entries showing probability changes over the last 30 days
- 2-3 agent_content entries (news summaries) so the pages don't look empty

The script should use Supabase admin client. Make it idempotent (check if markets exist before inserting).
Include a README comment explaining how to run it:
// Run: npx tsx scripts/seed-prediction-markets.ts
```

---

## STAGE 7: XP Integration & Gamification Bridge (Week 4)

### Step 7.1 — Connect Predictions to Existing Gamification

**Cursor Prompt:**

```
@PREDICTIONS-CONTEXT.md @lib/xp-system.ts @lib/tier-config.ts @sql-migrations/

Bridge the prediction features into the existing gamification system. Users should earn XP for prediction activities.

## Database: Add XP rewards for prediction actions
Create migration: sql-migrations/120_prediction_xp_rewards.sql

INSERT INTO xp_rewards (action_type, xp_amount, description) VALUES
('prediction_first_trade', 100, 'Made your first prediction trade'),
('prediction_trade', 25, 'Traded on a prediction market'),
('prediction_correct', 150, 'Correctly predicted an outcome'),
('prediction_deposit', 50, 'Funded your prediction wallet'),
('prediction_streak_3', 75, 'Traded 3 days in a row'),
('prediction_cause_trade', 50, 'Traded on a Cause Market (bonus XP)');

## Add new achievements for predictions:
INSERT INTO user_achievements would need new types - but instead, just add to the existing check_achievements() function or create a new one:

- 'first_prediction': First prediction trade
- 'prediction_veteran': 50 trades
- 'conscious_contributor': $100 contributed to Conscious Fund through trades
- 'cause_champion': 10 trades on Cause Markets
- 'oracle': 5 correct predictions

## Modify the execute_prediction_trade function to:
- After successful trade, call award_xp with 'prediction_trade'
- If it's their first trade, also award 'prediction_first_trade'
- If trading on a cause market, also award 'prediction_cause_trade'

## Create: app/(predictions)/predictions/achievements/page.tsx
- Show prediction-specific achievements
- Reuse existing components/gamification/ components
- Filter to show only prediction-related achievements

This bridges both worlds — users earn XP in the main app from predictions, and see their prediction achievements in the prediction section.
```

---

## Prompt Templates for Ongoing Development

### When You Need to Add a New Market (Admin):

```
@PREDICTIONS-CONTEXT.md

Create an admin page at app/(predictions)/predictions/admin/create-market/page.tsx for creating new prediction markets.

Form fields: title, description, category (dropdown), subcategory, resolution_criteria, resolution_date, verification_sources (add/remove list), fee_percentage, conscious_fund_percentage, tags, min_trade.

Only accessible to users with user_type = 'admin' in profiles table.
On submit POST to /api/predictions/admin/markets (create this route too).
After creation, redirect to the new market page.
```

### When You Need to Debug an Agent:

```
@lib/agents/news-monitor.ts @app/api/cron/agents/news/route.ts

The news monitor agent is [describe issue]. 

Check the agent_logs table for recent errors. Show me the last 10 log entries and suggest fixes.

Also create a test route at app/api/predictions/admin/test-agent/route.ts that I can call manually to trigger a single agent run for a specific market_id, so I don't have to wait for the cron.
```

### When You Need to Add Mercado Pago OXXO Support:

```
@lib/mercadopago.ts @app/api/predictions/deposit/route.ts

Add OXXO cash payment support for prediction wallet deposits.

When user selects "OXXO" as payment method:
1. Create MP payment with payment_method_id: 'oxxo'
2. Return the barcode/reference number to the user
3. Show a "Pay at OXXO" instruction page with:
   - The reference number (large, copyable)
   - Amount to pay
   - Expiration (usually 3 days)
   - Step-by-step instructions in Spanish
4. Webhook handles the async confirmation (already built)
5. Send push notification when payment confirmed
```

---

## Information I Need From You

Before starting, please confirm or provide:

1. **Supabase Project ID** — needed for type generation
2. **Current Vercel domain** — to configure Mercado Pago callback URLs
3. **Mercado Pago account** — do you have a developer account? Production or sandbox?
4. **Anthropic API key** — do you have one, or do you need to sign up?
5. **News API key** — free tier from newsapi.org works fine for testing
6. **CRON_SECRET** — any random string for Vercel cron auth (generate with `openssl rand -hex 32`)
7. **Access code** — what code should testers enter to access `/predictions`?
8. **Admin user ID** — your Supabase auth.users UUID so we can set you as admin for market creation

---

## Quick Reference: File Map

```
NEW FILES ONLY (nothing existing is modified except middleware.ts):

app/(predictions)/
├── layout.tsx                              # Gate check layout
├── predictions/
│   ├── page.tsx                            # Dashboard
│   ├── layout.tsx                          # Predictions nav
│   ├── gate/page.tsx                       # Access code entry
│   ├── markets/[id]/page.tsx               # Market detail
│   ├── wallet/page.tsx                     # Wallet + deposits
│   ├── fund/page.tsx                       # Conscious Fund
│   ├── positions/page.tsx                  # My positions
│   ├── achievements/page.tsx               # Prediction achievements
│   └── admin/
│       └── create-market/page.tsx          # Admin: create market

app/api/predictions/
├── verify-code/route.ts                    # Gate verification
├── markets/route.ts                        # List markets
├── markets/[id]/route.ts                   # Single market
├── trade/route.ts                          # Execute trade
├── wallet/route.ts                         # Get wallet
├── deposit/route.ts                        # Deposit (Stripe + MP)
├── positions/route.ts                      # User positions
├── fund/route.ts                           # Fund stats
├── fund/transactions/route.ts              # Fund transactions
├── history/[marketId]/route.ts             # Price history
└── admin/
    ├── markets/route.ts                    # Create market
    └── test-agent/route.ts                 # Test agent manually

app/api/webhooks/
└── mercadopago/route.ts                    # MP webhook

app/api/cron/agents/
├── news/route.ts
├── sentiment/route.ts
├── data/route.ts
└── content/route.ts

lib/
├── mercadopago.ts                          # MP client
├── prediction-schemas.ts                   # Zod schemas
└── agents/
    ├── base-agent.ts
    ├── news-monitor.ts
    ├── sentiment-tracker.ts
    ├── data-watchdog.ts
    └── content-creator.ts

sql-migrations/
├── 119_predictions_tables.sql
└── 120_prediction_xp_rewards.sql

scripts/
└── seed-prediction-markets.ts

components/predictions/
├── MarketCard.tsx
├── TradePanel.tsx
├── ProbabilityChart.tsx
├── SentimentGauge.tsx
├── ConciousFundBanner.tsx
├── WalletBalance.tsx
└── AgentInsights.tsx
```

---

## Deployment Checklist

Before sharing the `/predictions` link with testers:

- [ ] Run migration 119 in Supabase SQL editor
- [ ] Run migration 120 in Supabase SQL editor
- [ ] Regenerate types or manually add them
- [ ] Set all env vars in Vercel
- [ ] Run seed script to populate test markets
- [ ] Deploy to Vercel
- [ ] Test the gate: visit /predictions, enter code, verify redirect
- [ ] Test a trade: deposit test funds, execute YES/NO trade
- [ ] Test Mercado Pago: create a test deposit, verify webhook
- [ ] Verify Conscious Fund updates after trades
- [ ] Test agents manually via /api/predictions/admin/test-agent
- [ ] Share the link + access code with testers