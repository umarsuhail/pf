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

// Pure GSAP-style Quart-out curve (gsap.parseEase("power3.out")) used to
// shape the reveal progress itself — not an animation, just math applied to
// the 0-1 scroll fraction before it's handed to the motion-value tweens.
const power3Out = (t: number) => 1 - Math.pow(1 - t, 4);

interface CardPortalProps {
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

const sectionProgressStops = [0, 0.22, 0.56, 0.69, 0.81, 0.92];

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
// 217° -> violet 255° -> sky 199°. Experience's violet is the exact colour of
// the `violet` space region that follows it at 0.81, so the card bleeds into
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
    // trip, and the handover into the violet region at 0.81.
    overlay:
      "linear-gradient(180deg, rgba(109, 40, 217, 0.26) 0%, rgba(76, 29, 149, 0.14) 45%, rgba(12, 6, 26, 0.4) 100%)",
    motif: "timeline",
    accent: "#a78bfa",
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

// --- The cast -----------------------------------------------------------
//
// Every non-entry portal used to draw the same ringed planet
// (/images/a3-planet.svg), hue-rotated onto each section's accent. That file
// is gone, so the four portals were rendering a 404 — but the reason to
// replace it rather than restore it is that a planet seen five times is a
// backdrop, not a story. The flight is a comic (see AGENTS.md), and a panel
// needs someone in it.
//
// So each portal now looks out at one beat of a single continuous scene,
// acted by a fixed cast: the astronaut who opens the story in the loader
// (/space/oastr.svg, the same figure), and the aliens he meets on the way.
//
//   02 skills      rocket   — the astronaut under power, alone in the frame
//   03 projects    saucer   — another crew, another craft, passing close
//   04 experience  crew     — the two of them side by side, flag between
//   05 contact     landing  — touched down, flag planted, both waving out
//
// Read in order they are a departure, an encounter, a partnership and an
// arrival, which is the shape the sections already have. Home is not in the
// table: panel 01 carries the US mark and the astronaut's own entrance, and
// its window is the one place the traveller is the subject rather than the
// scene.
//
// The art is full-colour cartoon work and is composited *normally*, unlike
// the planet it replaces, which was screen-blended so the starfield could
// carry through it. Screening a figure drawn with black outlines dissolves
// exactly those outlines and leaves a ghost; the cast has to read as solid
// bodies in the window. What ties them to the section colour instead is
// `tint` below — the accent, masked to the figure's own silhouette and
// screened over it, so the region's light falls on them (rule 3: art is a
// window onto the scene the traveller is passing, tinted to that accent).
type Scene = {
  src: string;
  // Where the figure sits in the window, as object-position. These are not
  // all centred on purpose: the rocket climbs through the middle, the moon
  // in `landing` has to sit on the portal's floor for its curve to read as
  // ground, and the saucer passes high.
  position: string;
  // How much of the window the figure occupies. Inset rather than a width so
  // the same value works for the tall desktop portal and the wide phone
  // letterbox, where nothing inside is laid out in percentages of the box.
  inset: string;
  // Idle life. These are the same ambient classes the drawn motifs use, and
  // they are disabled under prefers-reduced-motion in globals.css.
  float: string;
  // Strength of the accent light on the figure. The pale suit and the white
  // moon take colour readily; the darker saucer needs more to belong to its
  // blue.
  tint: number;
  // The line the figure travels across the window as the card is approached
  // and left, in percent of the window, plus the angle it holds while doing
  // it. A rocket parked in the middle of a portal is a photograph of a
  // rocket; the same rocket crossing the frame corner to corner, at the speed
  // you scroll, is under power. Figures that are standing somewhere — the
  // crew, the landing — get a short path instead of a long one, because they
  // are not going anywhere.
  travel: { from: [number, number]; to: [number, number]; lean: number };
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
    position: "center",
    inset: "inset-[12%]",
    float: "motif-float-slow",
    tint: 0.3,
    // Bottom-left to top-right, leaning into the climb: the artwork's nose
    // points straight up, so it has to be rotated onto its own flight path or
    // it reads as a rocket sliding sideways.
    travel: { from: [-32, 40], to: [32, -40], lean: 34 },
  },
  2: {
    src: "/space/saucer.svg",
    position: "center 36%",
    inset: "inset-[14%]",
    float: "motif-float-med",
    tint: 0.34,
    // Crossing the other way, so two consecutive panels do not pan the same
    // direction and read as one long move.
    travel: { from: [34, -20], to: [-34, 20], lean: -8 },
  },
  3: {
    src: "/space/crew.svg",
    position: "center 45%",
    inset: "inset-[15%]",
    float: "motif-float-slow",
    tint: 0.32,
    // Standing still, being passed: a drift, not a crossing.
    travel: { from: [-11, 5], to: [11, -5], lean: 0 },
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
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskPosition: scene.position,
    WebkitMaskPosition: scene.position,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    opacity: scene.tint,
  };
}

function PortalMotif({ motif, accent }: { motif: MotifType; accent: string }) {
  switch (motif) {
    case "orb":
      return (
        <div
          className="motif-breathe absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px]"
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
          className="motif-breathe absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[6px]"
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
  const sceneStop = sectionProgressStops[index] ?? 0;
  const scenePrevious = index > 0 ? sectionProgressStops[index - 1] : 0;
  const sceneApproach = Math.max(sceneStop - scenePrevious, 0.08) * 0.3;
  const sceneWindow = [sceneStop - sceneApproach, sceneStop + 0.11];
  const sceneX = useTransform(scrollYProgress, sceneWindow, [
    `${scenePath.from[0]}%`,
    `${scenePath.to[0]}%`,
  ]);
  const sceneY = useTransform(scrollYProgress, sceneWindow, [
    `${scenePath.from[1]}%`,
    `${scenePath.to[1]}%`,
  ]);
  // A few degrees of roll either side of the held lean, so the crossing has
  // some life in it rather than being a rigid slide.
  const sceneTilt = useTransform(scrollYProgress, sceneWindow, [
    scenePath.lean - 4,
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

    // Reveals only when very close to the card's focus point
    const revealStart = Math.max(currentStop - approachSpan * 0.3, 0);
    const revealPeak = currentStop;
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
    const departFadeStart = currentStop + 0.03;
    const departFadeEnd = currentStop + 0.11;
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

          {isEntry && (
            // Whole group lifted 14px: the mark reads better sitting slightly
            // above the portal's optical centre. Expanded, it climbs a good
            // deal further — the astronaut flies in from the bottom of this
            // same window and was landing across the mark, and the signature
            // swaps to the mark's top edge at the same moment, so the pair
            // needs the headroom. The letterbox portal is a third the height,
            // so it gets a proportionally smaller lift rather than the same
            // pixels, which would walk the mark straight out of frame.
            <div
              className={`absolute inset-0 transition-transform duration-700 ease-out ${
                isExpanded
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
                    sizes="(min-width: 1024px) 30vw, 60vw"
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
                {isExpanded && (
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
                        src="/astr.svg"
                        alt=""
                        fill
                        // Required, not optional: /_next/image answers 400 for
                        // any SVG unless `dangerouslyAllowSVG` is enabled in
                        // next.config, so without this the optimizer refuses
                        // the file and the astronaut renders as nothing at
                        // all. alt="" meant that failed silently.
                        unoptimized
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
              <PortalMotif motif={atmosphere.motif} accent={atmosphere.accent} />

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
                  <motion.div
                    className={`absolute ${scene.inset}`}
                    style={{
                      x: sceneX,
                      y: sceneY,
                      rotate: sceneTilt,
                      willChange: "transform",
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
                        sizes="(min-width: 1024px) 30vw, 60vw"
                        className="object-contain"
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
        className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-(--accent)/40 lg:rounded-3xl ${
          isNear ? "portal-aperture-pulse" : ""
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

      {/* Action label — faint baseline (touch), brightens on hover-capable pointer hover */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center opacity-70 transition-opacity duration-300 group-hover:opacity-100">
        {/* Solid-ish plate, not backdrop-blur: a backdrop filter here would
           sit inside a 3D-transformed card over a scene that repaints every
           scroll frame, forcing a re-blur of its backdrop each time — six
           cards' worth. The darker background reads the same. */}
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/55 px-4 py-2 text-xs font-medium text-sky-50">
          <ArrowUpRightIcon ref={arrowRef} size={14} aria-hidden="true" />
          {actionLabel}
        </span>
      </div>
    </div>
  );
}
