"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardPortal } from "./CardPortal";
import { CardIcon } from "./icons/card-icon";
import { DownloadIcon, type DownloadIconHandle } from "./icons/download";
import ExpandableText from "./ExpandableText";
import NarratedText from "./NarratedText";
import { NARRATION_SPANS, narrationSegments } from "../data/narration";
import SpaceParticles from "./SpaceParticles";
import ParticleLogo from "./HeroLogo";
import SignatureName from "./SignatureName";
import { POWER3_OUT } from "../lib/easings";
// The camera constants moved to lib/camera so the technology spiral can fly
// through the same coordinate system rather than a copy of it.
import { MAX_CARD_CAMERA_Z, cameraTravelFor } from "../lib/camera";
import {
  TRACK_VH,
  progressFromScroll,
  scrollFromProgress,
} from "../data/flightTimeline";
import { useTravelGear } from "../lib/travel-gear";
import TechnologyLayover, { LayoverCaption } from "./TechnologyLayover";
import {
  buildSnapPoints,
  TECHNOLOGY_FOCUS_STOPS,
  TECHNOLOGY_LAYOVER_END,
  TECHNOLOGY_LAYOVER_START,
  getCardSlotProgress,
  sectionProgressStops,
} from "../data/flightStops";

import {
  cardGradients,
  cards,
  sectionProgressMap,
  type FlightCard,
} from "../data/sections";

const HOME_HEADLINE_PHRASES = [
  "reliable apps",
  "modern products",
  "fast interfaces",
  "scalable systems",
  "clear experiences",
] as const;

const HOME_HEADLINE_HOLD_MS = 2800;

const PORTAL_WIDTH = "clamp(150px, 20vw, 320px)";
// Landscape phones are short, so the portal is sized off viewport *height*
// there — a width-based clamp would hand it 190px of a 440px-tall screen and
// leave the headline squeezed into a sliver.
const COMPACT_PORTAL_WIDTH = "clamp(96px, 30vh, 150px)";

// --- Card-internal depth -------------------------------------------------
// How far the copy and the portal stand off the card's own face, in the
// card's local 3D space. This is what separates a billboard from a picture
// of a billboard: as a card rotates past, the portal swings through a
// visibly wider arc than the panel behind it, and the copy sits between the
// two. Kept small — this is parallax on a surface, not a diorama — and
// scaled down on phones, where the card is a third of the size and the same
// offsets would read as the layers coming apart.
const CARD_DEPTH = {
  desktop: { copy: 22, portal: 58 },
  mobile: { copy: 10, portal: 26 },
} as const;

// Springs used for a card's responsive settle and the camera's visual follow.
// The camera values are deliberately overdamped: scroll settles cleanly with
// no bobbing or rebound when input stops.
const PHYSICS = {
  expansion: { type: "spring", stiffness: 180, damping: 22, mass: 0.9 },
} as const;

// A short, overdamped settle. Native scrolling and the rotary dial both land
// on discrete scene stops now, so a long camera follow only makes a firm stop
// feel slippery. This is quick enough to register as a mechanical snap while
// remaining non-oscillating on a low-refresh mobile display.
const CAMERA_SPRING = {
  stiffness: 260,
  damping: 32,
  mass: 0.32,
  restDelta: 0.00005,
} as const;

// The velocity readout stays overdamped so the faster positional snap does
// not turn the decorative speed trail into a flash at every section change.
const FLIGHT_VELOCITY_SPRING = {
  stiffness: 240,
  damping: 40,
  mass: 0.24,
} as const;

// Camera velocity below which there is no motion blur at all. Reading a card,
// nudging the wheel, and the camera spring settling all sit under this, which
// is the point: a still scene should be sharp.
const FLIGHT_BLUR_FLOOR = 0.055;

const FLIGHT_STREAK_BACKGROUND =
  "repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg 2deg, rgba(186,230,253,0.22) 2.35deg 2.62deg, transparent 3.15deg 8deg), radial-gradient(ellipse at 50% 50%, rgba(56,189,248,0.22) 0%, transparent 64%)";

// --- Space regions ------------------------------------------------------
// The corridor passes through distinct volumes of space rather than fading
// one navy into another. Each region is anchored to a section's own stop and
// takes its hue from that section's portal accent (see CardPortal's
// `atmospheres`), so the surrounding space and the card's "universe" agree
// instead of reading as two unrelated colour systems.
//
// Every layer's background is a *static* string. Travel is expressed purely
// by cross-fading their opacities (and drifting them), which the compositor
// handles without repainting — the reason this can afford far more colour
// than the single animated gradient it replaces. Consecutive regions share
// each other's stops as their fade edges, so the sum stays ~1 throughout and
// there is never a gap or a double-bright seam.
type SpaceRegion = {
  id: string;
  /** Progress this region is fully established at. */
  at: number;
  /** Static, layered radial gradients — the region's "shape" in space. */
  background: string;
  /**
   * Vertical drift across the whole flight, as a % of the layer's own
   * height. Layers are 200vh tall and inset -50vh top/bottom, so anything
   * past about -20% pulls the layer's bottom edge up into frame as a visible
   * horizontal seam. Kept well inside that.
   */
  drift: number;
};

// Anchored to the panels themselves, not to copies of their coordinates: a
// region that repeats "0.22" keeps pointing at where Skills used to be the
// first time a stop moves, and the card then flies through someone else's
// colour. `dusk` and `void` have no card of their own and keep literals.
const SPACE_REGIONS: SpaceRegion[] = [
  {
    // Departure — still inside a lit atmosphere, brightest point of the trip.
    id: "departure",
    at: 0,
    background:
      "radial-gradient(130% 90% at 50% -15%, rgba(186,230,253,0.3) 0%, rgba(56,189,248,0.16) 32%, rgba(12,74,110,0.1) 58%, transparent 78%), linear-gradient(180deg, #05263f 0%, #021421 100%)",
    drift: -3,
  },
  {
    // Skills — teal gas cloud, matching that portal's #2dd4bf.
    id: "teal",
    at: sectionProgressMap.skills,
    background:
      "radial-gradient(90% 70% at 22% 38%, rgba(45,212,191,0.17) 0%, rgba(13,148,136,0.08) 42%, transparent 70%), radial-gradient(80% 60% at 82% 72%, rgba(14,165,233,0.11) 0%, transparent 62%), linear-gradient(180deg, #02191e 0%, #010d11 100%)",
    drift: -6,
  },
  {
    // Projects — electric blue trench, the deepest "open water" stretch.
    id: "azure",
    at: sectionProgressMap.projects,
    background:
      "radial-gradient(100% 80% at 74% 32%, rgba(96,165,250,0.18) 0%, rgba(37,99,235,0.09) 40%, transparent 70%), radial-gradient(70% 60% at 18% 76%, rgba(129,140,248,0.1) 0%, transparent 60%), linear-gradient(180deg, #05132b 0%, #010611 100%)",
    drift: -9,
  },
  {
    // Experience — a violet nebula, the deepest point of the trip and the
    // exact colour of that card's own accent (#a78bfa), so the card bleeds
    // into the sky rather than ending at its edge. This was the run's one hot
    // colour (amber, with a rose second light); it kept the second half from
    // being a single blue dissolve, but at the cost of a highway-sign yellow
    // in the middle of deep space. Separation now comes from hue distance
    // inside the cold half of the wheel instead of from temperature.
    id: "violet",
    at: sectionProgressMap.experience,
    background:
      "radial-gradient(95% 75% at 30% 62%, rgba(167,139,250,0.16) 0%, rgba(124,58,237,0.08) 38%, transparent 68%), radial-gradient(75% 60% at 80% 24%, rgba(217,70,239,0.08) 0%, transparent 60%), linear-gradient(180deg, #0d0620 0%, #050209 100%)",
    drift: -12,
  },
  {
    // The stretch between Experience and Contact — no card sits here, it is
    // travel. Indigo: the violet above cooling toward the void rather than a
    // colour of its own.
    id: "dusk",
    at: 0.81,
    background:
      "radial-gradient(90% 70% at 62% 44%, rgba(129,140,248,0.13) 0%, rgba(79,70,229,0.07) 40%, transparent 68%), linear-gradient(180deg, #080a1d 0%, #020308 100%)",
    drift: -15,
  },
  {
    // Contact and the tail — the void. Almost no colour left to give.
    id: "void",
    at: 0.94,
    background:
      "radial-gradient(80% 60% at 50% 40%, rgba(125,211,252,0.06) 0%, transparent 58%), linear-gradient(180deg, #000104 0%, #000000 100%)",
    drift: -18,
  },
];

function SpaceRegionLayer({
  region,
  index,
  scrollProgress,
}: {
  region: SpaceRegion;
  index: number;
  scrollProgress: MotionValue<number>;
}) {
  const previous = SPACE_REGIONS[index - 1]?.at ?? region.at;
  const next = SPACE_REGIONS[index + 1]?.at ?? region.at;

  // First and last regions hold rather than fade off the ends of the track:
  // the opening must be fully lit at progress 0, and the void must still be
  // solid at 1, so neither gets a ramp on its outer side.
  const isFirst = index === 0;
  const isLast = index === SPACE_REGIONS.length - 1;
  const stops = toStrictlyIncreasing([
    isFirst ? 0 : previous,
    region.at,
    isLast ? 1 : next,
  ]);
  const opacity = useTransform(scrollProgress, stops, [
    isFirst ? 1 : 0,
    1,
    isLast ? 1 : 0,
  ]);
  const y = useTransform(scrollProgress, [0, 1], ["0%", `${region.drift}%`]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-y-1/2 inset-x-0"
      style={{ background: region.background, opacity, y }}
    />
  );
}

// A card's natural stop puts it almost on the CSS perspective camera. That
// is useful as a pass-through moment while scrolling, but it is the wrong
// place to hold an autoplay scene: copy gets cropped and the portal swallows
// the viewport. Every navigation now lands just before that point in the
// card's readable "slot", where the whole panel has room to breathe.
const CARD_SLOT_MIN_APPROACH = 0.045;

function getNavTargetProgress(targetId: string) {
  const index = cards.findIndex((c) => c.id === targetId);
  if (index === -1) return sectionProgressMap[targetId];
  return getCardSlotProgress(index);
}

function getActiveSectionId(progress: number) {
  let activeId = cards[0]?.id ?? "home";
  for (let i = 0; i < cards.length; i++) {
    const stop = getCardSlotProgress(i);
    if (progress >= stop) activeId = cards[i].id;
  }
  return activeId;
}

const RESUME_PDF_URL = "/umar-suhail-resume-2026.pdf";
const RESUME_TEX_URL = "/resume.tex";

function getRevealWindow(index: number) {
  if (index === 0) return { start: 0, end: 0.01 };
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

  return { start: Math.min(start, slot - 0.01), end: slot };
}

function getFocusWindow(index: number) {
  const previous = index > 0 ? sectionProgressStops[index - 1] : 0;
  const current = sectionProgressStops[index];
  const next = index < sectionProgressStops.length - 1 ? sectionProgressStops[index + 1] : 1;
  const leftSpan = Math.max(current - previous, 0.08);
  const rightSpan = Math.max(next - current, 0.08);
  const slot = getCardSlotProgress(index);

  return {
    start: Math.max(previous, slot - leftSpan * 0.38),
    peak: slot,
    end: Math.min(current + rightSpan * 0.65, 1),
  };
}

// Fixed span (matching the skills card's natural gap-to-next-card width) so
// every card gets the same pass-through hang time near the camera's
// perspective singularity, instead of it varying with how far away each
// card's own next-card progress stop happens to be.
const DEPART_SPAN = 0.34;

// Autopilot pacing: every section gets the same slot of wall-clock time, so
// the tour is on a fixed, predictable clock the soundtrack can be cut
// against — section one lands at 0:10, section two at 0:20, and so on.
// Pacing by distance instead made each leg a different length and the audio
// drifted out of sync with the cards. Within a slot the camera flies for
// TRAVEL and then parks on the card for the remainder.
const AUTOPILOT_SECTION_SECONDS = 10;
const AUTOPILOT_HOLD = 3.5;
const AUTOPILOT_TRAVEL = AUTOPILOT_SECTION_SECONDS - AUTOPILOT_HOLD;
const AUTOPILOT_TECH_TRAVEL = 0.72;
const AUTOPILOT_TECH_HOLD = 0.9;

// The last real card (contact) and the tail beyond it (the earth/moon/end-
// credits payoff) both get more time than the standard mid-tour hold —
// they're the close of the tour, not a stop along the way.
const AUTOPILOT_CONTACT_HOLD = 7;
const AUTOPILOT_TAIL_HOLD = 8;

// Progress by which the last billboard must be fully gone. Everything in the
// closing sequence is timed against this: the black void reaches full
// opacity here, and the closing beat only begins fading in afterwards, so
// the corridor is genuinely empty before the ending is shown.
const LAST_CARD_CLEARED = 0.95;

function getDepartWindow(index: number) {
  const current = sectionProgressStops[index];
  const next =
    index < sectionProgressStops.length - 1 ? sectionProgressStops[index + 1] : 1;
  // Cards near the very end of the scroll don't have a full DEPART_SPAN of
  // room left before progress hits 1 — clamping start/end independently
  // would collapse the window to nothing and leave the card stuck fully
  // opaque forever (progress can never exceed 1 to reach the "faded" end
  // keyframe). Shrink the span itself so `end` always lands under 1.
  //
  // Most cards sit far closer together (0.11-0.13 apart) than DEPART_SPAN
  // (0.34). Each departure therefore has to clear before the next card's
  // readable slot, or an autoplay hold would stack a blown-up outgoing panel
  // over its newly framed replacement.
  const span = Math.min(DEPART_SPAN, (1 - current) / 0.85, (next - current) / 0.85);
  let start = Math.min(current + span * 0.3, 1);
  let end = Math.min(current + span * 0.85, 1);

  // A card leaving into the technology layover has to be *gone* before it,
  // not merely dimming through it. The Skills card is the case this exists
  // for: its gap to Projects is wide enough that the generic maths gave it a
  // departure running to 0.509, so the billboard sat at pass-through size
  // across most of the toolkit. The fade is pulled forward into the room
  // between its own stop and the first tool instead.
  if (current < TECHNOLOGY_LAYOVER_START && next > TECHNOLOGY_LAYOVER_START) {
    end = Math.min(end, TECHNOLOGY_LAYOVER_START - 0.01);
    start = Math.min(start, end - 0.06);
  }

  // The final card is the exception. Every other card's fade ends when the
  // next card arrives, but this one has no successor, so the generic maths
  // stretched its fade all the way to progress 1.0 — meaning it was still
  // ~half opaque, and blown up to pass-through size, underneath the entire
  // closing beat. (That is what put fragments of the contact copy behind
  // the signature.) Finish it before the closing content arrives instead,
  // which is what LAST_CARD_CLEARED exists to pin down.
  if (index === sectionProgressStops.length - 1) {
    end = Math.min(end, LAST_CARD_CLEARED);
  } else {
    const nextSlot = getCardSlotProgress(index + 1);
    end = Math.min(end, Math.max(start + 0.0005, nextSlot - 0.008));
  }

  return { start, end };
}

function toStrictlyIncreasing(values: number[]) {
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(Math.max(values[i], out[i - 1] + 0.0005));
  }
  return out;
}

// Snap landings keep the document scrollable and accessible while making a
// gesture land somewhere chosen. Which landings exist is the gear's call —
// first gear has none at all.
function snapMarkerTop(progress: number) {
  // Converted out of flight progress: these are absolutely positioned down the
  // track, and the track is scroll. A marker left in progress would sit at the
  // right moment of the flight in the wrong place in the document.
  const percentage = Number((scrollFromProgress(progress) * 100).toFixed(4));
  // The target progress maps over containerHeight - viewportHeight, not the
  // full track. Expanded form avoids CSS multiplication while remaining
  // responsive to orientation and browser-toolbar changes.
  return `calc(${percentage}% - ${percentage}dvh)`;
}

function RotatingHomeHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % HOME_HEADLINE_PHRASES.length);
    }, HOME_HEADLINE_HOLD_MS);

    return () => window.clearInterval(interval);
  }, []);

  const phrase = HOME_HEADLINE_PHRASES[phraseIndex];

  return (
    <span className="block">
      <span className="block">I build</span>
      <span className="mt-1.5 flex min-h-[1.2em] items-start gap-2 sm:mt-2">
        <span aria-hidden="true" className="mt-[0.42em] flex shrink-0 gap-1">
          {HOME_HEADLINE_PHRASES.map((item, index) => (
            <motion.span
              key={item}
              initial={false}
              animate={{
                opacity: index === phraseIndex ? 1 : 0.28,
                scale: index === phraseIndex ? 1 : 0.65,
              }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="h-1.5 w-1.5 rounded-full bg-sky-200"
            />
          ))}
        </span>
        <span className="relative block h-[1.2em] min-w-0 flex-1 overflow-hidden leading-none">
          <AnimatePresence initial={false} mode="wait">
            <motion.em
              key={phrase}
              initial={{ opacity: 0, y: "0.46em" }}
              animate={{ opacity: 1, y: "0em" }}
              exit={{ opacity: 0, y: "-0.42em" }}
              transition={{ duration: 0.34, ease: "easeOut" }}
              className="absolute inset-x-0 top-0 block whitespace-nowrap font-normal italic text-sky-200"
            >
              {phrase}
            </motion.em>
          </AnimatePresence>
        </span>
      </span>
    </span>
  );
}

function BillboardCard({
  card,
  index,
  isMobile,
  isStacked,
  mobileOffsetScale,
  smoothScrollProgress,
  revealStart,
  revealEnd,
}: {
  card: FlightCard;
  index: number;
  isMobile: boolean;
  /** Portrait phones only — see the flag's definition in MultiverseFlight. */
  isStacked: boolean;
  mobileOffsetScale: number;
  smoothScrollProgress: MotionValue<number>;
  revealStart: number;
  revealEnd: number;
}) {

  // The flight renders at every viewport now, portrait phones included, and
  // all of them read the same way: billboards staggered left and right
  // through the corridor, not a stack of centred full-width slabs. `isMobile`
  // scales things down (type, padding), and `mobileOffsetScale` — derived
  // from the actual viewport width rather than a flat constant — keeps the
  // left/right stagger from pushing a card off a narrow phone's edges.
  // The home bio opens exactly as its narration reaches "development", not
  // on a separate timer that can drift from the audio.
  const pdfDownloadRef = useRef<DownloadIconHandle>(null);
  const texDownloadRef = useRef<DownloadIconHandle>(null);
  const [autoExpandHome, setAutoExpandHome] = useState(false);
  const hasAutoExpandedHomeRef = useRef(false);
  // Tracks the bio's real expanded state (manual toggle included, not just
  // the one-way autopilot trigger) so the portal can swap its visual to
  // match — the astronaut only belongs on screen while the full bio reads.
  const [isHomeExpanded, setIsHomeExpanded] = useState(false);
  useEffect(() => {
    if (card.id !== "home") return;

    const words = card.description.trim().split(/\s+/);
    const developmentWordIndex = words.findIndex(
      (word) => word.replace(/[^a-z]/gi, "").toLowerCase() === "development",
    );
    if (developmentWordIndex < 0) return;

    let wordOffset = 0;
    let trigger:
      | { spanIndex: number; wordIndex: number; words: number }
      | undefined;
    for (const segment of narrationSegments.home ?? []) {
      if (developmentWordIndex < wordOffset + segment.words) {
        trigger = {
          spanIndex: segment.spanIndex,
          wordIndex: developmentWordIndex - wordOffset,
          words: segment.words,
        };
        break;
      }
      wordOffset += segment.words;
    }
    if (!trigger) return;

    const onLaunch = () => {
      hasAutoExpandedHomeRef.current = false;
      setAutoExpandHome(false);
    };
    const onNarrationProgress = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          active?: boolean;
          spanIndex?: number;
          currentTime?: number;
          duration?: number;
        }>
      ).detail;
      if (
        !detail?.active ||
        detail.spanIndex !== trigger.spanIndex ||
        hasAutoExpandedHomeRef.current
      ) {
        return;
      }

      const duration = detail.duration ?? 0;
      if (duration <= 0) return;
      const progress = Math.min(1, Math.max(0, (detail.currentTime ?? 0) / duration));
      const currentWordIndex = Math.min(
        trigger.words - 1,
        Math.floor(progress * trigger.words),
      );
      if (currentWordIndex < trigger.wordIndex) return;

      hasAutoExpandedHomeRef.current = true;
      setAutoExpandHome(true);
    };

    window.addEventListener("flight-autopilot-launch", onLaunch);
    window.addEventListener("narration-progress", onNarrationProgress as EventListener);
    return () => {
      window.removeEventListener("flight-autopilot-launch", onLaunch);
      window.removeEventListener("narration-progress", onNarrationProgress as EventListener);
    };
  }, [card.description, card.id]);

  // Stacked cards are only ~330px wide: ragged-left copy (items-end) throws
  // every line's start edge around and costs real legibility at that
  // measure, so the vertical layout reads flush left whichever side of the
  // corridor the billboard hangs on. The left/right identity is still
  // carried by the card's own lateral offset.
  const alignmentClass = isStacked
    ? "items-start text-left"
    : card.align === "left"
      ? "items-start text-left"
      : "items-end text-right";
  const titleClass = "text-sky-50";
  const bodyClass = "text-slate-100/90";
  const panelClass = "border-white/20 shadow-[0_24px_90px_rgba(2,8,23,0.52)]";
  const badgeClass = "border-emerald-200/20 bg-emerald-200/10 text-emerald-100";
  const buttonClass = "border-sky-200/25 bg-white/10 text-sky-50 hover:bg-white/16";
  const cardGradient = cardGradients[index % cardGradients.length];
  const targetCard = cards[index + 1] ?? cards[0];
  const actionLabel = index === cards.length - 1 ? "Restart" : "Next";
  
  // Refined 3D rotation parameters. The entry card is the first thing the
  // visitor sees with no scroll context to explain the tilt, so it faces the
  // camera square-on — the angled billboards only start once the flight does.
  const isEntry = index === 0;
  const depth = isMobile ? CARD_DEPTH.mobile : CARD_DEPTH.desktop;
  const baseRotateY = isEntry ? 0 : card.align === "left" ? 10 : -10;
  const baseRotateX = isEntry ? 0 : 4;

  const focus = getFocusWindow(index);
  const depart = getDepartWindow(index);
  const cameraTravel = cameraTravelFor(isMobile);
  const cardTranslateZ = useTransform(
    smoothScrollProgress,
    (progress) =>
      Math.min(card.z, MAX_CARD_CAMERA_Z - progress * cameraTravel),
  );
  const fadeStops = toStrictlyIncreasing([0, revealStart, revealEnd, depart.start, depart.end]);
  
  const upcomingOpacity = useTransform(
    smoothScrollProgress,
    fadeStops,
    [index === 0 ? 1 : 0.0, index === 0 ? 1 : 0.42, 1, 1, 0.0]
  );
  const upcomingBlur = useTransform(
    smoothScrollProgress,
    fadeStops,
    [index === 0 ? 0 : 4, index === 0 ? 0 : 1.2, 0, 0, 3]
  );
  const upcomingScale = useTransform(
    smoothScrollProgress,
    fadeStops,
    [index === 0 ? 1 : 0.85, index === 0 ? 1 : 0.95, 1, 1, 1.1]
  );
  
  // Strictly increasing — the entry card's window collapses to start === peak
  // (both 0), and a duplicated breakpoint makes the interpolation ambiguous.
  const straightening = useTransform(
    smoothScrollProgress,
    toStrictlyIncreasing([focus.start, focus.peak, focus.end]),
    [0, 1, 0]
  );

  const activeRotateY = useTransform(straightening, (v) => baseRotateY * Math.max(0, 1 - v * 1.5));
  const activeRotateX = useTransform(straightening, (v) => baseRotateX * Math.max(0, 1 - v * 2));

  // Depth that opens as the card arrives. Held shallow while the billboard is
  // still a shape in the distance and pushed past its resting offset as the
  // card straightens to face the camera, so the portal reads as a window
  // rising out of the panel on approach rather than a picture pasted at a
  // fixed height. Both are motion values on layers that are already promoted,
  // so the whole effect is a transform on an existing texture — it adds no
  // layer, no repaint and no per-frame React work.
  const portalDepth = useTransform(
    straightening,
    [0, 1],
    [depth.portal * 0.45, depth.portal * 1.3],
  );
  const copyDepth = useTransform(straightening, [0, 1], [depth.copy * 0.45, depth.copy]);

  const activeReadabilityBoost = useTransform(straightening, [0, 1], [0, 1]);
  const effectiveOpacity = useTransform(() => Math.min(1, upcomingOpacity.get() + activeReadabilityBoost.get() * 0.38));
  // A continuously-animating blur() is one of the most expensive styles on
  // the page: every fractional radius change forces the compositor to
  // re-rasterize the whole card layer (large, box-shadowed, rounded), and
  // during scroll that was happening on every frame for every card at once.
  // Quantizing to 0.5px steps keeps the visual identical while cutting the
  // re-rasters to a handful per transit — and "none" (rather than blur(0px))
  // while a card is sharp frees the compositor from the filter entirely in
  // the state cards spend most of their time in.
  // Off entirely on phones, and not merely reduced.
  //
  // Two reasons, and the second is the one that matters on iOS. First, cost: a
  // fractional blur radius re-rasterizes the whole card — gradient, border,
  // rounded corners, 90px shadow — and a mobile GPU pays far more for that
  // than a desktop one, for a depth cue that is barely visible on a card a
  // third of the size and already separated by opacity and scale.
  //
  // Second, `filter` is a CSS *grouping property*: any value other than
  // `none` forces `transform-style: flat` on the element it is set on. This
  // card declares `preserve-3d` and has children standing off its face at
  // translateZ. Blink tolerates that; WebKit is stricter about flattening a
  // grouped child into its parent's plane, which is what collapses the
  // corridor's depth on Safari and iOS and leaves every card drawn at the
  // same size side by side. Returning a constant `none` removes the property
  // from the element altogether rather than toggling it, which is the only
  // form of this that is safe.
  const cardFilter = useTransform(() => {
    if (isMobile) return "none";
    const raw = upcomingBlur.get() * (1 - straightening.get());
    const stepped = Math.round(raw * 2) / 2;
    return stepped <= 0 ? "none" : `blur(${stepped}px)`;
  });
  // Faded-out cards are still hit-testable — and since every card is
  // absolutely stacked in the same container, the later ones sit on top and
  // swallow clicks meant for the card actually in view (that's what made
  // "Next" unclickable once a card filled the screen). Drop them out of
  // hit-testing while they're not readable.
  const cardPointerEvents = useTransform(effectiveOpacity, (o) =>
    o > 0.55 ? "auto" : "none",
  );
  // Opacity alone is not sufficient around a CSS perspective singularity.
  // Chromium can retain a nearly-transparent promoted layer for a frame as
  // it crosses the camera plane, then project that cached texture backwards
  // across the viewport. `visibility` removes a departed layer from painting
  // after its opacity reaches zero. Upcoming cards remain renderable because
  // their long, faint approach is an intentional part of the corridor depth.
  const cardVisibility = useTransform(smoothScrollProgress, (progress) =>
    progress >= depart.end ? "hidden" : "visible",
  );

  return (
    <motion.div
      style={{
        translateZ: cardTranslateZ,
        rotateY: activeRotateY,
        rotateX: activeRotateX,
        opacity: effectiveOpacity,
        filter: cardFilter,
        scale: upcomingScale,
        background: cardGradient,
        // The card is a real 3D surface: it is tilted and pushed down the
        // corridor by the parent group, and its own contents sit at different
        // depths *on* that surface (see CARD_DEPTH below), so the portal
        // parallaxes against the copy as the billboard turns. That is the
        // "sailing" the flight is built around.
        //
        // What makes it affordable is that every element actually placed in
        // this 3D context declares its own `will-change: transform`. A 3D
        // rendering context defeats the compositor's layer caching for any
        // descendant it has to re-sort each frame; promoting the handful that
        // genuinely live at a depth means those are cached textures the GPU
        // re-projects, and nothing else in the subtree pays for the context.
        // Without that promotion this same preserve-3d cost ~65% of the
        // frame's rasterization.
        transformStyle: "preserve-3d",
        pointerEvents: cardPointerEvents,
        visibility: cardVisibility,
        // The flight is a scale animation, and scale is the one transform a
        // compositor cannot fake: without this the card is not a layer of its
        // own, so Chrome re-rasterizes the whole panel — gradient, border,
        // rounded corners and that 90px-blur shadow — at every new scale on
        // the way down the corridor. A trace of a wheel scroll was 4.5s of
        // RasterTask against 1.1s of script. Declaring the transform up front
        // promotes the card and locks its raster scale, so the panel is
        // painted once and the GPU scales the texture.
        willChange: "transform",
      }}
      initial={false}
      animate={{
        // Narrower than the desktop clamp so there is room either side for the
        // lateral offsets, but wide enough that the headline still gets a real
        // measure once the portal takes its share. Stacked cards no longer
        // give a third of that width away to the portal, so they can afford
        // to be wider — and need to be, since the headline now gets the full
        // card measure rather than what is left beside the portal.
        width: isStacked
          ? "min(82vw, 400px)"
          : isMobile
            ? "min(66vw, 500px)"
            : card.width,
        // Same left/right stagger as desktop, scaled down to fit the
        // narrower viewport instead of being zeroed out — mobileOffsetScale
        // is proportional to actual viewport width, so a landscape phone
        // (wide) keeps close to the original stagger while a narrow
        // portrait phone gets a much smaller one, keeping the card on
        // screen instead of clipping off its edges.
        translateX: isMobile ? card.x * mobileOffsetScale : card.x,
      }}
      transition={PHYSICS.expansion}
      // Named group so the portal's own artwork can answer a hover anywhere
      // on the billboard, not just on the window it sits in (CardPortal
      // already owns a plain `group` for its arrow). Cards that have faded
      // out set pointerEvents: "none" above, so only the card actually in
      // view can be hovered.
      className={`group/card absolute flex rounded-3xl border sm:rounded-4xl ${
        isMobile ? "p-4" : "p-5 sm:p-8 lg:p-10"
      } ${panelClass}`}
    >
      <div
        // flex-col-reverse, not flex-col: the portal is last in the DOM (so
        // the copy is what a screen reader and the page's own reading order
        // reach first) but leads visually, which is what makes the stacked
        // version read as the same billboard turned upright rather than as a
        // block of text with a picture tacked underneath.
        className={`flex w-full ${
          isStacked
            ? "flex-col-reverse items-stretch gap-3.5"
            : `items-stretch ${isMobile ? "gap-3" : "gap-5 sm:gap-8"} ${
                card.align === "right" ? "flex-row-reverse" : "flex-row"
              }`
        }`}
        // Carries the 3D context down to the copy/portal pair below, which
        // is where the depth actually lives.
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          className={`flex min-w-0 flex-1 flex-col ${alignmentClass}`}
          style={{
            opacity: useTransform(activeReadabilityBoost, [0, 1], [0.85, 1]),
            // The copy sits just proud of the card's face — enough that it
            // separates from the panel as the billboard turns, not so much
            // that it reads as a floating label.
            translateZ: copyDepth,
            willChange: "transform",
          }}
        >
          {/* Tailwind breakpoints are width-based, so they can't tell a 956px
             landscape phone from a laptop — the compact scale is driven off
             the isMobile prop instead. */}
          {/* No self-start here — the column's items-start/items-end from
             alignmentClass is what sides these with the card. */}
          {/* The expanded home portal carries the particle logo. */}
          <span
            className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-[0.24em] ${
              isMobile ? "gap-1 px-2.5 py-1 text-[9px]" : "gap-1.5 px-4 py-2 text-xs tracking-[0.32em]"
            } ${badgeClass}`}
          >
            <CardIcon id={card.id} size={isMobile ? 10 : 13} />
            {card.eyebrow}
          </span>
          <h2
            className={`${card.id === "home" ? "w-full max-w-none tracking-normal" : "max-w-[22ch]"} font-semibold leading-tight ${
              isStacked
                ? card.id === "home"
                  ? "mt-3 text-3xl"
                  : "mt-3 text-xl"
                : isMobile
                  ? card.id === "home"
                    ? "mt-3 text-2xl"
                    : "mt-2.5 text-lg"
                  : card.id === "home"
                    ? "mt-5 text-4xl sm:mt-6 sm:text-5xl xl:text-6xl"
                    : "mt-5 text-2xl sm:mt-6 sm:text-3xl lg:text-5xl"
            } ${titleClass}`}
          >
            {card.id === "home" ? <RotatingHomeHeadline /> : card.title}
          </h2>
          {card.id === "home" && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-100/55 sm:mt-4 sm:text-xs">
              <span>Frontend systems</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-sky-200/75" />
              <span>Product craft</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-sky-200/75" />
              <span>Performance</span>
            </div>
          )}
          {/* Home carries the full narrated bio (all four paragraphs) — too
             long for a billboard card to show outright, so it collapses to a
             short preview with a "Read more" that grows the card in place. */}
          {card.id === "home" ? (
            <ExpandableText
              className={`max-w-[46ch] ${isMobile ? "mt-2" : "mt-4 max-w-[38ch] sm:mt-5"}`}
              collapsedHeight={isStacked ? "4.6em" : isMobile ? "3.3em" : "4.5em"}
              forceExpanded={autoExpandHome}
              onExpandedChange={setIsHomeExpanded}
            >
              <p
                className={`${
                  isStacked
                    ? "text-xs leading-[1.55]"
                    : isMobile
                      ? "text-[11px] leading-[1.45]"
                      : "text-sm leading-6 sm:text-base sm:leading-7 lg:text-xl"
                } ${bodyClass}`}
              >
                <NarratedText id={card.id} text={card.description} />
              </p>
            </ExpandableText>
          ) : card.id !== "resume" ? (
            <p
              className={`max-w-[46ch] ${
                isStacked
                  ? "mt-2.5 line-clamp-4 text-xs leading-[1.55]"
                  : isMobile
                    ? "mt-2 line-clamp-4 text-[11px] leading-[1.45]"
                    : "mt-4 max-w-[38ch] text-sm leading-6 sm:mt-5 sm:text-base sm:leading-7 lg:text-xl"
              } ${bodyClass}`}
            >
              <NarratedText id={card.id} text={card.description} />
            </p>
          ) : null}
          {card.id === "resume" ? (
            // The resume card downloads the file directly instead of opening
            // a details page — there's no extra copy to elaborate on.
            <div className={`flex items-center gap-3 ${isMobile ? "mt-3" : "mt-6 sm:mt-8"}`}>
              <a
                href={RESUME_PDF_URL}
                download
                onMouseEnter={() => pdfDownloadRef.current?.startAnimation()}
                onMouseLeave={() => pdfDownloadRef.current?.stopAnimation()}
                className={`inline-flex items-center gap-2 rounded-full border font-semibold transition duration-300 ${
                  isMobile ? "px-4 py-1.5 text-[11px]" : "px-6 py-3 text-sm hover:-translate-y-1"
                } ${buttonClass}`}
              >
                <DownloadIcon ref={pdfDownloadRef} size={isMobile ? 12 : 16} aria-hidden="true" />
                PDF
              </a>
              <a
                href={RESUME_TEX_URL}
                download
                onMouseEnter={() => texDownloadRef.current?.startAnimation()}
                onMouseLeave={() => texDownloadRef.current?.stopAnimation()}
                className={`inline-flex items-center gap-2 rounded-full border font-semibold transition duration-300 ${
                  isMobile ? "px-4 py-1.5 text-[11px]" : "px-6 py-3 text-sm hover:-translate-y-1"
                } ${buttonClass}`}
              >
                <DownloadIcon ref={texDownloadRef} size={isMobile ? 12 : 16} aria-hidden="true" />
                TeX
              </a>
            </div>
          ) : (
            // Opens the section's own page rather than expanding in place, so
            // each section is a real, crawlable URL.
            <Link
              href={`/${card.id}`}
              className={`inline-block rounded-full border font-semibold transition duration-300 ${
                isMobile
                  ? "mt-3 px-4 py-1.5 text-[11px]"
                  : "mt-6 px-6 py-3 text-sm hover:-translate-y-1 sm:mt-8"
              } ${buttonClass}`}
            >
              {card.cta}
            </Link>
          )}
        </motion.div>


        <motion.div
          initial={false}
          animate={{
            width: isStacked
              ? "100%"
              : isMobile
                ? COMPACT_PORTAL_WIDTH
                : PORTAL_WIDTH,
          }}
          transition={PHYSICS.expansion}
          style={{
            // The portal stands furthest off the card face — it is the window
            // the flight is aimed at, so it leads the turn.
            translateZ: portalDepth,
            willChange: "transform",
          }}
          // Turned on its side the portal becomes a letterbox across the top
          // of the card: the tall min-height that gives it presence beside
          // the copy would otherwise eat two thirds of a phone's screen and
          // leave nothing for the copy it is meant to introduce. Height is
          // capped in vh so the whole stacked card still clears a short
          // portrait viewport.
          className={`relative block shrink-0 transform-flat overflow-hidden rounded-2xl lg:rounded-3xl ${
            isStacked
              ? "h-[clamp(10rem,26vh,15rem)]"
              : "min-h-[min(16.25rem,42vh)]"
          }`}
        >
          <CardPortal
            index={index}
            scrollYProgress={smoothScrollProgress}
            align={card.align}
            targetId={targetCard.id}
            actionLabel={actionLabel}
            ariaLabel={`Fly to ${targetCard.eyebrow.replace(/^\d+\s*\/\s*/, "")}`}
            isExpanded={card.id === "home" && isHomeExpanded}
            letterbox={isStacked}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function MultiverseFlight() {
  const containerRef = useRef<HTMLDivElement>(null);
  // The gearbox both inputs read; see lib/travel-gear.ts. Only its snap
  // setting matters here — the dial reads the same object for its own ratio.
  const gear = useTravelGear();
  // `compact` drives the smaller in-flight card sizing. The flight now runs
  // at every viewport — portrait phones included — with `mobileOffsetScale`
  // (derived from the actual viewport width below) keeping the left/right
  // card stagger from overflowing a narrow screen.
  // Only *derived* viewport facts are held in state, never raw innerWidth /
  // innerHeight. A mobile browser fires `resize` every time the URL bar
  // slides away mid-scroll, and raw height in state turns each of those into
  // a re-render of this entire component — seven billboards, seven portals,
  // every space region — right in the middle of the scroll it is reacting
  // to. Every value below is quantized or boolean, so React's own bail-out
  // on unchanged primitives absorbs the resize storm and the tree only
  // re-renders when something a human could actually see has changed.
  const [compact, setCompact] = useState(false);
  // Height matters as much as width for the closing beat: the mark is a
  // square, so on a landscape phone (844x390) a width-derived size overflows
  // the viewport vertically and the signature under it is simply cut off.
  // See `endMarkBox` below for how the URL bar is kept out of that sum.
  const [endMarkBox, setEndMarkBox] = useState(0);
  // A portrait phone is the one viewport where the side-by-side billboard
  // (copy beside a tall portal) stops working: 66vw of 390px leaves the
  // headline about 14 characters of measure. Those cards stack instead —
  // portal on top, copy beneath — which is the same billboard, just turned
  // through 90°. Landscape phones are short and wide and keep the original
  // row layout, where stacking would push the copy straight off screen.
  const [isStacked, setIsStacked] = useState(false);
  // The left/right card stagger (card.x) was tuned against a landscape
  // phone's wide viewport (~700-930px), where a flat 0.45 multiplier keeps
  // every card on screen. A portrait phone is much narrower (~375-430px),
  // where that same multiplier pushes a card's edge past the viewport —
  // scaling proportionally to actual width keeps the stagger present but
  // safely on screen at every size, landscape included (viewportWidth=900
  // recovers ~0.45, the original tuning). Clamped so it never vanishes
  // entirely (some stagger reads better than a dead-centered stack) or
  // exceeds the original desktop-mobile feel, and quantized to 0.005 so a
  // one-pixel width report cannot re-render the flight.
  const [mobileOffsetScale, setMobileOffsetScale] = useState(0.45);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const width = window.innerWidth;
      const height = window.innerHeight;

      setCompact(width < 1024);
      setIsStacked(width < 1024 && height > width);
      setMobileOffsetScale(
        Math.round(
          Math.min(0.45, Math.max(0.16, (width / 900) * 0.45)) * 200,
        ) / 200,
      );

      // --- Closing-beat sizing ------------------------------------------
      // The mark used to take a fixed 250/340px with a `min(64vw, 460px)`
      // box, both of which ignore viewport height — on a landscape phone
      // that asked for a 460px square inside 390px of screen. Sized off the
      // smaller of the two axes instead, so the whole closing composition
      // (kicker, tagline, mark, signature) fits at any aspect ratio without
      // being re-tuned per breakpoint.
      //
      // Height is rounded to 80px and the result again to 40px before it
      // reaches state. The URL bar is worth ~60-100px of innerHeight and
      // slides during scroll; without both steps that jitter would re-form
      // the particle field (a changed `size` reseeds it) and re-render the
      // flight, for a mark whose drawn size would move by under 20px.
      const quantizedHeight = Math.round(height / 80) * 80;
      const raw = Math.min(width * 0.72, quantizedHeight * 0.42, 460);
      setEndMarkBox(Math.max(160, Math.round(raw / 40) * 40));
    };

    // Coalesced into one frame: iOS can fire resize several times per URL-bar
    // transition, and only the settled metrics are worth reading.
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("resize", onResize);
    // iOS Safari fires orientationchange before the resize metrics settle
    window.addEventListener("orientationchange", onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // How far one wheel gesture lands you is the gear's decision, not this
  // component's.
  //
  // This used to hard-code `y mandatory` with a marker at every stop, which
  // made one gesture worth one whole panel — you could not scroll *through* a
  // section, only past it. First gear now turns the layer off entirely (free,
  // smooth travel), second divides each section into three landings, third
  // keeps the original panel-at-a-time jump. The flight is a continuous
  // function of scroll position either way, so nothing below this cares.
  const snapPoints = useMemo(
    () => buildSnapPoints(gear.snapStepsPerSection),
    [gear.snapStepsPerSection],
  );

  useEffect(() => {
    const root = document.documentElement;
    const previousSnapType = root.style.scrollSnapType;
    const previousSnapPadding = root.style.scrollPaddingTop;
    const snaps = gear.snapStepsPerSection > 0;

    // Two things drive the scroll position themselves and must not have
    // mandatory snapping pulling at them every frame: the autopilot tour, and
    // a hand on the dial. The dial is the reason this is not just the
    // autopilot flag any more — landings belong to the wheel, and the ring is
    // supposed to travel continuously whatever gear it is in.
    let autopilotRunning = false;
    let dialTurning = false;
    const applySnap = () => {
      root.style.scrollSnapType =
        snaps && !autopilotRunning && !dialTurning ? "y mandatory" : "none";
    };

    const onAutopilotState = (event: Event) => {
      autopilotRunning = Boolean(
        (event as CustomEvent<{ running?: boolean }>).detail?.running,
      );
      applySnap();
    };
    const onDialState = (event: Event) => {
      dialTurning = Boolean(
        (event as CustomEvent<{ turning?: boolean }>).detail?.turning,
      );
      applySnap();
    };

    applySnap();
    root.style.scrollPaddingTop = "0px";
    window.addEventListener(
      "flight-autopilot-state",
      onAutopilotState as EventListener,
    );
    window.addEventListener("flight-dial-turn", onDialState as EventListener);
    return () => {
      window.removeEventListener(
        "flight-autopilot-state",
        onAutopilotState as EventListener,
      );
      window.removeEventListener(
        "flight-dial-turn",
        onDialState as EventListener,
      );
      root.style.scrollSnapType = previousSnapType;
      root.style.scrollPaddingTop = previousSnapPadding;
    };
  }, [gear.snapStepsPerSection]);

  const isMobile = compact;
  // `endMarkBox` is 0 until the first measure lands (there is no window to
  // read during SSR); the breakpoint guess stands in for that one render.
  const markBox = endMarkBox || (isMobile ? 240 : 440);
  // Ink diameter inside that box. Mobile runs denser-to-the-edge (there is
  // less room to spend on breathing space) — these ratios reproduce the old
  // fixed pairs at their original viewports.
  const endMarkSize = Math.round(markBox * (isMobile ? 0.88 : 0.76));
  // The composition still reserves exactly `markBox`, but the transparent
  // canvas inside it is larger so interaction particles can travel beyond the
  // logo without exposing a clipped square. The viewport itself remains the
  // final, natural boundary.
  const endParticleCanvasSize = Math.round(markBox * 1.95);
  // Point count follows area, so a small mark is not over-packed and a large
  // one does not thin out into the sparse ring this started as.
  const endParticleCount = Math.round(
    Math.min(1020, Math.max(300, (endMarkSize * endMarkSize) / 115)),
  );

  const { scrollYProgress: trackScroll } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Everything below this line works in flight progress, never in raw scroll.
  // The timeline decides how much scrolling each leg costs (see
  // data/flightTimeline.ts); this is the one place that conversion happens on
  // the way in, and `scrollFromProgress` is the one used on the way out by
  // anything that writes a scroll position.
  const scrollYProgress = useTransform(trackScroll, progressFromScroll);

  // Keep document scrolling native, then give just the 3D camera a short,
  // overdamped visual follow. That removes the hard step between wheel/touch
  // updates without turning the whole page into an inertial scroller. It also
  // means buttons, audio gating, route-map state, and browser accessibility
  // retain the exact raw scroll position they already rely on.
  //
  // Autoplay calls jump() on this value from its own rAF loop, so narration
  // holds still land exactly on their readable card slots instead of easing
  // into or beyond them.
  const smoothScrollProgress = useSpring(scrollYProgress, CAMERA_SPRING);

  // The visual velocity follows the camera rather than raw document input.
  // It gives the space behind the cards a small, forward-only speed trail
  // while the ship is moving, then fades away without a flash or pull-back.
  const cameraVelocity = useVelocity(smoothScrollProgress);
  const smoothCameraVelocity = useSpring(cameraVelocity, FLIGHT_VELOCITY_SPRING);
  // Real motion blur is a function of how far the scene moved during one
  // exposure, so below a genuine speed there is none of it at all. The old
  // curve had no floor and a x7 gain, which saturated at a camera velocity of
  // ~0.14 — a gentle wheel nudge. The smear was therefore present essentially
  // whenever the page was not perfectly still, which is what made it read as
  // an effect laid over the scene rather than as speed.
  //
  // FLIGHT_BLUR_FLOOR is the deadband: drift below it and the corridor is
  // sharp. Past it the ramp is gentler, so intensity keeps climbing with
  // actual speed instead of pinning at the top the moment it engages.
  const forwardFlightIntensity = useTransform(smoothCameraVelocity, (velocity) =>
    Math.min(1, Math.max(0, Math.max(0, velocity) - FLIGHT_BLUR_FLOOR) * 3.4),
  );
  // Peaks come down with it: opacity 0.10 -> 0.065, blur 1.4px -> 0.85px, and
  // a shallower zoom and drift. Combined with the deadband above, the corridor
  // is sharp at reading speed and only smears when the flight is genuinely
  // moving.
  const flightStreakOpacity = useTransform(
    forwardFlightIntensity,
    [0, 0.25, 1],
    [0, 0.012, 0.065],
  );
  const flightStreakScale = useTransform(forwardFlightIntensity, [0, 1], [1.02, 1.05]);
  const flightStreakY = useTransform(forwardFlightIntensity, [0, 1], ["0%", "-2%"]);
  // Still always a blur() string, never "none". Toggling a filter on and off
  // makes the compositor create and destroy the layer's buffer; holding one
  // filter that happens to reach 0px costs a cheap no-op blur instead, and the
  // layer is culled by its own opacity long before that matters.
  // A full-viewport animated blur under a `mix-blend-mode: screen` layer is
  // the single most expensive composite on this page, and on a phone it is not
  // close. The opacity and scale drift alone still read as forward flow —
  // which is the part that survives on a small screen anyway — so the filter
  // is dropped rather than softened there.
  const flightStreakBlur = useTransform(forwardFlightIntensity, (value) =>
    isMobile ? "none" : `blur(${(value * 0.85).toFixed(2)}px)`,
  );

  const zCamera = useTransform(
    smoothScrollProgress,
    [0, 1],
    [0, cameraTravelFor(isMobile)],
  );

  // Colour now comes from the cross-faded SPACE_REGIONS layers below rather
  // than from animating this gradient's own colour stops. Interpolating a
  // gradient string re-paints the entire viewport on every frame it changes;
  // cross-fading fixed-colour layers is pure compositing, so the richer
  // journey actually costs *less* than the two-navy version it replaces.
  // This stays as the static floor the regions sit on.
  const deepGlowOpacity = useTransform(smoothScrollProgress, [0.4, 0.62, 1], [0, 0.85, 1]);

  // --- Parallax ---------------------------------------------------------
  // The camera flies through the cards, but every layer behind them was
  // pinned, so the space around the corridor read as a flat backdrop. Each
  // layer now travels a different distance for the same scroll: the further
  // back it sits, the less it moves. The near glow drifts the opposite way,
  // which widens the apparent gap between the planes.
  // The mid plane's job (the opening sky glow) is now the departure region's,
  // which carries its own drift — see SPACE_REGIONS.
  const parallaxFar = useTransform(smoothScrollProgress, [0, 1], ["0%", "-7%"]);
  const parallaxNear = useTransform(smoothScrollProgress, [0, 1], ["0%", "12%"]);
  // Creeping scale on the furthest plane so its edges never slide into view
  // as it translates, and so the void feels like it is opening up.
  const parallaxFarScale = useTransform(smoothScrollProgress, [0, 1], [1.05, 1.22]);
  // Follows the camera, not the document. This used to read raw scroll on the
  // grounds that the camera's settling phase was too short to matter — at the
  // softened CAMERA_SPRING above it is no longer short, and reading raw would
  // arm the whole closing beat up to a second before the camera has finished
  // flying there, dropping the mark on top of cards still clearing frame. The
  // spring converges inside restDelta, so every threshold below is still
  // reached at the document's end.
  const endEarthT = useTransform(smoothScrollProgress, [0.88, 1], [0, 1]);
  const endEarthReveal = useTransform(endEarthT, [0, 0.35, 1], [0, 1, 1]);
  // The contact card — the last billboard — holds full opacity until 0.948
  // and only finishes clearing at 1.0 (that is getDepartWindow(5), squeezed
  // because there is no track left past it). The closing beat therefore
  // cannot be armed anywhere near 0.9: doing that put the tagline, mark and
  // signature straight on top of a fully-lit card. These thresholds sit
  // inside the card's own fade, so the two crossfade instead of colliding.
  const END_ARM = 0.955;
  const END_RELEASE = 0.935;

  // Driven by the armed boolean, NOT by a scroll transform. A scroll-mapped
  // opacity looked like the safer choice (it cannot outrun the departing
  // card) but measured 0.357 at progress 0.96, 0.909 at 0.98 and then *0* at
  // exactly 1.0 — framer's scroll measurement is not dependable on the
  // document's very last pixel, so the whole ending vanished precisely where
  // it matters most. The boolean is stable there, and it is safe from the
  // original collision for a different reason: it arms at END_ARM (0.955),
  // by which point LAST_CARD_CLEARED (0.95) has already forced the final
  // billboard to finish fading. Timing, not layering, keeps them apart.

  // Scroll-bound with hysteresis — deliberately NOT a one-way latch. Latching
  // it "so the closing beat can't flicker" pinned a full-screen layer, 900
  // live canvas particles and an infinite opacity loop over the page forever:
  // scrolling back up left the mark painted across the cards and the tab
  // pegged. Separate enter/exit thresholds solve the flicker the latch was
  // reaching for while still shutting everything down on the way back out.
  const [isEndParticleActive, setIsEndParticleActive] = useState(false);

  useEffect(() => {
    const unsubscribe = smoothScrollProgress.on("change", (value) => {
      setIsEndParticleActive((prev) => {
        if (!prev && value >= END_ARM) return true;
        if (prev && value < END_RELEASE) return false;
        return prev;
      });
    });
    return unsubscribe;
  }, [smoothScrollProgress]);

  // The closing beat plays as a sequence, not all at once: the tagline
  // zooms in centered first, then — once that's had a moment to read —
  // it slides up to make room and the particle mark forms in underneath.
  // `showEndLogo` is that second beat's own delayed trigger, armed a fixed
  // stretch after the tagline first appears rather than sharing its timing.
  const [showEndLogo, setShowEndLogo] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setShowEndLogo(isEndParticleActive),
      isEndParticleActive ? 1100 : 0,
    );
    return () => window.clearTimeout(timeout);
  }, [isEndParticleActive]);

  // --- Overscroll "approach" -------------------------------------------
  // At max scroll the browser has nothing left to give, so the journey
  // would just dead-stop on a static globe. Instead we capture the wheel /
  // touch input the page can no longer consume and feed it into `pull`.
  // Every increment is damped by (1 - pull)², so each step closer costs
  // disproportionately more than the last. Keep pushing and the strain
  // eventually completes the loop (see LOOP_AT below); stop pushing and it
  // drifts back out, like slackening a tether.
  const pull = useMotionValue(0);
  const smoothPull = useSpring(pull, { stiffness: 70, damping: 18, mass: 0.7 });

  // --- The loop ---------------------------------------------------------
  // The flight comes back round to its own beginning rather than ending on
  // a wall. Pushing past the bottom builds strain; once it passes LOOP_AT,
  // the journey wraps: a black veil closes, scroll is reset to the top
  // underneath it, and the veil opens again on the departure gradient.
  //
  // The seam is hidden by where it happens, not by cleverness — the closing
  // frame is already near-black and the veil only has to cover the instant
  // of the jump, so the wrap reads as flying out of the void back into the
  // light instead of as a page reset. This reuses the tether's own
  // accumulator rather than adding a second listener competing for the same
  // wheel/touch events at the same scroll position.
  const LOOP_AT = 0.6;
  const [isWrapping, setIsWrapping] = useState(false);
  // Guards against a second trigger while a wrap is already in flight: the
  // wheel keeps firing during the veil, and each event would otherwise
  // restart the sequence.
  const wrappingRef = useRef(false);

  const runLoop = useCallback(() => {
    if (wrappingRef.current) return;
    wrappingRef.current = true;
    setIsWrapping(true);

    // Veil in, jump underneath it, then veil out. The jump is deliberately
    // instant ("auto") — a smooth scroll would animate the whole flight
    // backwards in fast-forward behind the veil.
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      pull.set(0);
      smoothPull.jump(0);
    }, 260);

    window.setTimeout(() => {
      setIsWrapping(false);
      wrappingRef.current = false;
    }, 620);
  }, [pull, smoothPull]);

  useEffect(() => {
    // Runs on touch too. This used to bail out on mobile, which was fine
    // while the tether was only a flourish — but it now carries the loop,
    // and a phone reaching the end of the flight with no way round would be
    // stuck at a dead stop.
    const PULL_IN = 0.0006; // per px of forward wheel delta
    const PULL_OUT = 0.0009; // reverse scroll pushes back out faster
    const DECAY_PER_MS = 0.0016; // drift back once the user stops pushing
    const IDLE_BEFORE_DECAY_MS = 320;
    const MAX_PULL = 0.97;

    let lastInput = 0;
    let lastTouchY: number | null = null;
    let lastFrame = performance.now();
    let raf = 0;

    // document.documentElement.scrollHeight forces a layout to read, and this
    // was read on *every* wheel event — the exact moment the main thread is
    // most contended. The value only changes when the document resizes, so
    // it is cached and invalidated rather than re-measured per event.
    let cachedScrollHeight = document.documentElement.scrollHeight;
    let cachedInnerHeight = window.innerHeight;
    const remeasure = () => {
      cachedScrollHeight = document.documentElement.scrollHeight;
      cachedInnerHeight = window.innerHeight;
    };
    window.addEventListener("resize", remeasure);

    const atBottom = () =>
      window.scrollY + cachedInnerHeight >= cachedScrollHeight - 2;

    const applyDelta = (deltaY: number) => {
      const current = pull.get();
      if (deltaY > 0) {
        // Only "pull" once the page itself is out of scroll to give
        if (!atBottom()) return;
        const resistance = (1 - current) ** 2;
        const next = Math.min(current + deltaY * PULL_IN * resistance, MAX_PULL);
        pull.set(next);
        lastInput = performance.now();
        if (next >= LOOP_AT) runLoop();
      } else if (deltaY < 0 && current > 0) {
        // Scrolling back up releases the tether before the page scrolls
        pull.set(Math.max(current + deltaY * PULL_OUT, 0));
        lastInput = performance.now();
      }
    };

    const onWheel = (e: WheelEvent) => {
      applyDelta(e.deltaY);
      ensureTicking();
    };
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null || lastTouchY == null) return;
      applyDelta((lastTouchY - y) * 2.2);
      lastTouchY = y;
      ensureTicking();
    };
    const onTouchEnd = () => {
      lastTouchY = null;
    };

    // Self-suspending: the decay loop only needs to run while there is
    // actually tension to release. It used to hold an unconditional rAF for
    // the entire session — a permanent frame subscription (and, through
    // smoothPull, a live spring driving a full-screen scale) that did nothing
    // at all except at the very bottom of the track. It now stops itself once
    // pull reaches 0 and is restarted by the next real input.
    const tick = (now: number) => {
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      if (now - lastInput < IDLE_BEFORE_DECAY_MS) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const current = pull.get();
      if (current > 0.0005) {
        pull.set(Math.max(current - dt * DECAY_PER_MS * current, 0));
        raf = requestAnimationFrame(tick);
        return;
      }
      pull.set(0);
      raf = 0;
    };

    const ensureTicking = () => {
      if (raf) return;
      lastFrame = performance.now();
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, runLoop, LOOP_AT]);

  // The closer you pull, the more it dissolves — it grows in the frame while
  // fading out of it, so the approach reads as chasing something receding
  // rather than closing a gap. Reinforces that it can never be reached.
  const endEarthOpacity = useTransform(
    () => endEarthReveal.get() * (1 - smoothPull.get() * 0.8),
  );
  // The void closes in as you strain toward it
  const approachVignette = useTransform(smoothPull, [0, 1], [0, 0.55]);
  // The scene's own gradient background is still a dark navy at this point,
  // not true black — this fades in a solid black backdrop ahead of the
  // end-of-flight content, so it arrives against a real void rather than a
  // lingering blue gradient. Now that it genuinely sits above the corridor
  // (see z-[5] on the element), it also does the job of clearing the last
  // card away: it starts only once the contact card has been read (its stop
  // is 0.92) and is fully solid by 0.95, just as the closing beat arms.
  const endVoidOpacity = useTransform(smoothScrollProgress, [0.915, 0.952], [0, 1]);
  const hintOpacity = useTransform(() => {
    const revealed = endEarthT.get() > 0.75 ? 1 : 0;
    return revealed * Math.max(0, 1 - smoothPull.get() * 5);
  });

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id?: string;
        progress?: number;
        source?: "dial";
      }>;
      const targetId = customEvent.detail?.id;
      const targetProgress =
        typeof customEvent.detail?.progress === "number"
          ? customEvent.detail.progress
          : targetId
            ? getNavTargetProgress(targetId)
            : undefined;
      const container = containerRef.current;

      if (targetProgress === undefined || !container) return;
      const containerTop = window.scrollY + container.getBoundingClientRect().top;
      const scrollableHeight = container.offsetHeight - window.innerHeight;
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      if (customEvent.detail?.source === "dial") {
        root.style.scrollBehavior = "auto";
      }
      window.scrollTo({
        top: containerTop + scrollableHeight * scrollFromProgress(targetProgress),
        behavior: customEvent.detail?.source === "dial" ? "auto" : "smooth",
      });
      if (customEvent.detail?.source === "dial") {
        requestAnimationFrame(() => {
          root.style.scrollBehavior = previousBehavior;
        });
      }
    };

    window.addEventListener("navigate-flight-section", handleNavigation as EventListener);
    window.addEventListener("navigate-flight-progress", handleNavigation as EventListener);
    return () => {
      window.removeEventListener("navigate-flight-section", handleNavigation as EventListener);
      window.removeEventListener("navigate-flight-progress", handleNavigation as EventListener);
    };
  }, []);

  // --- Autopilot --------------------------------------------------------
  // A hands-off tour: fly to each section in turn, hold long enough to read
  // it, then move on, and finish on the ending. The whole flight is already
  // a pure function of scroll position, so the tour drives nothing but
  // window.scrollY — every card, the camera and the route map follow for
  // free. Any real input from the user (wheel, touch, key) pauses the tour
  // and hands control back without discarding its resumable position.
  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let detach: (() => void) | undefined;
    let introNarrationComplete = false;
    let lifecycle: "idle" | "running" | "paused" = "idle";
    let pauseFlight: (() => void) | undefined;
    let resumeFlight: (() => void) | undefined;

    const emit = (running: boolean, index: number, paused = false) =>
      window.dispatchEvent(
        new CustomEvent("flight-autopilot-state", {
          detail: { running, paused, index, total: cards.length },
        }),
      );

    const halt = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      detach?.();
      raf = 0;
      timer = 0;
      detach = undefined;
    };

    const finish = () => {
      const hadSession = lifecycle !== "idle";
      halt();
      lifecycle = "idle";
      pauseFlight = undefined;
      resumeFlight = undefined;
      if (hadSession) emit(false, -1);
    };

    const pause = () => pauseFlight?.();

    const armHandback = () => {
      const opts = { passive: true } as const;
      window.addEventListener("wheel", pause, opts);
      window.addEventListener("touchstart", pause, opts);
      window.addEventListener("keydown", pause);
      detach = () => {
        window.removeEventListener("wheel", pause);
        window.removeEventListener("touchstart", pause);
        window.removeEventListener("keydown", pause);
      };
    };

    // Cubic ease on every leg, so each hop off a card and onto the next one
    // accelerates and settles instead of starting and stopping dead.
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

    const onNarrationProgress = (event: Event) => {
      const detail = (
        event as CustomEvent<{ active?: boolean; spanIndex?: number }>
      ).detail;
      if (!detail?.active && detail?.spanIndex === NARRATION_SPANS.length) {
        introNarrationComplete = true;
      }
    };

    const runFlight = () => {
      const container = containerRef.current;
      if (!container) return;
      introNarrationComplete = false;

      // Mutable, not a one-time snapshot: a mobile browser's dynamic toolbar
      // can change the pixel conversion during a dwell. The held progress is
      // reasserted below before every departure so the camera never pulls
      // back to correct a stale scroll position.
      let containerTop = window.scrollY + container.getBoundingClientRect().top;
      let scrollable = container.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const refreshScrollGeometry = () => {
        containerTop = window.scrollY + container.getBoundingClientRect().top;
        scrollable = container.offsetHeight - window.innerHeight;
      };

      // The container's height is a vh unit (see the `h-[2200svh]` track
      // below), so it — and the resulting `scrollable` — only actually
      // change when window.innerHeight does (the mobile-toolbar case the
      // comment above describes). Re-reading layout via
      // getBoundingClientRect()/offsetHeight on every rAF frame regardless
      // was a needless main-thread cost through the whole tour; gating the
      // real refresh behind a plain number comparison keeps the same
      // mid-dwell correction without paying for a layout read on frames
      // where nothing moved.
      let lastInnerHeight = window.innerHeight;
      const refreshScrollGeometryIfNeeded = () => {
        const innerHeight = window.innerHeight;
        if (innerHeight === lastInnerHeight) return;
        lastInnerHeight = innerHeight;
        refreshScrollGeometry();
      };

      // Takes flight progress, like every other caller in this file — the
      // timeline conversion happens here so the tour's pacing stays expressed
      // in the same units as the sections it is touring.
      const toScrollTop = (p: number) =>
        containerTop + scrollable * scrollFromProgress(p);

      // One leg per section plus the closing tail. Home's departure is gated
      // by the actual intro.wav completion event, not a nominal duration.
      type Leg = {
        target: number;
        travelMs: number;
        linear: boolean;
        holdMs: number;
        cardIndex: number;
        waitForNarration?: boolean;
      };

      const legs: Leg[] = [];

      cards.forEach((card, i) => {
        // The same readable slot used by manual navigation keeps autoplay
        // holds framed and legible instead of parking on the pass-through.
        const target = getNavTargetProgress(card.id) ?? 0;

        if (i === 0) {
          // Home stays put until intro.wav has actually ended. The next leg
          // then makes the normal camera flight to Skills.
          const next = cards[1] ? getNavTargetProgress(cards[1].id) ?? target : target;
          legs.push({
            target: 0,
            travelMs: 1,
            linear: true,
            holdMs: 1,
            cardIndex: i,
            waitForNarration: true,
          });
          legs.push({
            target: next,
            travelMs: AUTOPILOT_TRAVEL * 1000,
            linear: false,
            holdMs: 0,
            cardIndex: i,
          });
          return;
        }

        const isLast = i === cards.length - 1;
        legs.push({
          target,
          // Skills' own arrival already happened during the intro's leg
          // above — this leg only needs to hold there, not travel again.
          travelMs: i === 1 ? 1 : AUTOPILOT_TRAVEL * 1000,
          linear: false,
          holdMs: isLast ? AUTOPILOT_CONTACT_HOLD * 1000 : AUTOPILOT_HOLD * 1000,
          cardIndex: i,
        });

        if (card.id === "skills") {
          TECHNOLOGY_FOCUS_STOPS.forEach((stop) => {
            legs.push({
              target: stop.progress,
              travelMs: AUTOPILOT_TECH_TRAVEL * 1000,
              linear: false,
              holdMs: AUTOPILOT_TECH_HOLD * 1000,
              cardIndex: i,
            });
          });
        }
      });

      legs.push({
        target: 1,
        travelMs: AUTOPILOT_TRAVEL * 1000,
        linear: false,
        holdMs: AUTOPILOT_TAIL_HOLD * 1000,
        cardIndex: cards.length,
      });

      // Always departs from the beginning — a tour that starts halfway is not
      // a tour. The camera spring is snapped along with the scroll so the
      // flight doesn't replay itself in fast-forward on the way back to 0.
      window.scrollTo({ top: toScrollTop(0), behavior: "auto" });
      smoothScrollProgress.jump(0);

      let index = 0;
      let from = 0;
      let legMs = 0;
      let dwellUntil = 0;
      let dwellRemaining = 0;
      let travelElapsed = 0;
      let phaseStarted = 0;
      let phase: "starting" | "travel" | "dwell" = "starting";
      // Authoritative camera progress. Dwell states keep the document pinned
      // to this value so the next leg continues from the visible frame.
      let currentProgress = 0;

      const holdCurrentProgress = () => {
        refreshScrollGeometryIfNeeded();
        const targetScrollTop = toScrollTop(currentProgress);
        if (Math.abs(window.scrollY - targetScrollTop) <= 1) return;
        window.scrollTo({ top: targetScrollTop, behavior: "auto" });
        smoothScrollProgress.jump(currentProgress);
      };

      const beginLeg = (now: number) => {
        from = currentProgress;
        legMs = legs[index].travelMs;
        travelElapsed = 0;
        phaseStarted = now;
        phase = "travel";
        if (legs[index].cardIndex < cards.length) emit(true, legs[index].cardIndex);
      };

      // Landing on "/" right before this runs (the cross-page engage flow)
      // can still have the browser's own scroll restoration land a frame or
      // two late, shoving window.scrollY off 0 after our reset above already
      // ran. Re-assert 0 for a few frames so the visible start position
      // matches currentProgress (0) before the first leg begins easing.
      let holdFrames = 6;
      const holdAtStart = (now: number) => {
        window.scrollTo({ top: toScrollTop(0), behavior: "auto" });
        if (--holdFrames > 0) {
          raf = requestAnimationFrame(holdAtStart);
          return;
        }
        smoothScrollProgress.jump(0);
        beginLeg(now);
        raf = requestAnimationFrame(tick);
      };

      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);

        if (phase === "dwell") {
          holdCurrentProgress();
          if (now < dwellUntil) return;
          if (legs[index].waitForNarration && !introNarrationComplete) return;
          dwellUntil = 0;
          dwellRemaining = 0;
          index += 1;
          if (index >= legs.length) {
            finish();
            return;
          }
          beginLeg(now);
        }

        const t = Math.min(1, (travelElapsed + now - phaseStarted) / legMs);
        const eased = legs[index].linear ? t : ease(t);
        const p = from + (legs[index].target - from) * eased;
        currentProgress = p;
        refreshScrollGeometryIfNeeded();
        window.scrollTo({ top: toScrollTop(p), behavior: "auto" });
        // window.scrollTo doesn't move the camera directly — every card's
        // transforms read smoothScrollProgress, which normally only updates
        // when the browser fires a scroll event off that call. Those events
        // are async and get coalesced under the browser's own throttling, so
        // waiting on them here produced the occasional visible jump: several
        // of our rAF frames landing between two coalesced scroll events, so
        // the spring intermittently only heard about every other step.
        // Jumping it directly off the same `p` we just scrolled to makes the
        // camera authoritative on our own rAF clock instead — window.scrollTo
        // still keeps the real document position in sync (so the scrollbar
        // is correct and a manual-scroll handback starts from the right
        // place), it just isn't what drives the visual anymore.
        smoothScrollProgress.jump(p);

        if (t >= 1) {
          travelElapsed = legMs;
          dwellRemaining = legs[index].holdMs;
          dwellUntil = now + dwellRemaining;
          phase = "dwell";
        }
      };

      pauseFlight = () => {
        if (lifecycle !== "running") return;
        const now = performance.now();
        if (phase === "travel") {
          travelElapsed = Math.min(
            legMs,
            travelElapsed + Math.max(0, now - phaseStarted),
          );
        } else if (phase === "dwell") {
          dwellRemaining = Math.max(0, dwellUntil - now);
        }

        halt();
        lifecycle = "paused";
        const cardIndex = Math.min(
          legs[index]?.cardIndex ?? 0,
          cards.length - 1,
        );
        emit(false, cardIndex, true);
      };

      resumeFlight = () => {
        if (lifecycle !== "paused") return;
        lifecycle = "running";
        armHandback();
        const now = performance.now();
        const cardIndex = Math.min(
          legs[index]?.cardIndex ?? 0,
          cards.length - 1,
        );
        emit(true, cardIndex);

        if (phase === "starting") {
          raf = requestAnimationFrame(holdAtStart);
          return;
        }
        if (phase === "dwell") {
          dwellUntil = now + dwellRemaining;
        } else {
          phaseStarted = now;
        }
        raf = requestAnimationFrame(tick);
      };

      lifecycle = "running";
      raf = requestAnimationFrame(holdAtStart);
    };

    const onCommand = (event: Event) => {
      const action = (
        event as CustomEvent<{
          action?: "start" | "pause" | "resume" | "stop";
        }>
      ).detail?.action;

      if (action === "pause") {
        pause();
        return;
      }
      if (action === "resume") {
        resumeFlight?.();
        return;
      }
      if (action === "stop") {
        finish();
        return;
      }

      finish();
      armHandback();
      // The "Let's go" toast (mounted globally, listening for this) fires
      // right here — before the reset-to-beginning below — so the
      // announcement and the snap-to-start read as one launch, not two
      // separate things.
      window.dispatchEvent(new CustomEvent("flight-autopilot-launch"));
      runFlight();
    };

    window.addEventListener("flight-autopilot", onCommand as EventListener);
    window.addEventListener("narration-progress", onNarrationProgress as EventListener);

    // Engaging autopilot from a section detail page navigates here first
    // (the flight only lives on "/"), leaving a flag behind for this mount to
    // pick up and start the tour once the listener above is actually live.
    if (sessionStorage.getItem("autopilot-pending")) {
      sessionStorage.removeItem("autopilot-pending");
      onCommand(new CustomEvent("flight-autopilot", { detail: { action: "start" } }));
    }

    return () => {
      window.removeEventListener("flight-autopilot", onCommand as EventListener);
      window.removeEventListener("narration-progress", onNarrationProgress as EventListener);
      // finish(), not halt() — unmounting mid-tour (e.g. a card's own "Next"
      // link navigating away) must still tell CockpitTray the tour ended, or
      // its transport button is left pointing at a listener that's gone.
      finish();
    };
  }, [smoothScrollProgress]);

  useEffect(() => {
    // Broadcast the camera's progress rather than the document's: the route
    // map and dial are readouts of where the flight *is*, and off raw scroll
    // they would light the next section while the camera is still a second of
    // travel away from it. It also keeps them correct under autopilot, which
    // drives smoothScrollProgress directly on its own rAF clock.
    const unsubscribe = smoothScrollProgress.on("change", (value) => {
      const progress = Math.min(1, Math.max(0, value));
      window.dispatchEvent(
        new CustomEvent("flight-progress-update", {
          detail: { progress, activeId: getActiveSectionId(progress) },
        })
      );
    });
    return () => unsubscribe();
  }, [smoothScrollProgress]);

  return (
    // Taller track = more scrolling for the same camera distance, i.e. a
    // slower flight. Everything else is keyed off normalised progress, so
    // stretching this is the one knob that changes pace without disturbing
    // any of the per-card reveal/focus/depart windows.
    <div
      ref={containerRef}
      className="relative w-full bg-transparent"
      // Stable viewport height is load-bearing on phones. With `2200vh`,
      // revealing the browser toolbar while scrolling upward changed one vh
      // by roughly 60px and magnified that into a ~1080px track resize. Since
      // the camera is driven by normalised track progress, that resize looked
      // like a sudden reverse jump. `svh` stays fixed across toolbar show/hide
      // while preserving the same pacing at a settled viewport.
      //
      // Scroll anchoring is also disabled for iOS specifically.
      //
      // Nothing here reflows during scroll — it is one fixed-height track with
      // a single sticky child — so anchoring has no legitimate work to do on
      // this page and only ever fights the flight for the scroll position.
      // Height comes from the timeline rather than a utility class: it is the
      // sum of the legs, and a hard-coded class would be a second copy of that
      // sum waiting to disagree with the first.
      style={{ height: `${TRACK_VH}svh`, overflowAnchor: "none" }}
    >
      {/* Empty in first gear, which is what "free scrolling" means here. */}
      {snapPoints.map((point) => (
        <span
          key={point.id}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 h-px w-px"
          style={{
            top: snapMarkerTop(point.progress),
            scrollSnapAlign: "start",
            // What makes three landings *at least* three scrolls: a fling
            // cannot pass over one.
            scrollSnapStop: "always",
          }}
        />
      ))}
      <div className="sticky top-0 flex h-screen w-screen items-center justify-center overflow-hidden [perspective:1100px]">
        {/* Furthest plane — barely moves, and is over-sized so translating it
           never drags an edge into frame. */}
        <motion.div
          className="absolute -inset-y-1/4 inset-x-0 bg-[#01030a]"
          style={{
            y: parallaxFar,
            scale: parallaxFarScale,
          }}
        />

        {/* The volumes of space the corridor passes through. Each is a fixed
           gradient cross-faded by progress, so the colour journey is
           composited rather than repainted — see SPACE_REGIONS. */}
        {SPACE_REGIONS.map((region, index) => (
          <SpaceRegionLayer
            key={region.id}
            region={region}
            index={index}
            scrollProgress={smoothScrollProgress}
          />
        ))}

        {/* Nearest plane — drifts against the others, so the depth between
           them is legible rather than everything sliding as one sheet. */}
        <motion.div
          className="absolute -inset-y-1/4 inset-x-0 bg-[radial-gradient(circle_at_50%_55%,_rgba(56,189,248,0.22)_0%,_rgba(79,70,229,0.14)_38%,_transparent_62%)]"
          style={{ opacity: deepGlowOpacity, y: parallaxNear }}
        />

        {/* A lightweight speed-trail layer, deliberately behind the particle
           field and every card. The blur never touches text, portals, or the
           route map; it only gives the surrounding space some forward flow. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[14%] transform-gpu mix-blend-screen"
          style={{
            opacity: flightStreakOpacity,
            scale: flightStreakScale,
            y: flightStreakY,
            filter: flightStreakBlur,
            backgroundImage: FLIGHT_STREAK_BACKGROUND,
            // Naming `filter` reserves a filter-capable buffer for the
            // layer's whole lifetime. On phones there is no filter to apply,
            // so promising one is pure cost.
            willChange: isMobile ? "transform, opacity" : "transform, opacity, filter",
          }}
        />

        <SpaceParticles />

        {/* Solid black void behind the end-of-flight object — the scene's
           own background gradient is still a dark navy this late in the
           scroll, not true black, so this fades in ahead of the object
           itself to sell "empty space, one distant thing out there".

           z-[5] is load-bearing. The billboard cards come later in the DOM
           with z-index auto, so without an explicit layer above them this
           "void" painted *under* the whole corridor and blacked out nothing:
           the contact card stayed lit right through the closing beat. It now
           sits above the cards (which are clearing over the same stretch)
           and below the end-of-flight content at z-[6]/z-10. */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[5] bg-black"
          style={{ opacity: endVoidOpacity }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0 z-[6] overflow-hidden"
          style={{ opacity: endEarthOpacity }}
        >
          {/* Void closes in the harder you strain toward it */}
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_#000_100%)]"
            style={{ opacity: approachVignette }}
          />

          {/* Invitation to keep pushing — fades the moment they do. Was one
             long full-width sentence at 0.42em tracking and 60% opacity,
             which at 10px is a grey smear rather than something you read.
             Split into a bright label and a dimmer instruction so there is
             a hierarchy to catch, and pulled in from the edges. */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 px-6 text-center"
            style={{ opacity: hintOpacity }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.44em] text-sky-100/85 sm:text-[11px]">
              Thank you for flying
            </span>
            <span className="text-[10px] font-medium normal-case tracking-[0.08em] text-sky-100/45">
              Keep scrolling to come back around
            </span>
          </motion.div>
        </motion.div>

        {/* pointer-events tracks the reveal: this layer spans the whole
           viewport at z-10, so leaving it clickable while invisible put a
           dead sheet over every card's Next/CTA for the entire flight.
           Unmounted outright when dismissed (not merely transparent) so the
           particle canvas inside stops existing rather than idling. */}
        <motion.div
          // px-5 rather than px-6 buys the tagline two more characters of
          // measure on a 320px phone; the bottom padding keeps the signature
          // clear of the "Thank you for flying" hint pinned at bottom-10 on
          // the layer below, which short screens would otherwise overlap.
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pb-20 pt-10 text-center sm:px-6 sm:pb-24 sm:pt-14 ${
            isEndParticleActive ? "pointer-events-auto" : "pointer-events-none"
          }`}
          initial={false}
          animate={{
            opacity: isEndParticleActive ? 1 : 0,
            scale: isEndParticleActive ? 1 : 0.9,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Arrival bloom. The mark was assembling against flat black with
             nothing to sit in, which is most of why it read as scattered
             debris rather than an object arriving. This is a soft volume of
             light behind it — one static gradient whose opacity and scale
             breathe, so it costs nothing but gives the particles somewhere
             to land. Sized off the viewport's short edge so it stays behind
             the mark at any aspect ratio. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(86vh,130vw,760px)] w-[min(86vh,130vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.09)_0%,_rgba(14,165,233,0.035)_38%,_transparent_68%)]"
            initial={false}
            animate={
              showEndLogo
                ? { opacity: [0.34, 0.64, 0.34], scale: [0.97, 1.03, 0.97] }
                : { opacity: 0, scale: 0.9 }
            }
            transition={
              showEndLogo
                ? { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
                : { duration: 0.5 }
            }
          />
          {/* Beat one: the tagline appears dead-centre and zooms in. Once
             showEndLogo arms (see the effect above), it slides up on that
             same element instead of a second one — one continuous motion
             from "just arrived" to "made room" rather than a swap.

             The three elements used to be spaced by the parent's flex gap on
             top of a 420px canvas box, which spread them across the whole
             viewport height and left them reading as three unrelated things
             rather than one composition. Spacing is now owned here, as
             margins tuned against the canvas's own generous padding, and the
             shift is smaller so the group stays optically centred. */}
          <motion.div
            initial={false}
            animate={
              isEndParticleActive
                ? { opacity: 1, scale: 1, y: showEndLogo ? -18 : 0 }
                : { opacity: 0, scale: 0.55, y: 0 }
            }
            transition={
              isEndParticleActive
                ? {
                    opacity: { duration: 0.5, ease: "easeOut" },
                    scale: { duration: 0.7, ease: POWER3_OUT },
                    y: { duration: 0.7, ease: "easeInOut" },
                  }
                : { duration: 0.3 }
            }
            className="relative z-10 flex flex-col items-center"
          >
            {/* A quiet kicker gives the tagline a head to sit under, so the
               block has a hierarchy instead of starting cold on the big
               line. Arrives with the mark, not the tagline. */}
            <motion.span
              initial={false}
              animate={{ opacity: showEndLogo ? 1 : 0, y: showEndLogo ? 0 : -6 }}
              transition={{ duration: 0.7, delay: showEndLogo ? 0.25 : 0, ease: "easeOut" }}
              className="mb-3 text-[9px] font-semibold uppercase tracking-[0.34em] text-sky-200/45 sm:mb-4 sm:tracking-[0.5em] lg:text-[10px]"
            >
              End of transmission
            </motion.span>
            {/* Sized in vw below the sm breakpoint so the two lines hold
               their shape on a 320px phone instead of wrapping into four —
               tracking is part of that budget, so it tightens with the type
               rather than staying at the desktop 0.18em. */}
            <p className="text-[clamp(0.9rem,4.6vw,1.35rem)] font-semibold uppercase leading-[1.35] tracking-[0.1em] text-sky-50 drop-shadow-[0_4px_20px_rgba(2,8,23,0.65)] sm:text-2xl sm:tracking-[0.18em] lg:text-[2rem]">
              I BUILD. YOU IMAGINE.
              <br />
              TOGETHER, WE CREATE.
            </p>
          </motion.div>

          {/* Beat two: once the tagline has made room, the particle mark
             forms in underneath it — `active` (not isEndParticleActive)
             is what actually triggers HeroLogo's own form-in tween, so the
             particles don't start assembling until this second beat. */}
          {/* The mark is drawn larger and denser than before. It previously
             read as a sparse ring of debris rather than a logo: 560 points
             spread over a 280px sample is below the density where the glyph
             shapes close up. This canvas is a real, bounded box now (the
             sizing bug that stretched it full-screen is fixed) and the draw
             loop no
             longer does per-particle save/rotate or shadow blur, so it can
             carry roughly double the points for a fraction of the old cost —
             measured at a full 60fps with the canvas contributing ~nothing.
             shrink-0 keeps the flex column from stretching or squashing it. */}
          {/* Box and ink are both derived from the live viewport (see
             endMarkBox) rather than from breakpoint guesses, so the square
             mark can never outgrow a short screen and push the signature
             off the bottom. The negative margin is proportional for the
             same reason — a flat -24px eats a third of a 160px mark. */}
          <div
            className="relative shrink-0"
            style={{
              width: markBox,
              height: markBox,
              marginTop: -markBox * 0.05,
              marginBottom: -markBox * 0.05,
            }}
          >
            <ParticleLogo
              src="/images/us2.png"
              size={endMarkSize}
              particleCount={endParticleCount}
              disperseStrength={Math.round(endMarkSize * 1.06)}
              active={showEndLogo}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: endParticleCanvasSize,
                height: endParticleCanvasSize,
              }}
            />
          </div>
          {/* Closing signature. It used to blink — a full fade to zero and
             back on a loop — which read as the name being unsure whether it
             belonged on screen. It now stays put and re-sets itself in a
             different typeface every couple of seconds instead, so the
             motion carries some meaning (a designer's name, shown in a
             range of voices) rather than just pulsing. Held back with the
             particle mark (beat two), since it labels that mark rather than
             being a beat of its own. */}
          <motion.div
            initial={false}
            animate={{ opacity: showEndLogo ? 1 : 0, y: showEndLogo ? 0 : 8 }}
            transition={{ duration: 0.8, delay: showEndLogo ? 0.9 : 0, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* The name is set on one nowrap line, so its width is the
               constraint, not its height — vw below sm keeps it inside a
               narrow phone's gutters instead of being clipped at both
               ends. */}
            <SignatureName
              active={showEndLogo}
              className="text-[clamp(1.75rem,9vw,2.25rem)] text-sky-100/90 sm:text-5xl lg:text-6xl"
            />
            {/* A hairline that fades out at both ends, so the signature has
               a base to sit on instead of floating. Sized in ch units to
               track the name's own width across breakpoints. */}
            <span
              aria-hidden="true"
              className="mt-3 h-px w-[14ch] bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.55),transparent)] sm:mt-4"
            />
          </motion.div>
        </motion.div>

        <motion.div
          style={{ translateZ: zCamera, transformStyle: "preserve-3d" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {cards.map((card, index) => (
            <BillboardCard
              key={card.id}
              card={card}
              index={index}
              isMobile={isMobile}
              isStacked={isStacked}
              mobileOffsetScale={mobileOffsetScale}
              smoothScrollProgress={smoothScrollProgress}
              revealStart={getRevealWindow(index).start}
              revealEnd={getRevealWindow(index).end}
            />
          ))}

          {/* The technology helix shares this group, and that is the whole
             point of it: same camera, same depth units, same scroll. Between
             Skills and Projects the corridor is lined with the tools instead
             of being empty. */}
          <TechnologyLayover
            compact={isMobile}
            progress={smoothScrollProgress}
          />
        </motion.div>

        {/* The layover's title, which is the only part of it that is still
           screen-space: text this small has to stay on the pixel grid. The
           tools themselves fly in the corridor above. */}
        <LayoverCaption progress={smoothScrollProgress} isMobile={isMobile} />

        {/* The loop's veil. Sits above everything so it can cover the instant
           scroll is reset to the top (see runLoop). It only needs to mask a
           single jump, so it is a plain black sheet rather than anything
           elaborate — and because the closing frame is already near-black,
           closing it barely registers as a change at all. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50 bg-black"
          initial={false}
          animate={{ opacity: isWrapping ? 1 : 0 }}
          transition={{ duration: isWrapping ? 0.26 : 0.36, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
