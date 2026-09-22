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
  signalId: string
  signalTitle: string
  signalSlug: string
  /** Public citizen URL */
  signalUrl: string
  /** Admin triage URL */
  adminUrl: string
  placeLabel: string
  category: string
  cosignCount: number
  stageThreshold: number
  authorContactRouting: 'crowd_conscious' | 'author_provided'
  targetDisplayName: string | null
  /** Verified registry / Conscious Location email only — never author-suggested */
  officialEmail: string | null
  authorSuggestedContacts: AuthorSuggestedContact[]
  /** Legacy company field — display-only suggestion */
  companyContactEmail: string | null
  magicLinkUrl: string | null
}

/**
 * Francisco-locked Stage 50 ops packet (ES).
 * Always To: francisco@crowdconscious.app + comunidad@crowdconscious.app.
 * Author-suggested contacts are DISPLAY ONLY — never Resend To:.
 */
export function OpsPacketStage1Email(props: OpsPacketStage1EmailProps) {
  const {
    signalId,
    signalTitle,
    signalSlug,
    signalUrl,
    adminUrl,
    placeLabel,
    category,
    cosignCount,
    stageThreshold,
    authorContactRouting,
    targetDisplayName,
    officialEmail,
    authorSuggestedContacts,
    companyContactEmail,
    magicLinkUrl,
  } = props

  const preview = `Señal lista para enviar · ${stageThreshold} respaldos · ${signalTitle}`
  const title = preview
  const forwardStub = buildForwardableStub({
    signalTitle,
    placeLabel,
    cosignCount,
    signalUrl,
    targetDisplayName,
  })

  return (
    <SignalsEmailLayout
      locale="es"
      title={title}
      preview={preview}
      audience="moderator"
    >
      <Text style={p}>
        Paquete interno (Stage {stageThreshold}). Reenvía personalmente a
        alcaldía / Conscious Location mientras reunimos contactos oficiales
        verificados. Los contactos del autor son solo sugerencias — nunca To:
        automático.
      </Text>

      <SignalFactsBlock
        signalId={signalId}
        signalTitle={signalTitle}
        signalSlug={signalSlug}
        signalUrl={signalUrl}
        adminUrl={adminUrl}
        placeLabel={placeLabel}
        category={category}
        cosignCount={cosignCount}
      />

      <DestinoBlock
        authorContactRouting={authorContactRouting}
        targetDisplayName={targetDisplayName}
        officialEmail={officialEmail}
      />

      <AutorSugeridosBlock
        contacts={authorSuggestedContacts}
        companyContactEmail={companyContactEmail}
        authorContactRouting={authorContactRouting}
      />

      <Section style={box}>
        <Text style={label}>Checklist Stage 50</Text>
        <Text style={pTight}>
          1. Reenviar o escribir a la autoridad (usar email oficial si existe;
          si no, redactar con el stub de abajo).
        </Text>
        <Text style={pTight}>
          2. Si no hay email oficial: buscar contacto de alcaldía / Conscious
          Location (no inventar).
        </Text>
        <Text style={pTight}>
          3. Verificar deep link:{' '}
          {magicLinkUrl ? (
            <Link href={magicLinkUrl} style={{ color: C.accentSoft }}>
              panel / magic-link
            </Link>
          ) : (
            <Link href={signalUrl} style={{ color: C.accentSoft }}>
              URL pública
            </Link>
          )}
          .
        </Text>
        <Text style={pTight}>
          4. Opcional: avisar al autor que ya estamos gestionando el envío.
        </Text>
        <Text style={meta}>Stub de correo reenviable (copiar / adaptar):</Text>
        <Text style={mono}>{forwardStub}</Text>
      </Section>

      <Section style={{ margin: '12px 0 4px' }}>
        <ButtonLink href={signalUrl}>Abrir señal pública</ButtonLink>
      </Section>
    </SignalsEmailLayout>
  )
}

export interface OpsPacketStage2EmailProps
  extends Omit<OpsPacketStage1EmailProps, 'magicLinkUrl'> {
  /** Optional known public handles for tagging — free-text stubs only. */
  knownAlcaldiaTags?: string[]
}

/**
 * Francisco-locked Stage 200 ops packet (ES) — adds social-pressure checklist.
 * Social posting automation is OUT OF SCOPE.
 */
export function OpsPacketStage2Email(props: OpsPacketStage2EmailProps) {
  const {
    signalId,
    signalTitle,
    signalSlug,
    signalUrl,
    adminUrl,
    placeLabel,
    category,
    cosignCount,
    stageThreshold,
    authorContactRouting,
    targetDisplayName,
    officialEmail,
    authorSuggestedContacts,
    companyContactEmail,
    knownAlcaldiaTags = [],
  } = props

  const preview = `Prioridad pública · ${stageThreshold} respaldos · ${signalTitle} · presión social`
  const title = preview

  const authorHandles = authorSuggestedContacts
    .filter((c) => c.kind === 'instagram' || c.kind === 'x')
    .map((c) => (c.value.startsWith('@') ? c.value : `@${c.value}`))

  const tagLine =
    knownAlcaldiaTags.length > 0
      ? knownAlcaldiaTags.map((t) => (t.startsWith('@') ? t : `@${t}`)).join(' ')
      : '@[alcaldía / persona conocida]'

  const authorTagLine =
    authorHandles.length > 0 ? authorHandles.join(' ') : '(sin handles del autor)'

  const hookCopy = `En ${placeLabel}, ${cosignCount} vecinos ya respaldaron: "${signalTitle}". ¿Responden? ${signalUrl}`
  const reelStub = `${hookCopy}\n\n${tagLine} ${authorTagLine}`
  const igFbStub = `${hookCopy}\n\n${tagLine}\n${authorTagLine}\n#CrowdConscious #CDMX #SeñalCiudadana`
  const xStub = `Prioridad pública (${cosignCount}): ${signalTitle}\n${signalUrl}\n${tagLine} ${authorTagLine}`

  return (
    <SignalsEmailLayout
      locale="es"
      title={title}
      preview={preview}
      audience="moderator"
    >
      <Text style={p}>
        Paquete interno (Stage {stageThreshold}). Prioridad pública + presión
        social manual (sin auto-post). Contactos del autor = solo display.
      </Text>

      <SignalFactsBlock
        signalId={signalId}
        signalTitle={signalTitle}
        signalSlug={signalSlug}
        signalUrl={signalUrl}
        adminUrl={adminUrl}
        placeLabel={placeLabel}
        category={category}
        cosignCount={cosignCount}
      />

      <DestinoBlock
        authorContactRouting={authorContactRouting}
        targetDisplayName={targetDisplayName}
        officialEmail={officialEmail}
      />

      <AutorSugeridosBlock
        contacts={authorSuggestedContacts}
        companyContactEmail={companyContactEmail}
        authorContactRouting={authorContactRouting}
      />

      <Section style={box}>
        <Text style={label}>Checklist Stage 50 (sigue aplicando)</Text>
        <Text style={pTight}>
          1. Reenviar / escribir a la autoridad con email oficial o stub.
        </Text>
        <Text style={pTight}>
          2. Si falta contacto oficial: buscarlo (no inventar).
        </Text>
        <Text style={pTight}>3. Verificar deep link / URL pública.</Text>
        <Text style={pTight}>4. Opcional: ping al autor.</Text>
      </Section>

      <Section style={box}>
        <Text style={label}>Checklist EXTRA — presión social (Stage 200)</Text>
        <Text style={pTight}>
          1. Crear reel en Instagram / TikTok con el enlace de la señal.
        </Text>
        <Text style={pTight}>
          2. Publicar en Instagram + Facebook etiquetando cuentas de la
          alcaldía / Conscious Location.
        </Text>
        <Text style={pTight}>
          3. Publicar en X etiquetando cuentas conocidas.
        </Text>
        <Text style={pTight}>
          4. Etiquetar handles del autor si hay (IG / X): {authorTagLine}.
        </Text>
        <Text style={pTight}>
          5. Reenviar el correo formal a contactos verificados o sugeridos.
        </Text>
        <Text style={pTight}>
          6. Guardar links de los posts (para el expediente / follow-up).
        </Text>
      </Section>

      <Section style={box}>
        <Text style={label}>Copy sugerido (hook)</Text>
        <Text style={meta}>Hook corto:</Text>
        <Text style={mono}>{hookCopy}</Text>
        <Text style={meta}>Reel / TikTok caption:</Text>
        <Text style={mono}>{reelStub}</Text>
        <Text style={meta}>Instagram + Facebook:</Text>
        <Text style={mono}>{igFbStub}</Text>
        <Text style={meta}>X:</Text>
        <Text style={mono}>{xStub}</Text>
      </Section>

      <Section style={{ margin: '12px 0 4px' }}>
        <ButtonLink href={signalUrl}>Abrir señal pública</ButtonLink>
      </Section>
    </SignalsEmailLayout>
  )
}

function SignalFactsBlock(props: {
  signalId: string
  signalTitle: string
  signalSlug: string
  signalUrl: string
  adminUrl: string
  placeLabel: string
  category: string
  cosignCount: number
}) {
  const {
    signalId,
    signalTitle,
    signalSlug,
    signalUrl,
    adminUrl,
    placeLabel,
    category,
    cosignCount,
  } = props
  return (
    <Section style={box}>
      <Text style={label}>1) Señal</Text>
      <Text style={heading}>{signalTitle}</Text>
      <Text style={meta}>Lugar: {placeLabel}</Text>
      <Text style={meta}>Categoría: {category || '—'}</Text>
      <Text style={meta}>Respaldos (co-firmas): {cosignCount}</Text>
      <Text style={meta}>
        URL pública:{' '}
        <Link href={signalUrl} style={{ color: C.accentSoft }}>
          {signalUrl}
        </Link>
      </Text>
      <Text style={meta}>
        Admin:{' '}
        <Link href={adminUrl} style={{ color: C.accentSoft }}>
          {adminUrl}
        </Link>
      </Text>
      <Text style={meta}>
        signal_id: {signalId} · slug: {signalSlug}
      </Text>
    </Section>
  )
}

function DestinoBlock(props: {
  authorContactRouting: 'crowd_conscious' | 'author_provided'
  targetDisplayName: string | null
  officialEmail: string | null
}) {
  const { authorContactRouting, targetDisplayName, officialEmail } = props
  return (
    <Section style={box}>
      <Text style={label}>2) Destino</Text>
      <Text style={pTight}>
        Modo:{' '}
        {authorContactRouting === 'crowd_conscious'
          ? 'crowd_conscious (Crowd Conscious gestiona)'
          : 'author_provided (autor sugirió contactos)'}
      </Text>
      <Text style={pTight}>
        Destinatario: {targetDisplayName?.trim() || '—'}
      </Text>
      <Text style={pTight}>
        Email oficial verificado:{' '}
        {officialEmail?.trim() ? officialEmail : 'ninguno'}
      </Text>
    </Section>
  )
}

function AutorSugeridosBlock(props: {
  contacts: AuthorSuggestedContact[]
  companyContactEmail: string | null
  authorContactRouting: 'crowd_conscious' | 'author_provided'
}) {
  const { contacts, companyContactEmail, authorContactRouting } = props
  const byKind = {
    email: contacts.filter((c) => c.kind === 'email'),
    phone: contacts.filter((c) => c.kind === 'phone'),
    whatsapp: contacts.filter((c) => c.kind === 'whatsapp'),
    instagram: contacts.filter((c) => c.kind === 'instagram'),
    x: contacts.filter((c) => c.kind === 'x'),
  }
  const hasAny =
    contacts.length > 0 || Boolean(companyContactEmail?.trim())

  return (
    <Section style={box}>
      <Text style={label}>3) Autor sugeridos (solo display — nunca To: automático)</Text>
      {!hasAny ? (
        <Text style={pTight}>
          {authorContactRouting === 'crowd_conscious'
            ? 'Ninguno — Crowd Conscious gestiona.'
            : 'Ninguno listado — Crowd Conscious gestiona / buscar contacto.'}
        </Text>
      ) : (
        <>
          {companyContactEmail?.trim() ? (
            <Text style={pTight}>
              Empresa (legacy target_contact_email): {companyContactEmail} —
              sugerido
            </Text>
          ) : null}
          {(Object.keys(byKind) as Array<keyof typeof byKind>).map((kind) =>
            byKind[kind].map((c, i) => (
              <Text key={`${kind}-${i}`} style={pTight}>
                {kindLabelEs(c.kind)}
                {c.label ? ` (${c.label})` : ''}: {c.value}
              </Text>
            ))
          )}
        </>
      )}
    </Section>
  )
}

function buildForwardableStub(args: {
  signalTitle: string
  placeLabel: string
  cosignCount: number
  signalUrl: string
  targetDisplayName: string | null
}): string {
  const dest = args.targetDisplayName?.trim() || 'la autoridad competente'
  return [
    `Asunto: Señal ciudadana · ${args.cosignCount} respaldos · ${args.signalTitle}`,
    '',
    `Estimados ${dest},`,
    '',
    `Una señal ciudadana en ${args.placeLabel} alcanzó ${args.cosignCount} respaldos vecinos en Crowd Conscious:`,
    `"${args.signalTitle}"`,
    args.signalUrl,
    '',
    'Pedimos su atención y una respuesta pública a la comunidad.',
    '',
    'Atentamente,',
    'Crowd Conscious · Ops',
  ].join('\n')
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
