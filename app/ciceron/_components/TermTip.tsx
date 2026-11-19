/** Short plain-language tooltip for a legal/tech term kept in the UI. */
export function TermTip({
  term,
  tip,
}: {
  term: string
  tip: string
}) {
  return (
    <abbr className="cic-term-tip" title={tip}>
      {term}
    </abbr>
  )
}
