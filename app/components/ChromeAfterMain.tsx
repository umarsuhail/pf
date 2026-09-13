"use client";

import dynamic from "next/dynamic";

// See ChromeBeforeMain for why this is split out into its own Client
// Component: layout.tsx (a Server Component) can't pass `ssr: false` to
// next/dynamic itself. HoloChat starts closed and has no SSR-relevant
// content, so there's nothing gained by shipping and hydrating its JS
// eagerly on every route.
const HoloChat = dynamic(() => import("./HoloChat"), { ssr: false });

export default function ChromeAfterMain() {
  return <HoloChat />;
}
