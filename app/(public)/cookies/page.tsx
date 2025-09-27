'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function CookiesPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Política de Cookies",
      lastUpdated: "Última actualización: 27 de septiembre de 2025",
      sections: [
        {
          title: "1. ¿Qué son las Cookies?",
          content: "Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web. Estas cookies nos ayudan a proporcionar, proteger y mejorar nuestros servicios."
        },
        {
          title: "2. Tipos de Cookies que Utilizamos",
          content: "Utilizamos diferentes tipos de cookies: (a) Cookies esenciales: necesarias para el funcionamiento básico del sitio, (b) Cookies de rendimiento: nos ayudan a entender cómo interactúa con el sitio, (c) Cookies de funcionalidad: recuerdan sus preferencias, (d) Cookies de seguridad: protegen contra actividades fraudulentas."
        },
        {
          title: "3. Cookies Específicas",
          content: "Las cookies específicas que utilizamos incluyen: (a) Cookies de autenticación de Supabase para mantener su sesión activa, (b) Cookies de preferencias de tema (modo oscuro/claro), (c) Cookies de configuración de idioma (español/inglés), (d) Cookies de análisis para mejorar la experiencia del usuario."
        },
        {
          title: "4. Cookies de Terceros",
          content: "También utilizamos cookies de servicios de terceros: (a) Stripe: para procesamiento seguro de pagos, (b) Vercel Analytics: para análisis de rendimiento del sitio, (c) Supabase: para autenticación y almacenamiento de datos."
        },
        {
          title: "5. Gestión de Cookies",
          content: "Puede gestionar sus preferencias de cookies: (a) A través de la configuración de su navegador, (b) Usando nuestro banner de consentimiento de cookies, (c) Contactándonos directamente para solicitudes específicas."
        },
        {
          title: "6. Cookies Esenciales",
          content: "Algunas cookies son esenciales para el funcionamiento del sitio y no pueden desactivarse: (a) Cookies de autenticación de usuario, (b) Cookies de seguridad y prevención de fraudes, (c) Cookies de funcionalidad básica del sitio."
        },
        {
          title: "7. Retención de Datos",
          content: "Las cookies se retienen por diferentes períodos: (a) Cookies de sesión: se eliminan al cerrar el navegador, (b) Cookies persistentes: pueden durar hasta 1 año, (c) Cookies de autenticación: duran hasta que cierre sesión."
        },
        {
          title: "8. Sus Derechos",
          content: "Usted tiene derecho a: (a) Conocer qué cookies utilizamos, (b) Retirar su consentimiento en cualquier momento, (c) Solicitar la eliminación de cookies no esenciales, (d) Acceder a información detallada sobre nuestro uso de cookies."
        },
        {
          title: "9. Actualizaciones de la Política",
          content: "Podemos actualizar esta política de cookies ocasionalmente. Le notificaremos sobre cambios significativos a través de nuestro banner de cookies o por correo electrónico."
        },
        {
          title: "10. Contacto",
          content: "Para preguntas sobre cookies o para ejercer sus derechos, contáctenos en: cookies@crowdconscious.mx"
        }
      ]
    },
    en: {
      title: "Cookie Policy",
      lastUpdated: "Last updated: September 27, 2025",
      sections: [
        {
          title: "1. What are Cookies?",
          content: "Cookies are small text files that are stored on your device when you visit our website. These cookies help us provide, protect, and improve our services."
        },
        {
          title: "2. Types of Cookies We Use",
          content: "We use different types of cookies: (a) Essential cookies: necessary for basic site functionality, (b) Performance cookies: help us understand how you interact with the site, (c) Functionality cookies: remember your preferences, (d) Security cookies: protect against fraudulent activities."
        },
        {
          title: "3. Specific Cookies",
          content: "Specific cookies we use include: (a) Supabase authentication cookies to maintain your active session, (b) Theme preference cookies (dark/light mode), (c) Language setting cookies (Spanish/English), (d) Analytics cookies to improve user experience."
        },
        {
          title: "4. Third-Party Cookies",
          content: "We also use cookies from third-party services: (a) Stripe: for secure payment processing, (b) Vercel Analytics: for site performance analysis, (c) Supabase: for authentication and data storage."
        },
        {
          title: "5. Cookie Management",
          content: "You can manage your cookie preferences: (a) Through your browser settings, (b) Using our cookie consent banner, (c) Contacting us directly for specific requests."
        },
        {
          title: "6. Essential Cookies",
          content: "Some cookies are essential for site functionality and cannot be disabled: (a) User authentication cookies, (b) Security and fraud prevention cookies, (c) Basic site functionality cookies."
        },
        {
          title: "7. Data Retention",
          content: "Cookies are retained for different periods: (a) Session cookies: deleted when you close your browser, (b) Persistent cookies: may last up to 1 year, (c) Authentication cookies: last until you log out."
        },
        {
          title: "8. Your Rights",
          content: "You have the right to: (a) Know which cookies we use, (b) Withdraw your consent at any time, (c) Request deletion of non-essential cookies, (d) Access detailed information about our cookie usage."
        },
        {
          title: "9. Policy Updates",
          content: "We may update this cookie policy occasionally. We will notify you of significant changes through our cookie banner or by email."
        },
        {
          title: "10. Contact",
          content: "For questions about cookies or to exercise your rights, contact us at: cookies@crowdconscious.mx"
        }
      ]
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow">
              ← Volver a Crowd Conscious
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {content[language].title}
            </h1>
            <p className="text-gray-600">
              {content[language].lastUpdated}
            </p>
          </div>

          <div className="space-y-8">
            {content[language].sections.map((section, index) => (
              <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {section.title}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              {language === 'es' 
                ? 'Al continuar navegando en nuestro sitio, acepta el uso de cookies según esta política.'
                : 'By continuing to browse our site, you accept the use of cookies according to this policy.'
              }
            </p>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
