/** Pure feedback-loop helpers (no server-only) for tests and UI. */

const REASON_SUGGESTIONS: Record<string, string> = {
  wrong_authority:
    'Ha marcado tres alertas como no relevantes por autoridad incorrecta. ¿Desea quitar esa autoridad del perfil de vigilancia?',
  wrong_topic:
    'Ha marcado tres alertas como no relevantes por tema incorrecto. ¿Desea ajustar las materias del perfil de vigilancia?',
  already_known:
    'Ha marcado tres alertas como ya conocidas. ¿Desea restringir las palabras clave del perfil?',
}

export function suggestionForReason(reasonCode: string, count: number): string | null {
  if (count < 3) return null
  return (
    REASON_SUGGESTIONS[reasonCode] ??
    `Ha marcado tres alertas como no relevantes por el mismo motivo (${reasonCode}). ¿Desea editar el perfil de vigilancia?`
  )
}

export function reasonSuggestionText(reasonCode: string): string | undefined {
  return REASON_SUGGESTIONS[reasonCode]
}
