'use client'

import { useState, type ReactNode } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

type FAQItem = { q: string; a: ReactNode }

type Section = {
  title: string
  body: ReactNode
}

type LocaleContent = {
  title: string
  subtitle: string
  lastUpdated: string
  faqHeading: string
  sections: Section[]
  footerNote: string
  backHome: string
}

export default function SoportePage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const esFaq: FAQItem[] = [
    {
      q: '¿Cómo creo una cuenta?',
      a: 'En la app móvil o en crowdconscious.app, podés registrarte con tu correo electrónico (te enviamos un magic link) o con tu Apple ID. No necesitás contraseña.',
    },
    {
      q: 'No me llega el correo del magic link.',
      a: (
        <>
          Verificá tu carpeta de spam/correo no deseado. Si tras 5 minutos sigue sin llegar, escribinos a{' '}
          <a className="text-teal-700 hover:underline" href="mailto:comunidad@crowdconscious.app">
            comunidad@crowdconscious.app
          </a>{' '}
          con el correo desde el que intentaste registrarte.
        </>
      ),
    },
    {
      q: '¿Cómo creo una señal ciudadana?',
      a: 'Desde la app móvil → tab Signals → botón "Crear señal". Te guiamos por 4 pasos: tipo de señal, ubicación, descripción, evidencias. Por ahora, las señales están disponibles solo en Ciudad de México.',
    },
    {
      q: '¿Cómo voto en un Pulse?',
      a: 'Tab Pulses → seleccioná un Pulse → elegí tu predicción y nivel de confianza (1-10) → tocá "Votar". Ganás XP cada vez que votás.',
    },
    {
      q: '¿Puedo cambiar mi voto?',
      a: 'Sí. Volvé al mismo Pulse y tocá "Cambiar voto". El XP del voto original se mantiene; cambios sucesivos no acumulan XP adicional.',
    },
    {
      q: '¿Cómo reporto contenido inapropiado?',
      a: 'En cualquier señal, tocá el ícono de bandera desde el detalle o mantené presionada la tarjeta en la lista para abrir el menú "Reportar". Eligí motivo y agregá una nota si querés. Respondemos en menos de 24 horas hábiles.',
    },
    {
      q: '¿Cómo bloqueo a otro usuario?',
      a: 'En el detalle de cualquier señal, tocá "Bloquear usuario". No volverás a ver su contenido en tu feed.',
    },
    {
      q: '¿Cómo borro mi cuenta?',
      a: 'Desde la app: Perfil → Cuenta → Eliminar mi cuenta. Procesamos la solicitud en hasta 7 días hábiles. Tu contenido público (señales, votos) puede mantenerse en logs anonimizados por integridad histórica, conforme a la LFPDPPP.',
    },
    {
      q: '¿Cuánto XP necesito para subir de tier?',
      a: 'Tier 1 → Tier 2: 500 XP. Tier 2 → Tier 3: 1,500 XP. Tier 3 → Tier 4: 5,000 XP. Tier 4 → Tier 5: 15,000 XP.',
    },
    {
      q: '¿Para qué sirve el Fondo Consciente?',
      a: (
        <>
          Cada mes, todas las donaciones se asignan a la causa que más votos reciba de la comunidad. Los patrocinios
          corporativos también aportan al fondo. Ver la distribución en{' '}
          <Link href="/fund" className="text-teal-700 hover:underline">
            crowdconscious.app/fund
          </Link>
          .
        </>
      ),
    },
    {
      q: '¿La app es gratuita?',
      a: 'Sí, completamente gratis. No tenemos suscripciones, ni compras dentro de la app. Las donaciones al Fondo Consciente son opcionales y se procesan vía Stripe en la web.',
    },
    {
      q: 'No encuentro mi ciudad/alcaldía para crear una señal.',
      a: 'Por ahora la creación de señales está en pilot solo en CDMX (16 alcaldías). Próximamente expandimos a Guadalajara, Monterrey y más. Los Pulses, Locations y Fund funcionan en todo México y más allá.',
    },
  ]

  const enFaq: FAQItem[] = [
    {
      q: 'How do I create an account?',
      a: 'In the mobile app or at crowdconscious.app, you can sign up with your email (we send you a magic link) or with your Apple ID. No password required.',
    },
    {
      q: 'I’m not receiving the magic link email.',
      a: (
        <>
          Check your spam / junk folder. If it still hasn’t arrived after 5 minutes, email us at{' '}
          <a className="text-teal-700 hover:underline" href="mailto:comunidad@crowdconscious.app">
            comunidad@crowdconscious.app
          </a>{' '}
          from (or referencing) the address you tried to sign up with.
        </>
      ),
    },
    {
      q: 'How do I create a citizen signal?',
      a: 'From the mobile app → Signals tab → "Create signal" button. We guide you through 4 steps: signal type, location, description, and evidence. For now, signals are only available in Mexico City.',
    },
    {
      q: 'How do I vote on a Pulse?',
      a: 'Pulses tab → pick a Pulse → choose your prediction and confidence level (1–10) → tap "Vote". You earn XP every time you vote.',
    },
    {
      q: 'Can I change my vote?',
      a: 'Yes. Go back to the same Pulse and tap "Change vote". The XP from your original vote is preserved; subsequent changes do not earn additional XP.',
    },
    {
      q: 'How do I report inappropriate content?',
      a: 'On any signal, tap the flag icon from the detail view, or long-press the card in the list to open the "Report" menu. Pick a reason and add a note if you’d like. We respond within 24 business hours.',
    },
    {
      q: 'How do I block another user?',
      a: 'On any signal detail, tap "Block user". You won’t see their content in your feed anymore.',
    },
    {
      q: 'How do I delete my account?',
      a: 'From the app: Profile → Account → Delete my account. We process the request within 7 business days. Your public content (signals, votes) may be kept in anonymized logs for historical integrity, in accordance with Mexico’s LFPDPPP.',
    },
    {
      q: 'How much XP do I need to level up?',
      a: 'Tier 1 → Tier 2: 500 XP. Tier 2 → Tier 3: 1,500 XP. Tier 3 → Tier 4: 5,000 XP. Tier 4 → Tier 5: 15,000 XP.',
    },
    {
      q: 'What is the Conscious Fund for?',
      a: (
        <>
          Each month, every donation is allocated to the cause that receives the most community votes. Corporate
          sponsorships also contribute to the fund. See the distribution at{' '}
          <Link href="/fund" className="text-teal-700 hover:underline">
            crowdconscious.app/fund
          </Link>
          .
        </>
      ),
    },
    {
      q: 'Is the app free?',
      a: 'Yes, completely free. We have no subscriptions or in-app purchases. Donations to the Conscious Fund are optional and processed via Stripe on the web.',
    },
    {
      q: 'I can’t find my city / municipality to create a signal.',
      a: 'Signal creation is currently a pilot in Mexico City only (16 boroughs). We’re expanding soon to Guadalajara, Monterrey, and beyond. Pulses, Locations and the Fund work across Mexico and beyond.',
    },
  ]

  const renderFaq = (items: FAQItem[]) => (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <details
          key={idx}
          className="group border border-gray-200 rounded-lg bg-white open:shadow-sm transition-shadow"
        >
          <summary className="cursor-pointer list-none flex items-start justify-between gap-4 px-4 py-3 font-semibold text-gray-900 hover:text-teal-700">
            <span>{item.q}</span>
            <span className="text-teal-600 text-xl leading-none select-none group-open:rotate-45 transition-transform">
              +
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1 text-gray-700 leading-relaxed">{item.a}</div>
        </details>
      ))}
    </div>
  )

  const content: Record<'es' | 'en', LocaleContent> = {
    es: {
      title: 'Soporte',
      subtitle: '¿Necesitas ayuda? Estamos aquí.',
      lastUpdated: 'Última actualización: 18 de mayo de 2026',
      faqHeading: '2. Preguntas frecuentes',
      backHome: '← Volver a Crowd Conscious',
      footerNote:
        'Estamos para ayudarte. Si no encontrás respuesta acá, escribinos y un humano te responde.',
      sections: [
        {
          title: '1. Contacto directo',
          body: (
            <ul className="space-y-2 text-gray-700 leading-relaxed list-disc list-inside">
              <li>
                Email:{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:comunidad@crowdconscious.app"
                >
                  comunidad@crowdconscious.app
                </a>
              </li>
              <li>Tiempo de respuesta: 24 horas hábiles (lunes a viernes, horario CDMX).</li>
              <li>
                Para reportes de moderación urgentes:{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:moderacion@crowdconscious.app"
                >
                  moderacion@crowdconscious.app
                </a>{' '}
                (24h SLA).
              </li>
            </ul>
          ),
        },
        {
          title: '2. Preguntas frecuentes',
          body: renderFaq(esFaq),
        },
        {
          title: '3. Reportar un problema técnico',
          body: (
            <>
              <p className="text-gray-700 leading-relaxed mb-3">
                Si encontrás un bug, escribinos con:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 leading-relaxed mb-3">
                <li>Modelo de teléfono y versión del sistema operativo.</li>
                <li>Versión de la app (Perfil → Acerca de).</li>
                <li>Pasos para reproducir el error.</li>
                <li>Captura de pantalla si es posible.</li>
              </ol>
              <p className="text-gray-700 leading-relaxed">
                Email:{' '}
                <a className="text-teal-700 hover:underline" href="mailto:bugs@crowdconscious.app">
                  bugs@crowdconscious.app
                </a>{' '}
                (o{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:comunidad@crowdconscious.app"
                >
                  comunidad@crowdconscious.app
                </a>{' '}
                si preferís).
              </p>
            </>
          ),
        },
        {
          title: '4. Política de moderación',
          body: (
            <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
              <li>Las señales ciudadanas son contenido público creado por la comunidad.</li>
              <li>Nuestro equipo revisa cada señal antes de publicarla.</li>
              <li>
                Una señal puede ser despublicada si recibe 3 o más reportes en 24 horas, hasta nueva
                revisión humana.
              </li>
              <li>
                Tenemos cero tolerancia para contenido de odio, violencia, explotación sexual, acoso
                o desinformación que pueda causar daño real.
              </li>
              <li>
                Apelaciones:{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:moderacion@crowdconscious.app"
                >
                  moderacion@crowdconscious.app
                </a>
                .
              </li>
            </ul>
          ),
        },
        {
          title: '5. Solicitudes de datos (LFPDPPP / RGPD)',
          body: (
            <>
              <p className="text-gray-700 leading-relaxed mb-3">
                Para ejercer tus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) o
                solicitar portabilidad de tus datos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 leading-relaxed mb-3">
                <li>
                  Email:{' '}
                  <a
                    className="text-teal-700 hover:underline"
                    href="mailto:comunidad@crowdconscious.app"
                  >
                    comunidad@crowdconscious.app
                  </a>
                </li>
                <li>Asunto sugerido: &quot;Solicitud ARCO - [tu correo]&quot;</li>
                <li>Procesamos en hasta 20 días hábiles conforme a la LFPDPPP.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Más detalle en nuestro{' '}
                <Link href="/privacy" className="text-teal-700 hover:underline">
                  Aviso de Privacidad
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: '6. Estado del servicio',
          body: (
            <>
              <p className="text-gray-700 leading-relaxed mb-3">
                Para incidentes mayores (caída del servicio, problemas de login generalizados),
                publicamos updates en:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 leading-relaxed">
                <li>Email broadcast a usuarios activos cuando aplique.</li>
                <li>
                  Banner dentro de la app y nota visible en{' '}
                  <Link href="/" className="text-teal-700 hover:underline">
                    crowdconscious.app
                  </Link>
                  .
                </li>
              </ul>
            </>
          ),
        },
      ],
    },
    en: {
      title: 'Support',
      subtitle: 'Need help? We’re here.',
      lastUpdated: 'Last updated: May 18, 2026',
      faqHeading: '2. Frequently Asked Questions',
      backHome: '← Back to Crowd Conscious',
      footerNote:
        'We’re here to help. If you can’t find an answer here, email us and a human will reply.',
      sections: [
        {
          title: '1. Direct Contact',
          body: (
            <ul className="space-y-2 text-gray-700 leading-relaxed list-disc list-inside">
              <li>
                Email:{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:comunidad@crowdconscious.app"
                >
                  comunidad@crowdconscious.app
                </a>
              </li>
              <li>Response time: 24 business hours (Mon–Fri, CDMX time zone).</li>
              <li>
                For urgent moderation reports:{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:moderacion@crowdconscious.app"
                >
                  moderacion@crowdconscious.app
                </a>{' '}
                (24h SLA).
              </li>
            </ul>
          ),
        },
        {
          title: '2. Frequently Asked Questions',
          body: renderFaq(enFaq),
        },
        {
          title: '3. Report a Technical Issue',
          body: (
            <>
              <p className="text-gray-700 leading-relaxed mb-3">
                If you find a bug, please send us:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 leading-relaxed mb-3">
                <li>Phone model and operating-system version.</li>
                <li>App version (Profile → About).</li>
                <li>Steps to reproduce the error.</li>
                <li>A screenshot if possible.</li>
              </ol>
              <p className="text-gray-700 leading-relaxed">
                Email:{' '}
                <a className="text-teal-700 hover:underline" href="mailto:bugs@crowdconscious.app">
                  bugs@crowdconscious.app
                </a>{' '}
                (or{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:comunidad@crowdconscious.app"
                >
                  comunidad@crowdconscious.app
                </a>{' '}
                if you prefer).
              </p>
            </>
          ),
        },
        {
          title: '4. Moderation Policy',
          body: (
            <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
              <li>Citizen signals are public content created by the community.</li>
              <li>Our team reviews every signal before it is published.</li>
              <li>
                A signal may be unpublished if it receives 3 or more reports within 24 hours,
                pending a fresh human review.
              </li>
              <li>
                We have zero tolerance for hate, violence, sexual exploitation, harassment, or
                disinformation that can cause real-world harm.
              </li>
              <li>
                Appeals:{' '}
                <a
                  className="text-teal-700 hover:underline"
                  href="mailto:moderacion@crowdconscious.app"
                >
                  moderacion@crowdconscious.app
                </a>
                .
              </li>
            </ul>
          ),
        },
        {
          title: '5. Data Requests (LFPDPPP / GDPR)',
          body: (
            <>
              <p className="text-gray-700 leading-relaxed mb-3">
                To exercise your ARCO rights (Access, Rectification, Cancellation, Opposition) or
                request data portability:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 leading-relaxed mb-3">
                <li>
                  Email:{' '}
                  <a
                    className="text-teal-700 hover:underline"
                    href="mailto:comunidad@crowdconscious.app"
                  >
                    comunidad@crowdconscious.app
                  </a>
                </li>
                <li>Suggested subject: &quot;ARCO request - [your email]&quot;</li>
                <li>We process within 20 business days, per Mexico’s LFPDPPP.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                More detail in our{' '}
                <Link href="/privacy" className="text-teal-700 hover:underline">
                  Privacy Notice
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: '6. Service Status',
          body: (
            <>
              <p className="text-gray-700 leading-relaxed mb-3">
                For major incidents (service outage, widespread login issues), we post updates via:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 leading-relaxed">
                <li>Email broadcast to active users when applicable.</li>
                <li>
                  In-app banner and a visible notice on{' '}
                  <Link href="/" className="text-teal-700 hover:underline">
                    crowdconscious.app
                  </Link>
                  .
                </li>
              </ul>
            </>
          ),
        },
      ],
    },
  }

  const current = content[language]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow">
              {current.backHome}
            </div>
          </Link>

          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setLanguage('es')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                language === 'es'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              🇲🇽 Español
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                language === 'en'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        <AnimatedCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{current.title}</h1>
            <p className="text-base text-gray-600 mb-3">{current.subtitle}</p>
            <p className="text-sm text-gray-500">{current.lastUpdated}</p>
          </div>

          <div className="space-y-8">
            {current.sections.map((section, index) => (
              <section
                key={index}
                className="border-b border-gray-200 pb-6 last:border-b-0"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
                <div className="text-gray-700 leading-relaxed">{section.body}</div>
              </section>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-3">{current.footerNote}</p>
            <p className="text-sm text-gray-500">Crowd Conscious — México, 2026</p>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
