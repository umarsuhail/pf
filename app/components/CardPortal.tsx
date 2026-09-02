"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import gsap from "gsap";
import type { MotionValue } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import Space from "./Space";

interface CardPortalProps {
  index: number;
  scrollYProgress: MotionValue<number>;
  align?: "left" | "right";
  targetId: string;
  actionLabel: string;
  ariaLabel: string;
}

const sectionProgressStops = [0, 0.11, 0.22, 0.56, 0.69, 0.81, 0.92];

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
    // 1 about — personal, warm
    overlay:
      "linear-gradient(180deg, rgba(220, 38, 38, 0.32) 0%, rgba(127, 29, 29, 0.16) 45%, rgba(15, 8, 8, 0.4) 100%)",
    motif: "orb",
    accent: "#f87171",
  },
  {
    // 2 skills — technology constellation
    overlay:
      "linear-gradient(180deg, rgba(4, 120, 87, 0.3) 0%, rgba(6, 78, 59, 0.15) 45%, rgba(2, 20, 25, 0.4) 100%)",
    motif: "nodes",
    accent: "#34d399",
  },
  {
    // 3 projects — floating worlds
    overlay:
      "linear-gradient(180deg, rgba(3, 105, 161, 0.3) 0%, rgba(12, 74, 110, 0.15) 45%, rgba(2, 15, 35, 0.4) 100%)",
    motif: "worlds",
    accent: "#60a5fa",
  },
  {
    // 4 experience — timeline through the journey
    overlay:
      "linear-gradient(180deg, rgba(180, 83, 9, 0.26) 0%, rgba(120, 53, 15, 0.14) 45%, rgba(20, 12, 4, 0.4) 100%)",
    motif: "timeline",
    accent: "#fbbf24",
  },
  {
    // 5 open source — branching network
    overlay:
      "linear-gradient(180deg, rgba(51, 65, 85, 0.34) 0%, rgba(30, 41, 59, 0.18) 45%, rgba(8, 10, 15, 0.4) 100%)",
    motif: "network",
    accent: "#94a3b8",
  },
  {
    // 6 contact — calm arrival
    overlay:
      "linear-gradient(180deg, rgba(3, 105, 161, 0.2) 0%, rgba(8, 47, 73, 0.12) 45%, rgba(2, 10, 25, 0.35) 100%)",
    motif: "calm",
    accent: "#7dd3fc",
  },
];

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
}: CardPortalProps) {
  const earthRef = useRef<HTMLDivElement>(null);
  const motifRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const isEntry = index === 0;
  const atmosphere = atmospheres[index % atmospheres.length];

  useEffect(() => {
    const target = isEntry ? earthRef.current : motifRef.current;
    if (!target) return;

    const currentStop = sectionProgressStops[index] ?? 0;
    const previousStop = index > 0 ? sectionProgressStops[index - 1] : 0;
    const approachSpan = Math.max(currentStop - previousStop, 0.08);

    // Reveals only when very close to the card's focus point
    const revealStart = Math.max(currentStop - approachSpan * 0.3, 0);
    const revealPeak = currentStop;
    const ease = gsap.parseEase("power3.out");
    let lastReveal = -1;

    // Quick setters keep per-scroll updates cheap (percent-based, GPU-composited)
    let applyReveal: (eased: number) => void;
    if (isEntry) {
      // Earth rises from the bottom corner, staying clipped inside the window
      const cornerDirection = align === "left" ? 1 : -1;
      const earthX = gsap.quickTo(target, "xPercent", {
        duration: 0.6,
        ease: "power3.out",
      });
      const earthY = gsap.quickTo(target, "yPercent", {
        duration: 0.6,
        ease: "power3.out",
      });
      applyReveal = (eased) => {
        earthX(cornerDirection * 30 * (1 - eased));
        earthY(105 * (1 - eased));
      };
    } else {
      // Other universes' motifs fade and settle into view instead of rising
      const motifOpacity = gsap.quickTo(target, "opacity", {
        duration: 0.6,
        ease: "power2.out",
      });
      const motifScale = gsap.quickTo(target, "scale", {
        duration: 0.6,
        ease: "power3.out",
      });
      applyReveal = (eased) => {
        motifOpacity(eased);
        motifScale(0.85 + eased * 0.15);
      };
    }

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

      // Skip redundant work while the card is far away (or fully revealed)
      if (reveal === lastReveal) return;
      lastReveal = reveal;

      applyReveal(ease(reveal));
    };

    update(scrollYProgress.get());
    const unsubscribe = scrollYProgress.on("change", update);
    return () => unsubscribe();
  }, [index, align, scrollYProgress, isEntry]);

  // Snap the entry portal back to rest if the user manually scrolls back near the top
  useEffect(() => {
    if (!isEntry) return;
    const unsubscribe = scrollYProgress.on("change", (value) => {
      if (value <= 0.02 && !hasEnteredRef.current) {
        tlRef.current?.kill();
        gsap.set(visualRef.current, { scale: 1 });
        gsap.set(flashRef.current, { opacity: 0 });
      }
    });
    return () => unsubscribe();
  }, [isEntry, scrollYProgress]);

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

    tlRef.current?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        hasEnteredRef.current = false;
        setIsActivating(false);
      },
    });
    tlRef.current = tl;

    tl.to(
      visualRef.current,
      {
        scale: isEntry ? 1.18 : 1.06,
        duration: isEntry ? 0.45 : 0.22,
        ease: "power2.in",
      },
      0,
    );

    if (isEntry) {
      tl.to(flashRef.current, { opacity: 1, duration: 0.3, ease: "power1.in" }, 0.2)
        .call(navigateToTarget, undefined, 0.45)
        .to(flashRef.current, { opacity: 0, duration: 0.4, ease: "power2.out" }, 0.5)
        .to(visualRef.current, { scale: 1, duration: 0.4, ease: "power2.out" }, 0.5);
      return;
    }

    tl.call(navigateToTarget, undefined, 0.14).to(visualRef.current, {
      scale: 1,
      duration: 0.28,
      ease: "power2.out",
    });
  };

  return (
    <div
      className="group absolute inset-0 cursor-pointer rounded-2xl outline-none lg:rounded-3xl focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-disabled={isActivating}
      onClick={handleActivate}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
    >
      <div
        ref={visualRef}
        className="relative h-full w-full transform-flat overflow-hidden rounded-2xl [clip-path:inset(0_round_1rem)] lg:rounded-3xl lg:[clip-path:inset(0_round_1.5rem)]"
      >
        {/* Space backdrop filling the window, carrying this section's portal color */}
        <Space tint={atmosphere.accent} />

        {/* Color overlay giving this section's universe its own tone */}
        <div
          className="absolute inset-0"
          style={{ background: atmosphere.overlay }}
        />

        {isEntry ? (
          <div
            ref={earthRef}
            className="absolute inset-x-0 bottom-0 h-[65%]"
            style={{
              transform: "translateY(105%)",
              willChange: "transform",
            }}
          >
            <Image
              src="/earth.png"
              alt=""
              fill
              className="object-cover object-top"
            />
          </div>
        ) : (
          <div
            ref={motifRef}
            className="absolute inset-0"
            style={{ opacity: 0, willChange: "opacity, transform" }}
          >
            <PortalMotif motif={atmosphere.motif} accent={atmosphere.accent} />
          </div>
        )}

        {/* Punch-through flash masking the seam into the real camera flight */}
        {isEntry && (
          <div
            ref={flashRef}
            className="pointer-events-none absolute inset-0 bg-sky-50"
            style={{ opacity: 0 }}
          />
        )}
      </div>

      {/* Aperture glow ring — ambient invitation, always animating */}
      <div className="portal-aperture-pulse pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-(--accent)/40 lg:rounded-3xl" />

      {/* Action label — faint baseline (touch), brightens on hover-capable pointer hover */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center opacity-70 transition-opacity duration-300 group-hover:opacity-100">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs font-medium text-sky-50 backdrop-blur-sm">
          <FiArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          {actionLabel}
        </span>
      </div>
    </div>
  );
}
