# Organizaciones client dashboard + full report: Phase 1 plan

_Last updated: 13 Oct 2026. Branch `feat/org-report-v2`. Sample PDF: `/workspace/client-dash/sample-report.pdf` (ES, 12 pp.) and `sample-report-en.pdf`. Page PNGs are in `sample-png/` and the reference renders are in `ref/`._

## 1. Audit: what exists today (main @ post-#54)

| Piece | State | Notes |
|---|---|---|
| `/org/[slug]` layout (`app/org/layout.tsx`) | Built, **flag-gated** | `notFound()` unless `NEXT_PUBLIC_ORG_PORTAL_V2=true`. `OrgShell` has a "Mis lecturas" slot. No `/org/[slug]` index page; only `lecturas/[id]`. |
| `NEXT_PUBLIC_ORG_PORTAL_V2` (`lib/org/config.ts`) | Default false | Gates the client dashboard, the share-link resumen and the header slot. The public sales pages (`/organizaciones`, demo, contratar) do not depend on it. |
| `/org/[slug]/lecturas/[id]` | Built, demo only | `getOrgView()` (`lib/org/data.ts`) returns **only** `hospital-ejemplo`. Every real slug gives a 404. `ReadingDashboard` (489 lines) has a reading switcher, status (design/field/closed), field lock ("results open at close"), split bars, trends, redacted reasons, a methodology panel, Resumen and PDF buttons. Visibility is **display only** ("decidida… no puede cambiar"). |
| `/org/[slug]/lecturas/[id]/resumen` | Built | Uses an HMAC share token (`lib/org/share-token.ts`, `ORG_SHARE_SECRET` ≥32 chars, 14-day TTL). Without the secret, the demo falls back to `/organizaciones/demo/resumen`. |
| PDF generator `lib/org/reading-pdf.ts` | Built (1–2 pp.) | jsPDF. Has the headline, weakest-first split bars, three numbers and a methodology line. It is served only for the demo at `/api/organizaciones/demo/pdf` (public sample). There is **no real-client PDF route**. |
| `lib/org/firmness.ts` | Solid, tested | `FIRM_THRESHOLD=8`, `MIN_GROUP=10`, `MIN_RESPONSES_FOR_HEADLINE=30`, largest-remainder %, `pctFirmOfYes`, `yesCertainty`, `orderByFirmYes`, `computeHeadline`. |
| `lib/org/redact.ts` | Solid | Removes emails, CURP/RFC, phones, long numbers, titles+names, "me llamo…" and a medical keyword list. `reasonGroup()` hides groups under MIN_GROUP. It only reaches clients through `toClientReading()`, which also strips results from readings that are not closed. |
| `lib/org/headline-copy.ts` | Solid | «De su X% que…, Y% lo dijo con firmeza.» plus «Donde más dudan…». |
| Auth for org clients | **None** | No org/membership tables and no org role. The `/org` routes are not tied to Supabase auth. |
| Reading storage | **None** | Readings live only in `lib/org/demo-data.ts`. There are no tables for orgs, readings, questions, invitations or responses, and no respondent survey flow for org readings. |
| Paying client → account | **None (manual)** | `/organizaciones/contratar` (call / proposal / pilot) writes `org_pilot_requests`. The Stripe webhook `handlers/org-pilot.ts` marks it paid and sends the receipt and admin emails. **No org or user is created.** The proposal and call paths end at an admin email. Note: the `org_pilot_requests` migration is not in `supabase/migrations/` (applied out of band). Repo/DB drift. |
| CSV export | None | |
| Sello | Copy and pricing only | `lib/organizaciones/pricing.ts` (+$10k MXN/mes). No status, progress or criteria model. |

## 2. Dashboard (target)

Route `/org/[slug]` (index) + `/org/[slug]/lecturas/[id]`, behind the flag until auth lands.

- **Lecturas list** (index): cards per reading with title, period, product, status chip (En diseño / En campo · N respuestas · cierra en D días / Cerrada), visibility and response rate. For readings in field, show **only counts and rate** (rule 5, already enforced by `toClientReading`).
- **Results**: reuse `ReadingDashboard` with the headline, weakest-first split bars, trend vs the previous identical wording and redacted reasons gated by MIN_GROUP.
- **Controls**:
  - *Visibility public/private*: editable **only in `design`**. Locked with a timestamp (`visibility_locked_at`) when field opens, and read-only afterwards (matches the current copy and methodology).
  - *Close / extend*: the owner can request **extend** (once, max +7 days, before `field_closes`) or **close early**. Close early is only possible if responses ≥ 30; otherwise it warns "quedará como lectura preliminar". Both are logged in an audit table and shown in the methodology.
  - *Invite colleagues*: an owner invites by email (magic link) with role `owner | viewer`. Viewers can see and download but have no controls. Cap of 10 seats.
- **Downloads** (closed readings only):
  - *Reporte completo PDF* (new `lib/org/report-pdf.ts`, see §3), ES/EN.
  - *Resumen para dirección* share link (exists).
  - *CSV, no personal data*: one row per question × certainty (1–10) × answer (sí/no) with counts, plus a summary sheet (responses, % sí, % firmes de los «sí», certeza de los «sí», split). **No row-level responses, no reasons, no IDs, no timestamps.** Reasons are left out of the CSV. An optional redacted, MIN_GROUP-gated reasons file is a decision (D6).
- **Sello status & progress** (Escucha continua + Sello only): a card with status (no contratado / en evaluación / otorgado / suspendido) and progress against criteria, e.g. N consecutive closed readings, minimum responses each, and public visibility. The criteria are **not defined yet** (D4). Until they are, show only "en evaluación" with the count of qualifying readings.

## 3. Full report template (built: `lib/org/report-pdf.ts`)

It mirrors the depth of the reference report (cover → letter → at a glance + insight boxes → per-question deep dive → in their own words → things to discuss → methodology → about), adapted to the org rules:

1. **Cover** (dark): eyebrow with org · period, title, "Lo que nos dijeron N personas…", data cut, and "Para el equipo de …". No logos.
2. **Letter** from Francisco: a template built from facts (invited, responded, dates and an honest caveat about non-respondents). An optional `letter` override lets you write a personal one per client.
3. **De un vistazo**: the headline on a consistent base («De su 91% que recomendaría el hospital, 58% lo dijo con firmeza.» + «Donde más dudan…»), 4 tiles (invitados, respondieron, tasa, certeza de los «sí»), all questions weakest-first with split bars and a legend, and **4 computed insight boxes**: where they hesitate most, where they are firmest, the largest firm «no», and trend vs the previous period (or the largest tentative «sí» if there is no comparable prior reading).
4. **Per question, weakest first**: rank eyebrow, 4 numbers (respuestas, % sí, % de los «sí» firmes, certeza de los «sí»), a question-specific headline (or "Lectura preliminar" under 30), a large split bar (firm = #047857 / #c2410c with white text, the highest contrast), a certainty histogram 1–10 for sí/no with firm buckets in strong colours, and "Lo que vemos" (computed sentences, plus a trend only on identical wording, otherwise "la redacción cambió").
5. **Lo que escribieron** per question: two columns, "Por qué dudan (sí tibio)" and "Por qué no". Reasons pass through `redactReason` and `reasonGroup`. Groups under 10 show an anonymity note instead.
6. **Para conversar**: open questions derived from the data, not advice.
7. **Cómo se hizo**: sample, single-use links, field dates, the firm definition, how % are calculated, the 30/10 thresholds, the visibility lock, "nadie editó" and response rate rather than a margin of error. Includes a numbers table.
8. **About**: product line, 20% before IVA to the Fondo Consciente, and **only** the Hecho en México and RAE Leaders in Innovation Fellowship credentials.

Accessibility: small grey text is #4b5563 on white (7.6:1) and #cbd5e1 on #0f1419 (~12:1). The smallest text is 7.5–8 pt. Mobile: the PDF is A4 with a single column per block and large type. It is readable on a phone, but the **mobile-first view is the HTML dashboard and resumen**. Proposal: also add `/org/[slug]/lecturas/[id]/reporte` as a responsive HTML version of the same sections. It would reuse the same computed copy so the two never diverge.

The demo route is `/api/org/hospital-ejemplo/lecturas/hospitalizacion-2026-q4/reporte?lang=es`, behind the flag and limited to the demo slug.

## 4. Gaps and effort (rough, 1 dev)

| # | Gap | Effort |
|---|---|---|
| G1 | DB schema: `orgs`, `org_members(role)`, `org_readings`, `org_questions`, `org_invitations(single-use token hash)`, `org_responses(answer, certainty, reason)`, `org_reading_events` (audit), RLS by membership, service-role writes. Also commit the missing `org_pilot_requests` migration. | 2–3 d |
| G2 | Auth: Supabase magic link + `org_members` check in `/org` layout/routes; seat invites | 2 d |
| G3 | Provisioning: on `org-pilot` paid webhook and on admin "convertir propuesta" → create org + owner invite email | 1–1.5 d |
| G4 | Respondent flow for org readings (single-use link → sí/no + certainty + reason), rate limits, close cron | 3–4 d |
| G5 | Replace `getOrgView` demo source with DB; keep `toClientReading` as the only egress | 1 d |
| G6 | Controls (visibility in design, extend/close with audit), lecturas index page | 1.5 d |
| G7 | Downloads: report PDF for real readings (done for demo), CSV aggregate, per-org route auth | 1 d |
| G8 | HTML responsive report page | 1.5 d |
| G9 | Sello model + card (after D4) | 1–2 d |
| G10 | Admin tools: create reading, upload anonymised base / generate links, close | 2 d |
| G11 | Font: embed a TTF (e.g. Inter) in jsPDF for em dashes/curly quotes; today they are normalised to Latin-1 | 0.5 d |
| | **Total** | **~17–20 dev-days** |

## 5. Open decisions for Francisco

- **D1** Account creation: auto-create the org and send the owner invite on card payment, or always do it manually after the kickoff call? (Proposal: automatic on paid, manual "convertir" for proposals.)
- **D2** Who receives respondent links: does the client send them (we hand over the link CSV), or do we send them (that requires the client's contact list, which conflicts with "sin datos personales")? (Proposal: the client sends them; we only see anonymous IDs.)
- **D3** Extend/close rules: one extension of max 7 days? Allow early close under 30 responses (marked preliminary)?
- **D4** Sello criteria: number of consecutive readings, minimum responses, minimum % firm, must be public? Suspension rules?
- **D5** Personal letter: always written by you per client (manual field), or the template by default?
- **D6** CSV: aggregates only (proposed), or also a redacted reasons file gated by MIN_GROUP?
- **D7** Seats: 10 per org? Viewer vs owner roles enough?
- **D8** Report language: client picks ES/EN at download (proposed), or fixed per org?
- **D9** Raw response retention period and deletion after close (privacy notice alignment).
- **D10** HTML report page in scope for v1, or PDF + dashboard only?
