import React from 'react'
import { Text, Section } from '@react-email/components'
import {
  SignalsEmailLayout,
  ButtonLink,
  signalDetailUrl,
  signalsEmailColors as C,
} from './SignalsEmailLayout'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

export interface FilerPublishedEmailProps {
  locale: CitizenSignalsLocale
  signalTitle: string
  signalSlug: string
  filerName?: string | null
}

/**
 * Sent when a moderator approves/publishes a signal. Encourages the filer
 * to share the public URL so the signal can collect co-signs toward the
 * stage 1 threshold.
 */
export function FilerPublishedEmail({
  locale,
  signalTitle,
  signalSlug,
  filerName,
}: FilerPublishedEmailProps) {
  const isEs = locale === 'es'
  const greeting = filerName
    ? isEs
      ? `Hola ${filerName},`
      : `Hi ${filerName},`
    : isEs
      ? 'Hola,'
      : 'Hi there,'

  const title = isEs
    ? 'Tu señal ya es pública'
    : 'Your signal is now public'
  const preview = isEs
    ? 'La aprobamos y ya aparece en el feed.'
    : 'We approved it — it is live in the feed.'

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
          ? 'Aprobamos tu señal y ya está visible en el feed público. Comparte el enlace con vecinos: las co-firmas son las que llevan tu señal al destinatario.'
          : 'We approved your signal and it is now visible in the public feed. Share the link with neighbours — co-signs are what carry your signal to the target.'}
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
          {isEs ? 'Señal publicada' : 'Published signal'}
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
          {isEs ? 'Ver y compartir la señal' : 'View and share the signal'}
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
          ? 'Cuando suficientes vecinos co-firmen, notificaremos al destinatario y te avisaremos.'
          : 'When enough neighbours co-sign, we notify the target and let you know.'}
      </Text>
    </SignalsEmailLayout>
  )
}

export default FilerPublishedEmail
