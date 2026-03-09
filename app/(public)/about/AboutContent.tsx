'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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
            Collective Consciousness for Social Good
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 leading-relaxed">
            We believe that when people express their opinions freely, collective intelligence
            emerges — and that intelligence should fund real-world change.
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section
        ref={problemRef.ref}
        className={`py-24 px-4 border-t border-slate-800 transition-all duration-700 delay-100 ${
          problemRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">The Problem</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Prediction markets have proven remarkably accurate at forecasting real-world events. But
            platforms like Polymarket are built for speculation. We asked:{' '}
            <span className="text-white font-medium">
              what if we channeled that same engagement toward social impact?
            </span>
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section
        ref={howRef.ref}
        className={`py-24 px-4 border-t border-slate-800 transition-all duration-700 delay-100 ${
          howRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Make free predictions</h3>
              <p className="text-slate-400 text-sm">
                Users predict on markets — World Cup, economy, policy, sustainability. No money
                required.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Vote className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Earn XP, shift probability</h3>
              <p className="text-slate-400 text-sm">
                Every prediction earns XP and shifts the crowd probability. Your voice shapes the
                consensus.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Building2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Brands sponsor markets</h3>
              <p className="text-slate-400 text-sm">
                Sponsors fund markets — their logos appear on market cards. A percentage goes to the
                Conscious Fund.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors md:col-span-2 lg:col-span-1">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">You vote on causes</h3>
              <p className="text-slate-400 text-sm">
                Users vote on which community causes receive grants. Democratic prediction meets
                democratic giving.
              </p>
            </div>
          </div>
          <p className="text-center text-emerald-400/90 font-medium text-lg italic">
            &ldquo;It&apos;s democratic prediction meets democratic giving.&rdquo;
          </p>
        </div>
      </section>

      {/* The Conscious Fund */}
      <section
        ref={fundRef.ref}
        className={`py-24 px-4 border-t border-slate-800 transition-all duration-700 delay-100 ${
          fundRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            The Conscious Fund
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed text-center mb-12 max-w-2xl mx-auto">
            Brands sponsor markets → 80% of sponsorship goes to the Conscious Fund → Users vote on
            which causes receive grants → Community impact. It&apos;s a virtuous cycle.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm mb-1">Fund total</p>
              <p className="text-2xl font-bold text-emerald-400">{fundTotal} MXN</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm mb-1">Causes supported</p>
              <p className="text-2xl font-bold text-white">{causesSupported}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm mb-1">Monthly allocation</p>
              <p className="text-2xl font-bold text-emerald-400">{monthlyAllocation} MXN</p>
            </div>
          </div>
          <div className="text-center">
            <Link
              href="/predictions/fund"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Learn more about the Conscious Fund
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* World Cup 2026 */}
      <section
        ref={worldCupRef.ref}
        className={`py-24 px-4 border-t border-slate-800 transition-all duration-700 delay-100 ${
          worldCupRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-2xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">⚽</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                World Cup 2026
              </h2>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed mb-4">
              Our platform launches at full scale with FIFA World Cup 2026 — the biggest sporting
              event ever held in Mexico.
            </p>
            <p className="text-slate-400 text-lg leading-relaxed mb-4">
              Opening match <span className="text-white font-semibold">June 11, 2026</span> at{' '}
              <span className="text-white font-semibold">Estadio Azteca</span>, Mexico City.
            </p>
            <p className="text-emerald-400/90 font-medium">
              We&apos;re based in Mexico City — this is our home event.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        ref={ctaRef.ref}
        className={`py-28 px-4 border-t border-slate-800 transition-all duration-700 delay-100 ${
          ctaRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            Ready to join the crowd?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg transition-colors"
            >
              Start Predicting
            </Link>
            <Link
              href="/sponsor"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-200 font-semibold transition-colors"
            >
              Become a Sponsor
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
