"use client";

import { motion } from "framer-motion";

// The cockpit's material, shared rather than owned.
//
// Brushed metal, a travelling sheen and a pair of rivets: three decorations
// that only read as one machine if every panel wearing them uses the same
// ones. They lived in CockpitTray while the tray was the only thing made of
// metal; the autopilot prompt is the second, so they moved here instead of
// being imported back out of a component that imports the prompt.

export const METAL_SURFACE =
  "mission-metal-surface relative overflow-hidden border";

export const TRAY_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.8,
} as const;

export function BrushedGrain() {
  return (
    <span
      aria-hidden="true"
      className="mission-metal-grain pointer-events-none absolute inset-0 opacity-[0.55]"
    />
  );
}

const SHEEN_REST_S = 4.2;

export function Sheen({
  delay = 0,
  duration = 3.2,
  active = true,
}: {
  delay?: number;
  duration?: number;
  active?: boolean;
}) {
  if (!active) return null;
  const cycle = duration + SHEEN_REST_S;
  return (
    <motion.span
      aria-hidden="true"
      style={{ willChange: "transform" }}
      className="pointer-events-none absolute inset-y-0 -left-[45%] w-[38%] -skew-x-12 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.05)_35%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.05)_65%,transparent_100%)]"
      animate={{
        transform: ["translateX(0%)", "translateX(420%)", "translateX(420%)"],
      }}
      transition={{
        duration: cycle,
        times: [0, duration / cycle, 1],
        ease: ["easeInOut", "linear"],
        delay,
        repeat: Infinity,
      }}
    />
  );
}

export function Rivets({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute flex justify-between ${className}`}
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <span
          key={i}
          className="mission-rivet h-1.5 w-1.5 rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
        />
      ))}
    </span>
  );
}
