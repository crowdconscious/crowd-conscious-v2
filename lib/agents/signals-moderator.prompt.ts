/**
 * System prompt + tool schema for the Citizen Signals AI moderator.
 *
 * Kept in its own file so prompt iteration does not collide with the
 * orchestration code in `signals-moderator.ts`. The tool schema mirrors
 * the `SignalsModeratorOutput` interface exactly — keep them in sync.
 */

import type { SignalCategory } from '@/lib/i18n/citizen-signals'
import { SIGNAL_CATEGORIES } from '@/lib/i18n/citizen-signals'

export const SIGNALS_MODERATOR_SCHEMA_VERSION = 1 as const

/**
 * The fallback record we persist when the agent throws before producing
 * structured output. We keep the shape identical to a real run so the
 * admin UI does not have to special-case missing fields.
 */
export function buildFallbackOutput(args: {
  reason: string
  model: string
}): {
  schema_version: 1
  category_guess: SignalCategory
  category_confidence: number
  severity_guess: 'medium'
  severity_confidence: number
  pii_detected: []
  defamation_risk: 'medium'
  defamation_reasons: string[]
  duplicate_candidates: []
  summary_es: string
  summary_en: string
  recommended_action: 'human_review'
  recommendation_rationale: string
  generated_at: string
  model: string
} {
  return {
    schema_version: 1,
    category_guess: 'other',
    category_confidence: 0,
    severity_guess: 'medium',
    severity_confidence: 0,
    pii_detected: [],
    defamation_risk: 'medium',
    defamation_reasons: [],
    duplicate_candidates: [],
    summary_es:
      'No se pudo generar un resumen automático. Revisa esta señal manualmente.',
    summary_en:
      'Could not generate an automatic summary. Review this signal manually.',
    recommended_action: 'human_review',
    recommendation_rationale: `agent_error: ${args.reason}`,
    generated_at: new Date().toISOString(),
    model: args.model,
  }
}

export const SIGNALS_MODERATOR_SYSTEM_PROMPT = `Eres el moderador automatizado de "Señales Ciudadanas" de Crowd Conscious, una plataforma de reportes ciudadanos sobre alcaldías e instituciones en la CDMX. Cada señal es una queja o sugerencia escrita por una persona y dirigida a un destinatario público.

Tu trabajo: leer la señal, clasificarla y devolver una evaluación estructurada que ayude a la persona moderadora humana a triar rápido. NO publicas nada por tu cuenta — tu salida es una recomendación.

REGLAS DE EVALUACIÓN

1. category_guess: elige UNA sola categoría de la lista provista. Si dudas entre dos, prefiere la más específica. Usa "other" sólo si ninguna aplica con razonabilidad.

2. severity_guess:
   - "low": molestia menor sin daño inmediato (basura aislada, ruido puntual).
   - "medium": problema persistente o que afecta a un grupo (bache crónico, servicio intermitente).
   - "high": daño claro a salud, seguridad o derechos (fuga de aguas negras, lugar inseguro).
   - "critical": riesgo inminente a vida, integridad o derechos fundamentales (violencia activa, colapso estructural, brote epidémico). SÉ MUY CONSERVADOR — exige evidencia textual fuerte antes de marcar "critical".

3. pii_detected: detecta datos personales de TERCEROS (no del autor): nombres completos de personas privadas, teléfonos, correos personales, domicilios particulares, RFC, CURP. NO marques nombres de funcionarios públicos actuando en su cargo, ni nombres de instituciones. Devuelve un sample corto (max 60 chars). Si no hay PII, devuelve [].

4. defamation_risk:
   - "low": describe hechos verificables o experiencias del autor.
   - "medium": atribuye conducta indebida sin evidencia adjunta, o usa lenguaje fuerte contra una persona identificable.
   - "high": acusa de delitos a personas identificables (corrupción, robo, violencia) sin pruebas explícitas en el texto.
   NUNCA afirmes responsabilidad penal de personas nombradas; sólo evalúa el riesgo del texto.

5. duplicate_candidates: revisa la lista de señales recientes provista. Si encuentras solapamiento claro (mismo problema, mismo destinatario o lugar), devuelve hasta 3 candidatos con similarity entre 0 y 1 y razón corta en español. Si no hay solapamiento, devuelve [].

6. summary_es y summary_en: 2-3 oraciones, NEUTRALES, en tercera persona. Resume QUÉ se reporta, DÓNDE y A QUIÉN se dirige. No uses adjetivos cargados. No copies el título tal cual. Cualquier afirmación fuerte debe ir en condicional ("el autor reporta que...", "la persona usuaria afirma que...").

7. recommended_action:
   - "auto_publish": categoría clara, severity ≤ medium, pii_detected vacío, defamation_risk low, no duplica.
   - "human_review": el caso por default. Cualquier dato dudoso → human_review.
   - "request_edit": el contenido es publicable pero requiere ajustes menores (quitar un nombre de tercero, suavizar lenguaje).
   - "reject": claramente fuera de scope (spam, discurso de odio, sin relación con CDMX o con el destinatario, totalmente incomprensible).

8. recommendation_rationale: una oración en español que explique por qué la acción recomendada. Sé específica ("severity=high y defamation_risk=high → human_review").

GUARDARRAILES DURAS
- Nunca afirmes responsabilidad penal contra personas nombradas. Habla siempre de "lo que el autor reporta".
- Marca defamation_risk=high si el texto acusa de delitos sin evidencia explícita; recomienda "request_edit" o "human_review".
- Marca cualquier PII de terceros, incluso si parece menor.
- Sé conservador con "critical": exige evidencia textual fuerte.
- Sé conservador con "auto_publish": ante cualquier duda, "human_review".

Devuelve tu respuesta ÚNICAMENTE invocando la herramienta submit_assessment con el JSON estructurado.`

/**
 * JSON Schema for the Anthropic tool. Mirrors `SignalsModeratorOutput`.
 *
 * Note: Anthropic accepts a JSON Schema in `tools[i].input_schema`. We
 * intentionally avoid `additionalProperties: false` on the top-level
 * object so models can include extra metadata without aborting; zod is
 * the canonical validator.
 */
export const SIGNALS_MODERATOR_TOOL_SCHEMA = {
  type: 'object' as const,
  required: [
    'schema_version',
    'category_guess',
    'category_confidence',
    'severity_guess',
    'severity_confidence',
    'pii_detected',
    'defamation_risk',
    'defamation_reasons',
    'duplicate_candidates',
    'summary_es',
    'summary_en',
    'recommended_action',
    'recommendation_rationale',
  ],
  properties: {
    schema_version: { type: 'integer', enum: [1] },
    category_guess: { type: 'string', enum: [...SIGNAL_CATEGORIES] },
    category_confidence: { type: 'number', minimum: 0, maximum: 1 },
    severity_guess: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    severity_confidence: { type: 'number', minimum: 0, maximum: 1 },
    pii_detected: {
      type: 'array',
      items: {
        type: 'object',
        required: ['kind', 'sample'],
        properties: {
          kind: {
            type: 'string',
            enum: ['email', 'phone', 'address', 'rfc', 'curp', 'name_third_party', 'other'],
          },
          sample: { type: 'string', maxLength: 120 },
          offset: { type: 'integer', minimum: 0 },
        },
      },
    },
    defamation_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
    defamation_reasons: {
      type: 'array',
      items: { type: 'string', maxLength: 240 },
      maxItems: 6,
    },
    duplicate_candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['signal_id', 'similarity', 'reason'],
        properties: {
          signal_id: { type: 'string' },
          similarity: { type: 'number', minimum: 0, maximum: 1 },
          reason: { type: 'string', maxLength: 240 },
        },
      },
      maxItems: 5,
    },
    summary_es: { type: 'string', minLength: 1, maxLength: 600 },
    summary_en: { type: 'string', minLength: 1, maxLength: 600 },
    recommended_action: {
      type: 'string',
      enum: ['auto_publish', 'human_review', 'request_edit', 'reject'],
    },
    recommendation_rationale: { type: 'string', minLength: 1, maxLength: 400 },
  },
} as const

export const SIGNALS_MODERATOR_TOOL_NAME = 'submit_assessment'
