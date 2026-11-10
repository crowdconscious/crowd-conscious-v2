export function DeadlineMarker({
  label,
  urgency,
}: {
  label: string
  urgency: 'urgent' | 'soon' | 'normal'
}) {
  return <span className={`cic-deadline cic-deadline-${urgency}`}>{label}</span>
}
