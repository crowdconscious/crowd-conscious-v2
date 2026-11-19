import Link from 'next/link'
import { copy } from '@/lib/ciceron/copy/es-MX'

export function EmptyState({
  title = copy.empty.title,
  children,
  href,
  cta,
  countsNote,
}: {
  title?: string
  children: React.ReactNode
  href?: string
  cta?: string
  /** Optional data-driven sentence (preferred over generic children alone). */
  countsNote?: string
}) {
  return (
    <div className="cic-empty" role="status">
      <h2>{title}</h2>
      {countsNote ? <p className="cic-empty-note">{countsNote}</p> : null}
      <div>{children}</div>
      {href && cta ? (
        <p className="cic-empty-cta">
          <Link className="cic-btn cic-btn-compact" href={href}>
            {cta}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
