import Link from 'next/link'
import { copy } from '@/lib/ciceron/copy/es-MX'

export function EmptyState({
  title = copy.empty.title,
  children,
  href,
  cta,
}: {
  title?: string
  children: React.ReactNode
  href?: string
  cta?: string
}) {
  return (
    <div className="cic-empty" role="status">
      <h2>{title}</h2>
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
