/**
 * scripts/generate-personas.ts — Persona generator for the Pulse Simulation
 * (Workstream B, §5.3). Turns `data/persona-targets.cdmx-v1.json` weights into
 * the `cdmx-v1` persona set = 150 personas (100 Cuauhtémoc + 50 Miguel Hidalgo).
 *
 * WHY the allocator (not the JSON): `cell.count` is a POPULATION WEIGHT (the
 * owner's adult-population estimate), NOT a final persona count. The 100/50/150
 * guarantee lives in the tested `allocatePersonaCounts` (Hamilton largest-
 * remainder) in `lib/simulation/persona-allocation.ts`, so we import it rather
 * than trusting the raw weights to sum to 150.
 *
 * WHY education is a MARGINAL (not per-cell): crossing education into the cells
 * would explode 96 cells into ~480 near-empty ones. Instead the owner supplies
 * `_meta.education_marginals[alcaldia]` and we distribute education across each
 * alcaldía's personas so the REALIZED distribution matches that marginal. We
 * reuse the SAME Hamilton allocator to turn the marginal % into exact integer
 * counts summing to N, then assign them largest-quota-first so the levels spread
 * across cells — this hits the marginal exactly (delta ~ rounding, well <5%).
 *
 * CLI:
 *   npx tsx scripts/generate-personas.ts --dry-run          # no API key needed
 *   npx tsx scripts/generate-personas.ts                    # real; needs ANTHROPIC_API_KEY
 *   npx tsx scripts/generate-personas.ts --from-json [path] # re-validate + re-emit SQL, no model
 * Flags:
 *   --targets <path>   input targets JSON (default data/persona-targets.cdmx-v1.json)
 *   --out <path>       personas JSON output (default data/personas.cdmx-v1.generated.json)
 *   --sql-out <path>   SQL output          (default data/personas.cdmx-v1.generated.sql)
 *   --help
 *
 * GUARDRAIL (§1): produces ONLY simulation_* artifacts as local files (JSON +
 * SQL). It never connects to the DB and never touches `prediction_markets` or
 * real vote tables. The SQL is for the migration owner to apply after 252.
 */

import { config as loadEnv } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  allocatePersonaCounts,
  type WeightedCell,
} from '../lib/simulation/persona-allocation.ts';
// Model id + Anthropic client come from the repo's single source of truth
// (lib/agents/config.ts) — never hardcode a model id in a second place (§1).
import { MODELS, getAnthropicClient, parseAgentJSON } from '../lib/agents/config.ts';

loadEnv({ path: resolve(process.cwd(), '.env.local'), override: true });

// --- Domain types (mirror the §5.3 cell schema + migration 252 columns) ------

type Alcaldia = 'Cuauhtémoc' | 'Miguel Hidalgo';
type Gender = 'masculino' | 'femenino';
type IncomeBand = 'A/B' | 'C+' | 'C' | 'C-' | 'D+' | 'D/E';
type AgeRange = '18-29' | '30-44' | '45-59' | '60+';
type Education = 'primaria' | 'secundaria' | 'prepa' | 'licenciatura' | 'posgrado';

const EDUCATION_LEVELS: readonly Education[] = [
  'primaria',
  'secundaria',
  'prepa',
  'licenciatura',
  'posgrado',
];

const AGE_BOUNDS: Record<AgeRange, { min: number; max: number }> = {
  '18-29': { min: 18, max: 29 },
  '30-44': { min: 30, max: 44 },
  '45-59': { min: 45, max: 59 },
  // 60+ is open-ended; cap validation generously.
  '60+': { min: 60, max: 110 },
};

interface TargetCell extends WeightedCell {
  alcaldia: Alcaldia;
  count: number;
  age_range: AgeRange;
  gender: Gender;
  education: null;
  income_band: IncomeBand;
}

interface TargetsFile {
  _meta: {
    version: string;
    normalization: { targets: Record<string, number> };
    education_marginals: Record<string, Record<Education, number>>;
  };
  cells: TargetCell[];
}

interface ValuesProfile {
  seguridad: number;
  vivienda: number;
  movilidad: number;
  medio_ambiente: number;
  economia: number;
  cultura: number;
}

/** One persona row — fields match `simulation_personas` (id/created_at defaulted). */
interface Persona {
  version: string;
  alcaldia: Alcaldia;
  colonia: string | null;
  age: number;
  gender: Gender;
  education: Education;
  occupation: string;
  income_band: IncomeBand;
  household: string | null;
  transport_mode: string | null;
  media_diet: string[];
  values_profile: ValuesProfile;
  persona_narrative: string;
}

/** The subset a model (or the stub) invents; the rest is fixed by the cell. */
interface GeneratedFields {
  age: number;
  colonia: string | null;
  occupation: string;
  household: string | null;
  transport_mode: string | null;
  media_diet: string[];
  values_profile: ValuesProfile;
  persona_narrative: string;
}

interface FailedPersona {
  index: number;
  alcaldia: Alcaldia;
  age_range: AgeRange;
  gender: Gender;
  income_band: IncomeBand;
  education: Education;
  reason: string;
}

// --- Banned generic filler (§5.3): reject narratives that lean on adjectives
// instead of concrete daily life. Matched accent-insensitively as substrings. --
const BANNED_FILLER: readonly string[] = [
  'tradicional',
  'preocupado por la comunidad',
  'preocupada por la comunidad',
  'comprometido con la comunidad',
  'comprometida con la comunidad',
  'amante de',
  'apasionado por',
  'apasionada por',
  'persona trabajadora',
  'gran persona',
  'buena persona',
  'luchador incansable',
  'luchadora incansable',
  'orgulloso de sus raices',
  'orgullosa de sus raices',
  'valores familiares',
  'trabajador incansable',
];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function norm(s: string): string {
  return stripAccents(s).toLowerCase();
}

// --- CLI parsing (minimal, hand-rolled per constraint) -----------------------

interface Cli {
  dryRun: boolean;
  fromJson: string | null; // resolved path or null when not set
  targetsPath: string;
  outPath: string;
  sqlOutPath: string;
  help: boolean;
}

function parseCli(argv: string[]): Cli {
  const args = argv.slice(2);
  const flagValue = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    if (i === -1) return undefined;
    const next = args[i + 1];
    return next && !next.startsWith('--') ? next : undefined;
  };
  const has = (flag: string): boolean => args.includes(flag);

  const defaultOut = 'data/personas.cdmx-v1.generated.json';
  const fromJsonSet = has('--from-json');
  return {
    dryRun: has('--dry-run'),
    fromJson: fromJsonSet ? (flagValue('--from-json') ?? defaultOut) : null,
    targetsPath: flagValue('--targets') ?? 'data/persona-targets.cdmx-v1.json',
    outPath: flagValue('--out') ?? defaultOut,
    sqlOutPath: flagValue('--sql-out') ?? 'data/personas.cdmx-v1.generated.sql',
    help: has('--help') || has('-h'),
  };
}

const USAGE = `generate-personas.ts — build the cdmx-v1 persona set (§5.3)

Usage:
  npx tsx scripts/generate-personas.ts --dry-run
  npx tsx scripts/generate-personas.ts                    (real; needs ANTHROPIC_API_KEY)
  npx tsx scripts/generate-personas.ts --from-json [path] (re-validate + re-emit SQL, no model)

Flags:
  --dry-run          use deterministic STUB personas (no Anthropic call)
  --from-json [path] re-emit from an existing personas JSON (default: data/personas.cdmx-v1.generated.json)
  --targets <path>   input targets JSON  (default: data/persona-targets.cdmx-v1.json)
  --out <path>       personas JSON output (default: data/personas.cdmx-v1.generated.json)
  --sql-out <path>   SQL INSERT output    (default: data/personas.cdmx-v1.generated.sql)
  -h, --help         show this help
`;

// --- Deterministic helpers ---------------------------------------------------

/** Small deterministic hash → used only for reproducible stub variety. */
function seededInt(seed: number): number {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length];
}

function ageForRange(range: AgeRange, n: number): number {
  const { min, max } = AGE_BOUNDS[range];
  // For 60+ keep the stub within a believable 60–84 band.
  const top = range === '60+' ? 84 : max;
  const span = top - min + 1;
  return min + (n % span);
}

function ageInRange(age: number, range: AgeRange): boolean {
  const { min, max } = AGE_BOUNDS[range];
  return Number.isInteger(age) && age >= min && age <= max;
}

// --- Education marginal → per-alcaldía assignment sequence --------------------

/**
 * Turn a percentage marginal into an exact-integer assignment sequence of length
 * `n`, reusing the tested Hamilton allocator so the counts sum to exactly `n`.
 * Ordering is largest-remaining-quota-first, which interleaves the levels so a
 * single education level is not clustered into one income band or age bucket.
 */
function buildEducationSequence(
  n: number,
  marginalPct: Record<Education, number>,
): Education[] {
  const cells: WeightedCell[] = EDUCATION_LEVELS.map((lvl) => ({
    alcaldia: 'edu',
    count: marginalPct[lvl] ?? 0,
  }));
  const allocated = allocatePersonaCounts(cells, { edu: n });
  const remaining = new Map<Education, number>();
  EDUCATION_LEVELS.forEach((lvl, i) =>
    remaining.set(lvl, allocated[i].personaCount),
  );

  const seq: Education[] = [];
  for (let k = 0; k < n; k++) {
    let best: Education = EDUCATION_LEVELS[0];
    let bestVal = -1;
    for (const lvl of EDUCATION_LEVELS) {
      const v = remaining.get(lvl) ?? 0;
      if (v > bestVal) {
        bestVal = v;
        best = lvl;
      }
    }
    seq.push(best);
    remaining.set(best, (remaining.get(best) ?? 0) - 1);
  }
  return seq;
}

// --- STUB persona (dry-run: exercises the full pipeline, no API) -------------

const STUB_OCCUPATIONS: Record<IncomeBand, readonly string[]> = {
  'A/B': ['gerente de proyectos en una consultora', 'arquitecta con despacho propio'],
  'C+': ['contadora en un despacho fiscal', 'analista de sistemas en una fintech'],
  C: ['empleado de mostrador en una refaccionaria', 'chofer de aplicación por las tardes'],
  'C-': ['mesera en una fonda del centro', 'cajero en un supermercado de barrio'],
  'D+': ['ayudante de albañil por obra', 'trabajadora del hogar de entrada por salida'],
  'D/E': ['vendedor de dulces en el metro', 'recolectora de material reciclable'],
};

const STUB_MEDIA: readonly string[] = [
  'grupos de WhatsApp del edificio',
  'noticieros de la televisión abierta',
  'publicaciones de Facebook',
  'la radio en el trayecto',
  'videos de TikTok',
  'notas de periódicos en línea',
];

const STUB_TRANSPORT: readonly string[] = [
  'metro',
  'microbús',
  'automóvil propio',
  'bicicleta',
  'a pie',
  'Metrobús',
];

const STUB_HOUSEHOLD: readonly string[] = [
  'vive con su pareja y dos hijos',
  'vive sola en un cuarto rentado',
  'vive con sus padres y un hermano',
  'comparte departamento con dos compañeros',
];

/**
 * Deterministic stub persona for --dry-run. Concrete and free of banned filler
 * so it passes the same validator the real model output must pass.
 */
function stubGenerate(
  cell: TargetCell,
  education: Education,
  seq: number,
): GeneratedFields {
  const h = seededInt(seq);
  const occupation = pick(STUB_OCCUPATIONS[cell.income_band], h);
  const media = [pick(STUB_MEDIA, h), pick(STUB_MEDIA, h + 3)];
  const transport = pick(STUB_TRANSPORT, h + 1);
  const household = pick(STUB_HOUSEHOLD, h + 2);
  const age = ageForRange(cell.age_range, h);

  const owns = h % 2 === 0;
  const vivienda = owns
    ? 'Es dueña del departamento donde vive desde hace años'
    : 'Renta un departamento pequeño y cada aumento le pega al gasto';
  const narrative =
    `${vivienda} y trabaja como ${occupation}. ` +
    `Se informa por ${media[0]} y le preocupa que el sueldo no alcance para los gastos del mes.`;

  const v = (offset: number): number =>
    Math.round((seededInt(seq + offset) / 0xffffffff) * 100) / 100;

  return {
    age,
    colonia: null, // real runs fill a colonia via the model; null keeps the stub honest
    occupation,
    household,
    transport_mode: transport,
    media_diet: media,
    values_profile: {
      seguridad: v(11),
      vivienda: v(22),
      movilidad: v(33),
      medio_ambiente: v(44),
      economia: v(55),
      cultura: v(66),
    },
    persona_narrative: narrative,
  };
}

// --- Real generation via Anthropic (repo convention) -------------------------

const GEN_SYSTEM = `Eres un demógrafo que construye UNA persona sintética representativa de un
residente real de la Ciudad de México para un panel de consulta ciudadana.
La persona debe sentirse específica y concreta, no un estereotipo.

Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin markdown ni texto adicional,
con exactamente estas llaves:
{
  "age": <entero dentro del rango indicado>,
  "colonia": "<colonia real de la alcaldía indicada>",
  "occupation": "<ocupación concreta y específica>",
  "household": "<con quién vive, en una frase corta>",
  "transport_mode": "<medio de transporte habitual>",
  "media_diet": ["<fuente 1>", "<fuente 2>"],
  "values_profile": {"seguridad":0-1,"vivienda":0-1,"movilidad":0-1,"medio_ambiente":0-1,"economia":0-1,"cultura":0-1},
  "persona_narrative": "<2-3 frases de vida cotidiana CONCRETA en español mexicano>"
}

Reglas para persona_narrative:
- 2 o 3 frases, en español de la Ciudad de México.
- Incluye datos concretos: si renta o es dueño, detalles de su trabajo, a quién
  cuida, cómo se informa y UNA preocupación específica.
- PROHIBIDO usar adjetivos genéricos de relleno como "tradicional",
  "preocupado por la comunidad", "persona trabajadora" o similares.
Los valores de values_profile son números entre 0 y 1 (qué tanto le importa cada tema).`;

function buildUserPrompt(cell: TargetCell, education: Education): string {
  const { min, max } = AGE_BOUNDS[cell.age_range];
  const ageHint = cell.age_range === '60+' ? '60 a 85' : `${min} a ${max}`;
  return `Genera la persona con estas restricciones fijas (respétalas exactamente):
- Alcaldía: ${cell.alcaldia}
- Rango de edad: ${cell.age_range} (elige una edad entera de ${ageHint})
- Género: ${cell.gender}
- Nivel socioeconómico (AMAI): ${cell.income_band}
- Escolaridad: ${education}

Responde solo con el objeto JSON.`;
}

function coerceGenerated(raw: unknown): GeneratedFields {
  const obj = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>;
  if (!obj || typeof obj !== 'object') {
    throw new Error('model output is not an object');
  }
  const vp = obj.values_profile as Record<string, unknown> | undefined;
  return {
    age: Number(obj.age),
    colonia: obj.colonia == null ? null : String(obj.colonia),
    occupation: String(obj.occupation ?? ''),
    household: obj.household == null ? null : String(obj.household),
    transport_mode: obj.transport_mode == null ? null : String(obj.transport_mode),
    media_diet: Array.isArray(obj.media_diet) ? obj.media_diet.map(String) : [],
    values_profile: {
      seguridad: Number(vp?.seguridad),
      vivienda: Number(vp?.vivienda),
      movilidad: Number(vp?.movilidad),
      medio_ambiente: Number(vp?.medio_ambiente),
      economia: Number(vp?.economia),
      cultura: Number(vp?.cultura),
    },
    persona_narrative: String(obj.persona_narrative ?? ''),
  };
}

type Anthropic = ReturnType<typeof getAnthropicClient>;

async function callModel(
  client: Anthropic,
  cell: TargetCell,
  education: Education,
): Promise<GeneratedFields> {
  const resp = await client.messages.create({
    model: MODELS.CREATIVE,
    max_tokens: 700,
    temperature: 1, // variety across the panel (§5.4 uses 1.0 for diversity)
    system: GEN_SYSTEM,
    messages: [{ role: 'user', content: buildUserPrompt(cell, education) }],
  });
  const textBlock = resp.content.find((b) => b.type === 'text');
  const text = textBlock && 'text' in textBlock ? textBlock.text : '';
  return coerceGenerated(parseAgentJSON(text));
}

// --- Validation --------------------------------------------------------------

function assemble(cell: TargetCell, education: Education, g: GeneratedFields): Persona {
  return {
    version: 'cdmx-v1',
    alcaldia: cell.alcaldia,
    colonia: g.colonia,
    age: g.age,
    gender: cell.gender,
    education,
    occupation: g.occupation,
    income_band: cell.income_band,
    household: g.household,
    transport_mode: g.transport_mode,
    media_diet: g.media_diet,
    values_profile: g.values_profile,
    persona_narrative: g.persona_narrative,
  };
}

function validatePersona(p: Persona, cell: TargetCell): string[] {
  const errors: string[] = [];

  // Cell constraints (§5.3): alcaldia, age_range, gender, income_band.
  if (p.alcaldia !== cell.alcaldia) errors.push('alcaldia mismatch');
  if (p.gender !== cell.gender) errors.push('gender mismatch');
  if (p.income_band !== cell.income_band) errors.push('income_band mismatch');
  if (!ageInRange(p.age, cell.age_range)) {
    errors.push(`age ${p.age} outside ${cell.age_range}`);
  }
  if (!EDUCATION_LEVELS.includes(p.education)) {
    errors.push(`invalid education ${p.education}`);
  }

  // Required text fields.
  if (!p.occupation.trim()) errors.push('empty occupation');
  if (!Array.isArray(p.media_diet) || p.media_diet.length === 0) {
    errors.push('empty media_diet');
  }

  // values_profile: all six keys, each a number in [0,1].
  const vp = p.values_profile;
  for (const key of [
    'seguridad',
    'vivienda',
    'movilidad',
    'medio_ambiente',
    'economia',
    'cultura',
  ] as const) {
    const val = vp?.[key];
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 1) {
      errors.push(`values_profile.${key} out of [0,1]`);
    }
  }

  // Narrative: 2–3 sentences, no banned filler.
  const narrative = p.persona_narrative?.trim() ?? '';
  if (!narrative) {
    errors.push('empty persona_narrative');
  } else {
    const sentences = narrative.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 2 || sentences.length > 3) {
      errors.push(`persona_narrative has ${sentences.length} sentences (want 2-3)`);
    }
    const n = norm(narrative);
    for (const banned of BANNED_FILLER) {
      if (n.includes(norm(banned))) {
        errors.push(`banned filler: "${banned}"`);
      }
    }
  }

  return errors;
}

// --- SQL emission (columns match migration 252 exactly) ----------------------

function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlNullable(s: string | null): string {
  return s == null ? 'null' : sqlStr(s);
}

function sqlTextArray(items: string[]): string {
  if (items.length === 0) return `ARRAY[]::text[]`;
  return `ARRAY[${items.map(sqlStr).join(', ')}]::text[]`;
}

function sqlJsonb(obj: unknown): string {
  return `${sqlStr(JSON.stringify(obj))}::jsonb`;
}

function emitSql(personas: Persona[]): string {
  const header = `-- personas.cdmx-v1 — generated by scripts/generate-personas.ts (§5.3)
-- Apply AFTER migration 252_simulation_personas.sql. Columns match that table
-- exactly; id and created_at use table defaults. version is immutable ('cdmx-v1').
-- Personas: ${personas.length}
`;
  if (personas.length === 0) return header + '-- (no valid personas to insert)\n';

  const cols =
    'version, alcaldia, colonia, age, gender, education, occupation, income_band, household, transport_mode, media_diet, values_profile, persona_narrative';
  const rows = personas.map((p) => {
    return (
      '  (' +
      [
        sqlStr(p.version),
        sqlStr(p.alcaldia),
        sqlNullable(p.colonia),
        String(p.age),
        sqlStr(p.gender),
        sqlStr(p.education),
        sqlStr(p.occupation),
        sqlStr(p.income_band),
        sqlNullable(p.household),
        sqlNullable(p.transport_mode),
        sqlTextArray(p.media_diet),
        sqlJsonb(p.values_profile),
        sqlStr(p.persona_narrative),
      ].join(', ') +
      ')'
    );
  });

  return (
    header +
    `insert into simulation_personas (${cols}) values\n` +
    rows.join(',\n') +
    ';\n'
  );
}

// --- Distribution report -----------------------------------------------------

const FLAG_THRESHOLD = 5; // percentage points

function proportions<T extends string>(
  counts: Map<T, number>,
  total: number,
): Map<T, number> {
  const out = new Map<T, number>();
  for (const [k, v] of counts) out.set(k, total > 0 ? (v / total) * 100 : 0);
  return out;
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

interface DimensionReport {
  label: string;
  order: readonly string[];
  target: Map<string, number>; // percentage points
  realized: Map<string, number>; // percentage points
}

function reportDimension(d: DimensionReport): boolean {
  let flagged = false;
  console.log(`  ${d.label}`);
  console.log(
    `    ${'nivel'.padEnd(16)}${'target'.padStart(9)}${'realizado'.padStart(12)}${'delta'.padStart(10)}`,
  );
  for (const key of d.order) {
    const t = d.target.get(key) ?? 0;
    const r = d.realized.get(key) ?? 0;
    const delta = r - t;
    const flag = Math.abs(delta) >= FLAG_THRESHOLD ? '  <-- >=5%' : '';
    if (flag) flagged = true;
    const deltaStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp`;
    console.log(
      `    ${key.padEnd(16)}${pct(t).padStart(9)}${pct(r).padStart(12)}${deltaStr.padStart(10)}${flag}`,
    );
  }
  return flagged;
}

function tallyWeighted<T extends string>(
  cells: TargetCell[],
  key: (c: TargetCell) => T,
  weight: (c: TargetCell) => number,
): { counts: Map<T, number>; total: number } {
  const counts = new Map<T, number>();
  let total = 0;
  for (const c of cells) {
    const k = key(c);
    const w = weight(c);
    counts.set(k, (counts.get(k) ?? 0) + w);
    total += w;
  }
  return { counts, total };
}

function tallyPersonas<T extends string>(
  personas: Persona[],
  key: (p: Persona) => T,
): { counts: Map<T, number>; total: number } {
  const counts = new Map<T, number>();
  for (const p of personas) {
    const k = key(p);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return { counts, total: personas.length };
}

/** age_range bucket for a persona (used when re-validating from JSON). */
function ageRangeOf(age: number): AgeRange {
  if (age <= 29) return '18-29';
  if (age <= 44) return '30-44';
  if (age <= 59) return '45-59';
  return '60+';
}

function printDistributionReport(
  targetCells: AllocatedTargetCell[],
  personas: Persona[],
  eduMarginals: Record<string, Record<Education, number>>,
): void {
  const alcaldias = [...new Set(targetCells.map((c) => c.alcaldia))];
  let anyFlagged = false;

  const genderOrder: readonly Gender[] = ['masculino', 'femenino'];
  const ageOrder: readonly AgeRange[] = ['18-29', '30-44', '45-59', '60+'];
  const incomeOrder: readonly IncomeBand[] = ['A/B', 'C+', 'C', 'C-', 'D+', 'D/E'];

  console.log('\n=== DISTRIBUTION REPORT (target vs realized, per alcaldía) ===');
  console.log(
    'target = proportion implied by the owner weights (age/gender/income) or _meta.education_marginals (education).',
  );
  console.log('realized = proportion among successfully generated personas.\n');

  for (const alc of alcaldias) {
    const cells = targetCells.filter((c) => c.alcaldia === alc);
    const ppl = personas.filter((p) => p.alcaldia === alc);
    console.log(`# ${alc} — ${ppl.length} personas`);

    // age / gender / income: target from weights, realized from personas.
    for (const [label, order, keyCell, keyPersona] of [
      ['Edad', ageOrder, (c: TargetCell) => c.age_range, (p: Persona) => ageRangeOf(p.age)],
      ['Género', genderOrder, (c: TargetCell) => c.gender, (p: Persona) => p.gender],
      ['Ingreso (AMAI)', incomeOrder, (c: TargetCell) => c.income_band, (p: Persona) => p.income_band],
    ] as const) {
      const tw = tallyWeighted(cells, keyCell as (c: TargetCell) => string, (c) => c.count);
      const rp = tallyPersonas(ppl, keyPersona as (p: Persona) => string);
      anyFlagged =
        reportDimension({
          label,
          order,
          target: proportions(tw.counts, tw.total),
          realized: proportions(rp.counts, rp.total),
        }) || anyFlagged;
    }

    // education: target from the marginal %, realized from personas.
    const marginal = eduMarginals[alc] ?? ({} as Record<Education, number>);
    const marginalTotal = EDUCATION_LEVELS.reduce((s, l) => s + (marginal[l] ?? 0), 0);
    const eduTarget = new Map<string, number>();
    for (const lvl of EDUCATION_LEVELS) {
      eduTarget.set(lvl, marginalTotal > 0 ? ((marginal[lvl] ?? 0) / marginalTotal) * 100 : 0);
    }
    const eduRealized = tallyPersonas(ppl, (p) => p.education);
    anyFlagged =
      reportDimension({
        label: 'Escolaridad (marginal)',
        order: EDUCATION_LEVELS,
        target: eduTarget,
        realized: proportions(eduRealized.counts, eduRealized.total),
      }) || anyFlagged;

    console.log('');
  }

  console.log(
    anyFlagged
      ? '>> FLAG: at least one marginal deviates >=5pp from target (see arrows above).'
      : '>> OK: every marginal is within 5pp of target.',
  );
}

// --- Persona set assembly ----------------------------------------------------

type AllocatedTargetCell = TargetCell & { personaCount: number };

interface GenerationResult {
  personas: Persona[];
  failed: FailedPersona[];
}

/**
 * Generate one persona with a single retry on invalid/failed JSON, then give up
 * and record a failure (the run continues — §5.3 "one retry, then mark failed").
 */
async function generateOne(
  cell: TargetCell,
  education: Education,
  index: number,
  dryRun: boolean,
  client: Anthropic | null,
): Promise<{ persona?: Persona; error?: string }> {
  const attempt = async (): Promise<Persona> => {
    const g = dryRun
      ? stubGenerate(cell, education, index)
      : await callModel(client as Anthropic, cell, education);
    const persona = assemble(cell, education, g);
    const errors = validatePersona(persona, cell);
    if (errors.length > 0) throw new Error(errors.join('; '));
    return persona;
  };

  try {
    return { persona: await attempt() };
  } catch (first) {
    try {
      return { persona: await attempt() }; // one retry (direct call)
    } catch (second) {
      const reason = second instanceof Error ? second.message : String(second);
      return { error: reason };
    }
  }
}

async function generateSet(
  allocated: AllocatedTargetCell[],
  eduMarginals: Record<string, Record<Education, number>>,
  dryRun: boolean,
): Promise<GenerationResult> {
  const client = dryRun ? null : getAnthropicClient();

  // Education is a MARGINAL: build one assignment sequence per alcaldía (length
  // = that alcaldía's persona total) so the realized education distribution
  // matches _meta.education_marginals exactly, then consume it as we walk cells.
  const eduQueues = new Map<Alcaldia, Education[]>();
  for (const alc of new Set(allocated.map((c) => c.alcaldia))) {
    const n = allocated
      .filter((c) => c.alcaldia === alc)
      .reduce((s, c) => s + c.personaCount, 0);
    eduQueues.set(alc, buildEducationSequence(n, eduMarginals[alc]));
  }
  const eduPtr = new Map<Alcaldia, number>();

  const personas: Persona[] = [];
  const failed: FailedPersona[] = [];
  let index = 0;
  let done = 0;
  const totalTarget = allocated.reduce((s, c) => s + c.personaCount, 0);

  for (const cell of allocated) {
    for (let i = 0; i < cell.personaCount; i++) {
      const queue = eduQueues.get(cell.alcaldia) ?? [];
      const ptr = eduPtr.get(cell.alcaldia) ?? 0;
      const education = queue[ptr] ?? 'secundaria';
      eduPtr.set(cell.alcaldia, ptr + 1);

      const { persona, error } = await generateOne(cell, education, index, dryRun, client);
      if (persona) {
        personas.push(persona);
      } else {
        failed.push({
          index,
          alcaldia: cell.alcaldia,
          age_range: cell.age_range,
          gender: cell.gender,
          income_band: cell.income_band,
          education,
          reason: error ?? 'unknown',
        });
      }
      index++;
      done++;
      if (!dryRun && done % 10 === 0) {
        console.log(`  ...generated ${done}/${totalTarget}`);
      }
    }
  }

  return { personas, failed };
}

// --- Load + shape helpers ----------------------------------------------------

function loadTargets(path: string): TargetsFile {
  const parsed = JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as TargetsFile;
  if (!Array.isArray(parsed.cells) || parsed.cells.length === 0) {
    throw new Error(`No cells found in ${path}`);
  }
  return parsed;
}

/** Re-validate personas loaded from a hand-edited JSON, deriving the cell. */
function revalidateLoaded(personas: Persona[]): GenerationResult {
  const ok: Persona[] = [];
  const failed: FailedPersona[] = [];
  personas.forEach((p, index) => {
    const cell: TargetCell = {
      alcaldia: p.alcaldia,
      count: 0,
      age_range: ageRangeOf(p.age),
      gender: p.gender,
      education: null,
      income_band: p.income_band,
    };
    const errors = validatePersona(p, cell);
    if (errors.length === 0) {
      ok.push(p);
    } else {
      failed.push({
        index,
        alcaldia: p.alcaldia,
        age_range: cell.age_range,
        gender: p.gender,
        income_band: p.income_band,
        education: p.education,
        reason: errors.join('; '),
      });
    }
  });
  return { personas: ok, failed };
}

// --- Main --------------------------------------------------------------------

async function main(): Promise<void> {
  const cli = parseCli(process.argv);
  if (cli.help) {
    console.log(USAGE);
    return;
  }

  const targetsFile = loadTargets(cli.targetsPath);
  const eduMarginals = targetsFile._meta.education_marginals;

  // --from-json: re-validate + re-emit SQL, no model, no allocation.
  if (cli.fromJson) {
    console.log(`Re-emitting from ${cli.fromJson} (no model call)...`);
    const raw = JSON.parse(
      readFileSync(resolve(process.cwd(), cli.fromJson), 'utf8'),
    ) as unknown;
    const loaded: Persona[] = Array.isArray(raw)
      ? (raw as Persona[])
      : ((raw as { personas?: Persona[] }).personas ?? []);
    if (loaded.length === 0) throw new Error('No personas found in --from-json input');

    const { personas, failed } = revalidateLoaded(loaded);
    const validity = (personas.length / loaded.length) * 100;
    console.log(
      `Re-validated ${loaded.length}: ${personas.length} valid, ${failed.length} invalid (${validity.toFixed(1)}%).`,
    );
    for (const f of failed) console.log(`  invalid #${f.index}: ${f.reason}`);

    // Build allocated view purely for the report's weight-based targets.
    const allocated = allocatePersonaCounts(
      targetsFile.cells,
      targetsFile._meta.normalization.targets,
    ) as AllocatedTargetCell[];
    printDistributionReport(allocated, personas, eduMarginals);

    writeFileSync(resolve(process.cwd(), cli.sqlOutPath), emitSql(personas), 'utf8');
    console.log(`\nWrote SQL -> ${cli.sqlOutPath} (${personas.length} rows)`);
    return;
  }

  if (!cli.dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ANTHROPIC_API_KEY is not set. Set it in the environment / .env.local for a real run,\n' +
        'or use --dry-run to exercise the full pipeline with deterministic stub personas.',
    );
    process.exit(1);
  }

  // 1) Normalize weights → exact 100/50/150 via the tested Hamilton allocator.
  const allocated = allocatePersonaCounts(
    targetsFile.cells,
    targetsFile._meta.normalization.targets,
  ) as AllocatedTargetCell[];

  const byAlcaldia = new Map<string, number>();
  for (const c of allocated) {
    byAlcaldia.set(c.alcaldia, (byAlcaldia.get(c.alcaldia) ?? 0) + c.personaCount);
  }
  const grandTotal = [...byAlcaldia.values()].reduce((s, v) => s + v, 0);
  console.log(`Persona set: ${targetsFile._meta.version}`);
  console.log(`Mode: ${cli.dryRun ? 'DRY-RUN (stub personas, no API)' : `REAL (${MODELS.CREATIVE})`}`);
  console.log('Allocation (Hamilton):');
  for (const [alc, n] of byAlcaldia) console.log(`  ${alc}: ${n}`);
  console.log(`  TOTAL: ${grandTotal}`);

  // 2) Generate personas per cell (education distributed as a marginal).
  const { personas, failed } = await generateSet(allocated, eduMarginals, cli.dryRun);

  // 3) Completion / validity rate.
  const validity = (personas.length / grandTotal) * 100;
  console.log(
    `\nGenerated ${personas.length}/${grandTotal} valid personas (${validity.toFixed(1)}%); ${failed.length} failed.`,
  );
  for (const f of failed.slice(0, 20)) {
    console.log(`  failed #${f.index} [${f.alcaldia} ${f.age_range} ${f.gender} ${f.income_band}]: ${f.reason}`);
  }

  // 4) Outputs: JSON + SQL.
  const jsonOut = {
    version: targetsFile._meta.version,
    generated_at: new Date().toISOString(),
    model: cli.dryRun ? 'stub' : MODELS.CREATIVE,
    source_targets: cli.targetsPath,
    counts: { target: grandTotal, generated: personas.length, failed: failed.length },
    personas,
    failed,
  };
  writeFileSync(resolve(process.cwd(), cli.outPath), JSON.stringify(jsonOut, null, 2), 'utf8');
  writeFileSync(resolve(process.cwd(), cli.sqlOutPath), emitSql(personas), 'utf8');
  console.log(`\nWrote personas JSON -> ${cli.outPath}`);
  console.log(`Wrote SQL          -> ${cli.sqlOutPath} (${personas.length} rows)`);

  // 5) Distribution report.
  printDistributionReport(allocated, personas, eduMarginals);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
