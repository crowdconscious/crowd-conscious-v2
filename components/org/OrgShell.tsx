'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/Logo'
import LanguageSwitcherSimple from '@/components/LanguageSwitcherSimple'
import { useLanguage } from '@/contexts/LanguageContext'

const T = {
  es: {
    tag: 'Para organizaciones',
    how: 'Cómo funciona',
    pricing: 'Precios',
    demo: 'Demo',
    call: 'Agendar llamada',
    privacy: 'Aviso de privacidad',
    method: 'Metodología',
    contact: 'Contacto',
    myReadings: 'Mis lecturas',
  },
  en: {
    tag: 'For organizations',
    how: 'How it works',
    pricing: 'Pricing',
    demo: 'Demo',
    call: 'Book a call',
    privacy: 'Privacy notice',
    method: 'Methodology',
    contact: 'Contact',
    myReadings: 'My readings',
  },
} as const

/**
 * Header/footer for every B2B route (/organizaciones, /org/*; /sello-verificado/*
 * and /r/*). Deliberately has none of the civic navigation (Votar,
 * Resultados, Evaluar, Ciclo en curso, app download, citizen sign-in).
 * Inputs inside are forced to the dark palette via CSS variables because the
 * global theme defaults to light inputs.
 */
export default function OrgShell({
  children,
  callHref,
  contactEmail,
  client,
}: {
  children: React.ReactNode
  callHref: string
  contactEmail: string
  /** Logged-in client (flag-gated, Prompt 4). */
  client?: { orgName: string; readingsHref: string } | null
}) {
  const { language } = useLanguage()
  const t = T[language === 'en' ? 'en' : 'es']
  const [open, setOpen] = useState(false)
  const external = /^https?:/.test(callHref)
  const links = [
    { href: '/organizaciones#como-funciona', label: t.how },
    { href: '/organizaciones#precios', label: t.pricing },
    { href: '/organizaciones/demo', label: t.demo },
  ]

  return (
    <div
      className="cc-dark-surface min-h-screen bg-[#0f1419] text-slate-100"
      style={
        {
          '--input-background': '#1e2632',
          '--input-foreground': '#f8fafc',
          '--input-border': '#475569',
          '--muted': '#94a3b8',
          colorScheme: 'dark',
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-40 border-b border-[#2d3748] bg-[#0f1419]/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo size="nav" linkTo="/organizaciones" />
          <span className="hidden border-l border-[#2d3748] pl-4 text-sm font-semibold text-emerald-300 sm:inline">{t.tag}</span>
          <nav className="ml-auto hidden items-center gap-6 md:flex">
            {client ? (
              <Link href={client.readingsHref} className="text-sm text-slate-200 hover:text-white">
                {t.myReadings} · <span className="font-semibold">{client.orgName}</span>
              </Link>
            ) : (
              links.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-slate-200 hover:text-white">
                  {l.label}
                </Link>
              ))
            )}
            <LanguageSwitcherSimple />
            {!client ? (
              <a
                href={callHref}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex min-h-[40px] items-center rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-[#0f1419] hover:bg-emerald-300"
              >
                {t.call}
              </a>
            ) : null}
          </nav>
          <button
            type="button"
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-200 md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open ? (
          <div className="border-t border-[#2d3748] px-4 pb-4 md:hidden">
            <p className="py-3 text-sm font-semibold text-emerald-300">{t.tag}</p>
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-base text-slate-100">
                {l.label}
              </Link>
            ))}
            <div className="py-3">
              <LanguageSwitcherSimple />
            </div>
            <a href={callHref} className="mt-2 flex min-h-[48px] items-center justify-center rounded-lg bg-emerald-400 font-semibold text-[#0f1419]">
              {t.call}
            </a>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#2d3748] px-4 py-8 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p>Crowd Conscious · {t.tag}</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:text-white">
              {t.privacy}
            </Link>
            <Link href="/organizaciones#metodologia" className="hover:text-white">
              {t.method}
            </Link>
            <a href={`mailto:${contactEmail}`} className="hover:text-white">
              {t.contact}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
