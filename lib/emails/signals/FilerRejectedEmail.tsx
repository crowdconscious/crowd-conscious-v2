import React from 'react'
import { Text, Section } from '@react-email/components'
import {
  SignalsEmailLayout,
  ButtonLink,
  signalDetailUrl,
  signalsEmailColors as C,
} from './SignalsEmailLayout'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

export interface FilerRejectedEmailProps {
  locale: CitizenSignalsLocale
  signalTitle: string
  signalSlug: string
  filerName?: string | null
  reason?: string | null
}

/**
 * Sent when a moderator rejects a signal. The free-form `reason` from the
 * moderation event detail is shown verbatim when present so the filer
 * knows exactly why it was rejected and can submit a corrected version.
 */
export function FilerRejectedEmail({
  locale,
  signalTitle,
  signalSlug,
  filerName,
  reason,
}: FilerRejectedEmailProps) {
  const isEs = locale === 'es'
  const greeting = filerName
    ? isEs
      ? `Hola ${filerName},`
      : `Hi ${filerName},`
    : isEs
      ? 'Hola,'
      : 'Hi there,'

  const title = isEs
    ? 'No pudimos publicar tu señal'
    : 'We could not publish your signal'
  const preview = isEs
    ? 'Un moderador rechazó la señal.'
    : 'A moderator rejected the signal.'

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
          ? 'Después de revisar tu envío, un moderador decidió no publicar la siguiente señal:'
          : 'After review, a moderator decided not to publish the following signal:'}
      </Text>

      <Section
        style={{
          margin: '12px 0 16px',
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

      {reason ? (
        <Section
          style={{
            margin: '8px 0 18px',
            padding: '14px 16px',
            backgroundColor: '#1f1d0b',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '6px',
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: 600,
              color: '#fbbf24',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}
          >
            {isEs ? 'Motivo' : 'Reason'}
          </Text>
          <Text
            style={{
              margin: '6px 0 0',
              fontSize: '14px',
              color: '#fef3c7',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {reason}
          </Text>
        </Section>
      ) : null}

      <Text
        style={{
          margin: '0 0 18px',
          fontSize: '14px',
          color: C.text,
          lineHeight: 1.7,
        }}
      >
        {isEs
          ? 'Si crees que esto fue un error o quieres reescribirla, puedes crear una nueva señal con la información corregida.'
          : 'If you think this was a mistake or want to rewrite it, you can submit a new signal with corrected information.'}
      </Text>

      <Section style={{ marginTop: '8px' }}>
        <ButtonLink href={signalDetailUrl(signalSlug)}>
          {isEs ? 'Revisar la decisión' : 'Review the decision'}
        </ButtonLink>
      </Section>
    </SignalsEmailLayout>
  )
}

export default FilerRejectedEmail
