'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CICERON_BASE,
  CICERON_DEMO_COOKIE,
  CICERON_ROOMS,
} from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { fixtureMeta } from '@/lib/ciceron/demo/fixtures'
import { CommandPalette } from './CommandPalette'
import './ciceron.css'

function hasDemoSession() {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some((c) => c.startsWith(`${CICERON_DEMO_COOKIE}=`))
}

export function CiceronShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    if (!hasDemoSession()) {
      router.replace(CICERON_BASE)
      return
    }
    setReady(true)
  }, [router])

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

  if (!ready) {
    return (
      <div className="ciceron-root" lang="es">
        <div className="cic-demo-banner">{copy.demoLabel}</div>
        <p className="cic-muted" style={{ padding: 24 }}>
          {copy.components.loading}
        </p>
      </div>
    )
  }

  return (
    <div className="ciceron-root" lang="es">
      <div className="cic-demo-banner" role="note">
        {copy.demoLabel}
      </div>
      <div className="cic-shell">
        <nav className="cic-rail" aria-label="Salas">
          {CICERON_ROOMS.map((room) => {
            const active = pathname === room.href || pathname?.startsWith(`${room.href}/`)
            return (
              <Link
                key={room.id}
                href={room.href}
                aria-current={active ? 'page' : undefined}
              >
                <span>{copy.rooms[room.id]}</span>
                {room.badge > 0 ? <span className="cic-badge">{room.badge}</span> : null}
              </Link>
            )
          })}
        </nav>
        <div className="cic-main">
          <header className="cic-topbar">
            <div className="cic-topbar-firm">{fixtureMeta.firmName}</div>
            <div className="cic-topbar-matter">{copy.topbar.matterContext}: licencia CNBV</div>
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
              {fixtureMeta.userName} · {fixtureMeta.role}
            </div>
          </header>
          <main className="cic-content">{children}</main>
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
