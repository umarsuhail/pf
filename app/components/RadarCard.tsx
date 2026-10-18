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


const SKILLS_INDEX = cards.findIndex((card) => card.id === "skills");
const TOTAL = TECHNOLOGY_FOCUS_STOPS.length;
const pad = (value: number) => String(value).padStart(2, "0");

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

  const revealStart = Math.max(
    getDepartWindow(SKILLS_INDEX).end,
    TECHNOLOGY_LAYOVER_START - 0.03,
  );
  const departStart =
    TECHNOLOGY_LAYOVER_END + (CARD_DEPART_NEAR_Z - CARD_READING_DEPTH) / travel;
  const departEnd =
    TECHNOLOGY_LAYOVER_END + (CARD_PASS_THROUGH_Z - CARD_READING_DEPTH) / travel;

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
        willChange: "transform",
        width: stacked
          ? "min(86vw, 400px)"
          : compact
            ? "min(80vw, 560px)"
            : "clamp(520px, 52vw, 880px)",
      }}
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
