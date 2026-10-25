"use client";

import { useSyncExternalStore } from "react";

// Which instrument the traveller navigates with.
//
// Two presentations of one machine: both read the same progress, both write
// the same `navigate-flight-progress` event, and the flight below them does
// not know or care which is on screen. The bezel is the original — a watch
// crown you turn. The lemniscate is a track you drag a handle along, with
// every panel marked on it, so the whole route is legible at once where the
// bezel only ever shows you where you are.
//
// There is deliberately no "hidden". The collapse button used to remove the
// navigator entirely, which left the flight with no visible way to move
// through it; swapping between two is a better use of the same press.

export type NavigatorUi = "dial" | "infinity" | "cylinder";

const COOKIE = "pf_navigator_ui";
const PINNED_COOKIE = "pf_navigator_open";
const HINTED_COOKIE = "pf_navigator_hinted";
const YEAR_SECONDS = 60 * 60 * 24 * 365;
const CHANGE_EVENT = "flight-navigator-ui";

export const NAVIGATOR_UI_IDS: NavigatorUi[] = ["dial", "infinity", "cylinder"];

function isNavigatorUi(value: unknown): value is NavigatorUi {
  return NAVIGATOR_UI_IDS.includes(value as NavigatorUi);
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${value}; path=/; max-age=${YEAR_SECONDS}; SameSite=Lax`;
  } catch {
    /* blocked by policy — the choice still holds for this visit */
  }
}

export function getNavigatorUi(): NavigatorUi {
  const stored = readCookie(COOKIE);
  return isNavigatorUi(stored) ? stored : "dial";
}

export function setNavigatorUi(ui: NavigatorUi) {
  writeCookie(COOKIE, ui);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** One press walks the ring: bezel, lemniscate, drum, bezel again. */
export function toggleNavigatorUi() {
  const current = NAVIGATOR_UI_IDS.indexOf(getNavigatorUi());
  const next = NAVIGATOR_UI_IDS[(current + 1) % NAVIGATOR_UI_IDS.length];
  setNavigatorUi(next);
  return next;
}

// How much room the instrument is allowed to take.
//
// All three sit small — a tenth of the corner they used to own — and grow
// when a hand comes near. Pinning is the way to keep one open while reading
// a panel, and it is deliberately a control of its own rather than a click
// on the instrument: all three are drag surfaces, so a click that also
// pinned would fight the gesture that turns them.

export function isNavigatorPinned() {
  return readCookie(PINNED_COOKIE) === "1";
}

export function setNavigatorPinned(pinned: boolean) {
  writeCookie(PINNED_COOKIE, pinned ? "1" : "0");
  if (pinned) writeCookie(HINTED_COOKIE, "1");
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Whether the "this opens" hint has done its job.
 *
 * Set the first time someone pins the navigator open, and never unset: the
 * hint teaches one thing once, and a tooltip that keeps explaining a control
 * you already use is noise.
 */
export function hasSeenNavigatorHint() {
  return readCookie(HINTED_COOKIE) === "1";
}

export function markNavigatorHinted() {
  writeCookie(HINTED_COOKIE, "1");
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

// The server always answers "dial", which is the default, so the first paint
// is never wrong in a way that matters — at worst the bezel appears for a
// frame before the lemniscate replaces it.
export function useNavigatorUi(): NavigatorUi {
  return useSyncExternalStore(subscribe, getNavigatorUi, () => "dial");
}

export function useNavigatorPinned() {
  return useSyncExternalStore(subscribe, isNavigatorPinned, () => false);
}

export function useNavigatorHinted() {
  return useSyncExternalStore(subscribe, hasSeenNavigatorHint, () => true);
}
