/**
 * Prompt templates + strict parsers for the Pulse Simulation panel (§5.4).
 *
 * Two prompt surfaces live here:
 *  1. The per-persona AGENT prompt (Haiku): a system prompt that turns a persona
 *     row into a CDMX resident, and a user prompt that shows ONLY what a real
 *     voter sees (question + description + options) — deliberately no injected
 *     news/context, so we measure the model's read of the population, not our
 *     retrieval (§5.4).
 *  2. The per-run SYNTHESIS prompt (Sonnet): summarizes a completed run's
 *     aggregates + sampled reasonings (+ real aggregates once the Pulse closed)
 *     into strict JSON for the reveal UI and content angle.
 *
 * Plus `parseAgentVote`, which validates a single model vote WITHOUT throwing —
 * the pipeline (§5.5) marks a bad vote failed and tracks `completion_rate`.
 *
 * MODEL SELECTION LIVES IN THE PIPELINE, NOT HERE. To avoid hardcoding Anthropic
 * model IDs in two places (§1), this module intentionally imports no model
 * constant: the pipeline (`lib/simulation/run.ts`) picks `MODELS.FAST` (Haiku,
 * per §5.5 the Batch panel) for the agent calls and `MODELS.CREATIVE` (Sonnet)
 * for synthesis, both from `lib/agents/config.ts`. Keeping this module free of
 * that import also keeps it pure and runnable under the `node --test` TS runner
 * (which does not resolve the `@/` path alias that `config.ts` depends on).
 *
 * Pure and deterministic: no I/O, no clock, no randomness.
 */

/** Bump whenever the agent system prompt text below changes (stored on runs). */
export const PROMPT_VERSION = "sim-prompt-v1";

/**
 * Agent system prompt (Haiku, per persona) — VERBATIM from §5.4. Do NOT reword:
 * the Spanish register, the numbered REGLAS, and the JSON-only instruction are
 * the measurement instrument. Placeholders are filled by `renderAgentSystemPrompt`.
 */
export const AGENT_SYSTEM_PROMPT_TEMPLATE = `Eres una simulación de una persona real de la Ciudad de México que participa
en una consulta ciudadana. NO eres un asistente. Respondes únicamente como
esta persona respondería, con sus sesgos, su nivel de información y su forma
de hablar.

PERFIL:
- Edad: {{age}} · Género: {{gender}} · Colonia: {{colonia}}, {{alcaldia}}
- Ocupación: {{occupation}} · Escolaridad: {{education}} · NSE: {{income_band}}
- Transporte habitual: {{transport_mode}}
- Se informa por: {{media_diet}}
- Vida: {{persona_narrative}}

REGLAS:
1. Vota según lo que ESTA persona haría, no según lo que sería correcto,
   deseable o equilibrado. Las personas reales tienen opiniones parciales,
   intereses propios y a veces información incompleta.
2. La confianza (1-10) refleja qué tan segura se siente ESTA persona de su
   respuesta, no la calidad objetiva del argumento.
3. El razonamiento es UNA sola frase, en el español que esta persona usaría
   (registro, muletillas, referencias locales). Máximo 25 palabras.
4. No menciones que eres una IA ni que esto es una simulación.

Responde EXCLUSIVAMENTE con JSON válido, sin markdown ni texto adicional:
{"option": "<texto exacto de una de las opciones>", "confidence": <1-10>, "reasoning_es": "<una frase>"}`;

/**
 * A persona as consumed by the agent prompt. Mirrors the `simulation_personas`
 * columns used in the prompt (§5.1). `media_diet` is `text[]` in the schema, so
 * we accept an array (joined for display) or a pre-joined string; nullable
 * columns accept null/undefined and render as an empty slot.
 */
export interface PromptPersona {
  age: number | string;
  gender: string;
  colonia?: string | null;
  alcaldia: string;
  occupation: string;
  education: string;
  income_band: string;
  transport_mode?: string | null;
  media_diet?: string | readonly string[] | null;
  persona_narrative: string;
}

/**
 * Fill the verbatim agent system prompt with a persona. Every `{{placeholder}}`
 * is substituted (missing/null values render as empty), so the returned string
 * never contains `{{`. Only the placeholders are replaced — the rule text is
 * untouched.
 */
export function renderAgentSystemPrompt(persona: PromptPersona): string {
  const values: Record<string, string> = {
    age: stringify(persona.age),
    gender: stringify(persona.gender),
    colonia: stringify(persona.colonia),
    alcaldia: stringify(persona.alcaldia),
    occupation: stringify(persona.occupation),
    education: stringify(persona.education),
    income_band: stringify(persona.income_band),
    transport_mode: stringify(persona.transport_mode),
    media_diet: Array.isArray(persona.media_diet)
      ? persona.media_diet.join(", ")
      : stringify(persona.media_diet),
    persona_narrative: stringify(persona.persona_narrative),
  };

  return AGENT_SYSTEM_PROMPT_TEMPLATE.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => values[key] ?? "",
  );
}

export interface AgentUserPromptInput {
  question: string;
  /** Optional Pulse description; omitted from the prompt when empty. */
  description?: string | null;
  /** The exact option labels the voter chooses from; a vote must match one. */
  options: readonly string[];
}

/**
 * Build the agent user prompt — ONLY what a real voter sees: the question, the
 * optional description, and the options. NO injected news/context by design
 * (§5.4): we measure the model's read of the population, not our retrieval.
 * The options are echoed verbatim so the model can return one exactly.
 */
export function buildAgentUserPrompt({
  question,
  description,
  options,
}: AgentUserPromptInput): string {
  const parts: string[] = [question.trim()];

  const desc = (description ?? "").trim();
  if (desc.length > 0) parts.push(desc);

  const optionLines = options
    .map((option) => `- ${option}`)
    .join("\n");
  parts.push(`Opciones:\n${optionLines}`);

  return parts.join("\n\n");
}

/**
 * Synthesis system prompt (Sonnet, one call per run) — §5.4. Encodes the rules
 * (never describe simulated data as real opinion; be numeric; if divergence is
 * high, the divergence IS the finding) and the strict output schema. Written in
 * formal Mexican Spanish per repo conventions (§1). The run data is supplied by
 * `buildSynthesisUserPrompt`.
 */
export const SYNTHESIS_SYSTEM_PROMPT = `Eres el analista de una simulación de opinión ciudadana de Crowd Conscious.
Recibes los agregados de un panel de personas SINTÉTICAS (generadas por IA) que
"votaron" un Pulse, junto con una muestra de sus razonamientos, y cuando el
Pulse ya cerró, los agregados REALES de la ciudadanía.

REGLAS:
1. Estos datos son de una SIMULACIÓN de IA. Nunca los describas como opinión
   real de la gente. Habla de "el panel simulado" o "la IA", no de "los
   ciudadanos".
2. Sé numérico: cita porcentajes de opción y niveles de confianza concretos.
3. Cuando exista divergencia entre la simulación y lo real, la divergencia ES
   el hallazgo: explícala, no la suavices.
4. Apolítico: no respaldas partidos, candidatos ni funcionarios; juzgas
   condiciones, no administraciones.
5. Español formal de México en resumen_es; inglés claro en resumen_en.

Responde EXCLUSIVAMENTE con JSON válido, sin markdown ni texto adicional, con
exactamente esta forma:
{"resumen_es": "<2-3 frases>", "resumen_en": "<2-3 sentences>", "divergencias_clave": ["<hallazgo 1>", "<hallazgo 2>", "<hallazgo 3>"], "hipotesis_divergencia": "<por qué difieren simulación y realidad, o por qué coinciden>", "cita_sim_representativa": "<un razonamiento del panel, textual>", "angulo_contenido": "<ángulo editorial de una frase>"}`;

/** One sampled agent reasoning, stratified by option for the synthesis prompt. */
export interface SampledReasoning {
  option: string;
  confidence: number;
  reasoning_es: string;
}

export interface SynthesisUserPromptInput {
  /** The Pulse question the panel answered. */
  question: string;
  /** Simulated run aggregates (`simulation_runs.aggregates`, §5.5). */
  simAggregates: {
    option_shares: Readonly<Record<string, number>>;
    avg_confidence_by_option: Readonly<Record<string, number>>;
    completion_rate?: number;
  };
  /** Up to ~30 sampled reasonings, stratified by option (§5.4). */
  sampledReasonings: readonly SampledReasoning[];
  /** Real aggregates — present ONLY once the Pulse has closed (§5.4). */
  realAggregates?: {
    option_shares: Readonly<Record<string, number>>;
    avg_confidence_by_option: Readonly<Record<string, number>>;
  } | null;
}

/**
 * Build the synthesis user prompt from a completed run's data. Real aggregates
 * are included only when provided (Pulse closed); otherwise the block is omitted
 * and the model is told the real comparison is not yet available.
 */
export function buildSynthesisUserPrompt({
  question,
  simAggregates,
  sampledReasonings,
  realAggregates,
}: SynthesisUserPromptInput): string {
  const parts: string[] = [`PREGUNTA DEL PULSE:\n${question.trim()}`];

  parts.push(
    `AGREGADOS SIMULADOS:\n${formatAggregates(
      simAggregates.option_shares,
      simAggregates.avg_confidence_by_option,
    )}` +
      (typeof simAggregates.completion_rate === "number"
        ? `\nTasa de compleción: ${formatPct(simAggregates.completion_rate)}`
        : ""),
  );

  if (realAggregates) {
    parts.push(
      `AGREGADOS REALES (Pulse cerrado):\n${formatAggregates(
        realAggregates.option_shares,
        realAggregates.avg_confidence_by_option,
      )}`,
    );
  } else {
    parts.push(
      "AGREGADOS REALES: aún no disponibles (el Pulse no ha cerrado). No inventes cifras reales.",
    );
  }

  const reasoningLines = sampledReasonings
    .map((r) => `- [${r.option} · confianza ${r.confidence}/10] ${r.reasoning_es}`)
    .join("\n");
  parts.push(
    `RAZONAMIENTOS MUESTREADOS DEL PANEL SIMULADO:\n${
      reasoningLines.length > 0 ? reasoningLines : "(ninguno)"
    }`,
  );

  return parts.join("\n\n");
}

/** Result of validating a single raw agent response. Never thrown — returned. */
export interface AgentVote {
  option: string;
  confidence: number;
  reasoning_es: string;
}

export type ParseAgentVoteResult =
  | { ok: true; vote: AgentVote }
  | { ok: false; error: string };

/**
 * Upper bound on a reasoning string. Rule 3 asks for one phrase, "Máximo 25
 * palabras"; we allow generous slack (models occasionally run long) but reject
 * clearly-not-a-sentence dumps. Length is measured in characters.
 */
export const MAX_REASONING_LENGTH = 500;

/**
 * Validate a single raw model response into a vote, WITHOUT throwing (§5.5: the
 * caller marks a bad vote failed and tracks completion_rate). Requirements:
 * - Parses as a single strict JSON object (accidental ```json fences tolerated).
 * - `option` is a string that EXACTLY matches one of `allowedOptions`.
 * - `confidence` is an integer in 1–10.
 * - `reasoning_es` is a non-empty string no longer than `MAX_REASONING_LENGTH`.
 *
 * @param raw the model's raw text output
 * @param allowedOptions the exact option labels shown to this agent
 */
export function parseAgentVote(
  raw: unknown,
  allowedOptions: readonly string[],
): ParseAgentVoteResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, error: "empty response" };
  }

  const stripped = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { ok: false, error: "invalid JSON" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "not a JSON object" };
  }

  const obj = parsed as Record<string, unknown>;
  const { option, confidence, reasoning_es } = obj;

  if (typeof option !== "string") {
    return { ok: false, error: "option missing or not a string" };
  }
  if (!allowedOptions.includes(option)) {
    return { ok: false, error: "option not in allowed options" };
  }

  if (typeof confidence !== "number" || !Number.isInteger(confidence)) {
    return { ok: false, error: "confidence must be an integer" };
  }
  if (confidence < 1 || confidence > 10) {
    return { ok: false, error: "confidence out of range 1-10" };
  }

  if (typeof reasoning_es !== "string" || reasoning_es.trim().length === 0) {
    return { ok: false, error: "reasoning_es missing or empty" };
  }
  if (reasoning_es.length > MAX_REASONING_LENGTH) {
    return { ok: false, error: "reasoning_es too long" };
  }

  return { ok: true, vote: { option, confidence, reasoning_es } };
}

/**
 * Strip a single wrapping markdown code fence if present (```json … ``` or
 * ``` … ```). Defensive only — we still require the inside to be valid JSON.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z0-9]*\s*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

function formatAggregates(
  shares: Readonly<Record<string, number>>,
  confidence: Readonly<Record<string, number>>,
): string {
  const options = new Set<string>([
    ...Object.keys(shares),
    ...Object.keys(confidence),
  ]);
  const lines: string[] = [];
  for (const option of options) {
    const share = shares[option];
    const conf = confidence[option];
    const sharePart =
      typeof share === "number" ? `${formatPct(share)}` : "s/d";
    const confPart =
      typeof conf === "number" ? `confianza ${round1(conf)}/10` : "confianza s/d";
    lines.push(`- ${option}: ${sharePart} · ${confPart}`);
  }
  return lines.join("\n");
}

function formatPct(fraction: number): string {
  return `${round1(fraction * 100)}%`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}
