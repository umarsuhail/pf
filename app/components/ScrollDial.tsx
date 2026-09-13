"use client";

import { useEffect, useRef, useState } from "react";
import { cards, sectionProgressMap } from "../data/sections";

// Potentiometer-style dial: it doesn't spin a full 360° — like a real volume
// knob it sweeps a fixed arc with a dead gap at the bottom, so the pointer's
// position always maps 1:1 to a progress value with no ambiguity.
const MIN_ANGLE = -145;
const MAX_ANGLE = 145;
const ANGLE_RANGE = MAX_ANGLE - MIN_ANGLE;

const stops = cards.map((card) => ({
  id: card.id,
  label: card.eyebrow.split("/").slice(1).join("/").trim() || card.id,
  progress: sectionProgressMap[card.id] ?? 0,
}));

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function progressToAngle(p: number) {
  return MIN_ANGLE + clamp01(p) * ANGLE_RANGE;
}

function angleToProgress(deg: number) {
  return clamp01((deg - MIN_ANGLE) / ANGLE_RANGE);
}

function getActiveId(p: number) {
  let id = stops[0]?.id ?? "home";
  for (const stop of stops) if (p >= stop.progress) id = stop.id;
  return id;
}

// Scrolling the real document is what actually drives the flight (see
// MultiverseFlight's own scrollYProgress) — the dial is just another input
// onto that same scroll position, the same way wheel/touch/keys are.
function scrollToProgress(p: number) {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  if (max <= 0) return;
  window.scrollTo({ top: max * clamp01(p), behavior: "auto" });
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  // deg convention here: 0 = straight up, increasing clockwise — matches the
  // pointer-angle math in updateFromPointer below.
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function ScrollDial() {
  const [activeId, setActiveId] = useState("home");
  const [dragging, setDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const draggingRef = useRef(false);
  const faceRef = useRef<SVGSVGElement>(null);
  // Progress/angle used to be React state, but the flight broadcasts scroll
  // progress on every scroll tick (~60/s) — routing that through setState
  // forced a full re-render of the whole dial every frame while scrolling.
  // It's kept in a ref instead and the affected DOM nodes (knob rotation,
  // arc path, percent readout) are written to directly; only `activeId`
  // (which changes at most a handful of times per scroll) stays as state,
  // since that's what actually needs a re-render (label text, tick colors).
  const progressRef = useRef(0);
  const knobGroupRef = useRef<SVGGElement>(null);
  const progressArcRef = useRef<SVGPathElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);

  const applyVisual = (p: number) => {
    progressRef.current = p;
    const angle = progressToAngle(p);
    if (knobGroupRef.current) {
      knobGroupRef.current.style.transform = `rotate(${angle}deg)`;
    }
    if (progressArcRef.current) {
      progressArcRef.current.setAttribute(
        "d",
        describeArc(50, 50, 40, MIN_ANGLE, angle),
      );
    }
    if (percentRef.current) {
      percentRef.current.textContent = `${Math.round(p * 100)}%`;
    }
    if (faceRef.current) {
      faceRef.current.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    }
  };

  // Shown/hidden from the cockpit tray's own toggle, mirroring RouteMap.
  useEffect(() => {
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ visible?: boolean }>).detail;
      setIsVisible((prev) => detail?.visible ?? !prev);
    };
    window.addEventListener("toggle-route-map", onToggle as EventListener);
    return () => window.removeEventListener("toggle-route-map", onToggle as EventListener);
  }, []);

  // Follows the same scroll-progress broadcast RouteMap/CockpitTray read —
  // except while the user is actively turning the dial, so an incoming
  // update doesn't fight their own drag.
  useEffect(() => {
    const handleProgressUpdate = (event: Event) => {
      if (draggingRef.current) return;
      const detail = (event as CustomEvent<{ progress?: number; activeId?: string }>).detail;
      if (typeof detail?.progress === "number") {
        applyVisual(clamp01(detail.progress));
      }
      if (detail?.activeId) setActiveId(detail.activeId);
    };
    window.addEventListener("flight-progress-update", handleProgressUpdate as EventListener);
    return () =>
      window.removeEventListener("flight-progress-update", handleProgressUpdate as EventListener);
  }, []);

  const angleFromPoint = (clientX: number, clientY: number) => {
    const el = faceRef.current;
    if (!el) return progressToAngle(progressRef.current);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
    return Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, deg));
  };

  const applyProgress = (p: number) => {
    const clamped = clamp01(p);
    applyVisual(clamped);
    setActiveId(getActiveId(clamped));
    scrollToProgress(clamped);
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    applyProgress(angleToProgress(angleFromPoint(clientX, clientY)));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    updateFromPointer(e.clientX, e.clientY);
  };
  const endDrag = () => {
    draggingRef.current = false;
    setDragging(false);
  };

  const nudge = (delta: number) => applyProgress(progressRef.current + delta);
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      nudge(0.02);
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      nudge(-0.02);
      e.preventDefault();
    } else if (e.key === "Home") {
      applyProgress(0);
      e.preventDefault();
    } else if (e.key === "End") {
      applyProgress(1);
      e.preventDefault();
    }
  };

  const activeLabel = stops.find((s) => s.id === activeId)?.label ?? "Hello";
  const activeIndex = stops.findIndex((s) => s.id === activeId);
  const trackPath = describeArc(50, 50, 40, MIN_ANGLE, MAX_ANGLE);
  const angleDeg = progressToAngle(progressRef.current);
  const progressPath = describeArc(50, 50, 40, MIN_ANGLE, angleDeg);
  const needleTransition = dragging ? "none" : "transform 0.3s ease-out";

  return (
    <div
      aria-hidden={!isVisible}
      className={`fixed bottom-6 left-4 z-50 hidden items-center gap-3 transition-all duration-300 sm:flex lg:left-8 ${
        isVisible ? "opacity-100" : "pointer-events-none -translate-x-6 opacity-0"
      }`}
    >
      <svg
        ref={faceRef}
        role="slider"
        tabIndex={0}
        aria-label="Scroll through the journey"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressRef.current * 100)}
        aria-valuetext={`${activeLabel}, ${Math.round(progressRef.current * 100)}%`}
        width="76"
        height="76"
        viewBox="0 0 100 100"
        className="touch-none cursor-grab select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {/* Knob housing */}
        <circle cx="50" cy="50" r="46" fill="rgba(10,16,23,0.85)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1" strokeDasharray="1 3" opacity="0.4" />

        {/* Unlit track */}
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" strokeLinecap="round" />
        {/* Lit progress arc */}
        <path
          ref={progressArcRef}
          d={progressPath}
          fill="none"
          stroke="url(#scroll-dial-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 4px rgba(56,189,248,0.7))" }}
        />
        <defs>
          <linearGradient id="scroll-dial-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Section tick marks */}
        {stops.map((stop, stopIndex) => {
          const deg = progressToAngle(stop.progress);
          const inner = polarToCartesian(50, 50, 34, deg);
          const outer = polarToCartesian(50, 50, 40, deg);
          const passed = stopIndex <= activeIndex;
          return (
            <line
              key={stop.id}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={passed ? "#7dd3fc" : "rgba(255,255,255,0.35)"}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Rotating knob body + pointer notch */}
        <g
          ref={knobGroupRef}
          style={{ transform: `rotate(${angleDeg}deg)`, transformOrigin: "50px 50px", transition: needleTransition }}
        >
          <circle cx="50" cy="50" r="26" fill="rgba(20,28,38,0.95)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <line x1="50" y1="50" x2="50" y2="26" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="26" r="2.4" fill="#7dd3fc" style={{ filter: "drop-shadow(0 0 4px rgba(125,211,252,0.9))" }} />
        </g>
      </svg>

      {/* Current page label, written beside the knob */}
      <div className="pointer-events-none flex flex-col rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur-md">
        <span ref={percentRef} className="text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          {Math.round(progressRef.current * 100)}%
        </span>
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
          {activeLabel}
        </span>
      </div>
    </div>
  );
}
