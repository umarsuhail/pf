"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import {
  POWER1_IN,
  POWER2_IN,
  POWER2_OUT,
  POWER3_OUT,
} from "../lib/easings";
import { ArrowUpRightIcon } from "./icons/arrow-up-right";
import type { AnimatedIconHandle } from "./icons/card-icon";
import Space from "./Space";
import ParticleLogo from "./HeroLogo";

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
}

const sectionProgressStops = [0, 0.22, 0.56, 0.69, 0.81, 0.92];

// Home / Identity Space keeps its original overlay; every other section gets
// its own atmosphere — a color grade plus an abstract motif standing in for
// a distinct "universe" (no per-section imagery exists, so these are drawn).
type MotifType = "earth" | "orb" | "nodes" | "worlds" | "timeline" | "network" | "calm";

const atmospheres: { overlay: string; motif: MotifType; accent: string }[] = [
  {
    // 0 home — identity
    overlay:
      "linear-gradient(180deg, rgba(87, 22, 35, 0.55) 0%, rgba(6, 20, 81, 0.15) 45%, rgba(0, 15, 49, 0.35) 100%)",
    motif: "earth",
    accent: "#7dd3fc",
  },
  {
    // 1 skills — technology constellation
    overlay:
      "linear-gradient(180deg, rgba(4, 120, 87, 0.3) 0%, rgba(6, 78, 59, 0.15) 45%, rgba(2, 20, 25, 0.4) 100%)",
    motif: "nodes",
    accent: "#34d399",
  },
  {
    // 2 projects — floating worlds
    overlay:
      "linear-gradient(180deg, rgba(3, 105, 161, 0.3) 0%, rgba(12, 74, 110, 0.15) 45%, rgba(2, 15, 35, 0.4) 100%)",
    motif: "worlds",
    accent: "#60a5fa",
  },
  {
    // 3 experience — timeline through the journey
    overlay:
      "linear-gradient(180deg, rgba(180, 83, 9, 0.26) 0%, rgba(120, 53, 15, 0.14) 45%, rgba(20, 12, 4, 0.4) 100%)",
    motif: "timeline",
    accent: "#fbbf24",
  },
  {
    // 4 resume — branching network
    overlay:
      "linear-gradient(180deg, rgba(51, 65, 85, 0.34) 0%, rgba(30, 41, 59, 0.18) 45%, rgba(8, 10, 15, 0.4) 100%)",
    motif: "network",
    accent: "#94a3b8",
  },
  {
    // 5 contact — calm arrival
    overlay:
      "linear-gradient(180deg, rgba(3, 105, 161, 0.2) 0%, rgba(8, 47, 73, 0.12) 45%, rgba(2, 10, 25, 0.35) 100%)",
    motif: "calm",
    accent: "#7dd3fc",
  },
];

// Non-entry cards that have a real hero image, keyed by card index (1-based
// after the entry/earth card at index 0); indices without an entry fall back
// to the drawn PortalMotif below.
const imageSrcByIndex: Record<number, string> = {
  1: "/a3.svg",
  2: "/a4.svg",
  3: "/a5.svg",
  4: "/a6.svg",
  5: "/a7.svg",
};

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
  // Drives the entry portal's ParticleLogo instances' form-in/disperse-out
  // — derived from the same scroll-reveal math below rather than a plain
  // viewport IntersectionObserver, since this card's visibility is CSS
  // opacity/scale, not geometry (it stays inside the sticky flight
  // container at all times).
  const [particlesActive, setParticlesActive] = useState(false);
  const isEntry = index === 0;
  const atmosphere = atmospheres[index % atmospheres.length];

  // Entry card: earth rises from a bottom corner as percentages of its own
  // size (translate(x%, y%) reproduces gsap's xPercent/yPercent exactly).
  const earthXPercent = useMotionValue((align === "left" ? 1 : -1) * 30);
  const earthYPercent = useMotionValue(105);
  const earthTransform = useMotionTemplate`translate(${earthXPercent}%, ${earthYPercent}%)`;

  // Other cards: their motif fades and settles in instead of rising.
  const motifOpacity = useMotionValue(0);
  const motifScale = useMotionValue(0.85);
  // Per-section globe spin, on its own motion value so it never fights the
  // opacity/scale tweens above.
  const spinRotate = useMotionValue(index * 40);
  // Traces the card's rounded-corner ring in/out as it comes into and
  // leaves focus.
  const progressDashOffset = useMotionValue(100);

  // Click-to-activate "warp" flourish (visualRef's zoom, entry's flash).
  const visualScale = useMotionValue(1);
  const flashOpacity = useMotionValue(0);

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
    // stop + 0.131 (1100px perspective / 8400px camera travel; mobile's
    // shorter 7800px travel puts it a touch later, ~0.141, so 0.131 is the
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

    // Retargeting animate() calls (rather than jumping straight to the
    // value) keeps per-scroll updates smooth — the motion-value equivalent
    // of GSAP's quickTo setters.
    let applyReveal: (eased: number, fade: number) => void;
    if (isEntry) {
      // Earth rises from the bottom corner, staying clipped inside the window
      const cornerDirection = align === "left" ? 1 : -1;
      applyReveal = (eased) => {
        animate(earthXPercent, cornerDirection * 30 * (1 - eased), {
          duration: 0.6,
          ease: POWER3_OUT,
        });
        animate(earthYPercent, 105 * (1 - eased), {
          duration: 0.6,
          ease: POWER3_OUT,
        });
      };
      // Entry card rises rather than fading — no depart dim to apply.
    } else {
      // Other universes' motifs fade and settle into view instead of fading
      applyReveal = (eased, fade) => {
        animate(motifOpacity, eased * fade, { duration: 0.6, ease: POWER2_OUT });
        animate(motifScale, 0.85 + eased * 0.15, {
          duration: 0.6,
          ease: POWER3_OUT,
        });
      };
    }

    // Traces the rounded border in as the card comes into focus, then
    // traces back out as it departs — the ring reads as this card's own
    // zoom-in/zoom-out progress through the flight. Skipped on the entry
    // card: its ring <rect> isn't rendered (see JSX below).
    const applyProgressDash = isEntry
      ? null
      : (value: number) =>
        animate(progressDashOffset, value, { duration: 0.6, ease: POWER2_OUT });

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

      if (isEntry) setParticlesActive(reveal > 0.6);

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

  // Scroll-driven spin for the per-section globes, mirroring the distant
  // a1.png earth at the end of the flight: rotation tracks how far the
  // visitor has travelled rather than a wall-clock timer, so the globes are
  // already mid-turn when a card comes into view and freeze when scrolling
  // stops. Lives on its own motion value so it never fights the
  // opacity/scale tweens already driving the motif.
  useEffect(() => {
    if (isEntry) return;

    // Staggered start angle so the globes aren't all locked in unison
    const offset = index * 40;
    const update = (progress: number) =>
      animate(spinRotate, offset + progress * 260, {
        duration: 0.8,
        ease: POWER2_OUT,
      });

    update(scrollYProgress.get());
    const unsubscribe = scrollYProgress.on("change", update);
    return () => unsubscribe();
  }, [index, isEntry, scrollYProgress, spinRotate]);

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
          {/* Space backdrop filling the window, carrying this section's portal color */}
          <Space tint={atmosphere.accent} />

          {isEntry && (
            <Image
              src="/images/us.png"
              alt=""
              width={300}
              height={300}
              sizes=" 30vw, 40vh"
              className="object-cover opacity-55 mix-blend-screen p-8"
              aria-hidden="true"
            />
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
              <AnimatePresence initial={false} mode="wait">
                {isExpanded ? (
                  <motion.div
                    key="astronaut"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <Image
                      src="/SVG/astr.svg"
                      alt=""
                      fill
                      sizes="(min-width: 600px) 30vw, 40vh"
                      className="object-contain   p-8 object-bottom"
                      aria-hidden="true"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="logo"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <ParticleLogo
                      src="/images/us.png"
                      particleCount={1800}
                      speed={0.8}
                      disperseStrength={110}
                      size={150}
                      active={particlesActive}
                      className="object-contain object-bottom"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              className="absolute inset-0"
              style={{ opacity: motifOpacity, scale: motifScale, willChange: "opacity, transform" }}
            >
              {imageSrcByIndex[index] ? (
                <motion.div className="absolute inset-0" style={{ rotate: spinRotate }}>
                  <Image
                    src={imageSrcByIndex[index]}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 30vw, 30vh"
                    className="object-contain"
                  />
                </motion.div>
              ) : (
                <PortalMotif motif={atmosphere.motif} accent={atmosphere.accent} />
              )}
            </motion.div>
          )}
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
      <div className="portal-aperture-pulse pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-(--accent)/40 lg:rounded-3xl" />

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
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs font-medium text-sky-50 backdrop-blur-sm">
          <ArrowUpRightIcon ref={arrowRef} size={14} aria-hidden="true" />
          {actionLabel}
        </span>
      </div>
    </div>
  );
}
