'use client'

import { copy } from '@/lib/ciceron/copy/es-MX'

export function ConfirmDialog({
  open,
  title,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="cic-palette-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="cic-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cic-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 16, borderBottom: '1px solid var(--cic-rule)' }}>
          <h2 id="cic-confirm-title" className="cic-h2" style={{ fontSize: '1.1rem' }}>
            {title}
          </h2>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 16, borderTop: '1px solid var(--cic-rule)' }}>
          <button type="button" className="cic-btn cic-btn-secondary" onClick={onCancel}>
            {copy.components.cancel}
          </button>
          <button type="button" className="cic-btn" onClick={onConfirm}>
            {copy.components.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
