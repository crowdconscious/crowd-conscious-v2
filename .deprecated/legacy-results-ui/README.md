# Legacy results UI (deprecated)

These snippets used to live inside `MarketDetailClient.tsx` and
`PulseResultClient.tsx` and were rendered post-vote alongside the per-option
percentage bars. They were consolidated into a single
`components/pulse/PulseResultsCard.tsx` on April 28, 2026 (Prompt 4) because:

- They duplicated the same per-option signal in three different ways
  (headline + donut + horizontal stacked bar) which fought each other for
  attention without adding new information.
- The "Filas de voto (misma base que la probabilidad)" copy was an internal
  QA note that leaked into production.
- "Probabilidad de la comunidad" implied a precision that the per-vote
  free-to-play model doesn't actually provide. The new card just shows
  "Resultados — N votos · confianza promedio X/10".

The replacement lives at:

- `components/pulse/PulseResultsCard.tsx` — the new card
- `components/pulse/PulseResultClient.tsx` — caller (Pulse share/dashboard)
- `app/(predictions)/predictions/markets/[id]/MarketDetailClient.tsx` —
  caller (market detail page)

Keep these snippets as historical reference only. Do **not** import them.
If you need the old donut/bar layout for a dashboard-only view, build it
fresh from `PulseResultsCard` rather than reviving this code.

The original JSX lives next to this README as `*.snippet.tsx.txt` files —
intentionally `.txt` so the TypeScript compiler / Next bundler never picks
them up. Open them in your editor as plain text if you need to consult the
old layout.
