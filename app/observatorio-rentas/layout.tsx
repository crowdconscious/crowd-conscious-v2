import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import { ObsShell } from './_components/ObsShell'
import type { SeedCore } from '@/lib/observatorio-rentas/model'
// Compact seed (~59 KB) is inlined at build time so the first paint needs no client fetch.
import core from '@/public/observatorio-rentas/data/core.json'

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-obs' })

export const metadata: Metadata = {
  title: { absolute: 'Observatorio de Rentas CDMX · Demostración' },
  description: 'Demostración con datos simulados del Observatorio de Rentas CDMX.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function ObservatorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${archivo.variable} obs-root`} lang="es">
      <ObsShell core={core as unknown as SeedCore}>{children}</ObsShell>
    </div>
  )
}
