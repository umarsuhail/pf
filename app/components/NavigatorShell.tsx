"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  markNavigatorHinted,
  setNavigatorPinned,
  useNavigatorHinted,
  useNavigatorPinned,
} from "../lib/navigator-ui";

// The room an instrument is allowed to take.
//
// All three navigators used to sit at full size in the right-hand margin for
// the whole flight, which is a lot of chrome over a thing whose only job is
// to say where you are. They sit small now and grow under the hand: near
// enough to read at a glance, out of the way the rest of the time.
//
// Growing is a transform, not a layout change — the instruments inside do
// their own pointer maths against their bounding boxes, and a transform
// keeps those boxes honest while costing nothing per frame.

const COMPACT = 0.46;
const EXPANDED = 1;

// The drum measures its drag in pixels of travel, so it has to know how much
// a screen pixel is worth. Angles and ratios (the bezel, the lemniscate) are
// scale-free and ignore this.
const ScaleContext = createContext(COMPACT);
export const useNavigatorScale = () => useContext(ScaleContext);

const HINT_AFTER_SCROLL_MS = 2200;
const HINT_VISIBLE_MS = 5200;

export default function NavigatorShell({
  label,
  placement = "margin",
  grow = true,
  children,
}: {
  label: string;
  /**
   * False keeps the instrument at full size for its whole life.
   *
   * The drum is the one that cannot usefully shrink: the bezel and the
   * lemniscate still say where you are at half size, because both are
   * drawings, but the drum is five words of type and shrinking it makes
   * them unreadable — a navigator you cannot read is not a small navigator,
   * it is a decoration. With no small state there is nothing to pin open,
   * so the tab and its hint go too.
   */
  grow?: boolean;
  /**
   * "margin" puts the instrument in the right-hand margin itself, which is
   * where the lemniscate and the drum live. "inline" positions nothing: the
   * bezel brings its own container — it moves to the bottom of the screen on
   * a phone — and only wants the shrinking, the pin and the hint.
   */
  placement?: "margin" | "inline";
  children: ReactNode;
}) {
  const pinned = useNavigatorPinned();
  const hinted = useNavigatorHinted();
  const [near, setNear] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const hintTimers = useRef<number[]>([]);

  const open = !grow || pinned || near;
  const scale = open ? EXPANDED : COMPACT;

  // Unprompted once, shortly after the traveller first moves: a control that
  // only reveals itself on hover is invisible to anyone who never hovers it,
  // and this one has shrunk away from where it used to be.
  useEffect(() => {
    if (hinted || !grow) return;
    const onFirstScroll = () => {
      window.removeEventListener("scroll", onFirstScroll);
      hintTimers.current.push(
        window.setTimeout(() => {
          setHintShown(true);
          hintTimers.current.push(
            window.setTimeout(() => setHintShown(false), HINT_VISIBLE_MS),
          );
        }, HINT_AFTER_SCROLL_MS),
      );
    };
    window.addEventListener("scroll", onFirstScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onFirstScroll);
      hintTimers.current.forEach(window.clearTimeout);
      hintTimers.current = [];
    };
  }, [hinted, grow]);

  const showHint = grow && !hinted && (hintShown || near);

  return (
    <div
      className={
        placement === "margin"
          ? "pointer-events-none fixed right-2 top-1/2 z-50 -translate-y-1/2 lg:right-4"
          : "pointer-events-none"
      }
      onPointerEnter={() => setNear(true)}
      onPointerLeave={() => setNear(false)}
      onFocusCapture={() => setNear(true)}
      onBlurCapture={() => setNear(false)}
    >
      <div className="pointer-events-auto flex items-center justify-end gap-1">
        <AnimatePresence>
          {showHint && (
            <motion.span
              key="hint"
              role="tooltip"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="whitespace-nowrap rounded-full border border-white/15 bg-slate-950/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/90 shadow-[0_10px_30px_rgba(2,8,23,0.6)]"
            >
              Pin it open
            </motion.span>
          )}
        </AnimatePresence>

        {/* The pin is its own control because every instrument inside is a
            drag surface: a click that pinned would be a click that also
            turned the bezel it landed on. */}
        {grow && (
        <button
          type="button"
          aria-label={pinned ? `Shrink the ${label}` : `Keep the ${label} open`}
          aria-pressed={pinned}
          onClick={() => {
            setNavigatorPinned(!pinned);
            markNavigatorHinted();
            setHintShown(false);
          }}
          className="flex h-7 w-4 items-center justify-center rounded-l-md border border-r-0 border-white/15 bg-slate-950/70 text-sky-200/70 transition-colors hover:bg-slate-900/90 hover:text-sky-100"
        >
          <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden="true">
            <path
              d="M6 1 L2 5 L6 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transformOrigin: "50% 50%",
                transform: pinned ? "rotate(180deg)" : "none",
                transition: "transform 240ms ease-out",
              }}
            />
          </svg>
        </button>
        )}

        <ScaleContext.Provider value={scale}>
          <div
            // Anchored to the right edge so growing moves it inward, never
            // off screen, and never past the edge a phone reserves for its
            // own back gesture.
            style={
              grow
                ? {
                    transform: `scale(${scale})`,
                    transformOrigin: "right center",
                    transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }
                : undefined
            }
          >
            {children}
          </div>
        </ScaleContext.Provider>
      </div>
    </div>
  );
}
