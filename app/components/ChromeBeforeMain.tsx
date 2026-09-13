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
const ScrollSound = dynamic(() => import("./ScrollSound"), { ssr: false });
const CockpitTray = dynamic(() => import("./CockpitTray"), { ssr: false });
const AutopilotStartToast = dynamic(() => import("./AutopilotStartToast"), {
  ssr: false,
});
const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

export default function ChromeBeforeMain() {
  return (
    <>
      <ScrollSound />
      <CockpitTray />
      <AutopilotStartToast />
      <RouteMap />
    </>
  );
}
