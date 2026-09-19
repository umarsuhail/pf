"use client";

import { useEffect } from "react";
import { primeTicks, playTick, registerForUnlock } from "../lib/tick-sound";

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
// Do not make the very first nudge noisy. Trackpads, touchscreens and mouse
// wheels all produce tiny exploratory moves, so the dial only comes alive
// after the visitor has deliberately travelled through the page.
const SCROLL_ARM_DISTANCE = 96;
const STOP_DELAY = 150; // ms of no input before the dial is considered stopped
const FAST_VELOCITY = 1.6; // px/ms threshold to switch to the multi-tick burst
const BURST_VOLUME = 0.4;
// How much a single new velocity sample can move the running estimate (0-1).
// Wheel/trackpad events arrive in uneven, coalesced bursts, so reacting to
// the raw instantaneous value made the tick rate jump around independently
// of how fast the page actually felt like it was moving.
const VELOCITY_SMOOTHING = 0.35;

export default function ScrollSound() {
  useEffect(() => {
    // The tick itself (pool, volume and the autoplay unlock below) lives in
    // lib/tick-sound, shared with the skill layover's travelling frame so the
    // two make the same click and unlock together.
    primeTicks();

    const burst = new Audio("/music/page_1.wav");
    burst.preload = "auto";
    burst.loop = true;
    burst.volume = BURST_VOLUME;
    let burstPlaying = false;

    // Wheel and touchmove are not "activation" gestures, so a play() fired
    // from them stays silent until something unlocks audio — see tick-sound.
    // The burst is this component's own clip, so it registers for that same
    // unlock rather than waiting on a gesture it will never see.
    registerForUnlock(burst);

    let accumulated = 0;
    let distanceBeforeArming = 0;
    let isArmed = false;
    let lastTime = 0;
    let smoothedVelocity = 0;
    let lastTouchY: number | null = null;
    let stopTimer = 0;

    const stopBurst = () => {
      burstPlaying = false;
      burst.pause();
    };

    const stopAll = () => {
      accumulated = 0;
      smoothedVelocity = 0;
      lastTime = 0;
      stopBurst();
    };

    const handleMove = (deltaY: number) => {
      let distance = Math.abs(deltaY);
      if (distance === 0) return;

      // Keep this arm state across pauses. The requirement is a meaningful
      // amount of page travel before the first tick, not one uninterrupted
      // gesture that happens to exceed the threshold.
      if (!isArmed) {
        distanceBeforeArming += distance;
        if (distanceBeforeArming < SCROLL_ARM_DISTANCE) return;

        isArmed = true;
        distance = distanceBeforeArming - SCROLL_ARM_DISTANCE;
        distanceBeforeArming = 0;
        // Reaching the threshold itself stays silent; subsequent movement is
        // what turns into the first discrete page.wav tick.
        if (distance === 0) return;
      }

      const now = performance.now();
      const dt = lastTime ? now - lastTime : 16;
      lastTime = now;
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(stopAll, STOP_DELAY);

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
      stopBurst();
    };
  }, []);

  return null;
}
