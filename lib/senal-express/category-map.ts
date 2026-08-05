/**
 * Señal Express keeps its OWN friendly, camera-first category chips (banqueta,
 * bache, luminaria, …). This module is the single place that maps those chips
 * to the canonical `citizen_signals` taxonomy (`SIGNAL_CATEGORIES` in
 * `lib/i18n/citizen-signals.ts`) — the mapping the confirm step uses when it
 * publishes a routed municipality señal.
 *
 * Owner decision (§7.1): banqueta→public_space, bache→public_space,
 * luminaria→public_space, arbol→environment, basura→environment,
 * agua→water_sanitation, otro→other.
 */

import type { SignalCategory } from '@/lib/i18n/citizen-signals'

/** The friendly chips shown in the Señal Express flow. */
export const EXPRESS_CATEGORIES = [
  'banqueta',
  'bache',
  'luminaria',
  'arbol',
  'agua',
  'basura',
  'otro',
] as const

export type ExpressCategory = (typeof EXPRESS_CATEGORIES)[number]

export function isExpressCategory(value: string): value is ExpressCategory {
  return (EXPRESS_CATEGORIES as readonly string[]).includes(value)
}

/**
 * Friendly chip → canonical `SIGNAL_CATEGORIES` value. Adjustable in one place;
 * confirm-time señal creation reads exactly this map.
 */
export const EXPRESS_CATEGORY_TO_SIGNAL: Record<ExpressCategory, SignalCategory> =
  {
    banqueta: 'public_space',
    bache: 'public_space',
    luminaria: 'public_space',
    arbol: 'environment',
    basura: 'environment',
    agua: 'water_sanitation',
    otro: 'other',
  }

/** Map a friendly chip to its canonical señal category (falls back to `other`). */
export function mapExpressCategory(category: string): SignalCategory {
  return isExpressCategory(category)
    ? EXPRESS_CATEGORY_TO_SIGNAL[category]
    : 'other'
}

/** Bilingual chip labels for the flow UI. */
export const EXPRESS_CATEGORY_LABELS: Record<
  ExpressCategory,
  { es: string; en: string }
> = {
  banqueta: { es: 'Banqueta', en: 'Sidewalk' },
  bache: { es: 'Bache', en: 'Pothole' },
  luminaria: { es: 'Luminaria', en: 'Street light' },
  arbol: { es: 'Árbol', en: 'Tree' },
  agua: { es: 'Agua / fuga', en: 'Water / leak' },
  basura: { es: 'Basura', en: 'Trash' },
  otro: { es: 'Otro', en: 'Other' },
}

/** Short Spanish descriptor of the issue type, injected into the LLM prompt. */
export const EXPRESS_CATEGORY_PROMPT_ES: Record<ExpressCategory, string> = {
  banqueta: 'problema de banqueta (acera dañada, obstruida o en mal estado)',
  bache: 'bache o daño en la carpeta asfáltica de la vía pública',
  luminaria: 'luminaria pública (alumbrado apagado, dañado o faltante)',
  arbol: 'arbolado urbano (árbol en riesgo, caído o mal poda)',
  agua: 'problema de agua o saneamiento (fuga, encharcamiento, coladera)',
  basura: 'acumulación de basura o residuos en la vía pública',
  otro: 'asunto de servicios urbanos reportado por la ciudadanía',
}
