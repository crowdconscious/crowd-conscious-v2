import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { cookies } from 'next/headers'
import LandingNav from '@/app/components/landing/LandingNav'
import { SITE_URL } from '@/lib/seo/site'

/**
 * `/metodologia-simulacion` (§5.7) — the public methodology page for Pulse
 * Simulation.
 *
 * Server component: metadata/OG are rendered for SEO and the prose ships in the
 * initial HTML, in the visitor's locale (cookie `preferred-language`, es-first).
 * This page is pure methodology and renders regardless of SIM_REVEAL_ENABLED —
 * it never reads or exposes any live simulation data (no `revealed_simulation_runs`
 * read, no `simulation_*` access). It explains, per §5.7: the INEGI/AMAI persona
 * method, the total-separation guarantees, the purpose (auditing AI, not
 * replacing people), the stereotype-flattening limitation stated plainly, and
 * the Conversa privacy note (§6.6).
 */

const TITLE_ES = 'Metodología de Simulación de IA'
const TITLE_EN = 'AI Simulation Methodology'
const DESCRIPTION_ES =
  'Cómo Crowd Conscious construye y audita su panel de personas simuladas por IA: método INEGI/AMAI, separación total de los votos reales, y por qué el objetivo es auditar a la IA, no reemplazar a las personas.'
const DESCRIPTION_EN =
  'How Crowd Conscious builds and audits its panel of AI-simulated people: the INEGI/AMAI method, total separation from real votes, and why the goal is to audit the AI, not replace people.'

export const metadata: Metadata = {
  title: {
    absolute: `${TITLE_ES} | Crowd Conscious`,
  },
  description: DESCRIPTION_ES,
  alternates: {
    canonical: `${SITE_URL}/metodologia-simulacion`,
    languages: {
      'es-MX': `${SITE_URL}/metodologia-simulacion`,
      'en-US': `${SITE_URL}/metodologia-simulacion`,
    },
  },
  openGraph: {
    title: `${TITLE_ES} | Crowd Conscious`,
    description: DESCRIPTION_ES,
    url: `${SITE_URL}/metodologia-simulacion`,
    siteName: 'Crowd Conscious',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE_ES} | Crowd Conscious`,
    description: DESCRIPTION_ES,
  },
}

const Footer = dynamic(() => import('@/components/Footer'))

export const revalidate = 3600

type Section = { title: string; paragraphs: string[] }

const SECTIONS_ES: Section[] = [
  {
    title: 'Qué es la simulación',
    paragraphs: [
      'Para cada Pulse real, un panel de personas simuladas por inteligencia artificial —cada una un perfil demográficamente fundamentado de un residente de la Ciudad de México— vota con exactamente las mismas reglas que una persona real: elige una opción, asigna un nivel de confianza del 1 al 10 y escribe una sola frase de razonamiento. Los resultados de la simulación se guardan por separado y se revelan únicamente cuando el Pulse cierra, junto a los resultados reales, acompañados de un Índice de Divergencia.',
      'La simulación nunca ve las noticias, ni contexto adicional, ni lo que ya votó la gente real. Solo recibe lo que vería cualquier votante: la pregunta, la descripción y las opciones. Así medimos la lectura que la IA hace de la población, no nuestra capacidad de inyectarle información.',
    ],
  },
  {
    title: 'El método de personas: INEGI y AMAI',
    paragraphs: [
      'La biblioteca de personas está calibrada contra distribuciones reales de la Ciudad de México. Partimos de las distribuciones marginales del Censo 2020 del INEGI (edad, sexo, escolaridad y hogares por alcaldía), la textura de ingreso de la ENIGH y las bandas de nivel socioeconómico de la AMAI. Cada persona se construye para que el conjunto reproduzca esas proporciones reales, no estereotipos.',
      'La versión inicial, cdmx-v1, son 150 personas: 100 de Cuauhtémoc y 50 de Miguel Hidalgo. Los pesos poblacionales se normalizan al conjunto final con un asignador determinista de mayor resto (Hamilton), y cada persona incluye una narrativa concreta de su vida diaria —cómo se transporta, cómo se informa, a quién cuida, qué le preocupa— en el español que realmente usaría. Las versiones nunca se mutan: cualquier mejora se publica como una versión nueva y documentada.',
    ],
  },
  {
    title: 'Separación total de los datos reales',
    paragraphs: [
      'Los datos simulados y los reales nunca se mezclan. Los votos simulados viven en tablas propias, aisladas de los votos reales, y jamás se suman a ningún total real. En la base de datos, los votos sintéticos son ilegibles para cualquier cliente hasta el momento de la revelación: la única vía pública de lectura es una vista que solo expone las corridas ya reveladas.',
      'En pantalla, todo lo simulado se muestra siempre con una insignia ámbar persistente que dice «SIMULACIÓN IA». En toda la plataforma, el verde significa datos reales y el ámbar significa datos simulados. Nunca presentamos un número simulado como si fuera una opinión real.',
      'Y respetamos una regla estricta contra el anclaje: la dirección de una predicción de IA jamás es visible para una persona antes de que vote. Esto se garantiza en la capa de datos —el servidor no envía ningún agregado simulado al navegador hasta que se cumplen las condiciones de revelación— y no solo en la interfaz.',
    ],
  },
  {
    title: 'El propósito: auditar a la IA, no reemplazar a las personas',
    paragraphs: [
      'Esta simulación no sustituye la consulta ciudadana. Su objetivo es auditar a la inteligencia artificial: contrastar la lectura que un modelo hace de una población contra lo que esa población realmente opina. El Índice de Divergencia resume esa distancia en una escala de 0 a 100, donde 0 significa que la IA nos leyó perfecto y 100 que no nos conoce en absoluto.',
      'La voz real de la comunidad siempre es la que cuenta. La simulación es un instrumento de medición sobre la IA misma, no un atajo para reemplazar a quien vota.',
    ],
  },
  {
    title: 'Una limitación que decimos en voz alta',
    paragraphs: [
      'Los modelos de lenguaje tienden a aplanar a las personas hacia estereotipos. Una simulación puede caricaturizar a una colonia entera, reduciendo a sus habitantes a un cliché. No escondemos esto: cuando la simulación caricaturiza a una colonia, eso mismo es un hallazgo. La divergencia entre lo simulado y lo real es precisamente la señal que buscamos, porque nos muestra dónde la IA no entiende a la gente.',
    ],
  },
  {
    title: 'Privacidad de Conversa',
    paragraphs: [
      'En las conversaciones con nuestro asistente (Conversa), los intercambios se registran de forma seudónima para mejorar la plataforma e informar reportes agregados. Ninguna conversación individual se publica ni se vende. Trabajamos con patrones agregados, nunca con la exposición de una persona identificable.',
    ],
  },
]

const SECTIONS_EN: Section[] = [
  {
    title: 'What the simulation is',
    paragraphs: [
      'For every real Pulse, a panel of AI-simulated people — each a demographically grounded profile of a Mexico City resident — votes under exactly the same rules a real person does: it picks an option, assigns a confidence level from 1 to 10, and writes a single line of reasoning. The simulation results are stored separately and revealed only when the Pulse closes, alongside the real results, together with a Divergence Index.',
      'The simulation never sees the news, extra context, or how real people already voted. It receives only what any voter would see: the question, the description, and the options. That way we measure the AI\u2019s read of the population, not our ability to feed it information.',
    ],
  },
  {
    title: 'The persona method: INEGI and AMAI',
    paragraphs: [
      'The persona library is calibrated against real Mexico City distributions. We start from the marginal distributions of INEGI\u2019s 2020 Census (age, sex, education, and households per borough), ENIGH income texture, and AMAI socioeconomic bands. Each persona is built so that the set reproduces those real proportions — not stereotypes.',
      'The initial version, cdmx-v1, is 150 personas: 100 from Cuauhtémoc and 50 from Miguel Hidalgo. Population weights are normalized to the final set with a deterministic largest-remainder (Hamilton) allocator, and each persona carries a concrete narrative of daily life — how they get around, how they stay informed, who they care for, what worries them — in the Spanish they would actually use. Versions are never mutated: any improvement ships as a new, documented version.',
    ],
  },
  {
    title: 'Total separation from real data',
    paragraphs: [
      'Simulated and real data are never mixed. Simulated votes live in their own tables, isolated from real votes, and are never added to any real total. In the database, synthetic votes are unreadable by any client until reveal: the only public read path is a view that exposes only already-revealed runs.',
      'On screen, everything simulated always renders with a persistent amber "SIMULACIÓN IA" badge. Platform-wide, green means real data and amber means simulated data. We never present a simulated number as if it were a real opinion.',
      'And we hold a strict no-anchoring rule: the direction of an AI prediction is never visible to a person before they vote. This is guaranteed in the data layer — the server sends no simulated aggregate to the browser until reveal conditions are met — not just in the UI.',
    ],
  },
  {
    title: 'The purpose: auditing the AI, not replacing people',
    paragraphs: [
      'This simulation does not replace the citizen consultation. Its purpose is to audit the AI: to contrast a model\u2019s read of a population against what that population actually thinks. The Divergence Index summarizes that gap on a 0–100 scale, where 0 means the AI read us perfectly and 100 means it does not know us at all.',
      'The community\u2019s real voice is always what counts. The simulation is a measuring instrument aimed at the AI itself, not a shortcut to replace the people who vote.',
    ],
  },
  {
    title: 'A limitation we say out loud',
    paragraphs: [
      'Language models tend to flatten people into stereotypes. A simulation can caricature an entire neighborhood, reducing its residents to a cliché. We do not hide this: when the simulation caricatures a neighborhood, that is itself a finding. The divergence between the simulated and the real is exactly the signal we look for, because it shows us where the AI fails to understand people.',
    ],
  },
  {
    title: 'Conversa privacy',
    paragraphs: [
      'In conversations with our assistant (Conversa), exchanges are logged pseudonymously to improve the platform and inform aggregate reports. No individual conversation is published or sold. We work with aggregate patterns, never with the exposure of an identifiable person.',
    ],
  },
]

export default async function MetodologiaSimulacionPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const title = locale === 'es' ? TITLE_ES : TITLE_EN
  const description = locale === 'es' ? DESCRIPTION_ES : DESCRIPTION_EN
  const sections = locale === 'es' ? SECTIONS_ES : SECTIONS_EN
  const badgeLabel = 'SIMULACIÓN IA'

  return (
    <div className="min-h-screen overflow-x-hidden bg-cc-bg text-cc-text-primary">
      <LandingNav />

      <main className="pt-24">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <header className="mb-10 border-b border-white/10 pb-8">
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {badgeLabel}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-cc-text-secondary">
              {description}
            </p>
          </header>

          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
                <div className="space-y-4">
                  {section.paragraphs.map((paragraph, i) => (
                    <p key={i} className="text-base leading-relaxed text-cc-text-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 border-t border-white/10 pt-6">
            <Link
              href="/pulse"
              className="text-sm text-emerald-400 underline-offset-2 hover:underline"
            >
              {locale === 'es' ? '← Ver consultas Pulse' : '← See Pulse surveys'}
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
