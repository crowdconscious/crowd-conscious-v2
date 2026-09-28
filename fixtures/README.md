# Simulation fixtures

**FIXTURE DATA — datos de ejemplo.** Not real Pulse results. Do not present
these numbers as citizen opinion or as a live Divergence Index.

| File | Purpose |
|------|---------|
| `simulation-run.fixture.json` | Viewer demo payload (~150 agents, realistic display names / colonias, 4 options). Used by `/admin/sim-viewer/fixture` and related preview routes. |
| `simulation-run.json` | Task 1 seed fixture (migration 266 / `npm run seed:simulation-fixture`). Same wire shape; placeholder labels; 3 options. Kept for DB seeding. |

Regenerate the viewer demo:

```bash
npx tsx scripts/sim-viewer/build-fixture.ts
```

Seed the Task 1 fixture into a local DB:

```bash
npm run seed:simulation-fixture
```

Viewer personas are sampled from `data/personas.cdmx-v1.generated.json`.
Option choices, confidence, reasoning lines, and display names are invented
for demo replay. `sequenceIndex` order is shuffled (not grouped by option).
