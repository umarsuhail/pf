"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// None of this is core page content — it's interactive/decorative chrome
// (nav console, chat widget, journey rail, scroll dial, ambient audio) that
// sits on top of every route. Loading it statically from the root layout
// meant even a bare /[section] detail page — the kind a search engine or a
// shared link lands on directly — had to download and parse all of it
// before it could hydrate. Splitting each into its own client-only chunk
// means that cost is paid only once the browser is actually idle enough to
// fetch it, not before.
const CockpitTray = dynamic(() => import("./CockpitTray"), { ssr: false });
const HoloChat = dynamic(() => import("./HoloChat"), { ssr: false });
const ScrollSound = dynamic(() => import("./ScrollSound"), { ssr: false });
const AutopilotStartToast = dynamic(() => import("./AutopilotStartToast"), {
  ssr: false,
});
const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });
const ScrollDial = dynamic(() => import("./ScrollDial"), { ssr: false });

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <ScrollSound />
      <CockpitTray />
      <AutopilotStartToast />
      <RouteMap />
      <ScrollDial />
      <main className="relative z-10">{children}</main>
      <HoloChat />
    </>
  );
}
