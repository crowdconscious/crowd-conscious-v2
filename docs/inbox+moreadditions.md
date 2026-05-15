# Crowd Conscious — Platform Improvements & Next Features

## Status: What's Working (from screenshots, March 5 2026)

The core prediction loop is live and functional:
- Dashboard with XP scoring, predictions list, biggest movers, new markets
- Individual market pages with probability charts, history, confidence levels
- "Understand This Issue" section with description, resolution criteria, verification sources, tags
- Agent analysis cards (Resumen semanal, Perspectiva, Resumen monetario) — these are generating
- Markets browse page with category filters (World Cup 9, World 4, Government 3, Sustainability 1, Corporate 1, Community 0, Cause 2)
- My Predictions page with history and XP earned (6 predictions, 67 XP)
- Conscious Fund page with $15.4K MXN total, 5 causes supported, voting system
- Admin: Resolve Markets page with Select winner / Resolve YES / Resolve NO / Cancel buttons

---

## Feature 1: Conscious Inbox (Democratic Market & Cause Suggestions)

This is the big missing piece — right now only you can create markets. The Inbox lets users propose both market ideas AND causes for the Conscious Fund.

### Supabase Schema

```sql
-- Run in Supabase SQL Editor

-- Inbox submissions from users
CREATE TABLE conscious_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('market_idea', 'cause_proposal', 'ngo_suggestion', 'general')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- maps to your existing categories: world_cup, world, government, sustainability, corporate, community, cause
  links JSONB DEFAULT '[]', -- array of {url, label} objects
  attachments JSONB DEFAULT '[]', -- future: image URLs etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'published')),
  admin_notes TEXT, -- your private notes on the submission
  upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track who upvoted what (one vote per user per submission)
CREATE TABLE inbox_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inbox_item_id UUID REFERENCES conscious_inbox(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inbox_item_id, user_id)
);

-- Function to increment upvotes
CREATE OR REPLACE FUNCTION increment_inbox_upvote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conscious_inbox SET upvotes = upvotes + 1, updated_at = NOW()
  WHERE id = NEW.inbox_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_inbox_vote_insert
AFTER INSERT ON inbox_votes
FOR EACH ROW EXECUTE FUNCTION increment_inbox_upvote();

-- Function to decrement on delete
CREATE OR REPLACE FUNCTION decrement_inbox_upvote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conscious_inbox SET upvotes = upvotes - 1, updated_at = NOW()
  WHERE id = OLD.inbox_item_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_inbox_vote_delete
AFTER DELETE ON inbox_votes
FOR EACH ROW EXECUTE FUNCTION decrement_inbox_upvote();

-- RLS policies
ALTER TABLE conscious_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_votes ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can read inbox items
CREATE POLICY "Anyone can read inbox" ON conscious_inbox FOR SELECT USING (true);
-- Users can insert their own
CREATE POLICY "Users can submit" ON conscious_inbox FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Only admin can update status
CREATE POLICY "Admin can update" ON conscious_inbox FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- Votes: users can see all, insert/delete their own
CREATE POLICY "Anyone can read votes" ON inbox_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON inbox_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unvote" ON inbox_votes FOR DELETE USING (auth.uid() = user_id);
```

### Cursor Prompt: User-Facing Inbox Page

```
Create a new page at app/predictions/inbox/page.tsx

This is the "Conscious Inbox" — a place where users can:
1. Submit ideas for new prediction markets
2. Suggest causes/NGOs for the Conscious Fund
3. Upvote other people's submissions
4. See what's trending (sorted by upvotes)

The page should have:
- A header: "Conscious Inbox" with subtitle "Suggest markets, causes, and ideas. The community decides what matters."
- A "Submit Idea" button that opens a modal/drawer with a form:
  - Type selector: "Market Idea" | "Cause/NGO" | "General Suggestion"
  - Title (required)
  - Description (textarea)
  - Category dropdown (matching existing categories: World Cup, World, Government, Sustainability, Corporate, Community, Cause)
  - Links section: ability to add multiple links with URL + label
  - Submit button
- Below that, a feed of all submissions sorted by upvotes (desc), with:
  - Type badge (color-coded like existing market category badges)
  - Title and truncated description
  - Upvote button with count (toggle — click to vote, click again to remove vote)
  - "Submitted by [username] · [relative time]"
  - Status badge if reviewed/approved/rejected
- Filter tabs: All | Market Ideas | Causes | General

Use the existing dark theme and component patterns from the rest of the app.
The Supabase tables are: conscious_inbox and inbox_votes.
```

### Cursor Prompt: Admin Inbox Review Page

```
Create an admin page at app/predictions/admin/inbox/page.tsx

This lets me (admin) review all Conscious Inbox submissions. Layout:

- Filter by status: All | Pending | Reviewed | Approved | Rejected
- Filter by type: All | Market Ideas | Causes | General
- Sort by: Most Upvoted | Newest | Oldest

Each submission card shows:
- Full title and description
- All links (clickable)
- Upvote count prominently displayed
- User who submitted it
- Status with colored badge

Action buttons on each card:
- "Create Market from This" → opens the market creation form (Feature 2) pre-filled with this submission's title/description/category/links
- "Approve" → sets status to approved (shows green on the public inbox)
- "Reject" → sets status to rejected with optional note
- "Mark Reviewed" → sets status to reviewed (neutral)
- Admin notes field (private, only visible here)

Use the same dark theme. Table: conscious_inbox.
```

### Add to sidebar navigation:

```
Add "Conscious Inbox" to the left sidebar navigation, between "My Predictions" and "Conscious Fund".
Use a lightbulb or inbox icon. Route: /predictions/inbox
```

---

## Feature 2: Admin Market Creation Form

Right now you can only resolve markets, not create them. This is critical.

### Cursor Prompt: Admin Create Market Page

```
Create an admin page at app/predictions/admin/create-market/page.tsx

This is a form to manually create new prediction markets. Fields:

BASIC INFO:
- Title (text input, required) — the question, e.g. "¿Bajará Banxico la tasa..."
- Description (textarea) — context about the issue
- Category (dropdown): World Cup, World, Government, Sustainability, Corporate, Community, Cause
- Initial probability (slider or number input, 1-99, default 50)

RESOLUTION:
- Resolution date (date picker, required)
- Resolution criteria (textarea) — how this market gets resolved
- Market type (radio): Yes/No | Multiple Choice
  - If Multiple Choice: dynamic fields to add options (e.g., "Mexico", "South Korea", "South Africa", "UEFA Playoff D")

VERIFICATION:
- Verification sources: dynamic list where I can add multiple sources, each with:
  - Source name (text)
  - Source URL (text, optional)
- Tags: comma-separated input that creates tag chips (like "economia, banxico, tasas")

RICH CONTENT:
- Links section: add multiple links with Label + URL (these show in the market detail page)
- Related markets: searchable dropdown to link to other existing markets

SPONSORSHIP (for the revenue model):
- Sponsor name (text, optional)
- Sponsor logo URL (text, optional)
- Sponsorship amount in MXN (number, optional)
- Conscious Fund allocation % (number, default 7.5 — matching what I see in the screenshots)

PREVIEW:
- Show a live preview card of how the market will look on the browse page

On submit, insert into prediction_markets table with all fields.
Show success message with link to the new market.

Use the existing dark theme. Make sure URL param ?from_inbox=[inbox_id] pre-fills from an inbox submission.
```

### Cursor Prompt: Add "Create Market" button to admin area

```
On the existing Resolve Markets page (app/predictions/admin/resolve/page.tsx), 
add a prominent "Create New Market" button at the top that links to /predictions/admin/create-market.

Also add an "Admin" section to the sidebar (only visible to admin users) with links to:
- Create Market (/predictions/admin/create-market)
- Resolve Markets (/predictions/admin/resolve) 
- Review Inbox (/predictions/admin/inbox)
```

---

## Feature 3: Agent-Powered Inbox Digest

An agent that periodically reviews inbox submissions and helps you prioritize.

### Cursor Prompt: Inbox Digest Agent

```
Create a new agent at lib/agents/inbox-curator.ts

This agent runs daily (or on-demand via the test-agent route). It:

1. Queries conscious_inbox for all items with status='pending' that have at least 1 upvote
2. Groups them by type (market_idea, cause_proposal, general)
3. Sends to Claude API with this prompt:

"You are the Crowd Conscious platform curator. Review these community submissions 
and help prioritize them. For each submission, provide:
- A relevance score (1-10) based on: timeliness, alignment with platform categories, 
  community interest (upvote count), and whether it would make a good prediction market
- A brief recommendation: 'create market', 'needs editing', 'merge with existing', 
  'not suitable', or 'great cause for fund'
- If 'create market': suggest the resolution criteria and verification sources
- If 'merge': identify which existing market or submission it overlaps with

Current active market titles for reference: [list of active market titles]
Current Conscious Fund causes: [list of current causes]

Submissions to review:
[JSON of pending submissions with upvote counts]

Respond in JSON format."

4. Saves the agent's analysis to agent_content table with content_type='inbox_digest'
5. The admin inbox review page should display the agent's recommendation next to each submission

Add the cron route at app/api/cron/agents/inbox-curator/route.ts
Add to vercel.json crons: daily at 8am Mexico City time (14:00 UTC)
```

---

## Feature 4: Social Media Content Agent

You need content flowing from platform activity to social media. This agent digests everything happening on the platform and generates ready-to-post content.

### Cursor Prompt: Social Content Generator Agent

```
Create or update lib/agents/content-creator.ts to include a social media content pipeline.

The agent should:

1. Gather data:
   - Active markets with significant probability changes in last 24h
   - New predictions made (count and which markets are hot)
   - Inbox submissions trending (high upvotes)
   - Conscious Fund updates (new votes, allocation changes)
   - Any resolved markets

2. Call Claude API with:

"You are the social media manager for Crowd Conscious (crowdconscious.app), 
a free-to-play opinion and engagement platform based in Mexico City.

Generate social media content based on today's platform activity. 
Create posts in BOTH Spanish and English.

For each piece of content, provide:
- Platform: Instagram (carousel caption), Twitter/X (280 chars), LinkedIn
- The hook (first line that grabs attention)
- The body
- Suggested hashtags
- Content type: 'hot_take', 'market_update', 'community_highlight', 'fund_impact', 'did_you_know'

Platform activity today:
[JSON of gathered data]

Active World Cup markets for context:
[list of World Cup category markets]

Rules:
- Always include a CTA to visit crowdconscious.app
- Reference the World Cup when relevant (opening match June 11 at Estadio Azteca)
- Highlight the social impact angle (Conscious Fund, community causes)
- Make it feel like a community, not a corporation
- Use 🔥⚽🌍💚 emojis sparingly but effectively

Return as JSON array of content objects."

3. Save each piece of content to agent_content with:
   - content_type: 'social_instagram', 'social_twitter', 'social_linkedin'
   - metadata: { language: 'es'|'en', content_subtype: 'hot_take'|etc. }

4. Schedule: Run every 6 hours
```

### Cursor Prompt: Admin Content Dashboard

```
Create an admin page at app/predictions/admin/content/page.tsx

This shows all agent-generated content ready for social media posting. Layout:

- Filter by platform: All | Instagram | Twitter | LinkedIn
- Filter by language: All | Spanish | English
- Filter by type: All | Market Update | Hot Take | Community Highlight | Fund Impact

Each content card shows:
- Platform icon and language flag
- The full post text (formatted nicely)
- Hashtags
- "Copy to Clipboard" button
- "Mark as Posted" toggle
- Edit button (inline edit the text before copying)
- Timestamp of generation

This is basically my content calendar/queue powered by the agents.
Read from agent_content table where content_type starts with 'social_'.
```

---

## Feature 5: Platform Activity Digest (For You as CEO)

You need a daily briefing on everything happening across the platform.

### Cursor Prompt: CEO Digest Agent

```
Create lib/agents/ceo-digest.ts

This agent runs once daily at 7am Mexico City time and produces a comprehensive 
platform digest. It queries:

1. User metrics: new signups, active users (made predictions), returning users
2. Prediction activity: total predictions made, which markets are hottest, 
   confidence distribution
3. Conscious Fund: total fund value change, new votes, cause momentum
4. Inbox activity: new submissions, trending items
5. Agent performance: which agents ran successfully, any failures
6. Market health: markets approaching resolution date, markets with no activity

Send all this to Claude API with:

"You are the daily briefing analyst for Crowd Conscious. 
Synthesize today's platform data into an executive summary for the CEO.

Structure:
1. KEY NUMBERS (3-5 headline metrics with trend arrows)
2. WHAT'S HOT (which markets/topics are getting the most engagement)
3. ACTION ITEMS (markets to resolve, inbox items to review, content to approve)
4. OPPORTUNITIES (suggested new markets based on trending topics, potential sponsor angles)
5. HEALTH CHECK (anything broken, underperforming, or needing attention)

Keep it punchy — this should take 2 minutes to read.

Data: [JSON of all gathered metrics]"

Save to agent_content with content_type='ceo_digest'.

Also: send this digest via email using Resend to the admin email.
Add cron at app/api/cron/agents/ceo-digest/route.ts, daily at 13:00 UTC.
```

---

## Feature 6: Quick Wins & UX Fixes

### Issues spotted in screenshots:

```
1. Accuracy shows 0% — this is because no markets have been resolved yet. 
   Once you start resolving markets, this will populate. But consider showing 
   "No resolved markets yet" instead of "0%" which looks like failure.

2. Dashboard "Your Predictions" list shows sparkline charts that are mostly flat — 
   these need more data points. Consider removing the sparkline until a market 
   has at least 5 probability changes.

3. The "Biggest Movers" section only shows one item. If there's only one, 
   consider hiding this section or showing "Not enough activity yet."

4. Market detail page: the "Vote activity" section says "No activity yet" with 
   a purple wavy line chart above it that shows the probability history. 
   The "Vote activity" might be confusing — rename to "Recent Predictions" 
   or "Community Activity."

5. Conscious Fund shows "You have 0 votes remaining this month" — make sure 
   users understand how they earn votes (through predictions/XP).
```

### Cursor Prompt: Quick Fixes

```
Please make these UX improvements:

1. On the dashboard (/predictions), when Accuracy is 0% and there are no resolved 
   markets, show "—" or "No resolved markets yet" instead of "0%"

2. On market detail pages, rename "Vote activity" section to "Recent Predictions" 
   and show the actual prediction entries (user, their pick, confidence, timestamp) 
   instead of just "No activity yet"

3. On the Conscious Fund page, add a small info tooltip next to "You have 0 votes 
   remaining" that explains: "You earn votes by making predictions on markets. 
   Each prediction earns XP, and your monthly vote allocation is based on your XP."

4. In the sidebar, highlight the current page with the existing green/teal active state 
   (it's working for Markets but verify it works for all pages)
```

---

## Suggested Additional Improvements (High Impact, Low Complexity)

### 1. Shareable Market Cards
Let users share individual markets on social media with an auto-generated OG image showing the question, current probability, and Crowd Conscious branding. This is your viral loop.

```
Create an API route at app/api/og/market/[id]/route.tsx that generates 
Open Graph images for each market using @vercel/og or satori.

The image should show:
- Crowd Conscious logo (small, top left)
- Category badge
- The market question in large text
- Current probability with the donut chart visualization
- "Make your prediction → crowdconscious.app"
- Dark theme matching the app

Also add meta tags to the market detail page for proper social sharing.
```

### 2. Leaderboard
Simple XP leaderboard visible to all users. Creates competition and engagement.

```
Create a leaderboard component on the dashboard or as its own page (/predictions/leaderboard).
Query the top 20 users by XP earned. Show rank, username, XP, accuracy %, 
and number of predictions. Highlight the current user's position.
```

### 3. Notification System (Lightweight)
When a market you predicted on gets resolved, or when someone upvotes your inbox submission, you should know.

```
Create a notifications table in Supabase:

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL, -- 'market_resolved', 'inbox_upvote', 'xp_earned', 'fund_vote_available'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- URL to navigate to
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

Add a bell icon to the top nav bar with unread count badge.
Clicking shows a dropdown with recent notifications.
```

### 4. Market Comments/Discussion
Let users discuss markets. Very simple — just a comment thread on each market page below the predictions.

```
CREATE TABLE market_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id UUID REFERENCES prediction_markets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

Add a "Discussion" section to market detail pages, below the agent analysis.
Simple comment box + chronological thread. No nesting needed for v1.
```

---

## Priority Order (What to Build First)

1. **Admin Create Market form** — you need this immediately to keep adding content
2. **Conscious Inbox** (user-facing + admin review) — democratic engagement loop
3. **Social Content Agent** — you need to start posting World Cup content NOW
4. **Quick UX fixes** — polish what's live
5. **CEO Digest Agent** — daily briefing to stay on top
6. **Inbox Curator Agent** — helps filter as submissions grow
7. **Shareable Market Cards** — viral loop for growth
8. **Leaderboard** — engagement driver
9. **Notifications** — retention
10. **Market Comments** — community depth

---

## Architecture Note: Keeping It Simple

Everything above uses your existing stack (Next.js + Supabase + Vercel crons + Claude API). No new services, no new infrastructure. The agents write to `agent_content` and you review through admin pages. Users interact through the inbox and get XP for engagement. The Conscious Fund stays community-directed.

The World Cup is 97 days away. Focus on features 1-4 this week, then iterate.