import { cards, sectionProgressMap } from "./sections";
import {
  TRACK_VH,
  progressFromScroll,
  scrollFromProgress,
} from "./flightTimeline";
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

// Derived from the two panels it sits between rather than hard-coded, so
// lengthening that leg (as moving Skills to 0.18 did) hands the extra room
// straight to the helix instead of leaving it stranded at old coordinates.
// The insets keep the tools clear of both cards: the first one fades up after
// Skills has been read, the last is gone before Projects arrives.
// The layover owns this stretch outright. Its start clears the Skills card's
// whole departure (see getDepartWindow, which clamps that fade to end just
// before this), and its end leaves the Projects card enough runway to reveal
// before its own reading slot. Nothing overlaps: one thing at a time is on
// screen, which is the only way nineteen tools can be looked at.
export const TECHNOLOGY_LAYOVER_START = sectionProgressMap.skills + 0.18;
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

// The dial's ordered list of landings: one full turn of the bezel travels
// from one of these to the next. They are the cards' readable slots rather
// than their raw depth, so the dial lands where the card is legible.
export const FLIGHT_SECTION_STOPS = [
  ...MAIN_FLIGHT_STOPS,
  ...TECHNOLOGY_GROUP_STOPS,
  { id: "closing", label: "Closing", progress: 1 },
].sort((a, b) => a.progress - b.progress);

// --- Snap landings -------------------------------------------------------
//
// Snap points are not the same thing as flight stops. The document snaps
// `y mandatory` in the gears that snap at all, which makes the distance
// between two snap points exactly one scroll gesture — so with a marker only
// at each stop, one wheel notch threw the reader from one panel to the next
// and there was no way to sit inside a section and travel through it.
//
// `stepsPerSection` comes from the engaged gear (see lib/travel-gear.ts):
// 1 is a landing per section, 3 is three scrolls to cross one, and 0 turns
// the whole layer off so scrolling is free.
// No landing should be more than about a viewport and a bit from the last
// one. Past that a single gesture stops being a step and becomes a jump.
const MAX_LANDING_VH = 110;

export function buildSnapPoints(stepsPerSection: number) {
  if (stepsPerSection < 1) return [];

  // Inside the layover a "section step" is the Skills-to-Projects leg divided
  // three ways — about 0.127 of progress, which is seven tools. One gesture
  // would cross seven marks nobody got to look at, which is the complaint
  // that started all of this. From second gear up, every technology gets its
  // own landing, so a scroll there is one tool.
  //
  // Third gear keeps the group stops only: it is the section-to-section gear,
  // and nineteen landings would make crossing the layover the longest part of
  // the fastest way to travel.
  const toolLandings =
    stepsPerSection >= 3
      ? TECHNOLOGY_FOCUS_STOPS.map((focus) => ({
          id: focus.id,
          progress: focus.progress,
        }))
      : [];

  // The step for the section a given progress falls in. Measured between the
  // *main* stops on purpose: the technology group stops subdivide Skills, and
  // sizing the step from those would make the step for the section around
  // them a fraction of a subdivision rather than a fraction of a section.
  const starts = MAIN_FLIGHT_STOPS.map((stop) => stop.progress);
  const stepAt = (progress: number) => {
    let index = 0;
    for (let i = 0; i < starts.length; i++) {
      if (progress >= starts[i] - 1e-6) index = i;
    }
    const start = starts[index] ?? 0;
    const end = starts[index + 1] ?? 1;
    return Math.max((end - start) / stepsPerSection, 0.001);
  };

  // Every real stop, plus evenly spaced markers filling any gap longer than
  // its section's step. Gaps already shorter than the step — the technology
  // groups during the layover — are left alone, so the layover is never
  // subdivided finer than the tools it is focusing on.
  const points: { id: string; progress: number }[] = [];
  const anchors = [...FLIGHT_SECTION_STOPS, ...toolLandings]
    .sort((a, b) => a.progress - b.progress)
    // A technology group stop sits on its group's first tool, so the two
    // arrive at the same progress; two snap markers on one pixel is one
    // marker and a wasted node.
    .filter(
      (stop, index, all) =>
        index === 0 || stop.progress - all[index - 1].progress > 1e-4,
    );

  anchors.forEach((stop, index) => {
    points.push({ id: stop.id, progress: stop.progress });

    const next = anchors[index + 1];
    if (!next) return;

    const gap = next.progress - stop.progress;
    // Two rules, and the finer one wins.
    //
    // The first divides by the section's own step, which is how "three
    // landings per section" is delivered. On its own it is not enough: the
    // layover leg is worth five times the scroll of any other (see
    // flightTimeline), so a third of it in progress is several hundred vh of
    // scrolling between two landings — one gesture that crosses half a
    // screen's worth of flight. The second rule caps a landing gap by how far
    // it actually is to scroll, which is the thing a reader experiences.
    const scrollGapVh =
      (scrollFromProgress(next.progress) - scrollFromProgress(stop.progress)) *
      TRACK_VH;
    const divisions = Math.max(
      Math.ceil(gap / stepAt(stop.progress) - 1e-6),
      Math.ceil(scrollGapVh / MAX_LANDING_VH - 1e-6),
    );
    // Spaced evenly in *scroll*, not in progress. The two are the same thing
    // only within a leg: a gap that straddles a leg boundary has a kink in
    // the middle of it, and fillers laid out in progress come out bunched on
    // the fast side and stretched on the slow one — which is how one landing
    // ended up 147vh from its neighbour while the rest sat near 100.
    const fromScroll = scrollFromProgress(stop.progress);
    const toScroll = scrollFromProgress(next.progress);
    for (let step = 1; step < divisions; step++) {
      points.push({
        id: `${stop.id}-step-${step}`,
        progress: progressFromScroll(
          fromScroll + ((toScroll - fromScroll) * step) / divisions,
        ),
      });
    }
  });

  return points;
}
