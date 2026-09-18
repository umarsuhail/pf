"use client";

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CardPortal } from "./CardPortal";
import { CardIcon } from "./icons/card-icon";
import { DownloadIcon, type DownloadIconHandle } from "./icons/download";
import { BrandIcon } from "./icons/brand-icon";
import ExpandableText from "./ExpandableText";
import NarrationHighlights from "./NarrationHighlights";
import NarratedText from "./NarratedText";
import { NARRATION_DURATION } from "../data/narration";
import ParticleLogo from "./HeroLogo";

// Three.js-backed and only visible in the closing beat at the very end of a
// long scroll — split into its own chunk (ssr:false, no fallback needed
// since nothing is on screen for it yet) so the WebGL bundle isn't part of
// what the flight has to load before the very first scroll frame can run.
const SpaceParticles = dynamic(() => import("./SpaceParticles"), { ssr: false });
import { getSkillGroups } from "../data/skillGroups";
import Greeting from "./Greeting";
import SignatureName from "./SignatureName";
import { POWER3_OUT } from "../lib/easings";
import { playTick } from "../lib/tick-sound";

import {
  cardGradients,
  cards,
  sectionProgressMap,
  type FlightCard,
} from "../data/sections";

const sectionProgressStops = cards.map((card) => sectionProgressMap[card.id]);

// The "Skills" billboard stays a normal flight stop, but the camera's transit
// from it to "Projects" is used as a chance to glimpse all three skill
// groups up close — brief, frameless pass-throughs (no border, no portal,
// nothing to click) rather than full stops of their own. All of them appear
// after the Skills stop, spaced through the Skills → Projects transit.
const skillsCardIndex = cards.findIndex((c) => c.id === "skills");
const skillsStopProgress = sectionProgressStops[skillsCardIndex] ?? 0;
const nextCardProgress = sectionProgressStops[skillsCardIndex + 1] ?? skillsStopProgress;
// The icon layovers must not compete with the Skills billboard while it is
// still revealing. Keep their whole fade window after the card's completed
// reveal, with a small pause so the card reads clearly first.
const skillsCardReadyProgress = getRevealWindow(skillsCardIndex).end;
// Each group gets a full, unhurried look — no rush to the next card until
// the last group's own fade-out has finished — so the span/hold/sweep below
// are set as large as the Skills → Projects transit can fit without any two
// groups' clusters overlapping (they share the same on-screen slot, so any
// overlap would read as one group bleeding into the next).
const SKILL_LAYOVER_SPAN = 0.042;
// Fraction of the span held at full opacity/sharpness around the peak,
// rather than the cluster being sharp for a single instant and immediately
// fading back out again.
const SKILL_LAYOVER_HOLD = 0.55;
// How much of a layover's fade window the travelling frame sweeps across —
// most of it, so scrolling through a group's full item row takes most of
// that group's own dwell instead of racing through it.
const HIGHLIGHT_SWEEP = 0.85;

type Slot = { x: number; y: number; w: number; h: number };
// Bounded so the first group only starts fading in once the Skills card has
// fully finished revealing, and the last group has completely faded out
// again before the camera actually arrives at the Projects stop — the next
// card only appears once the whole skill list has had its turn.
const skillLayoverStart = skillsCardReadyProgress + SKILL_LAYOVER_SPAN + 0.01;
const skillLayoverEnd = nextCardProgress - SKILL_LAYOVER_SPAN - 0.02;

const SKILL_LAYOVERS = getSkillGroups(cards[skillsCardIndex]?.details ?? []).map(
  (group, i, arr) => {
    // Space the layovers through the Skills → Projects transit, beginning
    // only after the Skills billboard is fully rendered.
    const t = i / Math.max(arr.length - 1, 1);
    return {
      group,
      peak: skillLayoverStart + (skillLayoverEnd - skillLayoverStart) * t,
    };
  },
);

const PORTAL_WIDTH = "clamp(150px, 20vw, 320px)";

// Spring used for the cards' own width/offset settle when the breakpoint
// changes. There is deliberately no camera spring: see smoothScrollProgress.
const PHYSICS = {
  expansion: { type: "spring", stiffness: 180, damping: 22, mass: 0.9 },
} as const;

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
    // Skills — emerald gas cloud, matching that portal's #34d399.
    id: "emerald",
    at: 0.22,
    background:
      "radial-gradient(90% 70% at 22% 38%, rgba(52,211,153,0.17) 0%, rgba(16,185,129,0.08) 42%, transparent 70%), radial-gradient(80% 60% at 82% 72%, rgba(14,165,233,0.11) 0%, transparent 62%), linear-gradient(180deg, #021a21 0%, #010d13 100%)",
    drift: -6,
  },
  {
    // Projects — electric blue trench, the deepest "open water" stretch.
    id: "azure",
    at: 0.56,
    background:
      "radial-gradient(100% 80% at 74% 32%, rgba(96,165,250,0.18) 0%, rgba(37,99,235,0.09) 40%, transparent 70%), radial-gradient(70% 60% at 18% 76%, rgba(129,140,248,0.1) 0%, transparent 60%), linear-gradient(180deg, #05132b 0%, #010611 100%)",
    drift: -9,
  },
  {
    // Experience — a warm amber nebula. The one hot colour in the run; it is
    // what keeps the second half from reading as one long blue dissolve.
    id: "amber",
    at: 0.69,
    background:
      "radial-gradient(95% 75% at 30% 62%, rgba(251,191,36,0.15) 0%, rgba(217,119,6,0.08) 38%, transparent 68%), radial-gradient(75% 60% at 80% 24%, rgba(244,63,94,0.09) 0%, transparent 60%), linear-gradient(180deg, #160b04 0%, #090306 100%)",
    drift: -12,
  },
  {
    // Resume — cooling back down through violet as the warmth falls behind.
    id: "violet",
    at: 0.81,
    background:
      "radial-gradient(90% 70% at 62% 44%, rgba(167,139,250,0.14) 0%, rgba(99,102,241,0.07) 40%, transparent 68%), linear-gradient(180deg, #0b071d 0%, #030208 100%)",
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

const NAV_ZOOM_FRACTION = 0.55;

// Cards whose gap to the next card is tight (home, about, experience,
// contact — all ~0.11-0.13 apart) clamp the zoom below to their own depart window's
// exact start, with zero room to spare. That's fine for a quick scroll-past,
// but the autopilot tour *holds* there for seconds — arriving with no
// margin read as landing right on the lip of its own fade-out rather than
// settling cleanly. This pulls the clamp back a hair so there's always a
// sliver of steady, undimmed hold before the card would start to fade.
const NAV_ARRIVAL_MARGIN = 0.01;

function getNavTargetProgress(targetId: string) {
  const base = sectionProgressMap[targetId];
  const index = cards.findIndex((c) => c.id === targetId);
  if (base === undefined || index === -1) return base;
  // Navigating should always land the same distance in front of the card's
  // stop, so every section arrives at the same size. Taking that distance as
  // a fraction of the card's *own* depart window made it collapse for the
  // cards near the end of the track, whose windows are squeezed by having no
  // room left before progress hits 1 — contact ended up landing barely past
  // its stop, still small and mid-reveal. Only the clamp below is per-card:
  // the zoom must never push a card into the fade that carries it past the
  // camera, or navigating to it would show it already dissolving.
  return Math.min(
    base + NAV_ZOOM_PROGRESS,
    getDepartWindow(index).start - NAV_ARRIVAL_MARGIN,
  );
}

function getActiveSectionId(progress: number) {
  let activeId = cards[0]?.id ?? "home";
  for (let i = 0; i < cards.length; i++) {
    const stop = sectionProgressMap[cards[i].id];
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
  return {
    start: Math.max(previous + span * 0.74, 0),
    end: Math.min(current + span * 0.16, 1),
  };
}

function getFocusWindow(index: number) {
  const current = sectionProgressStops[index];
  const previous = index > 0 ? sectionProgressStops[index - 1] : 0;
  const next = index < sectionProgressStops.length - 1 ? sectionProgressStops[index + 1] : 1;
  const leftSpan = Math.max(current - previous, 0.08);
  const rightSpan = Math.max(next - current, 0.08);

  return {
    start: Math.max(current - leftSpan * 0.7, 0),
    peak: current,
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

// The opening leg (home) runs on its own clock instead of the standard 10s
// slot — it holds through the whole 43s intro narration with a slow,
// continuously-drifting camera that travels the *entire* way to the next
// card's own arrival point over that whole span, landing there exactly as
// the narration hands off. Earlier this crept to a barely-there target and
// then hopped the rest of the way in a single quick second right at the
// handoff — reading as a sudden jump/zoom instead of one continuous motion.
const AUTOPILOT_INTRO_HOLD = NARRATION_DURATION;
const AUTOPILOT_INTRO_EXPAND_AT = 10;

// The last real card (contact) and the tail beyond it (the earth/moon/end-
// credits payoff) both get more time than the standard mid-tour hold —
// they're the close of the tour, not a stop along the way.
const AUTOPILOT_CONTACT_HOLD = 7;
const AUTOPILOT_TAIL_HOLD = 8;

// Each skill layover (frontend/UI/backend) gets a real, brief stop of its
// own during the Skills → Projects transit, rather than just a fade the
// camera happens to pass while travelling — a quick hop in, then a short
// hold to actually register the cluster before moving to the next one.
const AUTOPILOT_LAYOVER_TRAVEL = 1.4;
const AUTOPILOT_LAYOVER_HOLD = 2.6;

// Forward travel a "go to section" jump adds on top of the card's own stop,
// in progress units — the fixed span's hang time scaled by the zoom fraction.
const NAV_ZOOM_PROGRESS = DEPART_SPAN * 0.3 * NAV_ZOOM_FRACTION;

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
  // (0.34) — that gap was sized for skills->projects, the one genuinely wide
  // hop. Everywhere else, a departing card's own fade-out window ran well
  // past the next card's arrival/nav-zoom point, so navigating (or the
  // autopilot tour holding) on the next card caught the previous one still
  // 60-70% opaque and blown up to its pass-through size — a giant blurred
  // ghost hanging over the new card instead of a clean handoff. Cap the span
  // by the gap to the next card too, so a departing card always finishes
  // clearing before the next one is reached.
  const span = Math.min(DEPART_SPAN, (1 - current) / 0.85, (next - current) / 0.85);
  const start = Math.min(current + span * 0.3, 1);
  let end = Math.min(current + span * 0.85, 1);

  // The final card is the exception. Every other card's fade ends when the
  // next card arrives, but this one has no successor, so the generic maths
  // stretched its fade all the way to progress 1.0 — meaning it was still
  // ~half opaque, and blown up to pass-through size, underneath the entire
  // closing beat. (That is what put fragments of the contact copy behind
  // the signature.) Finish it before the closing content arrives instead,
  // which is what LAST_CARD_CLEARED exists to pin down.
  if (index === sectionProgressStops.length - 1) {
    end = Math.min(end, LAST_CARD_CLEARED);
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

function BillboardCard({
  card,
  index,
  isMobile,
  mobileOffsetScale,
  smoothScrollProgress,
  revealStart,
  revealEnd,
}: {
  card: FlightCard;
  index: number;
  isMobile: boolean;
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
  // The autopilot tour opens the home card's full bio partway through its
  // intro hold, rather than leaving it collapsed while the narration reads
  // straight through it.
  const pdfDownloadRef = useRef<DownloadIconHandle>(null);
  const texDownloadRef = useRef<DownloadIconHandle>(null);
  const [autoExpandHome, setAutoExpandHome] = useState(false);
  // Tracks the bio's real expanded state (manual toggle included, not just
  // the one-way autopilot trigger) so the portal can swap its visual to
  // match — the astronaut only belongs on screen while the full bio reads.
  const [isHomeExpanded, setIsHomeExpanded] = useState(false);
  useEffect(() => {
    if (card.id !== "home") return;
    const onExpand = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (id === "home") setAutoExpandHome(true);
    };
    window.addEventListener("flight-autopilot-expand", onExpand as EventListener);
    return () => window.removeEventListener("flight-autopilot-expand", onExpand as EventListener);
  }, [card.id]);

  const alignmentClass = isMobile || card.align === "left" ? "items-start text-left" : "items-end text-right";
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
  const baseRotateY = isEntry ? 0 : card.align === "left" ? 10 : -10;
  const baseRotateX = isEntry ? 0 : 4;

  const focus = getFocusWindow(index);
  const depart = getDepartWindow(index);
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
  const cardFilter = useTransform(() => {
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

  // The gentle float/pulse below used to run its `repeat: Infinity` loop on
  // every card for the whole session, even the ones sitting fully faded out
  // elsewhere in the corridor — every one of those is still a live RAF-driven
  // animation doing real interpolation work each frame for something nobody
  // can see. Only the card(s) actually legible get the loop; the rest hold
  // still until they fade back in.
  const [isBobbing, setIsBobbing] = useState(() => effectiveOpacity.get() > 0.55);
  useMotionValueEvent(effectiveOpacity, "change", (value) => {
    setIsBobbing((prev) => {
      const next = value > 0.55;
      return prev === next ? prev : next;
    });
  });

  return (
    <motion.div
      style={{
        translateZ: card.z,
        rotateY: activeRotateY,
        rotateX: activeRotateX,
        opacity: effectiveOpacity,
        filter: cardFilter,
        scale: upcomingScale,
        background: cardGradient,
        transformStyle: "preserve-3d",
        pointerEvents: cardPointerEvents,
      }}
      initial={false}
      animate={{
        // Mobile cards use the available width, with only a small stagger.
        width: isMobile ? "min(88vw, 500px)" : card.width,
        translateX: isMobile ? card.x * Math.min(mobileOffsetScale, 0.035) : card.x,
      }}
      transition={PHYSICS.expansion}
      className={`absolute flex rounded-3xl border sm:rounded-4xl ${
        isMobile ? "p-4" : "p-5 sm:p-8 lg:p-10"
      } ${panelClass}`}
    >
      {/* Positioned relative to this stable outer box, not the inner content
         wrapper's gentle float animation below, so it doesn't jitter. */}
      {card.id === "home" && <NarrationHighlights />}

      <motion.div
        animate={
          !isMobile && isBobbing
            ? { y: [0, -12, 0, 12, 0], opacity: [0.7, 1, 0.85, 1, 0.7] }
            : { y: 0, opacity: 1 }
        }
        transition={
          !isMobile && isBobbing
            ? { duration: 7 + index * 0.5, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.4, ease: "easeOut" }
        }
        className={`flex w-full items-stretch ${isMobile ? "gap-4" : "gap-5 sm:gap-8"} ${
          isMobile ? "flex-col-reverse" : card.align === "right" ? "flex-row-reverse" : "flex-row"
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          className={`flex min-w-0 flex-1 flex-col ${alignmentClass}`}
          style={{ opacity: useTransform(activeReadabilityBoost, [0, 1], [0.85, 1]) }}
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
            className={`max-w-[22ch] font-semibold leading-tight ${
              isMobile
                ? "mt-2.5 text-lg"
                : "mt-5 text-2xl sm:mt-6 sm:text-3xl lg:text-5xl"
            } ${titleClass}`}
          >
            {card.id === "home" ? <Greeting /> : card.title}
          </h2>
          {/* Home carries the full narrated bio (all four paragraphs) — too
             long for a billboard card to show outright, so it collapses to a
             short preview with a "Read more" that grows the card in place. */}
          {card.id === "home" || isMobile ? (
            <ExpandableText
              className={`max-w-[46ch] ${isMobile ? "mt-2" : "mt-4 max-w-[38ch] sm:mt-5"}`}
              collapsedHeight="4.5em"
              expandedHeight={isMobile ? "min(28dvh, 240px)" : "640px"}
              scrollExpanded={isMobile}
              toggleClassName={isMobile ? "min-h-11 text-[11px]" : ""}
              forceExpanded={autoExpandHome}
              onExpandedChange={setIsHomeExpanded}
            >
              <p
                className={`${
                  isMobile
                    ? "text-sm leading-6"
                    : "text-sm leading-6 sm:text-base sm:leading-7 lg:text-xl"
                } ${bodyClass}`}
              >
                <NarratedText id={card.id} text={card.description} />
              </p>
            </ExpandableText>
          ) : card.id !== "resume" ? (
            <p
              className={`max-w-[46ch] ${
                isMobile
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
                  isMobile ? "min-h-11 px-4 py-3 text-xs" : "px-6 py-3 text-sm hover:-translate-y-1"
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
                  isMobile ? "min-h-11 px-4 py-3 text-xs" : "px-6 py-3 text-sm hover:-translate-y-1"
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
                  ? "mt-2 min-h-11 px-5 py-3 text-xs"
                  : "mt-6 px-6 py-3 text-sm hover:-translate-y-1 sm:mt-8"
              } ${buttonClass}`}
            >
              {card.cta}
            </Link>
          )}
        </motion.div>


        <motion.div
          initial={false}
          animate={{ width: isMobile ? "100%" : PORTAL_WIDTH }}
          transition={PHYSICS.expansion}
          className={`relative block ${isMobile ? "h-28" : "min-h-[min(16.25rem,42vh)]"} shrink-0 transform-flat overflow-hidden rounded-2xl [clip-path:inset(0_round_1rem)] lg:rounded-3xl lg:[clip-path:inset(0_round_1.5rem)]`}
        >
          <CardPortal
            isMobile={isMobile}
            index={index}
            scrollYProgress={smoothScrollProgress}
            align={card.align}
            targetId={targetCard.id}
            actionLabel={actionLabel}
            ariaLabel={`Fly to ${targetCard.eyebrow.replace(/^\d+\s*\/\s*/, "")}`}
            isExpanded={card.id === "home" && isHomeExpanded}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// A brief, frameless pass-through — no border, background, or portal to
// click, just a label and a cluster of floating icons that fade in as the
// camera nears its point in the transit and fade back out past it. Rendered
// as a plain screen-space overlay (no translateZ/perspective), outside the
// 3D corridor group, the same way the route-map's section pill stays crisp
// no matter what the flying cards behind it are doing — so it never gets
// caught in a departing card's perspective swell or tangled with the next
// card's own reveal fade.
function SkillLayoverCluster({
  layover,
  isMobile,
  smoothScrollProgress,
}: {
  layover: (typeof SKILL_LAYOVERS)[number];
  isMobile: boolean;
  smoothScrollProgress: MotionValue<number>;
}) {
  const span = SKILL_LAYOVER_SPAN;
  // A bare 3-point [peak-span, peak, peak+span] window is only sharp for a
  // single instant — the moment scroll passes `peak` it's already fading
  // back out, so at normal scroll speeds the cluster reads as blurring
  // almost as soon as it arrives. Holding full opacity/sharpness across a
  // small plateau around the peak gives it an actual dwell before the
  // fade-out begins.
  const hold = span * SKILL_LAYOVER_HOLD;
  const stops = [
    layover.peak - span,
    layover.peak - hold,
    layover.peak + hold,
    layover.peak + span,
  ];
  const opacity = useTransform(smoothScrollProgress, stops, [0, 1, 1, 0]);
  const scale = useTransform(smoothScrollProgress, stops, [0.9, 1, 1, 0.9]);
  const blur = useTransform(smoothScrollProgress, stops, [8, 0, 0, 8]);
  // Quantized to whole pixels, and "none" while sharp — same reasoning as
  // the billboard cards' cardFilter: every fractional blur change forces a
  // full layer re-raster, and this cluster fades through its blur window on
  // every scroll frame of the Skills → Projects transit.
  const filter = useTransform(blur, (b) => {
    const stepped = Math.round(b);
    return stepped <= 0 ? "none" : `blur(${stepped}px)`;
  });
  const pointerEvents = useTransform(opacity, (o) => (o > 0.55 ? "auto" : "none"));

  // The travelling frame. Rather than lighting the whole cluster at once,
  // the scroll walks a single metal box across the technologies one at a
  // time, and each landing clicks with the same dial tick the scroll itself
  // makes — so the pass-through reads as the camera actually inspecting the
  // row rather than just drifting past it.
  const items = layover.group.items;
  const gridRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  // `index` is where the frame is parked and `visible` is whether the sweep
  // is running — two fields rather than one nullable index, so that when the
  // sweep ends the frame fades out where it stopped instead of sliding back
  // to the first item on its way out.
  const [frame, setFrame] = useState({ index: 0, visible: false });
  // The scroll handler compares against a ref, not the state it sets: it runs
  // on every frame of a scroll and must not re-subscribe each time the index
  // changes.
  const sweptIndex = useRef(-1);

  // Measured with offsetLeft/Top rather than getBoundingClientRect: the icons
  // carry a looping bob and the cluster itself is scaled and blurred by the
  // scroll, all of which a rect folds in. Offsets are pre-transform layout,
  // so the frame sits still over an icon that is gently floating.
  useEffect(() => {
    const measure = () => {
      setSlots(
        itemRefs.current.map((el) =>
          el
            ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
            : { x: 0, y: 0, w: 0, h: 0 },
        ),
      );
    };
    measure();
    // The labels set in a webfont and the row wraps, so the layout these
    // offsets describe changes once when the font lands.
    document.fonts?.ready.then(measure).catch(() => {});
    const observer = new ResizeObserver(measure);
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [items.length, isMobile]);

  useMotionValueEvent(smoothScrollProgress, "change", (progress) => {
    // Short of the full fade window at both ends, so the first technology is
    // framed only once the cluster has actually faded in and the last one is
    // released before it fades back out.
    const from = layover.peak - span * HIGHLIGHT_SWEEP;
    const to = layover.peak + span * HIGHLIGHT_SWEEP;
    const t = (progress - from) / (to - from);
    const next =
      t < 0 || t > 1 ? -1 : Math.min(items.length - 1, Math.floor(t * items.length));
    if (next === sweptIndex.current) return;
    sweptIndex.current = next;
    if (next < 0) {
      setFrame((f) => (f.visible ? { ...f, visible: false } : f));
      return;
    }
    setFrame({ index: next, visible: true });
    // A gentle rise across the row — same click, walking up a step per
    // technology, so a sweep sounds like a sequence rather than a stutter.
    playTick(0.94 + (next / Math.max(items.length - 1, 1)) * 0.3);
  });

  const slot = slots[frame.index];
  const pad = isMobile ? 7 : 10;

  return (
    <motion.div
      style={{ opacity, scale, filter, pointerEvents }}
      className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
    >
      <span
        className={`font-semibold uppercase tracking-[0.32em] text-sky-100/70 ${
          isMobile ? "text-[9px]" : "text-xs"
        }`}
      >
        {layover.group.name}
      </span>
      <div
        ref={gridRef}
        className="relative flex flex-wrap items-start justify-center gap-x-6 gap-y-5"
        style={{ maxWidth: isMobile ? 260 : 460 }}
      >
        {/* Drawn before the items, each of which is `relative` — so with all
           of them at z-auto, paint order puts the icons and labels over the
           frame. It is a box the technology sits inside, not a panel laid
           across it. */}
        {slot && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 rounded-2xl"
            initial={false}
            animate={{
              opacity: frame.visible ? 1 : 0,
              x: slot.x - pad,
              y: slot.y - pad,
              width: slot.w + pad * 2,
              height: slot.h + pad * 2,
            }}
            transition={{
              // Stiff enough to arrive with the tick rather than trailing it,
              // damped enough not to ring on a fast scroll through the row.
              type: "spring",
              stiffness: 420,
              damping: 34,
              mass: 0.6,
              opacity: { duration: 0.22, ease: "easeOut" },
            }}
            style={{
              background:
                "linear-gradient(155deg, rgba(248,250,252,0.18) 0%, rgba(148,163,184,0.07) 42%, rgba(15,23,42,0.12) 64%, rgba(226,232,240,0.15) 100%)",
              border: "1px solid rgba(226,232,240,0.5)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(2,8,23,0.55), 0 10px 28px rgba(2,8,23,0.5), 0 0 18px rgba(125,211,252,0.22)",
            }}
          />
        )}

        {layover.group.items.map((item, i) => (
          <div
            key={item.label}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="relative flex flex-col items-center gap-1.5"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 2.2 + (i % 5) * 0.25,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            >
              <BrandIcon
                slug={item.icon}
                className={`drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] ${
                  isMobile ? "h-7 w-7" : "h-10 w-10 sm:h-12 sm:w-12"
                }`}
              />
            </motion.div>
            <span
              className={`rounded bg-slate-950/70 px-1.5 py-0.5 text-slate-100/90 ${
                isMobile ? "text-[9px]" : "text-[11px] sm:text-xs"
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function MultiverseFlight() {
  const containerRef = useRef<HTMLDivElement>(null);
  // `compact` drives the smaller in-flight card sizing. The flight now runs
  // at every viewport — portrait phones included — with `mobileOffsetScale`
  // (derived from the actual viewport width below) keeping the left/right
  // card stagger from overflowing a narrow screen.
  const [compact, setCompact] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const onResize = () => {
      setCompact(window.innerWidth < 1024);
      setViewportWidth(window.innerWidth);
    };
    onResize();
    window.addEventListener("resize", onResize);
    // iOS Safari fires orientationchange before the resize metrics settle
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const isMobile = compact;
  // The left/right card stagger (card.x) was tuned against a landscape
  // phone's wide viewport (~700-930px), where a flat 0.45 multiplier keeps
  // every card on screen. A portrait phone is much narrower (~375-430px),
  // where that same multiplier pushes a card's edge past the viewport —
  // scaling proportionally to actual width keeps the stagger present but
  // safely on screen at every size, landscape included (viewportWidth=900
  // recovers ~0.45, the original tuning). Clamped so it never vanishes
  // entirely (some stagger reads better than a dead-centered stack) or
  // exceeds the original desktop-mobile feel.
  const mobileOffsetScale =
    viewportWidth > 0
      ? Math.min(0.45, Math.max(0.16, (viewportWidth / 900) * 0.45))
      : 0.45;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // The camera reads raw scroll position — no spring in between. A spring here
  // is what made the flight feel floaty and detached: the wheel stops, the
  // camera keeps coasting, and every re-tune only traded "laggy" for "twitchy"
  // because the lag was structural, not a damping value. Scroll is already a
  // smooth, continuous signal; the browser interpolates it natively and the
  // transforms below are pure functions of it, so reading it directly is both
  // 1:1 responsive and cheaper (no per-frame spring integration, and values
  // stop changing the instant scrolling stops). This is the one knob that
  // separated this from the reference implementation's feel.
  //
  // It also removes the need for the old mount-time snap: with no spring to
  // travel from 0, a restored scroll position (coming back from a section
  // page) is simply correct on the first frame instead of replaying the
  // whole flight in fast-forward while the spring caught up.
  const smoothScrollProgress = scrollYProgress;

  const zCamera = useTransform(smoothScrollProgress, [0, 1], [0, isMobile ? 7800 : 8400]);

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
  // Raw scrollYProgress, not the smoothed/overdamped camera spring — that
  // spring approaches 1 asymptotically and can sit well below the 0.9
  // threshold for a long time after the user has actually scrolled to the
  // bottom, making the last stretch of scroll feel like it stopped doing
  // anything.
  const endEarthT = useTransform(scrollYProgress, [0.88, 1], [0, 1]);
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
    const unsubscribe = scrollYProgress.on("change", (value) => {
      setIsEndParticleActive((prev) => {
        if (!prev && value >= END_ARM) return true;
        if (prev && value < END_RELEASE) return false;
        return prev;
      });
    });
    return unsubscribe;
  }, [scrollYProgress]);

  // The closing beat plays as a sequence, not all at once: the tagline
  // zooms in centered first, then — once that's had a moment to read —
  // it slides up to make room and the particle mark forms in underneath.
  // `showEndLogo` is that second beat's own delayed trigger, armed a fixed
  // stretch after the tagline first appears rather than sharing its timing.
  const [showEndLogo, setShowEndLogo] = useState(false);
  useEffect(() => {
    if (!isEndParticleActive) {
      setShowEndLogo(false);
      return;
    }
    const timeout = window.setTimeout(() => setShowEndLogo(true), 1100);
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
    // "instant" — a smooth scroll would animate the whole flight backwards in
    // fast-forward behind the veil. (Not "auto": that defers to the CSS
    // scroll-behavior, which globals.css sets to smooth.)
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
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
  const endVoidOpacity = useTransform(scrollYProgress, [0.915, 0.952], [0, 1]);
  const hintOpacity = useTransform(() => {
    const revealed = endEarthT.get() > 0.75 ? 1 : 0;
    return revealed * Math.max(0, 1 - smoothPull.get() * 5);
  });

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const targetId = customEvent.detail?.id;
      const targetProgress = targetId ? getNavTargetProgress(targetId) : undefined;
      const container = containerRef.current;

      if (targetProgress === undefined || !container) return;
      const containerTop = window.scrollY + container.getBoundingClientRect().top;
      const scrollableHeight = container.offsetHeight - window.innerHeight;

      window.scrollTo({
        top: containerTop + scrollableHeight * targetProgress,
        behavior: "smooth",
      });
    };

    window.addEventListener("navigate-flight-section", handleNavigation as EventListener);
    return () => window.removeEventListener("navigate-flight-section", handleNavigation as EventListener);
  }, []);

  // --- Autopilot --------------------------------------------------------
  // A hands-off tour: fly to each section in turn, hold long enough to read
  // it, then move on, and finish on the ending. The whole flight is already
  // a pure function of scroll position, so the tour drives nothing but
  // window.scrollY — every card, the camera and the route map follow for
  // free. Any real input from the user (wheel, touch, key) hands control
  // straight back.
  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let detach: (() => void) | undefined;

    const emit = (running: boolean, index: number) =>
      window.dispatchEvent(
        new CustomEvent("flight-autopilot-state", {
          detail: { running, index, total: cards.length },
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

    const stop = () => {
      const wasRunning = raf !== 0 || timer !== 0;
      halt();
      if (wasRunning) emit(false, -1);
    };

    const armHandback = () => {
      const opts = { passive: true } as const;
      window.addEventListener("wheel", stop, opts);
      window.addEventListener("touchstart", stop, opts);
      window.addEventListener("keydown", stop);
      detach = () => {
        window.removeEventListener("wheel", stop);
        window.removeEventListener("touchstart", stop);
        window.removeEventListener("keydown", stop);
      };
    };

    // Cubic ease on every leg, so each hop off a card and onto the next one
    // accelerates and settles instead of starting and stopping dead.
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

    const runFlight = () => {
      const container = containerRef.current;
      if (!container) return;

      // Mutable, not a one-time snapshot: a mobile browser's dynamic
      // toolbar showing/hiding mid-tour changes window.innerHeight, which
      // silently stales this conversion — the tour keeps interpolating the
      // right *progress*, but the pixel target it converts that to drifts
      // from what the viewport actually needs. Nothing corrects it during a
      // multi-second dwell (see currentProgress below), so the drift shows
      // up all at once as a visible pull-back the moment the next leg's
      // first scrollTo lands on the newly-correct conversion. Checked every
      // frame in tick() instead of trusting this initial read (see
      // refreshScrollGeometryIfNeeded below for how that check stays cheap).
      let containerTop = window.scrollY + container.getBoundingClientRect().top;
      let scrollable = container.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const refreshScrollGeometry = () => {
        containerTop = window.scrollY + container.getBoundingClientRect().top;
        scrollable = container.offsetHeight - window.innerHeight;
      };

      // The container's height is a vh unit (see the `h-[1800vh]` track
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

      const toScrollTop = (p: number) => containerTop + scrollable * p;

      // One leg per stop the tour actually parks on: the intro's continuous
      // drift into Skills, each remaining card in turn (with the three skill
      // layovers inserted as their own brief stops between Skills and
      // Projects), then the tail of the track so the tour ends on the
      // closing shot rather than on the last card. `cardIndex` is what gets
      // reported to the UI (route highlighting, the CockpitTray leg label) —
      // the layover legs reuse Skills' own index so they read as glances
      // within that section rather than section changes of their own.
      type Leg = {
        target: number;
        travelMs: number;
        linear: boolean;
        holdMs: number;
        cardIndex: number;
      };

      const legs: Leg[] = [];

      cards.forEach((card, i) => {
        const target = getNavTargetProgress(card.id) ?? 0;

        if (i === 0) {
          // Parks on home, completely still, for the whole narration except
          // its final AUTOPILOT_TRAVEL seconds, then eases into skills' own
          // arrival point over that last stretch — not a hop (a full,
          // cubic-eased leg, same shape every other card gets), and not
          // moving at all until the narration has actually finished. This
          // used to be one continuous slow drift toward skills across the
          // *entire* narration instead — camera motion competing with the
          // narration for attention the whole time it read.
          const next = cards[1] ? getNavTargetProgress(cards[1].id) ?? target : target;
          const introTravelMs = AUTOPILOT_TRAVEL * 1000;
          const introHoldMs = Math.max(AUTOPILOT_INTRO_HOLD * 1000 - introTravelMs, 0);
          legs.push({
            target: 0,
            travelMs: 1,
            linear: true,
            holdMs: introHoldMs,
            cardIndex: i,
          });
          legs.push({
            target: next,
            travelMs: introTravelMs,
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
          SKILL_LAYOVERS.forEach((layover) => {
            legs.push({
              target: layover.peak,
              travelMs: AUTOPILOT_LAYOVER_TRAVEL * 1000,
              linear: false,
              holdMs: AUTOPILOT_LAYOVER_HOLD * 1000,
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
      window.scrollTo({ top: toScrollTop(0), behavior: "instant" });
      smoothScrollProgress.jump(0);

      let index = 0;
      let from = 0;
      let legStart = 0;
      let legMs = 0;
      let dwellUntil = 0;
      let introExpandFired = false;
      // The tour's own record of where it left the camera — updated every
      // frame below alongside the writes to window.scrollTo/smoothScroll-
      // Progress, so it's always exactly `legs[index]` by the time a leg
      // completes. Re-deriving `from` via progressNow() (raw window.scrollY)
      // at each leg boundary instead left it exposed to the dwell: the tour
      // never re-asserts scroll position while holding, so anything that
      // nudges the page during those seconds — the browser's own scroll
      // anchoring compensating for a layout shift is the likely culprit —
      // went uncorrected, and the next leg then started from that drifted
      // spot with `smoothScrollProgress.jump` snapping straight to it: a
      // visible jitter with a pull-back right as the next section began.
      let currentProgress = 0;

      const beginLeg = (now: number) => {
        from = currentProgress;
        legMs = legs[index].travelMs;
        legStart = now;
        if (index === 0) introExpandFired = false;
        if (legs[index].cardIndex < cards.length) emit(true, legs[index].cardIndex);
      };

      // Landing on "/" right before this runs (the cross-page engage flow)
      // can still have the browser's own scroll restoration land a frame or
      // two late, shoving window.scrollY off 0 after our reset above already
      // ran. Re-assert 0 for a few frames so the visible start position
      // matches currentProgress (0) before the first leg begins easing.
      let holdFrames = 6;
      const holdAtStart = (now: number) => {
        window.scrollTo({ top: toScrollTop(0), behavior: "instant" });
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

        if (dwellUntil) {
          if (now < dwellUntil) return;
          dwellUntil = 0;
          index += 1;
          if (index >= legs.length) {
            stop();
            return;
          }
          beginLeg(now);
        }

        // The home card opens itself partway through the intro hold rather
        // than staying collapsed while the narration reads straight through
        // its full bio.
        if (
          index === 0 &&
          !introExpandFired &&
          now - legStart >= AUTOPILOT_INTRO_EXPAND_AT * 1000
        ) {
          introExpandFired = true;
          window.dispatchEvent(
            new CustomEvent("flight-autopilot-expand", { detail: { id: "home" } }),
          );
        }

        const t = Math.min(1, (now - legStart) / legMs);
        const eased = legs[index].linear ? t : ease(t);
        const p = from + (legs[index].target - from) * eased;
        currentProgress = p;
        refreshScrollGeometryIfNeeded();
        // "instant", never "auto": "auto" defers to globals.css's
        // `scroll-behavior: smooth`, which turned every per-frame write into
        // a fresh smooth scroll trailing behind `p`. Its scroll events then
        // wrote that trailing position back into scrollYProgress over the
        // jump(p) below — the camera yanked back toward the previous card
        // and, once a leg ended, glided forward again as the scroll caught up.
        window.scrollTo({ top: toScrollTop(p), behavior: "instant" });
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
          dwellUntil = now + legs[index].holdMs;
        }
      };

      raf = requestAnimationFrame(holdAtStart);
    };

    const onCommand = (event: Event) => {
      const action = (event as CustomEvent<{ action?: "start" | "stop" }>)
        .detail?.action;

      if (action === "stop") {
        stop();
        return;
      }

      halt();
      armHandback();
      // The "Let's go" toast (mounted globally, listening for this) fires
      // right here — before the reset-to-beginning below — so the
      // announcement and the snap-to-start read as one launch, not two
      // separate things.
      window.dispatchEvent(new CustomEvent("flight-autopilot-launch"));
      runFlight();
    };

    window.addEventListener("flight-autopilot", onCommand as EventListener);

    // Engaging autopilot from a section detail page navigates here first
    // (the flight only lives on "/"), leaving a flag behind for this mount to
    // pick up and start the tour once the listener above is actually live.
    if (sessionStorage.getItem("autopilot-pending")) {
      sessionStorage.removeItem("autopilot-pending");
      onCommand(new CustomEvent("flight-autopilot", { detail: { action: "start" } }));
    }

    return () => {
      window.removeEventListener("flight-autopilot", onCommand as EventListener);
      // stop(), not halt() — unmounting mid-tour (e.g. a card's own "Next"
      // link navigating away) must still tell CockpitTray the tour ended, or
      // its Disengage button is left pointing at a listener that's gone.
      stop();
    };
  }, [smoothScrollProgress]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (value) => {
      const progress = Math.min(1, Math.max(0, value));
      window.dispatchEvent(
        new CustomEvent("flight-progress-update", {
          detail: { progress, activeId: getActiveSectionId(progress) },
        })
      );
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    // Taller track = more scrolling for the same camera distance, i.e. a
    // slower flight. Everything else is keyed off normalised progress, so
    // stretching this is the one knob that changes pace without disturbing
    // any of the per-card reveal/focus/depart windows.
    <div ref={containerRef} className="relative h-[1800vh] w-full bg-transparent">
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
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center ${
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
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(86vh,760px)] w-[min(86vh,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.16)_0%,_rgba(14,165,233,0.07)_38%,_transparent_68%)]"
            initial={false}
            animate={
              showEndLogo
                ? { opacity: [0.55, 1, 0.55], scale: [0.94, 1.06, 0.94] }
                : { opacity: 0, scale: 0.9 }
            }
            transition={
              showEndLogo
                ? { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
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
              className="mb-4 text-[9px] font-semibold uppercase tracking-[0.5em] text-sky-200/45 sm:text-[10px]"
            >
              End of transmission
            </motion.span>
            <p className="text-lg font-semibold uppercase leading-[1.35] tracking-[0.18em] text-sky-50 drop-shadow-[0_4px_20px_rgba(2,8,23,0.65)] sm:text-2xl lg:text-[2rem]">
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
             shapes close up. This canvas is now genuinely ~420px (the sizing
             bug that stretched it full-screen is fixed) and the draw loop no
             longer does per-particle save/rotate or shadow blur, so it can
             carry roughly double the points for a fraction of the old cost —
             measured at a full 60fps with the canvas contributing ~nothing.
             shrink-0 keeps the flex column from stretching or squashing it. */}
          <ParticleLogo
            src="/images/us2.png"
            size={isMobile ? 250 : 340}
            particleCount={isMobile ? 490 : 840}
            disperseStrength={isMobile ? 260 : 360}
            active={showEndLogo}
            className="-my-4 h-[min(64vw,460px)] w-[min(64vw,460px)] shrink-0 sm:-my-6"
          />
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
            <SignatureName
              active={showEndLogo}
              className="text-4xl text-sky-100/90 sm:text-5xl lg:text-6xl"
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
              mobileOffsetScale={mobileOffsetScale}
              smoothScrollProgress={smoothScrollProgress}
              revealStart={getRevealWindow(index).start}
              revealEnd={getRevealWindow(index).end}
            />
          ))}
        </motion.div>

        {/* Outside the 3D corridor group on purpose — see SkillLayoverCluster. */}
        {SKILL_LAYOVERS.map((layover) => (
          <SkillLayoverCluster
            key={layover.group.name}
            layover={layover}
            isMobile={isMobile}
            smoothScrollProgress={smoothScrollProgress}
          />
        ))}

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