import React from 'react'
import { Text, Section } from '@react-email/components'
import {
  SignalsEmailLayout,
  ButtonLink,
  signalDetailUrl,
  signalsEmailColors as C,
} from './SignalsEmailLayout'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

export interface FilerReceivedEmailProps {
  locale: CitizenSignalsLocale
  signalTitle: string
  signalSlug: string
  filerName?: string | null
}

/**
 * Sent immediately when a citizen submits a signal (publication_status =
 * pending_review). Reassures them it landed in the queue and that they'll
 * hear back once moderation decides.
 */
export function FilerReceivedEmail({
  locale,
  signalTitle,
  signalSlug,
  filerName,
}: FilerReceivedEmailProps) {
  const isEs = locale === 'es'
  const greeting = filerName
    ? isEs
      ? `Hola ${filerName},`
      : `Hi ${filerName},`
    : isEs
      ? 'Hola,'
      : 'Hi there,'

  const title = isEs ? 'Recibimos tu señal' : 'We received your signal'
  const preview = isEs
    ? 'Tu señal está en revisión.'
    : 'Your signal is under review.'

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
          ? 'Tu señal está en cola de revisión. Un moderador la leerá en las próximas 72 horas y te avisará en cuanto se publique, necesite ajustes o sea rechazada.'
          : 'Your signal is queued for review. A moderator will read it within the next 72 hours and let you know when it is published, needs edits, or is rejected.'}
      </Text>

      <Section
        style={{
          margin: '16px 0 24px',
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

      <Section style={{ marginTop: '8px' }}>
        <ButtonLink href={signalDetailUrl(signalSlug)}>
          {isEs ? 'Ver tu envío' : 'View your submission'}
        </ButtonLink>
      </Section>

      <Text
        style={{
          margin: '20px 0 0',
          fontSize: '12px',
          color: C.textDim,
          lineHeight: 1.6,
        }}
      >
        {isEs
          ? 'Guarda este enlace; será público en cuanto sea aprobada.'
          : 'Save this link; it will go public once approved.'}
      </Text>
    </SignalsEmailLayout>
  )
}

export default FilerReceivedEmail
