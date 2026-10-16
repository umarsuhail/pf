"use client";

import { useEffect, useState } from "react";

// A finger, not a wheel.
//
// Two things in the flight want this answer and they have to agree: the
// gearbox, which starts a touch visitor in free travel because snap landings
// catch a flick (see travel-gear.ts), and the camera spring, which is
// tightened on touch because a thumb is in contact with the thing it is
// moving and any follow reads as lag.
//
// `(pointer: coarse)` asks about the *primary* input, which is the right
// question: a laptop with a touchscreen still reports `fine`, and it should,
// because its owner is scrolling with a trackpad.
export const COARSE_POINTER_QUERY = "(pointer: coarse)";

export function isCoarsePointer() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

// Starts false so the server render and the first client render agree, then
// settles in the effect. Nothing here is load-bearing for a first paint — it
// only tunes how the camera follows — so one render at the desktop default
// costs nothing even on a phone.
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(COARSE_POINTER_QUERY);
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return coarse;
}
