import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Saira_Condensed,
  Saira_Stencil,
} from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";
import PageLoader from "./components/PageLoader";
import ChromeBeforeMain from "./components/ChromeBeforeMain";
import ChromeAfterMain from "./components/ChromeAfterMain";
import { MISSION_THEME_INIT_SCRIPT } from "./lib/mission-theme";
import { SpeedInsights } from "@vercel/speed-insights/next"

const marvel = localFont({
  src: [
    { path: "../public/fonts/Marvel-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Marvel-Italic.ttf", weight: "400", style: "italic" },
    { path: "../public/fonts/Marvel-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Marvel-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-marvel",
  display: "swap",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

const signLeckerli = localFont({
  src: "../public/fonts/signs/LeckerliOne-Regular.ttf",
  variable: "--font-sign-leckerli",
  display: "block",
  fallback: ["cursive"],
});
const signPacifico = localFont({
  src: "../public/fonts/signs/Pacifico-Regular.ttf",
  variable: "--font-sign-pacifico",
  display: "block",
  fallback: ["cursive"],
});
const signSendFlowers = localFont({
  src: "../public/fonts/signs/SendFlowers-Regular.ttf",
  variable: "--font-sign-sendflowers",
  display: "block",
  fallback: ["cursive"],
});
const signStyleScript = localFont({
  src: "../public/fonts/signs/StyleScript-Regular.ttf",
  variable: "--font-sign-stylescript",
  display: "block",
  fallback: ["cursive"],
});
const passion = localFont({
  src: "../public/fonts/signs/PassionsConflict-Regular.ttf",
  variable: "--font-sign-passion",
  display: "block",
  fallback: ["cursive"],
});
const signatureFontVars = [
  signLeckerli.variable,
  signPacifico.variable,
  signSendFlowers.variable,
  signStyleScript.variable,
  passion.variable,
].join(" ");

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-saira-condensed",
  display: "swap",
});
const sairaStencil = Saira_Stencil({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-saira-stencil",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://umar.website"),
  title: {
    default: "LOST IN SPACE | Umar Suhail",
    template: "%s | LOST IN SPACE",
  },
  description:
    "Umar Suhail is a Lead Frontend Engineer and Application Developer in Abu Dhabi, UAE, with 7+ years building React, Next.js, TypeScript, and UI/UX-focused applications.",
  keywords: [
    "Umar Suhail",
    "Umar Suhail Abu Dhabi",
    "Frontend Engineer Abu Dhabi",
    "Next.js Developer UAE",
    "React Developer Abu Dhabi",
    "umar.website",
  ],
  authors: [{ name: "Umar Suhail", url: "https://umar.website" }],
  creator: "Umar Suhail",
  applicationName: "LOST IN SPACE",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LOST IN SPACE",
  },
  icons: {
    icon: [
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  alternates: {
    canonical: "https://umar.website",
  },
  openGraph: {
    title: "LOST IN SPACE | Umar Suhail",
    description:
      "Umar Suhail is a Lead Frontend Engineer and Application Developer in Abu Dhabi, UAE, with 7+ years building React, Next.js, TypeScript, and UI/UX-focused applications.",
    url: "https://umar.website",
    siteName: "LOST IN SPACE",
    locale: "en_US",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "LOST IN SPACE | Umar Suhail",
    description:
      "Lead Frontend Engineer and Application Developer based in Abu Dhabi, UAE.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Umar Suhail",
  url: "https://umar.website",
  sameAs: [
    "https://www.instagram.com/umar_suhail_/",
  ],
  jobTitle: "Lead Frontend Engineer",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Abu Dhabi",
    addressCountry: "UAE",
  },
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "Frontend Engineering",
    "UI/UX Design",
    "Web Development",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-mission-theme="flight" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: MISSION_THEME_INIT_SCRIPT,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${marvel.variable} ${plexSans.variable} ${plexMono.variable} ${sairaCondensed.variable} ${sairaStencil.variable} ${signatureFontVars} relative min-h-screen antialiased`}
      >
        <SerwistProvider swUrl="/serwist/sw.js">
          <PageLoader />
          <ChromeBeforeMain />
          <main className="relative z-10">{children}</main>
          <ChromeAfterMain />
          <SpeedInsights />
        </SerwistProvider>
      </body>
    </html>
  );
}
