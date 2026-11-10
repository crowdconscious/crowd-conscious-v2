'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CICERON_ROOMS } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { fixtureClients, fixtureDofNotes } from '@/lib/ciceron/demo/fixtures'

type Item = { id: string; label: string; href: string; group: string }

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  const items = useMemo(() => {
    const roomItems: Item[] = CICERON_ROOMS.map((r) => ({
      id: `room-${r.id}`,
      label: copy.rooms[r.id],
      href: r.href,
      group: copy.command.groups.rooms,
    }))
    const clientItems: Item[] = fixtureClients.map((c) => ({
      id: `client-${c.id}`,
      label: c.name,
      href: '/ciceron/clientes',
      group: copy.command.groups.clients,
    }))
    const matterItems: Item[] = fixtureClients.flatMap((c) =>
      c.matters.map((m) => ({
        id: `matter-${m.id}`,
        label: `${c.name} — ${m.title}`,
        href: '/ciceron/clientes',
        group: copy.command.groups.matters,
      }))
    )
    const noteItems: Item[] = fixtureDofNotes.map((n) => ({
      id: `note-${n.id}`,
      label: n.title,
      href: '/ciceron/monitor-dof',
      group: copy.command.groups.notes,
    }))
    const all = [...roomItems, ...clientItems, ...matterItems, ...noteItems]
    const needle = q.trim().toLowerCase()
    if (!needle) return all
    return all.filter((i) => i.label.toLowerCase().includes(needle))
  }, [q])

  useEffect(() => {
    if (!open) {
      setQ('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [q])

  if (!open) return null

  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    ;(acc[item.group] ??= []).push(item)
    return acc
  }, {})

  const flat = items

  function go(item: Item) {
    onClose()
    router.push(item.href)
  }

  return (
    <div
      className="cic-palette-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="ciceron-command-palette"
    >
      <div
        className="cic-palette"
        role="dialog"
        aria-modal="true"
        aria-label={copy.command.title}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={copy.command.placeholder}
          aria-label={copy.command.placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => Math.min(i + 1, flat.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && flat[active]) go(flat[active])
          }}
        />
        <div className="cic-palette-list">
          {flat.length === 0 ? (
            <p className="cic-muted" style={{ padding: 16, margin: 0 }}>
              {copy.command.empty}
            </p>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group}>
                <div className="cic-palette-group">{group}</div>
                {groupItems.map((item) => {
                  const idx = flat.findIndex((f) => f.id === item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-active={idx === active}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(item)}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
