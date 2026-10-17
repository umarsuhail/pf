"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import Snap from "lenis/snap";
import "lenis/dist/lenis.css";
import { isCoarsePointer } from "./pointer";

// The app's scrolling, in one place: a smoothed wheel and a set of landings.
//
// Lenis animates the *real* scroll position rather than transforming a
// content wrapper, which is the only reason it can be used here at all: the
// flight is a 3330svh track with one `position: sticky` child carrying the
// corridor's perspective, and anything that puts a transform on an ancestor
// of that child would become the containing block for it and for every fixed
// overlay. GSAP's ScrollSmoother works that way and was ruled out for it.
// Because the document really scrolls, useScroll, the route map and browser
// accessibility all keep reading the truth.
//
// It is mounted once for the whole app rather than by the flight, so the
// detail routes get the same scrolling as `/`. The landings are the flight's
// alone — see setFlightSnapPoints — and a route with none simply does not
// snap.

// --- Touch ---------------------------------------------------------------
//
// `syncTouch` stays off. Native touch momentum is handled on the compositor
// at the device's own refresh rate, and routing it through a main-thread lerp
// makes it worse, not smoother — which is why Lenis and ScrollSmoother both
// ship with touch smoothing disabled by default.
//
// The instance still runs on phones, which it did not used to, and the reason
// is the snapping. Lenis emits `virtual-scroll` at the top of its handler,
// before the syncTouch branch decides whether to animate anything; that
// branch only hands scrolling back to the browser. So with syncTouch off a
// finger keeps real native momentum *and* the snap plugin still hears the
// gesture. That combination is the whole point: CSS scroll-snap could only
// land a gesture by catching it mid-fling, which is what made the old
// snapping feel like a fight.
const SYNC_TOUCH = false;

// Proximity, not mandatory: a landing only claims you if you stop within
// `distanceThreshold` of it, so parking mid-layover to read is still allowed.
// The debounce is what keeps it civil — nothing moves until the gesture has
// been over for this long, so a snap is never something you scroll against.
const SNAP_OPTIONS = {
  type: "proximity",
  distanceThreshold: "45%",
  debounce: 480,
  duration: 0.7,
} as const;

let instance: Lenis | null = null;
let snap: Snap | null = null;
let clearSnaps: (() => void)[] = [];

export function isSmoothScrollActive() {
  return instance !== null;
}

// The one way anything writes a scroll position.
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

// The flight hands over its landings as absolute scroll positions, because
// that is what the plugin takes and because the flight is the only thing that
// knows where its own stops are in pixels — the mapping runs through
// scrollFromProgress and the track's measured height. Called again on resize,
// and with an empty list on unmount, which is what stops a detail route from
// inheriting the flight's stops.
export function setFlightSnapPoints(positions: number[]) {
  clearSnaps.forEach((remove) => remove());
  clearSnaps = [];
  if (!snap) return;
  positions.forEach((position) => {
    clearSnaps.push(snap!.add(Math.round(position)));
  });
}

// Two things drive the scroll position themselves and must not have a
// landing pulling at them: the autopilot tour, and a hand on the dial. This
// is the same suspension the old CSS scroll-snap needed, for the same reason.
function bindSnapSuspension() {
  let autopilotRunning = false;
  let dialTurning = false;

  const apply = () => {
    if (!snap) return;
    if (autopilotRunning || dialTurning) snap.stop();
    else snap.start();
  };

  const onAutopilot = (event: Event) => {
    autopilotRunning = Boolean(
      (event as CustomEvent<{ running?: boolean }>).detail?.running,
    );
    apply();
  };
  const onDial = (event: Event) => {
    dialTurning = Boolean(
      (event as CustomEvent<{ turning?: boolean }>).detail?.turning,
    );
    apply();
  };

  window.addEventListener("flight-autopilot-state", onAutopilot as EventListener);
  window.addEventListener("flight-dial-turn", onDial as EventListener);
  return () => {
    window.removeEventListener(
      "flight-autopilot-state",
      onAutopilot as EventListener,
    );
    window.removeEventListener("flight-dial-turn", onDial as EventListener);
  };
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// True when Lenis is actually lerping the scroll position, rather than merely
// observing it. On touch it is only observing (see SYNC_TOUCH), so the camera
// still needs its own follow there — MultiverseFlight picks its spring off
// this.
export function isWheelSmoothed() {
  return !isCoarsePointer() && !prefersReducedMotion();
}

export function useSmoothScroll() {
  useEffect(() => {
    // Lenis only forces `immediate` on *programmatic* scrolls under reduced
    // motion — wheel smoothing and snapping would both keep running. Someone
    // who asked the OS for less movement did not ask for a gentler version
    // of it, so nothing is constructed at all.
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      syncTouch: SYNC_TOUCH,
      // Short. The camera behind this is still a spring, and the flight is
      // read at a standstill as often as it is travelled — a long ease makes
      // stopping to read a card feel like it keeps going without you.
      lerp: 0.12,
    });
    instance = lenis;
    snap = new Snap(lenis, SNAP_OPTIONS);
    const unbind = bindSnapSuspension();

    // `scroll-behavior: smooth` on the root animates scrolls the browser
    // performs itself, which while Lenis owns the position is a second
    // animation pulling at the first.
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    return () => {
      unbind();
      clearSnaps = [];
      snap?.destroy();
      snap = null;
      instance = null;
      lenis.destroy();
      root.style.scrollBehavior = previousBehavior;
    };
  }, []);
}
