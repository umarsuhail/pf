"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

// Smoothed wheel travel, for first gear only.
//
// Lenis animates the *real* scroll position rather than transforming a
// content wrapper, which is the only reason it can be used here at all: the
// flight is a 3330svh track with one `position: sticky` child carrying the
// corridor's perspective, and anything that puts a transform on an ancestor
// of that child would become the containing block for it and for every fixed
// overlay. GSAP's ScrollSmoother works that way and was ruled out for it.
// Because the document really scrolls, useScroll, the snap markers, the
// route map and browser accessibility all keep reading the truth.
//
// Why first gear only: Lenis has no support for CSS scroll-snap. Second and
// third gear *are* scroll-snap — the landings are markers down the track —
// so Lenis is torn down whenever the gearbox leaves first, and native
// snapping takes the wheel back untouched.
//
// Why never on touch: `syncTouch` is off (its default, and left that way on
// purpose). Native touch momentum is handled on the compositor at the
// device's own refresh rate, and routing it through a main-thread lerp makes
// it worse, not smoother — which is why Lenis and ScrollSmoother both ship
// with touch smoothing disabled. Running the instance anyway would cost a
// per-frame callback on a phone in exchange for nothing, so it is not even
// constructed there.

let instance: Lenis | null = null;

export function isSmoothScrollActive() {
  return instance !== null;
}

// The one way anything in the flight writes a scroll position.
//
// While Lenis owns the scroll, a bare window.scrollTo sets a position Lenis
// has not agreed to and gets overwritten on its next frame — the write
// appears to land and then slides back. Routing every write through here
// means callers never have to know which mode they are in.
//
// `animated` is the nav's long flight to a section. Everything else — the
// autopilot's per-frame clock, the loop's reset to the origin, the dial —
// wants the position *now*, and passes nothing.
export function flightScrollTo(top: number, animated = false) {
  if (instance) {
    // `force` so a stopped instance still honours it; the autopilot and the
    // loop both write while the flight is not taking wheel input.
    instance.scrollTo(top, { immediate: !animated, force: true });
    return;
  }
  window.scrollTo({ top, behavior: animated ? "smooth" : "instant" });
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    // Lenis only forces `immediate` on *programmatic* scrolls under reduced
    // motion — wheel smoothing keeps running. Someone who asked the OS for
    // less movement did not ask for a gentler version of it, so the whole
    // instance stays down.
    if (!enabled || prefersReducedMotion()) return;

    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      // Explicit rather than inherited: this is the decision the comment at
      // the top of this file is about, and it should be visible here.
      syncTouch: false,
      // Short. The camera behind this is still a spring, and the flight is
      // read at a standstill as often as it is travelled — a long ease makes
      // stopping to read a card feel like it keeps going without you.
      lerp: 0.12,
    });
    instance = lenis;

    // `scroll-behavior: smooth` on the root animates scrolls the browser
    // performs itself, which while Lenis owns the position is a second
    // animation pulling at the first.
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    return () => {
      instance = null;
      lenis.destroy();
      root.style.scrollBehavior = previousBehavior;
    };
  }, [enabled]);
}
