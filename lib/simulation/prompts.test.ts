import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PROMPT_VERSION,
  AGENT_SYSTEM_PROMPT_TEMPLATE,
  renderAgentSystemPrompt,
  buildAgentUserPrompt,
  buildSynthesisUserPrompt,
  parseAgentVote,
  MAX_REASONING_LENGTH,
  type PromptPersona,
} from "./prompts.ts";

const OPTIONS = ["Sí, ampliar el programa", "No, mantener igual", "No sé"];

const PERSONA: PromptPersona = {
  age: 34,
  gender: "femenino",
  colonia: "Roma Norte",
  alcaldia: "Cuauhtémoc",
  occupation: "enfermera",
  education: "licenciatura",
  income_band: "C",
  transport_mode: "Metro",
  media_diet: ["Facebook", "WhatsApp"],
  persona_narrative: "Renta un departamento pequeño y cuida a su madre.",
};

test("PROMPT_VERSION is sim-prompt-v1", () => {
  assert.equal(PROMPT_VERSION, "sim-prompt-v1");
});

test("renderAgentSystemPrompt: every placeholder substituted, no {{ left", () => {
  const out = renderAgentSystemPrompt(PERSONA);
  assert.ok(!out.includes("{{"), "no unfilled placeholders remain");
  assert.ok(!out.includes("}}"), "no unfilled placeholders remain");
  // Persona values landed in the PERFIL block.
  assert.ok(out.includes("Edad: 34 · Género: femenino"));
  assert.ok(out.includes("Colonia: Roma Norte, Cuauhtémoc"));
  assert.ok(out.includes("NSE: C"));
  // media_diet array is joined for display.
  assert.ok(out.includes("Se informa por: Facebook, WhatsApp"));
  assert.ok(out.includes("Vida: Renta un departamento pequeño"));
});

test("renderAgentSystemPrompt: verbatim rule lines are present unchanged", () => {
  const out = renderAgentSystemPrompt(PERSONA);
  const verbatimLines = [
    "Eres una simulación de una persona real de la Ciudad de México que participa",
    "en una consulta ciudadana. NO eres un asistente. Respondes únicamente como",
    "1. Vota según lo que ESTA persona haría, no según lo que sería correcto,",
    "2. La confianza (1-10) refleja qué tan segura se siente ESTA persona de su",
    "3. El razonamiento es UNA sola frase, en el español que esta persona usaría",
    "   (registro, muletillas, referencias locales). Máximo 25 palabras.",
    "4. No menciones que eres una IA ni que esto es una simulación.",
    "Responde EXCLUSIVAMENTE con JSON válido, sin markdown ni texto adicional:",
    '{"option": "<texto exacto de una de las opciones>", "confidence": <1-10>, "reasoning_es": "<una frase>"}',
  ];
  for (const line of verbatimLines) {
    assert.ok(out.includes(line), `missing verbatim line: ${line}`);
  }
  // The template only differs from the rendered prompt by placeholder text.
  assert.ok(AGENT_SYSTEM_PROMPT_TEMPLATE.includes("REGLAS:"));
});

test("renderAgentSystemPrompt: null/undefined optional fields render empty, no {{ left", () => {
  const sparse: PromptPersona = {
    ...PERSONA,
    colonia: null,
    transport_mode: undefined,
    media_diet: null,
  };
  const out = renderAgentSystemPrompt(sparse);
  assert.ok(!out.includes("{{"));
  assert.ok(out.includes("Transporte habitual: \n"));
});

test("buildAgentUserPrompt: shows question, description, options — and nothing else", () => {
  const out = buildAgentUserPrompt({
    question: "¿Debería la ciudad ampliar el programa de ciclovías?",
    description: "Consulta sobre movilidad en Cuauhtémoc.",
    options: OPTIONS,
  });
  assert.ok(out.includes("¿Debería la ciudad ampliar el programa de ciclovías?"));
  assert.ok(out.includes("Consulta sobre movilidad en Cuauhtémoc."));
  assert.ok(out.includes("Opciones:"));
  for (const opt of OPTIONS) assert.ok(out.includes(`- ${opt}`));
  // No injected news/context markers (§5.4).
  assert.ok(!/noticia|contexto|fuente/i.test(out));
});

test("buildAgentUserPrompt: omits an empty description", () => {
  const out = buildAgentUserPrompt({
    question: "¿Pregunta?",
    description: "",
    options: OPTIONS,
  });
  assert.ok(out.startsWith("¿Pregunta?"));
  assert.ok(out.includes("Opciones:"));
});

test("buildSynthesisUserPrompt: omits real block until the Pulse closes", () => {
  const withoutReal = buildSynthesisUserPrompt({
    question: "¿Pregunta?",
    simAggregates: {
      option_shares: { A: 0.6, B: 0.4 },
      avg_confidence_by_option: { A: 7, B: 5 },
      completion_rate: 0.97,
    },
    sampledReasonings: [
      { option: "A", confidence: 7, reasoning_es: "Me conviene." },
    ],
  });
  assert.ok(withoutReal.includes("AGREGADOS SIMULADOS:"));
  assert.ok(withoutReal.includes("aún no disponibles"));
  assert.ok(!withoutReal.includes("Pulse cerrado"));

  const withReal = buildSynthesisUserPrompt({
    question: "¿Pregunta?",
    simAggregates: {
      option_shares: { A: 0.6, B: 0.4 },
      avg_confidence_by_option: { A: 7, B: 5 },
    },
    sampledReasonings: [],
    realAggregates: {
      option_shares: { A: 0.5, B: 0.5 },
      avg_confidence_by_option: { A: 6, B: 6 },
    },
  });
  assert.ok(withReal.includes("AGREGADOS REALES (Pulse cerrado):"));
  assert.ok(withReal.includes("(ninguno)"));
});

// --- parseAgentVote --------------------------------------------------------

test("parseAgentVote: a valid vote parses", () => {
  const raw = JSON.stringify({
    option: OPTIONS[0],
    confidence: 8,
    reasoning_es: "Ya era hora de más ciclovías, la verdad.",
  });
  const res = parseAgentVote(raw, OPTIONS);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.vote.option, OPTIONS[0]);
    assert.equal(res.vote.confidence, 8);
    assert.equal(res.vote.reasoning_es, "Ya era hora de más ciclovías, la verdad.");
  }
});

test("parseAgentVote: markdown-fenced JSON is tolerated", () => {
  const raw =
    "```json\n" +
    JSON.stringify({ option: OPTIONS[1], confidence: 5, reasoning_es: "No cambien nada." }) +
    "\n```";
  const res = parseAgentVote(raw, OPTIONS);
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.vote.option, OPTIONS[1]);
});

test("parseAgentVote: invalid JSON fails without throwing", () => {
  const res = parseAgentVote("no soy json {", OPTIONS);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /invalid JSON/);
});

test("parseAgentVote: empty / non-string input fails", () => {
  assert.equal(parseAgentVote("", OPTIONS).ok, false);
  assert.equal(parseAgentVote("   ", OPTIONS).ok, false);
  assert.equal(parseAgentVote(null, OPTIONS).ok, false);
  assert.equal(parseAgentVote(undefined, OPTIONS).ok, false);
});

test("parseAgentVote: option not in allowedOptions fails", () => {
  const raw = JSON.stringify({
    option: "Otra opción inventada",
    confidence: 5,
    reasoning_es: "Pues no sé.",
  });
  const res = parseAgentVote(raw, OPTIONS);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /not in allowed options/);
});

test("parseAgentVote: option must match EXACTLY (no trimming/casefolding)", () => {
  const raw = JSON.stringify({
    option: OPTIONS[2].toUpperCase(),
    confidence: 3,
    reasoning_es: "Ni idea.",
  });
  assert.equal(parseAgentVote(raw, OPTIONS).ok, false);
});

test("parseAgentVote: confidence out of 1-10 fails", () => {
  const low = JSON.stringify({ option: OPTIONS[0], confidence: 0, reasoning_es: "x" });
  const high = JSON.stringify({ option: OPTIONS[0], confidence: 11, reasoning_es: "x" });
  assert.equal(parseAgentVote(low, OPTIONS).ok, false);
  assert.equal(parseAgentVote(high, OPTIONS).ok, false);
});

test("parseAgentVote: non-integer confidence fails", () => {
  const raw = JSON.stringify({ option: OPTIONS[0], confidence: 7.5, reasoning_es: "x" });
  const res = parseAgentVote(raw, OPTIONS);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /integer/);
});

test("parseAgentVote: missing fields fail", () => {
  assert.equal(
    parseAgentVote(JSON.stringify({ confidence: 5, reasoning_es: "x" }), OPTIONS).ok,
    false,
  );
  assert.equal(
    parseAgentVote(JSON.stringify({ option: OPTIONS[0], reasoning_es: "x" }), OPTIONS).ok,
    false,
  );
  assert.equal(
    parseAgentVote(JSON.stringify({ option: OPTIONS[0], confidence: 5 }), OPTIONS).ok,
    false,
  );
});

test("parseAgentVote: empty reasoning_es fails", () => {
  const raw = JSON.stringify({ option: OPTIONS[0], confidence: 5, reasoning_es: "   " });
  const res = parseAgentVote(raw, OPTIONS);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /reasoning_es/);
});

test("parseAgentVote: over-long reasoning_es fails", () => {
  const raw = JSON.stringify({
    option: OPTIONS[0],
    confidence: 5,
    reasoning_es: "a".repeat(MAX_REASONING_LENGTH + 1),
  });
  const res = parseAgentVote(raw, OPTIONS);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /too long/);
});

test("parseAgentVote: a JSON array (not object) fails", () => {
  const res = parseAgentVote(JSON.stringify([{ option: OPTIONS[0] }]), OPTIONS);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /not a JSON object/);
});
