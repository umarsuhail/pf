import { cards, sectionProgressMap } from "./sections";
import {
  CAMERA_TRAVEL,
  CARD_DEPART_NEAR_Z,
  CARD_PASS_THROUGH_Z,
  CARD_READING_DEPTH,
} from "../lib/camera";
import { getSkillGroups } from "./skillGroups";

const CARD_SLOT_LEAD = 0.048;

export const sectionProgressStops = cards.map(
  (card) => sectionProgressMap[card.id],
);

export function getCardSlotProgress(index: number) {
  if (index <= 0) return 0;
  const current = sectionProgressStops[index];
  const previous = sectionProgressStops[index - 1];
  const span = Math.max(current - previous, 0.08);
  return Math.max(previous + span * 0.3, current - CARD_SLOT_LEAD);
}

export const TECHNOLOGY_LAYOVER_START = sectionProgressMap.skills + 0.02;
export const TECHNOLOGY_LAYOVER_END = sectionProgressMap.projects - 0.11;

const skills = cards.find((card) => card.id === "skills");
export const technologyGroups = getSkillGroups(skills?.details ?? []);
export const technologies = technologyGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.name })),
);

export const TECHNOLOGY_FOCUS_STOPS = technologies.map(
  (technology, index) => ({
    id: `technology-${technology.icon}-${index}`,
    label: technology.label,
    technology,
    progress:
      TECHNOLOGY_LAYOVER_START +
      (TECHNOLOGY_LAYOVER_END - TECHNOLOGY_LAYOVER_START) *
        (index / Math.max(technologies.length - 1, 1)),
  }),
);

export const TECHNOLOGY_NODE_GAP =
  (TECHNOLOGY_LAYOVER_END - TECHNOLOGY_LAYOVER_START) /
  Math.max(TECHNOLOGY_FOCUS_STOPS.length - 1, 1);

const TECHNOLOGY_OWN_WINDOW = [-0.5, -0.42, 0.42, 0.5] as const;

export function technologyFocusWindow(stop: number) {
  return TECHNOLOGY_OWN_WINDOW.map(
    (multiple) => stop + multiple * TECHNOLOGY_NODE_GAP,
  ) as [number, number, number, number];
}

export const TECHNOLOGY_GROUP_STOPS = technologyGroups.map((group) => {
  const firstIndex = technologies.findIndex((item) => item.group === group.name);
  return {
    id: `technology-group-${group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label: group.name,
    progress:
      TECHNOLOGY_FOCUS_STOPS[Math.max(0, firstIndex)]?.progress ??
      TECHNOLOGY_LAYOVER_START,
  };
});

export const MAIN_FLIGHT_STOPS = cards.map((card, index) => ({
  id: card.id,
  label: card.eyebrow.split("/").slice(1).join("/").trim() || card.id,
  progress: getCardSlotProgress(index),
}));

export const FLIGHT_SECTION_STOPS = [
  ...MAIN_FLIGHT_STOPS,
  ...TECHNOLOGY_GROUP_STOPS,
  { id: "closing", label: "Closing", progress: 1 },
].sort((a, b) => a.progress - b.progress);

export const CARD_SLOT_MIN_APPROACH = 0.045;

export const REVEAL_APPROACH_RUNWAY = 0.1;

export function getRevealWindow(index: number) {
  if (index === 0) return { approach: 0, start: 0, end: 0.01 };
  const previous = sectionProgressStops[index - 1];
  const current = sectionProgressStops[index];
  const span = Math.max(current - previous, 0.08);
  const slot = getCardSlotProgress(index);
  let start = Math.max(
    previous + span * 0.24,
    slot - Math.max(span * 0.3, CARD_SLOT_MIN_APPROACH),
    0,
  );

  if (previous < TECHNOLOGY_LAYOVER_END && slot > TECHNOLOGY_LAYOVER_END) {
    start = Math.max(start, TECHNOLOGY_LAYOVER_END + 0.01);
  }

  if (index === 1) {
    start = Math.min(start, slot - Math.max(span * 0.5, 0.075));
  }

  start = Math.min(start, slot - 0.01);

  const floor = Math.max(
    getCardSlotProgress(index - 1),
    previous < TECHNOLOGY_LAYOVER_END && slot > TECHNOLOGY_LAYOVER_END
      ? TECHNOLOGY_LAYOVER_END + 0.01
      : 0,
  );
  const approach = Math.max(start - REVEAL_APPROACH_RUNWAY, floor, 0);

  return { approach: Math.min(approach, start), start, end: slot };
}

export const LAST_CARD_CLEARED = 0.95;

export function getDepartWindow(index: number) {
  const slot = getCardSlotProgress(index);
  const travel = CAMERA_TRAVEL.desktop;
  const atDepth = (z: number) => slot + (z - CARD_READING_DEPTH) / travel;

  let start = atDepth(CARD_DEPART_NEAR_Z);
  let end = atDepth(CARD_PASS_THROUGH_Z);

  const current = sectionProgressStops[index];
  const next =
    index < sectionProgressStops.length - 1
      ? sectionProgressStops[index + 1]
      : 1;
  if (current < TECHNOLOGY_LAYOVER_START && next > TECHNOLOGY_LAYOVER_START) {
    end = Math.min(end, TECHNOLOGY_LAYOVER_START - 0.01);
  }

  if (index === sectionProgressStops.length - 1) {
    end = Math.min(end, LAST_CARD_CLEARED);
  } else {
    end = Math.min(end, getCardSlotProgress(index + 1) - 0.008);
  }

  start = Math.min(start, end - 0.0005);
  return { start, end };
}

export function getCardLifeWindow(index: number) {
  const reveal = getRevealWindow(index);
  const depart = getDepartWindow(index);
  return { start: reveal.approach, slot: reveal.end, end: depart.end };
}
