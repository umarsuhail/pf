"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  TECHNOLOGY_FOCUS_STOPS,
  TECHNOLOGY_LAYOVER_END,
  TECHNOLOGY_LAYOVER_START,
  TECHNOLOGY_NODE_GAP,
  technologyFocusWindow,
} from "../data/flightStops";
import { CSS_PERSPECTIVE_Z, cameraTravelFor } from "../lib/camera";
import RadarCard from "./RadarCard";
import { BrandIcon } from "./icons/brand-icon";

const CAPTION_LEAD = 0.03;
const CAPTION_TAIL = 0.02;

type Technology = (typeof TECHNOLOGY_FOCUS_STOPS)[number]["technology"];

const SPRING_STEP_DEGREES = 42;
const SPRING_TWIST_DEGREES = 720;
const SPRING_RADIUS = { desktop: 680, mobile: 172 } as const;
const SPRING_Y_RATIO = { desktop: 0.58, mobile: 1 } as const;
const SPRING_TILE_SPIN_TURNS = 1.5;

const SPRING_MAX_CAMERA_Z = CSS_PERSPECTIVE_Z * 0.72;
const springPassSpan = (compact: boolean) =>
  SPRING_MAX_CAMERA_Z / cameraTravelFor(compact);
const SPRING_FADE_IN_START = -12 * TECHNOLOGY_NODE_GAP;
const SPRING_FADE_IN_MID = -7.5 * TECHNOLOGY_NODE_GAP;
const SPRING_FADE_IN_END = -4 * TECHNOLOGY_NODE_GAP;
const springFadeOutEnd = (compact: boolean) =>
  Math.min(2.6 * TECHNOLOGY_NODE_GAP, springPassSpan(compact));
const springFadeOutStart = (compact: boolean) =>
  Math.min(1.5 * TECHNOLOGY_NODE_GAP, springFadeOutEnd(compact) * 0.55);

const px = (value: number) => Math.round(value * 100) / 100;

function TechnologySpringNode({
  technology,
  index,
  stop,
  compact,
  progress,
  envelope,
}: {
  technology: Technology;
  index: number;
  stop: number;
  compact: boolean;
  progress: MotionValue<number>;
  envelope: MotionValue<number>;
}) {
  const travel = cameraTravelFor(compact);
  const baseZ = -stop * travel;

  const translateZ = useTransform(progress, (value) =>
    px(Math.min(baseZ, SPRING_MAX_CAMERA_Z - value * travel)),
  );
  const ownOpacity = useTransform(
    progress,
    [
      stop + SPRING_FADE_IN_START,
      stop + SPRING_FADE_IN_MID,
      stop + SPRING_FADE_IN_END,
      stop + springFadeOutStart(compact),
      stop + springFadeOutEnd(compact),
    ],
    [0, 0.34, 0.88, 0.88, 0],
  );
  const opacity = useTransform(
    [ownOpacity, envelope],
    ([own, gate]: number[]) => own * gate,
  );
  const focusGlow = useTransform(
    progress,
    technologyFocusWindow(stop),
    [0, 1, 1, 0],
  );

  const radius = compact ? SPRING_RADIUS.mobile : SPRING_RADIUS.desktop;
  const yRatio = compact ? SPRING_Y_RATIO.mobile : SPRING_Y_RATIO.desktop;
  const layoverSpan = TECHNOLOGY_LAYOVER_END - TECHNOLOGY_LAYOVER_START;
  const angleAt = (value: number) =>
    ((index * SPRING_STEP_DEGREES +
      ((value - TECHNOLOGY_LAYOVER_START) / layoverSpan) * SPRING_TWIST_DEGREES) *
      Math.PI) /
    180;
  const x = useTransform(progress, (value) => px(Math.cos(angleAt(value)) * radius));
  const y = useTransform(progress, (value) =>
    px(Math.sin(angleAt(value)) * radius * yRatio),
  );
  const tileSpin = useTransform(
    progress,
    [stop + SPRING_FADE_IN_START, stop + SPRING_FADE_IN_END],
    [-360 * SPRING_TILE_SPIN_TURNS, 0],
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        style={{
          translateZ,
          opacity,
          x,
          y,
          transformStyle: "preserve-3d",
        }}
        className="relative grid place-items-center"
      >
        <motion.span
          className="relative grid place-items-center"
          style={{ transformStyle: "preserve-3d", rotate: tileSpin }}
        >
          <span
            className={`flight-tool-back absolute rounded-full ${
              compact ? "-inset-[3px]" : "-inset-1"
            }`}
            style={{ transform: `translateZ(${compact ? -5 : -9}px)` }}
          />
          <span
            className={`flight-tool-surface relative grid place-items-center rounded-full border ${
              compact ? "h-11 w-11" : "h-20 w-20"
            }`}
          >
            <BrandIcon
              slug={technology.icon}
              className={compact ? "h-5 w-5" : "h-10 w-10"}
            />
            <motion.span
              style={{ opacity: focusGlow }}
              className="flight-tool-focus pointer-events-none absolute inset-0 rounded-full border"
            />
          </span>
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              transform: `translateZ(${compact ? 3 : 6}px)`,
              boxShadow: "var(--flight-card-bezel)",
            }}
          />
        </motion.span>
      </motion.div>
    </div>
  );
}

function TechnologySpring({
  compact,
  progress,
}: {
  compact: boolean;
  progress: MotionValue<number>;
}) {
  const envelope = useTransform(
    progress,
    [
      TECHNOLOGY_LAYOVER_START - 0.012,
      TECHNOLOGY_LAYOVER_START + 0.004,
      TECHNOLOGY_LAYOVER_END + 0.002,
      TECHNOLOGY_LAYOVER_END + 0.009,
    ],
    [0, 1, 1, 0],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ transformStyle: "preserve-3d" }}
    >
      {TECHNOLOGY_FOCUS_STOPS.map((focus, index) => (
        <TechnologySpringNode
          key={focus.id}
          technology={focus.technology}
          index={index}
          stop={focus.progress}
          compact={compact}
          progress={progress}
          envelope={envelope}
        />
      ))}
    </div>
  );
}

const MILESTONE_WITH_NOTE_PX = 76;

function TechnologyTimeline({
  technology,
  stop,
  progress,
  room,
}: {
  technology: Technology;
  stop: number;
  progress: MotionValue<number>;
  room: number;
}) {
  const focusWindow = technologyFocusWindow(stop);
  const opacity = useTransform(progress, focusWindow, [0, 1, 1, 0]);
  const rail = useTransform(
    progress,
    [focusWindow[0], focusWindow[1] + (focusWindow[2] - focusWindow[1]) * 0.4],
    [0, 1],
  );
  const milestones = technology.timeline ?? [];
  const last = milestones.length - 1;
  const showNotes = room >= milestones.length * MILESTONE_WITH_NOTE_PX;

  return (
    <motion.ol style={{ opacity }} className="absolute inset-x-0 top-0 pl-6">
      <span aria-hidden="true" className="absolute bottom-2 left-[5px] top-2 w-px bg-sky-200/15" />
      <motion.span
        aria-hidden="true"
        style={{ scaleY: rail }}
        className="absolute bottom-2 left-[5px] top-2 w-px origin-top bg-[linear-gradient(180deg,rgba(165,243,252,0.9),rgba(56,189,248,0.6))] shadow-[0_0_10px_rgba(34,211,238,0.6)]"
      />
      {milestones.map((m, i) => (
        <li key={m.date} className="relative pb-3.5 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-6 top-[0.35rem] h-[11px] w-[11px] rounded-full border ${
              i === 0 || i === last
                ? "border-cyan-200 bg-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                : "border-sky-200/60 bg-slate-950"
            }`}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/85">
            {m.date}
            {i === 0 && last > 0 && <span className="ml-2 text-cyan-200/80">· Start</span>}
            {i === last && last > 0 && <span className="ml-2 text-cyan-200/80">· Now</span>}
          </p>
          <p className="mt-0.5 text-base font-semibold leading-tight text-sky-50">{m.version}</p>
          {showNotes && (
            <p className="mt-0.5 text-[13px] leading-snug text-sky-100/75">{m.note}</p>
          )}
        </li>
      ))}
    </motion.ol>
  );
}

function LayoverCaption({
  progress,
  isMobile,
  isStacked,
}: {
  progress: MotionValue<number>;
  isMobile: boolean;
  isStacked: boolean;
}) {
  const showHistory = !isMobile;

  const timelineBoxRef = useRef<HTMLDivElement>(null);
  const [timelineRoom, setTimelineRoom] = useState(0);
  useEffect(() => {
    const box = timelineBoxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) =>
      setTimelineRoom(entry.contentRect.height),
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [showHistory]);

  const opacity = useTransform(
    progress,
    [
      TECHNOLOGY_LAYOVER_START - CAPTION_LEAD,
      TECHNOLOGY_LAYOVER_START,
      TECHNOLOGY_LAYOVER_END,
      TECHNOLOGY_LAYOVER_END + CAPTION_TAIL,
    ],
    [0, 1, 1, 0],
  );

  if (isMobile && !isStacked) return null;

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ opacity }}
        className={`pointer-events-none absolute z-6 [text-shadow:0_2px_6px_rgba(2,8,23,0.95),0_0_28px_rgba(2,8,23,0.85)] ${
          isMobile
            ? "inset-x-0 top-[11%] px-6 text-center"
            : "right-8 top-[12%] w-[min(34rem,44vw)] text-right lg:right-14"
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-[0.42em] text-emerald-200/90 sm:text-sm ${
            isMobile ? "" : "-mr-[0.42em]"
          }`}
        >
          Skills layover
        </p>
        <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-sky-50 sm:text-6xl">
          Tools I use to ship
        </h2>
      </motion.div>

      {showHistory && (
        <motion.div
          ref={timelineBoxRef}
          aria-hidden="true"
          style={{ opacity }}
          className="pointer-events-none absolute bottom-[11%] left-8 top-[12%] z-6 w-[min(20rem,26vw)] [text-shadow:0_2px_6px_rgba(2,8,23,0.95),0_0_28px_rgba(2,8,23,0.85)] lg:left-14"
        >
          {TECHNOLOGY_FOCUS_STOPS.filter((focus) => focus.technology.timeline?.length).map(
            (focus) => (
              <TechnologyTimeline
                key={focus.id}
                technology={focus.technology}
                stop={focus.progress}
                progress={progress}
                room={timelineRoom}
              />
            ),
          )}
        </motion.div>
      )}
    </>
  );
}

export default function TechnologyLayover({
  compact,
  stacked,
  progress,
}: {
  compact: boolean;
  stacked: boolean;
  progress: MotionValue<number>;
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ transformStyle: "preserve-3d" }}
    >
      <TechnologySpring compact={compact} progress={progress} />
      <RadarCard progress={progress} compact={compact} stacked={stacked} />
    </div>
  );
}

export { LayoverCaption };
