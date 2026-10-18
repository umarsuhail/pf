"use client";

import dynamic from "next/dynamic";

const SmoothScroll = dynamic(() => import("./SmoothScroll"), { ssr: false });
const ScrollSound = dynamic(() => import("./ScrollSound"), { ssr: false });
const CockpitTray = dynamic(() => import("./CockpitTray"), { ssr: false });
const AutopilotStartToast = dynamic(() => import("./AutopilotStartToast"), {
  ssr: false,
});
const ScrollDial = dynamic(() => import("./ScrollDial"), { ssr: false });
const SkipIntroPrompt = dynamic(() => import("./SkipIntroPrompt"), { ssr: false });

export default function ChromeBeforeMain() {
  return (
    <>
      <SmoothScroll />
      <ScrollSound />
      <CockpitTray />
      <AutopilotStartToast />
      <SkipIntroPrompt />
      <ScrollDial />
    </>
  );
}
