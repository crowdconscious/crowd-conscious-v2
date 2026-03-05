'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Brain, Eye, Zap } from 'lucide-react'

const LandingNav = dynamic(() => import('@/app/components/landing/LandingNav'))
const Footer = dynamic(() => import('@/components/Footer'))

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNav />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              About Crowd Conscious
            </h1>
            <p className="text-xl text-slate-400">
              Where predictions meet purpose.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section className="py-12 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">What We Do</h2>
            <p className="text-slate-400 leading-relaxed">
              Crowd Conscious is a free-to-play prediction platform where your opinion drives real
              community impact. We ask the questions that matter — from World Cup outcomes to
              sustainability goals to government policy — and turn collective intelligence into
              funded action.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
            <p className="text-slate-400 leading-relaxed">
              Users predict outcomes on the issues they care about. No money required — just your
              confidence level from 1 to 10. Brand sponsors fund the markets, and a portion of
              every sponsorship goes to the Conscious Fund, which supports community causes chosen
              by our users.
            </p>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-12">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Collective Intelligence</h3>
                <p className="text-slate-400 text-sm">
                  The crowd knows more than any individual. We harness that wisdom.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Radical Transparency</h3>
                <p className="text-slate-400 text-sm">
                  Every prediction, every fund allocation, every impact metric — visible to all.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Impact by Design</h3>
                <p className="text-slate-400 text-sm">
                  We don&apos;t bolt purpose onto profit. Impact is the architecture.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* World Cup Moment */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">The World Cup Moment</h2>
            <p className="text-slate-400 leading-relaxed">
              The 2026 FIFA World Cup opens at Estadio Azteca on June 11. Mexico City will be the
              center of the world&apos;s attention. Crowd Conscious is building the platform where
              fans, citizens, and changemakers predict what happens — and fund the future of their
              city in the process.
            </p>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-slate-400">
              Founded in Mexico City by Francisco Blockstrand. Built with AI. Powered by community.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
            >
              Start Predicting
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
