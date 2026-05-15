# Conscious Live — Architecture & Implementation Plan

## Overview

"Conscious Live" is a real-time prediction experience layer for Crowd Conscious, designed for the FIFA World Cup 2026 (opening June 11, Estadio Azteca). Users join a match page with an embedded live stream, vote on fast-expiring micro-markets in real time, climb a live leaderboard, and watch the Conscious Fund impact ticker grow — all while the match unfolds.

---

## 1. Architecture Summary

### Four Layers

**User Interface Layer**
- Match page with embedded YouTube Live iframe + live chat
- Live voting panel with swipe/tap micro-markets
- Match leaderboard (resets per match event)
- Conscious Fund impact ticker
- Active viewer count (presence)

**Realtime Engine**
- Supabase Realtime subscriptions on `market_votes`, `market_outcomes`, `live_events`
- Supabase Presence channel for viewer count
- YouTube iframe API for stream status detection

**API + Business Logic (Vercel Serverless)**
- Existing `/api/predictions/vote` route (reused for live markets)
- New `/api/live/markets` route for micro-market CRUD
- New `/api/live/resolve` route for admin market resolution
- XP award logic (existing `execute_market_vote` RPC)

**Data Layer (Supabase)**
- Existing tables: `prediction_markets`, `market_outcomes`, `market_votes`, `user_stats`, `profiles`
- New table: `live_events` (match session metadata)
- New columns on `prediction_markets`: `live_event_id`, `is_micro_market`, `sponsor_label`

### Key Design Decisions

1. **Reuse existing vote infrastructure** — micro-markets are just prediction_markets with `is_micro_market = true` and short `end_date` windows. No new vote tables needed.
2. **YouTube embed, not self-hosted** — zero streaming infrastructure cost. Partner with Mexican sports creators or embed public streams.
3. **Admin-driven resolution** — for MVP, admin manually creates and resolves micro-markets during the match via the admin panel. Semi-automation comes later.
4. **Supabase Realtime for all live updates** — no need for Socket.io or Pusher. Supabase Postgres changes + Presence channels handle everything.

---

## 2. Database Additions

### New table: `live_events`

```sql
CREATE TABLE live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,                          -- "Mexico vs Germany — Group Stage"
  description text,
  match_date timestamptz NOT NULL,
  youtube_url text,                             -- YouTube live stream URL
  youtube_video_id text,                        -- Extracted video ID for iframe
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  viewer_count integer DEFAULT 0,
  total_votes_cast integer DEFAULT 0,
  total_fund_impact numeric DEFAULT 0,
  sponsor_name text,
  sponsor_logo_url text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live events" ON live_events FOR SELECT USING (true);
CREATE POLICY "Admins can manage live events" ON live_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE live_events;
```

### New columns on `prediction_markets`

```sql
ALTER TABLE prediction_markets 
ADD COLUMN IF NOT EXISTS live_event_id uuid REFERENCES live_events(id),
ADD COLUMN IF NOT EXISTS is_micro_market boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsor_label text,           -- "Heineken Halftime Pick"
ADD COLUMN IF NOT EXISTS expires_in_minutes integer;    -- Auto-close timer for UI countdown
```

### Realtime setup (ensure these are enabled)

```sql
-- These should already be in your Realtime publication, but verify:
ALTER PUBLICATION supabase_realtime ADD TABLE market_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE market_outcomes;
ALTER PUBLICATION supabase_realtime ADD TABLE prediction_markets;
```

---

## 3. New & Modified Files

### File Structure (inside your existing Next.js app)

```
app/
├── live/
│   ├── page.tsx                    -- Live events listing (upcoming + active)
│   └── [eventId]/
│       └── page.tsx                -- THE match page (stream + voting + leaderboard)
├── api/
│   └── live/
│       ├── events/
│       │   └── route.ts            -- CRUD for live events (admin)
│       ├── markets/
│       │   └── route.ts            -- Create/list micro-markets for an event
│       └── resolve/
│           └── route.ts            -- Resolve a micro-market (admin)
├── admin/
│   └── live/
│       └── page.tsx                -- Admin live control panel (during match)

components/
├── live/
│   ├── LiveMatchPage.tsx           -- Main orchestrator (client component)
│   ├── StreamEmbed.tsx             -- YouTube iframe with status detection
│   ├── LiveVotingPanel.tsx         -- Active micro-markets with vote UI
│   ├── MicroMarketCard.tsx         -- Single market: countdown + outcomes + vote
│   ├── LiveLeaderboard.tsx         -- Realtime match leaderboard
│   ├── FundImpactTicker.tsx        -- Animated fund impact counter
│   ├── ViewerCount.tsx             -- Presence-based viewer counter
│   └── AdminLiveControls.tsx       -- Admin: create/resolve markets during match

hooks/
├── useLiveEvent.ts                 -- Subscribe to live_events changes
├── useLiveMarkets.ts               -- Subscribe to micro-markets for an event
├── useLiveLeaderboard.ts           -- Subscribe to vote aggregations
└── usePresence.ts                  -- Supabase Presence for viewer count
```

---

## 4. Component Specifications

### LiveMatchPage.tsx (main orchestrator)

```
"use client"

Layout (mobile-first, responsive):
┌─────────────────────────────┐
│  Header: Match title + live │
│  badge + viewer count       │
├─────────────────────────────┤
│  YouTube Stream Embed       │
│  (16:9 aspect ratio)        │
├─────────────────────────────┤
│  Fund Impact Ticker bar     │
├─────────────────────────────┤
│  Active Micro-Market Card   │
│  (swipeable if multiple)    │
├─────────────────────────────┤
│  Match Leaderboard (top 10) │
└─────────────────────────────┘

Desktop (2-column):
┌────────────────┬────────────┐
│ YouTube Stream │ Voting     │
│ (main)         │ Panel      │
│                │            │
│                │ Leaderboard│
├────────────────┴────────────┤
│  Fund Impact Ticker         │
└─────────────────────────────┘

Props: eventId (from URL params)
State: event data, active markets, leaderboard, presence count
Subscriptions: 
  - live_events (status changes)
  - prediction_markets WHERE live_event_id = eventId
  - market_outcomes WHERE market_id IN active markets
  - market_votes WHERE market_id IN active markets (for leaderboard calc)
  - Presence channel: `live:${eventId}`
```

### StreamEmbed.tsx

```
Props: youtubeVideoId: string, isLive: boolean
- Renders YouTube iframe with parameters:
  autoplay=1, mute=1 (for autoplay policy), controls=1
  If live: add enablejsapi=1 for status detection
- Show "Stream starting soon..." placeholder if not live
- Optional: YouTube Live Chat embed alongside (separate iframe)
  URL: https://www.youtube.com/live_chat?v={videoId}&embed_domain={yourdomain}
```

### MicroMarketCard.tsx

```
Props: market (from prediction_markets), outcomes (from market_outcomes)
State: selectedOutcome, confidence (1-10), hasVoted, timeRemaining

UI:
- Market question in bold (e.g. "Will Mexico score before minute 30?")
- Sponsor label if present (e.g. "Powered by Heineken")
- Countdown timer (expires_in_minutes → live countdown)
- Outcome buttons (Yes/No for binary, multiple for multi)
- Confidence slider (1-10) — appears after selecting outcome
- Vote button → calls existing /api/predictions/vote
- After voting: show live probability bars updating via Realtime
- When resolved: flash correct answer, show XP earned

Animation: 
- New market slides in from right
- Probability bars animate on vote updates
- Resolution: confetti burst for correct voters
```

### LiveLeaderboard.tsx

```
Props: eventId, currentUserId
- Query: aggregate market_votes by user WHERE market_id in 
  (SELECT id FROM prediction_markets WHERE live_event_id = eventId)
- Group by user, SUM(bonus_xp + base XP), COUNT(votes where is_correct)
- Show top 10 with:
  - Rank number
  - User avatar + name
  - XP earned this match
  - Correct prediction count
  - Highlight current user row
- Subscribe to market_votes for live updates
- Animate rank changes (slide up/down)
```

### FundImpactTicker.tsx

```
Props: eventId
- Query: SUM of fund impact from live_events table
- Also could calculate: total_votes × impact_per_vote rate
- Animated counter (count up effect)
- Show which cause is active: "Votes directing funds to: Clean Water CDMX"
- Sponsor attribution: "Sponsored by [brand]"
```

### AdminLiveControls.tsx (for you during the match)

```
Only visible to admin users.
UI:
- "Go Live" / "End Stream" toggle for event status
- Quick market creation:
  - Pre-built templates: "Next goal?", "Red card?", "Score at halftime?"
  - Custom: title + outcomes + duration (5min, 10min, halftime)
  - One-click create → auto-publishes to all connected clients
- Active markets list with "Resolve" button
  - Select winning outcome → triggers resolution + XP distribution
- Stats: active viewers, votes this match, markets created
```

---

## 5. Realtime Subscriptions (hooks)

### useLiveMarkets.ts

```typescript
// Subscribe to micro-markets for a live event
// 1. Initial fetch: prediction_markets WHERE live_event_id = eventId AND status = 'active'
// 2. Subscribe to INSERT/UPDATE on prediction_markets filtered by live_event_id
// 3. For each active market, subscribe to market_outcomes changes (probability updates)
// 4. Return: { activeMarkets, resolvedMarkets, isLoading }
```

### useLiveLeaderboard.ts

```typescript
// Subscribe to vote aggregations
// 1. Initial fetch: RPC or query to get top voters for this event
// 2. Subscribe to INSERT on market_votes WHERE market_id IN (event's markets)
// 3. On each new vote, recalculate rankings client-side (or re-fetch)
// 4. Return: { rankings, currentUserRank, isLoading }
```

### usePresence.ts

```typescript
// Supabase Presence for viewer count
// 1. Join channel `live:${eventId}` with user metadata
// 2. Track presence state (joins/leaves)
// 3. Return: { viewerCount, isConnected }
//
// Example:
// const channel = supabase.channel(`live:${eventId}`)
// channel.on('presence', { event: 'sync' }, () => {
//   const state = channel.presenceState()
//   setViewerCount(Object.keys(state).length)
// })
// channel.subscribe(async (status) => {
//   if (status === 'SUBSCRIBED') {
//     await channel.track({ user_id: userId, joined_at: new Date() })
//   }
// })
```

---

## 6. API Routes

### POST /api/live/events (admin only)

```
Body: { title, description, match_date, youtube_url, sponsor_name?, sponsor_logo_url? }
- Extract youtube_video_id from URL
- Insert into live_events
- Return event data
```

### PATCH /api/live/events/[id] (admin only)

```
Body: { status: 'live' | 'completed' | 'cancelled' }
- Update live_events status
- If 'completed': resolve any remaining active micro-markets
```

### POST /api/live/markets (admin only)

```
Body: { 
  live_event_id, 
  title, 
  outcomes: string[], 
  expires_in_minutes, 
  sponsor_label?,
  category: 'world_cup' 
}
- Call existing create_binary_market or create_multi_market RPC
- Set is_micro_market = true, live_event_id, expires_in_minutes
- Set end_date = now() + expires_in_minutes
- Return market + outcomes
```

### POST /api/live/resolve (admin only)

```
Body: { market_id, winning_outcome_id }
- Call existing resolve_market RPC
- Awards bonus XP to correct voters
- Update live_events.total_votes_cast
- Return resolution results
```

**NOTE:** The existing `/api/predictions/vote` route is reused as-is for voting on micro-markets. No changes needed — micro-markets are just prediction_markets with extra metadata.

---

## 7. Sponsor Integration Points

### Branded Micro-Markets

```
- sponsor_label on prediction_markets: "The Heineken Halftime Pick"
- sponsor_name + sponsor_logo_url on live_events (event-level sponsor)
- MicroMarketCard shows sponsor badge when sponsor_label exists
- FundImpactTicker shows "Sponsored by [brand] → [cause]"
```

### Revenue Model

```
Each live event can have:
- Title sponsor: logo on stream page header + all micro-markets
- Market sponsors: individual branded micro-markets
- Fund sponsor: attribution on impact ticker

Pricing (reference your /sponsor tiers):
- Single match sponsorship
- Tournament-long sponsorship
- Cause-specific sponsorship (sponsor directs to specific fund cause)
```

---

## 8. Testing Strategy

### Phase 1: Component Testing (Week 1-2, ~April 7-18)

**What to test:**
- StreamEmbed renders with a non-live YouTube video (use any public video ID)
- MicroMarketCard displays outcomes, countdown timer works, vote submission works
- LiveLeaderboard renders with mock data, sorts correctly
- FundImpactTicker animates count-up
- AdminLiveControls creates a market, resolves a market

**How:**
1. Create a test live event manually in Supabase SQL editor
2. Navigate to /live/[test-event-id]
3. Open in 2 browser tabs (one logged in as admin, one as test user)
4. Admin creates micro-market → verify it appears in both tabs
5. Test user votes → verify probability updates in both tabs
6. Admin resolves → verify XP is awarded

### Phase 2: Internal Live Test (Week 3, ~April 21-25)

**When:** Pick a Liga MX match (Clausura 2026 is in progress)

**What to test:**
- Full flow: event creation → go live → embed a YouTube stream of the match
- Create 5-8 micro-markets during the 90 minutes
- Invite 5-10 friends/collaborators to join
- Test on mobile (most users will be on phones)

**Metrics to track:**
- Time from market creation to first vote
- Average votes per micro-market
- Supabase Realtime latency (any lag in updates?)
- Mobile UX pain points
- Admin workflow: is creating/resolving markets fast enough during a live match?

**What you'll learn:**
- Is the admin flow fast enough? (You need to create markets AND watch the game)
- Do users understand the voting UX without explanation?
- Does the countdown timer create urgency?
- How does the leaderboard feel with <10 people?

### Phase 3: Expanded Beta (Week 4-6, ~April 28 - May 9)

**When:** Pick 2-3 more Liga MX matches

**What to test:**
- Invite 30-50 users via your social media channels
- Test with Spanish-language UI (translations JSONB)
- Test sponsor-branded micro-markets (even mock sponsors)
- Load test: how many simultaneous connections before lag?

**Metrics:**
- User retention (do they stay for the whole match?)
- Votes per user per match
- Social sharing (do they share predictions?)
- Signup conversion (new users from shared links)

### Phase 4: Pre-World Cup Dress Rehearsal (Week 7-8, ~May 12-23)

**When:** International friendlies, Copa America qualifiers, or any high-profile match

**What to test:**
- Full sponsor integration (even if test sponsors)
- Conscious Fund cause voting tied to event
- Email notifications: "Mexico plays tomorrow — join the Conscious Live!"
- Performance with 100+ simultaneous users
- Admin pre-built market templates for common World Cup scenarios

### Phase 5: World Cup Launch (June 11)

**Opening match at Estadio Azteca**
- All systems tested, all UX polished
- Sponsor deals live
- Marketing push: "Predict the World Cup opener LIVE"
- Content Creator agent generates social posts about the event
- Email blast to all registered users

---

## 9. Pre-Built Micro-Market Templates

For admin quick-creation during matches:

```
BINARY (Yes/No):
- "Will [team] score in the first half?"
- "Red card before minute 60?"
- "More than 2.5 total goals?"
- "Will there be a penalty?"
- "Clean sheet for [team]?"
- "Goal in the first 10 minutes?"
- "VAR review this half?"

MULTI-OUTCOME:
- "Who scores the next goal?" → [Player A, Player B, Player C, Own goal, No more goals]
- "Final score?" → [1-0, 2-1, 2-0, Draw, Other]
- "Man of the match?" → [Player A, Player B, Player C, Player D]
- "Minute of next goal?" → [0-15, 16-30, 31-45, 46-60, 61-75, 76-90, None]
```

---

## 10. Performance Considerations

### Supabase Realtime Limits

- Free tier: 200 concurrent connections, 2M realtime messages/month
- Pro tier ($25/mo): 500 concurrent connections, 5M messages/month
- For World Cup scale (1000+ users): you'll need Pro tier minimum
- Optimize: batch client-side updates (debounce leaderboard recalc to every 2-3 seconds)

### Vercel Serverless

- Already have `maxDuration = 120` configured
- Vote API should be fast (<500ms) — it's a simple RPC call
- Market creation/resolution are admin-only, low frequency

### Client-Side Optimization

- Use React.memo on MicroMarketCard to prevent re-renders from unrelated market updates
- Debounce leaderboard recalculations
- Lazy-load YouTube iframe (load after page mount)
- Use Supabase Realtime filters to only subscribe to relevant markets

---

## 11. Bilingual Support

All user-facing text uses the existing `translations` JSONB pattern:

```json
{
  "en": "Will Mexico score in the first half?",
  "es": "¿Anotará México en el primer tiempo?"
}
```

Micro-market templates should have both languages pre-filled.
Admin UI can be English-only (it's just you).

---

## 12. Timeline (77 days to June 11)
