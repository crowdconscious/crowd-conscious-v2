'use client'

import { useState } from 'react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import Link from 'next/link'

export default function PrivacyPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      title: "Aviso de Privacidad",
      lastUpdated: "Última actualización: 18 de mayo de 2026",
      sections: [
        {
          title: "1. Responsable del Tratamiento",
          content: "Crowd Conscious, con domicilio en México, es responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y el RGPD cuando aplique. Crowd Conscious opera tanto una plataforma web (crowdconscious.app) como aplicaciones móviles nativas para iOS y Android, y el presente Aviso de Privacidad aplica por igual a ambos canales."
        },
        {
          title: "2. Datos Personales Recabados",
          content: "Recabamos los siguientes datos personales: (a) Datos de identificación: nombre completo, correo electrónico; (b) Datos de cuenta: contraseña (encriptada), preferencias de idioma; (c) Datos de actividad: predicciones, votos en mercados, votos en causas del Fondo Consciente, XP, logros, comentarios, ideas en el Buzón Consciente, señales ciudadanas y reportes; (d) Datos financieros: información de pago para patrocinios (procesada por Stripe; no almacenamos datos de tarjeta); (e) Datos de navegación: cookies, dirección IP, sesiones; (f) Datos corporativos (si aplica): invitaciones, progreso en módulos, certificaciones; (g) Datos de ubicación: coordenadas aproximadas de latitud y longitud utilizadas exclusivamente para detectar la municipalidad correspondiente al crear una señal ciudadana (recabados con su consentimiento expreso a través de expo-location en la aplicación móvil o ingresados manualmente en la versión web); (h) Imágenes y contenido multimedia: fotografías de perfil (avatar) y evidencias fotográficas adjuntas a señales ciudadanas. Los metadatos EXIF (geolocalización, identificadores de dispositivo) son removidos antes de almacenar las imágenes en nuestros servidores; (i) Identificadores de dispositivo y notificaciones push: tokens de notificación (Expo Push Token, APNs token para iOS, FCM token para Android), modelo del dispositivo, sistema operativo y versión, e idioma del dispositivo; (j) Datos de diagnóstico y rendimiento: reportes de errores, trazas de pila (stack traces) y métricas de uso anonimizadas que nos permiten identificar fallas y mejorar la estabilidad de la plataforma; (k) Datos de autenticación con Apple: cuando opta por iniciar sesión mediante Apple Sign-In, recibimos un identificador anónimo de usuario emitido por Apple y, opcionalmente, una dirección de correo relay si usted elige ocultar su correo personal."
        },
        {
          title: "3. Finalidades del Tratamiento",
          content: "Sus datos personales serán utilizados para: (a) Prestación de la plataforma de predicción (cuentas, sesiones, XP, leaderboard); (b) Procesamiento de patrocinios y asignación del Fondo Consciente; (c) Comunicación sobre su cuenta, logros, notificaciones y servicios; (d) Generación de contenido por agentes de IA (resúmenes, insights, reportes de patrocinadores); (e) Mejora de servicios y experiencia del usuario; (f) Cumplimiento de obligaciones legales; (g) Seguridad y prevención de fraude (incluyendo limitación de tasa)."
        },
        {
          title: "4. Transferencias de Datos",
          content: "Sus datos pueden ser transferidos a: (a) Supabase Inc. (Estados Unidos) para almacenamiento, autenticación y base de datos; (b) Stripe Inc. (Estados Unidos) para procesamiento de pagos de patrocinio; (c) Resend (Estados Unidos) para correo electrónico transaccional; (d) Vercel (Estados Unidos) para alojamiento y análisis; (e) Anthropic (Estados Unidos) para procesamiento de agentes de IA que generan contenido; (f) Upstash (cuando se utiliza) para limitación de tasa; (g) PostHog Inc. (Estados Unidos) para análisis de producto y métricas de eventos de uso; (h) Sentry (Functional Software, Inc.) (Estados Unidos) para reportes de errores y monitoreo de rendimiento de la aplicación; (i) Apple Inc. (Estados Unidos) para autenticación mediante Apple Sign-In y entrega de notificaciones push en iOS a través de Apple Push Notification Service (APNs); (j) Google LLC (Estados Unidos) para entrega de notificaciones push en Android a través de Firebase Cloud Messaging (FCM); (k) Expo (650 Industries, Inc.) (Estados Unidos) para el ruteo de notificaciones push desde nuestros servidores hacia APNs y FCM. Todas las transferencias internacionales se realizan al amparo de mecanismos válidos de transferencia de datos y cumplen con los niveles de protección requeridos por la legislación aplicable."
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
          content: "La aplicación móvil está clasificada como 17+ en el App Store de Apple y con la clasificación equivalente en Google Play. La plataforma —tanto web como móvil— está dirigida exclusivamente a usuarios mayores de 18 años en México (mayoría de edad civil). No recabamos intencionalmente datos personales de menores de 18 años. Si un padre, madre, tutor o representante legal detecta que un menor está utilizando la plataforma, puede solicitar la eliminación inmediata de la cuenta y de cualquier dato asociado escribiendo a comunidad@crowdconscious.app."
        },
        {
          title: "10. Modificaciones al Aviso",
          content: "Nos reservamos el derecho de modificar este aviso de privacidad. Las modificaciones serán comunicadas a través de la plataforma. La fecha de última actualización se indica al inicio."
        },
        {
          title: "11. Aplicación móvil",
          content: "La aplicación móvil de Crowd Conscious solicita acceso a determinadas funciones del sistema operativo únicamente cuando es necesario para prestar el servicio: (a) Cámara y galería/biblioteca de fotos: para que el usuario pueda adjuntar una fotografía de perfil y evidencia visual a señales ciudadanas; (b) Ubicación (en uso): para detectar la municipalidad asociada a una señal al momento de su creación; (c) Notificaciones: para informar al usuario sobre actividad relevante en la plataforma (respuestas a sus señales, votos, anuncios oficiales). El usuario puede otorgar, denegar o revocar cualquiera de estos permisos en cualquier momento desde los ajustes (Settings) de su dispositivo, sin que ello afecte la funcionalidad principal de la aplicación más allá de las funciones que dependen del permiso revocado. La aplicación NO accede al micrófono, contactos, calendario, datos de salud o actividad física, ni a datos biométricos. La aplicación NO rastrea al usuario a través de aplicaciones o sitios web de terceros: no utilizamos el identificador IDFA y no solicitamos autorización bajo el marco de App Tracking Transparency (ATT) de Apple."
        },
        {
          title: "12. Contenido generado por usuarios y moderación",
          content: "Las señales ciudadanas, comentarios y demás aportaciones publicadas por los usuarios constituyen contenido público generado por usuarios y son visibles para otros miembros de la comunidad. Crowd Conscious se reserva el derecho de moderar, ocultar o eliminar cualquier contenido que infrinja nuestros Términos del Servicio, la legislación aplicable o nuestras normas comunitarias. Los usuarios cuentan con herramientas integradas en la aplicación para reportar contenido inapropiado y para bloquear a otros usuarios. Nos comprometemos a revisar y responder a los reportes de contenido inapropiado o abuso en un plazo no mayor a 24 horas hábiles. El contenido eliminado podrá conservarse en registros internos de moderación por un periodo de hasta 90 días con fines de auditoría, prevención de abuso reincidente y cumplimiento de obligaciones legales, tras lo cual será eliminado de forma definitiva."
        },
        {
          title: "13. Contacto",
          content: "Para preguntas sobre este aviso de privacidad o ejercer sus derechos ARCO, contáctenos en: comunidad@crowdconscious.app"
        }
      ]
    },
    en: {
      title: "Privacy Notice",
      lastUpdated: "Last updated: May 18, 2026",
      sections: [
        {
          title: "1. Data Controller",
          content: "Crowd Conscious, domiciled in Mexico, is responsible for the processing of your personal data in accordance with Mexico's Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP) and GDPR where applicable. Crowd Conscious operates both a web platform (crowdconscious.app) and native mobile applications for iOS and Android, and this Privacy Notice applies equally to both channels."
        },
        {
          title: "2. Personal Data Collected",
          content: "We collect the following personal data: (a) Identification data: full name, email address; (b) Account data: password (encrypted), language preferences; (c) Activity data: predictions, market votes, Conscious Fund cause votes, XP, achievements, comments, Conscious Inbox ideas, citizen signals and reports; (d) Financial data: payment information for sponsorships (processed by Stripe; we do not store card data); (e) Navigation data: cookies, IP address, sessions; (f) Corporate data (if applicable): invitations, module progress, certifications; (g) Location data: approximate latitude and longitude coordinates used solely to detect the corresponding municipality when creating a citizen signal (collected with your express consent via expo-location in the mobile app or entered manually on the web platform); (h) Images and multimedia content: profile photographs (avatar) and photographic evidence attached to citizen signals. EXIF metadata (geolocation, device identifiers) is stripped before images are stored on our servers; (i) Device identifiers and push notifications: notification tokens (Expo Push Token, APNs token for iOS, FCM token for Android), device model, operating system and version, and device language; (j) Diagnostic and performance data: error reports, stack traces, and anonymized usage metrics that allow us to identify failures and improve platform stability; (k) Apple authentication data: when you elect to sign in using Apple Sign-In, we receive an anonymous user identifier issued by Apple and, optionally, a private relay email address if you choose to hide your personal email."
        },
        {
          title: "3. Processing Purposes",
          content: "Your personal data will be used for: (a) Provision of the prediction platform (accounts, sessions, XP, leaderboard); (b) Processing sponsorships and Conscious Fund allocation; (c) Communication about your account, achievements, notifications, and services; (d) AI agent-generated content (summaries, insights, sponsor reports); (e) Service improvement and user experience enhancement; (f) Legal compliance obligations; (g) Security and fraud prevention (including rate limiting)."
        },
        {
          title: "4. Data Transfers",
          content: "Your data may be transferred to: (a) Supabase Inc. (United States) for storage, authentication, and database; (b) Stripe Inc. (United States) for sponsorship payment processing; (c) Resend (United States) for transactional email; (d) Vercel (United States) for hosting and analytics; (e) Anthropic (United States) for AI agent content generation; (f) Upstash (when used) for rate limiting; (g) PostHog Inc. (United States) for product analytics and usage event metrics; (h) Sentry (Functional Software, Inc.) (United States) for error reporting and application performance monitoring; (i) Apple Inc. (United States) for Apple Sign-In authentication and delivery of push notifications on iOS via the Apple Push Notification Service (APNs); (j) Google LLC (United States) for delivery of push notifications on Android via Firebase Cloud Messaging (FCM); (k) Expo (650 Industries, Inc.) (United States) for routing push notifications from our servers to APNs and FCM. All international transfers are carried out under valid data transfer mechanisms and comply with the levels of protection required by applicable law."
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
          content: "The mobile application is rated 17+ on the Apple App Store and with the equivalent rating on Google Play. The platform — both web and mobile — is intended exclusively for users 18 years of age or older in Mexico (civil age of majority). We do not knowingly collect personal data from individuals under 18 years of age. If a parent, guardian, or legal representative detects that a minor is using the platform, they may request the immediate deletion of the account and any associated data by writing to comunidad@crowdconscious.app."
        },
        {
          title: "10. Notice Modifications",
          content: "We reserve the right to modify this privacy notice. Modifications will be communicated through the platform. The last updated date is indicated at the top."
        },
        {
          title: "11. Mobile Application",
          content: "The Crowd Conscious mobile application requests access to certain operating-system features only when necessary to deliver the service: (a) Camera and photo gallery/library: to allow the user to attach a profile photograph and visual evidence to citizen signals; (b) Location (while in use): to detect the municipality associated with a signal at the time of its creation; (c) Notifications: to inform the user of relevant activity on the platform (replies to their signals, votes, official announcements). The user may grant, deny, or revoke any of these permissions at any time from the device's Settings, without affecting the application's core functionality beyond the features that depend on the revoked permission. The application does NOT access the microphone, contacts, calendar, health or fitness data, or biometric data. The application does NOT track the user across third-party applications or websites: we do not use the IDFA identifier and do not prompt for authorization under Apple's App Tracking Transparency (ATT) framework."
        },
        {
          title: "12. User-Generated Content and Moderation",
          content: "Citizen signals, comments, and other contributions published by users constitute public user-generated content and are visible to other members of the community. Crowd Conscious reserves the right to moderate, hide, or remove any content that violates our Terms of Service, applicable law, or our community guidelines. Users have in-app tools available to report objectionable content and to block other users. We are committed to reviewing and responding to reports of objectionable content or abuse within no more than 24 business hours. Removed content may be retained in internal moderation logs for a period of up to 90 days for auditing purposes, prevention of repeat abuse, and compliance with legal obligations, after which it will be permanently deleted."
        },
        {
          title: "13. Contact",
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
