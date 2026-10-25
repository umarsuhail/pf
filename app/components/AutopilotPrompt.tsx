"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { SOUNDTRACK_TRACKS } from "../data/soundtrack";
import {
  setAutoplayEnabled,
  setSkipIntro,
  setTrackChoice,
  TRACK_RANDOM,
  useAutoplayEnabled,
  useSkipIntro,
  useTrackChoice,
} from "../lib/visit-history";
import {
  BrushedGrain,
  METAL_SURFACE,
  Rivets,
  Sheen,
  TRAY_SPRING,
} from "./mission-surface";

// The last thing between the press and the tour.
//
// It began as one question — fullscreen or not — and is now where the
// journey gets configured, because it is the only moment when someone has
// declared an interest in the tour but has not started it yet. Anything
// asked later is asked over the top of a flight already in motion.
//
// It reads and writes the preferences directly rather than taking them as
// props: they live in cookies, every control here is a cookie's own
// checkbox, and routing them through CockpitTray would only add a copy that
// can go stale.

const CHIP =
  "min-h-9 cursor-pointer rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors flex items-center";
const CHIP_OFF =
  "border-white/15 text-slate-300/80 hover:border-white/30 hover:text-sky-100";
const CHIP_ON = "border-sky-300/50 bg-sky-400/20 text-sky-50";

function TrackChoice() {
  const choice = useTrackChoice();
  const options = [
    { value: TRACK_RANDOM, label: "Random" },
    ...SOUNDTRACK_TRACKS.map((track) => ({
      value: track.src,
      label: track.title,
    })),
  ];

  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-sky-200/55">
        Soundtrack
      </p>
      {/* Random is a value in the same group rather than a checkbox beside
          it: two controls could be left saying different things, and there
          is no sensible reading of "random, and also this one". */}
      <div
        role="radiogroup"
        aria-label="Soundtrack"
        className="mt-2 flex flex-wrap gap-1.5"
      >
        {options.map((option) => {
          const on = choice === option.value;
          return (
            <label key={option.value} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
              <input
                type="radio"
                name="autopilot-track"
                value={option.value}
                checked={on}
                onChange={() => setTrackChoice(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function AutopilotPrompt({
  open,
  canFullscreen,
  offerAutoplayToggle,
  onLaunch,
  onDismiss,
}: {
  open: boolean;
  canFullscreen: boolean;
  offerAutoplayToggle: boolean;
  onLaunch: (useFullscreen: boolean) => void;
  onDismiss: () => void;
}) {
  const skipIntro = useSkipIntro();
  const autoplayEnabled = useAutoplayEnabled();
  const launchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    launchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onDismiss]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="autopilot-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onDismiss}
          className="pointer-events-auto fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 px-6"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="autopilot-prompt-title"
            aria-describedby="autopilot-prompt-copy"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={TRAY_SPRING}
            className={`w-[min(92vw,430px)] rounded-3xl px-6 pb-6 pt-7 text-center ${METAL_SURFACE}`}
          >
            <BrushedGrain />
            <Sheen delay={0.12} />
            <Rivets className="inset-x-4 top-2.5" />

            <p className="relative z-10 text-[10px] font-semibold uppercase tracking-[0.42em] text-sky-200/60">
              Autopilot
            </p>
            <h2
              id="autopilot-prompt-title"
              className="relative z-10 mt-3 text-xl font-semibold text-sky-50"
            >
              Hands off the controls
            </h2>
            <p
              id="autopilot-prompt-copy"
              className="relative z-10 mx-auto mt-2 max-w-[36ch] text-xs leading-5 text-slate-300/80"
            >
              The tour flies the whole route on its own, in time with the
              music. Scroll at any point and you have the controls back.
              {canFullscreen
                ? " Full screen hands it the whole display; staying in the window leaves your tabs and toolbar where they are."
                : ""}
            </p>

            <div className="relative z-10 mt-5 flex flex-col gap-4 border-t border-white/10 pt-4 text-left">
              <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-5 text-slate-300/80">
                <input
                  type="checkbox"
                  checked={skipIntro}
                  onChange={(event) => setSkipIntro(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-sky-300"
                />
                <span>
                  Skip the narrated intro
                  <span className="block text-[10px] text-slate-400/70">
                    Leaves on the music instead of waiting for the voice.
                  </span>
                </span>
              </label>

              <TrackChoice />

              {/* Only for someone who has been here a few times *and* has
                  actually flown the tour. A first-time visitor has no
                  opinion to express yet, and offering to switch off a thing
                  they have not seen is noise. */}
              {offerAutoplayToggle && (
                <label className="flex cursor-pointer items-center gap-2.5 border-t border-white/10 pt-4 text-[11px] text-slate-300/80">
                  <input
                    type="checkbox"
                    checked={autoplayEnabled}
                    onChange={(event) => setAutoplayEnabled(event.target.checked)}
                    className="h-3.5 w-3.5 accent-sky-300"
                  />
                  Offer the tour on future visits
                </label>
              )}
            </div>

            <div className="relative z-10 mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-center">
              <button
                ref={launchRef}
                type="button"
                onClick={() => onLaunch(canFullscreen)}
                className="min-h-11 rounded-full border border-sky-200/35 bg-sky-200/15 px-5 text-xs font-semibold uppercase tracking-[0.22em] text-sky-50 transition-colors hover:bg-sky-200/25"
              >
                {canFullscreen ? "Full screen" : "Fly the tour"}
              </button>
              {/* Where fullscreen is unavailable this would be the same
                  action as the button above it, so it goes away rather than
                  asking the same question twice. */}
              {canFullscreen && (
                <button
                  type="button"
                  onClick={() => onLaunch(false)}
                  className="min-h-11 rounded-full border border-white/15 px-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300 transition-colors hover:border-white/25 hover:text-sky-100"
                >
                  Stay in this window
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
