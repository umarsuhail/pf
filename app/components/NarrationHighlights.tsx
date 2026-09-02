"use client";

<<<<<<< HEAD
import { AnimatePresence, motion } from "motion/react";
=======
import { AnimatePresence, motion } from "framer-motion";
>>>>>>> 8a13a2e (ccc)
import { useEffect, useRef, useState } from "react";
import type { AnimatedIcon, AnimatedIconHandle } from "./icons/card-icon";
import { HistoryIcon } from "./icons/history";
import { GithubIcon } from "./icons/github";
import { CpuIcon } from "./icons/cpu";
import { SparklesIcon } from "./icons/sparkles";

// Small call-outs that float near the home card at specific moments in the
// narration — real details and highlights timed to what's actually being
// said, spaced apart so they read as a few well-placed beats rather than a
// popup for every sentence. Word thresholds are counted against each span's
// own text in data/narration.ts (span 0 = 19 words, span 1 = 25, span 2 =
// 20) — a threshold of N fires once N words of that span have been spoken.
type Highlight = {
  spanIndex: number;
  triggerWord: number;
  text: string;
  Icon: AnimatedIcon;
};

const HIGHLIGHTS: Highlight[] = [
  // "...over seven years of experience..." (span 0, word 11 = "years")
  { spanIndex: 0, triggerWord: 12, text: "7+ Years Experience", Icon: HistoryIcon },
  // "...frontend development,..." (span 1, word 4)
  { spanIndex: 1, triggerWord: 5, text: "UI/UX Design & Development", Icon: GithubIcon },
  // "...a wide range of modern technologies and tools." (span 1, word 22)
  { spanIndex: 1, triggerWord: 23, text: "React · Next.js · TypeScript", Icon: CpuIcon },
  // "...to AI-powered and interactive experiences." (span 2, word 16)
  { spanIndex: 2, triggerWord: 17, text: "Meet VEGA — AI Assistant", Icon: SparklesIcon },
];

const VISIBLE_MS = 2200;

// A few edge/corner positions around the card, relative to its own box —
// since this renders inside the card's own transformed container, whichever
// one gets picked moves and scales with the card automatically.
const POSITIONS = [
  "-top-6 -left-6 sm:-top-8 sm:-left-10",
  "-top-6 -right-6 sm:-top-8 sm:-right-10",
  "-bottom-6 -left-6 sm:-bottom-8 sm:-left-10",
  "-bottom-6 -right-6 sm:-bottom-8 sm:-right-10",
  "top-1/2 -left-10 -translate-y-1/2 sm:-left-16",
  "top-1/2 -right-10 -translate-y-1/2 sm:-right-16",
];

// Floats each highlight's text near the home card at a random spot around
// it, timed to the narration actually reaching that word — same visual
// language as the "Let's go" launch toast (spring-in glass pill), but
// per-card and word-triggered instead of tour-start-triggered.
export default function NarrationHighlights() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(POSITIONS[0]);
  const [active, setActive] = useState<Highlight | null>(null);
  const iconRef = useRef<AnimatedIconHandle>(null);
  const firedRef = useRef<Set<number>>(new Set());
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onLaunch = () => {
      // A fresh tour run can trigger every highlight again.
      firedRef.current.clear();
    };

    const onProgress = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          active?: boolean;
          spanIndex?: number;
          currentTime?: number;
          duration?: number;
        }>
      ).detail;
      if (!detail?.active) return;

      const match = HIGHLIGHTS.find((h, i) => {
        if (firedRef.current.has(i) || h.spanIndex !== detail.spanIndex) return false;
        const duration = detail.duration ?? 0;
        const local = duration > 0 ? (detail.currentTime ?? 0) / duration : 0;
        // words-per-span is baked into each threshold via the comments
        // above, not recomputed here — see HIGHLIGHTS.
        const wordsInSpan = h.spanIndex === 0 ? 19 : h.spanIndex === 1 ? 25 : 20;
        return Math.floor(local * wordsInSpan) >= h.triggerWord;
      });
      if (!match) return;

      firedRef.current.add(HIGHLIGHTS.indexOf(match));
      setActive(match);
      setPosition(POSITIONS[Math.floor(Math.random() * POSITIONS.length)]);
      setVisible(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    };

    window.addEventListener("flight-autopilot-launch", onLaunch);
    window.addEventListener("narration-progress", onProgress as EventListener);
    return () => {
      window.clearTimeout(timeoutRef.current);
      window.removeEventListener("flight-autopilot-launch", onLaunch);
      window.removeEventListener("narration-progress", onProgress as EventListener);
    };
  }, []);

  useEffect(() => {
    if (visible) void iconRef.current?.startAnimation();
  }, [visible]);

  if (!active) return null;
  const Icon = active.Icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={HIGHLIGHTS.indexOf(active)}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className={`pointer-events-none absolute z-20 flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/85 py-2 pl-3 pr-4 text-sky-50 shadow-[0_12px_32px_rgba(2,8,23,0.55)] backdrop-blur-xl ${position}`}
        >
          <Icon ref={iconRef} size={16} className="text-(--accent)" />
          <span className="whitespace-nowrap text-xs font-semibold tracking-wide">
            {active.text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
