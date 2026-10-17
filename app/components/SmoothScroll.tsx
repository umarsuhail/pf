"use client";

import { useSmoothScroll } from "../lib/smooth-scroll";

// Mount point for the app's scrolling. Renders nothing — all of it is the
// Lenis instance and the snap plugin, which live in lib/smooth-scroll.ts.
//
// It sits in ChromeBeforeMain rather than in the flight, so every route gets
// the same scrolling. The flight's landings are handed over separately (see
// setFlightSnapPoints); a route that hands over none does not snap.
export default function SmoothScroll() {
  useSmoothScroll();
  return null;
}
