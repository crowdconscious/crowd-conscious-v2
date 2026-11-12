# MATCH-REVIEW — lawyer pre-demo reading list

Status: **TEMPLATE** — fill after the CTO runs the classify/match backfill on the target environment. Do not invent live match content here.

## Commands (do not run against production without cost confirmation)

```bash
# 1) Cost estimate only (note count + USD from measured ai_runs rates)
npx tsx scripts/ciceron/backfill-classify-match.ts --dry-run

# 2) Embed watch profiles so vector_used can be true when both sides have vectors
npx tsx scripts/ciceron/embed-watch-profiles.ts --dry-run
npx tsx scripts/ciceron/embed-watch-profiles.ts

# 3) Backfill classify+match oldest→newest
# Hard US$60 code cap (edit COST_CAP_USD in _cost-cap.ts only if CTO approves)
npx tsx scripts/ciceron/backfill-classify-match.ts
```

After backfill, populate each client section with the top matches (title, date, reason naming the concrete link, official link). **Flag any client with fewer than three matches** before the law-firm demo.

## Clients (Datos de demostración)

### 1. Nexora Pagos, S.A.P.I. de C.V.
- Status: _pending backfill_
- Match count: _n/a_
- Matches: _(title | date | reason | link)_
- Flag if &lt; 3: _

### 2. Distribuidora Farma Sierra, S.A. de C.V.
- Status: _pending backfill_
- Match count: _n/a_
- Matches: _(title | date | reason | link)_
- Flag if &lt; 3: _

### 3. Viento del Istmo Energía, S.A.P.I. de C.V.
- Status: _pending backfill_
- Match count: _n/a_
- Matches: _(title | date | reason | link)_
- Flag if &lt; 3: _

### 4. Agencia Aduanal Delta del Pacífico, S.C.
- Status: _pending backfill_
- Match count: _n/a_
- Matches: _(title | date | reason | link)_
- Flag if &lt; 3: _

### 5. Fondo Pedregal Inmuebles, S.A. de C.V.
- Status: _pending backfill_
- Match count: _n/a_
- Matches: _(title | date | reason | link)_
- Flag if &lt; 3: _

### 6. Alimentos del Bajío Integrados, S.A. de C.V.
- Status: _pending backfill_
- Match count: _n/a_
- Matches: _(title | date | reason | link)_
- Flag if &lt; 3: _

## Flags
- [ ] Any client with **fewer than 3 matches** — call out here before the demo.
- [ ] Procurement items (if any) appear only under «Contratación pública», never mixed with regulatory.

## Labelling loop (optional, after human labels)
```bash
npx tsx scripts/ciceron/export-labelled-set.ts --out=docs/ciceron/labelled-set.csv
# Human fills human_* columns — do not auto-label
npx tsx scripts/ciceron/score-labelled-set.ts --in=docs/ciceron/labelled-set.csv
```
