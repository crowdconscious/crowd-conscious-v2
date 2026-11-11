'use client'

import {
  buildCitationIndex,
  parseAnswerBlocks,
  type AnswerSource,
} from '@/lib/ciceron/research/format-answer'

export function ResearchAnswerView({
  body,
  sources,
  activeCite,
  onCiteClick,
}: {
  body: string
  sources: AnswerSource[]
  activeCite: number | null
  onCiteClick: (n: number) => void
}) {
  const index = buildCitationIndex(body, sources)
  const blocks = parseAnswerBlocks(body, index)

  return (
    <div className="cic-answer cic-legal">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <h3 key={`h-${i}`} className="cic-answer-heading">
              {block.text}
            </h3>
          )
        }
        return (
          <p key={`p-${i}`} className="cic-answer-p">
            {block.children.map((child, j) => {
              if (child.kind === 'text') {
                return <span key={j}>{child.text}</span>
              }
              if (child.kind === 'bold') {
                return <strong key={j}>{child.text}</strong>
              }
              return (
                <button
                  key={j}
                  type="button"
                  className={`cic-cite-chip${activeCite === child.n ? ' cic-cite-chip-active' : ''}`}
                  aria-label={`Ir a evidencia ${child.n}`}
                  onClick={() => onCiteClick(child.n)}
                >
                  [{child.n}]
                </button>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}
