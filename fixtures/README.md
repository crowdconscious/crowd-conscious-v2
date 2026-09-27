# Simulation fixtures

**FIXTURE DATA — datos de ejemplo.** Not real Pulse results. Do not present
these numbers as citizen opinion or as a live Divergence Index.

| File | Purpose |
|------|---------|
| `simulation-run.fixture.json` | Full Task-2-shaped replay payload (~150 agents) for the Visor core (Task 3) while the API / data layer land. |

Regenerate:

```bash
npx tsx scripts/sim-viewer/build-fixture.ts
```

Personas are sampled from `data/personas.cdmx-v1.generated.json`. Option
choices, confidence, reasoning lines, and display names are invented for
demo replay. `sequenceIndex` order is shuffled (not grouped by option).
