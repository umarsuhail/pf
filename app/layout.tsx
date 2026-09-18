import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";
import PageLoader from "./components/PageLoader";
import ChromeBeforeMain from "./components/ChromeBeforeMain";
import ChromeAfterMain from "./components/ChromeAfterMain";

// Body family, replacing the deleted Grenze variable font.
//
// All four files are declared as one family rather than as four separate
// fonts. That is what makes `<em>` and `<strong>` (and font-semibold, etc.)
// pick up Marvel's own italic and bold drawings — declare only Regular and
// the browser fakes them instead, shearing the roman for italics and
// smearing it for bold, which on a condensed face like this looks visibly
// wrong. Marvel ships no intermediate weights, so 600/semibold resolves to
// the 700 file: the site's `font-semibold` classes still get a real bold.
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

// Faces the signature and the greeting cycle through, in public/fonts/signs.
// All script/handwriting faces — a signature should read as handwriting, and
// an earlier set mixed serifs and geometric sans, so the swaps looked like a
// font-picker demo rather than one name written several ways.
//
// `display: "block"` rather than "swap": these only ever render inside the
// signature, and a fallback swapping in mid-cycle would read as a glitch.
// Note these are NOT subset — next/font/local serves the file as-is, so the
// weight of each file is the weight shipped. That is why ZhiMangXing is not
// among them: it is a CJK face carrying thousands of glyphs (~3.9MB, more
// than these four combined) to render eleven Latin characters.
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Umar Suhail",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05263f",
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
      <body
        className={`${marvel.variable} ${signatureFontVars} relative min-h-screen antialiased`}
      >
        <SerwistProvider swUrl="/serwist/sw.js">
          <PageLoader />
          <ChromeBeforeMain />
          <main className="relative z-10">{children}</main>
          <ChromeAfterMain />
        </SerwistProvider>
      </body>
    </html>
  );
}