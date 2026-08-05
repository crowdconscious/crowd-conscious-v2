/**
 * Bilingual copy for the Señal Express (/queja) surface. Spanish-first with an
 * English variant for every user-facing string (CLAUDE.md i18n rule). Server
 * components read locale from the `preferred-language` cookie; the client flow
 * reads it from `useLanguage()`.
 */

export type QuejaLocale = 'es' | 'en'

export function getQuejaCopy(locale: QuejaLocale) {
  const es = locale === 'es'
  return {
    meta: {
      title: es
        ? 'Redacta tu queja oficial a tu alcaldía — gratis, en 60 segundos'
        : 'Draft your official complaint to your borough — free, in 60 seconds',
      description: es
        ? 'Foto, ubicación y una frase. Redactamos por ti un oficio formal a tu alcaldía de la Ciudad de México, listo para descargar en PDF. Gratis.'
        : 'A photo, a location and one sentence. We draft a formal complaint (oficio) to your Mexico City borough, ready to download as a PDF. Free.',
    },

    comingSoon: {
      badge: es ? 'Próximamente' : 'Coming soon',
      title: es
        ? 'Señal Express está por llegar'
        : 'Señal Express is on its way',
      body: es
        ? 'Pronto podrás redactar tu queja oficial a tu alcaldía en 60 segundos. Mientras tanto, conoce cómo participa la ciudadanía en Crowd Conscious.'
        : 'Soon you will be able to draft your official complaint to your borough in 60 seconds. In the meantime, see how citizens take part in Crowd Conscious.',
      cta: es ? 'Ver Pulse' : 'See Pulse',
    },

    landing: {
      eyebrow: es ? 'Gratis · CDMX' : 'Free · Mexico City',
      h1: es
        ? 'Redacta tu queja oficial a tu alcaldía — gratis, en 60 segundos'
        : 'Draft your official complaint to your borough — free, in 60 seconds',
      subtitle: es
        ? 'Sube una foto, marca dónde y escribe una frase. Convertimos tu reporte en un oficio formal, con el tono correcto, listo para descargar en PDF y presentar.'
        : 'Upload a photo, mark where, and write one sentence. We turn your report into a formal complaint (oficio) with the right tone, ready to download as a PDF and file.',
      startCta: es ? 'Empezar mi queja' : 'Start my complaint',
      howItWorksTitle: es ? '¿Cómo funciona?' : 'How it works',
      howItWorks: [
        {
          title: es ? '1. Foto y lugar' : '1. Photo and place',
          body: es
            ? 'Toma o sube una foto del problema (opcional) y marca la alcaldía y, si quieres, la colonia o la calle.'
            : 'Take or upload a photo of the problem (optional) and mark the borough and, if you like, the neighbourhood or street.',
        },
        {
          title: es ? '2. Una frase' : '2. One sentence',
          body: es
            ? 'Describe en una frase qué pasa y elige la categoría. Nosotros redactamos el oficio formal por ti.'
            : 'Describe what is happening in one sentence and pick the category. We draft the formal oficio for you.',
        },
        {
          title: es ? '3. Descarga y publica' : '3. Download and publish',
          body: es
            ? 'Revisa y edita el borrador, descarga tu PDF y —si tienes cuenta— publica la señal dirigida a tu alcaldía.'
            : 'Review and edit the draft, download your PDF and —if you have an account— publish the señal addressed to your borough.',
        },
      ],
      faqTitle: es ? 'Preguntas frecuentes' : 'Frequently asked questions',
      faqs: es
        ? [
            {
              q: '¿Cuánto cuesta?',
              a: 'Nada. Redactar y descargar tu oficio en PDF es gratis para cualquier persona, incluso sin cuenta.',
            },
            {
              q: '¿Necesito una cuenta?',
              a: 'No para el PDF. Solo necesitas una cuenta si quieres además publicar la señal dirigida a tu alcaldía, que suma co-firmas de tus vecinos.',
            },
            {
              q: '¿Qué alcaldías puedo usar?',
              a: 'Por ahora Cuauhtémoc y Miguel Hidalgo, las dos alcaldías del piloto en la Ciudad de México.',
            },
            {
              q: '¿El oficio cita leyes?',
              a: 'No. Redactamos un oficio ciudadano formal basado únicamente en los hechos que tú aportas. No inventamos fundamentos legales ni nombres de funcionarios.',
            },
            {
              q: '¿Quién firma el oficio?',
              a: 'Tú. El oficio se firma con tu nombre (o como "Vecina/o de tu colonia" si prefieres). Crowd Conscious solo te ayuda a redactarlo.',
            },
          ]
        : [
            {
              q: 'How much does it cost?',
              a: 'Nothing. Drafting and downloading your oficio as a PDF is free for anyone, even without an account.',
            },
            {
              q: 'Do I need an account?',
              a: 'Not for the PDF. You only need an account if you also want to publish the señal addressed to your borough, which gathers co-signs from your neighbours.',
            },
            {
              q: 'Which boroughs can I use?',
              a: 'For now Cuauhtémoc and Miguel Hidalgo, the two pilot boroughs in Mexico City.',
            },
            {
              q: 'Does the oficio cite laws?',
              a: 'No. We draft a formal citizen oficio based solely on the facts you provide. We never invent legal grounds or officials\u2019 names.',
            },
            {
              q: 'Who signs the oficio?',
              a: 'You do. The oficio is signed with your name (or as "Neighbour of your area" if you prefer). Crowd Conscious only helps you draft it.',
            },
          ],
    },

    flow: {
      steps: {
        photo: es ? 'Foto' : 'Photo',
        location: es ? 'Ubicación' : 'Location',
        describe: es ? 'Describe' : 'Describe',
        review: es ? 'Revisar' : 'Review',
      },
      stepLabel: (n: number, total: number) =>
        es ? `Paso ${n} de ${total}` : `Step ${n} of ${total}`,
      next: es ? 'Siguiente' : 'Next',
      back: es ? 'Atrás' : 'Back',

      photo: {
        title: es ? 'Agrega una foto (opcional)' : 'Add a photo (optional)',
        help: es
          ? 'Una foto hace tu reporte más claro. Es opcional; puedes continuar sin ella.'
          : 'A photo makes your report clearer. It is optional; you can continue without one.',
        choose: es ? 'Elegir foto' : 'Choose photo',
        uploading: es ? 'Subiendo…' : 'Uploading…',
        uploaded: es ? 'Foto adjunta' : 'Photo attached',
        remove: es ? 'Quitar foto' : 'Remove photo',
        anonNote: es
          ? 'Adjuntar una foto requiere una cuenta. Puedes continuar sin foto y descargar tu PDF igual.'
          : 'Attaching a photo requires an account. You can continue without a photo and still download your PDF.',
        skip: es ? 'Continuar sin foto' : 'Continue without a photo',
      },

      location: {
        title: es ? '¿Dónde ocurre?' : 'Where is it?',
        alcaldiaLabel: es ? 'Alcaldía' : 'Borough',
        useLocation: es ? 'Usar mi ubicación' : 'Use my location',
        locating: es ? 'Ubicando…' : 'Locating…',
        detected: (name: string) =>
          es ? `Detectamos: ${name}` : `Detected: ${name}`,
        locationDenied: es
          ? 'No pudimos obtener tu ubicación. Elige la alcaldía manualmente.'
          : 'We could not get your location. Pick the borough manually.',
        coloniaLabel: es ? 'Colonia (opcional)' : 'Neighbourhood (optional)',
        coloniaPlaceholder: es ? 'Ej. Roma Norte' : 'E.g. Roma Norte',
        streetLabel: es ? 'Calle o referencia (opcional)' : 'Street or landmark (optional)',
        streetPlaceholder: es
          ? 'Ej. Av. Ámsterdam esquina Michoacán'
          : 'E.g. Av. Ámsterdam and Michoacán',
        alcaldiaRequired: es
          ? 'Selecciona una alcaldía para continuar.'
          : 'Select a borough to continue.',
      },

      describe: {
        title: es ? 'Describe el problema' : 'Describe the problem',
        sentenceLabel: es ? 'En una frase' : 'In one sentence',
        sentencePlaceholder: es
          ? 'Ej. Hay una coladera abierta en Av. Ámsterdam esquina Michoacán desde hace dos semanas.'
          : 'E.g. There is an open drain at Av. Ámsterdam and Michoacán that has been like this for two weeks.',
        sentenceHint: es ? 'Entre 15 y 400 caracteres.' : 'Between 15 and 400 characters.',
        categoryLabel: es ? 'Categoría' : 'Category',
        generate: es ? 'Generar borrador' : 'Generate draft',
        generating: es ? 'Redactando tu oficio…' : 'Drafting your oficio…',
        sentenceTooShort: es
          ? 'Escribe al menos 15 caracteres.'
          : 'Write at least 15 characters.',
        categoryRequired: es
          ? 'Elige una categoría.'
          : 'Choose a category.',
      },

      review: {
        title: es ? 'Revisa tu oficio' : 'Review your oficio',
        help: es
          ? 'Puedes editar cualquier parte antes de descargar. El oficio se firma con tu nombre.'
          : 'You can edit any part before downloading. The oficio is signed with your name.',
        destinatarioLabel: es ? 'Dirigido a' : 'Addressed to',
        senderLabel: es ? 'Tu nombre (para la firma)' : 'Your name (for the signature)',
        senderPlaceholder: es ? 'Nombre y apellido' : 'First and last name',
        senderHelp: es
          ? 'Si lo dejas vacío, el oficio se firma como "Vecina/o de tu colonia".'
          : 'If left empty, the oficio is signed as "Neighbour of your area".',
        asuntoLabel: es ? 'Asunto' : 'Subject',
        cuerpoLabel: es ? 'Cuerpo del oficio' : 'Body of the oficio',
        peticionLabel: es ? 'Petición' : 'Request',
        confirmLoggedIn: es
          ? 'Descargar PDF y publicar señal'
          : 'Download PDF and publish señal',
        confirmAnon: es ? 'Descargar PDF' : 'Download PDF',
        confirming: es ? 'Generando…' : 'Generating…',
      },

      done: {
        title: es ? '¡Listo!' : 'Done!',
        pdfReady: es
          ? 'Tu oficio en PDF se descargó. Vuelve a descargarlo cuando quieras:'
          : 'Your oficio PDF was downloaded. Download it again anytime:',
        downloadAgain: es ? 'Descargar PDF de nuevo' : 'Download PDF again',
        signalCreated: es
          ? 'Tu señal se publicó y está dirigida a tu alcaldía. Compártela para sumar co-firmas.'
          : 'Your señal was published and is addressed to your borough. Share it to gather co-signs.',
        viewSignal: es ? 'Ver mi señal' : 'View my señal',
        publishUnavailable: es
          ? 'La publicación de la señal no está disponible en este momento. Tu PDF sí se generó.'
          : 'Publishing the señal is unavailable right now. Your PDF was generated.',
        registerTitle: es
          ? 'Publica tu señal y suma vecinos'
          : 'Publish your señal and rally neighbours',
        registerBody: es
          ? 'Crea una cuenta gratis para publicar esta queja como señal dirigida a tu alcaldía y que tus vecinos la co-firmen.'
          : 'Create a free account to publish this complaint as a señal addressed to your borough and let your neighbours co-sign it.',
        registerCta: es ? 'Crear cuenta gratis' : 'Create a free account',
        shareTitle: es ? 'Comparte' : 'Share',
        shareWhatsApp: es ? 'Compartir por WhatsApp' : 'Share on WhatsApp',
        copyLink: es ? 'Copiar enlace' : 'Copy link',
        copied: es ? 'Enlace copiado' : 'Link copied',
        startAnother: es ? 'Crear otra queja' : 'Start another complaint',
      },

      errors: {
        draftFailed: es
          ? 'No pudimos generar el borrador. Intenta de nuevo en un momento.'
          : 'We could not generate the draft. Please try again shortly.',
        rateLimited: es
          ? 'Alcanzaste el límite de 3 borradores por día. Vuelve mañana.'
          : 'You reached the limit of 3 drafts per day. Come back tomorrow.',
        confirmFailed: es
          ? 'No pudimos generar el PDF. Intenta de nuevo.'
          : 'We could not generate the PDF. Please try again.',
        disabled: es
          ? 'Esta función no está disponible por ahora.'
          : 'This feature is not available right now.',
      },

      shareMessage: (url: string) =>
        es
          ? `Presenté una queja oficial a mi alcaldía con Crowd Conscious. Co-fírmala: ${url}`
          : `I filed an official complaint to my borough with Crowd Conscious. Co-sign it: ${url}`,
    },
  }
}

export type QuejaCopy = ReturnType<typeof getQuejaCopy>
