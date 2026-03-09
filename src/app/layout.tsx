import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

export const metadata: Metadata = {
  title: 'Crowd Conscious - Where Predictions Meet Purpose',
  description:
    'Free-to-play prediction platform where your opinion drives real community impact. Predict on sustainability, policy, sports & more — brand sponsors fund the Conscious Fund.',
  openGraph: {
    title: 'Crowd Conscious - Where Predictions Meet Purpose',
    description:
      'Free-to-play prediction platform where your opinion drives real community impact. Predict on sustainability, policy, sports & more.',
    url: BASE_URL,
    siteName: 'Crowd Conscious',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crowd Conscious - Where Predictions Meet Purpose',
    description:
      'Free-to-play prediction platform where your opinion drives real community impact.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
