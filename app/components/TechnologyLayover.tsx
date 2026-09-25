"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  TECHNOLOGY_FOCUS_STOPS,
  TECHNOLOGY_LAYOVER_END,
  TECHNOLOGY_LAYOVER_START,
} from "../data/flightStops";
import { CSS_PERSPECTIVE_Z, cameraTravelFor } from "../lib/camera";
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

// How far around the helix each successive tool sits.
//
// The golden angle, and for the reason a sunflower uses it: it is the one
// spacing that never lets two nodes end up on the same bearing. 52° avoided
// the obvious spokes of 45° or 60°, but 360/52 is 6.92 — so node i and node
// i+7 sat 4° apart, and since a dozen nodes are lit at once, every pass had
// several tools stacked radially behind each other down the same line of
// sight. That is the pile of overlapping icons: not a layout accident, an
// arithmetic one. At 137.5° nothing comes within 20° of a repeat until i+13,
// which is outside the window that is ever lit together.
//
// Superseded: the helix is now meant to *read* as a spring — a coil the
// flight winds through — and golden-angle placement is the opposite of that:
// its whole virtue is looking scattered. 42° steps consecutive tools round
// the barrel in order, so the chain is visibly a coil. It does bring a tool
// back near its own bearing every ninth node (18° off), but nine tools is
// ~900px of depth, so the repeat is far smaller and further off — it reads
// as the next turn of the spring, not as a pile. Avoid exact divisors of
// 360 (40°, 45°): those do stack.
const DEGREES_PER_NODE = 42;

// The spring winds as you fly: the whole coil turns about the flight path by
// this much across the layover, so passing through it is a corkscrew rather
// than a straight run down a static tube. Tiles keep their own orientation
// (see TILE_SPIN_TURNS) — only their positions ride the twist.
const HELIX_TWIST_DEGREES = 720;

// Each tile spins in as it approaches, landing upright by the time it is
// close enough to read (FADE_IN_END) and staying that way while it is named.
const TILE_SPIN_TURNS = 1.5;

// Radius of the helix, in the corridor's own pixels.
//
// 300 was too tight, and not by taste: a billboard is roughly 760px wide in
// the same space, so a node at 300 rides *inside* the card's footprint and is
// simply occluded by it — the tools were there, behind the panel, which is
// indistinguishable from not being there. 440 clears the card, and still only
// reaches 733px from centre when it passes the camera at 1.67x, comfortably
// inside a 960px half-viewport.
const HELIX_RADIUS = { desktop: 440, mobile: 176 } as const;

// How near a node is allowed to come before it stops approaching.
//
// The cards stop at MAX_CARD_CAMERA_Z (440, i.e. 1.67x) because a billboard
// is centred and enormous and has to be kept off the projection plane. A
// node is neither: it is small, and it sits `HELIX_RADIUS` off the axis, so
// the same rule was doing something quite different to it — at 1.67x a node
// reaches 440 x 1.67 = 735px from centre, which on any desktop viewport is
// still *on screen*. It stopped growing, stopped moving outward, and sat
// there. That is the "stuck to the screen" in the corner of the frame.
//
// Let it come nearer and the perspective sweeps it out of frame on its own:
// at 0.72 of the projection distance a node is 3.57x, which throws the same
// 440px offset out to ~1571px — past the edge of a 1920px viewport, and past
// a phone's edge by a wider margin still. Nothing needs to animate outward;
// flying close to something off to one side is what makes it leave.
const NODE_MAX_CAMERA_Z = CSS_PERSPECTIVE_Z * 0.72;
const nodePassSpan = (isMobile: boolean) =>
  NODE_MAX_CAMERA_Z / cameraTravelFor(isMobile);

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
const NODE_GAP =
  (TECHNOLOGY_LAYOVER_END - TECHNOLOGY_LAYOVER_START) /
  Math.max(TECHNOLOGY_FOCUS_STOPS.length - 1, 1);

const FADE_IN_START = -12 * NODE_GAP;
const FADE_IN_MID = -7.5 * NODE_GAP;
const FADE_IN_END = -4 * NODE_GAP;

// The exit runs out to the depth where the node stops approaching, so the
// last of the fade happens while it is sweeping out of frame rather than
// after it has parked.
//
// These are a pair and have to stay ordered, which is the trap: the start is
// counted in NODE_GAPs and the end is capped by a *depth* ratio, and those
// two scale with different things. Tripling the camera travel shortened the
// depth cap to 0.0175 while 1.5 gaps stayed at 0.0183 — the window inverted,
// and framer-motion handed a decreasing input range simply does not fade the
// node out at all. Every tool stayed lit and piled up on screen. Deriving
// the start from the end keeps them ordered whatever either input does.
const fadeOutEnd = (isMobile: boolean) =>
  Math.min(2.6 * NODE_GAP, nodePassSpan(isMobile));
const fadeOutStart = (isMobile: boolean) =>
  Math.min(1.5 * NODE_GAP, fadeOutEnd(isMobile) * 0.55);

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

// The stretch of flight a single tool owns: half a gap either side of its own
// stop, which tiles the layover exactly, plus a fast crossfade at each edge.
//
// This is what "the tool you are level with" means, and it is a window rather
// than a number on purpose. The first version of the readout tracked the
// nearest tool in React state and swapped the words inside an AnimatePresence
// with `mode="wait"` — which is how it ended up naming Git while the camera
// was passing React: the state and the exit queue are two more clocks to keep
// in step with the flight, and a scroll that crosses a tool every few frames
// gets ahead of both. Nothing else in the corridor is allowed a second clock
// (see AGENTS.md); every visual here is a pure function of progress, and the
// words are now the same. The lit node and the named tool read this one
// window, so they cannot disagree.
const OWN_WINDOW = [-0.5, -0.42, 0.42, 0.5] as const;

function ownWindow(stop: number) {
  return OWN_WINDOW.map((multiple) => stop + multiple * NODE_GAP);
}

function TechnologyNode({
  technology,
  index,
  stop,
  isMobile,
  progress,
  envelope,
  onSelect,
}: {
  technology: Technology;
  index: number;
  stop: number;
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
    px(Math.min(baseZ, NODE_MAX_CAMERA_Z - value * cameraTravel)),
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
      stop + fadeOutStart(isMobile),
      stop + fadeOutEnd(isMobile),
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
      stop + fadeOutStart(isMobile),
      stop + fadeOutEnd(isMobile),
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
  // Lit while this tool is the one being named below. Same window as its own
  // readout, so the ring and the words are one statement.
  const focusGlow = useTransform(progress, ownWindow(stop), [0, 1, 1, 0]);

  const radius = isMobile ? HELIX_RADIUS.mobile : HELIX_RADIUS.desktop;
  // Position on the coil, turned by the twist for the current progress. A
  // pure function of progress like everything else here, so scrolling back
  // unwinds it exactly.
  const layoverSpan = TECHNOLOGY_LAYOVER_END - TECHNOLOGY_LAYOVER_START;
  const angleAt = (value: number) =>
    ((index * DEGREES_PER_NODE +
      ((value - TECHNOLOGY_LAYOVER_START) / layoverSpan) * HELIX_TWIST_DEGREES) *
      Math.PI) /
    180;
  const x = useTransform(progress, (value) => px(Math.cos(angleAt(value)) * radius));
  const y = useTransform(progress, (value) => px(Math.sin(angleAt(value)) * radius));
  // Spins in and settles upright before it is read; still after that.
  const tileSpin = useTransform(
    progress,
    [stop + FADE_IN_START, stop + FADE_IN_END],
    [-360 * TILE_SPIN_TURNS, 0],
  );

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
          x,
          y,
          transformStyle: "preserve-3d",
        }}
        className="relative flex flex-col items-center gap-2.5 outline-none"
      >
        {/* A round tile with thickness, not a picture of one — and it spins
           in (tileSpin) as the flight approaches it.
           The three faces sit at their own depths inside the node's own
           preserve-3d, so as the helix carries a tool around and past the
           camera the rim slides against the glyph and you see the side of
           the chip — the same trick the billboards use for their bezel. The
           back plate is what gives it a body to cast that edge from. */}
        <motion.span
          className="relative grid place-items-center"
          style={{ transformStyle: "preserve-3d", rotate: tileSpin }}
        >
          <span
            aria-hidden="true"
            className={`absolute rounded-full bg-slate-950 shadow-[0_26px_60px_rgba(2,8,23,0.72)] ${
              isMobile ? "-inset-[3px]" : "-inset-[5px]"
            }`}
            style={{ transform: `translateZ(${isMobile ? -6 : -11}px)` }}
          />
          <span
            className={`relative grid place-items-center rounded-full border border-white/15 bg-slate-950/70 shadow-[0_18px_44px_rgba(2,8,23,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:border-cyan-200/60 hover:shadow-[0_0_34px_rgba(34,211,238,0.4)] ${
              isMobile ? "h-14 w-14" : "h-24 w-24"
            }`}
          >
          <BrandIcon
            slug={technology.icon}
            className={isMobile ? "h-7 w-7" : "h-12 w-12"}
          />
          {/* The tool being named lights up, and that is all it does: no
             scale, no lift. A node's size in this corridor means its
             distance, and a tool that grew because it was current would be
             lying about where it is. Its own layer rather than a swapped
             className, so the ring rides the same motion value as everything
             else and never lags the camera. */}
          <motion.span
            aria-hidden="true"
            style={{ opacity: focusGlow }}
            className="pointer-events-none absolute inset-0 rounded-full border border-cyan-200/70 shadow-[0_0_38px_rgba(34,211,238,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]"
          />
          </span>
          {/* The rim, standing proud of the face. Transparent-centred, so it
             frames the glyph rather than tinting it. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              transform: `translateZ(${isMobile ? 4 : 7}px)`,
              boxShadow:
                "inset 0 2px 1px rgba(255,255,255,0.30), inset 2px 0 1px rgba(255,255,255,0.12), inset 0 -2px 1px rgba(2,8,23,0.60), inset -2px 0 1px rgba(2,8,23,0.40)",
            }}
          />
        </motion.span>
        <motion.span
          style={{ opacity: labelOpacity }}
          className="whitespace-nowrap rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-medium tracking-wide text-sky-50/90 sm:text-base"
        >
          {technology.label}
        </motion.span>
      </motion.button>
    </div>
  );
}

// One tool's line. Rises a little as it arrives, which is the only movement
// it makes — the corridor behind it is already moving.
function TechnologyReadout({
  technology,
  stop,
  progress,
}: {
  technology: Technology;
  stop: number;
  progress: MotionValue<number>;
}) {
  const focusWindow = ownWindow(stop);
  const opacity = useTransform(progress, focusWindow, [0, 1, 1, 0]);
  const y = useTransform(progress, focusWindow, [10, 0, 0, -8]);

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 bottom-0">
      <p className="text-xs font-semibold uppercase tracking-[0.38em] text-emerald-200/90 sm:text-sm">
        {technology.group}
      </p>
      <h3 className="mt-2.5 text-3xl font-semibold tracking-tight text-sky-50 sm:text-5xl">
        {technology.label}
        <span className="ml-3 align-middle text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/80 sm:text-base">
          {technology.level}
        </span>
      </h3>
      <p className="mt-3 text-base leading-relaxed text-sky-100/85 sm:text-xl">
        {technology.usage}
      </p>
    </motion.div>
  );
}

// A tool's history with Umar — the versions he came up through — for the
// tools that have one (`timeline` in skillGroups.ts). Lives on the same
// window as the tool's readout, so the history on screen is always the tool
// being named.
//
// Desktop: down the left edge, above the readout — the one margin the title
// (top right) and the readout (bottom left) leave free, and far enough out
// that the helix passes inside it. The rail draws in from the first entry to
// today as the flight arrives at the tool, a pure function of progress like
// the rest of this file. Phones have no margin to spare beside the helix, so
// it becomes a single strip of dates and versions under the title; the
// notes, which would not survive that width, are left to desktop.
// Height one milestone needs with its note (date, version, a two-line note
// and the gap). Below this per entry the notes are dropped and the list
// reads as dates and versions only — decided per tool, since a five-entry
// history keeps its notes on a screen where a six-entry one cannot.
const MILESTONE_WITH_NOTE_PX = 76;

function TechnologyTimeline({
  technology,
  stop,
  progress,
  isMobile,
  room,
}: {
  technology: Technology;
  stop: number;
  progress: MotionValue<number>;
  isMobile: boolean;
  /** Height the desktop list may use before it reaches the readout. */
  room: number;
}) {
  const focusWindow = ownWindow(stop);
  const opacity = useTransform(progress, focusWindow, [0, 1, 1, 0]);
  const rail = useTransform(
    progress,
    [focusWindow[0], focusWindow[1] + (focusWindow[2] - focusWindow[1]) * 0.4],
    [0, 1],
  );
  const milestones = technology.timeline ?? [];
  const last = milestones.length - 1;
  const showNotes = room >= milestones.length * MILESTONE_WITH_NOTE_PX;

  if (isMobile) {
    return (
      <motion.ol
        style={{ opacity }}
        className="absolute inset-x-0 top-0 flex items-start justify-center gap-3 px-4"
      >
        {milestones.map((m, i) => (
          <li key={m.date} className="flex min-w-0 flex-col items-center text-center">
            <span
              className={`mb-1.5 h-1.5 w-1.5 rounded-full ${
                i === 0 || i === last ? "bg-cyan-200 shadow-[0_0_8px_rgba(165,243,252,0.9)]" : "bg-sky-200/50"
              }`}
            />
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200/85">
              {m.date.replace(/^\w+ /, "")}
            </span>
            {/* Wraps rather than widening the row: five long labels
               ("Text-Based Editing") otherwise run the strip edge to edge. */}
            <span className="mt-0.5 max-w-[4.75rem] text-[10px] font-medium leading-tight text-sky-50/90">
              {m.version}
            </span>
          </li>
        ))}
      </motion.ol>
    );
  }

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
          {/* Dropped when the whole list would run into the readout below
             it (see MILESTONE_WITH_NOTE_PX); dates and versions still read. */}
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
// Two blocks, and the corridor runs between them: the title overhead and the
// line for whichever tool the flight is level with at the foot of the frame.
// On desktop they also pull to opposite sides — title top-right, readout
// bottom-left — because centred they shared the barrel with the helix, and
// text competing with icons coming out of the distance reads as neither. The
// diagonal leaves the middle to the tools and gives each block a margin wide
// enough to be set at a size you can actually read. Phones keep them stacked
// and centred: there is no width there to spend on a diagonal.
function LayoverCaption({
  progress,
  isMobile,
}: {
  progress: MotionValue<number>;
  isMobile: boolean;
}) {
  // The space between the title and the readout, measured rather than
  // assumed: it is what the tool histories have to fit into.
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
  }, []);

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

      {/* The tool you are passing, named and accounted for. The line is the
         `usage` note from skillGroups.ts — where the tool was actually used,
         on a real project — so flying the helix reads as a tour rather than a
         list of logos.
         All nineteen are mounted, each fading on its own stretch of flight.
         That is more DOM than picking one, and it is the version that cannot
         drift: there is no current tool held anywhere, only the one whose
         window the camera is inside.
         Anchored to the bottom of a fixed box so a two-line note and a
         three-line one share a baseline instead of shuffling the block. */}
      <motion.div
        aria-hidden="true"
        style={{ opacity }}
        className={`pointer-events-none absolute z-6 flex px-6 [text-shadow:0_2px_6px_rgba(2,8,23,0.95),0_0_28px_rgba(2,8,23,0.85)] ${
          isMobile
            ? "inset-x-0 bottom-[14%] justify-center"
            : "bottom-[11%] left-8 w-[min(44rem,50vw)] justify-start lg:left-14"
        }`}
      >
        <div
          className={`relative h-40 w-full max-w-sm sm:h-52 sm:max-w-none ${
            isMobile ? "text-center" : "text-left"
          }`}
        >
          {TECHNOLOGY_FOCUS_STOPS.map((focus) => (
            <TechnologyReadout
              key={focus.id}
              technology={focus.technology}
              stop={focus.progress}
              progress={progress}
            />
          ))}
        </div>
      </motion.div>

      {/* Tool histories, for the tools that have one. Same caption envelope
         and text shadow as the words above; see TechnologyTimeline. */}
      <motion.div
        ref={timelineBoxRef}
        aria-hidden="true"
        style={{ opacity }}
        // Desktop: from under the top margin down to 1.5rem above the
        // readout's box (bottom-[11%], h-52), so `room` is exactly the
        // space that is free.
        className={`pointer-events-none absolute z-6 [text-shadow:0_2px_6px_rgba(2,8,23,0.95),0_0_28px_rgba(2,8,23,0.85)] ${
          isMobile
            ? "inset-x-0 top-[calc(11%+5.25rem)] h-14"
            : "bottom-[calc(11%+14.5rem)] left-8 top-[12%] w-[min(20rem,26vw)] lg:left-14"
        }`}
      >
        {TECHNOLOGY_FOCUS_STOPS.filter((focus) => focus.technology.timeline?.length).map(
          (focus) => (
            <TechnologyTimeline
              key={focus.id}
              technology={focus.technology}
              stop={focus.progress}
              progress={progress}
              isMobile={isMobile}
              room={timelineRoom}
            />
          ),
        )}
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
