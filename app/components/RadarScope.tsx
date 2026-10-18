"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useId } from "react";
import {
  TECHNOLOGY_FOCUS_STOPS,
  TECHNOLOGY_LAYOVER_START,
  TECHNOLOGY_NODE_GAP,
  technologyFocusWindow,
} from "../data/flightStops";
import { BrandIcon } from "./icons/brand-icon";

const RING = { w: 43.4, h: 42.8 };
const FACE = { x: 1.1, y: 1.0, w: 41.3, h: 40.8 };
const GLASS = { x: 2.7, y: 2.7, w: 37.9, h: 37.4 };
const FACE_CENTRE = { x: 20.6, y: 20.4 };

// The three concentric rings of the face, measured off radar_lines.svg in its
// own 41.3-unit viewBox: 12.4%, 34.2% and 44.8% of the face box.
//
// They are drawn rather than animated in place because the art cannot be
// taken apart — radar_lines.svg is 86 flattened paths with no addressable
// rings, and it is consumed as a CSS mask-image, which rasterises whatever is
// inside it. So the etched rings stay as the static face and these light up
// over them in the beam colour, one at a time, smallest first.
const FACE_RINGS = [5.15, 14.11, 18.49];

// 30ms between one ring lighting and the next.
const RING_STEP_S = 0.03;
// How long the full set stays lit before it resets and runs again. Without
// this the whole cycle is 90ms — about five frames at 60Hz — which reads as a
// strobe rather than a sweep. Set it to 0 for the literal no-hold version.
const RING_HOLD_S = 0.9;
const RING_CYCLE_S = RING_STEP_S * FACE_RINGS.length + RING_HOLD_S;

const inRing = (r: { x: number; y: number; w: number; h: number }) => ({
  left: `${(r.x / RING.w) * 100}%`,
  top: `${(r.y / RING.h) * 100}%`,
  width: `${(r.w / RING.w) * 100}%`,
  height: `${(r.h / RING.h) * 100}%`,
});

const LAST = TECHNOLOGY_FOCUS_STOPS.length - 1;

export function useToolPresence(progress: MotionValue<number>, index: number) {
  const [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd] =
    technologyFocusWindow(TECHNOLOGY_FOCUS_STOPS[index].progress);
  const isFirst = index === 0;
  const isLast = index === LAST;
  const input =
    isFirst && isLast
      ? [0, 1]
      : isFirst
        ? [fadeOutStart, fadeOutEnd]
        : isLast
          ? [fadeInStart, fadeInEnd]
          : [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd];
  const output =
    isFirst && isLast ? [1, 1] : isFirst ? [1, 0] : isLast ? [0, 1] : [0, 1, 1, 0];
  return useTransform(progress, input, output);
}

function RadarContact({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const presence = useToolPresence(progress, index);
  const scale = useTransform(presence, [0, 1], [0.72, 1]);
  return (
    <motion.div
      style={{ opacity: presence, scale }}
      className="absolute inset-0 grid place-items-center"
    >
      <span
        className="absolute inset-[29%] rounded-full border bg-[rgba(2,8,23,0.62)]"
        style={{ borderColor: "color-mix(in srgb, var(--radar-beam) 55%, transparent)" }}
      />
      <BrandIcon
        slug={TECHNOLOGY_FOCUS_STOPS[index].technology.icon}
        className="relative h-[28%] w-[28%]"
      />
    </motion.div>
  );
}

function RadarLabel({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const presence = useToolPresence(progress, index);
  return (
    <motion.span
      style={{ opacity: presence }}
      className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
    >
      {TECHNOLOGY_FOCUS_STOPS[index].technology.label}
    </motion.span>
  );
}

const BEAM_STOPS = [
  [0, 0],
  [0.3, 4],
  [0.5, 15],
  [0.7, 36],
  [0.85, 62],
  [1, 100],
] as const;

export default function RadarScope({
  progress,
  dormant,
  className = "",
}: {
  progress: MotionValue<number>;
  dormant: boolean;
  className?: string;
}) {
  const beamGradientId = `radar-beam-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const faceGradientId = `radar-face-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const ping = useTransform(progress, (value) => {
    const nearest = Math.min(
      LAST,
      Math.max(0, Math.round((value - TECHNOLOGY_LAYOVER_START) / TECHNOLOGY_NODE_GAP)),
    );
    const windowStart =
      TECHNOLOGY_FOCUS_STOPS[nearest].progress - TECHNOLOGY_NODE_GAP * 0.5;
    return Math.min(1, Math.max(0, (value - windowStart) / (TECHNOLOGY_NODE_GAP * 0.32)));
  });
  const pingScale = useTransform(ping, [0, 1], [0.2, 1.1]);
  const pingOpacity = useTransform(ping, [0, 0.12, 1], [0, 0.85, 0]);

  return (
    <div
      aria-hidden="true"
      className={`flex flex-col items-center ${dormant ? "radar-dormant" : ""} ${className}`}
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: "55 / 3.2", containerType: "inline-size" }}
      >
        <svg
          viewBox="0 0 55 3.2"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
          stroke="var(--radar-face)"
        >
          <line x1="0" y1="0" x2="55" y2="0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <polyline
            points="19.7 3.1 17.5 3.1 15 0 41.3 0 38.8 3.1 36.7 3.1"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          className="absolute inset-0 font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--radar-face)", fontSize: "clamp(7px, 2.8cqw, 10px)" }}
        >
          {TECHNOLOGY_FOCUS_STOPS.map((focus, index) => (
            <RadarLabel key={focus.id} index={index} progress={progress} />
          ))}
        </div>
      </div>

      <div
        className="relative isolate mt-[4%] w-[79%]"
        style={{ aspectRatio: `${RING.w} / ${RING.h}` }}
      >
        <svg
          viewBox={`0 0 ${FACE.w} ${FACE.h}`}
          className="absolute"
          style={inRing(FACE)}
        >
          <defs>
            <radialGradient id={faceGradientId} cx="52%" cy="48%" r="52%">
              {(
                [
                  [0, 100],
                  [0.1, 93],
                  [0.3, 74],
                  [0.6, 45],
                  [0.8, 19],
                  [1, 0],
                ] as const
              ).map(([offset, share]) => (
                <stop
                  key={offset}
                  offset={offset}
                  style={{ stopColor: `color-mix(in srgb, var(--radar-face) ${share}%, black)` }}
                />
              ))}
            </radialGradient>
          </defs>
          <ellipse
            cx={FACE_CENTRE.x}
            cy={FACE_CENTRE.y}
            rx={FACE.w / 2}
            ry={FACE.h / 2}
            fill={`url(#${faceGradientId})`}
          />
        </svg>

        <div
          className="absolute"
          style={{
            ...inRing(FACE),
            backgroundColor: "var(--radar-face)",
            maskImage: "url(/radar/radar_lines.svg)",
            WebkitMaskImage: "url(/radar/radar_lines.svg)",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />

        {/* The rings lighting in sequence. Pointer-events-none and purely
            decorative, so it sits between the etched face and the contacts. */}
        <div className="absolute" style={inRing(FACE)} aria-hidden="true">
          <svg
            viewBox={`0 0 ${FACE.w} ${FACE.h}`}
            className="pointer-events-none h-full w-full"
            fill="none"
          >
            {FACE_RINGS.map((radius, index) => {
              // Each ring turns on `index * RING_STEP_S` into the cycle and
              // they all go out together at the end, which is what makes the
              // reset read as "back to the first" rather than a reverse
              // cascade. A short ramp rather than a hard cut, so the smallest
              // ring does not pop at 60Hz.
              const onAt = (index * RING_STEP_S) / RING_CYCLE_S;
              return (
                <motion.circle
                  key={radius}
                  cx={FACE_CENTRE.x}
                  cy={FACE_CENTRE.y}
                  r={radius}
                  stroke="var(--radar-beam)"
                  strokeWidth={0.18}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0, 0.85, 0.85, 0] }}
                  transition={{
                    duration: RING_CYCLE_S,
                    times: [0, onAt, onAt + 0.012, 0.96, 1],
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              );
            })}
          </svg>
        </div>

        <div className="absolute" style={inRing(FACE)}>
          {TECHNOLOGY_FOCUS_STOPS.map((focus, index) => (
            <RadarContact key={focus.id} index={index} progress={progress} />
          ))}
          <motion.span
            className="absolute inset-[18%] rounded-full border-2"
            style={{
              borderColor: "var(--radar-beam)",
              scale: pingScale,
              opacity: pingOpacity,
            }}
          />
        </div>

        <div
          className="radar-beam absolute mix-blend-screen"
          style={{
            ...inRing(FACE),
            transformOrigin: `${(FACE_CENTRE.x / FACE.w) * 100}% ${(FACE_CENTRE.y / FACE.h) * 100}%`,
          }}
        >
          <svg viewBox={`0 0 ${FACE.w} ${FACE.h}`} className="h-full w-full">
            <defs>
              <linearGradient
                id={beamGradientId}
                x1="1.2"
                y1="8.8"
                x2="40.2"
                y2="15.9"
                gradientTransform="translate(-11.3 -3.9) scale(1.1)"
                gradientUnits="userSpaceOnUse"
              >
                {BEAM_STOPS.map(([offset, share]) => (
                  <stop
                    key={offset}
                    offset={offset}
                    style={{ stopColor: `color-mix(in srgb, var(--radar-beam) ${share}%, black)` }}
                  />
                ))}
              </linearGradient>
            </defs>
            <g transform={`translate(${FACE_CENTRE.x - 18.2} ${FACE_CENTRE.y - 18})`}>
              <path
                d="M18.2,0C8.2,0,0,8.1,0,18h18.2l14.6-10.8C29.5,2.8,24.2,0,18.2,0Z"
                fill={`url(#${beamGradientId})`}
              />
            </g>
          </svg>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/radar/SVG/radar_glass_top.svg"
          alt=""
          className="absolute mix-blend-multiply"
          style={inRing(GLASS)}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/radar/SVG/ring_outer.svg"
          alt=""
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
