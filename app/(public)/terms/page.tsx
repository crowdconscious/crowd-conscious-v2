'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function TermsPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Términos y Condiciones de Uso",
      lastUpdated: "Última actualización: 10 de junio de 2026",
      sections: [
        {
          title: "1. Aceptación de los Términos",
          content: "Al acceder y utilizar Crowd Conscious (\"la Plataforma\"), usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la Plataforma."
        },
        {
          title: "2. Descripción del Servicio",
          content: "Crowd Conscious es una plataforma de consulta pública gratuita (free-to-play) que canaliza la inteligencia colectiva hacia el impacto social. La Plataforma permite a los usuarios: (a) Participar en Pulses (consultas ponderadas por confianza) sobre temas como Copa Mundial, economía, política, sostenibilidad y más, sin arriesgar dinero; (b) Ganar XP y logros por sus votos; (c) Votar democráticamente sobre qué causas comunitarias reciben fondos del Fondo Consciente; (d) Sugerir ideas de Pulses en el Buzón Consciente. Las marcas pueden patrocinar Pulses; el 20% del neto estimado de cada patrocinio se destina al Fondo Consciente para causas elegidas por la comunidad."
        },
        {
          title: "3. Registro y Cuentas de Usuario",
          content: "Para utilizar la Plataforma debe crear una cuenta proporcionando información precisa y completa (correo electrónico, contraseña, nombre). Es responsable de mantener la confidencialidad de su cuenta y contraseña, y de todas las actividades que ocurran bajo su cuenta. La confirmación por correo electrónico es requerida para activar su cuenta."
        },
        {
          title: "4. Tipos de Usuario",
          content: "La Plataforma admite varios tipos de usuarios: (a) Participantes: individuos que votan en Pulses, ganan XP y votan en causas; (b) Marcas/Patrocinadores: empresas que patrocinan Pulses y reciben reportes de impacto; (c) Usuarios Corporativos: empleados invitados que acceden a módulos de aprendizaje y certificaciones; (d) Administradores: personal autorizado que gestiona Pulses, agentes y configuraciones de la Plataforma."
        },
        {
          title: "5. Participación Free-to-Play y XP",
          content: "La participación en Crowd Conscious es gratuita. No se requiere dinero real para participar. Cada voto y otras acciones elegibles generan puntos de experiencia (XP) que contribuyen a su puntuación, nivel (tier) y clasificación en el leaderboard. El XP no tiene valor monetario, no es transferible entre cuentas y no puede canjearse por dinero en efectivo. Crowd Conscious puede permitirle canjear XP acumulado por beneficios, descuentos o experiencias ofrecidos por Lugares Conscientes certificados (\"Conscious Perks\"), sujetos a disponibilidad del establecimiento, reglas de cada oferta (incluidos límites de stock, vigencia y nivel mínimo), y confirmación en el lugar por personal autorizado del establecimiento. Los canjes se procesan a través de la Plataforma mediante códigos de un solo uso; usted es responsable de presentar su código válido en el momento acordado. Crowd Conscious no garantiza la disponibilidad de ninguna oferta ni responde por incumplimientos del establecimiento más allá de facilitar el mecanismo de canje. Gastar XP en un canje no reduce su XP acumulado para efectos de clasificación en el leaderboard."
        },
        {
          title: "6. Fondo Consciente y Patrocinios",
          content: "El 20% del neto estimado de cada transacción de patrocinio procesada a través de la Plataforma se destina al Fondo Consciente; el resto del neto estimado financia las operaciones de la Plataforma (tras deducir comisiones de procesamiento de pago). Los usuarios votan democráticamente sobre qué causas comunitarias reciben las asignaciones mensuales del Fondo. Esta estructura es transparente y se comunica claramente a patrocinadores y usuarios."
        },
        {
          title: "7. Pagos y Transacciones",
          content: "Los pagos de patrocinio se procesan a través de Stripe. La Plataforma no almacena información de tarjetas de crédito. Los reembolsos están sujetos a las políticas de Stripe y la legislación aplicable. Los votos de usuarios no implican pagos; son gratuitos."
        },
        {
          title: "8. Contenido del Usuario",
          content: "Los usuarios son responsables del contenido que publican (comentarios, ideas en el Buzón Consciente, etc.). Al publicar contenido, otorga a Crowd Conscious una licencia no exclusiva para usar, mostrar y distribuir dicho contenido en la Plataforma. El contenido debe cumplir con las leyes aplicables y no debe ser ofensivo, ilegal o infringir derechos de terceros."
        },
        {
          title: "9. Prohibiciones",
          content: "Está prohibido: (a) Usar la Plataforma para actividades ilegales; (b) Publicar contenido falso o engañoso; (c) Intentar comprometer la seguridad de la Plataforma; (d) Usar la Plataforma para spam o actividades comerciales no autorizadas; (e) Manipular Pulses o votaciones de causas de forma fraudulenta."
        },
        {
          title: "10. Privacidad y Protección de Datos",
          content: "El manejo de datos personales se rige por nuestra Política de Privacidad y cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México y el RGPD cuando aplique."
        },
        {
          title: "11. Ley Aplicable y Jurisdicción",
          content: "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier disputa será resuelta por los tribunales competentes de la Ciudad de México, México."
        },
        {
          title: "12. Modificaciones",
          content: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor tras su publicación en la Plataforma. Le recomendamos revisar estos términos periódicamente."
        },
        {
          title: "13. Contacto",
          content: "Para preguntas sobre estos términos, contáctanos en: comunidad@crowdconscious.app"
        }
      ]
    },
    en: {
      title: "Terms and Conditions of Use",
      lastUpdated: "Last updated: June 10, 2026",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: "By accessing and using Crowd Conscious (\"the Platform\"), you agree to be bound by these Terms and Conditions of Use. If you do not agree with any part of these terms, you must not use the Platform."
        },
        {
          title: "2. Service Description",
          content: "Crowd Conscious is a free-to-play public consultation platform that channels collective intelligence toward social impact. The Platform enables users to: (a) Participate in Pulses (confidence-weighted consultations) on topics such as World Cup, economy, policy, sustainability, and more, without risking money; (b) Earn XP and achievements for their votes; (c) Vote democratically on which community causes receive grants from the Conscious Fund; (d) Suggest Pulse ideas in the Conscious Inbox. Brands may sponsor Pulses; 20% of estimated net proceeds from each sponsorship goes to the Conscious Fund for causes chosen by the community."
        },
        {
          title: "3. User Registration and Accounts",
          content: "To use the Platform you must create an account by providing accurate and complete information (email, password, full name). You are responsible for maintaining the confidentiality of your account and password, and for all activities that occur under your account. Email confirmation is required to activate your account."
        },
        {
          title: "4. User Types",
          content: "The Platform supports several user types: (a) Participants: individuals who vote in Pulses, earn XP, and vote on causes; (b) Brands/Sponsors: companies that sponsor Pulses and receive impact reports; (c) Corporate Users: invited employees who access learning modules and certifications; (d) Administrators: authorized personnel who manage Pulses, agents, and Platform settings."
        },
        {
          title: "5. Free-to-Play Participation and XP",
          content: "Participation on Crowd Conscious is free. No real money is required to participate. Each vote and other eligible actions generate experience points (XP) that contribute to your score, tier, and leaderboard ranking. XP has no monetary value, is non-transferable between accounts, and cannot be redeemed for cash. Crowd Conscious may allow you to redeem accumulated XP for benefits, discounts, or experiences offered by certified Conscious Locations (\"Conscious Perks\"), subject to venue availability, each offer's rules (including stock limits, validity windows, and minimum tier requirements), and on-site confirmation by authorized venue staff. Redemptions are processed through the Platform via single-use codes; you are responsible for presenting a valid code at the agreed time. Crowd Conscious does not guarantee the availability of any offer and is not liable for venue non-performance beyond facilitating the redemption mechanism. Spending XP on a redemption does not reduce your accumulated XP for leaderboard ranking purposes."
        },
        {
          title: "6. Conscious Fund and Sponsorships",
          content: "20% of estimated net proceeds from each transaction processed through the Platform goes to the Conscious Fund; the remainder of estimated net proceeds funds Platform operations (after payment processing fees). Users vote democratically on which community causes receive the Fund's monthly allocations. This structure is transparent and clearly communicated to sponsors and users."
        },
        {
          title: "7. Payments and Transactions",
          content: "Sponsorship payments are processed through Stripe. The Platform does not store credit card information. Refunds are subject to Stripe's policies and applicable legislation. User votes do not involve payments; they are free."
        },
        {
          title: "8. User Content",
          content: "Users are responsible for the content they post (comments, Conscious Inbox ideas, etc.). By posting content, you grant Crowd Conscious a non-exclusive license to use, display, and distribute such content on the Platform. Content must comply with applicable laws and must not be offensive, illegal, or infringe third-party rights."
        },
        {
          title: "9. Prohibitions",
          content: "It is prohibited to: (a) Use the Platform for illegal activities; (b) Post false or misleading content; (c) Attempt to compromise the Platform's security; (d) Use the Platform for spam or unauthorized commercial activities; (e) Fraudulently manipulate Pulses or cause voting."
        },
        {
          title: "10. Privacy and Data Protection",
          content: "The handling of personal data is governed by our Privacy Policy and complies with Mexico's Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP) and GDPR where applicable."
        },
        {
          title: "11. Applicable Law and Jurisdiction",
          content: "These terms are governed by the laws of the United Mexican States. Any disputes will be resolved by the competent courts of Mexico City, Mexico."
        },
        {
          title: "12. Modifications",
          content: "We reserve the right to modify these terms at any time. Changes will take effect upon publication on the Platform. We recommend reviewing these terms periodically."
        },
        {
          title: "13. Contact",
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
