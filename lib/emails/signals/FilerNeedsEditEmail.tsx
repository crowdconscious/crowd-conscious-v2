import React from 'react'
import { Text, Section } from '@react-email/components'
import {
  SignalsEmailLayout,
  ButtonLink,
  signalDetailUrl,
  signalsEmailColors as C,
} from './SignalsEmailLayout'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

export interface FilerNeedsEditEmailProps {
  locale: CitizenSignalsLocale
  signalTitle: string
  signalSlug: string
  filerName?: string | null
  moderatorNote: string
}

/**
 * Sent when a moderator flips publication_status to `needs_edit`. The
 * note from the moderation event detail is the heart of the email — the
 * filer needs to know exactly what to fix.
 */
export function FilerNeedsEditEmail({
  locale,
  signalTitle,
  signalSlug,
  filerName,
  moderatorNote,
}: FilerNeedsEditEmailProps) {
  const isEs = locale === 'es'
  const greeting = filerName
    ? isEs
      ? `Hola ${filerName},`
      : `Hi ${filerName},`
    : isEs
      ? 'Hola,'
      : 'Hi there,'

  const title = isEs
    ? 'Tu señal necesita un ajuste'
    : 'Your signal needs a quick edit'
  const preview = isEs
    ? 'Un moderador pidió cambios antes de publicarla.'
    : 'A moderator asked for edits before publishing.'

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
          ? 'Un moderador revisó tu señal y necesita un par de ajustes antes de publicarla:'
          : 'A moderator reviewed your signal and needs a couple of edits before publishing it:'}
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

      <Section
        style={{
          margin: '8px 0 18px',
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
          {isEs ? 'Nota del moderador' : 'Moderator note'}
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
          {moderatorNote}
        </Text>
      </Section>

      <Section style={{ marginTop: '8px' }}>
        <ButtonLink href={signalDetailUrl(signalSlug)}>
          {isEs ? 'Abrir y editar' : 'Open and edit'}
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
          ? 'Una vez que envíes los cambios, regresa a la cola de revisión.'
          : 'Once you submit the edits, the signal goes back to the review queue.'}
      </Text>
    </SignalsEmailLayout>
  )
}

export default FilerNeedsEditEmail
