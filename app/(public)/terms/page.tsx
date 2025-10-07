'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function TermsPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Términos y Condiciones de Uso",
      lastUpdated: "Última actualización: 27 de septiembre de 2025",
      sections: [
        {
          title: "1. Aceptación de los Términos",
          content: "Al acceder y utilizar Crowd Conscious (\"la Plataforma\"), usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la Plataforma."
        },
        {
          title: "2. Descripción del Servicio",
          content: "Crowd Conscious es una plataforma digital que conecta comunidades locales con marcas y patrocinadores para proyectos de impacto social y ambiental. La Plataforma facilita la creación de contenido comunitario, votaciones democráticas y transacciones de patrocinio."
        },
        {
          title: "3. Registro y Cuentas de Usuario",
          content: "Para utilizar ciertos servicios, debe crear una cuenta proporcionando información precisa y completa. Es responsable de mantener la confidencialidad de su cuenta y contraseña, y de todas las actividades que ocurran bajo su cuenta."
        },
        {
          title: "4. Tipos de Usuario",
          content: "La Plataforma admite dos tipos principales de usuarios: (a) Usuarios Comunitarios: individuos que participan en comunidades locales, (b) Marcas/Patrocinadores: empresas que buscan oportunidades de patrocinio e impacto social."
        },
        {
          title: "5. Comisión de la Plataforma",
          content: "Crowd Conscious cobra una comisión del 15% sobre todas las transacciones de patrocinio procesadas a través de la Plataforma. Esta comisión se descuenta automáticamente del monto total del patrocinio antes de que los fondos se transfieran a la comunidad beneficiaria. Los usuarios y marcas reconocen y aceptan esta estructura de comisiones."
        },
        {
          title: "6. Pagos y Transacciones",
          content: "Todos los pagos se procesan a través de proveedores de servicios de pago de terceros (Stripe). La Plataforma no almacena información de tarjetas de crédito. Los reembolsos están sujetos a las políticas de nuestros procesadores de pago y la legislación mexicana aplicable."
        },
        {
          title: "7. Contenido del Usuario",
          content: "Los usuarios son responsables del contenido que publican. Al publicar contenido, otorga a Crowd Conscious una licencia no exclusiva para usar, mostrar y distribuir dicho contenido en la Plataforma. El contenido debe cumplir con las leyes mexicanas y no debe ser ofensivo, ilegal o infringir derechos de terceros."
        },
        {
          title: "8. Prohibiciones",
          content: "Está prohibido: (a) Usar la Plataforma para actividades ilegales, (b) Publicar contenido falso o engañoso, (c) Intentar comprometer la seguridad de la Plataforma, (d) Usar la Plataforma para spam o actividades comerciales no autorizadas."
        },
        {
          title: "9. Privacidad y Protección de Datos",
          content: "El manejo de datos personales se rige por nuestra Política de Privacidad y cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México."
        },
        {
          title: "10. Ley Aplicable y Jurisdicción",
          content: "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier disputa será resuelta por los tribunales competentes de la Ciudad de México, México."
        },
        {
          title: "11. Modificaciones",
          content: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en la Plataforma."
        },
        {
          title: "12. Contacto",
          content: "Para preguntas sobre estos términos, contáctanos en: comunidad@crowdconscious.app"
        }
      ]
    },
    en: {
      title: "Terms and Conditions of Use",
      lastUpdated: "Last updated: September 27, 2025",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: "By accessing and using Crowd Conscious (\"the Platform\"), you agree to be bound by these Terms and Conditions of Use. If you do not agree with any part of these terms, you must not use the Platform."
        },
        {
          title: "2. Service Description",
          content: "Crowd Conscious is a digital platform that connects local communities with brands and sponsors for social and environmental impact projects. The Platform facilitates community content creation, democratic voting, and sponsorship transactions."
        },
        {
          title: "3. User Registration and Accounts",
          content: "To use certain services, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account and password, and for all activities that occur under your account."
        },
        {
          title: "4. User Types",
          content: "The Platform supports two main types of users: (a) Community Users: individuals who participate in local communities, (b) Brands/Sponsors: companies seeking sponsorship opportunities and social impact."
        },
        {
          title: "5. Platform Fee",
          content: "Crowd Conscious charges a 15% commission on all sponsorship transactions processed through the Platform. This commission is automatically deducted from the total sponsorship amount before funds are transferred to the beneficiary community. Users and brands acknowledge and accept this fee structure."
        },
        {
          title: "6. Payments and Transactions",
          content: "All payments are processed through third-party payment service providers (Stripe). The Platform does not store credit card information. Refunds are subject to our payment processors' policies and applicable Mexican legislation."
        },
        {
          title: "7. User Content",
          content: "Users are responsible for the content they post. By posting content, you grant Crowd Conscious a non-exclusive license to use, display, and distribute such content on the Platform. Content must comply with Mexican laws and must not be offensive, illegal, or infringe third-party rights."
        },
        {
          title: "8. Prohibitions",
          content: "It is prohibited to: (a) Use the Platform for illegal activities, (b) Post false or misleading content, (c) Attempt to compromise the Platform's security, (d) Use the Platform for spam or unauthorized commercial activities."
        },
        {
          title: "9. Privacy and Data Protection",
          content: "The handling of personal data is governed by our Privacy Policy and complies with Mexico's Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP)."
        },
        {
          title: "10. Applicable Law and Jurisdiction",
          content: "These terms are governed by the laws of the United Mexican States. Any disputes will be resolved by the competent courts of Mexico City, Mexico."
        },
        {
          title: "11. Modifications",
          content: "We reserve the right to modify these terms at any time. Changes will take effect immediately after publication on the Platform."
        },
        {
          title: "12. Contact",
          content: "For questions about these terms, contact us at: comunidad@crowdconscious.app"
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
                ? 'Al usar Crowd Conscious, acepta estos términos y condiciones.'
                : 'By using Crowd Conscious, you agree to these terms and conditions.'
              }
            </p>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
