# Auth-side MarketCard (deprecated)

Up to April 28, 2026 we shipped two `MarketCard` components in parallel:

- `components/MarketCard.tsx` — public surface (landing, `/markets`).
- `app/(predictions)/predictions/components/MarketCard.tsx` — auth surface
  (`/predictions` index, etc.) — **this folder.**

They had drifted apart: different category palettes, different bar colors,
different deadline copy, different sponsor placement, different prop APIs
(`compact`/`publicPredictCta` vs `variant`). Every change to "the card" had
to be made twice and the two halves slowly diverged.

Prompt 4.5 merged them into a single
[`components/MarketCard.tsx`](../../components/MarketCard.tsx). The new
component has a `context: 'public' | 'auth'` prop that gates auth-only
chrome (sparkline, "+ N new" recent-vote badge, "Voted" guest pill) and a
small bag of optional flags (`compact`, `showCover`, `showCategory`,
`showDeadline`, `showVoteCount`, `showLowEngagementBars`,
`showPredictCta`, `variant`).

Behavior decisions baked into the merge (with the source we picked, see
chat for the full comparison table):

| # | Decision | Source |
|---|---|---|
| 1 | Visual identity (top-accent + hover-glow + iconned category pill) | auth (B) |
| 2 | Uniform card height via `min-h-[2.5rem]` on the title | both |
| 3 | All bars `bg-emerald-500/20` | public (A) |
| 4 | Outcome labels via `getOutcomeCardLabel` | auth (B) |
| 5 | Public-only low-engagement gate, override flag | public (A) |
| 6 | Small `Predict →` pill in the footer (suppressible) | auth (B) |
| 7 | "Resolves in N days/months/years" + ES localization | auth (B) |
| 8 | Sponsor badge in the header row | public (A) |
| 9 | Cover image opt-in via `showCover` | auth (B) |
| 10 | `useLocale()` everywhere | auth (B) |
| 11 | `context` + flag bag (replaces `variant` enum and the old flag soup) | new |

The original auth-side file lives next to this README as
`MarketCard.tsx.txt` — the `.txt` extension keeps tsc / Next from picking
it up. Open it in your editor as plain text if you need to consult the
historical layout.

If you're tempted to revive any of the old behavior (e.g. category-tinted
bar fills, the wide footer button, etc.), pass it through the unified
component as a prop instead of forking the file again.
