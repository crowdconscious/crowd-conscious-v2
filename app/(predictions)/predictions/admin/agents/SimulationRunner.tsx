'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FlaskConical,
  GitCompare,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * Simulación admin panel (§5.5 item 4).
 *
 * The founder-facing control surface for Workstream B's "B pipeline": start a
 * run (against a real Pulse or as a free-text brand pre-test), poll it, run the
 * Sonnet synthesis, compute the Divergence Index once the Pulse has closed, and
 * MANUALLY reveal/hide a run (the §5.2 gate — automated only after Sep 15).
 *
 * Every action calls an admin-guarded route under
 * `/api/predictions/admin/simulation/...`; this component never touches the raw
 * `simulation_*` tables directly. Simulated data always renders under a
 * persistent amber `SIMULACIÓN IA` badge (§1: green = real, amber = simulated).
 */

// ---------------------------------------------------------------------------
// Types (mirror the admin API responses; the sim tables are untyped until
// migrations 252-254 land — see the list route's TODO).
// ---------------------------------------------------------------------------

type PulseMarket = {
  id: string
  title: string
  status: string
  isDraft: boolean
  totalVotes: number
  sponsorName: string | null
  resolutionDate: string | null
  createdAt: string
}

type RunAggregates = {
  option_shares: Record<string, number>
  avg_confidence_by_option: Record<string, number>
  confidence_weighted_shares: Record<string, number>
  completion_rate: number
  synthesis?: SynthesisResult
  request_context?: {
    question: string
    description: string | null
    options: string[]
  }
}

type SynthesisResult = {
  resumen_es: string
  resumen_en: string
  divergencias_clave: string[]
  hipotesis_divergencia: string
  cita_sim_representativa: string
  angulo_contenido: string
}

type DivergencePerOption = {
  option: string
  real_share: number
  sim_share: number
  share_abs_diff: number
  real_confidence: number | null
  sim_confidence: number | null
  confidence_abs_diff: number | null
  in_both_confidence: boolean
}

type DivergenceResult = {
  id: number
  delta_shares: number
  delta_confidence: number
  per_option: DivergencePerOption[]
}

type SimulationRun = {
  id: string
  market_id: string | null
  market_title: string | null
  market_status: string | null
  market_closed: boolean
  persona_version: string
  model: string
  prompt_version: string
  n_agents: number
  status: string
  is_brand_pretest: boolean
  question_override: string | null
  aggregates: RunAggregates | null
  divergence: DivergenceResult | null
  revealed_at: string | null
  batch_id: string | null
  created_at: string | null
}

type Mode = 'market' | 'brand'
type ActionKey = 'check' | 'synthesis' | 'divergence' | 'reveal'

interface Props {
  parentBusy: boolean
}

function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function pct(n: number | undefined | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function conf(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}/10`
}

export default function SimulationRunner({ parentBusy }: Props) {
  const { language } = useLanguage()
  const t = useCallback(
    (es: string, en: string) => (language === 'es' ? es : en),
    [language],
  )
  const locale = language === 'es' ? 'es-MX' : 'en-US'

  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [markets, setMarkets] = useState<PulseMarket[]>([])
  const [marketsError, setMarketsError] = useState<string | null>(null)

  // Trigger form state.
  const [mode, setMode] = useState<Mode>('market')
  const [marketId, setMarketId] = useState('')
  const [isBacktest, setIsBacktest] = useState(false)
  const [question, setQuestion] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [description, setDescription] = useState('')
  const [personaVersion, setPersonaVersion] = useState('cdmx-v1')
  const [nAgents, setNAgents] = useState(150)

  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [startOk, setStartOk] = useState<string | null>(null)

  // Per-run action + expansion state.
  const [busyAction, setBusyAction] = useState<string | null>(null) // `${runId}:${action}`
  const [rowError, setRowError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions/admin/simulation')
      const json = (await res.json().catch(() => ({}))) as {
        runs?: SimulationRun[]
        error?: string
      }
      if (!res.ok) {
        throw new Error(json.error ?? `Failed to load runs (${res.status})`)
      }
      setRuns(json.runs ?? [])
      setListError(null)
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load runs')
    } finally {
      setRunsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  // Reuse the existing admin Pulse picker endpoint for the market dropdown.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/predictions/admin/pulse-markets-list')
        const json = (await res.json().catch(() => ({}))) as {
          markets?: PulseMarket[]
          error?: string
        }
        if (cancelled) return
        if (!res.ok) throw new Error(json.error ?? `Failed to load markets (${res.status})`)
        setMarkets(json.markets ?? [])
      } catch (e) {
        if (cancelled) return
        setMarketsError(e instanceof Error ? e.message : 'Failed to load markets')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const groupedMarkets = useMemo(() => {
    const resolved = markets.filter((m) => !m.isDraft && m.status === 'resolved')
    const active = markets.filter((m) => !m.isDraft && m.status === 'active')
    const other = markets.filter(
      (m) => m.isDraft || (m.status !== 'resolved' && m.status !== 'active'),
    )
    return { resolved, active, other }
  }, [markets])

  const startDisabled =
    starting ||
    parentBusy ||
    (mode === 'market'
      ? !marketId
      : question.trim().length === 0 ||
        optionsText.split('\n').filter((o) => o.trim().length > 0).length < 2)

  async function startRun() {
    if (startDisabled) return
    setStarting(true)
    setStartError(null)
    setStartOk(null)
    try {
      const payload: Record<string, unknown> = {
        mode,
        personaVersion: personaVersion.trim() || 'cdmx-v1',
        nAgents,
      }
      if (mode === 'market') {
        payload.marketId = marketId
        payload.isBacktest = isBacktest
      } else {
        payload.questionOverride = question.trim()
        payload.options = optionsText
          .split('\n')
          .map((o) => o.trim())
          .filter((o) => o.length > 0)
        if (description.trim().length > 0) payload.description = description.trim()
      }
      const res = await fetch('/api/predictions/admin/simulation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        result?: { runId?: string; batchId?: string; nAgents?: number }
      }
      if (!res.ok) throw new Error(json.error ?? `Start failed (${res.status})`)
      setStartOk(
        t(
          `Simulación iniciada · ${json.result?.nAgents ?? nAgents} agentes · batch ${
            json.result?.batchId?.slice(0, 12) ?? '—'
          }… Usa «Check» cuando el batch termine.`,
          `Simulation started · ${json.result?.nAgents ?? nAgents} agents · batch ${
            json.result?.batchId?.slice(0, 12) ?? '—'
          }… Use "Check" once the batch ends.`,
        ),
      )
      await fetchRuns()
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Start failed')
    } finally {
      setStarting(false)
    }
  }

  async function runAction(run: SimulationRun, action: ActionKey, reveal?: boolean) {
    const key = `${run.id}:${action}`
    if (busyAction) return
    setBusyAction(key)
    setRowError(null)
    try {
      const url =
        action === 'reveal'
          ? `/api/predictions/admin/simulation/${run.id}/reveal`
          : `/api/predictions/admin/simulation/${run.id}/${action}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reveal' ? JSON.stringify({ reveal }) : undefined,
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? `${action} failed (${res.status})`)
      await fetchRuns()
    } catch (e) {
      setRowError(e instanceof Error ? e.message : `${action} failed`)
    } finally {
      setBusyAction(null)
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const subjectLabel = (run: SimulationRun): string => {
    if (run.is_brand_pretest) {
      return run.question_override ?? run.aggregates?.request_context?.question ?? '(brand pre-test)'
    }
    return (
      run.market_title ??
      run.aggregates?.request_context?.question ??
      run.market_id ??
      '—'
    )
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <FlaskConical className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-semibold text-white">Simulación</h2>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
          SIMULACIÓN IA
        </span>
        <span
          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
          title={t('Sin schedule automático — revelar es manual durante calibración', 'No automatic schedule — reveal is manual during calibration')}
        >
          Manual
        </span>
      </div>
      <p className="text-slate-400 text-sm mb-4 max-w-3xl">
        {t(
          'Panel de agentes sintéticos (§5.5): corre un panel de personas CDMX sobre un Pulse real o un brand pre-test, calcula agregados + Índice de Divergencia contra el Pulse real, y revela manualmente. Datos 100% separados de los votos reales.',
          'Synthetic-agent panel (§5.5): run a CDMX persona panel over a real Pulse or a brand pre-test, compute aggregates + Divergence Index against the real Pulse, and reveal manually. Fully separated from real votes.',
        )}
      </p>

      {/* TRIGGER FORM */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('market')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'market'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t('Pulse existente', 'Existing Pulse')}
          </button>
          <button
            type="button"
            onClick={() => setMode('brand')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'brand'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t('Brand pre-test', 'Brand pre-test')}
          </button>
        </div>

        {mode === 'market' ? (
          <div className="space-y-2">
            <label className="block text-xs text-slate-400">{t('Pulse (mercado)', 'Pulse (market)')}</label>
            {marketsError ? (
              <div className="text-sm text-red-400">{marketsError}</div>
            ) : (
              <select
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">{t('— Selecciona un Pulse —', '— Select a Pulse —')}</option>
                {groupedMarkets.resolved.length > 0 && (
                  <optgroup label={t('Cerrados (backtest / divergencia lista)', 'Closed (backtest / divergence ready)')}>
                    {groupedMarkets.resolved.map((m) => (
                      <option key={m.id} value={m.id}>
                        {`${m.title} · ${m.totalVotes} votos`}
                      </option>
                    ))}
                  </optgroup>
                )}
                {groupedMarkets.active.length > 0 && (
                  <optgroup label={t('Activos (todavía votando)', 'Active (still voting)')}>
                    {groupedMarkets.active.map((m) => (
                      <option key={m.id} value={m.id}>
                        {`${m.title} · ${m.totalVotes} votos`}
                      </option>
                    ))}
                  </optgroup>
                )}
                {groupedMarkets.other.length > 0 && (
                  <optgroup label={t('Otros / borradores', 'Other / drafts')}>
                    {groupedMarkets.other.map((m) => (
                      <option key={m.id} value={m.id}>
                        {`${m.title} · ${m.status}`}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
            <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isBacktest}
                onChange={(e) => setIsBacktest(e.target.checked)}
                className="accent-emerald-500"
              />
              {t('Backtest (Pulse ya cerrado — datapoint de divergencia inmediato)', 'Backtest (already-closed Pulse — instant divergence datapoint)')}
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('Pregunta', 'Question')}</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('ej. ¿Qué nombre de producto prefieres?', 'e.g. Which product name do you prefer?')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('Opciones (una por línea, mínimo 2)', 'Options (one per line, min 2)')}
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={3}
                placeholder={t('Opción A\nOpción B\nOpción C', 'Option A\nOption B\nOption C')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('Descripción (opcional)', 'Description (optional)')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('Versión de personas', 'Persona version')}</label>
            <input
              type="text"
              value={personaVersion}
              onChange={(e) => setPersonaVersion(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('Nº de agentes', 'Nº of agents')}</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={nAgents}
              onChange={(e) => setNAgents(Math.max(1, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="button"
              onClick={startRun}
              disabled={startDisabled}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <Play className="w-4 h-4" />
              {starting ? t('Iniciando…', 'Starting…') : t('Iniciar simulación', 'Start simulation')}
            </button>
          </div>
        </div>

        {startError && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2 py-1">
            {startError}
          </div>
        )}
        {startOk && (
          <div className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 rounded px-2 py-1">
            {startOk}
          </div>
        )}
      </div>

      {/* RUNS TABLE */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{t('Corridas', 'Runs')}</h3>
        <button
          type="button"
          onClick={() => fetchRuns()}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${runsLoading ? 'animate-spin' : ''}`} />
          {t('Actualizar', 'Refresh')}
        </button>
      </div>

      {listError && <div className="text-sm text-red-400 mb-3">{listError}</div>}
      {rowError && <div className="text-sm text-red-400 mb-3">{rowError}</div>}

      {runsLoading ? (
        <div className="text-slate-500 py-6 text-center text-sm">{t('Cargando…', 'Loading…')}</div>
      ) : runs.length === 0 ? (
        <div className="text-slate-500 py-6 text-center text-sm">
          {t('Aún no hay corridas. Inicia una arriba.', 'No runs yet. Start one above.')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 text-left">
                <th className="px-3 py-3 w-6" />
                <th className="px-3 py-3">{t('Creada', 'Created')}</th>
                <th className="px-3 py-3">{t('Sujeto', 'Subject')}</th>
                <th className="px-3 py-3">{t('Tipo', 'Type')}</th>
                <th className="px-3 py-3">{t('Agentes', 'Agents')}</th>
                <th className="px-3 py-3">{t('Estado', 'Status')}</th>
                <th className="px-3 py-3">{t('Completitud', 'Completion')}</th>
                <th className="px-3 py-3">{t('Divergencia', 'Divergence')}</th>
                <th className="px-3 py-3">{t('Revelada', 'Revealed')}</th>
                <th className="px-3 py-3">{t('Acciones', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const isOpen = expanded.has(run.id)
                const complete = run.status === 'complete'
                const divergenceReady = complete && !run.is_brand_pretest && run.market_closed
                const revealed = !!run.revealed_at
                return (
                  <FragmentRow
                    key={run.id}
                    run={run}
                    isOpen={isOpen}
                    complete={complete}
                    divergenceReady={divergenceReady}
                    revealed={revealed}
                    busyAction={busyAction}
                    locale={locale}
                    t={t}
                    subjectLabel={subjectLabel(run)}
                    onToggle={() => toggleExpand(run.id)}
                    onAction={runAction}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Row + expanded viewer
// ---------------------------------------------------------------------------

function FragmentRow({
  run,
  isOpen,
  complete,
  divergenceReady,
  revealed,
  busyAction,
  locale,
  t,
  subjectLabel,
  onToggle,
  onAction,
}: {
  run: SimulationRun
  isOpen: boolean
  complete: boolean
  divergenceReady: boolean
  revealed: boolean
  busyAction: string | null
  locale: string
  t: (es: string, en: string) => string
  subjectLabel: string
  onToggle: () => void
  onAction: (run: SimulationRun, action: ActionKey, reveal?: boolean) => void
}) {
  const busy = (action: ActionKey) => busyAction === `${run.id}:${action}`
  const anyBusy = !!busyAction
  const statusColor =
    run.status === 'complete'
      ? 'text-emerald-400'
      : run.status === 'failed'
        ? 'text-red-400'
        : 'text-amber-400'

  return (
    <>
      <tr className="border-t border-slate-700 align-top">
        <td className="px-3 py-3">
          <button type="button" onClick={onToggle} className="text-slate-400 hover:text-white">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
          {formatDateTime(run.created_at, locale)}
        </td>
        <td className="px-3 py-3 text-white max-w-[16rem]">
          <span className="block truncate" title={subjectLabel}>{subjectLabel}</span>
          {run.batch_id && (
            <span className="text-[11px] text-slate-500 font-mono">
              batch {run.batch_id.slice(0, 12)}…
            </span>
          )}
        </td>
        <td className="px-3 py-3">
          {run.is_brand_pretest ? (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {t('Brand', 'Brand')}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">{t('Pulse', 'Pulse')}</span>
          )}
        </td>
        <td className="px-3 py-3 text-slate-300">{run.n_agents}</td>
        <td className={`px-3 py-3 ${statusColor}`}>{run.status}</td>
        <td className="px-3 py-3 text-slate-300">
          {complete ? pct(run.aggregates?.completion_rate) : '—'}
        </td>
        <td className="px-3 py-3 text-slate-300">
          {run.divergence ? Math.round(run.divergence.id) : '—'}
        </td>
        <td className="px-3 py-3">
          {revealed ? (
            <span className="text-emerald-400 text-xs">{formatDateTime(run.revealed_at, locale)}</span>
          ) : (
            <span className="text-slate-500 text-xs">{t('oculta', 'hidden')}</span>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onAction(run, 'check')}
              disabled={anyBusy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs"
              title={t('Polear batch y calcular agregados', 'Poll batch and compute aggregates')}
            >
              {busy('check') ? '…' : 'Check'}
            </button>
            <button
              type="button"
              onClick={() => onAction(run, 'synthesis')}
              disabled={anyBusy || !complete}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs"
              title={complete ? t('Síntesis (Sonnet)', 'Synthesis (Sonnet)') : t('Requiere corrida completa', 'Requires a completed run')}
            >
              <Sparkles className="w-3 h-3" />
              {busy('synthesis') ? '…' : t('Síntesis', 'Synthesis')}
            </button>
            <button
              type="button"
              onClick={() => onAction(run, 'divergence')}
              disabled={anyBusy || !divergenceReady}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs"
              title={
                divergenceReady
                  ? t('Calcular Índice de Divergencia', 'Compute Divergence Index')
                  : run.is_brand_pretest
                    ? t('Los brand pre-tests no tienen Pulse real que comparar', 'Brand pre-tests have no real Pulse to compare')
                    : t('Disponible cuando el Pulse cierra y la corrida está completa', 'Available once the Pulse closes and the run is complete')
              }
            >
              <GitCompare className="w-3 h-3" />
              {busy('divergence') ? '…' : t('Divergencia', 'Divergence')}
            </button>
            <button
              type="button"
              onClick={() => onAction(run, 'reveal', !revealed)}
              disabled={anyBusy}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded disabled:opacity-50 text-xs font-medium ${
                revealed
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
              }`}
              title={t('Gate §5.2 — manual durante calibración', 'Gate §5.2 — manual during calibration')}
            >
              {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {busy('reveal') ? '…' : revealed ? t('Ocultar', 'Hide') : t('Revelar', 'Reveal')}
            </button>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-t border-slate-800 bg-slate-900/40">
          <td colSpan={10} className="px-4 py-4">
            <RunDetail run={run} t={t} />
          </td>
        </tr>
      )}
    </>
  )
}

function RunDetail({
  run,
  t,
}: {
  run: SimulationRun
  t: (es: string, en: string) => string
}) {
  const agg = run.aggregates
  const synthesis = agg?.synthesis
  const div = run.divergence

  if (!agg) {
    return (
      <div className="text-sm text-slate-500 italic">
        {t('Sin agregados todavía. Corre «Check» cuando el batch termine.', 'No aggregates yet. Run "Check" once the batch ends.')}
      </div>
    )
  }

  const options = Object.keys(agg.option_shares)

  return (
    <div className="space-y-5">
      {/* Aggregates */}
      <div>
        <div className="text-xs uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">SIMULACIÓN IA</span>
          {t('Agregados', 'Aggregates')}
          <span className="text-slate-500 normal-case tracking-normal">
            · {t('Completitud', 'Completion')} {pct(agg.completion_rate)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="py-1 pr-4">{t('Opción', 'Option')}</th>
                <th className="py-1 pr-4">{t('Share', 'Share')}</th>
                <th className="py-1 pr-4">{t('Confianza prom.', 'Avg confidence')}</th>
                <th className="py-1 pr-4">{t('Share pond. conf.', 'Conf-weighted share')}</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => (
                <tr key={opt} className="border-t border-slate-800">
                  <td className="py-1 pr-4 text-slate-200 max-w-[18rem] truncate" title={opt}>{opt}</td>
                  <td className="py-1 pr-4 text-slate-300">{pct(agg.option_shares[opt])}</td>
                  <td className="py-1 pr-4 text-slate-300">{conf(agg.avg_confidence_by_option[opt])}</td>
                  <td className="py-1 pr-4 text-slate-300">{pct(agg.confidence_weighted_shares[opt])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Divergence */}
      {div && (
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            {t('Índice de Divergencia', 'Divergence Index')}: <span className="text-white font-semibold">{div.id.toFixed(1)}</span>
            <span className="text-slate-500 normal-case tracking-normal">
              {' '}· Δshares {div.delta_shares.toFixed(3)} · Δconfidence {div.delta_confidence.toFixed(3)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="py-1 pr-4">{t('Opción', 'Option')}</th>
                  <th className="py-1 pr-4">{t('Real share', 'Real share')}</th>
                  <th className="py-1 pr-4">{t('Sim share', 'Sim share')}</th>
                  <th className="py-1 pr-4">|Δ|</th>
                  <th className="py-1 pr-4">{t('Real conf.', 'Real conf.')}</th>
                  <th className="py-1 pr-4">{t('Sim conf.', 'Sim conf.')}</th>
                </tr>
              </thead>
              <tbody>
                {div.per_option.map((po) => (
                  <tr key={po.option} className="border-t border-slate-800">
                    <td className="py-1 pr-4 text-slate-200 max-w-[16rem] truncate" title={po.option}>{po.option}</td>
                    <td className="py-1 pr-4 text-slate-300">{pct(po.real_share)}</td>
                    <td className="py-1 pr-4 text-amber-300">{pct(po.sim_share)}</td>
                    <td className="py-1 pr-4 text-slate-400">{(po.share_abs_diff * 100).toFixed(1)}</td>
                    <td className="py-1 pr-4 text-slate-300">{conf(po.real_confidence)}</td>
                    <td className="py-1 pr-4 text-amber-300">{conf(po.sim_confidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Synthesis */}
      {synthesis && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-slate-400">{t('Síntesis', 'Synthesis')}</div>
          {synthesis.resumen_es && (
            <div>
              <div className="text-[11px] text-slate-500">resumen_es</div>
              <p className="text-sm text-slate-200 leading-relaxed">{synthesis.resumen_es}</p>
            </div>
          )}
          {synthesis.resumen_en && (
            <div>
              <div className="text-[11px] text-slate-500">resumen_en</div>
              <p className="text-sm text-slate-200 leading-relaxed">{synthesis.resumen_en}</p>
            </div>
          )}
          {synthesis.divergencias_clave?.length > 0 && (
            <div>
              <div className="text-[11px] text-slate-500">divergencias_clave</div>
              <ul className="list-disc list-inside text-sm text-slate-200 space-y-0.5">
                {synthesis.divergencias_clave.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {synthesis.hipotesis_divergencia && (
            <div>
              <div className="text-[11px] text-slate-500">hipotesis_divergencia</div>
              <p className="text-sm text-slate-200 leading-relaxed">{synthesis.hipotesis_divergencia}</p>
            </div>
          )}
          {synthesis.cita_sim_representativa && (
            <div>
              <div className="text-[11px] text-slate-500">cita_sim_representativa</div>
              <p className="text-sm text-slate-200 italic leading-relaxed">
                &ldquo;{synthesis.cita_sim_representativa}&rdquo;
              </p>
            </div>
          )}
          {synthesis.angulo_contenido && (
            <div>
              <div className="text-[11px] text-slate-500">angulo_contenido</div>
              <p className="text-sm text-slate-200 leading-relaxed">{synthesis.angulo_contenido}</p>
            </div>
          )}
        </div>
      )}

      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-800">
        <span>model: {run.model}</span>
        <span>prompt: {run.prompt_version}</span>
        <span>persona: {run.persona_version}</span>
        {run.market_id && <span>market: {run.market_id.slice(0, 8)}…{run.market_status ? ` (${run.market_status})` : ''}</span>}
      </div>
    </div>
  )
}
