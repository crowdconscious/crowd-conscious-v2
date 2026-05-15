# Cursor Composer Prompt — Dashboard UX Overhaul + AI Pulse Wiring
# Crowd Conscious · crowdconscious.app

---

> **How to use this:** You can run this as one single Cursor Composer prompt, or split at the
> marked divider into Stage 1 (layout) and Stage 2 (AI Pulse data). Stage 1 is pure UI refactor
> with no data changes. Stage 2 wires live agent data into the new layout.

---

## Overall Goal

Refactor the main user dashboard (`/predictions`) for two things:
1. **UX overhaul** — better layout, collapsible predictions, clear action navigation
2. **AI Pulse** — replace the static placeholder with real content from the `agent_content` table

Do NOT touch any cron routes, agent runner files, admin pages, or the `agent_content` table schema.

---

---

# STAGE 1 — Dashboard UX Overhaul (Layout Only)

---

## What the Current Dashboard Does Wrong

- Loads every single user prediction on mount — the more predictions a user has, the longer they scroll
- No clear signposting of what users can do on the platform
- AI Pulse shows a dead placeholder even though agents are running
- Biggest Movers, New Markets, and Conscious Fund are buried below a long scroll
- Market Overview is competing for attention with the prediction list

---

## Target Layout

Switch the dashboard body to a **two-column grid**:

```
[ Stats row — full width, 3 columns ]

[ LEFT COLUMN — flex 1    ] [ RIGHT COLUMN — fixed 340px ]
  Quick Actions panel          AI Pulse
  Collapsible Predictions      Biggest Movers
  Market Overview              New Markets
                               Conscious Fund widget
```

On mobile (`< lg`): stack to single column, right column goes below left.

Tailwind: `grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5`

---

## 1. Stats Row — Keep As-Is

Keep the existing 3 stat cards (Prediction Score, Accuracy, Your Impact) at the top, full width, as a `grid-cols-3` row. No changes to data or logic.

---

## 2. Quick Actions Panel — New Component

Create `components/dashboard/QuickActions.tsx`.

Render at the **top of the left column**, above predictions.

Section label: small uppercase text `"What you can do"` in muted color.

Render a vertical list of 5 styled `<Link>` buttons:

| Label | Sublabel | Route | Accent color |
|---|---|---|---|
| Your Predictions | `{predictionCount} active` | `/predictions/my` or current predictions anchor | `#10b981` |
| Vote for Causes | `$15.4K fund · {impactXP} XP impact` | `/predictions/conscious-fund` | `#f43f5e` |
| Submit Ideas | `Conscious Inbox` | `/predictions/inbox` | `#f59e0b` |
| Leaderboard | `See your ranking` | `/predictions/leaderboard` | `#a78bfa` |
| Explore Markets | `New predictions available` | `/predictions/markets` | `#38bdf8` |

Each button style:
- Background: `rgba(255,255,255,0.02)`, border: `rgba(255,255,255,0.06)`
- On hover: background shifts to accent color at 8% opacity, border to accent at 20% opacity
- Left: accent-colored icon (use lucide-react — BarChart2, Heart, Lightbulb, Trophy, TrendingUp)
- Right: `→` arrow in muted color
- Use `next/link` for all routes — do not use `<a>` tags

The `predictionCount` and `impactXP` values should be passed as props from the parent page where they're already available. Don't add new DB queries for these.

---

## 3. Collapsible Predictions List

Find wherever the prediction list is currently rendered. Wrap it in a collapsible container.

**Collapsed state (default):** show only the **2 most recent** predictions.

**Expanded state:** show all predictions.

**Toggle:** `useState(false)` for `expanded`.

**Footer row when collapsed** (if more than 2 predictions exist):
```
+ {n} more predictions · Click to expand
```
Clicking anywhere on the footer row toggles expanded.

**Header row** (always visible, acts as collapse toggle too):
- Left: BarChart2 icon + "Your Predictions" label + green badge showing count
- Right: "Expand all" / "Collapse" text + chevron icon
- Clicking the header row also toggles

**Do not change** the individual prediction card design, data fetching, XP display, sparklines, share buttons, or View links — only wrap in this collapsible shell.

---

## 4. Market Overview — Move to Bottom of Left Column

Move the existing **Market Overview** grid to the **bottom of the left column**, below the collapsible predictions.

No changes to its internal logic or data fetching.

Add a thin probability bar beneath each market card's percentage number:

```tsx
// Add this sub-component inline or in a shared utils component:
function ProbabilityBar({ value }: { value: number }) {
  const color = value > 60 ? '#10b981' : value > 30 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginTop: '6px' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
    </div>
  )
}
```

---

## 5. Right Column — Always-Visible Sidebar

Move these existing sections into the right sidebar column so they're always visible without scrolling:

- **AI Pulse** (top of right column) — content wired in Stage 2
- **Biggest Movers** — no logic changes
- **New Markets** — no logic changes
- **Conscious Fund widget** — keep Fund Balance + Your Impact + "Vote for Causes" button

These sections already exist in the codebase. This is a positional move only — do not change their internal data fetching or display logic in this stage. AI Pulse will get its real content in Stage 2.

---

## 6. Visual Consistency Rules

Maintain existing dark theme throughout:
- Background: `#0a0e14`
- Card backgrounds: `rgba(255,255,255,0.03)`
- Card borders: `1px solid rgba(255,255,255,0.07)`
- Card border radius: `14px`
- Primary green: `#10b981`
- All padding: `20px` inside cards

---

## Files Likely Affected (Stage 1)

- `app/(predictions)/predictions/page.tsx` — main layout restructure
- `components/dashboard/QuickActions.tsx` — **create new**
- `components/dashboard/PredictionsList.tsx` — wrap in collapsible (create if not already componentized)
- Any existing `AIPulse`, `BiggestMovers`, `NewMarkets`, `ConsciousFund` components — positional move only

---

---

# STAGE 2 — Wire AI Pulse to Live Agent Data

---

## Context

The 4 AI agents (CEO Digest, Content Creator, News Monitor, Inbox Curator) are fully configured and running daily via Vercel cron. They save output to the `agent_content` table in Supabase. The Agent Dashboard at `/predictions/admin/agents` confirms successful runs. The AI Pulse section on the main dashboard is currently showing a static placeholder — this stage replaces it with real data.

---

## 1. Dashboard Page — Add Agent Content Query

In the main dashboard server component (`app/(predictions)/predictions/page.tsx`), add this query **in parallel** with existing data fetches (use `Promise.all` if not already doing so):

```ts
const { data: agentContent } = await supabase
  .from('agent_content')
  .select('id, agent_type, content_type, title, body, created_at, market_id')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .limit(5)
```

Pass `agentContent` as a prop to the AI Pulse component.

---

## 2. AI Pulse Component — Full Replacement

Find the AI Pulse section (likely `components/dashboard/AIPulse.tsx` or inline in the dashboard). Replace entirely with the following logic:

### Icon mapping:
```ts
const agentIcons: Record<string, string> = {
  ceo_digest: '📋',
  content_creator: '✍️',
  news_monitor: '📰',
  inbox_curator: '📥',
}
```

### Content type label mapping:
```ts
const contentTypeLabels: Record<string, string> = {
  ceo_digest: 'CEO Digest',
  daily_digest: 'Daily Digest',
  news_summary: 'News Brief',
  social_post: 'Social Post',
  market_suggestion: 'Market Suggestion',
  inbox_digest: 'Inbox Digest',
}
```

### Relative time helper (add to `lib/utils.ts` if not already present):
```ts
export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (hours >= 24) return `hace ${Math.floor(hours / 24)}d`
  if (hours >= 1) return `hace ${hours}h`
  return `hace ${minutes}m`
}
```

### Markdown stripper (add to `lib/utils.ts`):
```ts
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/---/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
}
```

### Render logic:

```tsx
// props: agentContent: AgentContent[] | null

// Empty state:
if (!agentContent || agentContent.length === 0) {
  return (
    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontStyle: 'italic' }}>
      Los agentes están recopilando información...
    </p>
  )
}

// Show max 3 cards:
const items = agentContent.slice(0, 3)

// Each card renders:
// - Row: icon + content type label badge + relative timestamp (right-aligned)
// - Title (1 line, truncated with overflow ellipsis, font-weight 600)
// - Body preview: stripMarkdown(body).slice(0, 150) + '...'
// - "Leer más →" link to /predictions/insights
```

### Card styles (consistent with dark theme):
- Background: `rgba(255,255,255,0.03)`
- Border: `1px solid rgba(255,255,255,0.06)`
- Border radius: `10px`
- Padding: `12px 14px`
- Gap between cards: `10px`

### Content type badge:
- Small pill, font size `10px`, font weight `600`
- Background: `rgba(16,185,129,0.12)`, color: `#10b981`
- Border radius: `8px`, padding: `2px 7px`

### Section footer:
Add a **"Ver todo →"** link below the cards pointing to `/predictions/insights`.

---

## 3. Body Text Note

Agent content bodies contain markdown (CEO Digest uses `**bold**`, `##` headers, `---` dividers). In the AI Pulse cards, always use `stripMarkdown()` for the preview — never render raw markdown in these short preview cards. The `/predictions/insights` full page should use whatever markdown renderer is already in the project (likely `react-markdown` — check existing imports before adding any new library).

---

## 4. Published Flag Verification

Before assuming the query returns results, confirm in Supabase that `agent_content` rows have `published = true`. If the column exists but agents are saving with `published = false` or `null`, update the agent save logic to set `published: true` by default. Check `lib/agents/base-agent.ts` → `saveAgentContent()` function for where content is inserted.

---

## 5. Type Safety

Add or reuse a type for agent content. If not already in `types/database.ts`:

```ts
export type AgentContent = {
  id: string
  agent_type: string
  content_type: string
  title: string | null
  body: string
  created_at: string
  market_id: string | null
}
```

---

## Files Likely Affected (Stage 2)

- `app/(predictions)/predictions/page.tsx` — add `agentContent` query
- `components/dashboard/AIPulse.tsx` — full replacement of placeholder logic
- `lib/utils.ts` — add `relativeTime` and `stripMarkdown` helpers
- `lib/agents/base-agent.ts` — verify/fix `published: true` on save (if needed)
- `types/database.ts` — add `AgentContent` type if missing

---

## Post-Deploy Sanity Check

After both stages are deployed, verify:

1. Dashboard loads with two-column layout on desktop, single column on mobile
2. Quick Actions panel shows all 5 links with correct routes and colors
3. Predictions list shows only 2 by default, expands on click, collapses again
4. AI Pulse shows real content cards with titles, truncated body, relative timestamps
5. No `**`, `##`, or `---` visible in AI Pulse card previews
6. "Ver todo →" links correctly to `/predictions/insights`
7. Right column (Biggest Movers, New Markets, Conscious Fund) visible without scrolling
8. Market Overview is at the bottom of the left column with probability bars
9. No console errors, no broken Supabase queries, no missing props