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

// The toolkit radar: Umar's instrument (public/radar/SVG), assembled.
//
// Every piece was drawn in one coordinate space centred on the bezel, so each
// layer here is placed as a percentage of the bezel's own box using the
// artwork's units — the face, the beam's pivot and the glass land exactly
// where they were drawn, at any size the card gives the scope.
//
// The bezel and the glass are used as drawn. The face, its line art, the beam
// and the title holder take the theme instead (--radar-face / --radar-beam in
// globals.css), the way every other card on the flight does: the face is a
// gradient drawn here, the line art is radar_lines.svg (radar_base.svg without
// its background disc) used as a mask over the accent, and the beam and title
// holder are redrawn inline from their files so their colours can be tokens.
const RING = { w: 43.4, h: 42.8 };
const FACE = { x: 1.1, y: 1.0, w: 41.3, h: 40.8 };
const GLASS = { x: 2.7, y: 2.7, w: 37.9, h: 37.4 };
// Where the beam pivots inside the face's box: the radar's centre.
const FACE_CENTRE = { x: 20.6, y: 20.4 };

const inRing = (r: { x: number; y: number; w: number; h: number }) => ({
  left: `${(r.x / RING.w) * 100}%`,
  top: `${(r.y / RING.h) * 100}%`,
  width: `${(r.w / RING.w) * 100}%`,
  height: `${(r.h / RING.h) * 100}%`,
});

const LAST = TECHNOLOGY_FOCUS_STOPS.length - 1;

// How present one tool is, 0..1, as a pure function of flight progress: its
// own focus window, with no blank ends — the first tool is already on the
// radar as the card arrives, and the last is still on it as the card leaves.
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

// One tool's mark at the centre of the scope. It blips in from a little
// smaller as its window opens, and shrinks away as the next one is found.
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
      {/* The contact's plate. Brand marks bring their own colours, and a
         blue whale on a sky-blue face (or a yellow JS on Night's amber)
         all but vanishes; a dark well behind each one keeps every mark
         legible on every theme. */}
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

// The tool's name, set in the title holder above the scope.
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

// The beam's light, from the trailing edge to the leading one. beam_light.svg
// builds this out of a black-to-green ramp under a grey mask; these stops are
// that product, so the sweep fades the same way in any colour.
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
  /** Parks the sweep while the card is not on screen (see .radar-dormant). */
  dormant: boolean;
  className?: string;
}) {
  const beamGradientId = `radar-beam-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const faceGradientId = `radar-face-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // A ring goes out from the centre as each tool is found: over the first
  // third of the tool's window, finished by the time it is level with you.
  // A pure function of progress like the rest, so it plays backwards too.
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
      {/* Title holder: title_holder.svg, with the tool's name in its tab. */}
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
          // Sized off the holder's own width (it is a size container), so the
          // longest name, "Adobe After Effects", clears the tab's sloped
          // sides — about 24 of the holder's 55 units at mid-height — at any
          // scope size.
          className="absolute inset-0 font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--radar-face)", fontSize: "clamp(7px, 2.8cqw, 10px)" }}
        >
          {TECHNOLOGY_FOCUS_STOPS.map((focus, index) => (
            <RadarLabel key={focus.id} index={index} progress={progress} />
          ))}
        </div>
      </div>

      {/* The scope, 43.4 : 42.8 like the bezel it sits in. isolate keeps the
         beam's screen and the glass's multiply inside the instrument. */}
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

        {/* Rings, crosshair and ticks, in the accent. */}
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

        {/* The sweep. Its own compositor layer (.radar-beam animates only
           transform), screened over the face below it. */}
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
            {/* beam_light.svg's wedge, moved so its pivot (18.2, 18) sits on
               the face's centre. */}
            <g transform={`translate(${FACE_CENTRE.x - 18.2} ${FACE_CENTRE.y - 18})`}>
              <path
                d="M18.2,0C8.2,0,0,8.1,0,18h18.2l14.6-10.8C29.5,2.8,24.2,0,18.2,0Z"
                fill={`url(#${beamGradientId})`}
              />
            </g>
          </svg>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- static
           artwork layered with blend modes; next/image would only add a
           wrapper around a 1KB SVG. */}
        <img
          src="/radar/SVG/radar_glass_top.svg"
          alt=""
          className="absolute mix-blend-multiply"
          style={inRing(GLASS)}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
        <img
          src="/radar/SVG/ring_outer.svg"
          alt=""
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
