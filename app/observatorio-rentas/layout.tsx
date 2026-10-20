import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import { ObsShell } from './_components/ObsShell'

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-obs' })

export const metadata: Metadata = {
  title: { absolute: 'Observatorio de Rentas CDMX · Demostración' },
  description: 'Demostración con datos simulados del Observatorio de Rentas CDMX.',
  robots: { index: false, follow: false },
}

export default function ObservatorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${archivo.variable} obs-root`} lang="es">
      <ObsShell>{children}</ObsShell>
    </div>
  )
}
