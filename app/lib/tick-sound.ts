"use client";


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

export function primeTicks() {
  if (typeof window !== "undefined") getPool();
}
