"use client";

import dynamic from "next/dynamic";

import { useNavigatorUi } from "../lib/navigator-ui";

const SmoothScroll = dynamic(() => import("./SmoothScroll"), { ssr: false });
const ScrollSound = dynamic(() => import("./ScrollSound"), { ssr: false });
const CockpitTray = dynamic(() => import("./CockpitTray"), { ssr: false });
const AutopilotStartToast = dynamic(() => import("./AutopilotStartToast"), {
  ssr: false,
});
const ScrollDial = dynamic(() => import("./ScrollDial"), { ssr: false });
const InfinityNavigator = dynamic(() => import("./InfinityNavigator"), {
  ssr: false,
});
const SkipIntroPrompt = dynamic(() => import("./SkipIntroPrompt"), { ssr: false });

export default function ChromeBeforeMain() {
  // One navigator at a time. Both write the same navigate-flight-progress
  // event, so the flight never learns which is mounted — and only one is, so
  // the gradient ids they share inside the transport button cannot collide.
  const navigatorUi = useNavigatorUi();

  return (
    <>
      <SmoothScroll />
      <ScrollSound />
      <CockpitTray />
      <AutopilotStartToast />
      <SkipIntroPrompt />
      {navigatorUi === "infinity" ? <InfinityNavigator /> : <ScrollDial />}
    </>
  );
}
