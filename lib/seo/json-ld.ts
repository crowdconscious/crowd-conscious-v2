import { SITE_URL } from '@/lib/seo/site'

const base = () => SITE_URL.replace(/\/$/, '')

/** Organization JSON-LD. Address + contact from public /privacy and /soporte only. */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  const b = base()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Crowd Conscious',
    url: b,
    logo: `${b}/images/logo-small.png`,
    description:
      'Consultas públicas con confianza ponderada — tu voto y tu certeza importan. El 20% de cada contrato de organizaciones va al Fondo Consciente.',
    sameAs: [
      'https://twitter.com/crowdconscious',
      'https://instagram.com/crowdconscious',
    ],
    foundingDate: '2025',
    foundingLocation: {
      '@type': 'Place',
      name: 'Mexico City, Mexico',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Hegel 406, Polanco',
      addressLocality: 'Ciudad de México',
      postalCode: '11560',
      addressCountry: 'MX',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'editorial and community',
        email: 'comunidad@crowdconscious.app',
        availableLanguage: ['Spanish', 'English'],
        url: `${b}/contact`,
      },
    ],
  }
}

/** WebSite JSON-LD — no SearchAction (no public search URL exists). */
export function buildWebSiteJsonLd(): Record<string, unknown> {
  const b = base()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Crowd Conscious',
    url: b,
    inLanguage: ['es-MX', 'en'],
    publisher: {
      '@type': 'Organization',
      name: 'Crowd Conscious',
      url: b,
    },
  }
}
