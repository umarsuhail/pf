"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useState } from "react";
import { cardGradients, cards } from "../data/sections";
import {
  getDepartWindow,
  TECHNOLOGY_FOCUS_STOPS,
  TECHNOLOGY_LAYOVER_END,
  TECHNOLOGY_LAYOVER_START,
  TECHNOLOGY_NODE_GAP,
} from "../data/flightStops";
import {
  CARD_DEPART_NEAR_Z,
  CARD_PASS_THROUGH_Z,
  CARD_READING_DEPTH,
  PARKED_OFFSET,
  PARKED_OPACITY,
  cameraTravelFor,
} from "../lib/camera";
import RadarScope, { useToolPresence } from "./RadarScope";

// The toolkit, as a card in the corridor: a radar that finds the tools one at
// a time, with the copy for the one it has found beside it.
//
// It flies like a billboard and then docks at each tool. It comes up out of
// the distance as the Skills card clears, reaches reading depth at every tool
// stop, and eases a little deeper into the corridor between them while the
// spring of tool marks travels around it. At the last tool it lets go and the
// flight passes through it into Projects. Which tool it shows is the same pure
// function of progress as everything else in the corridor (see
// technologyFocusWindow), so the dial, gear snapping and the autopilot's
// per-tool stops all land on the tool the radar is showing, and scrolling
// back steps the list backwards.

const SKILLS_INDEX = cards.findIndex((card) => card.id === "skills");
const TOTAL = TECHNOLOGY_FOCUS_STOPS.length;
const pad = (value: number) => String(value).padStart(2, "0");

// One tool's copy. All of them are mounted, stacked in one grid cell (which
// is sized by the tallest), and each fades on its own window — the version
// that cannot drift, as the history rail beside the corridor already does.
function RadarCopy({
  index,
  progress,
  compact,
  stacked,
}: {
  index: number;
  progress: MotionValue<number>;
  compact: boolean;
  stacked: boolean;
}) {
  const { technology } = TECHNOLOGY_FOCUS_STOPS[index];
  const opacity = useToolPresence(progress, index);
  const y = useTransform(opacity, [0, 1], [8, 0]);
  return (
    <motion.div
      style={{ opacity, y, gridArea: "1 / 1" }}
      className="flex min-w-0 flex-col items-start text-left"
    >
      <span
        className={`flight-card-badge inline-flex items-center rounded-full border font-semibold uppercase ${
          compact ? "px-2.5 py-1 text-[9px] tracking-[0.2em]" : "px-4 py-2 text-xs tracking-[0.28em]"
        }`}
      >
        {technology.group}
      </span>
      <h3
        className={`flight-card-title font-semibold leading-tight ${
          stacked ? "mt-3 text-xl" : compact ? "mt-2.5 text-lg" : "mt-5 text-2xl sm:mt-6 sm:text-3xl lg:text-5xl"
        }`}
      >
        {technology.label}
        <span
          className={`flight-card-accent ml-3 align-middle font-medium uppercase ${
            compact ? "text-[9px] tracking-[0.18em]" : "text-xs tracking-[0.2em] sm:text-sm"
          }`}
        >
          {technology.level}
        </span>
      </h3>
      <p
        className={`flight-card-copy max-w-[38ch] ${
          stacked
            ? "mt-2.5 text-xs leading-[1.55]"
            : compact
              ? "mt-2 text-[11px] leading-[1.45]"
              : "mt-4 text-sm leading-6 sm:mt-5 sm:text-base sm:leading-7 lg:text-xl"
        }`}
      >
        {technology.usage}
      </p>
      <p
        className={`flight-card-meta mt-auto font-semibold uppercase tracking-[0.3em] ${
          compact ? "pt-3 text-[9px]" : "pt-6 text-[11px]"
        }`}
      >
        {pad(index + 1)} / {pad(TOTAL)}
      </p>
    </motion.div>
  );
}

export default function RadarCard({
  progress,
  compact,
  stacked,
}: {
  progress: MotionValue<number>;
  compact: boolean;
  stacked: boolean;
}) {
  const travel = cameraTravelFor(compact);

  // Arrives once the Skills card has cleared, and is fully up by the first
  // tool. Leaves on the billboards' own depart depths, measured from the
  // last tool, so it is gone before Projects is close enough to read.
  const revealStart = Math.max(
    getDepartWindow(SKILLS_INDEX).end,
    TECHNOLOGY_LAYOVER_START - 0.03,
  );
  const departStart =
    TECHNOLOGY_LAYOVER_END + (CARD_DEPART_NEAR_Z - CARD_READING_DEPTH) / travel;
  const departEnd =
    TECHNOLOGY_LAYOVER_END + (CARD_PASS_THROUGH_Z - CARD_READING_DEPTH) / travel;

  // The hold, in the corridor's own depth units. A billboard sits at one
  // depth and the camera carries it past; this card follows the camera through
  // the layover, but relaxes away from the lens between neighbouring tools and
  // returns to CARD_READING_DEPTH at every exact focus stop. The camera's own
  // smoothing makes that repeated settle feel spring-loaded without adding a
  // second clock that could drift from the copy, history rail or dial.
  // Clamped short of the projection plane on the way out, as the billboards
  // are, and parked like them once it has been flown through:
  // back at reading depth, off the top of the frame (PARKED_OFFSET), still
  // drawn, so the way back scales the raster it was read at instead of
  // re-rasterising it at the pass-through.
  const isParked = (value: number) => value >= departEnd;
  const translateZ = useTransform(progress, (value) => {
    if (isParked(value)) return CARD_READING_DEPTH - value * travel;
    const held = Math.min(
      Math.max(value, TECHNOLOGY_LAYOVER_START),
      TECHNOLOGY_LAYOVER_END,
    );
    const toolPosition =
      (held - TECHNOLOGY_LAYOVER_START) / TECHNOLOGY_NODE_GAP;
    const toolPhase = toolPosition - Math.floor(toolPosition);
    const dockDepth =
      value >= TECHNOLOGY_LAYOVER_START && value <= TECHNOLOGY_LAYOVER_END
        ? -(compact ? 64 : 100) * Math.sin(Math.PI * toolPhase) ** 2
        : 0;
    return Math.min(
      CARD_READING_DEPTH - held * travel,
      CARD_PASS_THROUGH_Z - value * travel,
    ) + dockDepth;
  });
  const parkY = useTransform(progress, (value) =>
    isParked(value) ? PARKED_OFFSET : "0vh",
  );

  const fade = useTransform(
    progress,
    [revealStart, TECHNOLOGY_LAYOVER_START, departStart, departEnd],
    [0, 1, 1, 0],
  );
  const opacity = useTransform(() =>
    isParked(progress.get()) ? PARKED_OPACITY : fade.get(),
  );
  // Out of the layer tree before its stretch, not merely transparent. It
  // first draws while still far off and small, so its raster starts small
  // and grows with it, the way an approaching billboard's does.
  const visibility = useTransform(progress, (value) =>
    value < revealStart ? "hidden" : "visible",
  );
  const [parked, setParked] = useState(() => isParked(progress.get()));
  useEffect(() => {
    const update = (value: number) =>
      setParked((previous) => {
        const next = value >= departEnd;
        return previous === next ? previous : next;
      });
    update(progress.get());
    return progress.on("change", update);
  }, [progress, departEnd]);

  // Whether anything of the card is on screen: the sweep only runs then.
  // Flipped on the threshold, so it is a handful of renders a flight.
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const update = (value: number) =>
      setOnScreen((previous) => {
        const next = value > 0.02;
        return previous === next ? previous : next;
      });
    update(opacity.get());
    return opacity.on("change", update);
  }, [opacity]);

  const depth = compact ? { bezel: 7, wall: -4 } : { bezel: 16, wall: -9 };

  return (
    <motion.section
      aria-label="Toolkit"
      inert={parked}
      style={{
        translateZ,
        y: parkY,
        opacity,
        visibility,
        background: cardGradients[SKILLS_INDEX],
        transformStyle: "preserve-3d",
        // Promoted and raster-locked like every billboard: it is painted at
        // its reading size and the GPU carries it from there.
        willChange: "transform",
        width: stacked
          ? "min(86vw, 400px)"
          : compact
            ? "min(80vw, 560px)"
            : "clamp(520px, 52vw, 880px)",
      }}
      // The nudge right keeps it clear of the history rail down the left
      // edge. It rides `translate`, not framer's `transform`, so the two
      // compose. Centred on phones, where the rail is a strip above it.
      className={`mission-flight-card pointer-events-none absolute flex rounded-3xl border sm:rounded-4xl ${
        compact ? "p-4" : "translate-x-[min(10vw,160px)] p-5 sm:p-8 lg:p-10"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flight-card-bezel pointer-events-none absolute inset-0 rounded-3xl sm:rounded-4xl ${
          compact ? "" : "hidden sm:block"
        }`}
        style={{ transform: `translateZ(${depth.bezel}px)`, willChange: "transform" }}
      />
      <span
        aria-hidden="true"
        className="flight-card-wall pointer-events-none absolute inset-[3px] rounded-3xl sm:rounded-4xl"
        style={{ transform: `translateZ(${depth.wall}px)`, willChange: "transform" }}
      />

      {/* Words first in the markup, radar last — it leads visually (on top
         when stacked, on the right otherwise) but the copy is what a screen
         reader reaches first. */}
      <div
        className={`flex w-full ${
          stacked ? "flex-col-reverse gap-4" : `items-stretch ${compact ? "gap-4" : "gap-6 sm:gap-10"}`
        }`}
      >
        <div className="grid min-w-0 flex-1">
          {TECHNOLOGY_FOCUS_STOPS.map((focus, index) => (
            <RadarCopy
              key={focus.id}
              index={index}
              progress={progress}
              compact={compact}
              stacked={stacked}
            />
          ))}
        </div>
        <RadarScope
          progress={progress}
          dormant={!onScreen}
          className={`shrink-0 self-center ${
            stacked
              ? "w-[min(62vw,240px)]"
              : compact
                ? "w-[clamp(130px,24vw,200px)]"
                : "w-[clamp(200px,19vw,320px)]"
          }`}
        />
      </div>
    </motion.section>
  );
}
