"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const APPEAR_AFTER_MS = 2600;

export default function SkipIntroPrompt() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let timer = 0;

    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ running?: boolean; index?: number }>)
        .detail;
      const onIntro = Boolean(detail?.running) && detail?.index === 0;

      if (!onIntro) {
        window.clearTimeout(timer);
        timer = 0;
        setShown(false);
        return;
      }
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        setShown(true);
      }, APPEAR_AFTER_MS);
    };

    window.addEventListener("flight-autopilot-state", onState as EventListener);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("flight-autopilot-state", onState as EventListener);
    };
  }, []);

  const skip = () => {
    setShown(false);
    window.dispatchEvent(new CustomEvent("flight-skip-intro"));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center sm:top-24">
      <AnimatePresence>
        {shown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-slate-950/85 py-1.5 pl-4 pr-1.5 text-sky-50 shadow-[0_16px_40px_rgba(2,8,23,0.55)] "
          >
            <span className="text-xs font-semibold tracking-wide text-sky-100/80">
              Bored?
            </span>
            <button
              type="button"
              onClick={skip}
              className="flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-sky-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100 transition-colors hover:bg-sky-400/30"
            >
              Skip intro
              <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M4 5.14v13.72L13 12z" />
                <rect x="15" y="5" width="3" height="14" rx="1" fill="currentColor" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
