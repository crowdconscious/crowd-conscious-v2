import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../src/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crowd Conscious - Communities Creating Impact",
  description: "A community-driven platform where local groups organize around environmental and social impact, funded through brand sponsorships with transparent governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
