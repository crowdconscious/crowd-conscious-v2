# State court bulletins — survey summary (Prompt B0)

Survey host: Cursor cloud agent VM. Identifying User-Agent used; one request at a time with ≥1 s pause. Landing pages only; at most incidental sample discovery via search tooling for CDMX. No forms submitted in bulk, no logins, no captchas solved. No sample files with party names committed. `verified_by` / `verified_on` / `counsel_reviewed_on` left empty for a person to fill.

Registry: [`REGISTRY.csv`](./REGISTRY.csv) — 41 source rows, all 32 federal entities represented.

## Counts by proposed_tier

| proposed_tier | Rows | Meaning in this pass |
| --- | ---: | --- |
| A | 6 | CDMX civil/family/labour (one daily PDF model) + Jalisco extract rows |
| B | 16 | Open per-court/date query, no captcha observed on landing |
| C | 0 | None proposed; no counsel/firm account path verified |
| D | 8 | Captcha, Cloudflare/bot wall, or equivalent barrier from this host |
| E | 1 | Oaxaca administrative bulletins only (not daily case lists) |
| not verified | 10 | Page blocked, timed out, empty shell, or sample not obtained |

These tiers are **proposals from observation**, not verified registry approvals. Rule 9b still requires a named person, tier A/B, and recorded terms review before any automatic collection.

## Client matter weights (given)

| State | Matters |
| --- | ---: |
| Estado de México | 33 |
| Guanajuato | 18 |
| Querétaro | 14 |
| Chihuahua | 11 |
| Jalisco | 10 |
| Nuevo León | 9 |
| Coahuila | 6 |
| Quintana Roo | 6 |
| Tabasco | 6 |
| Chiapas | 5 |
| Sonora | 5 |
| Puebla | 5 |
| Tamaulipas | 5 |
| Hidalgo | 3 |
| Morelos | 2 |
| Michoacán | 2 |
| Yucatán | 2 |
| Durango | 2 |
| Baja California | 1 |
| Baja California Sur | 1 |
| Guerrero | 1 |
| Aguascalientes | 1 |
| Oaxaca | 1 |
| Ciudad de México | tracked via current paid bulletin service (replace target) |

Ease weights used for ordering only: A=1.0, B=0.6, C=0.3, D=0.1, E=0, not verified=0.15. Score ≈ matters × ease of the best row for that state.

## Proposed adapter order

Do **not** start adapters in this session. Suggested order after dossiers + terms review:

1. **Querétaro (14 × B)** — open primera-instancia court index covering civil, family and labour; no captcha on landing.
2. **Jalisco (10 × A)** — daily extracts SPA at `cjj.gob.mx/bulletin`; confirm sample HTML/PDF and terms in a browser.
3. **Tabasco (6 × B)** — open primera/segunda forms; terms PDF linked (counsel must read).
4. **Sonora (5 × B)** — open municipio/materia/órgano filters including civil/family/labour.
5. **Morelos (2 × B)** / **Durango (2 × B)** / **Michoacán (2 × B)** — smaller matter counts but clean open forms; Durango keeps lists only ~10 days.
6. **Veracruz / San Luis Potosí / BCS / Guerrero / Aguascalientes / Campeche / Nayarit (B, 0 client matters in the given list)** — build after client-weighted states unless opportunistic.
7. **Ciudad de México (A model, service-replacement priority)** — single daily PDF with party names when reachable; **Cloudflare blocks this survey cloud IP**. Needs egress that the portal accepts, then dossier + terms.
8. **Estado de México (33)** — highest matters; **timed out entirely** from this host. Re-probe from allowed network before ranking; third-party writeups mention captcha (not used here for tier).
9. **Guanajuato (18 × D)** / **Nuevo León (9 × D)** / **Coahuila (6 × D)** / **Chiapas (5 × D)** / **Yucatán (2 × D)** / **Hidalgo (3 × D)** / **Sinaloa (D wall)** — captcha or bot wall; no adapter under 9b until tier changes or 9e applies.
10. **Chihuahua (11 × not verified)** / **QRoo / Puebla / Tamaulipas / BC / Tlaxcala / Colima / Zacatecas / Oaxaca case lists** — re-verify landing and one sample before any tier promotion.

## Sites that blocked or failed from a cloud IP

Matters for hosting (rule 9b courtesy still applies wherever you host):

| Host | Observation |
| --- | --- |
| `poderjudicialcdmx.gob.mx` | Cloudflare 403 “Attention Required” on landing and robots.txt |
| `*.pjedomex.gob.mx` / `notificacion` / `consultaboletin` | TCP timeout |
| `tsjqroo.gob.mx` | TCP timeout |
| `pjpuebla.gob.mx` | Cloudflare interstitial |
| `poderjudicialchiapas.gob.mx` / `consultalistas.poderjudicialchiapas.gob.mx` | Cloudflare interstitial |
| `pjbc.gob.mx` | Cloudflare interstitial on bulletin page; robots.txt readable with Content-Signal |
| `stj-sin.gob.mx/serviciosenlinea/boletinjudicial` | Access verification gate (HTTP 500 “verificación adicional”) |
| `notifica.tsjtlaxcala.gob.mx` | Timeout |
| `stjcolima.gob.mx/.../Lista_Acuerdos/` | HTTP 500 empty |
| `www.tsjdgo.gob.mx` robots over HTTPS | SSL handshake failure (HTTP landing worked) |
| `tribunalelectronico.gob.mx/.../ListaAcuerdos/` | HTTP 200 but ~163-byte body (likely JS app) |

## Open questions

1. CDMX: can a non-cloud crawler reach `consulta-boletin` and the daily PDF without solving a user captcha? Who holds the current paid subscription metadata to map courts?
2. Edomex: live form fields, captcha, FeJEM login boundary, and terms — unreachable from this host.
3. Jalisco SPA: exact extract file format, history depth, and whether labour/ZMG/foráneos share one adapter.
4. Chihuahua: how year links resolve; landing shows 2020–2026 but year paths 404 here.
5. Quintana Roo Lista Electrónica vs Tribunal Electrónico login — which is the public daily list?
6. Puebla / Baja California: content behind Cloudflare; BC Content-Signal `ai-train=no,use=reference` needs counsel interpretation for polling.
7. Tamaulipas AccesoLibre: confirm with a real browser that court trees and PDFs load without login.
8. Aguascalientes TemisOral: is coverage broader than oral penal branding?
9. Oaxaca: is there any statewide daily civil/family/labour list, or only fragmented juicio oral pages?
10. Michoacán robots `Disallow` on some list paths — do result URLs fall under disallowed prefixes?
11. Tabasco / Coahuila terms: full automation and third-party clauses need counsel paste into dossiers.
12. Guerrero / Campeche: matching without party names — catalogue key design.
13. No tier C candidates proposed; if a firm later authorises a state login, that is 9e + counsel sign-off, never in the demo.

## What this session did not do

- No adapters, migrations, app code, secrets, or downloaded party-name samples in git.
- No bulk queries, logins, or captcha solving.

## Could not verify (high level)

Live confirmation failed or was incomplete for: Estado de México, Quintana Roo, Puebla, Baja California (page body), Chiapas (live), Chihuahua samples, Tamaulipas UI, Tlaxcala notifica host, Colima listas, Sinaloa bulletin body, Oaxaca statewide case lists, Zacatecas interactive widgets, and terms text for most states.

## Three states to automate first (after dossiers)

1. **Querétaro** — 14 client matters; open per-court landing for civil, family and labour; no captcha observed; smallest path to a lawful A/B adapter once terms are reviewed.
2. **Jalisco** — 10 matters; appears to publish daily open extracts (tier A proposal); needs one browser sample and terms check because the site is an SPA.
3. **Tabasco** — 6 matters; open primera/segunda query forms without captcha on the landing; terms PDF already linked for counsel review.

CDMX remains the product priority to replace the paid service, but cloud-IP Cloudflare blocking means hosting/egress work and a human dossier must precede any adapter.
