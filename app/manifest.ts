import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Umar Suhail | Frontend Engineer",
    short_name: "Umar Suhail",
    description:
      "Umar Suhail is a Lead Frontend Engineer and Application Developer in Abu Dhabi, UAE, building React, Next.js, TypeScript, and UI/UX-focused applications.",
    start_url: "/",
    display: "standalone",
    background_color: "#05263f",
    theme_color: "#05263f",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
