import React from 'react'
import { Text, Section, Link, Row, Column } from '@react-email/components'
import {
  SignalsEmailLayout,
  signalsAppUrl,
  signalsEmailColors as C,
} from './SignalsEmailLayout'

export interface PendingSignalSummary {
  id: string
  slug: string
  title: string
  category: string
  severity: string
  targetName: string
  hoursPending: number
  cosignCount: number
}

export interface ModeratorDailyDigestEmailProps {
  signals: PendingSignalSummary[]
  generatedAt?: Date
}

/**
 * Moderator-internal email. Always rendered in Spanish (admin team is
 * ES-default per the F13 spec). Renders a compact table of pending
 * signals with a deep-link to the admin queue. F15 cron will invoke
 * this; the helper exists today so digests can also be triggered ad-hoc.
 */
export function ModeratorDailyDigestEmail({
  signals,
  generatedAt,
}: ModeratorDailyDigestEmailProps) {
  const totalCount = signals.length
  const stale = signals.filter((s) => s.hoursPending >= 48).length
  const generatedLabel = (generatedAt ?? new Date()).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const title = `Resumen diario · ${totalCount} señales en cola`
  const preview = `${totalCount} pendientes, ${stale} con más de 48h.`

  const adminUrl = `${signalsAppUrl()}/admin/signals`

  return (
    <SignalsEmailLayout
      locale="es"
      title={title}
      preview={preview}
      audience="moderator"
    >
      <Text
        style={{
          margin: '0 0 12px',
          fontSize: '14px',
          color: C.text,
          lineHeight: 1.6,
        }}
      >
        Generado el {generatedLabel} · {totalCount}{' '}
        señales pendientes ·{' '}
        <strong style={{ color: stale > 0 ? '#fbbf24' : C.text }}>
          {stale}
        </strong>{' '}
        con más de 48 horas en cola.
      </Text>

      {totalCount === 0 ? (
        <Section
          style={{
            margin: '14px 0',
            padding: '14px 16px',
            backgroundColor: '#0b1220',
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            textAlign: 'center' as const,
          }}
        >
          <Text style={{ margin: 0, fontSize: '14px', color: C.textDim }}>
            La cola de moderación está vacía. Buen trabajo.
          </Text>
        </Section>
      ) : (
        <Section
          style={{
            margin: '14px 0',
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <Row
            style={{
              backgroundColor: '#0b1220',
              padding: '10px 14px',
            }}
          >
            <Column style={{ width: '55%' }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: '11px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  color: C.textFaint,
                  fontWeight: 600,
                }}
              >
                Señal
              </Text>
            </Column>
            <Column style={{ width: '20%' }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: '11px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  color: C.textFaint,
                  fontWeight: 600,
                }}
              >
                Categoría
              </Text>
            </Column>
            <Column style={{ width: '12%', textAlign: 'right' as const }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: '11px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  color: C.textFaint,
                  fontWeight: 600,
                }}
              >
                Co-firmas
              </Text>
            </Column>
            <Column style={{ width: '13%', textAlign: 'right' as const }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: '11px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  color: C.textFaint,
                  fontWeight: 600,
                }}
              >
                Espera
              </Text>
            </Column>
          </Row>
          {signals.map((s, idx) => (
            <Row
              key={s.id}
              style={{
                padding: '10px 14px',
                borderTop:
                  idx === 0 ? `1px solid ${C.border}` : `1px solid ${C.border}`,
                backgroundColor: idx % 2 === 0 ? C.card : '#0d1422',
              }}
            >
              <Column style={{ width: '55%' }}>
                <Link
                  href={`${signalsAppUrl()}/admin/signals?focus=${encodeURIComponent(s.id)}`}
                  style={{
                    color: C.accentSoft,
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {s.title}
                </Link>
                <Text
                  style={{
                    margin: '2px 0 0',
                    fontSize: '11px',
                    color: C.textFaint,
                  }}
                >
                  → {s.targetName} · severidad {s.severity}
                </Text>
              </Column>
              <Column style={{ width: '20%' }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: C.textDim,
                  }}
                >
                  {s.category}
                </Text>
              </Column>
              <Column style={{ width: '12%', textAlign: 'right' as const }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: C.text,
                    fontWeight: 600,
                  }}
                >
                  {s.cosignCount}
                </Text>
              </Column>
              <Column style={{ width: '13%', textAlign: 'right' as const }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: s.hoursPending >= 48 ? '#fbbf24' : C.text,
                    fontWeight: 600,
                  }}
                >
                  {s.hoursPending}h
                </Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      <Text
        style={{
          margin: '14px 0 0',
          fontSize: '12px',
          color: C.textDim,
          lineHeight: 1.6,
        }}
      >
        <Link
          href={adminUrl}
          style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}
        >
          Abrir cola de moderación →
        </Link>
      </Text>
    </SignalsEmailLayout>
  )
}

export default ModeratorDailyDigestEmail
