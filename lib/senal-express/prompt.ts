/**
 * Señal Express draft prompts (§7.1). One `MODELS.CREATIVE` (Sonnet) call turns
 * a citizen's single sentence + location + category (+ photo existence) into a
 * formal Mexican-Spanish oficio, returned as strict JSON.
 *
 * The guardrails live in BOTH places, by design:
 *  - here, in the system prompt (the model is told, in strong terms, the rules);
 *  - and in `validator.ts`, a deterministic post-parse check that FAILS the
 *    request if the model slips. Prompt = intent; validator = enforcement.
 */

import type { ExpressCategory } from './category-map'
import { EXPRESS_CATEGORY_PROMPT_ES } from './category-map'
import type { LaunchAlcaldia } from '@/lib/geo/cdmx'

export const PROMPT_VERSION = 'senal-express-oficio-v1'

/** Low temperature: this is formal drafting, not creative writing. */
export const DRAFT_TEMPERATURE = 0.3
export const DRAFT_MAX_TOKENS = 1200

/**
 * System prompt. Formal oficio register; facts ONLY from the inputs; the two
 * release-blocker prohibitions (no laws, no named/accused individuals) stated
 * explicitly and repeated. Output is strict JSON only.
 */
export const OFICIO_SYSTEM_PROMPT = `Eres un asistente que redacta oficios ciudadanos formales dirigidos a una alcaldía de la Ciudad de México. Redactas en español formal de México, con el registro de un oficio administrativo dirigido a una autoridad.

QUIÉN ESCRIBE: escribes en nombre de una persona vecina que reporta un problema de servicios urbanos. La persona vecina es quien firma; tú solo redactas. Crowd Conscious NUNCA es el quejoso.

REGLAS INQUEBRANTABLES (si rompes una, el oficio se descarta):
1. Usa ÚNICAMENTE los hechos que te da la persona: su frase, la alcaldía, la colonia o referencia de calle, la categoría del problema y si adjuntó una foto. No inventes fechas, cifras, direcciones exactas, nombres ni detalles que no estén en los datos.
2. NUNCA cites leyes, reglamentos, artículos, fracciones, códigos, normas oficiales ni la Constitución. No menciones fundamentos legales de ningún tipo. Eso lo agrega después el equipo, nunca tú.
3. NUNCA nombres ni acuses a personas concretas (funcionarios, vecinos, empleados). No uses nombres propios de personas. Te diriges a un cargo genérico, no a un individuo.
4. Sin lenguaje partidista. No menciones partidos, candidatos ni administraciones. Se juzgan las condiciones y los hechos, no a las personas ni a los gobiernos.
5. Tono respetuoso, claro y no difamatorio. Describe el problema y su afectación a la comunidad; solicita atención. Nada de insultos ni acusaciones.
6. Prosa natural, sin Markdown, sin viñetas dentro de los párrafos, sin emojis.

ESTRUCTURA DEL OFICIO (tú generas solo estas partes; la fecha, el destinatario y la firma los coloca el sistema):
- asunto: una línea breve que resume el reporte.
- cuerpo_parrafos: de 2 a 3 párrafos. El primero expone el hecho reportado y dónde ocurre; el segundo, la afectación a la comunidad; opcionalmente un tercero que refuerce la solicitud de atención. Si hay foto adjunta, puedes mencionar que se acompaña evidencia fotográfica, sin describir lo que no sabes.
- peticion: un párrafo con la solicitud concreta y respetuosa de atención o intervención de la alcaldía.
- categoria_normalizada: uno de estos valores exactos según el problema: "public_space", "environment", "water_sanitation" u "other".

Responde EXCLUSIVAMENTE con JSON válido, sin markdown ni texto adicional:
{"asunto": "<texto>", "cuerpo_parrafos": ["<parrafo 1>", "<parrafo 2>"], "peticion": "<texto>", "categoria_normalizada": "<public_space|environment|water_sanitation|other>"}`

/**
 * Extra instruction appended on the single retry after a validator failure —
 * names the exact things to remove so the retry is likely to comply.
 */
export const OFICIO_RETRY_REMINDER = `Tu respuesta anterior incumplió una regla inquebrantable. Reescribe el oficio SIN citar ninguna ley, reglamento, artículo, fracción, código ni norma; SIN nombres propios de personas ni acusaciones a individuos; y SIN lenguaje partidista. Mantén el mismo formato JSON estricto.`

export interface BuildOficioUserPromptInput {
  sentence: string
  alcaldia: LaunchAlcaldia
  destinatarioTitulo: string
  dependencia: string
  category: ExpressCategory
  colonia?: string | null
  streetReference?: string | null
  hasPhoto: boolean
}

/** Build the per-request user prompt from the citizen's inputs. */
export function buildOficioUserPrompt(input: BuildOficioUserPromptInput): string {
  const ubicacionParts: string[] = [`Alcaldía: ${input.alcaldia}`]
  if (input.colonia) ubicacionParts.push(`Colonia: ${input.colonia}`)
  if (input.streetReference)
    ubicacionParts.push(`Referencia de calle: ${input.streetReference}`)

  const categoriaDescr = EXPRESS_CATEGORY_PROMPT_ES[input.category]

  return [
    'Redacta el oficio con estos datos:',
    '',
    `Destinatario (cargo genérico): ${input.destinatarioTitulo}`,
    `Dependencia: ${input.dependencia}`,
    '',
    `Tipo de problema: ${categoriaDescr}`,
    ubicacionParts.join(' · '),
    `Evidencia fotográfica adjunta: ${input.hasPhoto ? 'sí' : 'no'}`,
    '',
    'Frase textual de la persona vecina (única fuente de hechos):',
    `"${input.sentence.trim()}"`,
  ].join('\n')
}
