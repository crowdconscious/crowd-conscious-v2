'use client'

import { useState, useTransition } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { parseManualCaptureAction } from '@/lib/ciceron/case-files/actions'

export function ManualCaptureForm() {
  const [pending, start] = useTransition()
  const [preview, setPreview] = useState<{
    event: Record<string, unknown>
    proposed: Array<Record<string, unknown>>
  } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="cic-card" style={{ marginTop: 16 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          start(async () => {
            const r = await parseManualCaptureAction(fd)
            setMsg(r.message ?? null)
            if (r.ok && r.payload) {
              setPreview({
                event: r.payload.event as Record<string, unknown>,
                proposed: (r.payload.proposed as Array<Record<string, unknown>>) ?? [],
              })
            }
          })
        }}
      >
        <label style={{ display: 'block', marginBottom: 10 }}>
          <span className="cic-muted" style={{ fontSize: '0.75rem' }}>Tipo</span>
          <select className="cic-input" name="kind" defaultValue="paste" style={{ marginTop: 4, width: '100%' }}>
            <option value="paste">Texto pegado</option>
            <option value="email">Correo reenviado</option>
            <option value="pdf">PDF (con nota textual)</option>
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 10 }}>
          <span className="cic-muted" style={{ fontSize: '0.75rem' }}>Texto / cuerpo</span>
          <textarea
            className="cic-input"
            name="text"
            rows={8}
            required
            style={{ marginTop: 4, width: '100%' }}
            placeholder="Pegue el acuerdo o la notificación que usted consultó en el portal oficial…"
          />
        </label>
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: '1fr 1fr',
            marginBottom: 12,
          }}
        >
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>Tribunal (opcional)</span>
            <input className="cic-input" name="courtNameHint" style={{ marginTop: 4, width: '100%' }} />
          </label>
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>Expediente (opcional)</span>
            <input className="cic-input" name="fileNumberHint" style={{ marginTop: 4, width: '100%' }} />
          </label>
        </div>
        <button type="submit" className="cic-btn" disabled={pending}>
          Analizar para confirmación
        </button>
      </form>

      {preview ? (
        <div style={{ marginTop: 20 }}>
          <h2 className="cic-h2" style={{ fontSize: '1rem' }}>
            {copy.expedientes.parsePreview}
          </h2>
          <pre className="cic-legal" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {JSON.stringify(preview.event, null, 2)}
          </pre>
          {preview.proposed.length > 0 ? (
            <>
              <h3 className="cic-h2" style={{ fontSize: '0.95rem', marginTop: 12 }}>
                {copy.expedientes.proposeDeadlines}
              </h3>
              <ul>
                {preview.proposed.map((p, i) => (
                  <li key={i} className="cic-muted" style={{ marginBottom: 8 }}>
                    <strong>{String(p.dueIso)}</strong> — {String(p.computationText)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="cic-muted">No hay reglas de plazo para este tipo de actuación.</p>
          )}
          <p className="cic-muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>
            En la demostración, confirme el análisis y guarde desde el expediente correspondiente.
            El original se conserva en el archivo del despacho.
          </p>
        </div>
      ) : null}
      {msg ? <p className="cic-muted" style={{ marginTop: 10 }}>{msg}</p> : null}
    </div>
  )
}
