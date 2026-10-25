"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FLIGHT_SECTION_STOPS } from "../data/flightStops";
import { progressFromScroll } from "../data/flightTimeline";
import { playTick, primeTicks } from "../lib/tick-sound";
import DialPlayButton from "./DialPlayButton";
import NavigatorShell from "./NavigatorShell";

function scrollToProgress(p: number) {
  window.dispatchEvent(
    new CustomEvent("navigate-flight-progress", {
      detail: { progress: Math.min(1, Math.max(0, p)), source: "dial" },
    }),
  );
}

function announceTurning(turning: boolean) {
  window.dispatchEvent(
    new CustomEvent("flight-dial-turn", { detail: { turning } }),
  );
}

const TURN = 360;

const DETENTS = 36;
const DETENT_DEGREES = TURN / DETENTS;

const DEGREES_PER_SECTION = 360;
const MIN_TRAVEL = 0.0004;

// How far the ring turns to skip one autopilot leg. A sixth of a revolution:
// deliberate enough that a nudge does not throw the tour forward, loose
// enough that a full turn covers the flight.
const AUTOPILOT_SEEK_DEGREES = 60;

const BEZEL_RETURN_TRANSITION = "transform 380ms cubic-bezier(0.2,0.8,0.2,1)";

const stops = FLIGHT_SECTION_STOPS;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function getActiveId(p: number) {
  let id = stops[0]?.id ?? "home";
  for (const stop of stops) if (p >= stop.progress) id = stop.id;
  return id;
}

function nearestStopIndex(p: number) {
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;
  stops.forEach((stop, index) => {
    const candidate = Math.abs(stop.progress - p);
    if (candidate < distance) {
      nearest = index;
      distance = candidate;
    }
  });
  return nearest;
}

function turnFromProgress(p: number) {
  const last = stops.length - 1;
  for (let i = 0; i < last; i++) {
    const from = stops[i].progress;
    const to = stops[i + 1].progress;
    if (p < to || i === last - 1) {
      return i + (p - from) / Math.max(to - from, 1e-6);
    }
  }
  return 0;
}

function progressFromTurn(turn: number) {
  const last = stops.length - 1;
  const clamped = Math.min(last, Math.max(0, turn));
  const index = Math.min(last - 1, Math.floor(clamped));
  const from = stops[index].progress;
  const to = stops[index + 1].progress;
  return clamp01(from + (to - from) * (clamped - index));
}

function readProgress() {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return clamp01(progressFromScroll(window.scrollY / max));
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildKnurls(count: number) {
  const everyDeg = 360 / count;
  const majorEvery = count / 12;
  return Array.from({ length: count }, (_, i) => {
    const deg = i * everyDeg;
    const major = i % majorEvery === 0;
    const inner = polar(60, 60, major ? 50.5 : 52.5, deg);
    const outer = polar(60, 60, 57.5, deg);
    return { deg, major, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  });
}

const KNURLS_FULL = buildKnurls(72);
const KNURLS_COMPACT = buildKnurls(24);

const COMPACT_QUERY = "(max-width: 1023px)";
const MIN_DIAL_SCALE = 1;
const COMPACT_MAX_DIAL_SCALE = 2.25;
const DESKTOP_MAX_DIAL_SCALE = 1.7;

export default function ScrollDial() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches,
  );
  const [activeId, setActiveId] = useState(() => getActiveId(readProgress()));
  const [dragging, setDragging] = useState(false);
  const [pinching, setPinching] = useState(false);
  const [dialScale, setDialScale] = useState(1);
  const [isVisible, setIsVisible] = useState(true);

  const progressRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const turnStartRef = useRef(0);
  const gestureRotationRef = useRef(0);
  const bezelAngleRef = useRef(0);
  const lastDetentRef = useRef(0);
  // While the tour is flying, the ring seeks through it instead of scrubbing
  // the document — the autopilot owns the scroll position for its duration,
  // so two hands on it would fight every frame.
  const autopilotRef = useRef(false);
  const seekAccumRef = useRef(0);
  const isTouchDragRef = useRef(false);
  const pointersRef = useRef(
    new Map<number, { x: number; y: number; type: string }>(),
  );
  const pinchingRef = useRef(false);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const dialScaleRef = useRef(1);

  const rootRef = useRef<SVGSVGElement>(null);
  const bezelRef = useRef<SVGGElement>(null);

  const maxDialScale = compact
    ? COMPACT_MAX_DIAL_SCALE
    : DESKTOP_MAX_DIAL_SCALE;

  const applyScaleVisual = useCallback((scale: number) => {
    dialScaleRef.current = scale;
    if (rootRef.current) {
      rootRef.current.style.transform = `scale(${scale})`;
    }
  }, []);

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

  const commitScale = useCallback(
    (scale: number) => {
      const next = Math.min(maxDialScale, Math.max(MIN_DIAL_SCALE, scale));
      applyScaleVisual(next);
      setDialScale(next);
    },
    [applyScaleVisual, maxDialScale],
  );

  const applyBezelRotation = useCallback((degrees: number) => {
    if (bezelRef.current) {
      bezelRef.current.style.transform = `rotate(${degrees}deg)`;
    }
  }, []);

  const applyVisual = useCallback((p: number) => {
    progressRef.current = p;
    rootRef.current?.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  }, []);

  useEffect(() => {
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ visible?: boolean }>).detail;
      setIsVisible((prev) => detail?.visible ?? !prev);
    };
    window.addEventListener("toggle-route-map", onToggle as EventListener);
    return () =>
      window.removeEventListener("toggle-route-map", onToggle as EventListener);
  }, []);

  useEffect(() => {
    const onProgress = (event: Event) => {
      if (draggingRef.current) return;
      const detail = (
        event as CustomEvent<{ progress?: number; activeId?: string }>
      ).detail;
      if (typeof detail?.progress === "number") {
        const progress = clamp01(detail.progress);
        applyVisual(progress);
        setActiveId(getActiveId(progress));
      }
    };
    window.addEventListener("flight-progress-update", onProgress as EventListener);
    return () =>
      window.removeEventListener("flight-progress-update", onProgress as EventListener);
  }, [applyVisual]);

  useEffect(() => {
    primeTicks();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyVisual(readProgress());
    const frame = requestAnimationFrame(() => {
      const progress = readProgress();
      applyVisual(progress);
      setActiveId(getActiveId(progress));
    });
    return () => cancelAnimationFrame(frame);
  }, [applyVisual]);

  useEffect(() => {
    commitScale(dialScaleRef.current);
  }, [commitScale]);

  const detentFeedback = useCallback((index: number) => {
    lastDetentRef.current = index;
    playTick(1.35, 0.22);
    if (!isTouchDragRef.current) return;
    try {
      navigator.vibrate?.(6);
    } catch {
    }
  }, []);

  const commit = useCallback(
    (p: number) => {
      const clamped = clamp01(p);
      applyVisual(clamped);
      setActiveId(getActiveId(clamped));
      scrollToProgress(clamped);
    },
    [applyVisual],
  );

  const pointerAngle = (clientX: number, clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    return Math.atan2(dx, -dy) * (180 / Math.PI);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });

    const touchPoints = [...pointersRef.current.values()].filter(
      (pointer) => pointer.type === "touch",
    );
    if (touchPoints.length >= 2) {
      const [a, b] = touchPoints;
      pinchingRef.current = true;
      setPinching(true);
      draggingRef.current = false;
      setDragging(false);
      gestureRotationRef.current = 0;
      pinchStartDistanceRef.current = Math.hypot(b.x - a.x, b.y - a.y);
      pinchStartScaleRef.current = dialScaleRef.current;
      return;
    }

    draggingRef.current = true;
    setDragging(true);
    announceTurning(true);
    seekAccumRef.current = 0;
    if (bezelRef.current) bezelRef.current.style.transition = "none";
    lastAngleRef.current = pointerAngle(e.clientX, e.clientY);
    turnStartRef.current = turnFromProgress(progressRef.current);
    gestureRotationRef.current = 0;
    lastDetentRef.current = Math.round(bezelAngleRef.current / DETENT_DEGREES);
    isTouchDragRef.current = e.pointerType === "touch";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointersRef.current.get(e.pointerId);
    if (pointer) {
      pointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: pointer.type,
      });
    }

    if (pinchingRef.current) {
      const touchPoints = [...pointersRef.current.values()].filter(
        (item) => item.type === "touch",
      );
      if (touchPoints.length < 2) return;
      const [a, b] = touchPoints;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const startDistance = Math.max(1, pinchStartDistanceRef.current);
      const next = Math.min(
        maxDialScale,
        Math.max(
          MIN_DIAL_SCALE,
          pinchStartScaleRef.current * (distance / startDistance),
        ),
      );
      applyScaleVisual(next);
      return;
    }

    if (!draggingRef.current) return;
    if (e.pointerType === "mouse" && e.buttons === 0) {
      endDrag();
      return;
    }
    const angle = pointerAngle(e.clientX, e.clientY);

    let delta = angle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    lastAngleRef.current = angle;

    gestureRotationRef.current += delta;
    bezelAngleRef.current += delta;
    applyBezelRotation(bezelAngleRef.current);

    const detent = Math.round(bezelAngleRef.current / DETENT_DEGREES);
    if (detent !== lastDetentRef.current) detentFeedback(detent);

    // Mid-tour the ring is a transport, not a scrubber: every
    // AUTOPILOT_SEEK_DEGREES of turn skips a leg and the tour flies on from
    // there. The bezel still rotates and still clicks, so the gesture feels
    // the same; only what it means changes.
    if (autopilotRef.current) {
      seekAccumRef.current += delta;
      while (Math.abs(seekAccumRef.current) >= AUTOPILOT_SEEK_DEGREES) {
        const direction = seekAccumRef.current > 0 ? 1 : -1;
        seekAccumRef.current -= direction * AUTOPILOT_SEEK_DEGREES;
        window.dispatchEvent(
          new CustomEvent("flight-autopilot-seek", {
            detail: { delta: direction },
          }),
        );
      }
      return;
    }

    const travelled =
      turnStartRef.current + gestureRotationRef.current / DEGREES_PER_SECTION;
    const next = progressFromTurn(travelled);
    if (Math.abs(next - progressRef.current) < MIN_TRAVEL) return;
    commit(next);
  };

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    announceTurning(false);
    gestureRotationRef.current = 0;
    if (bezelRef.current) {
      bezelRef.current.style.transition = BEZEL_RETURN_TRANSITION;
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const release = () => endDrag();
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [dragging, endDrag]);

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (pinchingRef.current) {
      if (pointersRef.current.size < 2) {
        pinchingRef.current = false;
        setPinching(false);
        commitScale(dialScaleRef.current);
      }
      return;
    }
    endDrag();
  };

  const toSection = (direction: 1 | -1) => {
    const currentIndex = nearestStopIndex(progressRef.current);
    const targetIndex = Math.min(
      stops.length - 1,
      Math.max(0, currentIndex + direction),
    );
    const target = stops[targetIndex];
    if (!target) return;
    const turned =
      turnFromProgress(target.progress) - turnFromProgress(progressRef.current);
    if (bezelRef.current) {
      bezelRef.current.style.transition = BEZEL_RETURN_TRANSITION;
    }
    bezelAngleRef.current += turned * DEGREES_PER_SECTION;
    applyBezelRotation(bezelAngleRef.current);
    lastDetentRef.current = Math.round(bezelAngleRef.current / DETENT_DEGREES);
    commit(target.progress);
    playTick(direction > 0 ? 1.05 : 0.92, 0.28);
  };

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => toSection(1),
      ArrowUp: () => toSection(1),
      ArrowLeft: () => toSection(-1),
      ArrowDown: () => toSection(-1),
      PageDown: () => toSection(1),
      PageUp: () => toSection(-1),
      Home: () => commit(stops[0]?.progress ?? 0),
      End: () => commit(stops[stops.length - 1]?.progress ?? 1),
      "+": () => commitScale(dialScaleRef.current + 0.15),
      "=": () => commitScale(dialScaleRef.current + 0.15),
      "-": () => commitScale(dialScaleRef.current - 0.15),
      "0": () => commitScale(1),
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    commitScale(dialScaleRef.current - e.deltaY * 0.004);
  };

  const loopRingRef = useRef<SVGCircleElement>(null);
  const [loopReady, setLoopReady] = useState(false);
  useEffect(() => {
    const onLoopProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: number; ready?: boolean }>).detail;
      const value = Math.min(1, Math.max(0, detail?.value ?? 0));
      setLoopReady(Boolean(detail?.ready));
      loopRingRef.current?.setAttribute("stroke-dashoffset", String(100 * (1 - value)));
    };
    window.addEventListener("flight-loop-progress", onLoopProgress);
    return () => window.removeEventListener("flight-loop-progress", onLoopProgress);
  }, []);

  if (pathname !== "/") return null;

  const sectionLabel = stops.find((s) => s.id === activeId)?.label ?? stops[0]?.label ?? "";
  const activeLabel = loopReady ? "The end is the beginning" : sectionLabel;
  const activeIndex = stops.findIndex((s) => s.id === activeId);
  const pad = (n: number) => String(n).padStart(2, "0");
  const pageNumber = pad(Math.max(0, activeIndex) + 1);
  const pageTotal = pad(stops.length);
  const knurls = compact ? KNURLS_COMPACT : KNURLS_FULL;
  const glow = (css: string) => (compact ? undefined : css);
  const size = compact ? 68 : 108;

  return (
    <div
      aria-hidden={!isVisible}
      className={`fixed z-50 transition-all duration-300 ${
        compact
          ? "bottom-0 left-1/2 w-52 max-w-[calc(100vw-1rem)] -translate-x-1/2 pb-3"
          : "right-4 top-1/2 -translate-y-1/2 lg:right-8"
      } ${
        isVisible
          ? "opacity-100"
          : `pointer-events-none opacity-0 ${compact ? "translate-y-6" : "translate-x-6"}`
      }`}
      style={compact ? { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" } : undefined}
    >
      <div className={`mb-2 flex ${compact ? "justify-center" : "justify-end"}`}>
        <span
          role={loopReady ? "status" : undefined}
          className={`mission-dial-label whitespace-nowrap rounded-lg border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] transition-colors duration-500 ${
            loopReady ? "mission-dial-label-loop" : ""
          }`}
        >
          {activeLabel}
        </span>
      </div>
      <NavigatorShell label="rotary dial" placement="inline">
      <div
        className={
          compact
            ? "mx-auto -my-5 w-fit touch-none p-5"
            : "-m-5 flex justify-end touch-none p-5"
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={endDrag}
        onWheel={onWheel}
      >
        <svg
          ref={rootRef}
          role="slider"
          tabIndex={0}
          aria-label="Rotary flight control — turn and release to move one section, hold to continue, pinch to resize"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={`${activeLabel}, page ${pageNumber} of ${pageTotal}`}
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`mission-dial touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--flight-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--flight-surface-solid) ${
            dragging ? "cursor-grabbing" : pinching ? "cursor-zoom-in" : "cursor-grab"
          }`}
          style={{
            transform: `scale(${dialScale})`,
            transformOrigin: compact ? "bottom center" : "center right",
            transition: pinching
              ? "none"
              : "transform 220ms cubic-bezier(0.22,1,0.36,1)",
            willChange: pinching ? "transform" : undefined,
          }}
          onKeyDown={onKeyDown}
        >
        <defs>
          <linearGradient id="dial-steel" x1="12%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="var(--flight-dial-steel-1)" />
            <stop offset="18%" stopColor="var(--flight-dial-steel-2)" />
            <stop offset="34%" stopColor="var(--flight-dial-steel-3)" />
            <stop offset="52%" stopColor="var(--flight-dial-steel-4)" />
            <stop offset="70%" stopColor="var(--flight-dial-steel-5)" />
            <stop offset="86%" stopColor="var(--flight-dial-steel-6)" />
            <stop offset="100%" stopColor="var(--flight-dial-steel-7)" />
          </linearGradient>
          <linearGradient id="dial-face" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="var(--flight-dial-face-1)" />
            <stop offset="55%" stopColor="var(--flight-dial-face-2)" />
            <stop offset="100%" stopColor="var(--flight-dial-face-3)" />
          </linearGradient>
          <linearGradient id="dial-lume" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--flight-dial-mark-1)" />
            <stop offset="100%" stopColor="var(--flight-dial-mark-2)" />
          </linearGradient>
          <radialGradient id="dial-crystal" cx="32%" cy="24%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="60" cy="60" r="59" fill="var(--flight-dial-case)" />
        <circle
          cx="60"
          cy="60"
          r="58"
          fill="none"
          stroke="url(#dial-steel)"
          strokeWidth="2"
          opacity="0.55"
        />

        <g
          ref={bezelRef}
          style={{
            transform: "rotate(0deg)",
            transformOrigin: "60px 60px",
            transformBox: "view-box",
            transition: dragging ? "none" : BEZEL_RETURN_TRANSITION,
            willChange: "transform",
          }}
        >
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="url(#dial-steel)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="58"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.6"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="0.8"
          />
          {knurls.map((k) => (
            <line
              key={k.deg}
              x1={k.x1}
              y1={k.y1}
              x2={k.x2}
              y2={k.y2}
              stroke={k.major ? "var(--flight-ink)" : "color-mix(in srgb, var(--flight-ink) 42%, transparent)"}
              strokeWidth={k.major ? 1.5 : 0.9}
              strokeLinecap="round"
            />
          ))}
          <polygon
            points="60,1.5 64.4,10.5 55.6,10.5"
            fill="url(#dial-lume)"
            style={{ filter: glow("drop-shadow(0 0 3px var(--flight-accent))") }}
          />
        </g>

        <circle cx="60" cy="60" r="49" fill="url(#dial-face)" />
        <circle
          cx="60"
          cy="60"
          r="49"
          fill="none"
          stroke="var(--flight-line)"
          strokeWidth="2"
        />

        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="var(--flight-line)"
          strokeWidth="2.5"
        />
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="url(#dial-lume)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8 269"
          transform="rotate(-94 60 60)"
          style={{ filter: glow("drop-shadow(0 0 3px var(--flight-accent))") }}
        />

        {stops.map((stop, index) => {
          const deg = stop.progress * TURN;
          const inner = polar(60, 60, 38, deg);
          const outer = polar(60, 60, 44, deg);
          const passed = index <= activeIndex;
          return (
            <line
              key={stop.id}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={passed ? "var(--flight-accent)" : "var(--flight-dial-tick)"}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        <DialPlayButton compact={compact} />

        {!compact && (
          <circle cx="60" cy="60" r="49" fill="url(#dial-crystal)" pointerEvents="none" />
        )}

        <polygon points="60,13 63,7 57,7" fill="var(--flight-dial-index)" opacity="0.9" />

        {loopReady && (
          <circle
            cx="60"
            cy="60"
            r="58"
            fill="none"
            stroke="color-mix(in srgb, var(--flight-positive) 22%, transparent)"
            strokeWidth="2.5"
            pointerEvents="none"
          />
        )}
        <circle
          ref={loopRingRef}
          cx="60"
          cy="60"
          r="58"
          fill="none"
          stroke="var(--flight-positive)"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset="100"
          transform="rotate(-90 60 60)"
          pointerEvents="none"
          style={{ filter: glow("drop-shadow(0 0 4px var(--flight-positive))") }}
        />
        </svg>
      </div>
      </NavigatorShell>
    </div>
  );
}
