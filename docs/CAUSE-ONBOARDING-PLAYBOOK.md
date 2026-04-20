# Cause onboarding — standard sequence

> **Scope:** the 14-day sequence that turns a verified `fund_causes` row into
> a reshare-active partner. Not code. Rev this doc after every cycle.
>
> Owners: founder (outreach) + admin (kit generation).

---

## Week 1 — Outreach (founder task)

### Cíclica (priority — they already follow @crowdconscious)

- **Mon:** DM on IG acknowledging their Earth Day (Apr 22) activation.

  > "Hola! Soy Fran de Crowd Conscious. Los sigo desde hace rato — su
  > activación de Día de la Tierra está increíble. Estamos seleccionando
  > las primeras causas verificadas de nuestro Fondo Consciente y Cíclica
  > encaja perfecto con el enfoque. ¿Tienes 15 min esta semana para que te
  > explique? (Gratis para la organización, ustedes reciben un reshare kit
  > listo para publicar.)"

- **Tue:** If no reply, email via the website contact form with same
  framing + link to `/fund/causes/ciclica` preview URL.
- **Wed–Fri:** If meeting happens, do the kit handoff live on screen share.
  Walk through `/fund/causes/ciclica/kit?token=kit-ciclica` together so
  they download the OG card with you on the call.

### Aquí Nadie Se Rinde (cold, harder warm-up)

- **Mon:** Email via site contact form. Frame around the
  `#ActitudNoMeRindo` narrative.

  > "Estamos lanzando el Fondo Consciente para el Mundial 2026 y queremos
  > que la primera causa de salud sea pediátrica. Su modelo es
  > exactamente lo que votaría nuestra comunidad."

  Attach OG card preview
  (`https://crowdconscious.app/api/og/cause/aqui-nadie-se-rinde`).

- **Thu:** Follow-up if no reply. Now suggest a specific ask amount —
  "este ciclo puede mover entre X y Y pesos a la causa más votada" —
  anchored on current `conscious_fund.current_balance`.

---

## Week 2 — Reshare kit activation

Once verified and the kit is sent:

- Track the `?ref=<token>` traffic daily for 7 days (via Vercel Web
  Analytics URL filter + `share_events.source_type='cause'` spikes in
  the Intelligence Hub reshare flywheel tile).
- If either org reshares AND votes spike, publish a blog post:
  **"Cómo [org] llegó al Fondo Consciente"** — becomes case study #3
  (use the `case_study_draft` agent, see Step 3.1).

---

## What to measure per cause

| Metric                | Source                                                                                  | Pass bar                                |
| --------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| Reshare velocity      | Did they post within 7 days of receiving the kit URL?                                   | ≤7 days = healthy                       |
| Traffic attribution   | How many visits to `/fund/causes/[slug]?ref=<kit-token>`? (Vercel Analytics URL filter) | ≥50 unique visits in week 2             |
| Reshare flywheel tile | `share_events.source_type='cause'` count last 30d in /predictions/intelligence          | Up-and-to-the-right WoW                 |
| Fund outcome          | Did they win this cycle? (`conscious_fund_transactions` with their `cause_id`)          | Winning is bonus; mattering is the bar  |
| Cycle vote share      | Their % of total `fund_votes` for the cycle                                             | ≥15% = strong enough to matter to them  |

---

## Decision rule at day 14

If a cause doesn't reshare within 14 days of receiving their kit:

1. Move to the next nominated cause from `conscious_inbox` filtered to
   `type='cause_suggestion_municipal'`.
2. Keep the original cause `verified=true, active=true`. They may
   reactivate later and a cold cause page is still better than a 404.
3. Do **not** beg for reshares. Partners worth having are the ones who
   reshare unprompted after the first handoff.

---

## Handoff script (for the kit call)

Use when screen-sharing the kit page with a partner:

> "Tres cosas aquí. Uno: esta imagen (señalar OG card) se descarga en
> `Descargar imagen` — la usas para Stories o feed. Dos: abajo tienes
> cinco textos ya escritos, uno por canal — solo copiar y pegar. Tres:
> el link directo con el QR. Si lo ponen en bio o en una Story, podemos
> medir cuántos votos vinieron de ustedes.
>
> ¿Hay algo que ajusten en los textos? Cambiémoslo juntos ahora."

Offer to edit the copy blocks live if they want — but do NOT let the
call end without at least one block copied to their phone.

---

## Template emails / DMs

### "Thanks for signing off" (after verify)

Spanish:

> Hola [nombre], ¡gracias por la llamada! Ya dejé lista la página de
> [org] en el Fondo Consciente. Este es su kit para compartir:
>
> `https://crowdconscious.app/fund/causes/[slug]/kit?token=kit-[slug]`
>
> Todo el texto y la imagen están pensados para que solo tengan que
> copiar y pegar. Si algo no les cuadra, díganme — lo ajusto.
>
> — Fran

### "Day 7 nudge"

> Hola [nombre], ¿cómo van? Vi que aún no han compartido el kit — no
> presión. Si hay algo que esté frenando (foto, texto, permisos), me
> avisan y lo destrabamos. Si prefieren que escriba un borrador en su
> voz exacta, también me dicen.
>
> — Fran

---

## Revision history

- **2026-04-19** — initial playbook (paired with cause overhaul in
  Prompt 2 corrections: real seed data for Aquí Nadie Se Rinde + Cíclica,
  Part 6 reshare kit + OG card, share_events.source_type).
