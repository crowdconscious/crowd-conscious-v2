'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function PrivacyPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Aviso de Privacidad",
      lastUpdated: "Última actualización: 25 de febrero de 2026",
      sections: [
        {
          title: "1. Responsable del Tratamiento",
          content: "Crowd Conscious, con domicilio en México, es responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y el RGPD cuando aplique."
        },
        {
          title: "2. Datos Personales Recabados",
          content: "Recabamos los siguientes datos personales: (a) Datos de identificación: nombre completo, correo electrónico; (b) Datos de cuenta: contraseña (encriptada), preferencias de idioma; (c) Datos de actividad: predicciones, votos en mercados, votos en causas del Fondo Consciente, XP, logros, comentarios, ideas en el Buzón Consciente; (d) Datos financieros: información de pago para patrocinios (procesada por Stripe; no almacenamos datos de tarjeta); (e) Datos de navegación: cookies, dirección IP, sesiones; (f) Datos corporativos (si aplica): invitaciones, progreso en módulos, certificaciones."
        },
        {
          title: "3. Finalidades del Tratamiento",
          content: "Sus datos personales serán utilizados para: (a) Prestación de la plataforma de predicción (cuentas, sesiones, XP, leaderboard); (b) Procesamiento de patrocinios y asignación del Fondo Consciente; (c) Comunicación sobre su cuenta, logros, notificaciones y servicios; (d) Generación de contenido por agentes de IA (resúmenes, insights, reportes de patrocinadores); (e) Mejora de servicios y experiencia del usuario; (f) Cumplimiento de obligaciones legales; (g) Seguridad y prevención de fraude (incluyendo limitación de tasa)."
        },
        {
          title: "4. Transferencias de Datos",
          content: "Sus datos pueden ser transferidos a: (a) Supabase Inc. (Estados Unidos) para almacenamiento, autenticación y base de datos; (b) Stripe Inc. (Estados Unidos) para procesamiento de pagos de patrocinio; (c) Resend (Estados Unidos) para correo electrónico transaccional; (d) Vercel (Estados Unidos) para alojamiento y análisis; (e) Anthropic (Estados Unidos) para procesamiento de agentes de IA que generan contenido; (f) Upstash (cuando se utiliza) para limitación de tasa. Todas las transferencias cumplen con los niveles de protección requeridos."
        },
        {
          title: "5. Cookies y Tecnologías Similares",
          content: "Utilizamos cookies para: (a) Funcionalidad esencial (autenticación, sesión); (b) Preferencias (idioma, tema); (c) Análisis de uso y rendimiento; (d) Seguridad. Puede configurar sus preferencias de cookies en cualquier momento. Consulte nuestra Política de Cookies para más detalles."
        },
        {
          title: "6. Derechos ARCO y RGPD",
          content: "Usted tiene derecho a: (a) Acceso: conocer qué datos tenemos sobre usted; (b) Rectificación: corregir datos inexactos; (c) Cancelación: solicitar eliminación de datos; (d) Oposición: oponerse al tratamiento; (e) Portabilidad: recibir sus datos en formato estructurado. Para ejercer estos derechos o solicitar eliminación de cuenta (GDPR), contáctenos en: comunidad@crowdconscious.app. Los administradores disponen de un flujo de trabajo para procesar solicitudes de eliminación."
        },
        {
          title: "7. Seguridad de Datos",
          content: "Implementamos medidas de seguridad técnicas, físicas y administrativas: encriptación, políticas de seguridad a nivel de fila (RLS), autenticación segura, y protección contra acceso no autorizado, alteración, divulgación o destrucción."
        },
        {
          title: "8. Retención de Datos",
          content: "Conservamos sus datos personales durante el tiempo necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables. Los datos de predicciones y votos se conservan para mantener la integridad del historial de la plataforma, salvo solicitud de eliminación."
        },
        {
          title: "9. Menores de Edad",
          content: "No recabamos intencionalmente datos de menores de 18 años. La plataforma está dirigida a usuarios adultos. Si detectamos datos de menores, procederemos a su eliminación inmediata."
        },
        {
          title: "10. Modificaciones al Aviso",
          content: "Nos reservamos el derecho de modificar este aviso de privacidad. Las modificaciones serán comunicadas a través de la plataforma. La fecha de última actualización se indica al inicio."
        },
        {
          title: "11. Contacto",
          content: "Para preguntas sobre este aviso de privacidad o ejercer sus derechos ARCO, contáctenos en: comunidad@crowdconscious.app"
        }
      ]
    },
    en: {
      title: "Privacy Notice",
      lastUpdated: "Last updated: February 25, 2026",
      sections: [
        {
          title: "1. Data Controller",
          content: "Crowd Conscious, domiciled in Mexico, is responsible for the treatment of your personal data in accordance with Mexico's Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP) and GDPR where applicable."
        },
        {
          title: "2. Personal Data Collected",
          content: "We collect the following personal data: (a) Identification data: full name, email address; (b) Account data: password (encrypted), language preferences; (c) Activity data: predictions, market votes, Conscious Fund cause votes, XP, achievements, comments, Conscious Inbox ideas; (d) Financial data: payment information for sponsorships (processed by Stripe; we do not store card data); (e) Navigation data: cookies, IP address, sessions; (f) Corporate data (if applicable): invitations, module progress, certifications."
        },
        {
          title: "3. Processing Purposes",
          content: "Your personal data will be used for: (a) Provision of the prediction platform (accounts, sessions, XP, leaderboard); (b) Processing sponsorships and Conscious Fund allocation; (c) Communication about your account, achievements, notifications, and services; (d) AI agent-generated content (summaries, insights, sponsor reports); (e) Service improvement and user experience enhancement; (f) Legal compliance obligations; (g) Security and fraud prevention (including rate limiting)."
        },
        {
          title: "4. Data Transfers",
          content: "Your data may be transferred to: (a) Supabase Inc. (United States) for storage, authentication, and database; (b) Stripe Inc. (United States) for sponsorship payment processing; (c) Resend (United States) for transactional email; (d) Vercel (United States) for hosting and analytics; (e) Anthropic (United States) for AI agent content generation; (f) Upstash (when used) for rate limiting. All transfers comply with required protection levels."
        },
        {
          title: "5. Cookies and Similar Technologies",
          content: "We use cookies for: (a) Essential functionality (authentication, session); (b) Preferences (language, theme); (c) Usage and performance analysis; (d) Security. You can configure your cookie preferences at any time. See our Cookie Policy for details."
        },
        {
          title: "6. ARCO and GDPR Rights",
          content: "You have the right to: (a) Access: know what data we have about you; (b) Rectification: correct inaccurate data; (c) Cancellation: request data deletion; (d) Opposition: oppose data processing; (e) Portability: receive your data in a structured format. To exercise these rights or request account deletion (GDPR), contact us at: comunidad@crowdconscious.app. Administrators have a workflow to process deletion requests."
        },
        {
          title: "7. Data Security",
          content: "We implement technical, physical, and administrative security measures: encryption, row-level security (RLS) policies, secure authentication, and protection against unauthorized access, alteration, disclosure, or destruction."
        },
        {
          title: "8. Data Retention",
          content: "We retain your personal data for the time necessary to fulfill the described purposes and applicable legal obligations. Prediction and vote data are retained to maintain platform history integrity, unless deletion is requested."
        },
        {
          title: "9. Minors",
          content: "We do not intentionally collect data from individuals under 18 years of age. The platform is intended for adult users. If we detect data from minors, we will proceed with immediate deletion."
        },
        {
          title: "10. Notice Modifications",
          content: "We reserve the right to modify this privacy notice. Modifications will be communicated through the platform. The last updated date is indicated at the top."
        },
        {
          title: "11. Contact",
          content: "For questions about this privacy notice or to exercise your ARCO rights, contact us at: comunidad@crowdconscious.app"
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
                ? 'Su privacidad es importante para nosotros. Este aviso describe cómo protegemos sus datos personales.'
                : 'Your privacy is important to us. This notice describes how we protect your personal data.'
              }
            </p>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
