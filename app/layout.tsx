import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import RouteMap from "./components/RouteMap";
import PageLoader from "./components/PageLoader";

const urbanist = localFont({
  src: [
    {
      path: "../public/urbanist-var.ttf",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../public/urbanist-italic.ttf",
      style: "italic",
      weight: "100 900",
    },
  ],
  variable: "--font-urbanist",
  display: "swap",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Umar Suhail — Frontend Developer",
  description:
    "Portfolio of Umar Suhail, a frontend developer building fast, accessible interfaces with React, Next.js, TypeScript, and creative WebGL experiences.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${urbanist.variable} relative min-h-screen antialiased`}>
        <PageLoader />
        <RouteMap />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
