"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AirplaneIcon, type AirplaneIconHandle } from "./icons/airplane";

const VISIBLE_MS = 1800;

// A one-shot "Let's go" beat that plays the instant autopilot actually
// launches — dispatched from MultiverseFlight right as the tour resets to
// the very beginning, so the announcement and the snap-to-start read as one
// gesture rather than two disconnected things happening near each other.
export default function AutopilotStartToast() {
  const [visible, setVisible] = useState(false);
  const iconRef = useRef<AirplaneIconHandle>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onLaunch = () => {
      window.clearTimeout(timeoutRef.current);
      setVisible(true);
      // Fires on mount too, but the icon only exists once `visible` renders
      // it — a microtask later is plenty for that to have happened.
      requestAnimationFrame(() => iconRef.current?.startAnimation());
      timeoutRef.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    };
    // flight-autopilot-state fires on every leg (running: true each time),
    // not just when the tour actually stops — only a running:false means
    // the tour ended and the toast should clear early if it's still up.
    const onStop = (event: Event) => {
      const running = (event as CustomEvent<{ running?: boolean }>).detail?.running;
      if (running) return;
      window.clearTimeout(timeoutRef.current);
      setVisible(false);
    };

    window.addEventListener("flight-autopilot-launch", onLaunch);
    window.addEventListener("flight-autopilot-state", onStop as EventListener);
    return () => {
      window.clearTimeout(timeoutRef.current);
      window.removeEventListener("flight-autopilot-launch", onLaunch);
      window.removeEventListener("flight-autopilot-state", onStop as EventListener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center sm:top-24">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="flex items-center gap-2.5 rounded-full border border-white/15 bg-slate-950/85 py-2.5 pl-4 pr-5 text-sky-50 shadow-[0_16px_40px_rgba(2,8,23,0.55)] backdrop-blur-xl"
          >
            <AirplaneIcon ref={iconRef} size={18} className="text-(--accent)" />
            <span className="text-sm font-semibold tracking-wide">Let&apos;s go</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
