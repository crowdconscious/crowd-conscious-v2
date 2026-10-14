'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function TermsPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Términos y Condiciones de Uso",
      lastUpdated: "Última actualización: 13 de octubre de 2026",
      sections: [
        {
          title: "1. Aceptación de los Términos",
          content: "Crowd Conscious (\"la Plataforma\") es operada por Francisco A. Blockstrand (persona física), operando bajo el nombre comercial Crowd Conscious, con domicilio en Hegel 406, Polanco, C.P. 11560, Ciudad de México, México. Al acceder y utilizar la Plataforma, usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la Plataforma."
        },
        {
          title: "2. Descripción del Servicio",
          content: "Crowd Conscious es una plataforma de consulta pública gratuita (free-to-play) que canaliza la inteligencia colectiva hacia el impacto social. La Plataforma permite a los usuarios: (a) Participar en Pulses (consultas ponderadas por confianza) sobre temas como Copa Mundial, economía, política, sostenibilidad y más, sin arriesgar dinero; (b) Ganar XP y logros por sus votos; (c) Votar democráticamente sobre qué causas comunitarias reciben fondos del Fondo Consciente; (d) Sugerir ideas de Pulses en el Buzón Consciente. Además, Crowd Conscious ofrece: (e) Organizaciones, un servicio para empresas e instituciones descrito en la sección 7; y (f) Patrocinio comunitario en /patrocinio, un apoyo directo al Fondo Consciente descrito en la sección 8."
        },
        {
          title: "3. Registro y Cuentas de Usuario",
          content: "Para utilizar la Plataforma debe crear una cuenta proporcionando información precisa y completa (correo electrónico, contraseña, nombre). Es responsable de mantener la confidencialidad de su cuenta y contraseña, y de todas las actividades que ocurran bajo su cuenta. La confirmación por correo electrónico es requerida para activar su cuenta."
        },
        {
          title: "4. Tipos de Usuario",
          content: "La Plataforma admite varios tipos de usuarios: (a) Participantes: individuos que votan en Pulses, ganan XP y votan en causas; (b) Organizaciones: empresas e instituciones que contratan Lecturas o Escucha continua; (c) Patrocinadores comunitarios: personas o marcas que apoyan el Fondo Consciente desde /patrocinio; (d) Usuarios Corporativos: empleados invitados que acceden a módulos de aprendizaje y certificaciones; (e) Administradores: personal autorizado que gestiona Pulses, agentes y configuraciones de la Plataforma."
        },
        {
          title: "5. Participación Free-to-Play y XP",
          content: "La participación en Crowd Conscious es gratuita. No se requiere dinero real para participar. Cada voto y otras acciones elegibles generan puntos de experiencia (XP) que contribuyen a su puntuación, nivel (tier) y clasificación en el leaderboard. El XP no tiene valor monetario, no es transferible entre cuentas y no puede canjearse por dinero en efectivo. Crowd Conscious puede permitirle canjear XP acumulado por beneficios, descuentos o experiencias ofrecidos por Lugares Conscientes certificados (\"Conscious Perks\"), sujetos a disponibilidad del establecimiento, reglas de cada oferta (incluidos límites de stock, vigencia y nivel mínimo), y confirmación en el lugar por personal autorizado del establecimiento. Los canjes se procesan a través de la Plataforma mediante códigos de un solo uso; usted es responsable de presentar su código válido en el momento acordado. Crowd Conscious no garantiza la disponibilidad de ninguna oferta ni responde por incumplimientos del establecimiento más allá de facilitar el mecanismo de canje. Gastar XP en un canje no reduce su XP acumulado para efectos de clasificación en el leaderboard."
        },
        {
          title: "6. Fondo Consciente y Patrocinios",
          content: "El 20% del monto de cada contrato de Organizaciones, calculado antes de IVA, se destina al Fondo Consciente; el resto financia las operaciones de la Plataforma. Las aportaciones de Patrocinio comunitario, menos las comisiones de la tarjeta, se destinan al Fondo Consciente (ver sección 8). Los usuarios votan democráticamente sobre qué causas comunitarias reciben las asignaciones del Fondo. Esta estructura es transparente y se comunica a clientes, patrocinadores y usuarios."
        },
        {
          title: "7. Organizaciones (servicio para empresas e instituciones)",
          content: "Organizaciones ofrece Lecturas (mediciones puntuales) y Escucha continua (mediciones recurrentes) de la opinión de los usuarios, clientes o públicos de la organización contratante, además del Sello como complemento opcional de +$10,000 MXN al mes (más IVA) sobre el plan contratado. Cada respuesta incluye un nivel de certeza de 1 a 10. La organización contratante no puede editar, ocultar ni alterar los resultados; Crowd Conscious tampoco los modifica. No se solicitan datos personales a las personas que responden: la organización recibe resultados agregados, nunca identidades. Los alcances, precios y plazos específicos se establecen en la propuesta o en la página de contratación aceptada por el cliente."
        },
        {
          title: "8. Patrocinio comunitario",
          content: "El Patrocinio comunitario disponible en /patrocinio es un apoyo directo al Fondo Consciente. Las aportaciones se pagan con tarjeta en el sitio a través de Stripe. Se descuentan las comisiones de la tarjeta; el resto va al Fondo Consciente. Tras el pago enviamos por correo (si lo proporcionó) una confirmación de aportación, que no es factura ni comprobante fiscal (CFDI) y no es un recibo de donativo deducible de impuestos. No constituye la contratación de un servicio de medición ni de publicidad, ni otorga control sobre consultas, resultados o causas; las causas que reciben recursos se eligen por votación de la comunidad."
        },
        {
          title: "9. Pagos, comprobantes y facturación",
          content: "Los pagos pueden realizarse con tarjeta en el sitio (procesados por Stripe; la Plataforma no almacena datos de tarjeta) o mediante propuesta y llamada, según se acuerde con el cliente. Tras el pago, enviamos por correo un recibo de pago emitido por Crowd Conscious; este recibo NO es una factura ni un comprobante fiscal. El CFDI se emite posteriormente por nuestro contador con los datos de facturación que nos proporcione el cliente. Los precios se expresan en pesos mexicanos más IVA, salvo que se indique otra cosa. Los votos de los usuarios son gratuitos y no implican pagos."
        },
        {
          title: "10. Cancelaciones y reembolsos",
          content: "Las cancelaciones de planes recurrentes (Escucha continua y Sello) y las solicitudes de reembolso se atienden conforme a lo pactado en la propuesta o contratación aceptada por el cliente y a la legislación aplicable, incluida la Ley Federal de Protección al Consumidor cuando corresponda. Para solicitar una cancelación o reembolso escriba a comunidad@crowdconscious.app."
        },
        {
          title: "11. Contenido del Usuario",
          content: "Los usuarios son responsables del contenido que publican (comentarios, ideas en el Buzón Consciente, etc.). Al publicar contenido, otorga a Crowd Conscious una licencia no exclusiva para usar, mostrar y distribuir dicho contenido en la Plataforma. El contenido debe cumplir con las leyes aplicables y no debe ser ofensivo, ilegal o infringir derechos de terceros."
        },
        {
          title: "12. Prohibiciones",
          content: "Está prohibido: (a) Usar la Plataforma para actividades ilegales; (b) Publicar contenido falso o engañoso; (c) Intentar comprometer la seguridad de la Plataforma; (d) Usar la Plataforma para spam o actividades comerciales no autorizadas; (e) Manipular consultas o votaciones de causas de forma fraudulenta."
        },
        {
          title: "13. Privacidad y Protección de Datos",
          content: "El manejo de datos personales se rige por nuestra Política de Privacidad y cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México y el RGPD cuando aplique."
        },
        {
          title: "14. Ley Aplicable y Jurisdicción",
          content: "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier disputa será resuelta por los tribunales competentes de la Ciudad de México, México."
        },
        {
          title: "15. Modificaciones",
          content: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor tras su publicación en la Plataforma. Le recomendamos revisar estos términos periódicamente."
        },
        {
          title: "16. Contacto",
          content: "Para preguntas sobre estos términos, contáctanos en: comunidad@crowdconscious.app"
        }
      ]
    },
    en: {
      title: "Terms and Conditions of Use",
      lastUpdated: "Last updated: October 13, 2026",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: "Crowd Conscious (\"the Platform\") is operated by Francisco A. Blockstrand (individual, persona física), operating under the trade name Crowd Conscious, with address at Hegel 406, Polanco, Postal Code 11560, Mexico City, Mexico. By accessing and using the Platform, you agree to be bound by these Terms and Conditions of Use. If you do not agree with any part of these terms, you must not use the Platform."
        },
        {
          title: "2. Service Description",
          content: "Crowd Conscious is a free-to-play public consultation platform that channels collective intelligence toward social impact. The Platform enables users to: (a) Participate in Pulses (confidence-weighted consultations) on topics such as World Cup, economy, policy, sustainability, and more, without risking money; (b) Earn XP and achievements for their votes; (c) Vote democratically on which community causes receive grants from the Conscious Fund; (d) Suggest Pulse ideas in the Conscious Inbox. Crowd Conscious also offers: (e) Organizations, a service for companies and institutions described in section 7; and (f) Community Sponsorship at /patrocinio, direct support for the Conscious Fund described in section 8."
        },
        {
          title: "3. User Registration and Accounts",
          content: "To use the Platform you must create an account by providing accurate and complete information (email, password, full name). You are responsible for maintaining the confidentiality of your account and password, and for all activities that occur under your account. Email confirmation is required to activate your account."
        },
        {
          title: "4. User Types",
          content: "The Platform supports several user types: (a) Participants: individuals who vote in Pulses, co-sign Señales, evaluate Conscious Locations, and vote on fund causes; (b) Organizations: companies and institutions that hire Readings or Continuous Listening; (c) Community sponsors: people or brands that support the Conscious Fund from /patrocinio; (d) Corporate Users: invited employees who access learning modules and certifications; (e) Administrators: authorized personnel who manage Pulses, agents, and Platform settings. Opinion votes do not earn points or levels. Civic reputation, when enabled, is private to each participant."
        },
        {
          title: "5. Free-to-Play Participation and XP",
          content: "Participation on Crowd Conscious is free. No real money is required to participate. Each vote and other eligible actions generate experience points (XP) that contribute to your score, tier, and leaderboard ranking. XP has no monetary value, is non-transferable between accounts, and cannot be redeemed for cash. Crowd Conscious may allow you to redeem accumulated XP for benefits, discounts, or experiences offered by certified Conscious Locations (\"Conscious Perks\"), subject to venue availability, each offer's rules (including stock limits, validity windows, and minimum tier requirements), and on-site confirmation by authorized venue staff. Redemptions are processed through the Platform via single-use codes; you are responsible for presenting a valid code at the agreed time. Crowd Conscious does not guarantee the availability of any offer and is not liable for venue non-performance beyond facilitating the redemption mechanism. Spending XP on a redemption does not reduce your accumulated XP for leaderboard ranking purposes."
        },
        {
          title: "6. Conscious Fund and Sponsorships",
          content: "20% of the amount of every Organizations contract, calculated before VAT (IVA), goes to the Conscious Fund; the remainder funds Platform operations. Community Sponsorship contributions, minus card fees, go to the Conscious Fund (see section 8). Users vote democratically on which community causes receive the Fund's allocations. This structure is transparent and communicated to clients, sponsors and users."
        },
        {
          title: "7. Organizations (service for companies and institutions)",
          content: "Organizations offers Readings (one-off measurements) and Continuous Listening (recurring measurements) of the opinion of the hiring organization's users, customers or audiences, plus the Seal as an optional add-on of +$10,000 MXN per month (plus VAT) on top of the contracted plan. Every answer includes a certainty level from 1 to 10. The hiring organization cannot edit, hide or alter results; Crowd Conscious does not modify them either. No personal data is requested from respondents: the organization receives aggregate results, never identities. Specific scope, prices and timelines are set out in the proposal or hiring page accepted by the client."
        },
        {
          title: "8. Community Sponsorship",
          content: "Community Sponsorship, available at /patrocinio, is direct support for the Conscious Fund. Contributions are paid by card on the site through Stripe. Card fees are deducted; the rest goes to the Conscious Fund. After payment we email (if provided) a contribution confirmation, which is not a tax invoice (CFDI) and not a tax-deductible donation receipt. It is not the purchase of a measurement or advertising service and grants no control over consultations, results or causes; the causes that receive funds are chosen by community vote."
        },
        {
          title: "9. Payments, receipts and invoicing",
          content: "Payments can be made by card on the site (processed by Stripe; the Platform does not store card data) or by proposal and call, as agreed with the client. After payment we email a payment receipt issued by Crowd Conscious; this receipt is NOT a tax invoice. The CFDI (Mexican tax invoice) is issued afterwards by our accountant using the invoicing details the client provides. Prices are in Mexican pesos plus VAT (IVA) unless stated otherwise. User votes are free and involve no payment."
        },
        {
          title: "10. Cancellations and refunds",
          content: "Cancellations of recurring plans (Continuous Listening and the Seal) and refund requests are handled according to the proposal or hiring terms accepted by the client and applicable law, including Mexico's Federal Consumer Protection Law where it applies. To request a cancellation or refund, write to comunidad@crowdconscious.app."
        },
        {
          title: "11. User Content",
          content: "Users are responsible for the content they post (comments, Conscious Inbox ideas, etc.). By posting content, you grant Crowd Conscious a non-exclusive license to use, display, and distribute such content on the Platform. Content must comply with applicable laws and must not be offensive, illegal, or infringe third-party rights."
        },
        {
          title: "12. Prohibitions",
          content: "It is prohibited to: (a) Use the Platform for illegal activities; (b) Post false or misleading content; (c) Attempt to compromise the Platform's security; (d) Use the Platform for spam or unauthorized commercial activities; (e) Fraudulently manipulate consultations or cause voting."
        },
        {
          title: "13. Privacy and Data Protection",
          content: "The handling of personal data is governed by our Privacy Policy and complies with Mexico's Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP) and GDPR where applicable."
        },
        {
          title: "14. Applicable Law and Jurisdiction",
          content: "These terms are governed by the laws of the United Mexican States. Any disputes will be resolved by the competent courts of Mexico City, Mexico."
        },
        {
          title: "15. Modifications",
          content: "We reserve the right to modify these terms at any time. Changes will take effect upon publication on the Platform. We recommend reviewing these terms periodically."
        },
        {
          title: "16. Contact",
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
