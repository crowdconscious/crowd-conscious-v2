'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function CookiesPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Política de Cookies",
      lastUpdated: "Última actualización: 25 de febrero de 2026",
      sections: [
        {
          title: "1. ¿Qué son las Cookies?",
          content: "Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita Crowd Conscious. Estas cookies nos ayudan a proporcionar, proteger y mejorar nuestros servicios de predicción, autenticación y experiencia de usuario."
        },
        {
          title: "2. Tipos de Cookies que Utilizamos",
          content: "Utilizamos diferentes tipos de cookies: (a) Cookies esenciales: necesarias para el funcionamiento de la plataforma (autenticación, sesión, predicciones); (b) Cookies de rendimiento: nos ayudan a entender cómo interactúa con la plataforma; (c) Cookies de funcionalidad: recuerdan sus preferencias (idioma español/inglés, tema); (d) Cookies de seguridad: protegen contra actividades fraudulentas y limitación de tasa."
        },
        {
          title: "3. Cookies Específicas de Crowd Conscious",
          content: "Las cookies que utilizamos incluyen: (a) Cookies de autenticación de Supabase para mantener su sesión activa y permitir predicciones, votos y acceso al Fondo Consciente; (b) Cookies de preferencias de idioma (español/inglés); (c) Cookies de consentimiento (cookie-consent, analytics-cookies, marketing-cookies) para recordar sus preferencias del banner; (d) Cookies de análisis para mejorar la experiencia en mercados de predicción y la plataforma."
        },
        {
          title: "4. Cookies de Terceros",
          content: "Utilizamos cookies de servicios de terceros: (a) Supabase: autenticación y persistencia de sesión; (b) Stripe: procesamiento seguro de pagos de patrocinio (cuando aplica); (c) Vercel: alojamiento y análisis de rendimiento; (d) Resend: envío de correos transaccionales (confirmación, notificaciones). No almacenamos datos de tarjetas de crédito; Stripe gestiona el pago de forma segura."
        },
        {
          title: "5. Gestión de Cookies",
          content: "Puede gestionar sus preferencias de cookies: (a) A través del banner de consentimiento al visitar la plataforma (Aceptar Todas / Solo Esenciales); (b) A través de la configuración de su navegador; (c) Contactándonos en comunidad@crowdconscious.app para solicitudes específicas. Tenga en cuenta que rechazar cookies esenciales puede afectar su capacidad para iniciar sesión y participar en predicciones."
        },
        {
          title: "6. Cookies Esenciales",
          content: "Algunas cookies son esenciales y no pueden desactivarse sin afectar la funcionalidad: (a) Cookies de autenticación de Supabase (sesión de usuario); (b) Cookies de seguridad y prevención de fraude; (c) Cookies necesarias para guardar predicciones, votos en causas y acceso al leaderboard."
        },
        {
          title: "7. Retención",
          content: "Las cookies se retienen por diferentes períodos: (a) Cookies de sesión: se eliminan al cerrar el navegador; (b) Cookies persistentes (preferencias, consentimiento): pueden durar hasta 1 año; (c) Cookies de autenticación: duran según la configuración de Supabase hasta que cierre sesión o expire la sesión."
        },
        {
          title: "8. Sus Derechos",
          content: "Usted tiene derecho a: (a) Conocer qué cookies utilizamos; (b) Retirar su consentimiento en cualquier momento a través del banner o contactándonos; (c) Solicitar la eliminación de cookies no esenciales; (d) Acceder a esta política en cualquier momento desde el enlace en el pie de página o el banner."
        },
        {
          title: "9. Actualizaciones",
          content: "Podemos actualizar esta política de cookies ocasionalmente. Le notificaremos sobre cambios significativos a través de nuestro banner de cookies o en la plataforma. La fecha de última actualización se indica al inicio."
        },
        {
          title: "10. Contacto",
          content: "Para preguntas sobre cookies o para ejercer sus derechos, contáctenos en: comunidad@crowdconscious.app"
        }
      ]
    },
    en: {
      title: "Cookie Policy",
      lastUpdated: "Last updated: February 25, 2026",
      sections: [
        {
          title: "1. What are Cookies?",
          content: "Cookies are small text files stored on your device when you visit Crowd Conscious. These cookies help us provide, protect, and improve our prediction services, authentication, and user experience."
        },
        {
          title: "2. Types of Cookies We Use",
          content: "We use different types of cookies: (a) Essential cookies: necessary for platform functionality (authentication, session, predictions); (b) Performance cookies: help us understand how you interact with the platform; (c) Functionality cookies: remember your preferences (Spanish/English language, theme); (d) Security cookies: protect against fraudulent activities and rate limiting."
        },
        {
          title: "3. Crowd Conscious-Specific Cookies",
          content: "Cookies we use include: (a) Supabase authentication cookies to maintain your active session and enable predictions, votes, and Conscious Fund access; (b) Language preference cookies (Spanish/English); (c) Consent cookies (cookie-consent, analytics-cookies, marketing-cookies) to remember your banner preferences; (d) Analytics cookies to improve the prediction market and platform experience."
        },
        {
          title: "4. Third-Party Cookies",
          content: "We use cookies from third-party services: (a) Supabase: authentication and session persistence; (b) Stripe: secure sponsorship payment processing (when applicable); (c) Vercel: hosting and performance analytics; (d) Resend: transactional email delivery (confirmation, notifications). We do not store credit card data; Stripe handles payment securely."
        },
        {
          title: "5. Cookie Management",
          content: "You can manage your cookie preferences: (a) Through the consent banner when visiting the platform (Accept All / Essential Only); (b) Through your browser settings; (c) By contacting us at comunidad@crowdconscious.app for specific requests. Note that rejecting essential cookies may affect your ability to log in and participate in predictions."
        },
        {
          title: "6. Essential Cookies",
          content: "Some cookies are essential and cannot be disabled without affecting functionality: (a) Supabase authentication cookies (user session); (b) Security and fraud prevention cookies; (c) Cookies required to save predictions, cause votes, and leaderboard access."
        },
        {
          title: "7. Retention",
          content: "Cookies are retained for different periods: (a) Session cookies: deleted when you close your browser; (b) Persistent cookies (preferences, consent): may last up to 1 year; (c) Authentication cookies: last per Supabase configuration until you log out or the session expires."
        },
        {
          title: "8. Your Rights",
          content: "You have the right to: (a) Know which cookies we use; (b) Withdraw your consent at any time via the banner or by contacting us; (c) Request deletion of non-essential cookies; (d) Access this policy at any time from the footer link or banner."
        },
        {
          title: "9. Updates",
          content: "We may update this cookie policy occasionally. We will notify you of significant changes through our cookie banner or on the platform. The last updated date is indicated at the top."
        },
        {
          title: "10. Contact",
          content: "For questions about cookies or to exercise your rights, contact us at: comunidad@crowdconscious.app"
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
