'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navBg = scrolled ? 'bg-slate-950/95 backdrop-blur-md border-b border-slate-800' : 'bg-transparent'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${navBg}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Crowd Conscious"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/markets"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              Markets
            </Link>
            <Link
              href="/about"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              About
            </Link>
            <Link
              href="/concientizaciones"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              For Businesses
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
            >
              Start Predicting
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/98 backdrop-blur-md">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/markets"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-slate-400 hover:text-white"
            >
              Markets
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-slate-400 hover:text-white"
            >
              About
            </Link>
            <Link
              href="/concientizaciones"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-slate-400 hover:text-white"
            >
              For Businesses
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-slate-400 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="block py-3 rounded-lg bg-emerald-500 text-white font-semibold text-center"
            >
              Start Predicting
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
