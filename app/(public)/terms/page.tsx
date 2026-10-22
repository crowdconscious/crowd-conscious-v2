'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function TermsPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Términos y Condiciones de Uso",
      lastUpdated: "Última actualización: 16 de octubre de 2026",
      sections: [
        {
          title: "1. Aceptación de los Términos",
          content: "Crowd Conscious (\"la Plataforma\") es operada por Francisco A. Blockstrand (persona física), operando bajo el nombre comercial Crowd Conscious, con domicilio en Hegel 406, Polanco, C.P. 11560, Ciudad de México, México. Al acceder y utilizar la Plataforma, usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la Plataforma."
        },
        {
          title: "2. Descripción del Servicio",
          content: "Crowd Conscious es una plataforma de consulta pública gratuita (free-to-play) que canaliza la inteligencia colectiva hacia el impacto social. La Plataforma permite a los usuarios: (a) Participar en Pulses (consultas ponderadas por confianza) sobre temas como Copa Mundial, economía, política, sostenibilidad y más, sin arriesgar dinero; (b) Llevar un registro privado de sus acciones (votos, señales, evaluaciones), sin puntos ni clasificaciones; (c) Votar democráticamente sobre qué causas comunitarias reciben fondos del Fondo Consciente; (d) Sugerir ideas de Pulses en el Buzón Consciente. Además, Crowd Conscious ofrece: (e) Organizaciones, un servicio para empresas e instituciones descrito en la sección 7; (f) Patrocinio comunitario en /patrocinio, un apoyo directo al Fondo Consciente descrito en la sección 8; y (g) los sellos Lugar Consciente (gratuito) y Sello verificado (de pago), descritos en la sección 8 bis."
        },
        {
          title: "3. Registro y Cuentas de Usuario",
          content: "Para utilizar la Plataforma debe crear una cuenta proporcionando información precisa y completa (correo electrónico, contraseña, nombre). Es responsable de mantener la confidencialidad de su cuenta y contraseña, y de todas las actividades que ocurran bajo su cuenta. La confirmación por correo electrónico es requerida para activar su cuenta."
        },
        {
          title: "4. Tipos de Usuario",
          content: "La Plataforma admite varios tipos de usuarios: (a) Participantes: individuos que votan en Pulses, respaldan Señales, evalúan Lugares Conscientes y votan en causas; (b) Organizaciones: empresas e instituciones que contratan Lecturas o Escucha continua; (c) Patrocinadores comunitarios: personas o marcas que apoyan el Fondo Consciente desde /patrocinio; (d) Usuarios Corporativos: empleados invitados que acceden a módulos de aprendizaje y certificaciones; (e) Administradores: personal autorizado que gestiona Pulses, agentes y configuraciones de la Plataforma."
        },
        {
          title: "5. Participación gratuita y Modelo Consciente",
          content: "La participación en Crowd Conscious es gratuita. No se requiere dinero real para participar. Bajo el Modelo Consciente, sus acciones (votos, señales, respaldos, evaluaciones) se registran como evidencia, nunca como puntos: no hay puntos de experiencia, niveles ni clasificaciones públicas, y cualquier reputación cívica es privada y visible sólo para usted. Crowd Conscious puede ofrecer beneficios, descuentos o experiencias en Lugares Conscientes certificados (\"Conscious Perks\"), abiertos a todos los participantes, sujetos a disponibilidad del establecimiento, reglas de cada oferta (incluidos límites de stock y vigencia), y confirmación en el lugar por personal autorizado del establecimiento. Los canjes se procesan a través de la Plataforma mediante códigos de un solo uso; usted es responsable de presentar su código válido en el momento acordado. Crowd Conscious no garantiza la disponibilidad de ninguna oferta ni responde por incumplimientos del establecimiento más allá de facilitar el mecanismo de canje."
        },
        {
          title: "6. Fondo Consciente y Patrocinios",
          content: "El 20% del monto de cada contrato de Organizaciones, calculado antes de IVA, se destina al Fondo Consciente; el resto financia las operaciones de la Plataforma. Las aportaciones de Patrocinio comunitario, menos las comisiones de la tarjeta, se destinan al Fondo Consciente (ver sección 8). Los usuarios votan democráticamente sobre qué causas comunitarias reciben las asignaciones del Fondo. Esta estructura es transparente y se comunica a clientes, patrocinadores y usuarios."
        },
        {
          title: "7. Organizaciones (servicio para empresas e instituciones)",
          content: "Organizaciones ofrece Lecturas (mediciones puntuales) y Escucha continua (mediciones recurrentes) de la opinión de los usuarios, clientes o públicos de la organización contratante, además del Sello verificado como complemento opcional de +$10,000 MXN al mes (más IVA) sobre el plan contratado, basado en una lectura medida con resultados públicos (ver sección 8 bis). Cada respuesta incluye un nivel de certeza de 1 a 10. La organización contratante no puede editar, ocultar ni alterar los resultados; Crowd Conscious tampoco los modifica. No se solicitan datos personales a las personas que responden: la organización recibe resultados agregados, nunca identidades. Los alcances, precios y plazos específicos se establecen en la propuesta o en la página de contratación aceptada por el cliente."
        },
        {
          title: "8. Patrocinio comunitario",
          content: "El Patrocinio comunitario disponible en /patrocinio es un apoyo directo al Fondo Consciente. Las aportaciones se pagan con tarjeta en el sitio a través de Stripe. Se descuentan las comisiones de la tarjeta; el resto va al Fondo Consciente. Tras el pago enviamos por correo (si lo proporcionó) una confirmación de aportación, que no es factura ni comprobante fiscal (CFDI) y no es un recibo de donativo deducible de impuestos. No constituye la contratación de un servicio de medición ni de publicidad, ni otorga control sobre consultas, resultados o causas; las causas que reciben recursos se eligen por votación de la comunidad."
        },
        {
          title: "8 bis. Sellos: Lugar Consciente y Sello verificado",
          content: "Crowd Conscious otorga dos sellos distintos, con nombres y requisitos diferentes. (a) Lugar Consciente es gratuito y se gana; no se compra. Pueden obtenerlo los lugares que entran por Conscious Locations (nominados o aprobados) cuando: (i) durante al menos 4 semanas distintas dentro de un periodo móvil de 8 semanas, al menos 3 personas distintas por semana votan en Pulses a través del QR o enlace propio del lugar, sumando al menos 25 personas distintas; y (ii) una persona autorizada acepta, en nombre del lugar, nuestros 7 valores (Escucha, Transparencia, Acción, Cuidado del entorno, Comunidad local, Inclusión y Difusión). Los valores son un compromiso de buena fe para vivir por ellos; no son reglas auditadas ni una certificación de cumplimiento, y Crowd Conscious no garantiza ni respalda las prácticas, productos o servicios del lugar. No cuentan los votos del propio dueño ni los votos en exceso desde una misma red; los casos con señales de manipulación pasan a revisión manual. El sello es válido 12 meses y se renueva si el lugar vuelve a cumplir los requisitos con la versión vigente de los valores; de lo contrario, vence. Crowd Conscious puede revocarlo en cualquier momento si hay manipulación, información falsa, uso indebido del distintivo o conductas contrarias a los valores. Mientras esté vigente, el lugar puede mostrar el distintivo sin modificarlo y enlazado a su página pública de verificación; al vencer o ser revocado debe dejar de usarlo. (b) Sello verificado es parte del servicio de pago de Organizaciones (sección 7): se basa en una lectura medida con resultados públicos y está activo sólo mientras el servicio está vigente y al menos una lectura cerrada es pública. Las organizaciones con Sello verificado reciben también Lugar Consciente, sin cumplir el requisito de difusión, una vez que aceptan nuestros valores; ese Lugar Consciente se mantiene mientras el servicio siga vigente. Los nombres anteriores \"Empresa Consciente\" y \"Esfuerzo Consciente\" quedan sustituidos por \"Sello verificado\"."
        },
        {
          title: "9. Pagos, comprobantes y facturación",
          content: "Los pagos pueden realizarse con tarjeta en el sitio (procesados por Stripe; la Plataforma no almacena datos de tarjeta) o mediante propuesta y llamada, según se acuerde con el cliente. Tras el pago, enviamos por correo un recibo de pago emitido por Crowd Conscious; este recibo NO es una factura ni un comprobante fiscal. El CFDI se emite posteriormente por nuestro contador con los datos de facturación que nos proporcione el cliente. Los precios se expresan en pesos mexicanos más IVA, salvo que se indique otra cosa. Los votos de los usuarios son gratuitos y no implican pagos."
        },
        {
          title: "10. Cancelaciones y reembolsos",
          content: "Las cancelaciones de planes recurrentes (Escucha continua y Sello verificado) y las solicitudes de reembolso se atienden conforme a lo pactado en la propuesta o contratación aceptada por el cliente y a la legislación aplicable, incluida la Ley Federal de Protección al Consumidor cuando corresponda. Para solicitar una cancelación o reembolso escriba a comunidad@crowdconscious.app."
        },
        {
          title: "11. Contenido del Usuario",
          content: "Los usuarios son responsables del contenido que publican (comentarios, ideas en el Buzón Consciente, etc.). Al publicar contenido, otorga a Crowd Conscious una licencia no exclusiva para usar, mostrar y distribuir dicho contenido en la Plataforma. El contenido debe cumplir con las leyes aplicables y no debe ser ofensivo, ilegal o infringir derechos de terceros."
        },
        {
          title: "12. Prohibiciones",
          content: "Está prohibido: (a) Usar la Plataforma para actividades ilegales; (b) Publicar contenido falso o engañoso; (c) Intentar comprometer la seguridad de la Plataforma; (d) Usar la Plataforma para spam o actividades comerciales no autorizadas; (e) Manipular consultas o votaciones de causas de forma fraudulenta; (f) Inflar artificialmente los votos atribuidos a un lugar (por ejemplo, votar uno mismo, usar múltiples cuentas o dispositivos, o pagar o condicionar beneficios a cambio de votos) para obtener o conservar el sello Lugar Consciente."
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
      lastUpdated: "Last updated: October 16, 2026",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: "Crowd Conscious (\"the Platform\") is operated by Francisco A. Blockstrand (individual, persona física), operating under the trade name Crowd Conscious, with address at Hegel 406, Polanco, Postal Code 11560, Mexico City, Mexico. By accessing and using the Platform, you agree to be bound by these Terms and Conditions of Use. If you do not agree with any part of these terms, you must not use the Platform."
        },
        {
          title: "2. Service Description",
          content: "Crowd Conscious is a free-to-play public consultation platform that channels collective intelligence toward social impact. The Platform enables users to: (a) Participate in Pulses (confidence-weighted consultations) on topics such as World Cup, economy, policy, sustainability, and more, without risking money; (b) Keep a private record of their actions (votes, signals, evaluations), with no points or rankings; (c) Vote democratically on which community causes receive grants from the Conscious Fund; (d) Suggest Pulse ideas in the Conscious Inbox. Crowd Conscious also offers: (e) Organizations, a service for companies and institutions described in section 7; (f) Community Sponsorship at /patrocinio, direct support for the Conscious Fund described in section 8; and (g) the Lugar Consciente (free) and Sello verificado (paid) seals, described in section 8 bis."
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
          title: "5. Free Participation and the Conscious Model",
          content: "Participation on Crowd Conscious is free. No real money is required to participate. Under the Conscious Model, your actions (votes, signals, co-signs, evaluations) are recorded as evidence, never as points: there are no experience points, tiers, or public rankings, and any civic reputation is private and visible only to you. Crowd Conscious may offer benefits, discounts, or experiences at certified Conscious Locations (\"Conscious Perks\"), open to all participants, subject to venue availability, each offer's rules (including stock limits and validity windows), and on-site confirmation by authorized venue staff. Redemptions are processed through the Platform via single-use codes; you are responsible for presenting a valid code at the agreed time. Crowd Conscious does not guarantee the availability of any offer and is not liable for venue non-performance beyond facilitating the redemption mechanism."
        },
        {
          title: "6. Conscious Fund and Sponsorships",
          content: "20% of the amount of every Organizations contract, calculated before VAT (IVA), goes to the Conscious Fund; the remainder funds Platform operations. Community Sponsorship contributions, minus card fees, go to the Conscious Fund (see section 8). Users vote democratically on which community causes receive the Fund's allocations. This structure is transparent and communicated to clients, sponsors and users."
        },
        {
          title: "7. Organizations (service for companies and institutions)",
          content: "Organizations offers Readings (one-off measurements) and Continuous Listening (recurring measurements) of the opinion of the hiring organization's users, customers or audiences, plus the Sello verificado as an optional add-on of +$10,000 MXN per month (plus VAT) on top of the contracted plan, based on a measured reading with public results (see section 8 bis). Every answer includes a certainty level from 1 to 10. The hiring organization cannot edit, hide or alter results; Crowd Conscious does not modify them either. No personal data is requested from respondents: the organization receives aggregate results, never identities. Specific scope, prices and timelines are set out in the proposal or hiring page accepted by the client."
        },
        {
          title: "8. Community Sponsorship",
          content: "Community Sponsorship, available at /patrocinio, is direct support for the Conscious Fund. Contributions are paid by card on the site through Stripe. Card fees are deducted; the rest goes to the Conscious Fund. After payment we email (if provided) a contribution confirmation, which is not a tax invoice (CFDI) and not a tax-deductible donation receipt. It is not the purchase of a measurement or advertising service and grants no control over consultations, results or causes; the causes that receive funds are chosen by community vote."
        },
        {
          title: "8 bis. Seals: Lugar Consciente and Sello verificado",
          content: "Crowd Conscious grants two different seals, with different names and requirements. (a) Lugar Consciente is free and earned; it cannot be bought. Places that join through Conscious Locations (nominated or approved) can earn it when: (i) in at least 4 distinct weeks within a rolling 8-week period, at least 3 different people per week vote in Pulses through the place's own QR or link, adding up to at least 25 different people; and (ii) an authorized person accepts, on the place's behalf, our 7 values (Listening, Transparency, Action, Care for the environment, Local community, Inclusion and Spreading the word). The values are a good-faith commitment to live by them; they are not audited rules or a compliance certification, and Crowd Conscious does not guarantee or endorse the place's practices, products or services. The owner's own votes and excess votes from a single network do not count; cases showing signs of manipulation go to manual review. The seal is valid for 12 months and renews if the place qualifies again under the current version of the values; otherwise it expires. Crowd Conscious may revoke it at any time for manipulation, false information, misuse of the badge or conduct contrary to the values. While it is valid, the place may display the badge unmodified and linked to its public verification page; once expired or revoked it must stop using it. (b) Sello verificado is part of the paid Organizations service (section 7): it is based on a measured reading with public results and is active only while the service is active and at least one closed reading is public. Organizations with Sello verificado also receive Lugar Consciente, without the distribution requirement, once they accept our values; that Lugar Consciente stays active while the service remains active. The former names \"Empresa Consciente\" and \"Esfuerzo Consciente\" are replaced by \"Sello verificado\"."
        },
        {
          title: "9. Payments, receipts and invoicing",
          content: "Payments can be made by card on the site (processed by Stripe; the Platform does not store card data) or by proposal and call, as agreed with the client. After payment we email a payment receipt issued by Crowd Conscious; this receipt is NOT a tax invoice. The CFDI (Mexican tax invoice) is issued afterwards by our accountant using the invoicing details the client provides. Prices are in Mexican pesos plus VAT (IVA) unless stated otherwise. User votes are free and involve no payment."
        },
        {
          title: "10. Cancellations and refunds",
          content: "Cancellations of recurring plans (Continuous Listening and the Sello verificado) and refund requests are handled according to the proposal or hiring terms accepted by the client and applicable law, including Mexico's Federal Consumer Protection Law where it applies. To request a cancellation or refund, write to comunidad@crowdconscious.app."
        },
        {
          title: "11. User Content",
          content: "Users are responsible for the content they post (comments, Conscious Inbox ideas, etc.). By posting content, you grant Crowd Conscious a non-exclusive license to use, display, and distribute such content on the Platform. Content must comply with applicable laws and must not be offensive, illegal, or infringe third-party rights."
        },
        {
          title: "12. Prohibitions",
          content: "It is prohibited to: (a) Use the Platform for illegal activities; (b) Post false or misleading content; (c) Attempt to compromise the Platform's security; (d) Use the Platform for spam or unauthorized commercial activities; (e) Fraudulently manipulate consultations or cause voting; (f) Artificially inflate votes attributed to a place (for example, self-voting, using multiple accounts or devices, or paying or conditioning benefits in exchange for votes) to obtain or keep the Lugar Consciente seal."
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
            <p className="text-sm text-gray-600">
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
