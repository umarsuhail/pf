"use client";

import dynamic from "next/dynamic";

// layout.tsx is a Server Component, so it can't pass `ssr: false` to
// next/dynamic directly (Next only allows that from inside a Client
// Component) — these four were being statically imported there instead,
// which meant their JS shipped in the same eagerly-hydrated bundle as
// everything else, on every route, whether or not the visitor ever opens
// the cockpit tray or the journey rail. None of the four render anything a
// crawler or an SSR'd first paint benefits from (pure client chrome, no
// content), and all four lean on browser-only APIs (audio elements, window
// scroll, pointer/keyboard listeners) that have nothing useful to do during
// SSR anyway. Wrapping them here — a real Client Component — lets
// `ssr: false` take effect, so they load and hydrate off the critical path
// instead of competing with the page's actual content for the main thread
// right after load.
// The app's scrolling: a smoothed wheel and the flight's landings. Loaded
// client-only and off the critical path like the rest of this file, so Lenis
// and its stylesheet are not in the bundle that has to hydrate first.
const SmoothScroll = dynamic(() => import("./SmoothScroll"), { ssr: false });
const ScrollSound = dynamic(() => import("./ScrollSound"), { ssr: false });
const CockpitTray = dynamic(() => import("./CockpitTray"), { ssr: false });
const AutopilotStartToast = dynamic(() => import("./AutopilotStartToast"), {
  ssr: false,
});
// The bezel dial, which is the journey navigator now. It replaces the
// right-edge rail (RouteMap) rather than sitting beside it: the two were two
// readouts of one scroll position competing for the same edge, and the rail
// was the one you could not also travel with. RouteMap.tsx is left on disk but
// no longer mounted.
//
// It had never actually reached the page — the only file rendering it was
// AppChrome.tsx, which nothing imports.
const ScrollDial = dynamic(() => import("./ScrollDial"), { ssr: false });
// The intro leg's way out — see SkipIntroPrompt. Only ever renders while
// autopilot is holding on the narrated first card.
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
