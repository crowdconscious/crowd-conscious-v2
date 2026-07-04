import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import {
  SignalsEmailLayout,
  ButtonLink,
  signalsEmailColors as C,
} from './SignalsEmailLayout'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

export interface TargetNotifiedStage1EmailProps {
  locale: CitizenSignalsLocale
  targetDisplayName: string
  signalTitle: string
  signalSummary?: string | null
  cosignCount: number
  magicLinkUrl: string
  expiryDays?: number
  /**
   * 'dashboard' (default) — registry targets (municipality/institution):
   * the link is a personal magic-link into the private response dashboard.
   * 'public' — direct targets (company / conscious_location, migration
   * 248): no dashboard exists, so the link is the public signal page and
   * the expiry/secrecy note is replaced with reply instructions.
   */
  ctaMode?: 'dashboard' | 'public'
}

/**
 * Stage-1 outreach to the target rep. Includes the magic-link dashboard
 * URL prominently with a 7-day expiry note. The link is pre-issued via
 * /api/admin/signals/targets/[id]/access-token and the rep can post the
 * official response straight from the dashboard.
 */
export function TargetNotifiedStage1Email({
  locale,
  targetDisplayName,
  signalTitle,
  signalSummary,
  cosignCount,
  magicLinkUrl,
  expiryDays = 7,
  ctaMode = 'dashboard',
}: TargetNotifiedStage1EmailProps) {
  const isEs = locale === 'es'
  const isPublicCta = ctaMode === 'public'
  const title = isEs
    ? `Tienes una señal ciudadana de ${cosignCount} vecinos`
    : `You have a citizen signal from ${cosignCount} neighbours`
  const preview = isPublicCta
    ? isEs
      ? 'Conoce la señal y responde a la comunidad.'
      : 'See the signal and respond to the community.'
    : isEs
      ? 'Responde oficialmente desde tu enlace privado.'
      : 'Reply officially from your private link.'

  return (
    <SignalsEmailLayout
      locale={locale}
      title={title}
      preview={preview}
      audience="target"
    >
      <Text
        style={{
          margin: '0 0 12px',
          fontSize: '15px',
          color: C.text,
          lineHeight: 1.6,
        }}
      >
        {isEs ? `Hola ${targetDisplayName},` : `Hello ${targetDisplayName},`}
      </Text>

      <Text
        style={{
          margin: '0 0 14px',
          fontSize: '14px',
          color: C.text,
          lineHeight: 1.7,
        }}
      >
        {isPublicCta
          ? isEs
            ? `Una señal ciudadana dirigida a ${targetDisplayName} acaba de cruzar el umbral de ${cosignCount} co-firmas en Crowd Conscious. Te enviamos este aviso para que conozcas la señal y tengas la oportunidad de responder a la comunidad.`
            : `A citizen signal addressed to ${targetDisplayName} just crossed the ${cosignCount}-cosign threshold on Crowd Conscious. We send this notice so you can see the signal and respond to the community.`
          : isEs
            ? `Una señal ciudadana dirigida a ti acaba de cruzar el umbral de ${cosignCount} co-firmas en Crowd Conscious. Te enviamos este aviso privado antes de cualquier difusión pública adicional para que tengas la oportunidad de responder oficialmente.`
            : `A citizen signal addressed to you just crossed the ${cosignCount}-cosign threshold on Crowd Conscious. We send this private notice before any further public escalation so you can respond officially.`}
      </Text>

      <Section
        style={{
          margin: '14px 0 18px',
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
        {signalSummary ? (
          <Text
            style={{
              margin: '8px 0 0',
              fontSize: '13px',
              color: C.textDim,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {signalSummary}
          </Text>
        ) : null}
      </Section>

      <Section style={{ margin: '8px 0 4px' }}>
        <ButtonLink href={magicLinkUrl}>
          {isPublicCta
            ? isEs
              ? 'Ver la señal'
              : 'View the signal'
            : isEs
              ? 'Abrir mi panel privado'
              : 'Open my private dashboard'}
        </ButtonLink>
      </Section>

      <Text
        style={{
          margin: '12px 0 0',
          fontSize: '12px',
          color: C.textDim,
          lineHeight: 1.6,
          wordBreak: 'break-all' as const,
        }}
      >
        <Link
          href={magicLinkUrl}
          style={{ color: C.accentSoft, textDecoration: 'underline' }}
        >
          {magicLinkUrl}
        </Link>
      </Text>

      <Text
        style={{
          margin: '14px 0 0',
          fontSize: '12px',
          color: C.textDim,
          lineHeight: 1.6,
        }}
      >
        {isPublicCta
          ? isEs
            ? 'Este enlace abre la página pública de la señal. Para publicar una respuesta oficial, responde a este correo y el equipo de Crowd Conscious la verificará y la publicará junto a la señal.'
            : 'This link opens the public signal page. To post an official reply, respond to this email and the Crowd Conscious team will verify and publish it alongside the signal.'
          : isEs
            ? `Este enlace es personal y vence en ${expiryDays} días. No lo compartas: cualquiera con el enlace puede responder en nombre de tu institución.`
            : `This link is personal and expires in ${expiryDays} days. Do not share it: anyone with the link can reply on behalf of your institution.`}
      </Text>
    </SignalsEmailLayout>
  )
}

export default TargetNotifiedStage1Email
