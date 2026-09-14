"use client";

// The dial tick (page.wav) is played from two places now — the scroll dial
// itself (ScrollSound) and the skill layover's travelling frame, which lands
// on one technology at a time as the camera drifts past the cluster. Both
// want the same click, so the pool and the autoplay unlock live here instead
// of being built twice.
//
// The unlock is the part worth sharing. Browsers only allow audio-with-sound
// to start during a handful of "activation" gestures — click, keydown,
// pointerdown, touchstart/end. Wheel and touchmove, which is all the flight
// ever gets once it is underway, do not qualify, so a play() fired from one
// is silently rejected until the visitor happens to click something else.
// Priming every clip muted on the first qualifying gesture anywhere on the
// page unlocks them for every scroll-triggered play afterwards.

const TICK_SRC = "/music/page.wav";
const POOL_SIZE = 6;
export const TICK_VOLUME = 0.4;

let pool: HTMLAudioElement[] | null = null;
let cursor = 0;
let unlocked = false;
let listening = false;
const awaitingUnlock = new Set<HTMLAudioElement>();

function prime(clip: HTMLAudioElement) {
  clip.muted = true;
  void clip
    .play()
    .then(() => clip.pause())
    .catch(() => {})
    .finally(() => {
      clip.currentTime = 0;
      clip.muted = false;
    });
}

function onGesture() {
  if (unlocked) return;
  unlocked = true;
  awaitingUnlock.forEach(prime);
  awaitingUnlock.clear();
  window.removeEventListener("pointerdown", onGesture);
  window.removeEventListener("keydown", onGesture);
  window.removeEventListener("touchstart", onGesture);
  listening = false;
}

/** Prime `clip` on the next qualifying gesture — for clips this module does
 *  not own (ScrollSound's fast-scroll burst), so they ride the same unlock. */
export function registerForUnlock(clip: HTMLAudioElement) {
  if (typeof window === "undefined") return;
  if (unlocked) {
    prime(clip);
    return;
  }
  awaitingUnlock.add(clip);
  if (listening) return;
  listening = true;
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  window.addEventListener("touchstart", onGesture, { passive: true });
}

function getPool() {
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const clip = new Audio(TICK_SRC);
      clip.preload = "auto";
      clip.volume = TICK_VOLUME;
      registerForUnlock(clip);
      return clip;
    });
  }
  return pool;
}

/** Round-robin across the pool so ticks fired in quick succession overlap
 *  instead of cutting each other off. */
export function playTick(rate = 1, volume = TICK_VOLUME) {
  if (typeof window === "undefined") return;
  const clips = getPool();
  const clip = clips[cursor];
  cursor = (cursor + 1) % clips.length;
  clip.playbackRate = rate;
  clip.volume = volume;
  clip.currentTime = 0;
  void clip.play().catch(() => {});
}

/** Build the pool ahead of the first tick, so the first one is not the play
 *  that also has to fetch the file. */
export function primeTicks() {
  if (typeof window !== "undefined") getPool();
}
