"use client";

import { useEffect } from "react";

// The ship's engines: travel.aac, looped for as long as the flight is open,
// under the narration, the soundtrack and the silence alike — manual flying
// and the autopilot tour both. It idles low and swells in volume and pitch
// with the speed of travel, so scrolling harder sounds like more thrust.
//
// Web Audio rather than <audio loop>. The clip is 6.5 seconds, and an audio
// element restarting a loop that short leaves an audible gap at every wrap
// — every six seconds, the ship's hum would hiccup. A decoded buffer loops
// on the sample, and the encoder's silent padding is trimmed off both ends
// (see trimmedLoop) so the seam is inaudible too.
//
// Browsers only allow sound after a real user gesture, and wheel scrolling
// is not one. So the hum starts on the first click, tap or key — launching
// the tour is a click, so the autopilot always has it. Someone who only ever
// scrolls with a wheel hears nothing until they click once; that is the
// browser's rule, not something to work around.
//
// Muted by the tray's own mute button (the "flight-sound-mute" event).

const SRC = "/music/travel.aac";
// Gain at rest and at full speed. Deliberately under the narration and the
// soundtrack: it is the room the story plays in, not part of the story.
const IDLE_GAIN = 0.14;
const THRUST_GAIN = 0.32;
// Pitch lift at full speed — engines working harder, not a siren.
const THRUST_RATE = 0.1;
// Viewport heights per second that count as full speed.
const FULL_SPEED_VH_PER_S = 3;

// Where the sound actually starts and ends, skipping the encoder's leading
// priming silence and trailing padding — looped as-is they are a tick of
// silence at every wrap.
function trimmedLoop(buffer: AudioBuffer) {
  const data = buffer.getChannelData(0);
  const threshold = 1e-3;
  let start = 0;
  while (start < data.length && Math.abs(data[start]) < threshold) start++;
  let end = data.length - 1;
  while (end > start && Math.abs(data[end]) < threshold) end--;
  return {
    loopStart: start / buffer.sampleRate,
    loopEnd: (end + 1) / buffer.sampleRate,
  };
}

export default function EngineHum() {
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let gain: GainNode | null = null;
    let source: AudioBufferSourceNode | null = null;
    let started = false;
    let disposed = false;
    let muted = false;
    let speed = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let interval = 0;

    const targetGain = () => (muted || document.hidden ? 0 : IDLE_GAIN + (THRUST_GAIN - IDLE_GAIN) * speed);

    const update = () => {
      if (!ctx || !gain || !source) return;
      speed *= 0.82;
      const now = ctx.currentTime;
      gain.gain.setTargetAtTime(targetGain(), now, 0.25);
      source.playbackRate.setTargetAtTime(1 + THRUST_RATE * speed, now, 0.35);
    };

    const start = async () => {
      if (started || disposed) return;
      started = true;
      removeGestureListeners();
      try {
        ctx = new AudioContext();
        const response = await fetch(SRC);
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        if (disposed) return;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const { loopStart, loopEnd } = trimmedLoop(buffer);
        source.loopStart = loopStart;
        source.loopEnd = loopEnd;
        gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(ctx.destination);
        source.start(0, loopStart);
        // Spools up rather than switching on.
        gain.gain.setTargetAtTime(targetGain(), ctx.currentTime, 1.2);
        interval = window.setInterval(update, 100);
      } catch {
        // No audio (blocked, unsupported, offline): the flight is silent,
        // which is what it was before this existed.
      }
    };

    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(16, now - lastT) / 1000;
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      lastT = now;
      // A jump (the loop wrapping to the top) is not travel.
      if (dy > window.innerHeight * 2) return;
      const vhPerS = dy / window.innerHeight / dt;
      speed = Math.max(speed, Math.min(1, vhPerS / FULL_SPEED_VH_PER_S));
    };

    const onMute = (event: Event) => {
      muted = Boolean((event as CustomEvent<{ muted?: boolean }>).detail?.muted);
      update();
    };

    // Silent while the tab is in the background; picks back up on return.
    const onVisibility = () => update();

    const gestures = ["pointerdown", "keydown", "touchend"] as const;
    const onGesture = () => void start();
    const removeGestureListeners = () =>
      gestures.forEach((type) => window.removeEventListener(type, onGesture));
    gestures.forEach((type) => window.addEventListener(type, onGesture, { passive: true }));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("flight-sound-mute", onMute);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      removeGestureListeners();
      window.clearInterval(interval);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("flight-sound-mute", onMute);
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        source?.stop();
      } catch {}
      void ctx?.close();
    };
  }, []);

  return null;
}
