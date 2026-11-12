import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClientTag } from '../../_components/ClientTag'
import { EmptyState } from '../../_components/EmptyState'
import { ReviewBadge } from '../../_components/ReviewBadge'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { formatDueLabel, loadReviewInbox } from '@/lib/ciceron/review/data'
import type { ReviewTab } from '@/lib/ciceron/review/types'

function parseTab(raw: string | string[] | undefined): ReviewTab {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === 'matters' || v === 'all' || v === 'mine') return v
  return 'mine'
}

export default async function RevisionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const sp = await searchParams
  const tab = parseTab(sp.tab)
  const inbox = await loadReviewInbox(persona, tab)

  const emptyMessage =
    tab === 'mine'
      ? copy.revision.emptyMine
      : tab === 'matters'
        ? copy.revision.emptyMatters
        : copy.revision.emptyAll

  return (
    <div>
      <div className="cic-revision-header">
        <div>
          <h1 className="cic-h1">{copy.revision.title}</h1>
          <p className="cic-lead">{copy.revision.lead}</p>
        </div>
        {(persona.role === 'socio' || persona.role === 'admin') && (
          <Link href={`${CICERON_BASE}/revision/auditoria`} className="cic-btn cic-btn-secondary">
            {copy.revision.auditLink}
          </Link>
        )}
      </div>

      <nav className="cic-tabs" aria-label="Filtros de revisión">
        {(
          [
            ['mine', copy.revision.tabs.mine],
            ['matters', copy.revision.tabs.matters],
            ['all', copy.revision.tabs.all],
          ] as const
        ).map(([id, label]) => (
          <Link
            key={id}
            href={`${CICERON_BASE}/revision?tab=${id}`}
            className={tab === id ? 'cic-tab cic-tab-active' : 'cic-tab'}
            aria-current={tab === id ? 'page' : undefined}
          >
            {label}
            {id === 'mine' && inbox.mineCount > 0 ? (
              <span className="cic-badge">{inbox.mineCount}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <p className="cic-muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>
        {inbox.source === 'fixture' ? copy.revision.demoSource : copy.demoLabel}
      </p>

      {inbox.groups.length === 0 ? (
        <EmptyState title={copy.empty.title}>{emptyMessage}</EmptyState>
      ) : (
        <div className="cic-stack" style={{ marginTop: 24 }}>
          {inbox.groups.map((group) => (
            <section key={group.clientName} className="cic-section">
              <h2 className="cic-h2" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
                <ClientTag name={group.clientName} />
              </h2>
              <ul className="cic-review-list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${CICERON_BASE}/revision/${item.id}`}
                      className="cic-review-row"
                    >
                      <div className="cic-review-row-main">
                        <span className="cic-review-title">{item.title}</span>
                        <span className="cic-muted" style={{ fontSize: '0.85rem' }}>
                          {item.matterTitle}
                        </span>
                      </div>
                      <div className="cic-review-row-meta">
                        <span
                          className={
                            item.overdue ? 'cic-due cic-due-overdue' : 'cic-due'
                          }
                        >
                          {copy.revision.due}: {formatDueLabel(item.dueAt)}
                          {item.overdue ? ` · ${copy.revision.overdue}` : ''}
                        </span>
                        <span className="cic-muted" style={{ fontSize: '0.8rem' }}>
                          {copy.revision.assignee}: {item.assigneeName}
                        </span>
                        <ReviewBadge
                          state={
                            item.status === 'en_curso' ? 'en_revision' : 'borrador'
                          }
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
