'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Heart, Loader2 } from 'lucide-react'

type Props = {
  causeId: string
  locale: 'es' | 'en'
}

export function CauseVoteButton({ causeId, locale }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'voted' | 'already' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const L = (es: string, en: string) => (locale === 'es' ? es : en)

  const handleVote = async () => {
    if (state === 'loading') return
    setState('loading')
    setMessage(null)
    try {
      const res = await fetch('/api/predictions/fund/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cause_id: causeId }),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (res.ok && data.success) {
        setState('voted')
        return
      }
      if (res.status === 400 && typeof data.error === 'string' && /ya votaste/i.test(data.error)) {
        setState('already')
        setMessage(data.error)
        return
      }
      setState('error')
      setMessage(
        data.error || L('No se pudo registrar tu voto', 'Could not record your vote')
      )
    } catch {
      setState('error')
      setMessage(L('Error de red', 'Network error'))
    }
  }

  if (state === 'voted' || state === 'already') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-emerald-500/20 p-2">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-white">
              {state === 'voted'
                ? L('¡Voto registrado!', 'Vote recorded!')
                : L('Ya votaste este ciclo', 'You already voted this cycle')}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {state === 'voted'
                ? L(
                    'Comparte para que otras personas también voten — cada voto mueve el Fondo.',
                    'Share this cause so others vote too — every vote shifts the Fund.'
                  )
                : L(
                    'Tu voto de este ciclo ya cuenta. Vuelve el próximo mes.',
                    'Your vote for this cycle is already counted. Come back next month.'
                  )}
            </p>
            <Link
              href="/predictions/fund"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              {L('Ver todas las causas', 'See all causes')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
      <h2 className="text-lg font-semibold text-white inline-flex items-center gap-2">
        <Heart className="w-5 h-5 text-emerald-400" />
        {L('Vota por esta causa', 'Vote for this cause')}
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        {L(
          'Un voto por persona este ciclo. No necesitas crear cuenta — tu voto queda registrado en tu navegador.',
          'One vote per person, per cycle. No account needed — your vote is tied to this browser.'
        )}
      </p>
      <button
        onClick={handleVote}
        disabled={state === 'loading'}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {state === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {L('Enviando…', 'Submitting…')}
          </>
        ) : (
          <>
            <Heart className="w-4 h-4" />
            {L('Votar por esta causa', 'Vote for this cause')}
          </>
        )}
      </button>
      {state === 'error' && message && (
        <p className="mt-3 text-xs text-red-400">{message}</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {L(
          '¿Prefieres acumular XP y ver todas tus votaciones?',
          'Prefer to earn XP and track all your votes?'
        )}{' '}
        <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 underline">
          {L('Crea una cuenta', 'Create an account')}
        </Link>
      </p>
    </div>
  )
}
