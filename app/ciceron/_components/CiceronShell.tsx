'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CICERON_ROOMS, type CiceronRoomId } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type { GuidedStoryState } from '@/lib/ciceron/demo/guided-story-pure'
import { shouldShowAdminRailLinks } from '@/lib/ciceron/demo/rail-visibility'
import { SU_MANANA_RAIL_GROUPS } from '@/lib/ciceron/demo/su-manana-pure'
import { CiceronLockup } from './CiceronLogo'
import { CommandPalette } from './CommandPalette'
import {
  GuidedStoryPanel,
  GuidedStoryResumeBar,
  GuidedStoryStartButton,
} from './GuidedStory'
import { ProAssistant, ProAssistantButton } from './ProAssistant'
import { ThemeToggle } from './ThemeToggle'
import { MatterChromeProvider, useMatterChrome } from './MatterChrome'
import { PersonaSwitcher, type SwitchablePersona } from './PersonaSwitcher'
import type {
  ProClientRef,
  ProPersonaRole,
} from '@/lib/ciceron/demo/pro-assistant-pure'
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
  proRole?: ProPersonaRole
  proClients?: ProClientRef[]
  proPlazosSoonCount?: number
  proClientsMovedCount?: number
}

const RAIL_COLLAPSE_KEY = 'ciceron-rail-collapsed'

function TopbarMatter() {
  const { matterTitle } = useMatterChrome()
  if (!matterTitle) return <div className="cic-topbar-matter" aria-hidden />
  return (
    <div className="cic-topbar-matter">
      {copy.topbar.matterContext}: {matterTitle}
    </div>
  )
}

function roomBadge(
  roomId: CiceronRoomId,
  reviewBadge: number | undefined,
  staticBadge: number
): number {
  if (roomId === 'revision' && typeof reviewBadge === 'number') return reviewBadge
  return staticBadge
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
  const [proOpen, setProOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        // Partners: Cmd/Ctrl+K opens the Pro assistant (demo). Room search stays on Buscar.
        setProOpen((v) => !v)
        setPaletteOpen(false)
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false)
        setProOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RAIL_COLLAPSE_KEY)
      if (stored === '1') setRailCollapsed(true)
    } catch {
      /* ignore */
    }
  }, [])

  function toggleRail() {
    setRailCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(RAIL_COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const showAdminLinks = shouldShowAdminRailLinks({
    roleKey: meta.roleKey ?? (meta.role === copy.roleAdmin ? 'admin' : ''),
    isProspectSession: Boolean(meta.isProspectSession),
  })

  const roomsById = new Map(CICERON_ROOMS.map((r) => [r.id, r]))

  return (
    <div
      className={`ciceron-root${railCollapsed ? ' is-rail-collapsed' : ''}`}
      lang="es-MX"
    >
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
          <div className="cic-rail-brand-row">
            <Link href="/ciceron/hoy" className="cic-rail-brand" aria-label={copy.brand}>
              <CiceronLockup />
            </Link>
            <button
              type="button"
              className="cic-rail-collapse"
              onClick={toggleRail}
              aria-expanded={!railCollapsed}
              aria-controls="cic-rail-groups"
              title={railCollapsed ? copy.rail.expand : copy.rail.collapse}
            >
              <span className="cic-sr-only">
                {railCollapsed ? copy.rail.expand : copy.rail.collapse}
              </span>
              <span aria-hidden="true">{railCollapsed ? '»' : '«'}</span>
            </button>
          </div>

          <div id="cic-rail-groups" className="cic-rail-groups">
            {SU_MANANA_RAIL_GROUPS.map((group) => (
              <div key={group.id} className="cic-rail-group">
                <p className="cic-rail-group-label">{copy.rail.groups[group.id]}</p>
                {group.roomIds.map((roomId) => {
                  const room = roomsById.get(roomId)
                  if (!room) return null
                  const active =
                    pathname === room.href || pathname?.startsWith(`${room.href}/`)
                  const badge = roomBadge(room.id, meta.reviewBadge, room.badge)
                  return (
                    <Link
                      key={room.id}
                      href={room.href}
                      aria-current={active ? 'page' : undefined}
                      title={copy.rooms[room.id]}
                      aria-label={copy.rooms[room.id]}
                    >
                      <span className="cic-rail-link-short" aria-hidden="true">
                        {copy.rooms[room.id].slice(0, 1)}
                      </span>
                      <span className="cic-rail-link-label">{copy.rooms[room.id]}</span>
                      {badge > 0 ? <span className="cic-badge">{badge}</span> : null}
                    </Link>
                  )
                })}
              </div>
            ))}

            <div
              className={`cic-rail-group cic-rail-group-more${railCollapsed ? ' is-hidden-when-collapsed' : ''}`}
            >
              <p className="cic-rail-group-label">{copy.rail.groups.mas}</p>
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
                <Link
                  href="/ciceron/expedientes/outlook"
                  className="cic-rail-secondary cic-rail-m365"
                >
                  <span>{copy.m365.settingsStatus}</span>
                  <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                    {meta.m365Status === 'connected'
                      ? copy.m365.connected
                      : copy.m365.disconnected}
                  </span>
                </Link>
              </div>
            </div>
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
            >
              {copy.topbar.commandHint}
            </button>
            <ProAssistantButton onOpen={() => setProOpen(true)} />
            {meta.guidedStory?.dismissed || meta.guidedStory?.completed ? (
              <GuidedStoryStartButton />
            ) : null}
            <ThemeToggle />
            <div className="cic-user" title={copy.topbar.userMenu}>
              {meta.userName} · {meta.role}
            </div>
          </header>
          <main className="cic-content">
            {meta.guidedStory &&
            (meta.guidedStory.dismissed || meta.guidedStory.completed) ? (
              <GuidedStoryResumeBar
                dismissed={Boolean(meta.guidedStory.dismissed)}
                completed={Boolean(meta.guidedStory.completed)}
              />
            ) : null}
            {children}
          </main>
        </div>
      </div>
      {meta.guidedStory && !meta.guidedStory.dismissed ? (
        <GuidedStoryPanel state={meta.guidedStory} />
      ) : null}
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
      <ProAssistant
        open={proOpen}
        onClose={() => setProOpen(false)}
        role={meta.proRole ?? 'socio'}
        clients={meta.proClients}
        plazosSoonCount={meta.proPlazosSoonCount}
        clientsMovedCount={meta.proClientsMovedCount}
      />
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
