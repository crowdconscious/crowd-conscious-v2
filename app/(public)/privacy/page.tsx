'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function PrivacyPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Aviso de Privacidad",
      lastUpdated: "Última actualización: 27 de septiembre de 2025",
      sections: [
        {
          title: "1. Responsable del Tratamiento",
          content: "Crowd Conscious, con domicilio en México, es responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)."
        },
        {
          title: "2. Datos Personales Recabados",
          content: "Recabamos los siguientes datos personales: (a) Datos de identificación: nombre completo, correo electrónico, (b) Datos de contacto: dirección, teléfono, (c) Datos financieros: información de pago para transacciones (procesada por Stripe), (d) Datos de navegación: cookies, dirección IP, comportamiento en la plataforma."
        },
        {
          title: "3. Finalidades del Tratamiento",
          content: "Sus datos personales serán utilizados para: (a) Prestación de servicios de la plataforma, (b) Procesamiento de transacciones y pagos, (c) Comunicación sobre su cuenta y servicios, (d) Mejora de nuestros servicios y experiencia del usuario, (e) Cumplimiento de obligaciones legales."
        },
        {
          title: "4. Transferencias de Datos",
          content: "Sus datos pueden ser transferidos a: (a) Stripe Inc. (Estados Unidos) para procesamiento de pagos, (b) Supabase Inc. (Estados Unidos) para almacenamiento de datos, (c) Resend (Estados Unidos) para servicios de correo electrónico. Todas las transferencias cumplen con los niveles de protección requeridos."
        },
        {
          title: "5. Cookies y Tecnologías Similares",
          content: "Utilizamos cookies para: (a) Funcionalidad esencial de la plataforma, (b) Análisis de uso y rendimiento, (c) Personalización de contenido, (d) Seguridad y prevención de fraudes. Puede configurar sus preferencias de cookies en cualquier momento."
        },
        {
          title: "6. Derechos ARCO",
          content: "Usted tiene derecho a: (a) Acceso: conocer qué datos tenemos sobre usted, (b) Rectificación: corregir datos inexactos, (c) Cancelación: solicitar eliminación de datos, (d) Oposición: oponerse al tratamiento. Para ejercer estos derechos, contáctenos en: privacy@crowdconscious.mx"
        },
        {
          title: "7. Seguridad de Datos",
          content: "Implementamos medidas de seguridad técnicas, físicas y administrativas para proteger sus datos personales contra acceso no autorizado, alteración, divulgación o destrucción."
        },
        {
          title: "8. Retención de Datos",
          content: "Conservamos sus datos personales durante el tiempo necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables."
        },
        {
          title: "9. Menores de Edad",
          content: "No recabamos intencionalmente datos de menores de 18 años. Si detectamos datos de menores, procederemos a su eliminación inmediata."
        },
        {
          title: "10. Modificaciones al Aviso",
          content: "Nos reservamos el derecho de modificar este aviso de privacidad. Las modificaciones serán comunicadas a través de la plataforma."
        },
        {
          title: "11. Contacto",
          content: "Para preguntas sobre este aviso de privacidad o ejercer sus derechos ARCO, contáctenos en: privacy@crowdconscious.mx"
        }
      ]
    },
    en: {
      title: "Privacy Notice",
      lastUpdated: "Last updated: September 27, 2025",
      sections: [
        {
          title: "1. Data Controller",
          content: "Crowd Conscious, domiciled in Mexico, is responsible for the treatment of your personal data in accordance with the Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP)."
        },
        {
          title: "2. Personal Data Collected",
          content: "We collect the following personal data: (a) Identification data: full name, email address, (b) Contact data: address, phone number, (c) Financial data: payment information for transactions (processed by Stripe), (d) Navigation data: cookies, IP address, platform behavior."
        },
        {
          title: "3. Processing Purposes",
          content: "Your personal data will be used for: (a) Platform service provision, (b) Transaction and payment processing, (c) Communication about your account and services, (d) Service improvement and user experience enhancement, (e) Legal compliance obligations."
        },
        {
          title: "4. Data Transfers",
          content: "Your data may be transferred to: (a) Stripe Inc. (United States) for payment processing, (b) Supabase Inc. (United States) for data storage, (c) Resend (United States) for email services. All transfers comply with required protection levels."
        },
        {
          title: "5. Cookies and Similar Technologies",
          content: "We use cookies for: (a) Essential platform functionality, (b) Usage and performance analysis, (c) Content personalization, (d) Security and fraud prevention. You can configure your cookie preferences at any time."
        },
        {
          title: "6. ARCO Rights",
          content: "You have the right to: (a) Access: know what data we have about you, (b) Rectification: correct inaccurate data, (c) Cancellation: request data deletion, (d) Opposition: oppose data processing. To exercise these rights, contact us at: privacy@crowdconscious.mx"
        },
        {
          title: "7. Data Security",
          content: "We implement technical, physical, and administrative security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction."
        },
        {
          title: "8. Data Retention",
          content: "We retain your personal data for the time necessary to fulfill the described purposes and applicable legal obligations."
        },
        {
          title: "9. Minors",
          content: "We do not intentionally collect data from individuals under 18 years of age. If we detect data from minors, we will proceed with immediate deletion."
        },
        {
          title: "10. Notice Modifications",
          content: "We reserve the right to modify this privacy notice. Modifications will be communicated through the platform."
        },
        {
          title: "11. Contact",
          content: "For questions about this privacy notice or to exercise your ARCO rights, contact us at: privacy@crowdconscious.mx"
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
