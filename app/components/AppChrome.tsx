"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

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
