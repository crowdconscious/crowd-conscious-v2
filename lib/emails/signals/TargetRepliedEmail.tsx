import React from 'react'
import { Text, Section } from '@react-email/components'
import {
  SignalsEmailLayout,
  ButtonLink,
  signalDetailUrl,
  signalsEmailColors as C,
} from './SignalsEmailLayout'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

export type TargetReplyStatus = 'acknowledged' | 'in_progress' | 'resolved'

export interface TargetRepliedEmailProps {
  locale: CitizenSignalsLocale
  signalTitle: string
  signalSlug: string
  filerName?: string | null
  authorLabel: string
  officialStatus: TargetReplyStatus
  responseBody: string
}

function statusLabel(
  locale: CitizenSignalsLocale,
  status: TargetReplyStatus
): string {
  const isEs = locale === 'es'
  switch (status) {
    case 'acknowledged':
      return isEs ? 'Recibido' : 'Acknowledged'
    case 'in_progress':
      return isEs ? 'En análisis' : 'In progress'
    case 'resolved':
      return isEs ? 'Resuelto' : 'Resolved'
  }
}

/**
 * Sent to the original filer when the target rep posts an official
 * response via /api/target/respond. Quotes the response body verbatim
 * (long-form responses are clipped client-side; we send the full body).
 */
export function TargetRepliedEmail({
  locale,
  signalTitle,
  signalSlug,
  filerName,
  authorLabel,
  officialStatus,
  responseBody,
}: TargetRepliedEmailProps) {
  const isEs = locale === 'es'
  const greeting = filerName
    ? isEs
      ? `Hola ${filerName},`
      : `Hi ${filerName},`
    : isEs
      ? 'Hola,'
      : 'Hi there,'

  const title = isEs
    ? 'Recibiste una respuesta oficial'
    : 'You received an official reply'
  const preview = isEs
    ? `${authorLabel} respondió a tu señal.`
    : `${authorLabel} replied to your signal.`

  return (
    <SignalsEmailLayout
      locale={locale}
      title={title}
      preview={preview}
      audience="filer"
    >
      <Text
        style={{
          margin: '0 0 12px',
          fontSize: '15px',
          color: C.text,
          lineHeight: 1.6,
        }}
      >
        {greeting}
      </Text>

      <Text
        style={{
          margin: '0 0 12px',
          fontSize: '14px',
          color: C.text,
          lineHeight: 1.7,
        }}
      >
        {isEs
          ? 'El destinatario de tu señal acaba de publicar una respuesta oficial.'
          : 'The target of your signal just posted an official reply.'}
      </Text>

      <Section
        style={{
          margin: '12px 0 14px',
          padding: '14px 16px',
          backgroundColor: '#0b1220',
          border: `1px solid ${C.border}`,
          borderRadius: '8px',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: '12px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: C.textFaint,
          }}
        >
          {isEs ? 'Señal' : 'Signal'}
        </Text>
        <Text
          style={{
            margin: '4px 0 0',
            fontSize: '15px',
            fontWeight: 600,
            color: C.text,
            lineHeight: 1.4,
          }}
        >
          {signalTitle}
        </Text>
      </Section>

      <Section
        style={{
          margin: '4px 0 18px',
          padding: '14px 16px',
          backgroundColor: '#0c1a2e',
          borderLeft: `3px solid ${C.accent}`,
          borderRadius: '6px',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 600,
            color: C.accentSoft,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
          }}
        >
          {authorLabel} · {statusLabel(locale, officialStatus)}
        </Text>
        <Text
          style={{
            margin: '6px 0 0',
            fontSize: '14px',
            color: C.text,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap' as const,
          }}
        >
          {responseBody}
        </Text>
      </Section>

      <Section style={{ marginTop: '8px' }}>
        <ButtonLink href={signalDetailUrl(signalSlug)}>
          {isEs ? 'Leer la respuesta pública' : 'Read the public reply'}
        </ButtonLink>
      </Section>
    </SignalsEmailLayout>
  )
}

export default TargetRepliedEmail
