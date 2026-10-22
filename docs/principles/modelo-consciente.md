# Modelo consciente — conciencia como servicio

> Product principle for every feature, agent prompt and contributor change.
> Source: Manifiesto Crowd Conscious v2 (public sections only).

## El principio

Crowd Conscious is **"conciencia como servicio"** (consciousness as a service):
data, community, collective wisdom and the ability for a good question to travel
far. Our model is **conscious, not economic**.

- Value moves in **three currencies** — ecological, social and economic — and we
  move between them according to context. Money is one currency, never the one
  that decides.
- We **don't over-consume** (resources, attention or data) and we **don't
  over-simplify** (complex topics carry nuance and a certainty level, not
  headlines).
- We **study, research and ask before acting**: Estudiamos → Preguntamos →
  Actuamos. Anything simulated is labeled as simulated.

## Filtro de tres preguntas

Every new feature (or significant change) must answer **yes** to all three:

1. **Does it record a real action?** Something a person actually did, not
   activity for its own sake.
2. **Does it keep the right currency without collapsing everything into one
   number?** Ecological, social and economic value stay distinct.
3. **Does it study / ask before acting?** It informs people and gathers their
   voice (with certainty) before turning that into action.

If any answer is "no", redesign before building.

## Reglas

### Do

- Record every currency as **evidence of action**: what happened, which
  currency it belongs to, and where it can be verified.
- Keep **civic reputation private** to the user. It comes from what they do and
  belongs to them.
- Once a Pulse commissioned by a company is **launched, publish its results
  unedited**.
- Label private client work (simulations, internal analysis) as **private**.
- Apply the **20% to Fondo Consciente** to platform revenue only — including
  services for organizations (B2B) on the Crowd Conscious platform.

### Don't

- Don't model currencies as **points** to accumulate.
- Don't add **new XP or point totals**.
- Don't add **leaderboards** or rankings of people. Nobody votes to win.
- Don't give **any client, sponsor or institution early results** from a public
  Pulse. What is asked of the city is published for the city.
- Don't present private client work as **citizen voice**.
- Don't apply the 20% to **B2G** projects or to **external products living on a
  client's own domain**; those follow their own contract.
- Don't target people. Point at conditions and institutions, never individuals;
  don't take political sides.

## Divergencias conocidas

The existing XP / tier / leaderboard code **predates this principle**. Retiring
it is a **product decision pending Francisco**; until then, don't extend it and
don't build new features on top of it. This doc changes no code.

Files found (`rg -il 'leaderboard|xp'` over `app/ components/ lib/ hooks/`,
filtered to leaderboard/XP/tier/gamification modules; supporting SQL in
`supabase/migrations/` also exists):

- `app/(app)/leaderboard/LeaderboardClient.tsx`
- `app/(app)/leaderboard/page.tsx`
- `app/(predictions)/predictions/leaderboard/LeaderboardClient.tsx`
- `app/(predictions)/predictions/leaderboard/page.tsx`
- `app/api/gamification/leaderboard/route.ts`
- `app/api/gamification/retroactive-achievements/route.ts`
- `app/api/gamification/retroactive-xp/route.ts`
- `app/api/gamification/xp/route.ts`
- `app/api/predictions/leaderboard/route.ts`
- `app/api/users/unified-xp/route.ts`
- `components/GamificationSystem.tsx`
- `components/gamification/CelebrationModal.tsx`
- `components/gamification/TierDisplay.tsx`
- `components/gamification/TierPerksDisplay.tsx`
- `components/gamification/TierProgressionCard.tsx`
- `components/gamification/TierThemeProvider.tsx`
- `components/gamification/TierTimeline.tsx`
- `components/gamification/TierUnlockPreview.tsx`
- `components/gamification/XPBadge.tsx`
- `components/gamification/XPProgressBar.tsx`
- `components/gamification/XPWaysToEarn.tsx`
- `components/live/LiveLeaderboard.tsx`
- `hooks/useLiveLeaderboard.ts`
- `hooks/useUserTier.ts`
- `lib/expo-push.ts`
- `lib/leaderboard-exclusions.ts`
- `lib/live-event-leaderboard-server.ts`
- `lib/perks/xp-spend.ts`
- `lib/tier-config.ts`
- `lib/xp-system.ts`

## Cómo aplicarlo

- Before opening a PR, run the three-question filter and mention it in the PR
  description for any user-facing feature.
- Agent prompts (`lib/agents/`) and copy must follow the rules above.
- When in doubt, ask before building.
