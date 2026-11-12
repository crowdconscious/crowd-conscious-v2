'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CICERON_ROOMS } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type { GuidedStoryState } from '@/lib/ciceron/demo/guided-story-pure'
import { shouldShowAdminRailLinks } from '@/lib/ciceron/demo/rail-visibility'
import { CiceronLockup } from './CiceronLogo'
import { CommandPalette } from './CommandPalette'
import { GuidedStoryPanel, GuidedStoryResumeBar } from './GuidedStory'
import { MatterChromeProvider, useMatterChrome } from './MatterChrome'
import { PersonaSwitcher, type SwitchablePersona } from './PersonaSwitcher'
import './ciceron.css'

export type ShellMeta = {
  firmName: string
  userName: string
  role: string
  roleKey?: string
  personaId?: string
  m365Status?: 'connected' | 'disconnected'
  /** Live count for the Revisión rail badge (mine tab). */
  reviewBadge?: number
  switchablePersonas?: SwitchablePersona[]
  guidedStory?: GuidedStoryState | null
  /** True when this session came from a prospect (non-admin) invite. */
  isProspectSession?: boolean
}

function TopbarMatter() {
  const { matterTitle } = useMatterChrome()
  if (!matterTitle) return <div className="cic-topbar-matter" aria-hidden />
  return (
    <div className="cic-topbar-matter">
      {copy.topbar.matterContext}: {matterTitle}
    </div>
  )
}

function ShellInner({
  children,
  meta,
}: {
  children: React.ReactNode
  meta: ShellMeta
}) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showAdminLinks = shouldShowAdminRailLinks({
    roleKey: meta.roleKey ?? (meta.role === copy.roleAdmin ? 'admin' : ''),
    isProspectSession: Boolean(meta.isProspectSession),
  })

  return (
    <div className="ciceron-root" lang="es">
      <div className="cic-demo-banner" role="note">
        {copy.demoLabel}
      </div>
      {meta.switchablePersonas && meta.personaId ? (
        <PersonaSwitcher
          currentPersonaId={meta.personaId}
          personas={meta.switchablePersonas}
        />
      ) : null}
      <div className="cic-shell">
        <nav className="cic-rail" aria-label="Salas">
          <Link href="/ciceron/hoy" className="cic-rail-brand" aria-label={copy.brand}>
            <CiceronLockup />
          </Link>
          {CICERON_ROOMS.map((room) => {
            const active = pathname === room.href || pathname?.startsWith(`${room.href}/`)
            const badge =
              room.id === 'revision' && typeof meta.reviewBadge === 'number'
                ? meta.reviewBadge
                : room.badge
            return (
              <Link
                key={room.id}
                href={room.href}
                aria-current={active ? 'page' : undefined}
              >
                <span>{copy.rooms[room.id]}</span>
                {badge > 0 ? <span className="cic-badge">{badge}</span> : null}
              </Link>
            )
          })}
          <div className="cic-rail-footer">
            <Link href="/ciceron/acceso" className="cic-rail-secondary">
              {copy.access.title}
            </Link>
            <Link href="/ciceron/proteccion" className="cic-rail-secondary">
              {copy.proteccion.title}
            </Link>
            <Link href="/ciceron/fuentes-cobertura" className="cic-rail-secondary">
              {copy.fuentesCobertura.title}
            </Link>
            {showAdminLinks ? (
              <>
                <Link href="/ciceron/admin/metricas" className="cic-rail-secondary">
                  {copy.adminMetricas.title}
                </Link>
                <Link href="/ciceron/admin/ventas" className="cic-rail-secondary">
                  {copy.adminVentas.title}
                </Link>
                <Link href="/ciceron/admin/fuentes" className="cic-rail-secondary">
                  {copy.adminFuentes.title}
                </Link>
              </>
            ) : null}
            <Link href="/ciceron/expedientes/outlook" className="cic-rail-secondary cic-rail-m365">
              <span>{copy.m365.settingsStatus}</span>
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {meta.m365Status === 'connected'
                  ? copy.m365.connected
                  : copy.m365.disconnected}
              </span>
            </Link>
          </div>
        </nav>
        <div className="cic-main">
          <header className="cic-topbar">
            <div className="cic-topbar-firm">{meta.firmName}</div>
            <TopbarMatter />
            <button
              type="button"
              className="cic-cmd-btn"
              onClick={() => setPaletteOpen(true)}
              aria-keyshortcuts="Meta+K Control+K"
            >
              {copy.topbar.commandHint}
              <kbd>{copy.topbar.commandShortcut}</kbd>
            </button>
            <div className="cic-user" title={copy.topbar.userMenu}>
              {meta.userName} · {meta.role}
            </div>
          </header>
          <main className="cic-content">
            {meta.guidedStory && !meta.guidedStory.dismissed ? (
              <GuidedStoryPanel state={meta.guidedStory} compact />
            ) : (
              <GuidedStoryResumeBar dismissed={Boolean(meta.guidedStory?.dismissed)} />
            )}
            {children}
          </main>
        </div>
      </div>
      <nav className="cic-mobile-nav" aria-label="Salas">
        {CICERON_ROOMS.map((room) => {
          const active = pathname === room.href
          return (
            <Link key={room.id} href={room.href} aria-current={active ? 'page' : undefined}>
              {copy.rooms[room.id]}
            </Link>
          )
        })}
      </nav>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

export function CiceronShell({
  children,
  meta,
}: {
  children: React.ReactNode
  meta: ShellMeta
}) {
  return (
    <MatterChromeProvider>
      <ShellInner meta={meta}>{children}</ShellInner>
    </MatterChromeProvider>
  )
}
