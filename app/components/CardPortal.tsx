"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  POWER1_IN,
  POWER2_IN,
  POWER2_OUT,
} from "../lib/easings";
import { ArrowUpRightIcon } from "./icons/arrow-up-right";
import type { AnimatedIconHandle } from "./icons/card-icon";
import Space from "./Space";
import SignatureName from "./SignatureName";
// A scene's travel is timed against its card's own stop, so it has to be the
// *same* stop the flight uses. This was a literal copy stuck at the old
// layout, and one entry too long: it still carried the deleted `resume`
// card's 0.81, which shifted every index past Projects and left Contact
// timing its scene against 0.81 instead of 0.92. Exactly the failure the
// `atmospheres` array is warned about for in AGENTS.md, in a second array.
import {
  getCardLifeWindow,
  getDepartWindow,
  sectionProgressStops,
} from "../data/flightStops";

// Pure GSAP-style Quart-out curve (gsap.parseEase("power3.out")) used to
// shape the reveal progress itself — not an animation, just math applied to
// the 0-1 scroll fraction before it's handed to the motion-value tweens.
const power3Out = (t: number) => 1 - Math.pow(1 - t, 4);

interface CardPortalProps {
  isMobile?: boolean;
  index: number;
  scrollYProgress: MotionValue<number>;
  align?: "left" | "right";
  targetId: string;
  actionLabel: string;
  ariaLabel: string;
  // Entry-card only: the home bio is reading its full, expanded text — swap
  // the portal's particle-logo mark for the astronaut illustration so the
  // visual matches the more contemplative, unhurried moment.
  isExpanded?: boolean;
  // Portrait phones stack the billboard, which turns the portal from a tall
  // window beside the copy into a wide letterbox above it. Nothing inside is
  // laid out in percentages of that box — the entry mark is a fixed-ratio
  // image — so the pieces that would overflow a short box are told to fit.
  letterbox?: boolean;
}

// Home / Identity Space keeps its original overlay; every other section gets
// its own atmosphere — a color grade plus an abstract motif standing in for
// a distinct "universe" (no per-section imagery exists, so these are drawn).
type MotifType = "earth" | "orb" | "nodes" | "worlds" | "timeline" | "network" | "calm";

// The flight's colour journey, one entry per card, indexed by card index.
//
// Cold the whole way, because the sky it travels through is: body is
// `linear-gradient(180deg, #002d54, #00101f)` and the brand accent is sky-300.
// The old run put an amber card (#fbbf24) and a near-neutral slate one
// (#94a3b8) in the middle of that, which read as a highway sign and a dead
// patch rather than as two more universes.
//
// The hues now sweep outward and come home: sky 199° -> teal 172° -> blue
// 217° -> steel 205° -> sky 199°. Experience's steel blue is the exact colour
// of the `steel` space region that follows it, so the card bleeds into
// the stretch of sky after it instead of ending at its own edge. Contact
// returns to the departure accent, which is also where the flight's loop
// sends you.
//
// One entry per card, and no more: this array used to carry six, with a
// `resume` entry at index 4 for a card that no longer exists in `cards`.
// Since the lookup is `atmospheres[index]`, that handed Contact the slate
// "branching network" grade and left the sky "calm arrival" one at index 5
// permanently unreachable. Adding a card means adding an entry here, in the
// same order as `cards`.
const atmospheres: { overlay: string; motif: MotifType; accent: string }[] = [
  {
    // 0 home — identity, departure. The overlay was a dark red
    // (rgba(87,22,35)) left over from an earlier palette; it is the sky the
    // flight actually launches from now.
    overlay:
      "linear-gradient(180deg, rgba(7, 89, 133, 0.42) 0%, rgba(6, 20, 81, 0.15) 45%, rgba(0, 15, 49, 0.35) 100%)",
    motif: "earth",
    accent: "#7dd3fc",
  },
  {
    // 1 skills — technology constellation. Teal rather than emerald: the same
    // idea a step colder, so it belongs to the blue family the rest of the
    // journey lives in.
    overlay:
      "linear-gradient(180deg, rgba(13, 148, 136, 0.3) 0%, rgba(17, 94, 89, 0.15) 45%, rgba(2, 20, 25, 0.4) 100%)",
    motif: "nodes",
    accent: "#2dd4bf",
  },
  {
    // 2 projects — floating worlds. Already on-theme; unchanged.
    overlay:
      "linear-gradient(180deg, rgba(3, 105, 161, 0.3) 0%, rgba(12, 74, 110, 0.15) 45%, rgba(2, 15, 35, 0.4) 100%)",
    motif: "worlds",
    accent: "#60a5fa",
  },
  {
    // 3 experience — timeline through the journey. The deepest point of the
    // trip, and the handover into the steel region. Umar's palette:
    // #5b8db1 light over #153055, settling into a deep #0b1a2b.
    overlay:
      "linear-gradient(180deg, rgba(91, 141, 177, 0.26) 0%, rgba(21, 48, 85, 0.2) 45%, rgba(11, 26, 43, 0.45) 100%)",
    motif: "timeline",
    accent: "#5b8db1",
  },
  {
    // 4 contact — calm arrival. Back on the departure accent: the flight ends
    // on the colour it began with, which is also what its loop returns to.
    overlay:
      "linear-gradient(180deg, rgba(3, 105, 161, 0.2) 0%, rgba(8, 47, 73, 0.12) 45%, rgba(2, 10, 25, 0.35) 100%)",
    motif: "calm",
    accent: "#7dd3fc",
  },
];

type Scene = {
  src: string;
  
  position: string;

  inset: string;

  float: string;

  tint: number;
  
  travel: { from: [number, number]; to: [number, number]; lean: number };
  /**
   * "cover" crops the art to fill its box instead of fitting inside it —
   * for art that is texture edge to edge (the binary rain) rather than a
   * figure with a transparent ground. Defaults to "contain".
   */
  fit?: "contain" | "cover";
  /**
   * Fades the box's lower edge out, so art cropped at the box's bottom
   * dissolves into the window instead of stopping on a hard line.
   */
  fadeBottom?: boolean;
  /**
   * A full-window image the figure crosses in front of — the place, where
   * `src` is the traveller. Covers the window, so it stands in for the drawn
   * motif (which would only be painted underneath it), and gets the
   * section's overlay laid back over it so it still takes the panel's light.
   */
  backdrop?: string;
  /** Shooting stars crossing the window as the flight passes. */
  streaks?: Streak[];
};

// A shooting star, crossing the window top-left to bottom-right. Driven by
// scroll like the scene itself: it streaks across while you are moving and
// hangs mid-flight when you stop.
type Streak = {
  src: string;
  /** Width of the streak, as a share of the window's width. */
  width: string;
  /**
   * When it crosses, in the card's own life: 0 is the panel lighting, 1 the
   * reading slot, 2 the panel flown past — the same three stops the scene's
   * crossing is pinned to (see sceneWindow).
   */
  at: [number, number];
  /**
   * Vertical start and end, as a share of the window's height. The
   * horizontal run is always off the left edge to off the right; these are
   * picked so the path's slope matches the streak's drawn ~27° angle, or it
   * reads as sliding sideways rather than falling along its own tail.
   */
  y: [number, number];
  /** Behind the scene's figure instead of in front of it. */
  behind?: boolean;
};

// Keyed by card index, 1-based after the entry card at index 0. An index
// without a scene falls back to the drawn PortalMotif — which is also what
// sits *behind* every scene, so a panel never loses its own signature.
// The entry card has no scene; its hooks still have to run, and they need a
// path to read.
const IDLE_TRAVEL = { from: [0, 0], to: [0, 0], lean: 0 } as const;

const scenes: Record<number, Scene> = {
  1: {
    src: "/space/rocket.svg",
    // A little left of centre: a narrow window only fits ~64% of the art's
    // width. Centred, the fins were cut; at 20% the nose was. 35% keeps the
    // nose clear with the moon's edge behind it and the flames trailing off
    // the left edge, where they run in the art anyway.
    position: "35% center",
    // The art is a whole scene — an arched window with the rocket, the moon
    // and its own night sky — so it *is* the window: it covers it, with a 6%
    // overhang so the drift and the ±4° roll never show an edge.
    inset: "-inset-[6%]",
    fit: "cover",
    float: "motif-float-slow",
    // Held low: the art has its own colours (orange flames, a red moon) and
    // a full-strength teal wash turned them muddy. Enough to sit it in the
    // section's light, not enough to recolour it.
    tint: 0.14,
    // A drift, not a crossing: it fills the frame, so it can only move as
    // far as its overhang allows.
    travel: { from: [0, 2], to: [0, -2], lean: 0 },
  },
  2: {
    // Another crew passes: a ship crossing in front of the Earth. The planet
    // is the window itself; the ship comes in from the left, is centred at
    // the reading slot, and carries on out to the right as the panel is
    // flown past. Nose-first — the artwork's thrusters are on its left.
    src: "/space/ship.png",
    backdrop: "/space/earth.jpg",
    position: "center",
    inset: "inset-x-[10%] top-[34%] bottom-[34%]",
    float: "motif-float-med",
    tint: 0.2,
    travel: { from: [-120, 4], to: [120, -4], lean: 0 },
  },
  3: {
    src: "/space/crew.svg",
    position: "center",
    // Covers the whole window. The 4% overhang on every side is what the
    // ±4° roll and the drift below need to never show an edge.
    inset: "-inset-[4%]",
    fit: "cover",
    float: "motif-float-slow",
    tint: 0.32,
    // Standing still, being passed: a drift, not a crossing — and a small
    // one, since the art is edge to edge.
    travel: { from: [-2, 1], to: [2, -1], lean: 0 },
    // Some in front of the art, some behind it. The art is a ringed planet
    // on a transparent ground, so a star behind it only *reads* as behind if
    // its path actually crosses the planet: the two `behind` paths are aimed
    // so each head vanishes into the planet or ring mid-crossing and comes
    // out the other side. Aimed anywhere else they pass above or below it
    // and look like any other star. Re-aim them if the art changes.
    //
    // Speed is how much of the card's life a crossing is spread over — the
    // wider `at`, the slower it falls for the same scroll. Each takes well
    // over half the panel's life, and they overlap so there is always one in
    // the sky. The same file can appear more than once: vary its size, path
    // and timing and it reads as another star.
    streaks: [
      { src: "/space/star3.svg", width: "70%", at: [0, 1.3], y: [-0.46, 0.29], behind: true },
      { src: "/space/star3.svg", width: "50%", at: [0.9, 2], y: [-0.17, 0.58], behind: true },
      { src: "/space/star1.svg", width: "55%", at: [0.2, 1.5], y: [-0.15, 0.6] },
      { src: "/space/star2.svg", width: "30%", at: [0.5, 1.8], y: [0.05, 0.8] },
      { src: "/space/star1.svg", width: "38%", at: [0.8, 2], y: [0.3, 1.05] },
      { src: "/space/star2.svg", width: "22%", at: [1.1, 2], y: [-0.1, 0.65] },
    ],
  },
  4: {
    src: "/space/landing.svg",
    // The moon is the bottom two-thirds of this artwork. Anchored to the
    // window's floor it reads as ground the flight has landed on; centred it
    // reads as a ball floating in the middle of the frame.
    position: "center bottom",
    inset: "inset-x-[12%] bottom-0 top-[10%]",
    float: "motif-float-med",
    tint: 0.26,
    // The moon is ground. Ground does not fly across the window — it only
    // slides a little as you pass over it.
    travel: { from: [-7, 3], to: [7, -1], lean: 0 },
  },
};

// The accent light, painted through the figure's own alpha. mask-image with
// the same file means the tint stops exactly at the silhouette — no
// rectangle, no halo bleeding past the art — and mask-size/position have to
// mirror the <Image>'s object-contain/object-position or the light slides off
// the body it is supposed to be falling on.
function sceneTintStyle(scene: Scene, accent: string) {
  return {
    background: `linear-gradient(200deg, ${accent} 0%, ${accent}00 78%)`,
    maskImage: `url("${scene.src}")`,
    WebkitMaskImage: `url("${scene.src}")`,
    maskSize: scene.fit ?? "contain",
    WebkitMaskSize: scene.fit ?? "contain",
    maskPosition: scene.position,
    WebkitMaskPosition: scene.position,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    opacity: scene.tint,
  };
}

// Life units (0 lit, 1 reading slot, 2 flown past) to flight progress.
function lifeToProgress(
  life: { start: number; slot: number; end: number },
  t: number,
) {
  return t <= 1
    ? life.start + (life.slot - life.start) * t
    : life.slot + (life.end - life.slot) * (t - 1);
}

function ShootingStar({
  streak,
  life,
  progress,
}: {
  streak: Streak;
  life: { start: number; slot: number; end: number };
  progress: MotionValue<number>;
}) {
  const span = [
    lifeToProgress(life, streak.at[0]),
    lifeToProgress(life, streak.at[1]),
  ];
  // The wrapper is window-sized, so translate percentages are percentages of
  // the window. From just off the left edge (its own width back) to past
  // the right one.
  const x = useTransform(progress, span, ["-100%", "110%"]);
  const y = useTransform(progress, span, [
    `${streak.y[0] * 100}%`,
    `${streak.y[1] * 100}%`,
  ]);
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ x, y, willChange: "transform" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a few hundred
         bytes of SVG; next/image would only add a wrapper and a 400 without
         `unoptimized`. */}
      <img
        src={streak.src}
        alt=""
        className="absolute left-0 top-0 h-auto"
        style={{ width: streak.width }}
      />
    </motion.div>
  );
}

function PortalMotif({ motif, accent }: { motif: MotifType; accent: string }) {
  switch (motif) {
    case "orb":
      return (
        <div
          className="motif-breathe absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full "
          style={{
            background: `radial-gradient(circle, ${accent}66 0%, ${accent}22 45%, transparent 75%)`,
          }}
        />
      );
    case "nodes":
      return (
        <svg
          viewBox="0 0 100 100"
          className="motif-drift absolute inset-0 h-full w-full"
          fill="none"
        >
          <g stroke={accent} strokeOpacity="0.35" strokeWidth="0.6">
            <line x1="20" y1="30" x2="45" y2="20" />
            <line x1="45" y1="20" x2="70" y2="35" />
            <line x1="45" y1="20" x2="40" y2="55" />
            <line x1="40" y1="55" x2="65" y2="65" />
            <line x1="70" y1="35" x2="65" y2="65" />
          </g>
          <g fill={accent}>
            <circle cx="20" cy="30" r="2.2" opacity="0.9" />
            <circle cx="45" cy="20" r="2.8" opacity="0.95" />
            <circle cx="70" cy="35" r="2.2" opacity="0.85" />
            <circle cx="40" cy="55" r="2.5" opacity="0.9" />
            <circle cx="65" cy="65" r="2.2" opacity="0.8" />
          </g>
        </svg>
      );
    case "worlds":
      return (
        <div className="absolute inset-0">
          <span
            className="motif-float-slow absolute left-[18%] top-[28%] h-[22%] w-[22%] rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${accent}aa, ${accent}33 60%, transparent 75%)`,
            }}
          />
          <span
            className="motif-float-med absolute left-[55%] top-[50%] h-[14%] w-[14%] rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${accent}99, ${accent}22 60%, transparent 75%)`,
            }}
          />
          <span
            className="motif-float-fast absolute left-[68%] top-[20%] h-[9%] w-[9%] rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${accent}88, ${accent}22 60%, transparent 75%)`,
            }}
          />
        </div>
      );
    case "timeline":
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none">
          <line
            x1="15"
            y1="55"
            x2="85"
            y2="55"
            stroke={accent}
            strokeOpacity="0.4"
            strokeWidth="0.6"
          />
          {[20, 38, 56].map((x) => (
            <circle key={x} cx={x} cy="55" r="2" fill={accent} opacity="0.6" />
          ))}
          <circle cx="74" cy="55" r="3" fill={accent} opacity="0.95" className="motif-breathe" />
        </svg>
      );
    case "network":
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none">
          <g stroke={accent} strokeOpacity="0.4" strokeWidth="0.6">
            <line x1="30" y1="75" x2="30" y2="45" />
            <line x1="30" y1="45" x2="50" y2="25" />
            <line x1="30" y1="45" x2="30" y2="20" />
            <line x1="30" y1="45" x2="15" y2="25" />
          </g>
          <g fill={accent}>
            <circle cx="30" cy="75" r="2.4" opacity="0.9" />
            <circle cx="30" cy="45" r="2.4" opacity="0.9" />
            <circle cx="50" cy="25" r="2" opacity="0.75" />
            <circle cx="30" cy="20" r="2" opacity="0.75" />
            <circle cx="15" cy="25" r="2" opacity="0.75" />
          </g>
        </svg>
      );
    case "calm":
    default:
      return (
        <div
          className="motif-breathe absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full "
          style={{
            background: `radial-gradient(circle, ${accent}44 0%, ${accent}15 50%, transparent 75%)`,
          }}
        />
      );
  }
}

export function CardPortal({
  index,
  scrollYProgress,
  align = "left",
  targetId,
  actionLabel,
  ariaLabel,
  isExpanded = false,
  letterbox = false,
  isMobile = false
}: CardPortalProps) {
  const arrowRef = useRef<AnimatedIconHandle>(null);
  const hasEnteredRef = useRef(false);
  // Replaces the gsap.timeline() ref: cancels any pending activation steps
  // (the setTimeout-scheduled ones below) and stops in-flight tweens.
  const activationRef = useRef<{ cancelled: boolean; timeouts: number[] }>({
    cancelled: true,
    timeouts: [],
  });
  const [isActivating, setIsActivating] = useState(false);
  const isEntry = index === 0;
  // Mirrors `isNear` for the scroll handlers, which run on every frame of a
  // scroll and must read the current value without re-subscribing each time
  // it flips (the same reason the reveal effect compares against locals
  // rather than state).
  const isNearRef = useRef(isEntry);
  const atmosphere = atmospheres[index % atmospheres.length];
  // The beat of the story this panel looks out at, if it has one (see
  // `scenes` above). Home does not: its window is the traveller himself.
  const scene = scenes[index];
  // Space (this card's starfield backdrop) mounts once per card — six of
  // them exist at once — and only stops drawing on its own when it's
  // geometrically outside the viewport. A card that's just faded to
  // opacity 0 without actually moving (the common case: most cards sit
  // faded out at the same screen position for most of the scroll) doesn't
  // trip that check, so five starfields were drawing every frame for
  // nothing most of the time. This tracks the same reveal/fade this effect
  // already computes and passes it down so Space can skip drawing whenever
  // there's nothing visible to draw.
  const [isNear, setIsNear] = useState(isEntry);

  // Entry card: earth rises from a bottom corner as percentages of its own
  // size (translate(x%, y%) reproduces gsap's xPercent/yPercent exactly).
  const earthXPercent = useMotionValue((align === "left" ? 1 : -1) * 30);
  const earthYPercent = useMotionValue(105);
  const earthTransform = useMotionTemplate`translate(${earthXPercent}%, ${earthYPercent}%)`;

  // Other cards: their motif fades and settles in instead of rising.
  const motifOpacity = useMotionValue(0);
  const motifScale = useMotionValue(0.85);
  // The scene crosses the window as the flight approaches and leaves the
  // card, along the path that scene declares. Derived straight from scroll —
  // no timer, no tween — so it freezes the moment scrolling does and reverses
  // when the visitor does: the rocket is flying because *you* are moving, and
  // it stops when you stop, which a looping animation could never do.
  //
  // The window is the card's own visible life, not an arbitrary span around
  // its stop — the same reveal start and depart end the fade effect below
  // uses. Mapped onto anything wider, the figure spends the card's whole
  // appearance crossing the middle third of its path and never reaches either
  // corner; mapped onto this, it enters as the card fades up and exits as the
  // card fades out.
  const scenePath = scenes[index]?.travel ?? IDLE_TRAVEL;
  // The crossing is timed against the card's whole visible life, which is
  // the only window that matches what the viewer sees: the figure is in its
  // starting corner as the panel lights, mid-crossing at the reading slot,
  // and leaving the far corner as the panel is flown past.
  //
  // It used to be `[stop - span * 0.3, stop + 0.11]`, built out of the card's
  // raw progress *stop*. A stop is not where its card is read — the slot is,
  // and the slot leads the stop by up to CARD_SLOT_LEAD. For Skills that put
  // the window at 0.098..0.25 against a card read at 0.122 and gone by 0.28:
  // the rocket sat clamped in its bottom-left corner, mostly outside
  // `inset-[12%]`, for the entire time the panel was legible, and then did
  // its whole climb while the card was fading out. The window looked empty
  // because the scene was parked off the edge of it.
  // Three stops, not two, and the middle one is the reading slot. A card's
  // life is not symmetric about the slot — the approach is long and the
  // departure is now a short depth event — so mapping the path linearly
  // across [start, end] put the figure 79% of the way across by the time the
  // panel was readable. Pinning the slot to the midpoint of the path keeps
  // the promise the travel values are written to: starting corner as the
  // panel lights, mid-crossing while you read it, far corner as it passes.
  const sceneLife = getCardLifeWindow(index);
  const sceneWindow = [sceneLife.start, sceneLife.slot, sceneLife.end];
  const mid = (a: number, b: number) => (a + b) / 2;
  const sceneX = useTransform(scrollYProgress, sceneWindow, [
    `${scenePath.from[0]}%`,
    `${mid(scenePath.from[0], scenePath.to[0])}%`,
    `${scenePath.to[0]}%`,
  ]);
  const sceneY = useTransform(scrollYProgress, sceneWindow, [
    `${scenePath.from[1]}%`,
    `${mid(scenePath.from[1], scenePath.to[1])}%`,
    `${scenePath.to[1]}%`,
  ]);
  // A few degrees of roll either side of the held lean, so the crossing has
  // some life in it rather than being a rigid slide.
  const sceneTilt = useTransform(scrollYProgress, sceneWindow, [
    scenePath.lean - 4,
    scenePath.lean,
    scenePath.lean + 4,
  ]);
  // Traces the card's rounded-corner ring in/out as it comes into and
  // leaves focus.
  const progressDashOffset = useMotionValue(100);

  // Click-to-activate "warp" flourish (visualRef's zoom, entry's flash).
  const visualScale = useMotionValue(1);
  const flashOpacity = useMotionValue(0);
  // The astronaut has a deliberate, directional dolly motion while the Home
  // card is expanded: forward progress moves it away; reversing toward Home
  // brings it back in. It is derived directly from scroll, so it never loops
  // or changes direction on its own.
  const astronautDollyScale = useTransform(
    scrollYProgress,
    [0, 0.09, 0.2],
    [1, 0.86, 0.66],
  );
  const astronautDollyY = useTransform(scrollYProgress, [0, 0.2], ["0%", "-7%"]);

  useEffect(() => {
    const currentStop = sectionProgressStops[index] ?? 0;
    const previousStop = index > 0 ? sectionProgressStops[index - 1] : 0;
    const approachSpan = Math.max(currentStop - previousStop, 0.08);

    // The window's art is there from the moment the card is. It used to
    // reveal over [stop - 30% of the approach, stop], but a card is read at
    // its slot, which leads the stop — so at reading distance the motif and
    // scene were still mostly transparent and the window looked empty until
    // the card was nearly flown through. The card's own opacity already
    // handles the approach; the art only needs a short settle at the start
    // of the card's life so it does not pop. The entry card keeps its own
    // rising-earth reveal below.
    const life = getCardLifeWindow(index);
    const revealStart = isEntry
      ? Math.max(currentStop - approachSpan * 0.3, 0)
      : life.start;
    const revealPeak = isEntry
      ? currentStop
      : life.start + (life.slot - life.start) * 0.2;
    // Past its own stop the camera is pushing through the card, and because
    // every card's z is set so it sits at the camera plane exactly at its own
    // stop, the card balloons toward CSS perspective's singularity at roughly
    // stop + 0.107 (1100px perspective / 10267px camera travel; mobile's
    // shorter 9533px travel puts it a touch later, ~0.115, so 0.107 is the
    // earlier, safer bound to fade against on both). That's much sooner than
    // the old +0.1..+0.29 window — the fade had barely started by the time
    // the globe was blowing up to fill the frame, reading as a huge image
    // stuck at full opacity rather than dissolving as it passed. Finishing
    // the fade well before the singularity means the globe is gone before it
    // would otherwise explode in size.
    // Fade out with the card's own departure rather than a fixed offset
    // from its stop, so the art leaves when the card does — not before.
    const depart = getDepartWindow(index);
    const departFadeStart = isEntry ? currentStop + 0.03 : depart.start;
    const departFadeEnd = isEntry
      ? currentStop + 0.11
      : Math.max(depart.end, depart.start + 0.001);
    let lastReveal = -1;
    let lastFade = -1;

    let applyReveal: (eased: number, fade: number) => void;
    if (isEntry) {
      // Earth rises from the bottom corner, staying clipped inside the window
      const cornerDirection = align === "left" ? 1 : -1;
      applyReveal = (eased) => {
        earthXPercent.set(cornerDirection * 30 * (1 - eased));
        earthYPercent.set(105 * (1 - eased));
      };
      // Entry card rises rather than fading — no depart dim to apply.
    } else {
      // Other universes' motifs fade and settle into view instead of fading
      applyReveal = (eased, fade) => {
        motifOpacity.set(eased * fade);
        motifScale.set(0.85 + eased * 0.15);
      };
    }

    // Traces the rounded border in as the card comes into focus, then
    // traces back out as it departs — the ring reads as this card's own
    // zoom-in/zoom-out progress through the flight. Skipped on the entry
    // card: its ring <rect> isn't rendered (see JSX below).
    const applyProgressDash = isEntry
      ? null
      : (value: number) =>
        progressDashOffset.set(value);

    const update = (progress: number) => {
      let reveal = 0;
      if (progress >= revealStart && progress < revealPeak) {
        reveal =
          (progress - revealStart) / Math.max(revealPeak - revealStart, 0.001);
      } else if (progress >= revealPeak) {
        reveal = 1;
      }
      // First card: earth visible from the start
      if (isEntry) reveal = Math.max(reveal, 1 - progress / 0.06);
      reveal = Math.min(Math.max(reveal, 0), 1);

      let fade = 1;
      if (!isEntry && progress > departFadeStart) {
        fade =
          1 -
          Math.min(
            (progress - departFadeStart) / (departFadeEnd - departFadeStart),
            1,
          );
      }

      // Skip redundant work while the card is far away (or fully revealed)
      if (reveal === lastReveal && fade === lastFade) return;
      lastReveal = reveal;
      lastFade = fade;

      const nextIsNear = reveal * fade > 0.02;
      isNearRef.current = nextIsNear;
      setIsNear((prev) => (prev === nextIsNear ? prev : nextIsNear));

      applyReveal(power3Out(reveal), fade);
      // Draws in while approaching, then un-draws again on the way out —
      // mirrors the motif's own fade window so the ring tracks the same
      // zoom-in/zoom-out lifecycle instead of staying drawn forever.
      applyProgressDash?.(100 * (1 - reveal * fade));
    };

    update(scrollYProgress.get());
    const unsubscribe = scrollYProgress.on("change", update);
    return () => unsubscribe();
  }, [
    index,
    align,
    scrollYProgress,
    isEntry,
    earthXPercent,
    earthYPercent,
    motifOpacity,
    motifScale,
    progressDashOffset,
  ]);

  const cancelActivation = () => {
    const token = activationRef.current;
    token.cancelled = true;
    token.timeouts.forEach((id) => window.clearTimeout(id));
    token.timeouts = [];
  };

  // Snap the entry portal back to rest if the user manually scrolls back near the top
  useEffect(() => {
    if (!isEntry) return;
    const unsubscribe = scrollYProgress.on("change", (value) => {
      if (value <= 0.02 && !hasEnteredRef.current) {
        cancelActivation();
        visualScale.set(1);
        flashOpacity.set(0);
      }
    });
    return () => unsubscribe();
  }, [isEntry, scrollYProgress, visualScale, flashOpacity]);

  useEffect(() => cancelActivation, []);

  const navigateToTarget = () => {
    window.dispatchEvent(
      new CustomEvent("navigate-flight-section", {
        detail: { id: targetId },
      }),
    );
  };

  const handleActivate = () => {
    if (hasEnteredRef.current) return;
    hasEnteredRef.current = true;
    setIsActivating(true);

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduce) {
      navigateToTarget();
      hasEnteredRef.current = false;
      setIsActivating(false);
      return;
    }

    cancelActivation();
    const token = { cancelled: false, timeouts: [] as number[] };
    activationRef.current = token;

    const finish = () => {
      if (token.cancelled) return;
      hasEnteredRef.current = false;
      setIsActivating(false);
    };

    animate(visualScale, isEntry ? 1.18 : 1.06, {
      duration: isEntry ? 0.45 : 0.22,
      ease: POWER2_IN,
    });

    if (isEntry) {
      token.timeouts.push(
        window.setTimeout(() => {
          if (token.cancelled) return;
          animate(flashOpacity, 1, { duration: 0.3, ease: POWER1_IN });
        }, 200),
      );
      token.timeouts.push(
        window.setTimeout(() => {
          if (!token.cancelled) navigateToTarget();
        }, 450),
      );
      token.timeouts.push(
        window.setTimeout(() => {
          if (token.cancelled) return;
          animate(flashOpacity, 0, { duration: 0.4, ease: POWER2_OUT });
          animate(visualScale, 1, { duration: 0.4, ease: POWER2_OUT }).then(finish);
        }, 500),
      );
      return;
    }

    token.timeouts.push(
      window.setTimeout(() => {
        if (token.cancelled) return;
        navigateToTarget();
        animate(visualScale, 1, { duration: 0.28, ease: POWER2_OUT }).then(finish);
      }, 140),
    );
  };

  return (
    <div
      className="group absolute inset-0 cursor-pointer rounded-2xl outline-none lg:rounded-3xl focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-disabled={isActivating}
      onClick={handleActivate}
      onMouseEnter={() => arrowRef.current?.startAnimation()}
      onMouseLeave={() => arrowRef.current?.stopAnimation()}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
    >
      {/* 1. Static Mask Wrapper - enforces perfect clipping boundaries that never scale */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl [clip-path:inset(0_round_1rem)] lg:rounded-3xl lg:[clip-path:inset(0_round_1.5rem)]">

        {/* 2. Scaling container */}
        <motion.div
          style={{ scale: visualScale }}
          className="relative h-full w-full transform-flat"
        >
          <div className="absolute inset-0">
            {/* Space backdrop filling the window, carrying this section's portal color */}
            <Space tint={atmosphere.accent} active={isNear} />

            {isEntry && !isMobile && (
              // Whole group lifted 14px: the mark reads better sitting slightly
              // above the portal's optical centre. Expanded, it climbs a good
              // deal further — the astronaut flies in from the bottom of this
              // same window and was landing across the mark, and the signature
              // swaps to the mark's top edge at the same moment, so the pair
              // needs the headroom. The letterbox portal is a third the height,
              // so it gets a proportionally smaller lift rather than the same
              // pixels, which would walk the mark straight out of frame.
              <div
                className={`absolute inset-0 transition-transform duration-700 ease-out ${isExpanded
                    ? letterbox
                      ? "-translate-y-6"
                      : "-translate-y-12 sm:-translate-y-16"
                    : "-translate-y-3.5"
                  }`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* This wrapper is sized by the mark itself and is the
                   signature's positioning context. The card is what stretches
                   — the home portal grows tall when the bio expands — so
                   anchoring the name to card percentages walked it up to the
                   card's top edge, nowhere near the logo. Against the mark's
                   own box it stays pinned to the logo at any card height or
                   width (the image is capped by the portal's width on
                   narrow screens, so its box is not a fixed 300px either). */}
                  <div className="relative">
                    <Image
                      src="/images/us.png"
                      alt=""
                      // The file is 1659x1408 — a 1.178:1 mark, not a square.
                      // Declaring it 300x300 gave the layout box a 1:1 aspect
                      // that the artwork does not have, and `object-cover` then
                      // resolved that mismatch by cropping. Whenever the box
                      // ends up wider than 1.178:1 — which is every stacked /
                      // letterbox portal, i.e. every phone — cover scales the
                      // image to fill the width and the overflow comes off the
                      // top and bottom, taking the glyph's head and feet with
                      // it. 300x255 is the file's own ratio, so the box is now
                      // the shape of the art it holds.
                      width={300}
                      height={255}
                      // This is the LCP element — the mark is the largest
                      // thing painted on the landing view — and without
                      // `priority` next/image marks it `loading="lazy"`, so
                      // the browser does not begin fetching it until after
                      // layout, and never preloads it. It is also sitting
                      // behind the loader while that is up, which pushes it
                      // further down the queue. Priority puts a preload in
                      // the head and fetches it at high priority alongside
                      // the loader's own background.
                      priority
                      // The element is never wider than its 300px box, but
                      // this said 30vw — 576px on a 1920 viewport — so Next
                      // was asked for a variant with about four times the
                      // pixels the mark ever shows. The phone case is the
                      // letterbox portal, capped by max-h, which is smaller
                      // still.
                      sizes="(min-width: 1024px) 300px, 40vw"
                      // Answers a hover anywhere on the billboard (the card
                      // owns `group/card`): the mark comes up out of the
                      // starfield and leans a little closer. Opacity and
                      // transform only — no filter — so the hover is pure
                      // compositing and never re-rasterizes the card layer the
                      // flight works so hard to keep cached.
                      // `object-contain`, never `cover`: this is a brand mark,
                      // so the failure mode when the box and the art disagree
                      // has to be empty space, not a cropped logo. The portal's
                      // box is driven by the card's own layout and the
                      // max-height below, so it cannot be guaranteed to match
                      // the art's ratio at every size — contain makes that
                      // harmless.
                      className={`h-auto w-auto object-contain mix-blend-screen transition-[opacity,transform] duration-500 ease-out group-hover/card:opacity-80 motion-safe:group-hover/card:scale-[1.06] ${
                        // Dimmer once the bio is open: the astronaut becomes the
                        // subject of the window at that point and the mark is
                        // what it is flying in front of. Hover still lifts both
                        // back to the same 80%.
                        isExpanded ? "opacity-40" : "opacity-55"
                        } ${letterbox ? "max-h-[min(8rem,13vh)] px-4 py-1" : "px-8 py-2"}`}
                      aria-hidden="true"
                    />

                    {/* Same cycling signature the closing beat ends on, so the
                     flight opens and closes on the same gesture.

                     It swaps sides of the mark on expand: the astronaut flies
                     in from below when the bio opens (see the AnimatePresence
                     block further down) and was landing straight on top of the
                     name. Rather than reordering a flex column — which would
                     jump, and whose position framer's `layout` cannot reliably
                     measure inside this card's 3D transform — it is absolutely
                     placed and travels between two anchors, so the move itself
                     is the animation. A spring rather than a tween: it reads as
                     the name being displaced by the astronaut arriving.

                     The two anchors are the mark's own top and bottom edges.
                     us.png carries roughly a tenth of empty frame above and
                     below the glyph, so a name centred on an edge clears the
                     artwork by a comfortable gap while still reading as
                     attached to it. */}
                    <motion.div
                      className="absolute inset-x-0 flex justify-center"
                      initial={false}
                      style={{ translateY: "-50%" }}
                      animate={{ top: isExpanded ? "0%" : "100%" }}
                      transition={{ type: "spring", stiffness: 190, damping: 23, mass: 0.9 }}
                    >
                      <SignatureName
                        className={
                          letterbox
                            ? "text-sm text-sky-100/85"
                            : "text-lg text-sky-100/85 sm:text-xl lg:text-2xl"
                        }
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            )}

            {/* Color overlay giving this section's universe its own tone */}
            <div
              className="absolute inset-0"
              style={{ background: atmosphere.overlay }}
            />

            {isEntry ? (
              <motion.div
                className="absolute inset-x-0 bottom-0 h-[65%]"
                style={{
                  transform: earthTransform,
                  willChange: "transform",
                }}
              >
                {/* The particle-formed mark used to render here alongside the
                 static background image above — same source picture, two
                 independently-sized/positioned copies of it on screen at
                 once, reading as a stray second logo rather than one
                 graphic. The background image already carries that mark, so
                 this slot now only ever shows the astronaut once the bio
                 expands, and shows nothing the rest of the time. */}
                <AnimatePresence>
                  {isExpanded && !isMobile && (
                    <motion.div
                      key="astronaut"
                      // Expansion starts close and settles outward. The nested
                      // layer below continues the same dolly direction only
                      // while the visitor moves forward through the flight.
                      initial={{ opacity: 0, scale: 1.22, y: "0.35em" }}
                      animate={{ opacity: 1, scale: 1, y: "0em" }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 0.45, ease: POWER2_OUT },
                        scale: { duration: 0.82, ease: POWER2_OUT },
                        y: { duration: 0.82, ease: POWER2_OUT },
                      }}
                      className="absolute inset-0"
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          scale: astronautDollyScale,
                          y: astronautDollyY,
                          transformOrigin: "50% 72%",
                          willChange: "transform",
                        }}
                      >
                        <Image
                          src="/astr2.svg"
                          alt=""
                          fill
                          loading="eager"
                          sizes="(min-width: 600px) 24vw, 32vh"
                          // Drifts up and grows very slightly on hover, as if
                          // pushing off toward the visitor. Slower than the
                          // mark's own response (700ms vs 500ms) so the two
                          // read as one gesture with the astronaut trailing it
                          // rather than as two things twitching together.
                          className="object-contain object-bottom p-10 transition-transform duration-700 ease-out sm:p-12 motion-safe:group-hover/card:-translate-y-2 motion-safe:group-hover/card:scale-[1.04]"
                          aria-hidden="true"
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                className="absolute inset-0"
                style={{
                  opacity: motifOpacity,
                  scale: motifScale,
                  willChange: "opacity, transform",
                  // No mixBlendMode here. The planet this replaced was pastel
                  // fills on a transparent ground and was screened so the
                  // starfield carried through it; the cast is drawn with black
                  // outlines, and screening dissolves exactly those outlines
                  // and leaves a ghost. The figures are solid bodies in the
                  // window — it is the accent light below, not the whole
                  // figure, that blends.
                }}
              >
                {/* The drawn motif stays, underneath: it is the section's own
                   signature and now reads as the space the scene is happening
                   in rather than as the only thing in the window. */}
                {scene?.backdrop ? (
                  <>
                    <Image
                      src={scene.backdrop}
                      alt=""
                      fill
                      loading="eager"
                      sizes="(min-width: 1024px) 30vw, 60vw"
                      className="object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: atmosphere.overlay }}
                    />
                  </>
                ) : (
                  <PortalMotif motif={atmosphere.motif} accent={atmosphere.accent} />
                )}

                {scene && (
                  <>
                    {/* Ambient accent behind the figure, so it is lit from the
                       region it is flying through and does not sit on the
                       starfield as a cut-out. Faint and tight on purpose —
                       wide or strong, it hazes the whole portal flat and the
                       deep-space falloff disappears. */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(circle at 50% 46%, ${atmosphere.accent}30 0%, ${atmosphere.accent}12 30%, transparent 56%)`,
                      }}
                    />
                    {scene.streaks
                      ?.map((streak, i) => ({ streak, i }))
                      .filter(({ streak }) => streak.behind)
                      .map(({ streak, i }) => (
                        <ShootingStar
                          // By position, not file: a star can be reused.
                          key={i}
                          streak={streak}
                          life={sceneLife}
                          progress={scrollYProgress}
                        />
                      ))}
                    <motion.div
                      className={`absolute ${scene.inset}`}
                      style={{
                        x: sceneX,
                        y: sceneY,
                        rotate: sceneTilt,
                        willChange: "transform",
                        ...(scene.fadeBottom && {
                          maskImage:
                            "linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)",
                          WebkitMaskImage:
                            "linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)",
                        }),
                      }}
                    >
                      {/* The idle float gets its own layer. Both it and the
                         scroll drift above animate `transform`, and a CSS
                         animation outranks an inline style — on one element the
                         keyframes would simply erase framer's x/rotate and the
                         scene would stop reacting to scroll entirely. */}
                      <div className={`absolute inset-0 ${scene.float}`}>
                        <Image
                          src={scene.src}
                          alt=""
                          fill
                          // Required, not optional: /_next/image answers 400 for
                          // any SVG unless `dangerouslyAllowSVG` is set, so
                          // without this every scene renders as nothing — and
                          // alt="" would let it fail silently.
                          unoptimized
                          // Eager, not the default lazy. Lazy loading waits
                          // for the browser to decide the image is near the
                          // viewport, and a card parked deep in the corridor
                          // (scaled down, faded, or visibility: hidden) does
                          // not look near to it until the card is almost on
                          // top of you — so every scene arrived late. These
                          // are four small SVGs; fetch them up front.
                          loading="eager"
                          sizes="(min-width: 1024px) 30vw, 60vw"
                          className={
                            scene.fit === "cover" ? "object-cover" : "object-contain"
                          }
                          style={{ objectPosition: scene.position }}
                        />
                        {/* This section's light, painted through the figure's own
                           alpha and screened onto it. Screen over the art (not
                           over the starfield) only lifts what is already there,
                           so the suit and the moon take the accent while the
                           outlines stay black. */}
                        <div
                          className="pointer-events-none absolute inset-0 mix-blend-screen"
                          style={sceneTintStyle(scene, atmosphere.accent)}
                        />
                      </div>
                    </motion.div>
                    {scene.streaks
                      ?.map((streak, i) => ({ streak, i }))
                      .filter(({ streak }) => !streak.behind)
                      .map(({ streak, i }) => (
                        <ShootingStar
                          key={i}
                          streak={streak}
                          life={sceneLife}
                          progress={scrollYProgress}
                        />
                      ))}
                  </>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* 3. Punch-through flash layer - inside mask but outside the scaling container so it doesn't scale strangely */}
        {isEntry && (
          <motion.div
            style={{ opacity: flashOpacity }}
            className="pointer-events-none absolute inset-0 bg-sky-50"
          />
        )}
      </div>

      {/* Aperture glow ring — ambient invitation, always animating */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-(--accent)/40 lg:rounded-3xl ${isNear ? "portal-aperture-pulse" : ""
          }`}
      />

      {/* Scroll-progress stroke — traces the rounded border in as this
         card's own portal comes into focus (see the reveal effect above).
         Skipped on the entry card: the earth graphic has no reveal/depart
         window of its own, so the ring never had anywhere to animate. */}
      {!isEntry && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <rect
            x="1"
            y="1"
            width="98%"
            height="98%"
            rx="20"
            ry="20"
            fill="none"
            stroke="white"
            strokeOpacity="0.12"
            strokeWidth="2"
          />
          <motion.rect
            x="1"
            y="1"
            width="98%"
            height="98%"
            rx="20"
            ry="20"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            style={{
              strokeDashoffset: progressDashOffset,
              filter: "drop-shadow(0 0 5px #fbbf24)",
            }}
          />
        </svg>
      )}

      {isMobile && isEntry && (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-1 px-3">
          <Image src="/images/us.png" alt="" width={64} height={64} className="h-16 w-16 object-contain" aria-hidden="true" />
          <SignatureName active={isNear} className="justify-self-center text-[18px] text-sky-100" />
        </div>
      )}

      {/* Action label — faint baseline (touch), brightens on hover-capable pointer hover */}
      <div className={`pointer-events-none absolute flex justify-center transition-opacity duration-300 group-hover:opacity-100 ${isMobile ? "right-3 top-1/2 -translate-y-1/2" : "inset-x-0 bottom-4 opacity-70"}`}>
        {/* Solid-ish plate, not backdrop-blur: a backdrop filter here would
           sit inside a 3D-transformed card over a scene that repaints every
           scroll frame, forcing a re-blur of its backdrop each time — six
           cards' worth. The darker background reads the same. */}
        <span className={`inline-flex items-center rounded-full border border-white/25 bg-black/55 text-xs font-medium text-sky-50 ${isMobile ? "min-h-11 gap-1 px-2" : "gap-2 px-4 py-2"}`}>
          <ArrowUpRightIcon ref={arrowRef} size={14} aria-hidden="true" />
          {actionLabel}
        </span>
      </div>
    </div>
  );
}
