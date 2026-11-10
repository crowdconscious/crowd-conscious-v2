import { copy } from '@/lib/ciceron/copy/es-MX'
import type { ReviewState } from '@/lib/ciceron/demo/fixtures'

const labels: Record<ReviewState, string> = {
  borrador: copy.review.borrador,
  en_revision: copy.review.en_revision,
  aprobado: copy.review.aprobado,
  corregido: copy.review.corregido,
  rechazado: copy.review.rechazado,
}

export function ReviewBadge({ state }: { state: ReviewState }) {
  return <span className={`cic-chip cic-chip-${state}`}>{labels[state]}</span>
}
