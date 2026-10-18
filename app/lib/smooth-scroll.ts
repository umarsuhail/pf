"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import Snap from "lenis/snap";
import "lenis/dist/lenis.css";
import { isCoarsePointer } from "./pointer";

const SYNC_TOUCH = false;

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

export function flightScrollTo(top: number, animated = false) {
  if (instance) {
    instance.scrollTo(top, { immediate: !animated, force: true });
    return;
  }
  window.scrollTo({ top, behavior: animated ? "smooth" : "instant" });
}

export function setFlightSnapPoints(positions: number[]) {
  clearSnaps.forEach((remove) => remove());
  clearSnaps = [];
  if (!snap) return;
  positions.forEach((position) => {
    clearSnaps.push(snap!.add(Math.round(position)));
  });
}

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

export function isWheelSmoothed() {
  return !isCoarsePointer() && !prefersReducedMotion();
}

export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      syncTouch: SYNC_TOUCH,
      // Duration + easing rather than a lerp. A lerp of 0.12 was marginally
      // tighter than Lenis's own default, which is to say it glided less than
      // the library does out of the box — the wheel still arrived in steps,
      // just slightly rounded ones. This is the exponential ease-out the
      // library is known for: one notch coasts and settles instead of landing.
      duration: 1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    instance = lenis;
    snap = new Snap(lenis, SNAP_OPTIONS);
    const unbind = bindSnapSuspension();

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
