"use client";

// The song, as a clock the flight can read.
//
// CockpitTray owns the audio element; the flight needs to know what time it
// is in the track. Passing that through an event every frame would be a
// message per frame and still one frame stale, so the element itself is
// handed over and read directly — `currentTime` on a playing element is the
// position of the audio hardware, which is the only authority on where the
// music actually is.
//
// Null is a real answer and means "no music is playing": during the
// narration, after a tour ends, or when the browser refused to play at all.
// Every caller has to behave without it, because a visitor who declines
// sound still gets a flight.

let element: HTMLAudioElement | null = null;
let source: string | null = null;

export function setSoundtrackClock(el: HTMLAudioElement, src: string) {
  element = el;
  source = src;
}

export function clearSoundtrackClock() {
  element = null;
  source = null;
}

/** Which file is playing — the key into the beat maps. */
export function getSoundtrackSource() {
  return element && !element.paused ? source : null;
}

export function getSoundtrackTime() {
  if (!element || element.paused) return null;
  const time = element.currentTime;
  return Number.isFinite(time) ? time : null;
}
