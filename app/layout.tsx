import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../src/app/globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SITE_URL } from "@/lib/seo/site";
import { ConversionCelebration } from "@/components/anon/ConversionCelebration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Crowd Conscious",
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo-small.png`,
  description:
    "Consultas públicas con confianza ponderada — tu voto y tu certeza importan. Las marcas patrocinan el impacto.",
  sameAs: [
    "https://twitter.com/crowdconscious",
    "https://instagram.com/crowdconscious",
  ],
  foundingDate: "2025",
  foundingLocation: {
    "@type": "Place",
    name: "Mexico City, Mexico",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Crowd Conscious — Consultas con confianza ponderada",
    template: "%s | Crowd Conscious",
  },
  description:
    "Vota en consultas públicas sobre tu ciudad y lo que te importa. Tu certeza pondera el resultado. Las marcas patrocinan el impacto.",
  keywords: [
    "consultas públicas",
    "conscious pulse",
    "confianza ponderada",
    "weighted confidence",
    "inteligencia colectiva",
    "collective intelligence",
    "prioridades ciudadanas",
    "civic priorities",
    "impacto social",
    "crowd conscious",
    "fondo consciente",
    "consulta ciudadana",
    "voto ponderado",
    "ciudad de méxico",
  ],
  authors: [{ name: "Crowd Conscious" }],
  creator: "Crowd Conscious",
  publisher: "Crowd Conscious",
  formatDetection: { email: false, address: false, telephone: false },

  openGraph: {
    type: "website",
    locale: "es_MX",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: "Crowd Conscious",
    title: "Crowd Conscious — Consultas con confianza ponderada",
    description:
      "Vota en consultas públicas sobre tu ciudad y lo que te importa. Tu certeza pondera el resultado.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Crowd Conscious — Consultas con confianza ponderada",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Crowd Conscious — Consultas con confianza ponderada",
    description:
      "Vota en consultas públicas. Tu certeza pondera el resultado. Las marcas patrocinan el impacto.",
    images: ["/opengraph-image"],
    creator: "@crowdconscious",
    site: "@crowdconscious",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/images/favicon-512.png",
    apple: "/images/apple-touch-icon.png",
  },

  manifest: "/manifest.json",

  alternates: {
    canonical: SITE_URL,
    languages: {
      "es-MX": SITE_URL,
      "en-US": SITE_URL,
    },
  },

  verification: {},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Force light mode immediately
                  document.documentElement.classList.remove('dark');
                  document.documentElement.removeAttribute('data-theme');
                  document.documentElement.style.colorScheme = 'light';
                  
                  // Set CSS variables for light mode
                  const root = document.documentElement;
                  root.style.setProperty('--background', '#ffffff');
                  root.style.setProperty('--foreground', '#090909');
                  root.style.setProperty('--input-background', '#ffffff');
                  root.style.setProperty('--input-foreground', '#020101');
                  root.style.setProperty('--input-border', '#d1d5db');
                  root.style.setProperty('--muted', '#374151');
                  root.style.setProperty('--muted-foreground', '#1f2937');
                  
                  // Only apply dark mode if explicitly set
                  const savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'dark') {
                    root.classList.add('dark');
                    root.setAttribute('data-theme', 'dark');
                    root.style.colorScheme = 'dark';
                  }
                  
                  console.log('Theme initialized:', savedTheme || 'light');
                } catch (e) {
                  console.error('Theme init error:', e);
                }
              })();
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-slate-900`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <LanguageProvider>
          {children}
          <ConversionCelebration />
          <Analytics />
          <SpeedInsights />
        </LanguageProvider>
      </body>
    </html>
  );
}
