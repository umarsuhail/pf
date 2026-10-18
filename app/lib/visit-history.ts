"use client";

import { useSyncExternalStore } from "react";

// What this browser already knows about the flight.
//
// Three facts, and they only matter in combination: how many times someone
// has been here, whether they have ever let the autopilot fly, and whether
// they have since turned it off. The narrated intro is worth sitting through
// once; the autopilot toggle is only worth offering to someone who has
// already formed an opinion about the autopilot.
//
// Cookies rather than localStorage, and the distinction that matters is the
// pair: `pf_session` has no max-age, so it lives and dies with the browser
// session, while `pf_visits` persists for a year. A reload finds the session
// cookie already set and counts nothing — which is the whole point, because
// the count is meant to mean "times someone came back", not "times the page
// loaded". Closing the browser and returning is a visit; F5 is not.
//
// Every access is wrapped: cookies can be blocked outright, and the flight
// has to work anyway. A blocked browser simply reads as a first-time
// visitor every time, which is the safe end to fail at.

const VISITS_COOKIE = "pf_visits";
const SESSION_COOKIE = "pf_session";
const TRIED_COOKIE = "pf_autopilot_tried";
const ENABLED_COOKIE = "pf_autoplay";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

// One prior visit is enough. The narration is the story the first time and a
// toll the second, so anyone coming back already knows how it opens.
const INTRO_FAMILIAR_AFTER = 1;

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

/** `maxAge` omitted writes a session cookie — gone when the browser closes. */
function writeCookie(name: string, value: string, maxAge?: number) {
  if (typeof document === "undefined") return;
  try {
    const age = maxAge === undefined ? "" : `; max-age=${maxAge}`;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/${age}; SameSite=Lax`;
  } catch {
    /* blocked by policy — this visit still behaves */
  }
}

export function getVisitCount() {
  const stored = Number(readCookie(VISITS_COOKIE));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

/**
 * Counts this visit, once per browser session.
 *
 * Called from the flight on mount. The session cookie is the guard: if it is
 * already there this is a reload or a client-side navigation back to `/`,
 * and the count stays where it is.
 */
export function recordVisit() {
  if (readCookie(SESSION_COOKIE)) return getVisitCount();
  writeCookie(SESSION_COOKIE, "1");
  const next = getVisitCount() + 1;
  writeCookie(VISITS_COOKIE, String(next), YEAR_SECONDS);
  return next;
}

export function hasTriedAutopilot() {
  return readCookie(TRIED_COOKIE) === "1";
}

export function markAutopilotTried() {
  writeCookie(TRIED_COOKIE, "1", YEAR_SECONDS);
}

/** Defaults to on. The toggle exists to turn it off, not to find it. */
export function isAutoplayEnabled() {
  return readCookie(ENABLED_COOKIE) !== "0";
}

/** Past the first visit, the narration is a toll rather than a story. */
export function shouldSkipIntro() {
  return getVisitCount() > INTRO_FAMILIAR_AFTER;
}

/**
 * Whether the settings prompt should carry the autoplay toggle.
 *
 * Both halves matter: someone returning who has never launched the autopilot
 * has no opinion to express, and the prompt is the one place that has to stay
 * short. The toggle appears once the visitor has come back *and* has actually
 * flown it.
 */
export function shouldOfferAutoplayToggle() {
  return getVisitCount() > INTRO_FAMILIAR_AFTER && hasTriedAutopilot();
}

const PREFERENCE_EVENT = "flight-autoplay-preference";

export function setAutoplayEnabled(enabled: boolean) {
  writeCookie(ENABLED_COOKIE, enabled ? "1" : "0", YEAR_SECONDS);
  window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT));
}

// Subscribed rather than copied into state in an effect: the preference lives
// in a cookie, which is an external store, and reading it during render would
// disagree with the server's answer. The server always says "on", which is
// the default, so the first paint is never wrong in a way that matters — a
// disabled button that enables itself a frame later.
function subscribePreference(onChange: () => void) {
  window.addEventListener(PREFERENCE_EVENT, onChange);
  return () => window.removeEventListener(PREFERENCE_EVENT, onChange);
}

export function useAutoplayEnabled() {
  return useSyncExternalStore(
    subscribePreference,
    isAutoplayEnabled,
    () => true,
  );
}
