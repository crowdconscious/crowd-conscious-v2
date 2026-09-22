# Crowd Conscious — UX overhaul v1 (prompting spec)

**Source:** UX Product Spec v1 (2026-09-20). **Canonical file:** this path in the web repo. A copy lives at `docs/UX-OVERHAUL-v1.md` in `crowd-conscious-mobile`. Keep them identical.
**How to prompt:** `@docs/UX-OVERHAUL-v1.md` plus `@CC_BUILD_CONTEXT.md` (web) or `@CLAUDE.md` (mobile). Name the phase. Build that phase only.
**Job of this doc:** comprehension and completed actions, not feature count. If a nice idea fights a principle below, the principle wins.

Web and mobile are **not** the same product surface.

| Surface | Job |
|---|---|
| **Mobile** | Action loop. First session, feed, vote, report, memory, later reputation. |
| **Web** | Public record, SEO, institutions, sponsors, and the page a WhatsApp link opens. |

---

## 0. Hard rules (never violate)

1. **Verbs, not nouns.** First screen offers Votar, Reportar, Evaluar, Decidir. Pulse, Señal, Lugar, Fondo are taught **after** the first successful action, as the name of what the user just did.
2. **Every action closes.** If an institution may not answer, the silence is a published result. Never a progress bar that can only succeed if a third party we do not control responds.
3. **Insight is the reward.** No points, streaks, or badges as the payoff for voting. The payoff is a non-obvious fact about the community.
4. **Density honesty.** Never a local header over city-wide content. Never `0 votos`, `$0`, or `0 respaldos` next to a promise. Degrade silently.
5. **The data is sacred.** No mechanic may push a user toward an option or a confidence number. Opinion-vote volume, option chosen, and stated confidence never earn reputation. A vote cast to earn something is worse than no vote.
6. **Memory over novelty.** The reason to reopen the app is “something you touched moved,” not “you have been gone 7 days.”
7. **Do not regress shipped contracts.** Ranked votes (max 3, rank-1 confidence only), Other free-text, confidence-weighted resolution, simulation anti-anchoring, Señal Express anonymous PDF, and `lib/display/participation.ts` stay. This overhaul is presentation and routing on top of them.

**Icon rule.** The PDF draws cards with emoji. Shipped UI uses `lucide-react-native` (mobile) and the existing web icon set. Implement the card *types* with icons, not emoji, unless the owner explicitly asks for emoji.

---

## 1. North star

> I opened Crowd Conscious because something in my city mattered. I did something about it in under a minute. Later, the app showed me what happened because people like me participated.

**Old model:** learn the features → understand the method → participate → maybe see value.
**New model:** something near me → one small action → immediate insight → visible collective progress → real outcome (including silence) → only then, the product name and the method.

### Success metrics (CEO Digest, weekly)

| Metric | Definition | Target |
|---|---|---|
| First-action rate | % of new sessions with a completed vote, co-sign, report, or cause vote | ≥ 60% |
| Time to first action | Median seconds from open to first completed action | < 45s |
| Second-action rate | % of first-action users with a second action in the same session | ≥ 40% |
| Day-7 return | % of first-action users who open again within 7 days | ≥ 25% |
| Resolution-notification CTR | % who open a “something you supported moved” push | ≥ 35% |
| Share rate | % of completed votes that generate a shared card | ≥ 8% |

Non-goal: raw vote volume bought with rewards. That damages the Divergence Index and the thing brands pay for.

---

## 2. Already built — do not rebuild

| Spec asks for | Already in the repos |
|---|---|
| Confidence-weighted shares | `lib/pulse-vote-aggregates.ts`; resolution is SUM(confidence) (migration 251). Results UI uses confidence-weighted probability. |
| Hide thin counts | `PARTICIPATION_REVEAL_THRESHOLD = 25` → “Votación abierta”. Fund copy uses countdown / “ciclo en curso”, not `$0`. **Keep 25.** Do not introduce a second threshold of 15. |
| Anonymous vote | `execute_anonymous_market_vote`. Account is not required to vote. |
| Señal Express | Web `/queja` + `/api/senal-express/*`. Mobile `signals/express`. Kill switch `SENAL_EXPRESS_ENABLED`. Anonymous = PDF; logged-in can publish. Photo upload is JPEG (iPhone HEIC is transcoded). |
| Share cards | Existing renderer (web + mobile). Reuse. Do not build a second one. |
| Pulse results archive | Web `/pulse/results`. Mobile Pulses → Resultados. IA vs. Realidad only from `revealed_simulation_runs`, only after close. |
| Admin sim while live | Admins see aggregates/divergence on open Pulses. Public does not. |
| Podcast | Web `/podcast` in primary nav. Mobile drawer + Blog rail, OTA. Ep.1 Spotify + YouTube deep links. |
| i18n | Spanish primary, English mirror. New strings in both locale files or it is a bug. |
| Empty-state helpers | `lib/display/participation.ts` (web), `src/lib/display.ts` (mobile). Route every new count through them. |

---

## 3. What changes (the actual product)

### 3.1 Feed replaces the Pulse list as home

One scrollable stack of actionable cards. Pulses, Señales, Lugares, Fondo leave the *first* screen. Routes stay; they become secondary.

**Header.** One line, no hero, no fund banner above the fold.

- Default: `Hoy en tu ciudad · Ciudad de México · {n} cosas que puedes hacer`
- Only if location is granted **and** that alcaldía has ≥ 3 live items the user has not already acted on: `Cerca de ti · {alcaldía}`
- Otherwise stay city-wide. Never a local header over city content.

**Card anatomy.** Icon + one human sentence + one social-proof line + one verb. No category label. No product name on the card.

| Type | Source | Verb | Proof line rule |
|---|---|---|---|
| A Opinión | Open Pulse | Votar | Count only if ≥ 25; else “Sé el primero en opinar” + “unos 30 segundos” |
| B Respaldo | Open señal | Respaldar | Neighbour count + what the next threshold does. Never “0 respaldos” |
| C Evaluación | Location awaiting score | Evaluarlo | Count only above the display threshold |
| D Decisión | Active fund cycle | Decidir | Real amount or “ciclo en curso”. Never `$0` |
| E Resultado | Something the user touched that moved | Ver | **Phase 2.** Do not fake in Phase 1 |
| F Reportar | Always available | Reportar | Pinned at position 3 for new users; position 1 after they have reported once |

**Ranking — Phase 1.** Hand-curated weekly order. The score in the PDF (finishability 0.35, visible movement 0.25, personal 0.20, proximity 0.15, recency 0.05) is the **Phase 3** target, not this build.

**Hard layout rules (even when hand-curated).**

- No two consecutive cards of the same type.
- A real type-E card, when one exists, is position 1.
- Max 12 cards. End with a closing card, not infinite scroll.
- A card the user already acted on leaves the stack for that cycle.
- Backfill when local items run out: same alcaldía → adjacent → CDMX → thematic → evergreen open Pulses. Label evergreen as a question, not as “archive.”

**Absolute empty state** (fewer than 3 cards after backfill). Not an empty illustration. Full screen:

> Tu colonia está tranquila hoy. Eso también es información. Si ves algo que debería cambiar, repórtalo — tu vecino lo verá.

Buttons: Reportar algo · Ver qué pasa en la ciudad.

### 3.2 First run — two screens, then an action

Delete the intro that explains Pulses, Señales, and the Fund.

1. One sentence, no product names: “Crowd Conscious convierte lo que la gente piensa, ve y le importa en evidencia con la que las instituciones pueden actuar.”
2. Fork: Opinar (~30s) · Reportar (~60s) · Ver qué está pasando cerca de mí. Each drops into that action or the Feed. Not into a category index.

Rules:

- No account for the first **vote**. Prompt after the action, framed as memory: “Crea tu cuenta para que podamos avisarte cuando algo que respaldaste se mueva.”
- Location permission at the moment it helps (opening Feed or starting a report), with the reason in the ask. Denial → city-wide feed, never labelled as a downgrade.
- Notification permission after the first vote or co-sign: “¿Te avisamos cuando esto avance?” Never on cold launch.
- One dismissible line after the action: “Acabas de participar en un Pulse” / “Esto es una Señal.” Never blocking.

### 3.3 Vote flow and reveal

Presentation only. Math stays in `lib/pulse-vote-aggregates.ts`.

1. **Choose.** Question + large option cards. “¿Por qué esta pregunta?” is a link, not a preamble. Ranked mode and Other stay as they are when the Pulse was created that way; default Pulses stay single-select.
2. **Certainty.** Slider with anchors “No estoy seguro” → “Totalmente seguro”. The integer stays visible (it is the data). **Do not default an untouched slider to 5.** An untouched slider is not a vote. Offer an explicit “No lo sé” that records the option but **excludes** that vote from the confidence average. Imputing 5 would fake certainty and break principle 5.
3. **Why.** Optional one line. Skip in one tap.

**Reveal** (full screen, immediately, no interstitial) when vote count ≥ 25:

- Generated headline, not a fixed slogan. Three cases only:
  - Leader has lower confidence than a trailer → “{X} gana, pero quienes eligieron {Y} están más seguros.”
  - User with the majority and that side’s confidence is high → “No estás solo, y tu grupo está muy seguro.”
  - User in a minority that holds the highest confidence → “Estás en minoría — pero es la minoría más convencida.”
- Bars: share + average certainty per option. Same numbers as the Results card (confidence-weighted).
- Closing line: “Tu voto acaba de mejorar la lectura de tu comunidad.”

**Below 25 votes:** no contrast. Copy: “Eres de los primeros en opinar. Te avisamos cuando haya suficientes votos para ver cómo se compara tu certeza.” Button: Avísame (this is the notification opt-in). Do not show a fake distribution.

**Por qué votaron distinto.** Up to three real one-line reasons from people who chose a different option. Show alcaldía + certainty, never a name. Reuse existing moderation; if fewer than three clean reasons, hide the block. This is public text — only reasons the author submitted as public.

**Share card.** Once, after the reveal, never a nag. Question + two-line confidence contrast + mark + deep link. Reuse the existing share-card renderer.

**Simulation.** The reveal above is **real votes**. IA vs. Realidad stays amber, post-close, `revealed_simulation_runs` only. Do not put sim shares in this post-vote reveal.

### 3.4 Reportar (Señal Express, verb first)

Entry: card F and a persistent report affordance. Do not add a sixth tab. Camera can live as the report card plus the existing Señales entry.

Flow: photo (skippable, gallery allowed) → place as an editable line, not a map puzzle, with “Mostrar solo la colonia” → one sentence → editable confirmation of inferred type, place, likely authority, evidence. Every inference is labelled probable.

**Mandatory copy** on confirm and on every señal detail:

> Tu señal está viva.
> 50 respaldos → la institución recibe la solicitud formal y un enlace para responder públicamente.
> 200 respaldos → prioridad pública.
> Si no responde, su silencio queda en el registro público.

Then share (WhatsApp-first, prewritten message + deep link). Then: “Acabas de crear una Señal.”

Guardrails stay visible and short: not a criminal complaint, not defamation, not 911, conditions and institutions, never named individuals. Alias publishing stays.

**Do not regress Express.** Anonymous users still get the PDF. Publishing the public señal can require an account (moderation and legal weight). That split is the recommendation in §7.

### 3.5 Impact Home and pushes (Phase 2)

Second primary area, **Tu impacto**, hidden until the user has completed at least two actions. An empty impact screen is worse than none.

Contents: counts that pass the display threshold, plus “Algo que ayudaste a mover” cards for responses, Pulse closes (including “highest conviction did not win”), and **30-day silence** after a threshold.

Pushes are event-driven, max one resolution push per user per day. Kill “you have been inactive” email/push. If the user has a push token, do not also send re-engagement email.

| Trigger | Who | Intent |
|---|---|---|
| Señal crosses 50 | author + co-signers | Institution now has the formal request |
| Señal crosses 200 | author + co-signers | Public priority |
| Official response | author + co-signers | They answered |
| 30 days, no response, past threshold | author + co-signers | Silence is on the public record |
| Pulse closes | voters | Your certainty vs the result |
| Location certified | evaluators | A place you scored was certified |

**Ledger.** Do not invent a second source of truth. Votes, co-signs, evaluations, and cause votes are already rows. Phase 2 adds a **resolution hook** (and a thin per-user action view or table only if the hook cannot query existing rows). Columns if a table is required: user or device id, object type, object id, action, timestamp. RLS on, no public policies, service role for the hook.

### 3.6 Civic reputation (Phase 3) — replaces “vote accurately” XP

Remove every string that says users level up by voting accurately. On a priorities question there is no correct answer.

**Never award reputation for:** how many opinion-votes, which option, or what confidence.

**May award reputation for:** a co-sign on a señal that reaches a stage; a published señal that others co-sign; evaluating a location; a neighbour who then participates; sustained presence over time.

Forecast markets with a real outcome may score accuracy **separately**, different words, different screen. Not mixed into civic reputation.

Profile is per alcaldía and per domain from day one (Agua, espacio público, residuos, desarrollo urbano) so a later “voz verificada” layer is possible. **Launch private** (own profile only). No public leaderboard. `LEADERBOARD_ENABLED` stays false.

Perks (after reputation exists): redemption at Conscious Locations the community certified — not an XP shop. Participar → reputación → impacto → acceso. Do not ship perks in the same session as the Feed.

### 3.7 Web-only rules

**Shared link opens the object.** A señal URL shows that señal with Respaldar in the first screen, anonymous. A Pulse URL shows the question with options tappable immediately, then the same reveal as mobile. Sponsor/fund/brand blocks stay **below** the action. App install prompt only after the action: “Instala la app para que te avisemos cuando esto se mueva.”

Anonymous marketing homepage stays, but **one live action card** replaces the fund banner above the fold.

Web does **not** copy Impact Home, reputation, or perks in phase 1.

Web **does** keep: public record (señal, response, 30-day silence), `/pulse/results`, methodology, Para marcas, Para creadores, blog, podcast.

---

## 4. Instrumentation (ship with the Feed, not after)

Snake_case, feature-prefixed, both surfaces. Every event: `surface` (`app`|`web`), `anon_id` or `user_id`, `session_id`, timestamp.

| Event | Properties | Question |
|---|---|---|
| `feed_viewed` | `card_types[]`, `card_count`, `header_scope` | Is the feed thin? |
| `card_impression` | `card_type`, `position`, `object_id` | Which types get seen |
| `card_tapped` | `card_type`, `position` | Which verbs convert |
| `action_completed` | `action_type`, `seconds_since_open` | First-action rate and time |
| `action_abandoned` | `action_type`, `step` | Where the flow dies |
| `reveal_shown` | `headline_case`, `vote_n` | How often the low-n guard fires |
| `reveal_share_tapped` | `object_id` | Share rate |
| `reasons_block_shown` | `reason_count` | Is moderation hiding the block? |
| `permission_prompted` / `permission_granted` | `type`, `trigger_point` | Did timing help? |
| `resolution_push_sent` / `resolution_push_opened` | `trigger`, `days_since_action` | Phase 2 |
| `signal_stage_changed` | `stage`, `days_to_stage`, `alcaldia` | Institutional speed |
| `signal_no_response_30d` | `recipient`, `alcaldia` | Public silence registry |

Weekly CEO Digest appends (do not build a new dashboard):

1. Funnel: open → feed → tap → action → second action → day-7, split by first card type.
2. Institutional responsiveness by alcaldía: median days to a response, and non-response count.

---

## 5. Build order

Each phase ships alone. Earliest work is copy and routing.

### Phase 0 — copy and rules (no new screens)

- [ ] Verb labels on both surfaces where the user chooses an action. Product names move to the one-line post-action label.
- [ ] Replace the feature-explaining first-run with the two-screen fork (mobile `app/(onboarding)`).
- [ ] Dual-outcome threshold copy on señal detail and Express confirm (web + mobile).
- [ ] Delete “voting accurately / level up” XP strings. Do not delete the perks data model; stop promising accuracy.
- [ ] Grep-ban `0 votos` and `$0 repartido` through `participation.ts` / `display.ts`, including any new card.
- [ ] Señales creation wizard: Spanish primary (verify; the PDF flags English). iOS **App Store listing** language is store metadata, not an OTA — track separately.
- [ ] **Pulled forward from the PDF’s Phase 3:** shared Pulse and señal URLs open on the object with the verb above sponsor/fund chrome.

### Phase 1 — Feed + reveal

- [ ] Mobile home is the Feed (card types A–D and F). Type E waits for Phase 2.
- [ ] Web: one live action card above the fold for anonymous visitors. Logged-in web home may use the same Feed component later in this phase if the data loader is shared; do not block mobile on it.
- [ ] Secondary entry to existing Pulses / Señales / Lugares / Fondo / Blog. Do not delete routes. Do not add a sixth tab.
- [ ] Post-vote reveal + low-n guard (n = 25) + reasons block + one share prompt.
- [ ] Events in §4 that exist by the end of Phase 1 (`feed_*`, `card_*`, `action_*`, `reveal_*`, `reasons_block_shown`, `permission_*`).
- [ ] Density rules in §3.1, including the absolute empty state.

### Phase 2 — memory

- [x] Resolution hook on señal stage, official response, Pulse close, location certification, and 30-day silence.
- [x] Tu impacto / thin Tu actividad (web: `/predictions/actividad`; full mobile Impact Home is mobile Phase 2).
- [x] Resolution pushes with the suppression rules.
- [x] Remove inactivity re-engagement. Suppress email when a push token exists.

### Phase 3 — reputation, perks, ranking

- [x] Civic reputation, private, domain + alcaldía, under §3.6. (web: `/predictions/reputacion`, migration `261_civic_reputation.sql`, flag `CIVIC_REPUTATION_ENABLED`)
- [ ] Perks as redemption at certified locations. (data model exists; full UX deferred)
- [ ] Scored ranking only after Phase 1 events show which card types convert. Until then, hand-curated order.

---

## 6. Improvements on the PDF (decisions baked in)

These override the PDF where they conflict. An agent should follow this section.

1. **Shared-link landing is Phase 0, not Phase 3.** WhatsApp is how neighbours arrive. A sponsor homepage on a leak link is the most expensive comprehension bug, and it is layout, not new infrastructure.
2. **One participation threshold: 25**, already in `PARTICIPATION_REVEAL_THRESHOLD`. The PDF’s 15 would show noise as insight and fork the number the rest of the product uses. Below 25, show the “first voices / we’ll notify you” reveal, not bars.
3. **Do not impute confidence.** Centre-of-slider defaults poison the average. Untouched is not a vote. “No lo sé” stores the option and drops out of the confidence mean.
4. **Do not build a second action ledger** if a SQL view over `market_votes`, co-signs, evaluations, and fund votes can feed the hook. Add a table only for “notify these people when this object moves.”
5. **Icons, not emoji**, unless the owner asks. Same card types.
6. **Anonymous Express PDF stays.** Public señal creation can require an account. Unlimited anonymous **votes**. Do not gate the first vote.
7. **Reputation launches private.** A leaderboard recreates the accuracy-gaming problem under a new name.
8. **Thresholds stay 50 and 200** until a colonia has enough registered users to scale. Dynamic thresholds are a later product. The silence sentence matters more than a lower number.
9. **Feed replaces the mobile home after dogfood, not a long-lived cohort flag.** Confusion is the baseline. Ship behind `FEED_HOME_ENABLED` defaulting **on in production only after** the owner has clicked through Phase 1 on a device. Until that explicit on, default **off** so a half-built feed never becomes the App Store home by accident.
10. **Real reveal and sim reveal stay separate.** Post-vote insight uses real aggregates only. Amber IA module stays post-close.
11. **Ranked and Other Pulses** use the same reveal math as today (rank-1 / primary confidence). Do not flatten them back to a single tap if `vote_mode = ranked` or `allow_other`.
12. **Perks strategy docs that still say XP** (`docs/CONSCIOUS-PERKS-STRATEGY-2026-06-10.md`) are historical. This file wins on rewards. Do not reintroduce XP-for-voting while executing this spec.

---

## 7. Owner decisions (recommended; change only if you say so)

| # | PDF question | Recommendation |
|---|---|---|
| 1 | Feed replaces home, or a cohort flag? | Replace mobile home outright once you have tapped through Phase 1. Flag defaults off until you say “turn the feed on.” |
| 2 | Minimum n for the confidence reveal? | **25**, same as `PARTICIPATION_REVEAL_THRESHOLD`. |
| 3 | Señal thresholds 50 / 200 vs scaled? | Keep 50 and 200. Ship the silence sentence now. |
| 4 | Reputation public or private? | **Private.** No leaderboard. |
| 5 | When is an account required? | Unlimited anonymous votes. Public señal publish requires an account. Express PDF stays anonymous. |

---

## 8. Repo map for agents

**Web** (`crowd-conscious-v2`): `app/components/landing/LandingNav.tsx`, `app/pulse/[id]`, `components/pulse/*`, `lib/display/participation.ts`, `lib/pulse-vote-aggregates.ts`, `app/api/senal-express/*`, `app/(public)/queja`, señal public pages, `lib/agents` CEO digest append, `types/database.ts` surgical inject only.

**Mobile** (`crowd-conscious-mobile`): `app/(onboarding)`, `app/(drawer)/(tabs)/` (do not add a sixth tab), `signals/express`, `src/lib/display.ts`, `src/lib/i18n/{es,en}.ts`, pulse vote UI, share helper. OTA-safe: no new native module. `runtimeVersion` is `appVersion` (1.1.1).

**Both:** es + en strings. No `any`. Do not write sim results into `prediction_markets` or real vote tables. Public sim reads `revealed_simulation_runs` only.

---

## 9. Session prompt (copy this)

```
@docs/UX-OVERHAUL-v1.md
Build Phase {0|1|2|3} only, on {web|mobile|both}.
Follow §0 and §6. Do not start the next phase.
Acceptance: the checkboxes for that phase in §5.
tsc --noEmit clean. New UI strings in es and en.
Do not commit or OTA unless I ask.
```

## 10. Definition of done (every phase)

1. `tsc --noEmit` clean in each repo you touched.
2. No new `0 votos` / `$0` / accuracy-XP string. Grep to prove it.
3. A first-time user can name the verb on the first screen without reading a product glossary.
4. A shared link’s first screen is the object and its verb.
5. Below 25 votes, the confidence contrast is absent.
6. Nothing in the phase awards reputation for an opinion.
