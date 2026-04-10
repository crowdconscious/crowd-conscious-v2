'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Target,
  Vote,
  Heart,
  Building2,
  ChevronRight,
} from 'lucide-react'

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true)
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return { ref, visible }
}

export default function AboutContent({
  fundTotal,
  causesSupported,
  monthlyAllocation,
}: {
  fundTotal: string
  causesSupported: number
  monthlyAllocation: string
}) {
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const heroRef = useScrollReveal()
  const problemRef = useScrollReveal()
  const howRef = useScrollReveal()
  const fundRef = useScrollReveal()
  const worldCupRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  return (
    <>
      {/* Hero */}
      <section
        ref={heroRef.ref}
        className={`py-28 px-4 transition-all duration-700 ${
          heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            {locale === 'es'
              ? 'Consciencia Colectiva para el Bien Social'
              : 'Collective Consciousness for Social Good'}
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 leading-relaxed">
            {locale === 'es'
              ? 'Creemos que cuando las personas expresan su opinión con libertad, surge la inteligencia colectiva — y esa inteligencia debe financiar un cambio real en el mundo.'
              : 'We believe that when people express their opinions freely, collective intelligence emerges — and that intelligence should fund real-world change.'}
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section
        ref={problemRef.ref}
        className={`py-24 px-4 border-t border-cc-border transition-all duration-700 delay-100 ${
          problemRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            {locale === 'es' ? 'El Problema' : 'The Problem'}
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            {locale === 'es' ? (
              <>
                Los mercados de predicción han demostrado ser sorprendentemente precisos para anticipar
                eventos reales. Pero plataformas como Polymarket están pensadas para la especulación.
                Nos preguntamos:{' '}
                <span className="text-white font-medium">
                  ¿y si canalizáramos ese mismo compromiso hacia el impacto social?
                </span>
              </>
            ) : (
              <>
                Prediction markets have proven remarkably accurate at forecasting real-world events. But
                platforms like Polymarket are built for speculation. We asked:{' '}
                <span className="text-white font-medium">
                  what if we channeled that same engagement toward social impact?
                </span>
              </>
            )}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section
        ref={howRef.ref}
        className={`py-24 px-4 border-t border-cc-border transition-all duration-700 delay-100 ${
          howRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-16">
            {locale === 'es' ? 'Cómo Funciona' : 'How It Works'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="border border-cc-border bg-cc-card/90 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {locale === 'es' ? 'Haz predicciones gratis' : 'Make free predictions'}
              </h3>
              <p className="text-slate-400 text-sm">
                {locale === 'es'
                  ? 'Predice en mercados — Mundial, economía, política, sostenibilidad. Sin dinero real.'
                  : 'Users predict on markets — World Cup, economy, policy, sustainability. No money required.'}
              </p>
            </div>
            <div className="border border-cc-border bg-cc-card/90 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Vote className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {locale === 'es' ? 'Gana XP, cambia la probabilidad' : 'Earn XP, shift probability'}
              </h3>
              <p className="text-slate-400 text-sm">
                {locale === 'es'
                  ? 'Cada predicción suma XP y mueve la probabilidad de la multitud. Tu voz forma el consenso.'
                  : 'Every prediction earns XP and shifts the crowd probability. Your voice shapes the consensus.'}
              </p>
            </div>
            <div className="border border-cc-border bg-cc-card/90 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Building2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {locale === 'es' ? 'Las marcas patrocinan mercados' : 'Brands sponsor markets'}
              </h3>
              <p className="text-slate-400 text-sm">
                {locale === 'es'
                  ? 'Los patrocinadores financian mercados — sus logos aparecen en las tarjetas. Un porcentaje va al Fondo Consciente.'
                  : 'Sponsors fund markets — their logos appear on market cards. A percentage goes to the Conscious Fund.'}
              </p>
            </div>
            <div className="border border-cc-border bg-cc-card/90 rounded-xl p-6 hover:border-emerald-500/30 transition-colors md:col-span-2 lg:col-span-1">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {locale === 'es' ? 'Tú votas por las causas' : 'You vote on causes'}
              </h3>
              <p className="text-slate-400 text-sm">
                {locale === 'es'
                  ? 'Los usuarios votan qué causas comunitarias reciben apoyos. Predicción democrática y donación democrática.'
                  : 'Users vote on which community causes receive grants. Democratic prediction meets democratic giving.'}
              </p>
            </div>
          </div>
          <p className="text-center text-emerald-400/90 font-medium text-lg italic">
            {locale === 'es'
              ? '«Predicción democrática y donación democrática.»'
              : '“Democratic prediction meets democratic giving.”'}
          </p>
        </div>
      </section>

      {/* The Conscious Fund */}
      <section
        ref={fundRef.ref}
        className={`py-24 px-4 border-t border-cc-border transition-all duration-700 delay-100 ${
          fundRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            {locale === 'es' ? 'El Fondo Consciente' : 'The Conscious Fund'}
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed text-center mb-12 max-w-2xl mx-auto">
            {locale === 'es'
              ? 'Las marcas patrocinan mercados → entre el 20% y 40% de cada patrocinio va directamente a causas comunitarias — hasta 10× el promedio de la industria en causa marketing → los usuarios votan qué causas reciben apoyos → impacto comunitario. Un ciclo virtuoso.'
              : 'Brands sponsor markets → between 20% and 40% of every sponsorship goes directly to community causes — up to 10× the industry average for cause marketing → Users vote on which causes receive grants → Community impact. It&apos;s a virtuous cycle.'}
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="border border-cc-border bg-cc-card rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm mb-1">
                {locale === 'es' ? 'Total del fondo' : 'Fund total'}
              </p>
              <p className="text-2xl font-bold text-emerald-400">{fundTotal} MXN</p>
            </div>
            <div className="border border-cc-border bg-cc-card rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm mb-1">
                {locale === 'es' ? 'Causas apoyadas' : 'Causes supported'}
              </p>
              <p className="text-2xl font-bold text-white">{causesSupported}</p>
            </div>
            <div className="border border-cc-border bg-cc-card rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm mb-1">
                {locale === 'es' ? 'Asignación mensual' : 'Monthly allocation'}
              </p>
              <p className="text-2xl font-bold text-emerald-400">{monthlyAllocation} MXN</p>
            </div>
          </div>
          <div className="text-center">
            <Link
              href="/predictions/fund"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {locale === 'es' ? 'Más sobre el Fondo Consciente' : 'Learn more about the Conscious Fund'}
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* World Cup 2026 */}
      <section
        ref={worldCupRef.ref}
        className={`py-24 px-4 border-t border-cc-border transition-all duration-700 delay-100 ${
          worldCupRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-emerald-500/20 bg-cc-card/90 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">⚽</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {locale === 'es' ? 'Mundial 2026' : 'World Cup 2026'}
              </h2>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed mb-4">
              {locale === 'es'
                ? 'Nuestra plataforma arranca a gran escala con la Copa Mundial FIFA 2026 — el mayor evento deportivo jamás celebrado en México.'
                : 'Our platform launches at full scale with FIFA World Cup 2026 — the biggest sporting event ever held in Mexico.'}
            </p>
            <p className="text-slate-400 text-lg leading-relaxed mb-4">
              {locale === 'es' ? (
                <>
                  Partido inaugural el{' '}
                  <span className="text-white font-semibold">11 de junio de 2026</span> en el{' '}
                  <span className="text-white font-semibold">Estadio Azteca</span>, Ciudad de México.
                </>
              ) : (
                <>
                  Opening match <span className="text-white font-semibold">June 11, 2026</span> at{' '}
                  <span className="text-white font-semibold">Estadio Azteca</span>, Mexico City.
                </>
              )}
            </p>
            <p className="text-emerald-400/90 font-medium">
              {locale === 'es'
                ? 'Estamos en Ciudad de México — este es nuestro evento en casa.'
                : "We're based in Mexico City — this is our home event."}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        ref={ctaRef.ref}
        className={`py-28 px-4 border-t border-cc-border transition-all duration-700 delay-100 ${
          ctaRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            {locale === 'es' ? '¿Listo para unirte a la multitud?' : 'Ready to join the crowd?'}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg transition-colors"
            >
              {locale === 'es' ? 'Empieza a predecir' : 'Start Predicting'}
            </Link>
            <Link
              href="/pulse"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cc-border-light px-8 py-4 font-semibold text-cc-text-primary transition-colors hover:border-gray-500"
            >
              {locale === 'es' ? 'Conviértete en patrocinador' : 'Become a Sponsor'}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
