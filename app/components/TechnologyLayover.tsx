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

// The Skills layover: the stretch of corridor between the Skills and Projects
// cards, which the toolkit owns outright.
//
// The toolkit itself is RadarCard — a card in the corridor that holds at
// reading distance while its radar finds the tools one at a time. The tool
// marks keep travelling around it on a 3D spring: each one sits at its own
// focus depth, corkscrews out of the distance, and is flown past. That keeps
// the radar readable without flattening this long stretch into a static HUD.
//
// What remains in this file is screen-space, deliberately: the layover's
// title, and the history of the tool the radar is showing. Text this small
// has to stay on the pixel grid to be read.

// How far either side of the layover its screen-space words live. The title
// and the history arrive and leave together.
const CAPTION_LEAD = 0.03;
const CAPTION_TAIL = 0.02;

type Technology = (typeof TECHNOLOGY_FOCUS_STOPS)[number]["technology"];

// The spring uses the geometry of the earlier corridor helix, but only the
// marks remain: the radar already owns the label and the copy for the current
// tool. Forty-two degrees makes consecutive tools read as one coil without
// stacking them on exact radial spokes; the whole coil turns twice across the
// layover so the flight corkscrews through it rather than following a fixed
// tube.
const SPRING_STEP_DEGREES = 42;
const SPRING_TWIST_DEGREES = 720;
const SPRING_RADIUS = { desktop: 680, mobile: 172 } as const;
const SPRING_Y_RATIO = { desktop: 0.58, mobile: 1 } as const;
const SPRING_TILE_SPIN_TURNS = 1.5;

// A small off-axis mark can safely come much closer than a billboard. At this
// depth perspective carries it beyond the viewport instead of leaving it
// parked in a corner. The exit start is derived from the capped end so the
// Framer input range can never invert if camera travel changes again.
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

// Browser transforms retain roughly hundredth-pixel precision. Rounding the
// trigonometric positions before they reach markup keeps server and client
// transforms identical while remaining visually lossless.
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

  // The corridor parent moves by +progress*travel. Parking this node at
  // -stop*travel therefore brings it level with the camera at exactly the same
  // focus stop used by the radar, copy, history rail, dial and autopilot.
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
  // The long approach needed for visible depth would otherwise leak tool
  // marks over the Skills and Projects panels. This envelope keeps the whole
  // spring inside the layover that owns it.
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

// A tool's history with Umar — the versions he came up through — for the
// tools that have one (`timeline` in skillGroups.ts). Lives on the same
// window as the radar's copy, so the history on screen is always the tool
// the radar is showing.
//
// Down the left edge — the one margin the title (top right) and the radar
// card leave free; the card is nudged right to keep it so. The rail draws in
// from the first entry to today as the flight arrives at the tool, a pure
// function of progress like the rest of this file. Desktop only: a phone has
// no margin beside the card, and the strip this used to become there sat
// straight across the card's top edge.
// Height one milestone needs with its note (date, version, a two-line note
// and the gap). Below this per entry the notes are dropped and the list
// reads as dates and versions only — decided per tool, since a five-entry
// history keeps its notes on a screen where a six-entry one cannot.
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
  /** Height the list may use. */
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
    // Sized by its own entries (not stretched to the box), so the rail
    // below runs exactly from the first dot to the last.
    <motion.ol style={{ opacity }} className="absolute inset-x-0 top-0 pl-6">
      {/* The rail: faint all the way down, drawn bright from the start to
         now as the flight arrives. */}
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
          {/* Dropped when the whole list would not fit the rail's box (see
             MILESTONE_WITH_NOTE_PX); dates and versions still read. */}
          {showNotes && (
            <p className="mt-0.5 text-[13px] leading-snug text-sky-100/75">{m.note}</p>
          )}
        </li>
      ))}
    </motion.ol>
  );
}

// The layover's words. Screen-space, because text this small has to stay
// pinned to the pixel grid to be readable — but with no panel behind it, so
// the corridor keeps flying underneath. Contrast comes from a text shadow
// instead: a panel would wall the corridor off, and the words have to sit on
// the starfield the way a title card sits on a frame.
//
// The title takes the top-right corner and the history the left edge, which
// leaves the middle to the radar card. A portrait phone keeps only the title,
// centred above the card; a landscape phone has no height to give either, so
// there the card — which already names the tool and its group — stands alone.
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

  // The space the tool histories have to fit into, measured rather than
  // assumed — and re-measured if the rail appears after mount, when a window
  // is widened past the phone layout.
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
        {/* Tracked caps carry their letter-space past the last glyph, so
           right-aligned the eyebrow hangs a full 0.42em off the heading's
           edge. Pulled back by exactly that. */}
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

      {/* Tool histories, for the tools that have one. Same caption envelope
         and text shadow as the title; see TechnologyTimeline. From under the
         top margin to the bottom margin, so `room` is exactly the space the
         rail has. */}
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

// Rendered *inside* the corridor's perspective group — see MultiverseFlight.
// Outside it, the card and spring would be a flat picture laid over the
// flight; inside, they are a place the flight comes to and moves through.
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
