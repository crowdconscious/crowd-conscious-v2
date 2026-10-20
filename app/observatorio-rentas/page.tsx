import { Suspense } from 'react'
import { OBS_LEGAL_CAP_PCT } from '@/lib/observatorio-rentas/config'
import core from '@/public/observatorio-rentas/data/core.json'
import { MapHome } from './_components/MapHome'
import { fmtDate } from '@/lib/observatorio-rentas/model'

export default function ObservatorioHome() {
  return (
    <>
      <div className="mb-3" data-tour="intro">
        <p className="obs-label">Índice semanal · semana del {fmtDate(core.meta.last_week)}</p>
        <h1 className="obs-h text-2xl sm:text-3xl mt-1">¿Se cumple el tope a la renta en tu colonia?</h1>
        <p className="obs-muted text-sm mt-1 max-w-3xl">
          El tope de {OBS_LEGAL_CAP_PCT.toLocaleString('es-MX')}% ya aplica a las renovaciones de 2026, pero nadie mide si se respeta. Este mapa lo mide con rentas anunciadas y reportes anónimos de renovación.{' '}
          <span className="obs-sim inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Datos simulados</span>
        </p>
      </div>
      <Suspense fallback={<p className="obs-muted" role="status">Cargando mapa…</p>}><MapHome /></Suspense>
    </>
  )
}
