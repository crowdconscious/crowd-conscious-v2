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
    "Free-to-play prediction markets platform where your opinion drives real community impact.",
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
    default:
      "Crowd Conscious — Predicciones Gratis que Financian Causas Reales",
    template: "%s | Crowd Conscious",
  },
  description:
    "Plataforma de predicciones gratuita donde tu voto genera impacto comunitario real. Vota sobre deportes, política y más — marcas patrocinan el Fondo Consciente. Mundial 2026.",
  keywords: [
    "predicciones gratis",
    "mercado de predicciones",
    "prediction market",
    "mundial 2026",
    "world cup 2026",
    "inteligencia colectiva",
    "collective intelligence",
    "cause marketing",
    "impacto social",
    "predicciones deportivas",
    "crowd conscious",
    "fondo consciente",
    "free prediction platform",
    "predicciones mundial mexico",
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
    title:
      "Crowd Conscious — Predicciones Gratis que Financian Causas Reales",
    description:
      "Plataforma de predicciones gratuita donde tu voto genera impacto comunitario real. Vota sobre deportes, política y más.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Crowd Conscious — Predicciones con Propósito",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Crowd Conscious — Predicciones Gratis con Impacto Real",
    description:
      "Vota sobre deportes, política y más. Marcas patrocinan el Fondo Consciente. 100% gratis.",
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
