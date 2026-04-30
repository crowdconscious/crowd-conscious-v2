# Changelog

User-visible release notes for Crowd Conscious. Newest at the top. Internal
refactors and code-only changes don't show up here — see git log for those.

## 2026-04-29 — Pulse rebrand and UX overhaul

We reorganized the front door around **Pulse** — confidence-weighted public
consultations — and tightened every surface that brands and voters touch.

What changed for you:

- **New consumer home for Pulses.** `/pulse` is now the public list of every
  active consultation. The B2B landing moved to `/para-marcas` (old links
  keep working).
- **Cleaner homepage.** New hero copy reflects the Pulse-first positioning;
  the giant "Sign up" button is gone — account creation now lives subtly in
  the nav so the homepage stays focused on voting.
- **Better share previews.** Sharing a Pulse on WhatsApp, Twitter, Facebook,
  or iMessage now shows a card with the question, total votes, and average
  confidence, plus the sponsor logo when present.
- **Sponsor reports got real.** When a Pulse closes, sponsors automatically
  receive an executive summary, conviction analysis, and concrete next
  steps — readable in their private dashboard and downloadable as a PDF.
- **Smarter newsletter.** Each issue now opens with a short LLM-polished
  intro and rotates through fresh subject lines so inboxes stay engaged.
- **CEO digest is actionable.** Mondays now bring a structured dashboard of
  key metrics, this-week action items with deadlines, watch items, and
  ready-to-send sponsor outreach drafts.
- **Content Creator v4.** A new admin tool turns a single topic (or a
  selected market) into a full bilingual content package — blog drafts in
  ES + EN, an Instagram carousel, a reel script, five social posts,
  optional Pulse market proposal, and image prompts — in one click.
- **News Monitor became operational.** Daily output is now grouped into
  *Pulse opportunities*, *blog topic ideas*, and a *skip summary*, each
  linking straight to the v4 generator so ideas turn into content fast.
- **Inbox triage.** Public submissions arrive sorted into *respond today*,
  *park*, or *archive*, with a reason and (where it makes sense) a
  suggested Pulse market title.
- **Mobile nav and footer cleaned up.** Old "Mercados" / "Predicciones"
  entries removed in favor of *Pulse* and *Para marcas*. The language
  toggle (es/en) keeps working everywhere.
- **Old URLs keep redirecting.** `/markets`, `/markets/:id`,
  `/predictions/markets`, `/pulse/welcome`, `/pulse/pilot`, `/communities`
  and friends all 308 to their new homes — `utm_*` and `session_id` query
  parameters are preserved so analytics and Stripe sessions continue to
  work.

Retired: the legacy monthly Sponsor Report agent (replaced by the per-Pulse
sponsor report) and the auto-cron Content Creator (replaced by manual
Content Creator v4). Both are archived under `.deprecated/legacy-agents/`
and can be restored if needed.
