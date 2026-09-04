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

export default function ScrollSound() {
  useEffect(() => {
    const tickPool = Array.from({ length: TICK_POOL_SIZE }, () => {
      const a = new Audio("/music/page.wav");
      a.volume = TICK_VOLUME;
      return a;
    });
    let tickIndex = 0;

    const burst = new Audio("/music/page_1.wav");
    burst.loop = true;
    burst.volume = BURST_VOLUME;
    let burstPlaying = false;

    let accumulated = 0;
    let lastTime = 0;
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
      const velocity = distance / Math.max(dt, 1); // px per ms

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
      stopBurst();
      tickPool.forEach((a) => a.pause());
    };
  }, []);

  return null;
}
