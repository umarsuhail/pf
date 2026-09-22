"use client";

import { useEffect, useRef, useState } from "react";

// The site is a flight down a corridor of billboards, so the wait before it
// is spent flying that same corridor — not a spinner parked against nothing.
// Each gate stands for one thing that genuinely has to finish loading and is
// passed the moment that job resolves, so the travel *is* the progress rather
// than a timer dressed up as one. The last gate reaches the camera exactly as
// the overlay flies through it into the page.

const EXIT_DURATION_MS = 700;

// Real milestones, in the order a page reaches them.
const GATES = [
  { id: "cabin", label: "Cabin systems", note: "Markup parsed" },
  { id: "instruments", label: "Instruments", note: "Typefaces set" },
  { id: "starchart", label: "Star chart", note: "Assets aboard" },
] as const;

// Corridor geometry, in the same px space as the CSS perspective below.
const GATE_SPACING = 520;
// Dead-centred gates stack up as concentric rectangles — nested frames, not a
// corridor. The flight itself hangs its billboards alternately left and right
// and turns them to face the camera, so the gates do the same: the corridor
// then reads as somewhere with sides.
const GATE_STAGGER = 120;
const GATE_TURN = 9;
// A gate fades up out of the dark on approach and dissolves before it gets
// close enough for perspective to blow it up past the camera plane.
const FADE_IN_START = -GATE_SPACING * 2.3;
const FADE_IN_END = -GATE_SPACING * 1.25;
const FADE_OUT_START = 110;
const FADE_OUT_END = 320;
const HIDE_AT = 360;

// The meter never jumps. It closes the gap to the next milestone
// proportionally, so it eases to a stop at each gate rather than snapping,
// and is capped at a top speed — without the cap a warm load resolves every
// milestone at once and the corridor is over before any of it can be read.
const FILL_MS = 1400;
const MAX_SPEED = 100 / FILL_MS;
// A page that loads instantly would otherwise flash the corridor for a frame.
const MIN_VISIBLE_MS = 1500;
// Nothing here may strand the visitor behind the overlay: if a milestone
// never resolves (a font that fails to decode, a hung asset), the flight is
// cleared anyway.
const MAX_WAIT_MS = 6000;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Angles are irregular on purpose — evenly spaced streaks read as a wheel.
const STREAKS = [4, 27, 51, 68, 96, 118, 143, 167, 191, 214, 238, 263, 287, 316, 338];

export default function PageLoader() {
  const gateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const percentRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  // Only the stage name goes through React: it changes three times in the
  // loader's whole life, while the meter and the corridor change every frame
  // and are written straight to the DOM instead (the same reason the cockpit
  // dial doesn't re-render on scroll). It tracks the gate the camera is
  // actually flying toward, not how many milestones have resolved — on a warm
  // load all three land at once while the corridor is still being travelled,
  // and naming the last one then would caption a journey already claimed
  // finished.
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const startedAt = performance.now();
    let reached = 0;
    let shown = 0;
    let last = startedAt;
    let raf = 0;
    let cancelled = false;

    let namedStage = -1;

    const pass = () => {
      if (cancelled) return;
      reached = Math.min(GATES.length, reached + 1);
    };

    const paint = (p: number) => {
      const travel = (p / 100) * GATES.length * GATE_SPACING;

      gateRefs.current.forEach((gate, i) => {
        if (!gate) return;
        const z = travel - (i + 1) * GATE_SPACING;
        if (z >= HIDE_AT) {
          gate.style.visibility = "hidden";
          return;
        }
        const appearing = clamp01((z - FADE_IN_START) / (FADE_IN_END - FADE_IN_START));
        const leaving = 1 - clamp01((z - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START));
        const side = i % 2 === 0 ? -1 : 1;
        gate.style.visibility = "visible";
        gate.style.transform = `translate3d(calc(-50% + ${side * GATE_STAGGER}px), -50%, ${z}px) rotateY(${-side * GATE_TURN}deg)`;
        gate.style.opacity = String(Math.min(appearing, leaving));
      });

      // The gate being flown toward: one per equal share of the corridor,
      // past the last of them once the meter is home.
      const atStage = Math.min(GATES.length, Math.floor(p / (100 / GATES.length)));
      if (atStage !== namedStage) {
        namedStage = atStage;
        setStage(atStage);
      }

      if (percentRef.current) percentRef.current.textContent = String(Math.round(p));
      if (railRef.current) railRef.current.style.width = `${p}%`;
      // The destination itself: a light that opens up as it is approached.
      if (coreRef.current) {
        coreRef.current.style.transform = `translate(-50%, -50%) scale(${0.55 + (p / 100) * 0.85})`;
        coreRef.current.style.opacity = String(0.2 + (p / 100) * 0.45);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;

      const target = (reached / GATES.length) * 100;
      const step = Math.min(MAX_SPEED, (target - shown) * 0.008) * dt;
      shown = Math.min(target, shown + step);
      paint(shown);

      if (
        reached === GATES.length &&
        shown >= 99.9 &&
        now - startedAt >= MIN_VISIBLE_MS
      ) {
        setReady(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    // Gate 1 — the document itself is parsed.
    const onDomReady = () => pass();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
    } else {
      pass();
    }

    // Gate 2 — the six local faces this site sets its type in have landed.
    // Worth waiting on: they are what the first frame would otherwise reflow.
    if (document.fonts) {
      document.fonts.ready.then(pass, pass);
    } else {
      pass();
    }

    // Gate 3 — every subresource the page asked for is aboard.
    const onLoad = () => pass();
    if (document.readyState === "complete") {
      pass();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    const failsafe = window.setTimeout(() => {
      if (cancelled) return;
      reached = GATES.length;
    }, MAX_WAIT_MS);

    paint(0);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      document.removeEventListener("DOMContentLoaded", onDomReady);
      window.removeEventListener("load", onLoad);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.body.style.overflow = "";
    const timeout = window.setTimeout(() => setHidden(true), EXIT_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [ready]);

  if (hidden) return null;

  const stageLabel = GATES[stage]?.label ?? "Cleared for departure";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      className={`fixed inset-0 z-100 overflow-hidden bg-background transition-[opacity,transform] ease-out ${
        ready
          ? "pointer-events-none scale-110 opacity-0  duration-700"
          : "scale-100 opacity-100  duration-500"
      }`}
    >
      {/* The corridor. Same perspective the flight itself is staged in, so
         the overlay's exit reads as flying on rather than cutting away. */}
      <div
        aria-hidden="true"
        className="loader-corridor absolute inset-0 [perspective:700px] [transform-style:preserve-3d]"
      >
        {GATES.map((gate, i) => (
          <div
            key={gate.id}
            ref={(el) => {
              gateRefs.current[i] = el;
            }}
            className="absolute left-1/2 top-1/2 h-[min(46vh,320px)] w-[min(72vw,460px)] rounded-3xl border border-sky-200/35"
            style={{
              // Painted by the rAF loop above; these are the pre-first-frame
              // values so nothing flashes at its final size.
              transform: `translate3d(calc(-50% + ${(i % 2 === 0 ? -1 : 1) * GATE_STAGGER}px), -50%, ${-(i + 1) * GATE_SPACING}px)`,
              opacity: 0,
              background:
                "linear-gradient(160deg, rgba(125,211,252,0.07) 0%, rgba(2,6,23,0) 62%)",
              boxShadow:
                "inset 0 0 46px rgba(56,189,248,0.12), 0 0 34px rgba(56,189,248,0.10)",
            }}
          >
            <span className="absolute inset-3 rounded-2xl border border-white/8" />
            {/* Both lines sit in the gate's own top-left corner. Split across
               opposite corners, a distant gate's second line drifted under the
               HUD's stage name — two different captions stacked in the middle
               of the screen. */}
            <span className="absolute left-5 top-4 flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80">
                {String(i + 1).padStart(2, "0")} · {gate.label}
              </span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-sky-100/45">
                {gate.note}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Speed streaks, thrown outward from the vanishing point. Pure CSS
         (transform and opacity only), so they cost the compositor nothing
         while the page is busy loading underneath. */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {STREAKS.map((angle, i) => (
          <span
            key={angle}
            className="loader-streak"
            style={
              {
                "--angle": `${angle}deg`,
                "--delay": `${(i % 5) * 0.34 + (i % 3) * 0.11}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        ref={coreRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42vmin] w-[42vmin] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.30)_0%,rgba(14,165,233,0.10)_42%,transparent_70%)]"
        style={{ transform: "translate(-50%, -50%) scale(0.55)", opacity: 0.2 }}
      />

      {/* The readout sits in the middle of the corridor, gates passing behind
         it — a HUD on the windscreen rather than a caption. z-10 is what
         keeps it there: the gates are 3D-transformed siblings, and a gate
         swelling as it reaches the camera would otherwise wash across the
         numbers just as they matter most. */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.5em] text-sky-200/55">
          Pre-flight
        </span>

        <div className="mt-3 flex items-baseline gap-1" aria-hidden="true">
          <span
            ref={percentRef}
            className="text-6xl font-semibold leading-none tabular-nums text-sky-50 drop-shadow-[0_6px_28px_rgba(2,8,23,0.85)] sm:text-7xl"
          >
            0
          </span>
          <span className="text-xl font-semibold text-sky-200/70">%</span>
        </div>

        <span
          aria-hidden="true"
          className="mt-5 block h-px w-[min(60vw,260px)] overflow-hidden bg-white/12"
        >
          <span
            ref={railRef}
            className="block h-full w-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.35),#7dd3fc)] shadow-[0_0_12px_rgba(125,211,252,0.85)]"
          />
        </span>

        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.36em] text-sky-100/75">
          {stageLabel}
        </p>
      </div>

      <p className="absolute inset-x-0 bottom-10 px-6 text-center text-xs font-semibold uppercase tracking-[0.32em] text-sky-100/60">
        Loading his world. thanks for visiting.
      </p>
    </div>
  );
}
