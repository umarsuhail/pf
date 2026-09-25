import { sectionProgressMap } from "./sections";

// How much *scrolling* each leg of the flight takes.
//
// The flight has two clocks and they are not the same clock. Progress
// (sections.ts) is flight time: where a panel sits, how deep the camera is,
// when a card fades — every tuned constant in the corridor is expressed in it.
// This file is the other one: how far you have to scroll to spend a given
// amount of that time.
//
// Keeping them apart is what lets a leg be given more room without disturbing
// anything else. The alternative was tried: lengthening the track and moving
// Skills from 0.22 to 0.18 did give the technology helix more scroll, but
// because every constant in the flight is priced in progress, it also moved
// every card 22% further from the camera at its reading position, stretched
// every fade over 22% more depth, and pushed the closing beat's thresholds out
// of alignment with the card they were tuned against. The flight was wrong
// everywhere to fix one leg.
//
// Here, a leg's scroll length is a number in this table and nothing else
// changes. The Skills-to-Projects leg carries the whole toolkit — nineteen
// tools on a helix — so it gets the room; every other leg keeps the length it
// has always had.
const LEGS: { until: number; vh: number }[] = [
  // home → skills
  { until: sectionProgressMap.skills, vh: 396 },
  // skills → projects: the technology layover, and the reason this file
  // exists. The leg carries nineteen tools on a helix and nothing else, so it
  // gets by far the most scroll — about 41vh per tool. The camera's depth
  // through here is fixed by the progress map; this only decides how long you
  // spend crossing it, which is exactly what a layover is.
  { until: sectionProgressMap.projects, vh: 2200 },
  // projects → experience
  { until: sectionProgressMap.experience, vh: 234 },
  // experience → contact (the dusk stretch lives in here)
  { until: sectionProgressMap.contact, vh: 414 },
  // contact → the closing beat
  { until: 1, vh: 144 },
];

type Segment = {
  progressFrom: number;
  progressTo: number;
  scrollFrom: number;
  scrollTo: number;
};

export const TRACK_VH = LEGS.reduce((total, leg) => total + leg.vh, 0);

const SEGMENTS: Segment[] = (() => {
  const segments: Segment[] = [];
  let progressFrom = 0;
  let scrolled = 0;
  for (const leg of LEGS) {
    const scrollFrom = scrolled / TRACK_VH;
    scrolled += leg.vh;
    segments.push({
      progressFrom,
      progressTo: leg.until,
      scrollFrom,
      scrollTo: scrolled / TRACK_VH,
    });
    progressFrom = leg.until;
  }
  return segments;
})();

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function interpolate(value: number, from: number, to: number, a: number, b: number) {
  const span = to - from;
  if (span <= 0) return a;
  return a + ((value - from) / span) * (b - a);
}

// Document scroll (0..1 of the track) -> flight progress. Piecewise linear, so
// the camera's speed is constant within a leg and only changes at a panel —
// which is where a change of pace reads as pacing rather than as a stutter.
export function progressFromScroll(scroll: number) {
  const value = clamp01(scroll);
  for (const segment of SEGMENTS) {
    if (value <= segment.scrollTo || segment === SEGMENTS[SEGMENTS.length - 1]) {
      return clamp01(
        interpolate(
          value,
          segment.scrollFrom,
          segment.scrollTo,
          segment.progressFrom,
          segment.progressTo,
        ),
      );
    }
  }
  return value;
}

// The inverse, and it has to exist for everything that *writes* a scroll
// position from a progress: the dial and the nav flying to a stop, the
// autopilot's rAF clock, and the snap markers, which are laid out down the
// document and therefore live in scroll, not in progress.
export function scrollFromProgress(progress: number) {
  const value = clamp01(progress);
  for (const segment of SEGMENTS) {
    if (
      value <= segment.progressTo ||
      segment === SEGMENTS[SEGMENTS.length - 1]
    ) {
      return clamp01(
        interpolate(
          value,
          segment.progressFrom,
          segment.progressTo,
          segment.scrollFrom,
          segment.scrollTo,
        ),
      );
    }
  }
  return value;
}
