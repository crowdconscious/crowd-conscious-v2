'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'

const EMOJI_OPTIONS = ['🎯', '⚽', '🔥', '🧠', '🦅', '🌟', '💎', '🎪', '🐯', '🌊', '🎸', '🍀']

export type AliasParticipantJoined = {
  id: string
  alias: string
  emoji: string
  sessionId: string
}

export interface AliasEntryProps {
  eventId: string
  onJoined: (participant: AliasParticipantJoined) => void
}

function validateAlias(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 2 || t.length > 20) return '2–20 characters'
  if (!/^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ _-]+$/.test(t)) return 'Letters, numbers, spaces, underscores only'
  return null
}

export function AliasEntry({ eventId, onJoined }: AliasEntryProps) {
  const [alias, setAlias] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('🎯')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async () => {
    const v = validateAlias(alias)
    if (v) {
      setError(v)
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const sessionId = crypto.randomUUID()
      const res = await fetch('/api/live/join-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          alias: alias.trim(),
          emoji: selectedEmoji,
          session_id: sessionId,
        }),
      })
      const data = (await res.json()) as {
        error?: string
        participant?: { id: string; session_id: string; alias: string; avatar_emoji: string | null }
      }
      if (!res.ok) {
        setError(data.error ?? 'Could not join')
        return
      }
      const p = data.participant
      if (!p?.id) {
        setError('Invalid response')
        return
      }
      onJoined({
        id: p.id,
        alias: p.alias,
        emoji: p.avatar_emoji ?? selectedEmoji,
        sessionId: p.session_id,
      })
    } catch {
      setError('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }, [alias, selectedEmoji, onJoined])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-bold text-white">🎯 Elige tu alias para participar</h2>
        <p className="mb-4 text-sm text-gray-400">Choose your alias to participate</p>

        <input
          type="text"
          value={alias}
          onChange={(e) => {
            setAlias(e.target.value)
            setError(null)
          }}
          placeholder="Tu nombre en el evento"
          maxLength={20}
          className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none"
          autoComplete="off"
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

        <p className="mb-2 mt-4 text-xs text-gray-500">Avatar</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setSelectedEmoji(e)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all ${
                selectedEmoji === e
                  ? 'bg-emerald-500/20 ring-2 ring-emerald-500'
                  : 'cursor-pointer bg-[#0f1419] hover:bg-gray-800'
              }`}
              aria-label={`Avatar ${e}`}
            >
              {e}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submit()}
          className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '…' : 'ENTRAR AL EVENTO'}
        </button>

        <Link
          href={`/login?redirect=${encodeURIComponent(`/live/${eventId}`)}`}
          className="mt-4 block text-center text-sm text-emerald-400 hover:text-emerald-300"
        >
          ¿Ya tienes cuenta? Inicia sesión →
        </Link>

        <p className="mt-3 text-center text-xs text-gray-500">
          Tus votos cuentan. Regístrate después para conservar tu XP permanentemente.
        </p>
      </div>
    </div>
  )
}
