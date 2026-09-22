import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import {
  SignalsEmailLayout,
  ButtonLink,
  signalsEmailColors as C,
} from './SignalsEmailLayout'
import type { AuthorSuggestedContact } from '@/lib/signals/ops-contacts'
import { kindLabelEs } from '@/lib/signals/ops-contacts'

export type OpsVerifiedAuthority = {
  email: string
  displayName: string
  source: 'citizen_targets.notification_email' | 'conscious_locations.contact_email'
  authorityMailStatus: 'sent' | 'pending' | 'skipped' | 'failed'
}

export interface OpsPacketStage1EmailProps {
  signalTitle: string
  signalSlug: string
  signalUrl: string
  cosignCount: number
  stageThreshold: number
  targetKind: string | null
  targetDisplayName: string | null
  opsRoutingMode: 'crowd_conscious' | 'author_provided'
  authorSuggestedContacts: AuthorSuggestedContact[]
  /** Legacy company field — suggested only, never auto-To. */
  companyContactEmail: string | null
  verifiedAuthority: OpsVerifiedAuthority | null
  magicLinkUrl: string | null
}

/**
 * Internal ops packet at Stage 1 (50). Always To: francisco@ + comunidad@.
 * Author-suggested contacts are listed for manual forward — not Resend To:.
 */
export function OpsPacketStage1Email(props: OpsPacketStage1EmailProps) {
  const {
    signalTitle,
    signalSlug,
    signalUrl,
    cosignCount,
    stageThreshold,
    targetKind,
    targetDisplayName,
    opsRoutingMode,
    authorSuggestedContacts,
    companyContactEmail,
    verifiedAuthority,
    magicLinkUrl,
  } = props

  const title = `Ops · Señal Stage 1 (${stageThreshold}) — ${signalTitle}`
  const preview = `Umbral ${stageThreshold} alcanzado. Reenvía a alcaldía / Conscious Location.`

  return (
    <SignalsEmailLayout
      locale="es"
      title={title}
      preview={preview}
      audience="moderator"
    >
      <Text style={p}>
        Stage 1 ({stageThreshold} co-firmas) alcanzado. Este correo es el
        paquete interno para Francisco / Comunidad — reenvía personalmente
        mientras reunimos contactos oficiales verificados.
      </Text>

      <Section style={box}>
        <Text style={label}>Señal</Text>
        <Text style={heading}>{signalTitle}</Text>
        <Text style={meta}>
          slug: {signalSlug} · co-firmas: {cosignCount} · target_kind:{' '}
          {targetKind ?? '—'} · destinatario: {targetDisplayName ?? '—'}
        </Text>
        <Text style={meta}>
          <Link href={signalUrl} style={{ color: C.accentSoft }}>
            {signalUrl}
          </Link>
        </Text>
        {magicLinkUrl ? (
          <Text style={meta}>
            Magic-link target (si aplica):{' '}
            <Link href={magicLinkUrl} style={{ color: C.accentSoft }}>
              {magicLinkUrl}
            </Link>
          </Text>
        ) : null}
      </Section>

      <Section style={box}>
        <Text style={label}>Modo de contacto</Text>
        <Text style={pTight}>
          {opsRoutingMode === 'crowd_conscious'
            ? 'Que Crowd Conscious lo gestione (sin contactos del autor).'
            : 'El autor indicó a quién contactar (solo sugerencias — no To: automático).'}
        </Text>
      </Section>

      <SuggestedContactsBlock
        contacts={authorSuggestedContacts}
        companyContactEmail={companyContactEmail}
      />

      <Section style={box}>
        <Text style={label}>Contacto oficial verificado</Text>
        {verifiedAuthority ? (
          <>
            <Text style={pTight}>
              {verifiedAuthority.displayName} · {verifiedAuthority.email}
            </Text>
            <Text style={meta}>
              fuente: {verifiedAuthority.source} · mail autoridad:{' '}
              {verifiedAuthority.authorityMailStatus}
            </Text>
            <Text style={meta}>
              Política: To: verificado permitido; ops en BCC del mail de
              autoridad. El paquete ops siempre va aparte a francisco@ +
              comunidad@.
            </Text>
          </>
        ) : (
          <Text style={pTight}>
            No hay email oficial verificado en registry / Conscious Location.
            No inventar correos de alcaldía. Usa los canales sugeridos o
            gestiona tú el reenvío.
          </Text>
        )}
      </Section>

      <Section style={{ margin: '12px 0 4px' }}>
        <ButtonLink href={signalUrl}>Abrir señal pública</ButtonLink>
      </Section>
    </SignalsEmailLayout>
  )
}

export interface OpsPacketStage2EmailProps
  extends Omit<OpsPacketStage1EmailProps, 'magicLinkUrl'> {
  /** Known public handles / names for tagging — free-text stubs only. */
  knownAlcaldiaTags?: string[]
}

/**
 * Stage 2 (200) ops packet — social-pressure checklist + copy stubs.
 * Social posting automation is OUT OF SCOPE.
 */
export function OpsPacketStage2Email(props: OpsPacketStage2EmailProps) {
  const {
    signalTitle,
    signalSlug,
    signalUrl,
    cosignCount,
    stageThreshold,
    targetKind,
    targetDisplayName,
    opsRoutingMode,
    authorSuggestedContacts,
    companyContactEmail,
    verifiedAuthority,
    knownAlcaldiaTags = [],
  } = props

  const title = `Ops · Señal Stage 2 (${stageThreshold}) — presión social — ${signalTitle}`
  const preview = `Umbral ${stageThreshold}. Checklist de presión social + reenvío.`
  const tagLine =
    knownAlcaldiaTags.length > 0
      ? knownAlcaldiaTags.map((t) => (t.startsWith('@') ? t : `@${t}`)).join(' ')
      : '@[alcaldía / persona conocida]'

  const reelStub = `Señal ciudadana: "${signalTitle}" — ${cosignCount} vecinos ya firmaron. ${signalUrl}`
  const igStub = `${reelStub}\n\n${tagLine} — ¿van a responder? #CrowdConscious #CDMX`
  const fbStub = `Una señal ciudadana dirigida a ${targetDisplayName ?? 'la autoridad'} cruzó ${cosignCount} co-firmas.\n\n${signalUrl}\n\nPedimos respuesta pública.`
  const xStub = `Señal Stage 2 (${cosignCount}): ${signalTitle}\n${signalUrl}\n${tagLine}`

  return (
    <SignalsEmailLayout
      locale="es"
      title={title}
      preview={preview}
      audience="moderator"
    >
      <Text style={p}>
        Stage 2 ({stageThreshold} co-firmas) alcanzado. Paquete interno +
        checklist de presión social (manual — sin auto-post).
      </Text>

      <Section style={box}>
        <Text style={label}>Señal</Text>
        <Text style={heading}>{signalTitle}</Text>
        <Text style={meta}>
          slug: {signalSlug} · co-firmas: {cosignCount} · target_kind:{' '}
          {targetKind ?? '—'} · destinatario: {targetDisplayName ?? '—'}
        </Text>
        <Text style={meta}>
          <Link href={signalUrl} style={{ color: C.accentSoft }}>
            {signalUrl}
          </Link>
        </Text>
        <Text style={meta}>
          Modo:{' '}
          {opsRoutingMode === 'crowd_conscious'
            ? 'Crowd Conscious gestiona'
            : 'Autor sugirió contactos'}
        </Text>
      </Section>

      <SuggestedContactsBlock
        contacts={authorSuggestedContacts}
        companyContactEmail={companyContactEmail}
      />

      <Section style={box}>
        <Text style={label}>Contacto oficial verificado</Text>
        {verifiedAuthority ? (
          <Text style={pTight}>
            {verifiedAuthority.displayName} · {verifiedAuthority.email} (
            {verifiedAuthority.source})
          </Text>
        ) : (
          <Text style={pTight}>
            Sin email oficial verificado. No inventar. Reenvía / etiqueta
            manualmente.
          </Text>
        )}
      </Section>

      <Section style={box}>
        <Text style={label}>Checklist de presión social</Text>
        <Text style={pTight}>
          1. Crear reel (IG / FB) con el enlace de la señal
        </Text>
        <Text style={pTight}>
          2. Publicar en Instagram etiquetando personas conocidas de la
          alcaldía
        </Text>
        <Text style={pTight}>
          3. Publicar en Facebook (página / grupos vecinos)
        </Text>
        <Text style={pTight}>
          4. Publicar en X etiquetando cuentas conocidas
        </Text>
        <Text style={pTight}>
          5. Reenviar este paquete / la señal por correo a contactos
          verificados o sugeridos
        </Text>
      </Section>

      <Section style={box}>
        <Text style={label}>Stubs de copy (copiar / adaptar)</Text>
        <Text style={meta}>Reel / caption corta:</Text>
        <Text style={mono}>{reelStub}</Text>
        <Text style={meta}>Instagram:</Text>
        <Text style={mono}>{igStub}</Text>
        <Text style={meta}>Facebook:</Text>
        <Text style={mono}>{fbStub}</Text>
        <Text style={meta}>X:</Text>
        <Text style={mono}>{xStub}</Text>
      </Section>

      <Section style={{ margin: '12px 0 4px' }}>
        <ButtonLink href={signalUrl}>Abrir señal pública</ButtonLink>
      </Section>
    </SignalsEmailLayout>
  )
}

function SuggestedContactsBlock(props: {
  contacts: AuthorSuggestedContact[]
  companyContactEmail: string | null
}) {
  const { contacts, companyContactEmail } = props
  const hasAny = contacts.length > 0 || Boolean(companyContactEmail)

  return (
    <Section style={box}>
      <Text style={label}>Destinatarios / canales sugeridos por el autor</Text>
      {!hasAny ? (
        <Text style={pTight}>
          Ninguno. Ops decide el canal (Crowd Conscious gestiona).
        </Text>
      ) : (
        <>
          {companyContactEmail ? (
            <Text style={pTight}>
              Empresa (campo legacy target_contact_email):{' '}
              {companyContactEmail} — sugerido, no To: automático
            </Text>
          ) : null}
          {contacts.map((c, i) => (
            <Text key={`${c.kind}-${i}`} style={pTight}>
              {kindLabelEs(c.kind)}
              {c.label ? ` (${c.label})` : ''}: {c.value}
            </Text>
          ))}
        </>
      )}
    </Section>
  )
}

const p: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: '14px',
  color: C.text,
  lineHeight: 1.7,
}
const pTight: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '14px',
  color: C.text,
  lineHeight: 1.6,
}
const label: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: C.textFaint,
}
const heading: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '15px',
  fontWeight: 600,
  color: C.text,
  lineHeight: 1.4,
}
const meta: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: '12px',
  color: C.textDim,
  lineHeight: 1.6,
  wordBreak: 'break-all',
}
const mono: React.CSSProperties = {
  margin: '4px 0 12px',
  fontSize: '12px',
  color: C.text,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}
const box: React.CSSProperties = {
  margin: '14px 0 18px',
  padding: '14px 16px',
  backgroundColor: '#0b1220',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
}
