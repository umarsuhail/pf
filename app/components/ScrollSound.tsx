"use client";

import { useEffect } from "react";

// A dial-rotation tick that responds to how fast the visitor scrolls.
// Wheel/touch input only — the autopilot tour moves the page via
// window.scrollTo(), which fires no such input events, so it stays silent
// during that and only responds to a real, manual scroll.
//
// Slow scrolling fires discrete ticks (page.wav) spaced by scroll distance,
// so the tick rate tracks speed the way a rotating encoder would. Past
// FAST_VELOCITY the dial is "spinning" too fast for distinct ticks to read,
// so it crossfades into page_1.wav — a burst that already contains several
// ticks — looped and pitched up with speed instead of firing overlapping
// one-shots.
const TICK_DISTANCE = 45; // px of scroll per tick
const STOP_DELAY = 150; // ms of no input before the dial is considered stopped
const FAST_VELOCITY = 1.6; // px/ms threshold to switch to the multi-tick burst
const TICK_POOL_SIZE = 6;
const TICK_VOLUME = 0.4;
const BURST_VOLUME = 0.4;
// How much a single new velocity sample can move the running estimate (0-1).
// Wheel/trackpad events arrive in uneven, coalesced bursts, so reacting to
// the raw instantaneous value made the tick rate jump around independently
// of how fast the page actually felt like it was moving.
const VELOCITY_SMOOTHING = 0.35;

export default function ScrollSound() {
  useEffect(() => {
    const tickPool = Array.from({ length: TICK_POOL_SIZE }, () => {
      const a = new Audio("/music/page.wav");
      a.preload = "auto";
      a.volume = TICK_VOLUME;
      return a;
    });
    let tickIndex = 0;

    const burst = new Audio("/music/page_1.wav");
    burst.preload = "auto";
    burst.loop = true;
    burst.volume = BURST_VOLUME;
    let burstPlaying = false;

    // Browsers only allow audio-with-sound to start during a handful of
    // "activation" gestures — click, keydown, pointerdown, touchend/start.
    // Wheel and touchmove, the events this component actually listens to,
    // don't qualify, so a play() fired from them is silently rejected (the
    // .catch below swallows it) until the visitor happens to click or tap
    // something else on the page first — which is exactly the "sometimes it
    // just doesn't play" symptom. Priming every element (muted, so it's
    // inaudible) on the very first qualifying gesture anywhere on the page
    // unlocks them for every wheel/touchmove-triggered play afterwards.
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      for (const a of [...tickPool, burst]) {
        a.muted = true;
        void a
          .play()
          .then(() => a.pause())
          .catch(() => {})
          .finally(() => {
            a.currentTime = 0;
            a.muted = false;
          });
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });

    let accumulated = 0;
    let lastTime = 0;
    let smoothedVelocity = 0;
    let lastTouchY: number | null = null;
    let stopTimer = 0;

    const playTick = (rate: number) => {
      const a = tickPool[tickIndex];
      tickIndex = (tickIndex + 1) % tickPool.length;
      a.playbackRate = rate;
      a.currentTime = 0;
      void a.play().catch(() => {});
    };

    const stopBurst = () => {
      burstPlaying = false;
      burst.pause();
    };

    const stopAll = () => {
      accumulated = 0;
      smoothedVelocity = 0;
      stopBurst();
    };

    const handleMove = (deltaY: number) => {
      const now = performance.now();
      const dt = lastTime ? now - lastTime : 16;
      lastTime = now;
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(stopAll, STOP_DELAY);

      const distance = Math.abs(deltaY);
      if (distance === 0) return;
      const instantVelocity = distance / Math.max(dt, 1); // px per ms
      smoothedVelocity += (instantVelocity - smoothedVelocity) * VELOCITY_SMOOTHING;
      const velocity = smoothedVelocity;

      if (velocity >= FAST_VELOCITY) {
        accumulated = 0;
        if (!burstPlaying) {
          burstPlaying = true;
          burst.currentTime = 0;
          void burst.play().catch(() => {
            burstPlaying = false;
          });
        }
        burst.playbackRate = Math.min(1 + velocity * 0.25, 2.5);
        return;
      }

      if (burstPlaying) stopBurst();

      accumulated += distance;
      const rate = Math.min(0.85 + velocity * 0.5, 1.8);
      while (accumulated >= TICK_DISTANCE) {
        accumulated -= TICK_DISTANCE;
        playTick(rate);
      }
    };

    const onWheel = (e: WheelEvent) => handleMove(e.deltaY);
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? null;
      if (lastTouchY != null && y != null) handleMove(lastTouchY - y);
      lastTouchY = y;
    };
    const onTouchEnd = () => {
      lastTouchY = null;
    };

    const opts = { passive: true } as const;
    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("touchmove", onTouchMove, opts);
    window.addEventListener("touchend", onTouchEnd, opts);

    return () => {
      window.clearTimeout(stopTimer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      stopBurst();
      tickPool.forEach((a) => a.pause());
    };
  }, []);

  return null;
}
