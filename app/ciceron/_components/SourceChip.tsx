import { copy } from '@/lib/ciceron/copy/es-MX'

export function SourceChip({
  authority,
  type,
  date,
  href,
}: {
  authority: string
  type: string
  date: string
  href: string
}) {
  return (
    <a
      className="cic-source"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={copy.components.openSource}
    >
      {authority} · {type} · {date}
    </a>
  )
}
