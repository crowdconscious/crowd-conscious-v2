import { buildWeekStrip } from '@/lib/ciceron/deadlines/countdown-pure'
import { copy } from '@/lib/ciceron/copy/es-MX'

export function WeekDeadlineStrip({ dueAts }: { dueAts: string[] }) {
  const week = buildWeekStrip(dueAts)
  const hasAny = week.some((d) => d.deadlineCount > 0)

  return (
    <section className="cic-week-strip" aria-labelledby="week-strip-title">
      <h2 id="week-strip-title" className="cic-h2">
        {copy.hoy.weekStripTitle}
      </h2>
      <p className="cic-muted cic-week-strip-lead">{copy.hoy.weekStripLead}</p>
      <ol className="cic-week-strip-grid">
        {week.map((day) => (
          <li
            key={day.iso}
            className={`cic-week-strip-day${day.isToday ? ' is-today' : ''}${day.isWeekend ? ' is-weekend' : ''}${day.deadlineCount > 0 ? ' has-deadline' : ''}`}
          >
            <span className="cic-week-strip-wd">{day.weekdayLabel}</span>
            <span className="cic-week-strip-num">{day.dayNumber}</span>
            {day.deadlineCount > 0 ? (
              <span className="cic-week-strip-dot" aria-label={`${day.deadlineCount} plazos`}>
                {day.deadlineCount}
              </span>
            ) : (
              <span className="cic-week-strip-dot is-empty" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
      {!hasAny ? (
        <p className="cic-muted" role="status">
          {copy.hoy.weekStripEmpty}
        </p>
      ) : null}
    </section>
  )
}
