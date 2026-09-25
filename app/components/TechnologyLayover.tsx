"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useState } from "react";
import {
  TECHNOLOGY_FOCUS_STOPS,
  TECHNOLOGY_LAYOVER_END,
  TECHNOLOGY_LAYOVER_START,
} from "../data/flightStops";
import { MAX_CARD_CAMERA_Z, cameraTravelFor } from "../lib/camera";
import { POWER2_OUT } from "../lib/easings";
import { BrandIcon } from "./icons/brand-icon";

// The toolkit, flown through rather than looked at.
//
// Three earlier versions were all the same mistake in different clothes: a
// screen-space panel laid over the corridor. One tool at a time in an empty
// frame; then three columns; then a flat ring of icons. Every one of them
// stopped the flight to show a diagram, and a diagram is exactly what this
// page is not — the whole site is one continuous journey, and a section that
// pauses it to display a chart reads as a different website wearing the same
// colours.
//
// So the tools are now *in* the corridor. Each one is a real object at a real
// depth, sitting on a helix that winds around the flight path, and the camera
// flies through it on the same scroll that carries everything else. Nothing
// here scales itself: a tool looks bigger because it is nearer, which is the
// browser's perspective doing the work, and it passes the viewer and falls
// behind because that is what happens when you fly past something.
//
// The depth of each node is not decorative either. A node sits at exactly the
// scroll position of its own focus stop, so "the sweep is on React" and "the
// camera is level with the React node" are the same sentence — which is what
// lets a click on one fly the flight to it instead of fighting whatever the
// scroll position says a frame later.

// How far around the helix each successive tool sits. Deliberately not a
// divisor of 360: at 45° or 60° the nodes line up into spokes when seen down
// the barrel, and the helix reads as a few straight rails instead of a turn.
const DEGREES_PER_NODE = 52;

// Radius of the helix, in the corridor's own pixels.
//
// 300 was too tight, and not by taste: a billboard is roughly 760px wide in
// the same space, so a node at 300 rides *inside* the card's footprint and is
// simply occluded by it — the tools were there, behind the panel, which is
// indistinguishable from not being there. 440 clears the card, and still only
// reaches 733px from centre when it passes the camera at 1.67x, comfortably
// inside a 960px half-viewport.
const HELIX_RADIUS = { desktop: 440, mobile: 176 } as const;

// Fade windows, in progress units either side of a node's own stop. Long
// approach, short exit: a tool should be legible for a while before you reach
// it and then be gone quickly once it is behind you, the way passing scenery
// works. The exit also has to finish well before the perspective singularity
// (0.05 * 8400 = 420px, just inside MAX_CARD_CAMERA_Z at 440) or a node would
// blow up to fill the screen on its way out.
// Fade windows, expressed as multiples of the gap between two tools rather
// than as fixed progress numbers.
//
// They were fixed numbers, and then the Skills-to-Projects leg got longer:
// the tools spread out, the windows did not, and a tool that used to be lit
// for four of its neighbours' worth of travel was suddenly lit for two. As
// multiples they hold their shape whenever that leg is re-timed.
//
// Long approach, short exit — a tool should be legible for a while before you
// reach it and gone quickly once it is behind you, the way passing scenery
// works. The exit is also capped at the depth where a node stops approaching
// (MAX_CARD_CAMERA_Z / camera travel ≈ 0.043 of progress): past that a node
// hangs at its largest scale instead of receding, and a node hanging at 1.67x
// while it fades is a smear across the corridor.
const NODE_GAP =
  (TECHNOLOGY_LAYOVER_END - TECHNOLOGY_LAYOVER_START) /
  Math.max(TECHNOLOGY_FOCUS_STOPS.length - 1, 1);

const FADE_IN_START = -12 * NODE_GAP;
const FADE_IN_MID = -7.5 * NODE_GAP;
const FADE_IN_END = -4 * NODE_GAP;
const FADE_OUT_START = 1.5 * NODE_GAP;
const FADE_OUT_END = Math.min(2.6 * NODE_GAP, 0.042);

// How far either side of the layover its screen-space words live. The title
// and the readout share this window so they arrive and leave together.
const CAPTION_LEAD = 0.03;
const CAPTION_TAIL = 0.02;

type Technology = (typeof TECHNOLOGY_FOCUS_STOPS)[number]["technology"];

// Transform offsets are rounded to the precision the browser itself keeps.
//
// A node's helix position is `cos(angle) * radius`, which is irrational, and
// its depth is `stop * travel`, which for a stop like 0.4655… is too. Rendered
// on the server those land in the HTML at full precision; parsed back out of
// the DOM they come back as `316.51px`, because that is all a browser stores
// for a length in a transform. React compares the two and reports a hydration
// mismatch on every node in the helix — a real warning about an entirely
// imaginary difference. Rounding here makes the value survive the round trip
// unchanged. Two decimals is a hundredth of a pixel across a 8400px corridor,
// so nothing about the flight moves.
const px = (value: number) => Math.round(value * 100) / 100;

// Which tool the flight is level with.
//
// The helix already answers this geometrically — a node sits at exactly its
// own stop, so the one on the camera plane is the one you are looking at —
// but the caption has to say it in words, and words cannot be a transform of
// a motion value. This is the one place in the layover that re-renders on
// scroll, and it is deliberately the cheapest possible version of that: the
// index only changes nineteen times across the whole leg, so React sees a
// state change once per tool rather than once per frame.
//
// The stops are evenly spaced, so the nearest one is arithmetic rather than a
// search. Outside the layover there is no focused tool at all, which is what
// takes the readout off screen rather than leaving the last tool's line
// hanging over Projects.
const LAST_NODE = TECHNOLOGY_FOCUS_STOPS.length - 1;

function focusedIndexAt(value: number) {
  if (
    value < TECHNOLOGY_LAYOVER_START - CAPTION_LEAD ||
    value > TECHNOLOGY_LAYOVER_END + CAPTION_TAIL
  ) {
    return -1;
  }
  const nearest = Math.round((value - TECHNOLOGY_LAYOVER_START) / NODE_GAP);
  return Math.min(Math.max(nearest, 0), LAST_NODE);
}

function useFocusedIndex(progress: MotionValue<number>) {
  const [index, setIndex] = useState(() => focusedIndexAt(progress.get()));
  useMotionValueEvent(progress, "change", (value) => {
    const next = focusedIndexAt(value);
    setIndex((current) => (current === next ? current : next));
  });
  return index;
}

function TechnologyNode({
  technology,
  index,
  stop,
  isFocused,
  isMobile,
  progress,
  envelope,
  onSelect,
}: {
  technology: Technology;
  index: number;
  stop: number;
  isFocused: boolean;
  isMobile: boolean;
  progress: MotionValue<number>;
  envelope: MotionValue<number>;
  onSelect: () => void;
}) {
  const cameraTravel = cameraTravelFor(isMobile);
  // The corridor group this renders inside is translated by +progress*travel,
  // so a node parked at -stop*travel arrives on the camera plane exactly at
  // its own stop. Clamped the same way the billboards are, so a node that is
  // already behind the viewer recedes with the camera rather than diving into
  // the singularity.
  const baseZ = -stop * cameraTravel;
  const translateZ = useTransform(progress, (value) =>
    px(Math.min(baseZ, MAX_CARD_CAMERA_Z - value * cameraTravel)),
  );

  // Five stops, not four: the visible window is ~1600px of depth, which is
  // sixteen nodes at once. At a flat opacity that is a crowd; held at 0.45
  // until the last third of the approach it is a chain receding into the
  // distance, which is what it actually is.
  const ownOpacity = useTransform(
    progress,
    [
      stop + FADE_IN_START,
      stop + FADE_IN_MID,
      stop + FADE_IN_END,
      stop + FADE_OUT_START,
      stop + FADE_OUT_END,
    ],
    [0, 0.45, 1, 1, 0],
  );
  const opacity = useTransform(
    [ownOpacity, envelope],
    ([own, gate]: number[]) => own * gate,
  );
  // The name arrives later than the mark and leaves with it: legible only
  // while the tool is close enough to read, which is also the only time it is
  // big enough to read.
  const ownLabelOpacity = useTransform(
    progress,
    [
      stop - 6 * NODE_GAP,
      stop - 3.2 * NODE_GAP,
      stop + FADE_OUT_START,
      stop + FADE_OUT_END,
    ],
    [0, 1, 1, 0],
  );
  const labelOpacity = useTransform(
    [ownLabelOpacity, envelope],
    ([own, gate]: number[]) => own * gate,
  );
  // Only the node you are level with can be clicked. Without this, every
  // invisible node in the corridor is still a hit target stacked over the one
  // you can actually see.
  const pointerEvents = useTransform(opacity, (value) =>
    value > 0.6 ? "auto" : "none",
  );

  const angle = (index * DEGREES_PER_NODE * Math.PI) / 180;
  const radius = isMobile ? HELIX_RADIUS.mobile : HELIX_RADIUS.desktop;

  // Each node gets its own centring layer, and the transform rides the button
  // inside it. An absolutely-positioned flex child does inherit the centred
  // static position, but only where the browser implements that — and the
  // alternative, a Tailwind -translate-x-1/2, would be silently overwritten,
  // since framer writes the whole `transform` property itself.
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.button
        type="button"
        onClick={onSelect}
        aria-label={`${technology.label}, ${technology.level}, ${technology.group}. Fly to it.`}
        style={{
          translateZ,
          opacity,
          pointerEvents,
          x: px(Math.cos(angle) * radius),
          y: px(Math.sin(angle) * radius),
          transformStyle: "preserve-3d",
        }}
        className="relative flex flex-col items-center gap-1.5 outline-none"
      >
        {/* The tool the readout is describing lights up, and that is all it
           does: no scale, no lift. A node's size in this corridor means its
           distance, and a tool that grew because it was selected would be
           lying about where it is. Light is the only emphasis available that
           does not claim the node moved. */}
        <span
          className={`grid place-items-center rounded-2xl border bg-slate-950/70 backdrop-blur-sm transition-[border-color,box-shadow] duration-500 hover:border-cyan-200/60 hover:shadow-[0_0_34px_rgba(34,211,238,0.4)] ${
            isFocused
              ? "border-cyan-200/70 shadow-[0_0_38px_rgba(34,211,238,0.45),0_18px_44px_rgba(2,8,23,0.6),inset_0_1px_0_rgba(255,255,255,0.18)]"
              : "border-white/15 shadow-[0_18px_44px_rgba(2,8,23,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]"
          } ${isMobile ? "h-11 w-11" : "h-16 w-16"}`}
        >
          <BrandIcon
            slug={technology.icon}
            className={isMobile ? "h-5 w-5" : "h-8 w-8"}
          />
        </span>
        <motion.span
          style={{ opacity: labelOpacity }}
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide transition-colors duration-500 sm:text-xs ${
            isFocused
              ? "bg-slate-950/85 text-cyan-100"
              : "bg-slate-950/70 text-sky-50/90"
          }`}
        >
          {technology.label}
        </motion.span>
      </motion.button>
    </div>
  );
}

// The layover's words. Screen-space, because text this small has to stay
// pinned to the pixel grid to be readable — but with no panel behind it, so
// the corridor keeps flying underneath.
//
// Two blocks, and the corridor runs between them: the title overhead, and at
// the foot of the frame the line for whichever tool the flight is currently
// level with. Neither sits in the middle, because the middle is where the
// helix comes out of the distance.
function LayoverCaption({
  progress,
  isMobile,
}: {
  progress: MotionValue<number>;
  isMobile: boolean;
}) {
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
  const focused = TECHNOLOGY_FOCUS_STOPS[useFocusedIndex(progress)];

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ opacity }}
        className={`pointer-events-none absolute inset-x-0 z-6 text-center ${
          isMobile ? "top-[12%]" : "top-[14%]"
        }`}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.42em] text-emerald-200/70 sm:text-[10px]">
          Skills layover
        </p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-sky-50 sm:text-2xl">
          Tools I use to ship
        </h2>
      </motion.div>

      {/* The tool you are passing, named and accounted for. The line is the
         `usage` note from skillGroups.ts — where the tool was actually used,
         on a real project — so flying the helix reads as a tour rather than a
         list of logos. Keyed on the stop so one tool's line leaves as the
         next one arrives; `mode="wait"` keeps two sentences from ever being
         stacked on the same three lines of the frame. */}
      <motion.div
        aria-hidden="true"
        style={{ opacity }}
        className={`pointer-events-none absolute inset-x-0 z-6 flex justify-center px-6 ${
          isMobile ? "bottom-[14%]" : "bottom-[13%]"
        }`}
      >
        <AnimatePresence mode="wait">
          {focused ? (
            <motion.div
              key={focused.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: POWER2_OUT }}
              className="max-w-sm text-center sm:max-w-md"
            >
              <p className="text-[8px] font-semibold uppercase tracking-[0.38em] text-emerald-200/70 sm:text-[9px]">
                {focused.technology.group}
              </p>
              <h3 className="mt-1.5 text-base font-semibold tracking-tight text-sky-50 sm:text-xl">
                {focused.technology.label}
                <span className="ml-2 align-middle text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200/70 sm:text-xs">
                  {focused.technology.level}
                </span>
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed text-sky-100/70 sm:text-sm">
                {focused.technology.usage}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// Rendered *inside* the corridor's perspective group — see MultiverseFlight.
// Outside it, these would be flat pictures of a spiral; inside, they are the
// spiral.
export default function TechnologyLayover({
  compact,
  progress,
}: {
  compact: boolean;
  progress: MotionValue<number>;
}) {
  // One envelope over the whole helix, on top of each node's own fade.
  //
  // A node's approach is twelve tools long, which is what makes the chain
  // recede properly — but twelve tools either side of the first and last
  // stops reaches well outside the layover, and the corridor was growing a
  // scatter of icons across the Skills card's whole life and again as
  // Projects arrived. The nodes were correct; their span was not. This clips
  // the whole set to the leg it belongs to, so the tools exist between the
  // two cards and nowhere else.
  const envelope = useTransform(
    progress,
    [
      // Tight to the layover's own bounds, because the cards either side are
      // now clamped out of this stretch (getDepartWindow / getRevealWindow):
      // the Skills billboard has finished fading by LAYOVER_START, and the
      // Projects billboard does not begin until after LAYOVER_END. The helix
      // has the corridor to itself and does not need to hedge.
      TECHNOLOGY_LAYOVER_START - 0.012,
      TECHNOLOGY_LAYOVER_START + 0.004,
      TECHNOLOGY_LAYOVER_END + 0.002,
      TECHNOLOGY_LAYOVER_END + 0.009,
    ],
    [0, 1, 1, 0],
  );

  // Computed here as well as in the caption rather than threaded through a
  // context: it is one subtraction and a round, and both readers want the
  // same answer at the same moment.
  const focusedIndex = useFocusedIndex(progress);

  const travelTo = (stop: number) => {
    window.dispatchEvent(
      new CustomEvent("navigate-flight-progress", {
        detail: { progress: stop },
      }),
    );
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ transformStyle: "preserve-3d" }}
    >
      {TECHNOLOGY_FOCUS_STOPS.map((focus, index) => (
        <TechnologyNode
          key={focus.id}
          technology={focus.technology}
          index={index}
          stop={focus.progress}
          isFocused={index === focusedIndex}
          isMobile={compact}
          progress={progress}
          envelope={envelope}
          onSelect={() => travelTo(focus.progress)}
        />
      ))}
    </div>
  );
}

export { LayoverCaption };
