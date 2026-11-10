import { copy } from '@/lib/ciceron/copy/es-MX'

export function EmptyState({
  title = copy.empty.title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="cic-empty" role="status">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  )
}
