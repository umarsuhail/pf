import {
  CAMERA_TRAVEL,
  CARD_PASS_THROUGH_Z,
  CARD_READING_DEPTH,
} from "../lib/camera";
import { sectionProgressMap } from "./sections";

const ENTRY_CARD_CLEARS =
  (CARD_PASS_THROUGH_Z - CARD_READING_DEPTH) / CAMERA_TRAVEL.desktop;

const LEGS: { until: number; vh: number }[] = [
  { until: ENTRY_CARD_CLEARS, vh: 380 },
  { until: sectionProgressMap.skills, vh: 340 },
  { until: sectionProgressMap.projects, vh: 1150 },
  { until: sectionProgressMap.experience, vh: 560 },
  { until: sectionProgressMap.contact, vh: 640 },
  { until: 1, vh: 260 },
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
