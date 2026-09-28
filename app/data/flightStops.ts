import { cards, sectionProgressMap } from "./sections";
import {
  CAMERA_TRAVEL,
  CARD_DEPART_NEAR_Z,
  CARD_PASS_THROUGH_Z,
  CARD_READING_DEPTH,
} from "../lib/camera";
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
// +0.18 was sized against a Skills card that departed at 0.28. Now that the
// departure is a depth event it clears at 0.155, and the offset was buying
// 0.195 of progress — 7.7 viewport heights — of corridor with nothing in it.
// +0.02 puts the first tool just after the card has passed.
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

// --- Card windows --------------------------------------------------------
//
// When a panel is on approach, when it is legible, and when it has been flown
// past. These lived in MultiverseFlight, which was fine while the corridor
// was their only reader — but a card's portal has to paint its scene across
// the same stretch, and CardPortal cannot import a component that imports it.
// So it kept its own guess at the timing, and the guess was wrong: it centred
// the scene on the card's raw progress *stop* instead of its reading slot,
// which put the Skills rocket's entire crossing after the card had begun to
// leave. Both readers now take the real windows from here.

// A card's natural stop puts it almost on the CSS perspective camera. That
// is useful as a pass-through moment while scrolling, but it is the wrong
// place to hold an autoplay scene: copy gets cropped and the portal swallows
// the viewport. Every navigation now lands just before that point in the
// card's readable "slot", where the whole panel has room to breathe.
export const CARD_SLOT_MIN_APPROACH = 0.045;

// How long before its own reveal a billboard is allowed to exist as a faint
// shape in the distance.
//
// The card fade used to run its first segment from progress 0 to the reveal
// start, which meant the ramp to the 42% "approaching" level was stretched
// across the *entire flight up to that point*. Experience was therefore
// already at 0.39 opacity while Projects was still parked at its reading
// slot: two billboards on screen at once, the upcoming one not far enough
// away to read as depth, just a duplicate panel behind the one being read.
// A card is now dark until it is genuinely on approach, and the corridor
// depth it used to stand for is bought over this runway instead.
export const REVEAL_APPROACH_RUNWAY = 0.1;

export function getRevealWindow(index: number) {
  if (index === 0) return { approach: 0, start: 0, end: 0.01 };
  const previous = sectionProgressStops[index - 1];
  const current = sectionProgressStops[index];
  const span = Math.max(current - previous, 0.08);
  const slot = getCardSlotProgress(index);
  let start = Math.max(
    // Begin the handoff while the card is still at a comfortable depth, and
    // have its sharp, full-scale state arrive exactly at the readable slot.
    previous + span * 0.24,
    slot - Math.max(span * 0.3, CARD_SLOT_MIN_APPROACH),
    0,
  );

  // A card arriving on the far side of the technology layover waits for it.
  // Its natural approach would begin 0.135 of progress before its slot, which
  // is most of the way back through the helix — the billboard would fade up
  // behind the tools and the two would be on screen together, each making the
  // other unreadable.
  if (previous < TECHNOLOGY_LAYOVER_END && slot > TECHNOLOGY_LAYOVER_END) {
    start = Math.max(start, TECHNOLOGY_LAYOVER_END + 0.01);
  }

  // Skills is the first full billboard the traveller flies toward. Give its
  // approach a wider runway than the generic card reveal so the panel grows
  // into view as a deliberate, slow zoom instead of appearing only in the
  // last instant before its readable slot. The stop itself does not move —
  // this only shapes how early that one card becomes visible.
  if (index === 1) {
    start = Math.min(start, slot - Math.max(span * 0.5, 0.075));
  }

  start = Math.min(start, slot - 0.01);

  // The runway is clipped by whatever the card is not allowed to appear in
  // front of: the previous card's own reading slot, and — for a card on the
  // far side of the toolkit — the layover itself, which the clamp above has
  // already pushed `start` clear of.
  const floor = Math.max(
    getCardSlotProgress(index - 1),
    previous < TECHNOLOGY_LAYOVER_END && slot > TECHNOLOGY_LAYOVER_END
      ? TECHNOLOGY_LAYOVER_END + 0.01
      : 0,
  );
  const approach = Math.max(start - REVEAL_APPROACH_RUNWAY, floor, 0);

  return { approach: Math.min(approach, start), start, end: slot };
}

// Progress by which the last billboard must be fully gone. Everything in the
// closing sequence is timed against this: the black void reaches full
// opacity here, and the closing beat only begins fading in afterwards, so
// the corridor is genuinely empty before the ending is shown.
export const LAST_CARD_CLEARED = 0.95;

export function getDepartWindow(index: number) {
  // A departure is a depth event, not a fraction of the gap to the next
  // panel. That distinction did not matter while the camera crossed 8400
  // over the flight and the two happened to line up; at three times the
  // travel they do not. A card now reaches the camera three times sooner in
  // progress, so a window written as "30% to 85% of the way to the next
  // stop" opens long *after* the card has already gone past — Skills was at
  // z=2046, well through the projection plane, at the first keyframe of its
  // own fade. Clamping it at 1.67x to hide that is what made a departing
  // card sit still in the middle of the frame and dissolve.
  //
  // Expressed in depth it is simply: the card starts going as it reaches the
  // camera (CARD_DEPART_NEAR_Z) and is gone by the time it fills the frame
  // (CARD_PASS_THROUGH_Z). It follows the camera at any travel.
  const slot = getCardSlotProgress(index);
  const travel = CAMERA_TRAVEL.desktop;
  const atDepth = (z: number) => slot + (z - CARD_READING_DEPTH) / travel;

  let start = atDepth(CARD_DEPART_NEAR_Z);
  let end = atDepth(CARD_PASS_THROUGH_Z);

  // Everything below is a ceiling, never a floor: the depth window is what
  // the departure *is*, and these only pull it in where something else has
  // a prior claim on the corridor.

  // A card leaving into the technology layover has to be gone before it, not
  // merely dimming through it — the toolkit owns that stretch outright.
  const current = sectionProgressStops[index];
  const next =
    index < sectionProgressStops.length - 1
      ? sectionProgressStops[index + 1]
      : 1;
  if (current < TECHNOLOGY_LAYOVER_START && next > TECHNOLOGY_LAYOVER_START) {
    end = Math.min(end, TECHNOLOGY_LAYOVER_START - 0.01);
  }

  // The final card has no successor to clear for, but it does have the
  // closing beat: LAST_CARD_CLEARED is where the void reaches full black.
  // Every other card clears before the next one's reading slot.
  if (index === sectionProgressStops.length - 1) {
    end = Math.min(end, LAST_CARD_CLEARED);
  } else {
    end = Math.min(end, getCardSlotProgress(index + 1) - 0.008);
  }

  start = Math.min(start, end - 0.0005);
  return { start, end };
}

// The stretch a card is actually on screen for, start to finish: from the
// moment it first lights as a shape in the distance to the moment it is
// gone. Anything painting *on* a card belongs on this clock.
export function getCardLifeWindow(index: number) {
  const reveal = getRevealWindow(index);
  const depart = getDepartWindow(index);
  return { start: reveal.approach, slot: reveal.end, end: depart.end };
}

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
