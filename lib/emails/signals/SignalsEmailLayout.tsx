import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

/**
 * Shared layout shell for Citizen Signals transactional emails. Bilingual
 * footer with brand wordmark + unsubscribe placeholder. The footer copy is
 * scoped to "you got this because you filed a signal" by default so the
 * filer-facing templates don't have to override it. Target-facing emails
 * pass `audience="target"` to swap the disclosure line.
 */

export type SignalsEmailAudience = 'filer' | 'target' | 'moderator'

export interface SignalsEmailLayoutProps {
  locale: CitizenSignalsLocale
  preview: string
  title: string
  audience?: SignalsEmailAudience
  children: React.ReactNode
}

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://crowdconscious.app'
).replace(/\/$/, '')

const COLORS = {
  bg: '#0f1419',
  card: '#111827',
  accent: '#10b981',
  accentSoft: '#34d399',
  text: '#e5e7eb',
  textDim: '#9ca3af',
  textFaint: '#6b7280',
  border: '#1f2937',
} as const

export const signalsEmailColors = COLORS

export function SignalsEmailLayout({
  locale,
  preview,
  title,
  audience = 'filer',
  children,
}: SignalsEmailLayoutProps) {
  const isEs = locale === 'es'

  const disclosure =
    audience === 'target'
      ? isEs
        ? 'Recibes este correo porque eres el destinatario registrado de una señal ciudadana. Si crees que esto es un error, responde a este correo y revisaremos el envío.'
        : "You're receiving this because you are the registered recipient of a citizen signal. If you think this is a mistake, reply to this email and we'll review the send."
      : audience === 'moderator'
        ? 'Recibes este correo porque eres parte del equipo de moderación de Crowd Conscious.'
        : isEs
          ? 'Recibes este correo porque presentaste una señal ciudadana en Crowd Conscious.'
          : "You're receiving this because you filed a citizen signal on Crowd Conscious."

  const unsubLabel = isEs ? 'Preferencias de correo' : 'Email preferences'
  const helpLabel = isEs ? 'Ayuda' : 'Help'

  return (
    <Html>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLORS.bg,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: COLORS.text,
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: COLORS.card,
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <Section
            style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${COLORS.border}`,
              textAlign: 'left' as const,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: '13px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: COLORS.accentSoft,
                fontWeight: 600,
              }}
            >
              Crowd Conscious
            </Text>
            <Text
              style={{
                margin: '2px 0 0',
                fontSize: '12px',
                color: COLORS.textFaint,
              }}
            >
              {isEs ? 'Señales Ciudadanas' : 'Citizen Signals'}
            </Text>
          </Section>

          <Section style={{ padding: '28px 24px 8px' }}>
            <Heading
              as="h1"
              style={{
                margin: 0,
                fontSize: '22px',
                lineHeight: 1.3,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              {title}
            </Heading>
          </Section>

          <Section style={{ padding: '8px 24px 24px' }}>{children}</Section>

          <Hr
            style={{
              border: 'none',
              borderTop: `1px solid ${COLORS.border}`,
              margin: 0,
            }}
          />

          <Section style={{ padding: '20px 24px 28px' }}>
            <Text
              style={{
                margin: '0 0 10px',
                fontSize: '12px',
                lineHeight: 1.6,
                color: COLORS.textDim,
              }}
            >
              {disclosure}
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: '11px',
                color: COLORS.textFaint,
              }}
            >
              <Link
                href={`${APP_URL}/signals`}
                style={{ color: COLORS.accent, textDecoration: 'none' }}
              >
                Crowd Conscious · {isEs ? 'Señales' : 'Signals'}
              </Link>
              {'  ·  '}
              <Link
                href={`${APP_URL}/account/email-preferences`}
                style={{ color: COLORS.textDim, textDecoration: 'underline' }}
              >
                {unsubLabel}
              </Link>
              {'  ·  '}
              <Link
                href="mailto:comunidad@crowdconscious.app"
                style={{ color: COLORS.textDim, textDecoration: 'underline' }}
              >
                {helpLabel}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function ButtonLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-block',
        padding: '12px 22px',
        backgroundColor: COLORS.accent,
        color: '#022c22',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 700,
      }}
    >
      {children}
    </Link>
  )
}

export function signalDetailUrl(slug: string): string {
  return `${APP_URL}/signals/${encodeURIComponent(slug)}`
}

export function signalsAppUrl(): string {
  return APP_URL
}
