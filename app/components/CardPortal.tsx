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
import {
  getCardLifeWindow,
  getDepartWindow,
  sectionProgressStops,
} from "../data/flightStops";

const power3Out = (t: number) => 1 - Math.pow(1 - t, 4);

interface CardPortalProps {
  isMobile?: boolean;
  index: number;
  scrollYProgress: MotionValue<number>;
  align?: "left" | "right";
  targetId: string;
  actionLabel: string;
  ariaLabel: string;
  isExpanded?: boolean;
  letterbox?: boolean;
}

type MotifType = "earth" | "orb" | "nodes" | "worlds" | "timeline" | "network" | "calm";

const atmospheres: { overlay: string; motif: MotifType; accent: string }[] = [
  {
    overlay:
      "linear-gradient(180deg, rgba(7, 89, 133, 0.42) 0%, rgba(6, 20, 81, 0.15) 45%, rgba(0, 15, 49, 0.35) 100%)",
    motif: "earth",
    accent: "#7dd3fc",
  },
  {
    overlay:
      "linear-gradient(180deg, rgba(13, 148, 136, 0.3) 0%, rgba(17, 94, 89, 0.15) 45%, rgba(2, 20, 25, 0.4) 100%)",
    motif: "nodes",
    accent: "#2dd4bf",
  },
  {
    overlay:
      "linear-gradient(180deg, rgba(3, 105, 161, 0.3) 0%, rgba(12, 74, 110, 0.15) 45%, rgba(2, 15, 35, 0.4) 100%)",
    motif: "worlds",
    accent: "#60a5fa",
  },
  {
    overlay:
      "linear-gradient(180deg, rgba(91, 141, 177, 0.26) 0%, rgba(21, 48, 85, 0.2) 45%, rgba(11, 26, 43, 0.45) 100%)",
    motif: "timeline",
    accent: "#5b8db1",
  },
  {
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
  fit?: "contain" | "cover";
  fadeBottom?: boolean;
  backdrop?: string;
  streaks?: Streak[];
};

type Streak = {
  src: string;
  width: string;
  at: [number, number];
  y: [number, number];
  behind?: boolean;
};

const IDLE_TRAVEL = { from: [0, 0], to: [0, 0], lean: 0 } as const;

const scenes: Record<number, Scene> = {
  1: {
    src: "/space/rocket.svg",
    position: "35% center",
    inset: "-inset-[6%]",
    fit: "cover",
    float: "motif-float-slow",
    tint: 0.14,
    travel: { from: [0, 2], to: [0, -2], lean: 0 },
  },
  2: {
    src: "/space/ship.png",
    backdrop: "/space/earth.jpg",
    position: "center",
    inset: "inset-x-[10%] top-[34%] bottom-[34%]",
    float: "motif-float-med",
    tint: 0.2,
    travel: { from: [-120, 4], to: [120, -4], lean: 0 },
  },
  3: {
    src: "/space/panarama.jpg",
    position: "center",
    inset: "-inset-[4%]",
    fit: "cover",
    float: "motif-float-slow",
    tint: 0.32,
    travel: { from: [-2, 1], to: [2, -1], lean: 0 },
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
    position: "center bottom",
    inset: "inset-x-[12%] bottom-0 top-[10%]",
    float: "motif-float-med",
    tint: 0.26,
    travel: { from: [-7, 3], to: [7, -1], lean: 0 },
  },
};

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
  const activationRef = useRef<{ cancelled: boolean; timeouts: number[] }>({
    cancelled: true,
    timeouts: [],
  });
  const [isActivating, setIsActivating] = useState(false);
  const isEntry = index === 0;
  const isNearRef = useRef(isEntry);
  const atmosphere = atmospheres[index % atmospheres.length];
  const scene = scenes[index];
  const [isNear, setIsNear] = useState(isEntry);

  const earthXPercent = useMotionValue((align === "left" ? 1 : -1) * 30);
  const earthYPercent = useMotionValue(105);
  const earthTransform = useMotionTemplate`translate(${earthXPercent}%, ${earthYPercent}%)`;

  const motifOpacity = useMotionValue(0);
  const motifScale = useMotionValue(0.85);
  const scenePath = scenes[index]?.travel ?? IDLE_TRAVEL;
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
  const sceneTilt = useTransform(scrollYProgress, sceneWindow, [
    scenePath.lean - 4,
    scenePath.lean,
    scenePath.lean + 4,
  ]);
  const progressDashOffset = useMotionValue(100);

  const visualScale = useMotionValue(1);
  const flashOpacity = useMotionValue(0);
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

    const life = getCardLifeWindow(index);
    const revealStart = isEntry
      ? Math.max(currentStop - approachSpan * 0.3, 0)
      : life.start;
    const revealPeak = isEntry
      ? currentStop
      : life.start + (life.slot - life.start) * 0.2;
    const depart = getDepartWindow(index);
    const departFadeStart = isEntry ? currentStop + 0.03 : depart.start;
    const departFadeEnd = isEntry
      ? currentStop + 0.11
      : Math.max(depart.end, depart.start + 0.001);
    let lastReveal = -1;
    let lastFade = -1;

    let applyReveal: (eased: number, fade: number) => void;
    if (isEntry) {
      const cornerDirection = align === "left" ? 1 : -1;
      applyReveal = (eased) => {
        earthXPercent.set(cornerDirection * 30 * (1 - eased));
        earthYPercent.set(105 * (1 - eased));
      };
    } else {
      applyReveal = (eased, fade) => {
        motifOpacity.set(eased * fade);
        motifScale.set(0.85 + eased * 0.15);
      };
    }

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

      if (reveal === lastReveal && fade === lastFade) return;
      lastReveal = reveal;
      lastFade = fade;

      const nextIsNear = reveal * fade > 0.02;
      isNearRef.current = nextIsNear;
      setIsNear((prev) => (prev === nextIsNear ? prev : nextIsNear));

      applyReveal(power3Out(reveal), fade);
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
      <div className="absolute inset-0 overflow-hidden rounded-2xl [clip-path:inset(0_round_1rem)] lg:rounded-3xl lg:[clip-path:inset(0_round_1.5rem)]">

        <motion.div
          style={{ scale: visualScale }}
          className="relative h-full w-full transform-flat"
        >
          <div className="absolute inset-0">
            <Space tint={atmosphere.accent} active={isNear} />

            {isEntry && !isMobile && (
              <div
                className={`absolute inset-0 transition-transform duration-700 ease-out ${isExpanded
                    ? letterbox
                      ? "-translate-y-6"
                      : "-translate-y-12 sm:-translate-y-16"
                    : "-translate-y-3.5"
                  }`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <Image
                      src="/images/us.png"
                      alt=""
                      width={300}
                      height={255}
                      priority
                      sizes="(min-width: 1024px) 300px, 40vw"
                      className={`h-auto w-auto object-contain mix-blend-screen transition-[opacity,transform] duration-500 ease-out group-hover/card:opacity-80 motion-safe:group-hover/card:scale-[1.06] ${
                        isExpanded ? "opacity-40" : "opacity-55"
                        } ${letterbox ? "max-h-[min(8rem,13vh)] px-4 py-1" : "px-8 py-2"}`}
                      aria-hidden="true"
                    />

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
                <AnimatePresence>
                  {isExpanded && !isMobile && (
                    <motion.div
                      key="astronaut"
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
                className={`absolute inset-0 ${isNear ? "" : "motif-dormant"}`}
                style={{
                  opacity: motifOpacity,
                  scale: motifScale,
                  willChange: "opacity, transform",
                }}
              >
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
                      <div className={`absolute inset-0 ${scene.float}`}>
                        <Image
                          src={scene.src}
                          alt=""
                          fill
                          unoptimized
                          loading="eager"
                          sizes="(min-width: 1024px) 30vw, 60vw"
                          className={
                            scene.fit === "cover" ? "object-cover" : "object-contain"
                          }
                          style={{ objectPosition: scene.position }}
                        />
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

        {isEntry && (
          <motion.div
            style={{ opacity: flashOpacity }}
            className="pointer-events-none absolute inset-0 bg-sky-50"
          />
        )}
      </div>

      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-(--accent)/40 lg:rounded-3xl ${isNear ? "portal-aperture-pulse" : ""
          }`}
      />

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
            stroke="var(--flight-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            style={{
              strokeDashoffset: progressDashOffset,
              filter: "drop-shadow(0 0 5px var(--flight-accent))",
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

      <div className={`pointer-events-none absolute flex justify-center transition-opacity duration-300 group-hover:opacity-100 ${isMobile ? "right-3 top-1/2 -translate-y-1/2" : "inset-x-0 bottom-4 opacity-70"}`}>
        <span className={`flight-card-action inline-flex items-center rounded-full border text-xs font-medium ${isMobile ? "min-h-11 gap-1 px-2" : "gap-2 px-4 py-2"}`}>
          <ArrowUpRightIcon ref={arrowRef} size={14} aria-hidden="true" />
          {actionLabel}
        </span>
      </div>
    </div>
  );
}
