"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { CardPortal } from "./CardPortal";
import { CardIcon } from "./icons/card-icon";
import { DownloadIcon, type DownloadIconHandle } from "./icons/download";
import { BrandIcon } from "./icons/brand-icon";
import ExpandableText from "./ExpandableText";
import NarrationHighlights from "./NarrationHighlights";
import NarratedText from "./NarratedText";
import { NARRATION_DURATION } from "../data/narration";
import SpaceParticles from "./SpaceParticles";
import ParticleLogo from "./HeroLogo";
import { getSkillGroups } from "../data/skillGroups";
import Greeting from "./Greeting";

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
const SKILL_LAYOVER_SPAN = 0.045;
const skillLayoverStart = Math.max(
  skillsStopProgress + (nextCardProgress - skillsStopProgress) * 0.28,
  skillsCardReadyProgress + SKILL_LAYOVER_SPAN + 0.01,
);
const skillLayoverEnd =
  skillsStopProgress + (nextCardProgress - skillsStopProgress) * 0.76;

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
// Landscape phones are short, so the portal is sized off viewport *height*
// there — a width-based clamp would hand it 190px of a 440px-tall screen and
// leave the headline squeezed into a sliver.
const COMPACT_PORTAL_WIDTH = "clamp(96px, 30vh, 150px)";

// Unified ultra-smooth physics configurations
const PHYSICS = {
  camera: { stiffness: 60, damping: 20, mass: 0.8, restDelta: 0.0001 },
  expansion: { type: "spring", stiffness: 180, damping: 22, mass: 0.9 },
} as const;

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
  return {
    start: Math.min(current + span * 0.3, 1),
    end: Math.min(current + span * 0.85, 1),
  };
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

  const alignmentClass = card.align === "left" ? "items-start text-left" : "items-end text-right";
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
  const effectiveBlur = useTransform(() => upcomingBlur.get() * (1 - straightening.get()));
  const effectiveOpacity = useTransform(() => Math.min(1, upcomingOpacity.get() + activeReadabilityBoost.get() * 0.38));
  const cardFilter = useMotionTemplate`blur(${effectiveBlur}px)`;
  // Faded-out cards are still hit-testable — and since every card is
  // absolutely stacked in the same container, the later ones sit on top and
  // swallow clicks meant for the card actually in view (that's what made
  // "Next" unclickable once a card filled the screen). Drop them out of
  // hit-testing while they're not readable.
  const cardPointerEvents = useTransform(effectiveOpacity, (o) =>
    o > 0.55 ? "auto" : "none",
  );

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
        // Narrower than the desktop clamp so there is room either side for the
        // lateral offsets, but wide enough that the headline still gets a real
        // measure once the portal takes its share.
        width: isMobile ? "min(66vw, 500px)" : card.width,
        // Same left/right stagger as desktop, scaled down to fit the
        // narrower viewport instead of being zeroed out — mobileOffsetScale
        // is proportional to actual viewport width, so a landscape phone
        // (wide) keeps close to the original stagger while a narrow
        // portrait phone gets a much smaller one, keeping the card on
        // screen instead of clipping off its edges.
        translateX: isMobile ? card.x * mobileOffsetScale : card.x,
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
       animate={{
  y: [0, -12, 0, 12, 0],
  opacity: [0.7, 1, 0.85, 1, 0.7],
}}
transition={{
  duration: 7 + index * 0.5,
  repeat: Infinity,
  ease: "easeInOut",
}}
        className={`flex w-full items-stretch ${isMobile ? "gap-3" : "gap-5 sm:gap-8"} ${
          card.align === "right" ? "flex-row-reverse" : "flex-row"
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
          {card.id === "home" ? (
            <ExpandableText
              className={`max-w-[46ch] ${isMobile ? "mt-2" : "mt-4 max-w-[38ch] sm:mt-5"}`}
              collapsedHeight={isMobile ? "3.3em" : "4.5em"}
              forceExpanded={autoExpandHome}
              onExpandedChange={setIsHomeExpanded}
            >
              <p
                className={`${
                  isMobile
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
          animate={{ width: isMobile ? COMPACT_PORTAL_WIDTH : PORTAL_WIDTH }}
          transition={PHYSICS.expansion}
          className="relative block min-h-[min(16.25rem,42vh)] shrink-0 transform-flat overflow-hidden rounded-2xl [clip-path:inset(0_round_1rem)] lg:rounded-3xl lg:[clip-path:inset(0_round_1.5rem)]"
        >
          <CardPortal
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
  const stops = [layover.peak - span, layover.peak, layover.peak + span];
  const opacity = useTransform(smoothScrollProgress, stops, [0, 1, 0]);
  const scale = useTransform(smoothScrollProgress, stops, [0.9, 1, 0.9]);
  const blur = useTransform(smoothScrollProgress, stops, [8, 0, 8]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  const pointerEvents = useTransform(opacity, (o) => (o > 0.55 ? "auto" : "none"));

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
        className="flex flex-wrap items-start justify-center gap-x-6 gap-y-5"
        style={{ maxWidth: isMobile ? 260 : 460 }}
      >
        {layover.group.items.map((item, i) => (
          <div key={item.label} className="flex flex-col items-center gap-1.5">
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
              className={`rounded bg-slate-950/40 px-1.5 py-0.5 text-slate-100/90 backdrop-blur-sm ${
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

  // The secret to cinematic smoothness: applying spring physics to the global
  // scroll progress. Touch scrolling already carries its own momentum, so the
  // soft desktop spring stacks on top of it and reads as lag — phones get a
  // stiffer, tighter-settling one that tracks the finger.
  const smoothScrollProgress = useSpring(
    scrollYProgress,
    compact
      ? { stiffness: 130, damping: 26, mass: 0.5, restDelta: 0.0005 }
      : PHYSICS.camera,
  );

  // Coming back from a section page, the browser restores scroll position
  // instantly but the camera spring still starts at 0 and has to travel there,
  // sweeping every card through its reveal/depart window on the way — the
  // whole flight replays in fast-forward. Snap the spring to wherever the
  // page actually is on the first frames instead of animating into it.
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const settle = () => {
      smoothScrollProgress.jump(scrollYProgress.get());
      // Scroll restoration can land a tick or two after mount, so hold the
      // snap for a few frames rather than trusting a single one.
      if (++frames < 5) raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(raf);
  }, [scrollYProgress, smoothScrollProgress]);

  const zCamera = useTransform(smoothScrollProgress, [0, 1], [0, isMobile ? 7800 : 8400]);

  // Crossing the third section (skills, stop 0.22) grades the whole scene
  // from the opening blue into a darker, blacker deep-space palette — the
  // flight is leaving the lit part of the journey behind.
  const bgCrossStart = sectionProgressStops[2];
  const bgCrossEnd = bgCrossStart + 0.16;
  const bgTopColor = useTransform(
    smoothScrollProgress,
    [bgCrossStart, bgCrossEnd],
    ["#002d54", "#00203f"],
  );
  const bgBottomColor = useTransform(
    smoothScrollProgress,
    [bgCrossStart, bgCrossEnd],
    ["#00101f", "#000000"],
  );
  const sceneBackground = useMotionTemplate`linear-gradient(180deg, ${bgTopColor} 0%, ${bgBottomColor} 100%)`;
  
  const lightGlowOpacity = useTransform(smoothScrollProgress, [0, 0.28, 0.42], [1, 0.8, 0]);
  const deepGlowOpacity = useTransform(smoothScrollProgress, [0.42, 0.58, 1], [0, 0.8, 1]);

  // --- Parallax ---------------------------------------------------------
  // The camera flies through the cards, but every layer behind them was
  // pinned, so the space around the corridor read as a flat backdrop. Each
  // layer now travels a different distance for the same scroll: the further
  // back it sits, the less it moves. The near glow drifts the opposite way,
  // which widens the apparent gap between the planes.
  const parallaxFar = useTransform(smoothScrollProgress, [0, 1], ["0%", "-7%"]);
  const parallaxMid = useTransform(smoothScrollProgress, [0, 1], ["0%", "-18%"]);
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
  const endParticleOpacity = useTransform(endEarthT, [0.42, 0.72, 1], [0, 0.72, 1]);
  const endParticleScale = useTransform(endEarthT, [0.42, 1], [0.72, 1]);
  const [isEndParticleActive, setIsEndParticleActive] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (value) => {
      setIsEndParticleActive(value >= 0.9);
    });
    return unsubscribe;
  }, [scrollYProgress]);

  // --- Overscroll "approach" -------------------------------------------
  // At max scroll the browser has nothing left to give, so the journey
  // would just dead-stop on a static globe. Instead we capture the wheel /
  // touch input the page can no longer consume and feed it into `pull`.
  // Every increment is damped by (1 - pull)², so each step closer costs
  // disproportionately more than the last — the globe keeps growing but the
  // curve is asymptotic and can never arrive. Stop pushing and it drifts
  // back out, like straining against a tether.
  const pull = useMotionValue(0);
  const smoothPull = useSpring(pull, { stiffness: 70, damping: 18, mass: 0.7 });

  useEffect(() => {
    if (isMobile) return;

    const PULL_IN = 0.0006; // per px of forward wheel delta
    const PULL_OUT = 0.0009; // reverse scroll pushes back out faster
    const DECAY_PER_MS = 0.0016; // drift back once the user stops pushing
    const IDLE_BEFORE_DECAY_MS = 320;
    const MAX_PULL = 0.97; // never 1 — the globe is never actually reached

    let lastInput = 0;
    let lastTouchY: number | null = null;
    let lastFrame = performance.now();
    let raf = 0;

    const atBottom = () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2;

    const applyDelta = (deltaY: number) => {
      const current = pull.get();
      if (deltaY > 0) {
        // Only "pull" once the page itself is out of scroll to give
        if (!atBottom()) return;
        const resistance = (1 - current) ** 2;
        pull.set(Math.min(current + deltaY * PULL_IN * resistance, MAX_PULL));
        lastInput = performance.now();
      } else if (deltaY < 0 && current > 0) {
        // Scrolling back up releases the tether before the page scrolls
        pull.set(Math.max(current + deltaY * PULL_OUT, 0));
        lastInput = performance.now();
      }
    };

    const onWheel = (e: WheelEvent) => applyDelta(e.deltaY);
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null || lastTouchY == null) return;
      applyDelta((lastTouchY - y) * 2.2);
      lastTouchY = y;
    };
    const onTouchEnd = () => {
      lastTouchY = null;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      if (now - lastInput < IDLE_BEFORE_DECAY_MS) return;
      const current = pull.get();
      if (current > 0.0005) {
        pull.set(Math.max(current - dt * DECAY_PER_MS * current, 0));
      }
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, pull]);

  // Exponential approach, not a linear one: growth decelerates hard as t
  // nears 1, so the image keeps pushing closer without ever quite arriving
  // — scrolling further just slows the approach rather than reaching it.
  // Unlike the old small-icon treatment, this is a full-bleed photo (see
  // object-cover below) — it starts at 1 (already filling the screen) and
  // only zooms in from there, cropping tighter into the frame rather than
  // shrinking down to a distant point.
  const endEarthScale = useTransform(() => {
    const t = Math.max(0, Math.min(1, endEarthT.get()));
    const base = 1 + 0.3 * (1 - Math.exp(-3 * t));
    return base * (1 + smoothPull.get() * 0.5);
  });
  // The closer you pull, the more it dissolves — it grows in the frame while
  // fading out of it, so the approach reads as chasing something receding
  // rather than closing a gap. Reinforces that it can never be reached.
  const endEarthOpacity = useTransform(
    () => endEarthReveal.get() * (1 - smoothPull.get() * 0.8),
  );
  // The void closes in as you strain toward it
  const approachVignette = useTransform(smoothPull, [0, 1], [0, 0.55]);
  // The scene's own gradient background is still a dark navy at this point
  // (see sceneBackground/bgBottomColor above), not true black — this fades
  // in a solid black backdrop a little ahead of the end-of-flight object
  // itself, so by the time it appears "in the distance" it's against a real
  // void rather than a lingering blue gradient.
  const endVoidOpacity = useTransform(scrollYProgress, [0.8, 0.95], [0, 1]);
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
      // first scrollTo lands on the newly-correct conversion. Refreshed
      // every frame in tick() instead of trusting this initial read.
      let containerTop = window.scrollY + container.getBoundingClientRect().top;
      let scrollable = container.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const refreshScrollGeometry = () => {
        containerTop = window.scrollY + container.getBoundingClientRect().top;
        scrollable = container.offsetHeight - window.innerHeight;
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
      window.scrollTo({ top: toScrollTop(0), behavior: "auto" });
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
        refreshScrollGeometry();
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
          className="absolute -inset-y-1/4 inset-x-0"
          style={{
            background: sceneBackground,
            y: parallaxFar,
            scale: parallaxFarScale,
          }}
        />
        {/* Mid plane — the opening sky glow, travelling further than the void
           behind it. */}
        <motion.div
          className="absolute inset-x-0 top-[-10vh] h-[60vh] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_62%)]"
          style={{ opacity: lightGlowOpacity, y: parallaxMid }}
        />
        {/* Nearest plane — drifts against the others, so the depth between
           them is legible rather than everything sliding as one sheet. */}
        <motion.div
          className="absolute -inset-y-1/4 inset-x-0 bg-[radial-gradient(circle_at_50%_55%,_rgba(56,189,248,0.12),_transparent_48%)]"
          style={{ opacity: deepGlowOpacity, y: parallaxNear }}
        />
        
        <SpaceParticles />

        {/* Solid black void behind the end-of-flight object — the scene's
           own background gradient is still a dark navy this late in the
           scroll, not true black, so this fades in ahead of the object
           itself to sell "empty space, one distant thing out there". */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: endVoidOpacity }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ opacity: endEarthOpacity }}
        >
          {/* A photographic full-bleed shot, not an isolated 3D-rendered
             icon — it fills the screen and zooms rather than sitting in a
             small glowing circle. Scaled up slightly past 1 at rest so the
             edges never show through the overscan as it scales. */}
          <motion.div
            className="absolute inset-0"
            style={{ scale: endEarthScale }}
          >
            <Image
              src="/images/eh.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>

          {/* Void closes in the harder you strain toward it */}
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_#000_100%)]"
            style={{ opacity: approachVignette }}
          />

          {/* Invitation to keep pushing — fades the moment they do */}
          <motion.p
            className="absolute bottom-16 inset-x-0 text-center text-[10px] font-semibold uppercase tracking-[0.42em] text-sky-100/60"
            style={{ opacity: hintOpacity }}
          >
            THE END,THANK YOU. PLEASE GO BACK TO THE BEGINNING TO START NEW FLIGHT.
          </motion.p>
        </motion.div>

        <motion.div
          className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center"
          style={{ opacity: endParticleOpacity, scale: endParticleScale }}
        >
          <ParticleLogo
            src="/images/us.png"
            size={isMobile ? 210 : 280}
            particleCount={isMobile ? 420 : 720}
            disperseStrength={isMobile ? 260 : 360}
            active={isEndParticleActive}
            className="h-[min(58vw,420px)] w-[min(58vw,420px)]"
          />
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
      </div>
    </div>
  );
}