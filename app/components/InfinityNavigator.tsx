"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAIN_FLIGHT_STOPS } from "../data/flightStops";
import { progressFromScroll } from "../data/flightTimeline";
import { playTick, primeTicks } from "../lib/tick-sound";
import DialPlayButton from "./DialPlayButton";
import NavigatorShell from "./NavigatorShell";

// The flight's route, drawn as the path it actually is.
//
// Where the bezel shows you a position, this shows you the whole journey:
// every panel is a marked spot on one continuous track, and the handle rides
// it. Dragging the handle travels, exactly as turning the bezel does — both
// instruments write the same `navigate-flight-progress` event, so nothing
// below them knows which one is on screen.
//
// The curve is a Gerono lemniscate, x = a·cos t, y = b·sin t·cos t, chosen
// over the more familiar Bernoulli form because it is trivially
// parameterised: t sweeps 0..2π once around the whole figure, so flight
// progress maps straight onto t with no arc-length integral in between. The
// crossing sits at the origin, which is where the transport button goes —
// the one point on the path the traveller passes twice.

const VIEW = { w: 240, h: 132 };
const CENTRE = { x: VIEW.w / 2, y: VIEW.h / 2 };
const LOBE = { a: 96, b: 92 };
const TAU = Math.PI * 2;

function pointAt(progress: number) {
  const t = progress * TAU;
  return {
    x: CENTRE.x + LOBE.a * Math.cos(t),
    y: CENTRE.y + LOBE.b * Math.sin(t) * Math.cos(t),
  };
}

// The track, as one closed path. Sampled rather than expressed in béziers:
// 160 segments is well past the point where the seams show at this size, and
// it keeps the curve and the handle reading from one function.
const TRACK_D = (() => {
  const steps = 160;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const p = pointAt(i / steps);
    d += `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return `${d}Z`;
})();

// Pre-sampled for hit-testing. Finding the nearest point on a lemniscate
// analytically means solving a quartic; sampling and refining is both
// shorter and more robust, and 360 samples is a third of a degree of travel.
const SAMPLES = Array.from({ length: 360 }, (_, i) => {
  const progress = i / 360;
  return { progress, ...pointAt(progress) };
});

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function readProgress() {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return clamp01(progressFromScroll(window.scrollY / max));
}

function travelTo(progress: number) {
  window.dispatchEvent(
    new CustomEvent("navigate-flight-progress", {
      detail: { progress: clamp01(progress), source: "dial" },
    }),
  );
}

function announceTurning(turning: boolean) {
  window.dispatchEvent(
    new CustomEvent("flight-dial-turn", { detail: { turning } }),
  );
}

const DETENTS = 36;
// The transport sits at the crossing, scaled down from the face DialPlayButton
// draws itself at. Its own origin is (60, 60), so the translate has to account
// for the scale — translate runs first, so the origin lands at tx + 60 * s.
const PLAY_SCALE = 0.62;
const AUTOPILOT_SEEK_STEPS = 6;

export default function InfinityNavigator() {
  const pathname = usePathname();
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const progressRef = useRef(0);
  const lastDetentRef = useRef(0);
  const autopilotRef = useRef(false);
  const seekAccumRef = useRef(0);

  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onState = (event: Event) => {
      autopilotRef.current = Boolean(
        (event as CustomEvent<{ running?: boolean }>).detail?.running,
      );
    };
    window.addEventListener("flight-autopilot-state", onState as EventListener);
    return () =>
      window.removeEventListener(
        "flight-autopilot-state",
        onState as EventListener,
      );
  }, []);

  // Follows the document while no hand is on it. During a drag the handle is
  // the source of truth, or the scroll it just caused would fight it back.
  useEffect(() => {
    const sync = () => {
      if (draggingRef.current) return;
      const next = readProgress();
      progressRef.current = next;
      setProgress(next);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // Nearest point on the curve, biased toward where the handle already is.
  //
  // The figure-8 crosses itself, so near the centre two points on opposite
  // lobes are equally close to the pointer. Picking the global minimum there
  // teleports the handle to the other lobe mid-drag. Weighting by distance in
  // *progress* as well as in space keeps the handle on the lobe it is on.
  const progressFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return progressRef.current;
      const x = ((clientX - rect.left) / rect.width) * VIEW.w;
      const y = ((clientY - rect.top) / rect.height) * VIEW.h;
      const current = progressRef.current;

      let best = current;
      let bestCost = Infinity;
      for (const sample of SAMPLES) {
        const dx = sample.x - x;
        const dy = sample.y - y;
        const spatial = dx * dx + dy * dy;
        // Shortest way round, since the track is a loop.
        let gap = Math.abs(sample.progress - current);
        if (gap > 0.5) gap = 1 - gap;
        const cost = spatial + gap * gap * 9000;
        if (cost < bestCost) {
          bestCost = cost;
          best = sample.progress;
        }
      }
      return best;
    },
    [],
  );

  const commit = useCallback((next: number) => {
    const clamped = clamp01(next);
    progressRef.current = clamped;
    setProgress(clamped);

    const detent = Math.round(clamped * DETENTS);
    if (detent !== lastDetentRef.current) {
      lastDetentRef.current = detent;
      playTick(1, 0.2);
    }

    // Mid-tour the track is a transport, not a scrubber — same contract the
    // bezel keeps, so the autopilot only ever hears one kind of instruction.
    if (autopilotRef.current) {
      seekAccumRef.current += 1;
      if (seekAccumRef.current >= AUTOPILOT_SEEK_STEPS) {
        seekAccumRef.current = 0;
        window.dispatchEvent(
          new CustomEvent("flight-autopilot-seek", { detail: { delta: 1 } }),
        );
      }
      return;
    }
    travelTo(clamped);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    primeTicks();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    seekAccumRef.current = 0;
    setDragging(true);
    announceTurning(true);
    commit(progressFromPointer(e.clientX, e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    commit(progressFromPointer(e.clientX, e.clientY));
  };

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    announceTurning(false);
  }, []);

  const handle = pointAt(progress);
  const activeId = MAIN_FLIGHT_STOPS.reduce(
    (closest, stop) =>
      Math.abs(stop.progress - progress) <
      Math.abs(closest.progress - progress)
        ? stop
        : closest,
    MAIN_FLIGHT_STOPS[0],
  ).id;

  if (pathname !== "/") return null;

  return (
    <NavigatorShell label="route track">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        role="slider"
        tabIndex={0}
        aria-label="Flight route"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${activeId}, ${Math.round(progress * 100)}% through the flight`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          const step =
            e.key === "ArrowRight" || e.key === "ArrowUp"
              ? 1 / DETENTS
              : e.key === "ArrowLeft" || e.key === "ArrowDown"
                ? -1 / DETENTS
                : 0;
          if (!step) return;
          e.preventDefault();
          commit(progressRef.current + step);
        }}
        className="pointer-events-auto h-33 w-60 cursor-pointer touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-(--flight-accent)"
      >
        {/* The track, twice: a wide soft pass for the groove and a hairline
            over it, which is cheaper than a filter and reads as engraved. */}
        <path
          d={TRACK_D}
          fill="none"
          stroke="var(--flight-surface)"
          strokeWidth={13}
          strokeLinecap="round"
        />
        <path
          d={TRACK_D}
          fill="none"
          stroke="var(--flight-line)"
          strokeWidth={1.4}
        />

        {MAIN_FLIGHT_STOPS.map((stop) => {
          const p = pointAt(stop.progress);
          const isActive = stop.id === activeId;
          return (
            <g key={stop.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? 5 : 3.4}
                fill={isActive ? "var(--flight-accent)" : "var(--flight-muted)"}
                style={{ transition: "r 200ms ease-out, fill 200ms ease-out" }}
              />
              {isActive && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={9}
                  fill="none"
                  stroke="var(--flight-accent)"
                  strokeWidth={1}
                  opacity={0.5}
                />
              )}
            </g>
          );
        })}

        {/* The handle. No transition while dragging — it has to sit under the
            finger, not ease toward it. */}
        <circle
          cx={handle.x}
          cy={handle.y}
          r={dragging ? 7.5 : 6.5}
          fill="var(--flight-ink)"
          stroke="var(--flight-accent)"
          strokeWidth={2}
          style={{
            transition: dragging ? "none" : "cx 120ms linear, cy 120ms linear",
          }}
        />

        {/* The crossing is the one point the route passes twice, which makes
            it the natural seat for the transport. DialPlayButton draws itself
            around (60, 60), so this moves that origin onto the centre. */}
        <g
          transform={`translate(${CENTRE.x - 60 * PLAY_SCALE} ${CENTRE.y - 60 * PLAY_SCALE}) scale(${PLAY_SCALE})`}
        >
          <DialPlayButton compact />
        </g>
      </svg>
    </NavigatorShell>
  );
}
