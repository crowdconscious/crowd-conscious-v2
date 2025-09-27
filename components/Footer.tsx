'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as 'es' | 'en'
    const browserLanguage = navigator.language.startsWith('es') ? 'es' : 'en'
    setLanguage(savedLanguage || browserLanguage)
  }, [])

  const content = {
    es: {
      platform: "Plataforma",
      communities: "Comunidades",
      brands: "Marcas",
      impact: "Impacto",
      legal: "Legal",
      terms: "Términos y Condiciones",
      privacy: "Aviso de Privacidad",
      cookies: "Política de Cookies",
      support: "Soporte",
      help: "Centro de Ayuda",
      contact: "Contacto",
      about: "Acerca de",
      mission: "Misión",
      team: "Equipo",
      careers: "Carreras",
      description: "Conectando comunidades con marcas para crear impacto social y ambiental medible.",
      rights: "Todos los derechos reservados.",
      platformFee: "Comisión de plataforma: 15% en todas las transacciones",
      madeIn: "Hecho con ❤️ en México"
    },
    en: {
      platform: "Platform",
      communities: "Communities",
      brands: "Brands",
      impact: "Impact",
      legal: "Legal",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      cookies: "Cookie Policy",
      support: "Support",
      help: "Help Center",
      contact: "Contact",
      about: "About",
      mission: "Mission",
      team: "Team",
      careers: "Careers",
      description: "Connecting communities with brands to create measurable social and environmental impact.",
      rights: "All rights reserved.",
      platformFee: "Platform fee: 15% on all transactions",
      madeIn: "Made with ❤️ in Mexico"
    }
  }

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-purple-500 rounded-lg"></div>
              <span className="text-xl font-bold">Crowd Conscious</span>
            </div>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              {content[language].description}
            </p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setLanguage('es')
                  localStorage.setItem('preferred-language', 'es')
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  language === 'es'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🇲🇽 ES
              </button>
              <button
                onClick={() => {
                  setLanguage('en')
                  localStorage.setItem('preferred-language', 'en')
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  language === 'en'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{content[language].platform}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/communities" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].communities}
                </Link>
              </li>
              <li>
                <Link href="/brand/discover" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].brands}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].impact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{content[language].legal}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].privacy}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].cookies}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{content[language].support}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:help@crowdconscious.mx" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].help}
                </a>
              </li>
              <li>
                <a href="mailto:contact@crowdconscious.mx" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].contact}
                </a>
              </li>
              <li>
                <Link href="/about" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].about}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Platform Fee Notice */}
        <div className="border-t border-slate-700 pt-6 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-center text-center">
              <div className="text-sm">
                <span className="text-slate-400">💡 </span>
                <span className="text-slate-300 font-medium">
                  {content[language].platformFee}
                </span>
                <span className="text-slate-400 ml-2">
                  ({language === 'es' ? 'Transparencia total' : 'Full transparency'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700 pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} Crowd Conscious. {content[language].rights}
            </div>
            <div className="text-sm text-slate-400">
              {content[language].madeIn}
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="flex justify-center gap-6">
            <a 
              href="https://x.com/crowd_conscious" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-teal-400 transition-colors"
              aria-label="Follow us on X (Twitter)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a 
              href="https://www.linkedin.com/company/crowd-conscious" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-teal-400 transition-colors"
              aria-label="Follow us on LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a 
              href="https://www.instagram.com/crowdconscious/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-teal-400 transition-colors"
              aria-label="Follow us on Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.083 5.52.204 5.012.388a6.5 6.5 0 00-2.346 1.529c-.794.793-1.254 1.45-1.529 2.346C.953 4.771.832 5.347.797 6.294.762 7.241.75 7.648.75 12.017c0 4.368.013 4.776.048 5.723.035.947.156 1.523.34 2.031.185.508.503 1.07 1.296 1.863.793.794 1.355 1.112 1.863 1.296.508.185 1.084.306 2.031.34.947.035 1.355.048 5.723.048 4.368 0 4.776-.013 5.723-.048.947-.034 1.523-.155 2.031-.34a6.5 6.5 0 002.346-1.529c.794-.793 1.254-1.45 1.529-2.346.185-.508.306-1.084.34-2.031.035-.947.048-1.355.048-5.723 0-4.368-.013-4.776-.048-5.723-.034-.947-.155-1.523-.34-2.031a6.5 6.5 0 00-1.529-2.346c-.793-.794-1.45-1.254-2.346-1.529-.508-.185-1.084-.306-2.031-.34C16.776.013 16.368 0 12.017 0zm0 2.16c4.281 0 4.787.012 6.476.066.876.004 1.405.016 2.123.084.537.05.83.141 1.25.334.482.232.823.499 1.187.862.364.364.63.705.862 1.187.193.42.284.713.334 1.25.068.718.08 1.247.084 2.123.054 1.689.066 2.195.066 6.476s-.012 4.787-.066 6.476c-.004.876-.016 1.405-.084 2.123-.05.537-.141.83-.334 1.25-.232.482-.499.823-.862 1.187-.364.364-.705.63-1.187.862-.42.193-.713.284-1.25.334-.718.068-1.247.08-2.123.084-1.689.054-2.195.066-6.476.066s-4.787-.012-6.476-.066c-.876-.004-1.405-.016-2.123-.084-.537-.05-.83-.141-1.25-.334-.482-.232-.823-.499-1.187-.862-.364-.364-.63-.705-.862-1.187-.193-.42-.284-.713-.334-1.25-.068-.718-.08-1.247-.084-2.123-.054-1.689-.066-2.195-.066-6.476s.012-4.787.066-6.476c.004-.876.016-1.405.084-2.123.05-.537.141-.83.334-1.25.232-.482.499-.823.862-1.187.364-.364.705-.63 1.187-.862.42-.193.713-.284 1.25-.334.718-.068 1.247-.08 2.123-.084 1.689-.054 2.195-.066 6.476-.066z"/>
                <path d="M12.017 15.33a3.313 3.313 0 110-6.627 3.313 3.313 0 010 6.627zM12.017 7.052a4.966 4.966 0 100 9.931 4.966 4.966 0 000-9.931zm6.624-1.442a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"/>
              </svg>
            </a>
            <a 
              href="https://www.youtube.com/@crowdconscious" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-teal-400 transition-colors"
              aria-label="Subscribe to our YouTube channel"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
