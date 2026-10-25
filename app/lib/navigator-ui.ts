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

export type NavigatorUi = "dial" | "infinity";

const COOKIE = "pf_navigator_ui";
const YEAR_SECONDS = 60 * 60 * 24 * 365;
const CHANGE_EVENT = "flight-navigator-ui";

export const NAVIGATOR_UI_IDS: NavigatorUi[] = ["dial", "infinity"];

function isNavigatorUi(value: unknown): value is NavigatorUi {
  return value === "dial" || value === "infinity";
}

export function getNavigatorUi(): NavigatorUi {
  if (typeof document === "undefined") return "dial";
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`),
    );
    const stored = match ? decodeURIComponent(match[1]) : null;
    return isNavigatorUi(stored) ? stored : "dial";
  } catch {
    return "dial";
  }
}

export function setNavigatorUi(ui: NavigatorUi) {
  try {
    document.cookie = `${COOKIE}=${ui}; path=/; max-age=${YEAR_SECONDS}; SameSite=Lax`;
  } catch {
    /* blocked by policy — the choice still holds for this visit */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function toggleNavigatorUi() {
  const next: NavigatorUi = getNavigatorUi() === "dial" ? "infinity" : "dial";
  setNavigatorUi(next);
  return next;
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
