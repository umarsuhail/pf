"use client";

import { useEffect } from "react";
import { primeTicks, playTick, registerForUnlock } from "../lib/tick-sound";

const TICK_DISTANCE = 45;
const SCROLL_ARM_DISTANCE = 96;
const STOP_DELAY = 150;
const FAST_VELOCITY = 1.6;
const BURST_VOLUME = 0.4;
const VELOCITY_SMOOTHING = 0.35;

export default function ScrollSound() {
  useEffect(() => {
    primeTicks();

    const burst = new Audio("/music/page_1.wav");
    burst.preload = "auto";
    burst.loop = true;
    burst.volume = BURST_VOLUME;
    let burstPlaying = false;

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

      if (!isArmed) {
        distanceBeforeArming += distance;
        if (distanceBeforeArming < SCROLL_ARM_DISTANCE) return;

        isArmed = true;
        distance = distanceBeforeArming - SCROLL_ARM_DISTANCE;
        distanceBeforeArming = 0;
        if (distance === 0) return;
      }

      const now = performance.now();
      const dt = lastTime ? now - lastTime : 16;
      lastTime = now;
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(stopAll, STOP_DELAY);

      const instantVelocity = distance / Math.max(dt, 1);
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
