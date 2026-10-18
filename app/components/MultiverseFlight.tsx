"use client";

import {
  animate,
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
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CardPortal } from "./CardPortal";
import { CardIcon } from "./icons/card-icon";
import { DownloadIcon, type DownloadIconHandle } from "./icons/download";
import ExpandableText from "./ExpandableText";
import NarratedText from "./NarratedText";
import { NARRATION_SPANS, narrationSegments } from "../data/narration";
import SpaceParticles from "./SpaceParticles";
import ShootingStars from "./ShootingStars";
import ParticleLogo from "./HeroLogo";
import SignatureName from "./SignatureName";
import { POWER3_OUT } from "../lib/easings";
import {
  CARD_PASS_THROUGH_Z,
  CARD_READING_DEPTH,
  PARKED_OFFSET,
  PARKED_OPACITY,
  cameraTravelFor,
  cardDepthFor,
} from "../lib/camera";
import {
  TRACK_VH,
  progressFromScroll,
  scrollFromProgress,
} from "../data/flightTimeline";
import { useCoarsePointer } from "../lib/pointer";
import { recordVisit, shouldSkipIntro } from "../lib/visit-history";
import { flightScrollTo, setFlightSnapPoints } from "../lib/smooth-scroll";
import TechnologyLayover, { LayoverCaption } from "./TechnologyLayover";
import {
  MAIN_FLIGHT_STOPS,
  TECHNOLOGY_FOCUS_STOPS,
  getCardSlotProgress,
  getDepartWindow,
  getRevealWindow,
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
const COMPACT_PORTAL_WIDTH = "clamp(120px, 22vw, 180px)";

const CARD_DEPTH = {
  desktop: { copy: 22, portal: 58, bezel: 16, wall: -9 },
  mobile: { copy: 10, portal: 26, bezel: 7, wall: -4 },
} as const;

const PHYSICS = {
  expansion: { type: "spring", stiffness: 180, damping: 22, mass: 0.9 },
} as const;

const CAMERA_SPRING = {
  stiffness: 260,
  damping: 32,
  mass: 0.32,
  restDelta: 0.00005,
} as const;

const CAMERA_SPRING_TOUCH = {
  stiffness: 400,
  damping: 32,
  mass: 0.22,
  restDelta: 0.00005,
} as const;

// The camera's follow while Lenis is gliding the scroll underneath it.
//
// This was 900/0.15 — near enough to rigid — on the theory that Lenis was
// already doing the smoothing and a second lerp would only add lag. That
// traded the old soft follow (260) for Lenis roughly one for one, so the net
// feel did not change at all. It still has to be looser than the wheel's own
// spring, or the two compound into mush, but it is a follow again, not a
// rail. Overdamped as ever: 36 / (2 * sqrt(420 * 0.24)) = 1.79.
const CAMERA_SPRING_LENIS = {
  stiffness: 420,
  damping: 36,
  mass: 0.24,
  restDelta: 0.00005,
} as const;

const FLIGHT_VELOCITY_SPRING = {
  stiffness: 240,
  damping: 40,
  mass: 0.24,
} as const;

const FLIGHT_STREAK_FLOOR = 0.055;

const FLIGHT_STREAK_BACKGROUND =
  "repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg 2deg, rgba(186,230,253,0.22) 2.35deg 2.62deg, transparent 3.15deg 8deg), radial-gradient(ellipse at 50% 50%, rgba(56,189,248,0.22) 0%, transparent 64%)";

type SpaceRegion = {
  id: string;
  at: number;
  background: string;
  drift: number;
};

const SPACE_REGIONS: SpaceRegion[] = [
  {
    id: "departure",
    at: 0,
    background:
      "radial-gradient(130% 90% at 50% -15%, rgba(186,230,253,0.3) 0%, rgba(56,189,248,0.16) 32%, rgba(12,74,110,0.1) 58%, transparent 78%), linear-gradient(180deg, #05263f 0%, #021421 100%)",
    drift: -3,
  },
  {
    id: "teal",
    at: sectionProgressMap.skills,
    background:
      "radial-gradient(90% 70% at 22% 38%, rgba(45,212,191,0.17) 0%, rgba(13,148,136,0.08) 42%, transparent 70%), radial-gradient(80% 60% at 82% 72%, rgba(14,165,233,0.11) 0%, transparent 62%), linear-gradient(180deg, #02191e 0%, #010d11 100%)",
    drift: -6,
  },
  {
    id: "azure",
    at: sectionProgressMap.projects,
    background:
      "radial-gradient(100% 80% at 74% 32%, rgba(96,165,250,0.18) 0%, rgba(37,99,235,0.09) 40%, transparent 70%), radial-gradient(70% 60% at 18% 76%, rgba(129,140,248,0.1) 0%, transparent 60%), linear-gradient(180deg, #05132b 0%, #010611 100%)",
    drift: -9,
  },
  {
    id: "steel",
    at: sectionProgressMap.experience,
    background:
      "radial-gradient(95% 75% at 30% 62%, rgba(91,141,177,0.18) 0%, rgba(21,48,85,0.22) 38%, transparent 68%), radial-gradient(75% 60% at 80% 24%, rgba(36,58,75,0.2) 0%, transparent 60%), linear-gradient(180deg, #0c1829 0%, #04090f 100%)",
    drift: -12,
  },
  {
    id: "dusk",
    at: 0.85,
    background:
      "radial-gradient(90% 70% at 62% 44%, rgba(21,48,85,0.1) 0%, transparent 60%), linear-gradient(180deg, #050a12 0%, #000000 100%)",
    drift: -15,
  },
  {
    id: "void",
    at: 0.94,
    background:
      "radial-gradient(80% 60% at 50% 40%, rgba(125,211,252,0.06) 0%, transparent 58%), linear-gradient(180deg, #000104 0%, #000000 100%)",
    drift: -18,
  },
];

const DAWN_SKY = "linear-gradient(180deg, #070a18 0%, #11143a 52%, #0d1830 100%)";
const DAWN_GLOW =
  "radial-gradient(75% 55% at 50% 100%, rgba(45,212,191,0.26) 0%, rgba(20,150,160,0.14) 38%, rgba(14,116,144,0.05) 62%, transparent 80%)";

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

function getFocusWindow(index: number) {
  const reveal = getRevealWindow(index);
  const depart = getDepartWindow(index);
  return {
    start: reveal.start,
    peak: getCardSlotProgress(index),
    end: depart.end,
  };
}

const AUTOPILOT_SECTION_SECONDS = 10;
const AUTOPILOT_HOLD = 3.5;
const AUTOPILOT_TRAVEL = AUTOPILOT_SECTION_SECONDS - AUTOPILOT_HOLD;
const AUTOPILOT_TECH_TRAVEL = 0.72;
const AUTOPILOT_TECH_HOLD = 0.9;

const AUTOPILOT_CONTACT_HOLD = 7;
const AUTOPILOT_TAIL_HOLD = 8;

function toStrictlyIncreasing(values: number[]) {
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(Math.max(values[i], out[i - 1] + 0.0005));
  }
  return out;
}

function RotatingHomeHeadline({
  live,
  originVisit,
}: {
  live: boolean;
  originVisit: number;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [prevOriginVisit, setPrevOriginVisit] = useState(originVisit);
  if (originVisit !== prevOriginVisit) {
    setPrevOriginVisit(originVisit);
    setPhraseIndex(0);
  }

  useEffect(() => {
    if (!live) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % HOME_HEADLINE_PHRASES.length);
    }, HOME_HEADLINE_HOLD_MS);

    return () => window.clearInterval(interval);
  }, [live]);

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
              className="flight-card-meta-dot h-1.5 w-1.5 rounded-full"
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
              className="flight-card-accent absolute inset-x-0 top-0 block whitespace-nowrap font-normal italic"
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
  revealApproach,
  revealStart,
  revealEnd,
  originVisit,
}: {
  card: FlightCard;
  index: number;
  isMobile: boolean;
  isStacked: boolean;
  mobileOffsetScale: number;
  smoothScrollProgress: MotionValue<number>;
  revealApproach: number;
  revealStart: number;
  revealEnd: number;
  originVisit: number;
}) {

  const pdfDownloadRef = useRef<DownloadIconHandle>(null);
  const texDownloadRef = useRef<DownloadIconHandle>(null);
  const [autoExpandHome, setAutoExpandHome] = useState(false);
  const hasAutoExpandedHomeRef = useRef(false);
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

  const alignmentClass = isStacked
    ? "items-start text-left"
    : card.align === "left"
      ? "items-start text-left"
      : "items-end text-right";
  const titleClass = "flight-card-title";
  const bodyClass = "flight-card-copy";
  const panelClass = "mission-flight-card";
  const badgeClass = "flight-card-badge";
  const buttonClass = "flight-card-action";
  const cardGradient = cardGradients[index % cardGradients.length];
  const targetCard = cards[index + 1] ?? cards[0];
  const actionLabel = index === cards.length - 1 ? "Restart" : "Next";

  const isEntry = index === 0;
  const depth = isMobile ? CARD_DEPTH.mobile : CARD_DEPTH.desktop;
  const baseRotateY = isEntry ? 0 : card.align === "left" ? 10 : -10;
  const baseRotateX = isEntry ? 0 : 4;

  const focus = getFocusWindow(index);
  const depart = getDepartWindow(index);
  const cameraTravel = cameraTravelFor(isMobile);
  const cardZ = cardDepthFor(getCardSlotProgress(index), isMobile);
  const cardTranslateZ = useTransform(smoothScrollProgress, (progress) =>
    progress >= depart.end
      ? CARD_READING_DEPTH - progress * cameraTravel
      : Math.min(cardZ, CARD_PASS_THROUGH_Z - progress * cameraTravel),
  );

  // A card lights as a shape in the distance at its *approach*, not at the
  // start of the flight.
  //
  // This first stop was a literal 0, which stretched the 0 -> 0.42 "coming
  // into view" ramp across the entire journey instead of across the runway
  // the data already defines. At Experience's reading slot the Contact card
  // was therefore sitting at 38% opacity — 0.42 * (0.752 / 0.829) — and since
  // the only part of a card that is not opaque is its portal window, the next
  // panel was legible straight through the one being read.
  //
  // `getRevealWindow().approach` is floored at the previous card's slot
  // precisely so nothing lights until the card before it has been read, and
  // for Projects it is clamped past the end of the toolkit layover for the
  // same reason. Both of those were being ignored.
  //
  // Where there is no runway to ramp over — Projects, whose approach is held
  // to the layover's end and therefore equals its start — the intermediate
  // stop is dropped rather than nudged 0.0005 apart, which would pop the card
  // from nothing to 42% in one frame.
  const hasRevealRunway = revealStart - revealApproach > 0.02;
  const fadeStops = toStrictlyIncreasing(
    hasRevealRunway
      ? [revealApproach, revealStart, revealEnd, depart.start, depart.end]
      : [revealApproach, revealEnd, depart.start, depart.end],
  );

  const upcomingOpacity = useTransform(
    smoothScrollProgress,
    fadeStops,
    isEntry
      ? hasRevealRunway
        ? [1, 1, 1, 1, 0]
        : [1, 1, 1, 0]
      : hasRevealRunway
        ? [0, 0.42, 1, 1, 0]
        : [0, 1, 1, 0],
  );
  const upcomingScale = useTransform(
    smoothScrollProgress,
    fadeStops,
    isEntry
      ? hasRevealRunway
        ? [1, 1, 1, 1, 1.1]
        : [1, 1, 1, 1.1]
      : hasRevealRunway
        ? [0.85, 0.95, 1, 1, 1.1]
        : [0.85, 1, 1, 1.1],
  );

  const hasApproach = focus.start < focus.peak;
  const straightening = useTransform(
    smoothScrollProgress,
    hasApproach
      ? toStrictlyIncreasing([focus.start, focus.peak, focus.end])
      : [focus.peak, focus.end],
    hasApproach ? [0, 1, 0] : [1, 0],
  );

  const activeRotateY = useTransform(straightening, (v) => baseRotateY * Math.max(0, 1 - v * 1.5));
  const activeRotateX = useTransform(straightening, (v) => baseRotateX * Math.max(0, 1 - v * 2));

  const portalDepth = useTransform(
    straightening,
    [0, 1],
    [depth.portal * 0.45, depth.portal * 1.3],
  );
  const copyDepth = useTransform(straightening, [0, 1], [depth.copy * 0.45, depth.copy]);
  const bezelDepth = useTransform(straightening, [0, 1], [depth.bezel * 0.3, depth.bezel]);
  const wallDepth = useTransform(straightening, [0, 1], [depth.wall * 0.3, depth.wall]);

  const activeReadabilityBoost = useTransform(straightening, [0, 1], [0, 1]);
  const effectiveOpacity = useTransform(() =>
    smoothScrollProgress.get() >= depart.end
      ? PARKED_OPACITY
      : Math.min(1, upcomingOpacity.get() + activeReadabilityBoost.get() * 0.38),
  );
  const cardPointerEvents = useTransform(effectiveOpacity, (o) =>
    o > 0.55 ? "auto" : "none",
  );
  const parkY = useTransform(smoothScrollProgress, (progress) =>
    progress >= depart.end ? PARKED_OFFSET : "0vh",
  );
  const [isParked, setIsParked] = useState(
    () => smoothScrollProgress.get() >= depart.end,
  );
  useEffect(() => {
    const update = (progress: number) =>
      setIsParked((prev) => {
        const next = progress >= depart.end;
        return prev === next ? prev : next;
      });
    update(smoothScrollProgress.get());
    return smoothScrollProgress.on("change", update);
  }, [smoothScrollProgress, depart.end]);

  const [isCardLegible, setIsCardLegible] = useState(index === 0);
  useEffect(() => {
    const update = (value: number) =>
      setIsCardLegible((prev) => {
        const next = value > 0.55;
        return prev === next ? prev : next;
      });
    update(effectiveOpacity.get());
    return effectiveOpacity.on("change", update);
  }, [effectiveOpacity]);

  const [isResizing, setIsResizing] = useState(false);
  const handleExpandedChange = useCallback((expanded: boolean) => {
    setIsHomeExpanded(expanded);
    setIsResizing(true);
  }, []);
  useEffect(() => {
    if (!isResizing) return;
    const timer = window.setTimeout(() => setIsResizing(false), 620);
    return () => window.clearTimeout(timer);
  }, [isResizing, isHomeExpanded]);

  const [prevOriginVisit, setPrevOriginVisit] = useState(originVisit);
  if (originVisit !== prevOriginVisit) {
    setPrevOriginVisit(originVisit);
    setAutoExpandHome(false);
  }
  useEffect(() => {
    hasAutoExpandedHomeRef.current = false;
  }, [originVisit]);

  const layerWillChange = isResizing ? "auto" : "transform";

  return (
    <motion.div
      style={{
        translateZ: cardTranslateZ,
        rotateY: activeRotateY,
        rotateX: activeRotateX,
        opacity: effectiveOpacity,
        scale: upcomingScale,
        background: cardGradient,
        transformStyle: "preserve-3d",
        pointerEvents: cardPointerEvents,
        y: parkY,
        willChange: layerWillChange,
      }}
      inert={isParked}
      initial={false}
      animate={{
        width: isStacked
          ? "min(82vw, 400px)"
          : isMobile
            ? "min(66vw, 500px)"
            : card.width,
        translateX: isMobile ? card.x * mobileOffsetScale : card.x,
      }}
      transition={PHYSICS.expansion}
      className={`group/card absolute flex rounded-3xl border sm:rounded-4xl ${
        isMobile ? "p-4" : "p-5 sm:p-8 lg:p-10"
      } ${panelClass}`}
    >
      <motion.span
        aria-hidden="true"
        className={`flight-card-bezel pointer-events-none absolute inset-0 rounded-3xl sm:rounded-4xl ${
          isMobile ? "" : "hidden sm:block"
        }`}
        style={{
          translateZ: bezelDepth,
          willChange: layerWillChange,
        }}
      />
      <motion.span
        aria-hidden="true"
        className="flight-card-wall pointer-events-none absolute inset-[3px] rounded-3xl sm:rounded-4xl"
        style={{
          translateZ: wallDepth,
          willChange: layerWillChange,
        }}
      />

      <div
        className={`flex w-full ${
          isStacked
            ? "flex-col-reverse items-stretch gap-3.5"
            : `items-stretch ${isMobile ? "gap-3" : "gap-5 sm:gap-8"} ${
                card.align === "right" ? "flex-row-reverse" : "flex-row"
              }`
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          className={`flex min-w-0 flex-1 flex-col ${alignmentClass}`}
          style={{
            opacity: useTransform(activeReadabilityBoost, [0, 1], [0.85, 1]),
            translateZ: copyDepth,
            willChange: layerWillChange,
          }}
        >
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
            {card.id === "home" ? (
              <RotatingHomeHeadline live={isCardLegible} originVisit={originVisit} />
            ) : (
              card.title
            )}
          </h2>
          {card.id === "home" && (
            <div className="flight-card-meta mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.2em] sm:mt-4 sm:text-xs">
              <span>Frontend systems</span>
              <span aria-hidden="true" className="flight-card-meta-dot h-1 w-1 rounded-full" />
              <span>Product craft</span>
              <span aria-hidden="true" className="flight-card-meta-dot h-1 w-1 rounded-full" />
              <span>Performance</span>
            </div>
          )}
          {card.id === "home" || isMobile ? (
            <ExpandableText
              className={`max-w-[46ch] ${isMobile ? "mt-2" : "mt-4 max-w-[38ch] sm:mt-5"}`}
              collapsedHeight={isStacked ? "4.6em" : isMobile ? "3.3em" : "4.5em"}
              forceExpanded={autoExpandHome}
              resetKey={originVisit}
              onExpandedChange={handleExpandedChange}
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
          animate={{
            width: isStacked
              ? "100%"
              : isMobile
                ? COMPACT_PORTAL_WIDTH
                : PORTAL_WIDTH,
          }}
          transition={PHYSICS.expansion}
          style={{
            translateZ: portalDepth,
            willChange: layerWillChange,
          }}
          className={`relative block shrink-0 transform-flat overflow-hidden rounded-2xl lg:rounded-3xl ${
            isStacked
              ? "h-[clamp(10rem,26vh,15rem)]"
              : "min-h-[min(16.25rem,42vh)]"
          }`}
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
            letterbox={isStacked}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function MultiverseFlight() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [endMarkBox, setEndMarkBox] = useState(0);
  const [isStacked, setIsStacked] = useState(false);
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

      const quantizedHeight = Math.round(height / 80) * 80;
      const raw = Math.min(width * 0.72, quantizedHeight * 0.42, 460);
      setEndMarkBox(Math.max(160, Math.round(raw / 40) * 40));
    };

    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const isMobile = compact;
  const isCoarsePointer = useCoarsePointer();

  // Counted once per load of the flight. Two things read it: whether the
  // autopilot sits through the narrated intro, and whether the settings
  // prompt offers the autoplay toggle at all.
  useEffect(() => {
    recordVisit();
  }, []);

  const wheelIsSmoothed = !isCoarsePointer;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const progresses = Array.from(
      new Set(
        [
          ...MAIN_FLIGHT_STOPS.map((stop) => stop.progress),
          ...TECHNOLOGY_FOCUS_STOPS.map((stop) => stop.progress),
        ].map((progress) => Number(progress.toFixed(5))),
      ),
    ).sort((a, b) => a - b);

    const publish = () => {
      const scrollable = container.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const containerTop = window.scrollY + container.getBoundingClientRect().top;
      setFlightSnapPoints(
        progresses.map(
          (progress) => containerTop + scrollable * scrollFromProgress(progress),
        ),
      );
    };

    publish();
    window.addEventListener("resize", publish);
    window.addEventListener("orientationchange", publish);
    return () => {
      window.removeEventListener("resize", publish);
      window.removeEventListener("orientationchange", publish);
      setFlightSnapPoints([]);
    };
  }, []);

  const markBox = endMarkBox || (isMobile ? 240 : 440);
  const endMarkSize = Math.round(markBox * (isMobile ? 0.88 : 0.76));
  const endParticleCanvasBox = { width: "104vw", height: "112vh" };
  const endParticleCount = Math.round(
    Math.min(2600, Math.max(600, (endMarkSize * endMarkSize) / 44)),
  );

  const { scrollYProgress: trackScroll } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scrollYProgress = useTransform(trackScroll, progressFromScroll);

  const smoothScrollProgress = useSpring(
    scrollYProgress,
    wheelIsSmoothed
      ? CAMERA_SPRING_LENIS
      : isCoarsePointer
        ? CAMERA_SPRING_TOUCH
        : CAMERA_SPRING,
  );

  const cameraVelocity = useVelocity(smoothScrollProgress);
  const smoothCameraVelocity = useSpring(cameraVelocity, FLIGHT_VELOCITY_SPRING);
  const forwardFlightIntensity = useTransform(smoothCameraVelocity, (velocity) =>
    Math.min(1, Math.max(0, Math.max(0, velocity) - FLIGHT_STREAK_FLOOR) * 3.4),
  );
  const loopRush = useMotionValue(0);
  const flightStreakOpacity = useTransform(() => {
    const forward = forwardFlightIntensity.get();
    const cruising = forward <= 0.25 ? forward * 0.048 : 0.012 + (forward - 0.25) * 0.0707;
    return Math.max(cruising, loopRush.get() * 0.95);
  });
  const flightStreakScale = useTransform(
    () => 1.02 + forwardFlightIntensity.get() * 0.03 + loopRush.get() * 0.22,
  );
  const loopRushBlur = useTransform(loopRush, (r) =>
    r > 0.02 ? `blur(${(r * 12).toFixed(1)}px)` : "none",
  );
  const flightStreakY = useTransform(forwardFlightIntensity, [0, 1], ["0%", "-2%"]);
  const zCamera = useTransform(
    smoothScrollProgress,
    [0, 1],
    [0, cameraTravelFor(isMobile)],
  );

  const deepGlowOpacity = useTransform(
    smoothScrollProgress,
    [
      (sectionProgressMap.skills + sectionProgressMap.projects) / 2,
      sectionProgressMap.projects,
      1,
    ],
    [0, 0.85, 1],
  );

  const parallaxFar = useTransform(smoothScrollProgress, [0, 1], ["0%", "-7%"]);
  const parallaxNear = useTransform(smoothScrollProgress, [0, 1], ["0%", "12%"]);
  const parallaxFarScale = useTransform(smoothScrollProgress, [0, 1], [1.05, 1.22]);
  const endEarthT = useTransform(smoothScrollProgress, [0.88, 1], [0, 1]);
  const endEarthReveal = useTransform(endEarthT, [0, 0.35, 1], [0, 1, 1]);
  const END_ARM = 0.955;
  const END_RELEASE = 0.935;

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

  const [showEndLogo, setShowEndLogo] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setShowEndLogo(isEndParticleActive),
      isEndParticleActive ? 1100 : 0,
    );
    return () => window.clearTimeout(timeout);
  }, [isEndParticleActive]);

  const END_MARK_HOLD_MS = 3200;
  const endMarkReadyRef = useRef(false);
  useEffect(() => {
    endMarkReadyRef.current = false;
    if (!showEndLogo) return;
    const timeout = window.setTimeout(() => {
      endMarkReadyRef.current = true;
      window.dispatchEvent(
        new CustomEvent("flight-loop-progress", { detail: { value: 0, ready: true } }),
      );
    }, END_MARK_HOLD_MS);
    return () => {
      window.clearTimeout(timeout);
      window.dispatchEvent(
        new CustomEvent("flight-loop-progress", { detail: { value: 0, ready: false } }),
      );
    };
  }, [showEndLogo]);

  const pull = useMotionValue(0);
  const smoothPull = useSpring(pull, { stiffness: 70, damping: 18, mass: 0.7 });

  const [originVisit, setOriginVisit] = useState(0);

  useEffect(() => {
    const ORIGIN_LEFT = 0.05;
    const ORIGIN_RETURNED = 0.002;
    let hasLeft = false;

    return smoothScrollProgress.on("change", (value) => {
      if (value > ORIGIN_LEFT) {
        hasLeft = true;
        return;
      }
      if (!hasLeft || value > ORIGIN_RETURNED) return;
      hasLeft = false;
      setOriginVisit((visit) => visit + 1);
      pull.set(0);
      window.dispatchEvent(new CustomEvent("flight-return-to-origin"));
    });
  }, [smoothScrollProgress, pull]);


  const LOOP_AT = 0.6;
  const END_SCATTER_AT = 0.2;
  const DAWN_FROM = 0.2;
  const [isWrapping, setIsWrapping] = useState(false);
  const wrappingRef = useRef(false);

  const runLoop = useCallback(() => {
    if (wrappingRef.current) return;
    wrappingRef.current = true;
    setIsWrapping(true);

    window.setTimeout(() => {
      flightScrollTo(0);
      pull.set(0);
      smoothPull.jump(0);
      smoothScrollProgress.jump(0);
      loopRush.jump(1);
      animate(loopRush, 0, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
      window.dispatchEvent(new CustomEvent("flight-loop-rush"));
    }, 260);

    window.setTimeout(() => {
      setIsWrapping(false);
      wrappingRef.current = false;
    }, 620);
  }, [pull, smoothPull, smoothScrollProgress, loopRush]);

  useEffect(() => {
    const PULL_IN = 0.00026;
    const PULL_OUT = 0.0009;
    const DECAY_PER_MS = 0.00045;
    const IDLE_BEFORE_DECAY_MS = 900;
    const MAX_PULL = 0.97;

    let lastInput = 0;
    let lastTouchY: number | null = null;
    let lastFrame = performance.now();
    let raf = 0;

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
        if (!atBottom()) return;
        if (!endMarkReadyRef.current) return;
        const resistance = 1 - current;
        const next = Math.min(current + deltaY * PULL_IN * resistance, MAX_PULL);
        pull.set(next);
        lastInput = performance.now();
        if (next >= LOOP_AT) runLoop();
      } else if (deltaY < 0 && current > 0) {
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

  const endEarthOpacity = useTransform(
    () => endEarthReveal.get() * (1 - smoothPull.get() * 0.8),
  );
  const endStrain = useMotionValue(Math.min(1, smoothPull.get() / LOOP_AT));
  useEffect(() => {
    const update = (pullValue: number) =>
      endStrain.set(Math.min(1, pullValue / LOOP_AT));
    update(smoothPull.get());
    return smoothPull.on("change", update);
  }, [endStrain, smoothPull]);
  const dawn = useTransform(endStrain, [DAWN_FROM, 1], [0, 1]);
  const dawnSkyOpacity = useTransform(dawn, [0, 0.7], [0, 1]);
  const dawnGlowOpacity = useTransform(dawn, [0, 0.5, 1], [0, 0.7, 1]);

  const [endScattered, setEndScattered] = useState(false);
  useEffect(
    () =>
      endStrain.on("change", (value) =>
        setEndScattered((prev) =>
          !prev && value >= END_SCATTER_AT ? true : prev && value <= 0.03 ? false : prev,
        ),
      ),
    [endStrain],
  );
  const endMarkShown = showEndLogo && !endScattered;

  useEffect(() => {
    const emit = (value: number) =>
      window.dispatchEvent(
        new CustomEvent("flight-loop-progress", {
          detail: { value, ready: endMarkReadyRef.current },
        }),
      );
    emit(endStrain.get());
    return endStrain.on("change", emit);
  }, [endStrain]);
  const endVoidOpacity = useTransform(smoothScrollProgress, [0.915, 0.952], [0, 1]);
  const starfieldLayer = useTransform(endVoidOpacity, (v) => (v > 0 ? 7 : "auto"));
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
      flightScrollTo(
        containerTop + scrollableHeight * scrollFromProgress(targetProgress),
        customEvent.detail?.source !== "dial",
      );
    };

    window.addEventListener("navigate-flight-section", handleNavigation as EventListener);
    window.addEventListener("navigate-flight-progress", handleNavigation as EventListener);
    return () => {
      window.removeEventListener("navigate-flight-section", handleNavigation as EventListener);
      window.removeEventListener("navigate-flight-progress", handleNavigation as EventListener);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let detach: (() => void) | undefined;
    let introNarrationComplete = false;
    let lifecycle: "idle" | "running" | "paused" = "idle";
    let pauseFlight: (() => void) | undefined;
    let resumeFlight: (() => void) | undefined;
    // Set by the running tour; the dial seeks through it (see ScrollDial).
    let seekLeg: ((direction: 1 | -1) => void) | undefined;

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
      seekLeg = undefined;
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

      let containerTop = window.scrollY + container.getBoundingClientRect().top;
      let scrollable = container.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const refreshScrollGeometry = () => {
        containerTop = window.scrollY + container.getBoundingClientRect().top;
        scrollable = container.offsetHeight - window.innerHeight;
      };

      let lastInnerHeight = window.innerHeight;
      const refreshScrollGeometryIfNeeded = () => {
        const innerHeight = window.innerHeight;
        if (innerHeight === lastInnerHeight) return;
        lastInnerHeight = innerHeight;
        refreshScrollGeometry();
      };

      const toScrollTop = (p: number) =>
        containerTop + scrollable * scrollFromProgress(p);

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
        const target = getNavTargetProgress(card.id) ?? 0;

        if (i === 0) {
          const next = cards[1] ? getNavTargetProgress(cards[1].id) ?? target : target;
          legs.push({
            target: 0,
            travelMs: 1,
            linear: true,
            holdMs: 1,
            cardIndex: i,
            // The narrated Home beat is the story on a first visit and a
            // toll on a fourth. Past a couple of visits the tour opens on
            // Home and flies straight on rather than holding for the voice
            // — which is what SkipIntroPrompt offers by hand, taken
            // automatically for someone who has demonstrably heard it.
            waitForNarration: !shouldSkipIntro(),
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

      flightScrollTo(toScrollTop(0));
      smoothScrollProgress.jump(0);

      let index = 0;
      let from = 0;
      let legMs = 0;
      let dwellUntil = 0;
      let dwellRemaining = 0;
      let travelElapsed = 0;
      let phaseStarted = 0;
      let phase: "starting" | "travel" | "dwell" = "starting";
      let currentProgress = 0;

      const holdCurrentProgress = () => {
        refreshScrollGeometryIfNeeded();
        const targetScrollTop = toScrollTop(currentProgress);
        if (Math.abs(window.scrollY - targetScrollTop) <= 1) return;
        flightScrollTo(targetScrollTop);
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

      // Turning the ring mid-tour skips a leg, like chapter skip on a player
      // — the tour keeps flying, it just flies the next one. Jumping back a
      // leg starts it from where the previous one began rather than from the
      // current position, otherwise "back" would re-fly the few percent you
      // had already crossed and land you where you started.
      seekLeg = (direction: 1 | -1) => {
        if (lifecycle !== "running") return;
        const next = index + direction;
        if (next < 0 || next >= legs.length) return;
        if (direction < 0) currentProgress = legs[index].target;
        index = next;
        dwellRemaining = 0;
        beginLeg(performance.now());
        // The dwell path parks the scroll itself; the travel path needs the
        // camera put where the new leg starts before its first frame.
        smoothScrollProgress.jump(currentProgress);
      };

      let holdFrames = 6;
      const holdAtStart = (now: number) => {
        flightScrollTo(toScrollTop(0));
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
        flightScrollTo(toScrollTop(p));
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
      window.dispatchEvent(new CustomEvent("flight-autopilot-launch"));
      runFlight();
    };

    const onSeek = (event: Event) => {
      const delta = (event as CustomEvent<{ delta?: number }>).detail?.delta;
      if (delta === 1 || delta === -1) seekLeg?.(delta);
    };

    window.addEventListener("flight-autopilot-seek", onSeek as EventListener);
    window.addEventListener("flight-autopilot", onCommand as EventListener);
    window.addEventListener("narration-progress", onNarrationProgress as EventListener);

    if (sessionStorage.getItem("autopilot-pending")) {
      sessionStorage.removeItem("autopilot-pending");
      onCommand(new CustomEvent("flight-autopilot", { detail: { action: "start" } }));
    }

    return () => {
      window.removeEventListener("flight-autopilot-seek", onSeek as EventListener);
      window.removeEventListener("flight-autopilot", onCommand as EventListener);
      window.removeEventListener("narration-progress", onNarrationProgress as EventListener);
      finish();
    };
  }, [smoothScrollProgress]);

  useEffect(() => {
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
    <div
      ref={containerRef}
      className="mission-flight relative w-full bg-transparent"
      style={{ height: `${TRACK_VH}svh`, overflowAnchor: "none" }}
    >
      <div className="sticky top-0 flex h-screen w-screen items-center justify-center overflow-hidden [perspective:1100px]">
        <motion.div
          className="absolute -inset-y-1/4 inset-x-0 bg-[#01030a]"
          style={{
            y: parallaxFar,
            scale: parallaxFarScale,
          }}
        />

        {SPACE_REGIONS.map((region, index) => (
          <SpaceRegionLayer
            key={region.id}
            region={region}
            index={index}
            scrollProgress={smoothScrollProgress}
          />
        ))}

        <motion.div
          className="absolute -inset-y-1/4 inset-x-0 bg-[radial-gradient(circle_at_50%_55%,_rgba(56,189,248,0.22)_0%,_rgba(79,70,229,0.14)_38%,_transparent_62%)]"
          style={{ opacity: deepGlowOpacity, y: parallaxNear }}
        />

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[14%] transform-gpu mix-blend-screen"
          style={{
            opacity: flightStreakOpacity,
            scale: flightStreakScale,
            y: flightStreakY,
            backgroundImage: FLIGHT_STREAK_BACKGROUND,
            willChange: "transform, opacity",
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: starfieldLayer }}
        >
          <SpaceParticles />
        </motion.div>

        <ShootingStars />

        <motion.div
          className="pointer-events-none absolute inset-0 z-[5] bg-black"
          style={{ opacity: endVoidOpacity }}
        />

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[6] overflow-hidden"
          style={{ opacity: endVoidOpacity }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ opacity: dawnSkyOpacity, background: DAWN_SKY, willChange: "opacity" }}
          />
          <motion.div
            className="absolute inset-0"
            style={{ opacity: dawnGlowOpacity, background: DAWN_GLOW }}
          />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0 z-[6] overflow-hidden"
          style={{ opacity: endEarthOpacity }}
        >

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

        <motion.div
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
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(86vh,130vw,760px)] w-[min(86vh,130vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.09)_0%,_rgba(14,165,233,0.035)_38%,_transparent_68%)]"
            initial={false}
            animate={
              endMarkShown
                ? { opacity: [0.34, 0.64, 0.34], scale: [0.97, 1.03, 0.97] }
                : { opacity: 0, scale: 0.9 }
            }
            transition={
              endMarkShown
                ? { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
                : { duration: 0.5 }
            }
          />
          <motion.div
            initial={false}
            animate={
              isEndParticleActive
                ?
                  { opacity: endScattered ? 0 : 1, scale: 1, y: endMarkShown ? -18 : 0 }
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
            <motion.span
              initial={false}
              animate={{ opacity: endMarkShown ? 1 : 0, y: endMarkShown ? 0 : -6 }}
              transition={{ duration: 0.7, delay: endMarkShown ? 0.25 : 0, ease: "easeOut" }}
              className="mb-3 text-[9px] font-semibold uppercase tracking-[0.34em] text-sky-200/45 sm:mb-4 sm:tracking-[0.5em] lg:text-[10px]"
            >
            </motion.span>
            <p className="text-[clamp(0.9rem,4.6vw,1.35rem)] font-semibold uppercase leading-[1.35] tracking-[0.1em] text-sky-50 drop-shadow-[0_4px_20px_rgba(2,8,23,0.65)] sm:text-2xl sm:tracking-[0.18em] lg:text-[2rem]">
              YOUR IMAGINATION, YOUR IDEAS AND VISION.
              <br />
               CREATED BY
            </p>
          </motion.div>

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
              active={endMarkShown}
              gatherFromStars
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: endParticleCanvasBox.width,
                height: endParticleCanvasBox.height,
              }}
            />
          </div>
          <motion.div
            initial={false}
            animate={{ opacity: endMarkShown ? 1 : 0, y: endMarkShown ? 0 : 8 }}
            transition={{ duration: 0.8, delay: endMarkShown ? 0.9 : 0, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center"
          >
            <SignatureName
              active={endMarkShown}
              className="text-[clamp(1.75rem,9vw,2.25rem)] text-sky-100/90 sm:text-5xl lg:text-6xl"
            />
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
              revealApproach={getRevealWindow(index).approach}
              revealStart={getRevealWindow(index).start}
              revealEnd={getRevealWindow(index).end}
              originVisit={originVisit}
            />
          ))}

          <TechnologyLayover
            compact={isMobile}
            stacked={isStacked}
            progress={smoothScrollProgress}
          />
        </motion.div>

        <LayoverCaption
          progress={smoothScrollProgress}
          isMobile={isMobile}
          isStacked={isStacked}
        />

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40"
          style={{ backdropFilter: loopRushBlur, WebkitBackdropFilter: loopRushBlur }}
        />

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50"
          style={{ background: `${DAWN_GLOW}, ${DAWN_SKY}` }}
          initial={false}
          animate={{ opacity: isWrapping ? 1 : 0 }}
          transition={{ duration: isWrapping ? 0.26 : 0.36, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
