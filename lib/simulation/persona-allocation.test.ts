import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  allocatePersonaCounts,
  type WeightedCell,
} from "./persona-allocation.ts";

const CDMX_TARGETS = { Cuauhtémoc: 100, "Miguel Hidalgo": 50 } as const;

function sumByAlcaldia<T extends { alcaldia: string; personaCount: number }>(
  cells: T[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const cell of cells) {
    totals[cell.alcaldia] = (totals[cell.alcaldia] ?? 0) + cell.personaCount;
  }
  return totals;
}

test("contract: real cdmx-v1 data normalizes to exactly 100/50/150", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const jsonPath = resolve(here, "../../data/persona-targets.cdmx-v1.json");
  const parsed = JSON.parse(readFileSync(jsonPath, "utf8")) as {
    cells: WeightedCell[];
  };

  const allocated = allocatePersonaCounts(parsed.cells, CDMX_TARGETS);
  const totals = sumByAlcaldia(allocated);

  assert.equal(totals["Cuauhtémoc"], 100, "Cuauhtémoc must sum to 100");
  assert.equal(totals["Miguel Hidalgo"], 50, "Miguel Hidalgo must sum to 50");
  assert.equal(
    allocated.reduce((s, c) => s + c.personaCount, 0),
    150,
    "grand total must be 150",
  );

  // Source weights are preserved untouched; only personaCount is added.
  for (let i = 0; i < allocated.length; i++) {
    assert.equal(allocated[i].count, parsed.cells[i].count);
    assert.ok(Number.isInteger(allocated[i].personaCount));
    assert.ok(allocated[i].personaCount >= 0);
  }
});

test("exact sum: awkward weights [1,1,1] into N=100 → 34/33/33", () => {
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 1 },
    { alcaldia: "A", count: 1 },
    { alcaldia: "A", count: 1 },
  ];
  const out = allocatePersonaCounts(cells, { A: 100 });
  assert.deepEqual(
    out.map((c) => c.personaCount),
    [34, 33, 33],
  );
  assert.equal(
    out.reduce((s, c) => s + c.personaCount, 0),
    100,
  );
});

test("exact sum: largest-remainder picks the right cells", () => {
  // weights 10/20/30/40 into N=7. quotas: 0.7,1.4,2.1,2.8.
  // floors: 0,1,2,2 = 5; remaining 2 → largest remainders 0.8 (idx3) & 0.7 (idx0).
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 10 },
    { alcaldia: "A", count: 20 },
    { alcaldia: "A", count: 30 },
    { alcaldia: "A", count: 40 },
  ];
  const out = allocatePersonaCounts(cells, { A: 7 });
  assert.deepEqual(
    out.map((c) => c.personaCount),
    [1, 1, 2, 3],
  );
  assert.equal(
    out.reduce((s, c) => s + c.personaCount, 0),
    7,
  );
});

test("exact sum: fuzz many random weightings always sum to N", () => {
  let seed = 123456789;
  const rand = () => {
    // deterministic LCG so the fuzz itself is reproducible
    seed = (1103515245 * seed + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let trial = 0; trial < 500; trial++) {
    const k = 1 + Math.floor(rand() * 12);
    const N = Math.floor(rand() * 200);
    const cells: WeightedCell[] = Array.from({ length: k }, () => ({
      alcaldia: "A",
      count: Math.floor(rand() * 10000),
    }));
    const out = allocatePersonaCounts(cells, { A: N });
    const total = out.reduce((s, c) => s + c.personaCount, 0);
    // Sum equals N unless all weights are zero AND there are cells (even split)
    // — the even-split branch also sums to N, so this holds universally here.
    assert.equal(total, N, `trial ${trial}: expected ${N}`);
    for (const c of out) assert.ok(c.personaCount >= 0);
  }
});

test("determinism: identical output across repeated runs", () => {
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 5 },
    { alcaldia: "A", count: 5 },
    { alcaldia: "A", count: 5 },
    { alcaldia: "B", count: 7 },
    { alcaldia: "B", count: 3 },
  ];
  const targets = { A: 10, B: 4 };
  const first = allocatePersonaCounts(cells, targets);
  for (let i = 0; i < 5; i++) {
    const again = allocatePersonaCounts(cells, targets);
    assert.deepEqual(again, first);
  }
});

test("determinism: equal remainders break ties by original order (earliest wins)", () => {
  // Three equal weights into N=100 → one extra unit to the first cell.
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 100 },
    { alcaldia: "A", count: 100 },
    { alcaldia: "A", count: 100 },
  ];
  const out = allocatePersonaCounts(cells, { A: 100 });
  assert.deepEqual(
    out.map((c) => c.personaCount),
    [34, 33, 33],
  );
});

test("edge: all-zero weights are distributed evenly, leftover to earliest", () => {
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 0 },
    { alcaldia: "A", count: 0 },
    { alcaldia: "A", count: 0 },
  ];
  const out = allocatePersonaCounts(cells, { A: 10 });
  assert.deepEqual(
    out.map((c) => c.personaCount),
    [4, 3, 3],
  );
  assert.equal(
    out.reduce((s, c) => s + c.personaCount, 0),
    10,
  );
});

test("edge: single cell receives the whole target", () => {
  const cells: WeightedCell[] = [{ alcaldia: "A", count: 42 }];
  const out = allocatePersonaCounts(cells, { A: 150 });
  assert.equal(out[0].personaCount, 150);
});

test("edge: N=0 yields all zeros", () => {
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 10 },
    { alcaldia: "A", count: 20 },
  ];
  const out = allocatePersonaCounts(cells, { A: 0 });
  assert.deepEqual(
    out.map((c) => c.personaCount),
    [0, 0],
  );
});

test("edge: alcaldía missing from targets gets zero personas", () => {
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 10 },
    { alcaldia: "B", count: 10 },
  ];
  const out = allocatePersonaCounts(cells, { A: 5 });
  assert.equal(out[0].personaCount, 5);
  assert.equal(out[1].personaCount, 0);
});

test("edge: target larger than the number of cells spreads multiple per cell", () => {
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: 1 },
    { alcaldia: "A", count: 1 },
  ];
  const out = allocatePersonaCounts(cells, { A: 5 });
  assert.deepEqual(
    out.map((c) => c.personaCount),
    [3, 2],
  );
});

test("edge: negative / non-finite weights are treated as zero", () => {
  const cells: WeightedCell[] = [
    { alcaldia: "A", count: -5 },
    { alcaldia: "A", count: Number.NaN },
    { alcaldia: "A", count: 10 },
  ];
  const out = allocatePersonaCounts(cells, { A: 10 });
  assert.deepEqual(
    out.map((c) => c.personaCount),
    [0, 0, 10],
  );
});

test("output preserves input order and passes through extra fields", () => {
  const cells = [
    { alcaldia: "A", count: 3, age_range: "18-29", gender: "femenino" },
    { alcaldia: "A", count: 7, age_range: "30-44", gender: "masculino" },
  ];
  const out = allocatePersonaCounts(cells, { A: 10 });
  assert.equal(out[0].age_range, "18-29");
  assert.equal(out[1].gender, "masculino");
  assert.equal(out[0].personaCount, 3);
  assert.equal(out[1].personaCount, 7);
});
