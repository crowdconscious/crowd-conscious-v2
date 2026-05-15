Crowd Conscious — Platform Design, Market Mechanics & What's Missing
Current State (From Your Screenshots)
What's working: Gate, 8 seeded markets, market cards with YES/NO buttons, wallet with Stripe Elements and $27.75 balance, My Trades showing deposits + trades, Conscious Fund showing $15.4K balance with trade fee transactions.
What needs work: Dashboard vs Markets are identical, no probability charts, no payout logic defined, no market resolution flow, no real-time odds adjustment, no cause voting, no agent content visible, no sentiment data displayed.

1. HOW THE MONEY ACTUALLY WORKS (Market Mechanics)
This is the core question. Here's the simplest model that works:
The Simplified AMM (Automated Market Maker)
Each market has a YES price and a NO price. They always sum to $1.00 MXN (or $10 MXN for bigger numbers — your choice, but let's use $10 for Mexico where $1 feels too small).
Example: FIFA World Cup market at 55% YES

YES share price: $5.50 MXN
NO share price: $4.50 MXN
They always sum to $10.00

When someone buys YES:

They pay $5.50 per share
If Mexico advances (YES wins): they get $10.00 per share back = $4.50 profit
If Mexico doesn't advance (NO wins): they get $0 = lost $5.50

When someone buys NO:

They pay $4.50 per share
If NO wins: they get $10.00 per share back = $5.50 profit
If YES wins: they get $0 = lost $4.50

The fee structure on each trade:

Platform fee (2.5%): deducted from trade amount
Conscious Fund (7.5-15%): deducted from trade amount
Remaining goes to buy shares

Example $100 MXN trade on YES at 55%:

Fee: $2.50 (platform) + $7.50 (conscious fund) = $10.00
Net buying power: $90.00
Shares received: $90.00 / $5.50 = 16.36 shares
If YES wins: 16.36 × $10.00 = $163.60 payout
If NO wins: $0 payout

How Probability Adjusts
Every time someone buys, the price shifts:

More YES buying → YES price goes up, NO price goes down
More NO buying → NO price goes up, YES price goes down
The probability displayed IS the YES price (55% = $5.50 per $10 share)

Simple formula (Constant Product Market Maker):
After a YES buy of amount A:
new_yes_price = old_yes_price + (A / total_liquidity_pool) × sensitivity
new_no_price = $10 - new_yes_price
Sensitivity factor determines how much each trade moves the price. For low-volume markets, use higher sensitivity (prices move more per trade). For high-volume, lower sensitivity.
Market Resolution (How Payouts Happen)
WHO resolves: Admin initially. Later, a panel of verified users or your AI agent with admin confirmation.
WHEN resolved: After the resolution_date passes AND evidence is available.
Resolution flow:

Resolution date arrives
Admin reviews verification_sources
Admin clicks "Resolve YES" or "Resolve NO" with evidence link
System calculates payouts:

All winning shares × $10 = payout amount
Credits each winner's prediction_wallet
Losing shares become worth $0


Market status → 'resolved'
Notification sent to all traders

Edge cases:

Market cancelled (event didn't happen, ambiguous outcome): All traders get refunded their original trade amount minus fees already collected
Market disputed: 7-day review period, admin + community vote
Early resolution: If outcome becomes certain before resolution_date, admin can resolve early

Time Sensitivity
Markets ARE inherently time-sensitive because they have a resolution_date. As the date approaches:

Probability should converge toward the actual outcome (as more information becomes available)
The AI agents feed news that helps traders make informed decisions
The closer to resolution, the more "expensive" it is to bet against the likely outcome

You don't need artificial time pressure. The natural dynamics of a prediction market create urgency as resolution approaches and new information shifts odds.

2. DASHBOARD vs MARKETS — MAKE THEM DIFFERENT
Dashboard = Your Personalized Intelligence Hub
Think Bloomberg Terminal meets social impact tracker. This is WHERE YOU GO to understand what's happening.
Layout:
┌─────────────────────────────────────────────────────┐
│  HERO: "Welcome back, [Name]"                       │
│  Your Portfolio: $X.XX  |  P&L: +$X.XX (+X%)       │
│  Conscious Impact: You've funded $X toward causes   │
├──────────────────────┬──────────────────────────────┤
│  YOUR POSITIONS      │  TRENDING NOW               │
│  (your active bets   │  (biggest movers today)     │
│   with live P&L)     │  - Market A: 45% → 52% ↑   │
│                      │  - Market B: 30% → 24% ↓   │
│  FIFA: 16 YES @5.50  │  - Market C: NEW            │
│  Unrealized: +$22    │                             │
│                      │                             │
│  Banxico: 10 NO @5.80│                             │
│  Unrealized: -$8     │                             │
├──────────────────────┴──────────────────────────────┤
│  AI PULSE (latest agent insights — 2-3 cards)       │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ 📰 News     │ │ 📊 Sentiment │ │ 🔔 Alert    │ │
│  │ "Banxico    │ │ FIFA WC:     │ │ New data:   │ │
│  │  signals    │ │ Bullish +22  │ │ SEMARNAT    │ │
│  │  rate cut"  │ │ trend: ↑     │ │ published   │ │
│  └─────────────┘ └──────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────┤
│  CONSCIOUS FUND IMPACT (mini version)               │
│  Balance: $15.4K | Your contribution: $1.75         │
│  "Vote for next grant recipient →"                  │
├─────────────────────────────────────────────────────┤
│  MARKET OVERVIEW (small sparkline cards, 3 per row) │
│  Just a quick visual of all 8 markets with          │
│  sparkline probability charts — click to go to      │
│  full market page                                   │
└─────────────────────────────────────────────────────┘
What makes it different from Markets page:

Personalized (your positions, your P&L, your contributions)
AI content front and center (agent insights)
Compact market overview (sparklines not full cards)
Action-oriented (trending movers, alerts, vote for causes)

Markets = The Trading Floor
This is WHERE YOU GO to browse, research, and trade. Keep it close to what you have but add depth.
Layout:
┌─────────────────────────────────────────────────────┐
│  Search + Category filters (keep current)           │
├─────────────────────────────────────────────────────┤
│  MARKET CARDS (current layout but enhanced):        │
│  ┌──────────────────────────────────────────┐       │
│  │ [World] FIFA World Cup 2026              │       │
│  │ ¿Avanzará México a octavos?              │       │
│  │                                          │       │
│  │  55% YES  ████████████░░░░░░░            │       │
│  │                                          │       │
│  │  ╭──────────────────────╮  Mini sparkline│       │
│  │  │    ╱╲    ╱╲  ╱       │  (30-day)     │       │
│  │  │  ╱    ╲╱   ╲╱        │               │       │
│  │  ╰──────────────────────╯               │       │
│  │                                          │       │
│  │  Volume: $10  |  Resolves: 5 months      │       │
│  │  Funded $1 for world causes              │       │
│  │  [Yes ↑]  [No ↓]                        │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
The key difference: Markets page has sparkline charts on each card and is browsing-focused. Dashboard is personalized and intelligence-focused.

3. INDIVIDUAL MARKET PAGE (the deep dive)
When you click a market card, the detail page should be the richest experience:
┌─────────────────────────────────────────────────────┐
│  [Government] ← Markets                            │
│  ¿Completará CDMX el 80% del Cablebús Línea 3?     │
│  Created by Admin  |  Status: Active                │
├────────────────────────────┬────────────────────────┤
│  PROBABILITY CHART         │  TRADE PANEL (sticky)  │
│  (Recharts line chart)     │                        │
│  30-day history with       │  [BUY YES] [BUY NO]   │
│  hover tooltips            │                        │
│  Time range: 7d|30d|All    │  Amount: [____] MXN    │
│                            │  Shares: 18.2          │
│  Current: 32% YES          │  Price: $3.20/share    │
│                            │  Payout if correct:    │
│                            │  $182.00               │
│                            │  Fee: $2.50 + $7.50    │
│                            │                        │
│                            │  [TRADE]               │
│                            │                        │
│                            │  YOUR POSITION:        │
│                            │  10 YES @ $3.40 avg    │
│                            │  Current value: $32.00 │
│                            │  P&L: -$2.00 (-5.9%)  │
├────────────────────────────┤                        │
│  SENTIMENT GAUGE           │  MARKET INFO:          │
│  [-30───●──────+30]        │  Resolution: Dec 2026  │
│  "Slightly bearish"        │  Traders: 14           │
│  Based on: news analysis   │  Volume: $2,340        │
│                            │  Fund rate: 10%        │
├────────────────────────────┼────────────────────────┤
│  RESEARCH CENTER                                    │
│                                                     │
│  Resolution Criteria:                               │
│  "Reporte oficial Gobierno CDMX indicando 80%+"     │
│                                                     │
│  Verification Sources:                              │
│  • Gobierno CDMX reportes de obra                   │
│  • IMCO                                             │
│  • Reforma                                          │
│                                                     │
│  AI Insights (from agent_content):                  │
│  ┌─────────────────────────────────────────┐        │
│  │ 📰 Feb 24: "Avance de obra del Cablebús│        │
│  │ reportado en 45% según último informe..." │       │
│  └─────────────────────────────────────────┘        │
│  ┌─────────────────────────────────────────┐        │
│  │ 📊 Weekly Digest: "La probabilidad bajó │        │
│  │ de 38% a 32% esta semana tras..."        │       │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  ACTIVITY FEED (anonymized):                        │
│  "Alguien compró 50 YES a $3.20" - hace 2h         │
│  "Alguien compró 20 NO a $6.80" - hace 5h          │
│                                                     │
│  CONSCIOUS IMPACT:                                  │
│  This market has contributed $340 to the            │
│  Conscious Fund. Your trades: $12.50                │
└─────────────────────────────────────────────────────┘

4. CONSCIOUS FUND — ADD CAUSE VOTING
The Conscious Fund page needs a voting mechanism. Simple version:
Fund Page Redesign:
Top section (keep current stats cards)
New: Cause Voting Section
┌─────────────────────────────────────────────────────┐
│  🗳️ VOTE: Where Should the Fund Go?                │
│  Your voting power: 3 votes (1 per $500 traded)     │
│                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ 🌊 Fondo de  │ │ 📚 Educación │ │ 🌱 Reforesta│ │
│  │ Agua Monterrey│ │ Indígena     │ │ ción CDMX   │ │
│  │              │ │ Oaxaca       │ │             │ │
│  │ 45 votes     │ │ 32 votes     │ │ 28 votes    │ │
│  │ ████████░░░  │ │ ██████░░░░░  │ │ █████░░░░░  │ │
│  │              │ │              │ │             │ │
│  │ [Vote ♥]     │ │ [Vote ♥]     │ │ [Vote ♥]    │ │
│  └──────────────┘ └──────────────┘ └─────────────┘ │
│                                                     │
│  Next disbursement: March 15, 2026                  │
│  "Top-voted cause receives 60%, second 30%,         │
│   third 10% of available fund balance"              │
└─────────────────────────────────────────────────────┘
Voting rules (simple):

Users earn 1 vote per $500 MXN total trading volume
Votes reset each disbursement cycle (monthly or quarterly)
Top 3 causes receive funds in 60/30/10 split
Causes are curated by admin (add/remove via admin panel)
Each cause links to a real NGO or project

Database addition needed:
sqlCREATE TABLE fund_causes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization TEXT,
  category TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE fund_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  cause_id UUID REFERENCES fund_causes(id) NOT NULL,
  cycle TEXT NOT NULL, -- '2026-Q1' or '2026-03'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, cause_id, cycle)
);

5. WHAT'S MISSING — PRIORITIZED
CRITICAL (blocks core trading loop):

Market resolution flow — Admin UI to resolve markets + payout logic

Admin page: list markets past resolution date
"Resolve YES" / "Resolve NO" / "Cancel" buttons
Calls resolve_prediction_market() function
Automatic wallet credits for winners
Email notification to all traders in that market


Probability adjustment on trade — Currently probability is static

execute_prediction_trade must update current_probability
Use constant-product formula or simple weighted average
New probability reflected immediately on market card


Share pricing display — Users need to see what they're buying

Trade panel should show: price per share, number of shares, potential payout
Currently just shows amount, not the economics



HIGH (makes platform feel real):

Dashboard redesign — Differentiate from Markets page

Your positions with P&L
Trending movers
AI insights cards
Compact market sparklines


Probability sparkline charts on market cards

Mini charts using prediction_market_history data
Makes markets page visually distinct from dashboard


Market detail page charts

Full Recharts line chart on individual market pages
Sentiment gauge
Agent content display


Agent content visible — The 24 seeded agent_content entries exist in DB but are not shown anywhere

MEDIUM (enriches experience):

Cause voting on Conscious Fund page
Position page — Full portfolio view with all positions and aggregate P&L
Transaction history on wallet page — Currently no history shown
Market creation admin page — Create markets without running scripts

FUTURE (after core works):

AI agents (live, not just seeded content)
Mercado Pago integration
XP/achievement integration for predictions
Social sharing of positions
Market comments/discussion


6. MARKET RESOLUTION RULES
Standard Resolution:

Market reaches resolution_date
Admin has 7 days to resolve after resolution_date
Resolution requires selecting outcome (YES/NO) + evidence URL
All winning positions are paid out at $10/share
All losing positions become $0
Payouts credited to prediction_wallets automatically

Disputed Resolution:

Any trader can flag a resolution within 48 hours
Flagged markets enter 7-day review
Admin reviews with additional evidence
Final resolution is binding

Cancelled Markets:

Admin can cancel before resolution
All traders refunded at their average purchase price
Fees already collected remain in platform + conscious fund
Reason for cancellation must be provided

Automatic Monitoring (future, via AI agent):

Data Watchdog agent checks verification sources
When clear evidence of outcome exists, agent flags market as "ready to resolve"
Admin confirms with one click
Agent generates resolution summary