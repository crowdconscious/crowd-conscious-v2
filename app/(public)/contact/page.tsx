import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Contacto editorial y de comunidad de Crowd Conscious — emails públicos, domicilio en Ciudad de México, y enlace a soporte.',
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    type: 'website',
    title: 'Contacto | Crowd Conscious',
    description:
      'Escribe a comunidad@crowdconscious.app. Domicilio: Hegel 406, Polanco, C.P. 11560, Ciudad de México.',
    url: `${SITE_URL}/contact`,
  },
}

/**
 * Public /contact trust-anchor page.
 * Reuses only details already published on /privacy and /soporte — no invented phone.
 */
export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-sm font-medium text-teal-700">Crowd Conscious</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Contacto</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Crowd Conscious es una plataforma de periodismo cívico e inteligencia colectiva con sede
          en Ciudad de México. Usa esta página para contacto editorial, comunidad y privacidad. Para
          preguntas frecuentes sobre la app, votos y señales, visita también{' '}
          <Link href="/soporte" className="text-teal-700 underline-offset-2 hover:underline">
            Soporte
          </Link>
          .
        </p>

        <section className="mt-10 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Email</h2>
            <ul className="mt-3 space-y-2 text-slate-700">
              <li>
                Comunidad y editorial:{' '}
                <a
                  className="text-teal-700 underline-offset-2 hover:underline"
                  href="mailto:comunidad@crowdconscious.app"
                >
                  comunidad@crowdconscious.app
                </a>
              </li>
              <li>
                Moderación (urgente):{' '}
                <a
                  className="text-teal-700 underline-offset-2 hover:underline"
                  href="mailto:moderacion@crowdconscious.app"
                >
                  moderacion@crowdconscious.app
                </a>{' '}
                — respuesta en hasta 24 horas hábiles (horario CDMX).
              </li>
            </ul>
            <p className="mt-3 text-sm text-slate-500">
              Tiempo de respuesta habitual: 24 horas hábiles, lunes a viernes, horario Ciudad de
              México.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Domicilio</h2>
            <p className="mt-3 text-slate-700 leading-relaxed">
              Francisco A. Blockstrand (persona física), operando bajo el nombre comercial Crowd
              Conscious.
              <br />
              Hegel 406, Polanco
              <br />
              C.P. 11560, Ciudad de México, México
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Este domicilio es el publicado en nuestro{' '}
              <Link href="/privacy" className="text-teal-700 underline-offset-2 hover:underline">
                Aviso de Privacidad
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Privacidad y derechos ARCO</h2>
            <p className="mt-3 text-slate-700 leading-relaxed">
              Para ejercer derechos de acceso, rectificación, cancelación u oposición, o solicitar
              eliminación de cuenta, escribe a{' '}
              <a
                className="text-teal-700 underline-offset-2 hover:underline"
                href="mailto:comunidad@crowdconscious.app"
              >
                comunidad@crowdconscious.app
              </a>
              . El detalle legal está en{' '}
              <Link href="/privacy" className="text-teal-700 underline-offset-2 hover:underline">
                /privacy
              </Link>{' '}
              y en{' '}
              <Link href="/terms" className="text-teal-700 underline-offset-2 hover:underline">
                /terms
              </Link>
              .
            </p>
          </div>
        </section>

        <p className="mt-12 text-sm text-slate-500">
          <Link href="/" className="text-teal-700 underline-offset-2 hover:underline">
            ← Volver a Crowd Conscious
          </Link>
          {' · '}
          <Link href="/soporte" className="text-teal-700 underline-offset-2 hover:underline">
            Centro de soporte
          </Link>
        </p>
      </div>
    </main>
  )
}
