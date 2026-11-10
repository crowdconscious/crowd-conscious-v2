# Cicéron — DOF / SIDOF source notes

Verified 2026-11-10 with polite HTTPS requests (identifying User-Agent, ≥300 ms
spacing, ~25 s timeout). **Never crawl `dof.gob.mx` note-detail pages** for
ingestion; use SIDOF JSON only.

## Endpoints that work

| Role | Base URL |
|---|---|
| Primary | `https://sidofqa.segob.gob.mx/dof/sidof` |
| Fallback | `https://sidof.segob.gob.mx/dof/sidof` |

Both returned **HTTP 200** with the same payload shape for
`/notas/10-11-2026` (~74 KiB). Prefer QA host first; fall back on network
failure.

| Method | Path | Purpose |
|---|---|---|
| GET | `/notas/{dd-mm-yyyy}` | Day index (matutina / vespertina / extraordinaria) |
| GET | `/notas/nota/{codNota}` | Full note JSON including HTML body |

Date format in the path is **day-month-year with dashes** (`10-11-2026`), not ISO.

## Day-list response

Top-level fields observed:

- `messageCode` (200), `response` (`"OK"`)
- `NotasMatutinas`, `NotasVespertinas`, `NotasExtraordinarias` — arrays
- `imagenesDiario`, `audioSumario`

List item fields (variable): `codNota`, `titulo` (**sometimes null/absent**),
`codSeccion`, `fecha`, `codDiario`, `existeHtml` / `existeDoc` / `existeImagen` /
`existePdf`, `tipoNota` (often the string `"null"`), `estado`, `pagina`,
`paginaHasta`, `nombreCodOrgaUno`, `codOrgaUno`, `codOrgaDos`, `orden`.

Empty business days still return 200 with empty arrays
(fixture `list-07-11-2026-empty.json`).

### Measured day sizes (matutina + vespertina + extraordinaria)

| Date | Notes |
|---|---|
| 10-11-2026 | 186 |
| 03-11-2026 | 174 |
| 15-10-2025 | 60 |
| 07-11-2026 | 0 (empty) |
| **Average (3 non-empty days)** | **~140 notes/day** |

## Note-detail response

Top-level: `messageCode`, `response`, `Nota`, `tamanioExcesivo` (boolean).

`Nota` fields: `codNota`, `titulo`, `codSeccion`, `fecha`, `codDiario`,
`cadenaContenido` (HTML string), organism codes, `nombOrganismo` (often null
in samples), `tamanioContenido`, page/order metadata, `existe*` flags.

Body sizes vary widely: short avisos ~1–5 KiB HTML; constitutional decrees
~20 KiB; health “acuerdo” samples ~800 KiB HTML; some addenda exceed 1.5 MiB.
Pipeline must stream/store raw JSON and normalise without loading unbounded
duplicates into memory where possible.

Unknown `codNota` still returned HTTP 200 with an empty/minimal `Nota`
(no `cadenaContenido`) in one probe — treat missing title+body as skip, not
hard failure.

## Differences from the prompt sketch

1. Host is `/dof/sidof` (no trailing path segment beyond that); list and note
   paths match the description.
2. List payloads split editions into three arrays, not a single flat list.
3. `titulo` is **not** reliable on the list endpoint — many rows omit it;
   detail fetch is required for a usable title.
4. `tipoNota` is frequently the literal string `"null"`; infer type from the
   title prefix when needed (Decreto / Acuerdo / Aviso / …).
5. Authority display names are incomplete on many list rows (`nombreCodOrgaDos`
   often missing); detail `nombOrganismo` was null in sampled notes — keep
   `codOrga*` codes for later enrichment.
6. Service is unofficial / undocumented; treat availability as best-effort and
   raise health incidents on zero-note business days or consecutive failures.

## Courtesy / limits

No published rate limit observed in a handful of requests. Client policy:

- Identifying `User-Agent` including contact from `CICERON_DOF_CONTACT_EMAIL`
  / `CICERON_DOF_USER_AGENT`
- Minimum **300 ms** between requests
- Exponential backoff on 429/5xx
- Hard per-request timeout (25 s)
- One request at a time

## Official human URL (not crawled)

For SourceChip links only (no scrape):  
`https://www.dof.gob.mx/nota_detalle.php?codigo={codNota}&fecha={dd/mm/yyyy}`

## Fixtures

Under `docs/ciceron/fixtures/sidof/`:

- Day lists: `list-10-11-2026.json`, `list-03-11-2026.json`,
  `list-15-10-2025.json`, `list-07-11-2026-empty.json`
- Notes: `nota-5769997.json` (decreto), `nota-5802769.json` (decreto),
  `nota-5803341.json` (long acuerdo), `nota-5802760.json` (acuerdo),
  `nota-5803345.json` (aviso), `nota-5803356.json` (short aviso)

## Verdict

**SIDOF is reachable and materially matches the expected contract.** Proceed
with `SidofConnector` + ingestion pipeline. Do not fall back to crawling
dof.gob.mx note pages.
