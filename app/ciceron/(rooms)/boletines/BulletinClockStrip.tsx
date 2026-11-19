import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  bulletinClockStrip,
  uncoveredEntityCount,
} from '@/lib/ciceron/boletines/clock'
import type { BulletinStateBoardRow } from '@/lib/ciceron/boletines/demo-data'

export function BulletinClockStrip({
  board,
}: {
  board: BulletinStateBoardRow[]
}) {
  const clock = bulletinClockStrip()
  const uncovered = uncoveredEntityCount(board)

  return (
    <section className="cic-section cic-clock-strip" aria-labelledby="bol-clock">
      <h2 id="bol-clock" className="cic-h2">
        {copy.boletines.clockTitle}
      </h2>
      <p className="cic-muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
        Hora actual (Ciudad de México): {clock.nowHm}
      </p>
      <div className="cic-clock-grid">
        {(
          [
            ['objetivo', copy.boletines.clockObjetivo, clock.objetivo],
            ['respaldo', copy.boletines.clockRespaldo, clock.respaldo],
            ['limite', copy.boletines.clockLimite, clock.limite],
          ] as const
        ).map(([key, label, slot]) => (
          <div key={key} className="cic-clock-slot">
            <strong>{label}</strong>
            <span className="cic-clock-hm">{slot.at}</span>
            <span className="cic-muted" style={{ fontSize: '0.85rem' }}>
              {copy.boletines.clockRemaining}:{' '}
              {slot.passed ? copy.boletines.clockPassed : slot.label}
            </span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 12 }}>
        <strong>{copy.boletines.clockUncovered}:</strong> {uncovered}
      </p>
    </section>
  )
}
