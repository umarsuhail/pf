import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PageLoader from "./components/PageLoader";
<<<<<<< HEAD
import AppChrome from "./components/AppChrome";
=======
import HoloChat from "./components/HoloChat";
import CockpitTray from "./components/CockpitTray";
import AutopilotStartToast from "./components/AutopilotStartToast";
>>>>>>> 8a13a2e (ccc)

const grenze = localFont({
  src: [
    {
      path: "../public/Grenze-VariableFont_wght.ttf",
      style: "normal",
      weight: "100 900",
    },
  ],
  variable: "--font-grenze",
  display: "swap",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

// Decorative display face for the flight's time-of-day greeting.
const twinkleStar = localFont({
  src: "../public/TwinkleStar-Regular.ttf",
  variable: "--font-twinkle-star",
  display: "swap",
  fallback: ["cursive"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://umar.website"),
  title: {
    default: "Umar Suhail | Next.js & Frontend Developer in Abu Dhabi",
    template: "%s | Umar Suhail",
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
  alternates: {
    canonical: "https://umar.website",
  },
  openGraph: {
    title: "Umar Suhail | Next.js & Frontend Developer in Abu Dhabi",
    description:
      "Umar Suhail is a Lead Frontend Engineer and Application Developer in Abu Dhabi, UAE, with 7+ years building React, Next.js, TypeScript, and UI/UX-focused applications.",
    url: "https://umar.website",
    siteName: "Umar Suhail Portfolio",
    locale: "en_US",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "Umar Suhail | Next.js & Frontend Developer in Abu Dhabi",
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
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
<<<<<<< HEAD
      <body className={`${grenze.variable} ${twinkleStar.variable} relative min-h-dvh antialiased`}>
        <PageLoader />
        <AppChrome>{children}</AppChrome>
=======
      <body className={`${urbanist.variable} relative min-h-screen antialiased`}>
        <PageLoader />
        <CockpitTray />
        <AutopilotStartToast />
        <RouteMap />
        <main className="relative z-10">{children}</main>
        <HoloChat />
>>>>>>> 8a13a2e (ccc)
      </body>
    </html>
  );
}