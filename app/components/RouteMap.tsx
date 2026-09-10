"use client";

import { useEffect, useRef, useState } from "react";

type RouteStop = {
  id: string;
  label: string;
  progress: number;
};

const stops: RouteStop[] = [
  { id: "home", label: "Hello", progress: 0 },
  { id: "skills", label: "Skills", progress: 0.22 },
  { id: "projects", label: "Projects", progress: 0.56 },
  { id: "experience", label: "Experience", progress: 0.69 },
  { id: "resume", label: "Resume Builder", progress: 0.81 },
  { id: "contact", label: "Contact", progress: 0.92 },
];

// A watch date-wheel, not a straight track: each stop sits on its own band
// of a vertical cylinder, evenly spaced by ANGLE_STEP regardless of how
// bunched the underlying scroll progress values are — a real drum's
// numbers are evenly spaced too, it's the *position within a turn* that
// varies. `indexPosition` is the drum's continuous rotation, expressed as
// a fractional stop index (2.4 = 40% of the way from stop 2 to stop 3).
const ANGLE_STEP = 26; // degrees between adjacent stops
const RADIUS = 108; // px — translateZ distance, i.e. the drum's radius
const MAX_VISIBLE_ANGLE = 92; // beyond this a stop has rotated past the edge
const ROW_HEIGHT = 46; // px of drag per one full stop-to-stop step

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function progressToIndexPosition(p: number) {
  if (p <= stops[0].progress) return 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i].progress;
    const b = stops[i + 1].progress;
    if (p <= b) return i + (p - a) / Math.max(b - a, 0.0001);
  }
  return stops.length - 1;
}

function indexPositionToProgress(x: number) {
  const clamped = clamp(x, 0, stops.length - 1);
  const i = Math.floor(clamped);
  if (i >= stops.length - 1) return stops[stops.length - 1].progress;
  const frac = clamped - i;
  const a = stops[i].progress;
  const b = stops[i + 1].progress;
  return a + (b - a) * frac;
}

// Scrolling the real document is what actually drives the flight (see
// MultiverseFlight's own scrollYProgress) — the drum is just another input
// onto that same scroll position, same as the cockpit's own scroll dial.
function scrollToProgress(p: number) {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  if (max <= 0) return;
  window.scrollTo({ top: max * clamp(p, 0, 1), behavior: "auto" });
}

export default function RouteMap() {
  const [indexPosition, setIndexPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragStartY = useRef(0);
  const dragStartIndex = useRef(0);

  // Shown/hidden from the cockpit tray's own toggle, not owned locally —
  // kept mounted (opacity/pointer-events only) so scroll position isn't
  // lost while it's tucked away.
  useEffect(() => {
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ visible?: boolean }>).detail;
      setIsVisible((prev) => detail?.visible ?? !prev);
    };
    window.addEventListener("toggle-route-map", onToggle as EventListener);
    return () =>
      window.removeEventListener("toggle-route-map", onToggle as EventListener);
  }, []);

  // Follows the same scroll-progress broadcast the cockpit's scroll dial
  // reads — except while the visitor is actively turning the drum
  // themselves, so an incoming update doesn't fight their own drag.
  useEffect(() => {
    const handleProgressUpdate = (event: Event) => {
      if (draggingRef.current) return;
      const customEvent = event as CustomEvent<{ progress?: number }>;
      if (typeof customEvent.detail?.progress === "number") {
        const clamped = clamp(customEvent.detail.progress, 0, 1);
        setIndexPosition(progressToIndexPosition(clamped));
      }
    };

    window.addEventListener(
      "flight-progress-update",
      handleProgressUpdate as EventListener,
    );
    return () =>
      window.removeEventListener(
        "flight-progress-update",
        handleProgressUpdate as EventListener,
      );
  }, []);

  const navigate = (id: string) => {
    const targetIndex = stops.findIndex((stop) => stop.id === id);
    if (targetIndex !== -1) setIndexPosition(targetIndex);
    window.dispatchEvent(
      new CustomEvent("navigate-flight-section", { detail: { id } }),
    );
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    dragStartY.current = e.clientY;
    dragStartIndex.current = indexPosition;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - dragStartY.current;
    // Dragging up (negative deltaY) turns the drum forward, toward later
    // stops — the same sense as a real crown: pull the wheel up to advance.
    const nextIndex = clamp(
      dragStartIndex.current - deltaY / ROW_HEIGHT,
      0,
      stops.length - 1,
    );
    setIndexPosition(nextIndex);
    scrollToProgress(indexPositionToProgress(nextIndex));
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    // Settles on whichever stop the drum is nearest, like a detent —
    // dragging is for scrubbing the flight live, but letting go should
    // still land somewhere identifiable rather than mid-turn.
    const nearest = Math.round(indexPosition);
    setIndexPosition(nearest);
    scrollToProgress(stops[nearest].progress);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      navigate(stops[Math.min(Math.round(indexPosition) + 1, stops.length - 1)].id);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      navigate(stops[Math.max(Math.round(indexPosition) - 1, 0)].id);
    }
  };

  const centeredIndex = Math.round(indexPosition);

  return (
    <nav
      aria-label="Journey route map"
      aria-hidden={!isVisible}
      className={`fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 transition-all duration-300 sm:block lg:right-8 ${
        isVisible ? "opacity-100" : "pointer-events-none translate-x-6 opacity-0"
      }`}
    >
      {/* The drum housing — a dark metal tube (matching the cockpit tray's
         own brushed-steel language) with a perspective window cut into it.
         Fading top/bottom mask keeps stops from popping in/out abruptly as
         they rotate past the edge of the visible window, the way a real
         watch's date window has hard top/bottom edges the wheel disappears
         behind. */}
      <div
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={stops.length - 1}
        aria-valuenow={centeredIndex}
        aria-valuetext={stops[centeredIndex]?.label}
        aria-orientation="vertical"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="relative h-[52vh] w-36 touch-none select-none rounded-[28px] border border-white/15 bg-slate-950/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_24px_rgba(2,8,23,0.4),0_20px_50px_rgba(2,8,23,0.45)] backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
        style={{
          perspective: "700px",
          cursor: dragging ? "grabbing" : "grab",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 18%, black 82%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {stops.map((stop, i) => {
            const angle = (i - indexPosition) * ANGLE_STEP;
            if (Math.abs(angle) > MAX_VISIBLE_ANGLE) return null;

            const rad = (angle * Math.PI) / 180;
            const facing = Math.cos(rad); // 1 = dead centre, 0 = edge-on
            const isCentered = i === centeredIndex;
            const isPassed = stop.progress <= indexPositionToProgress(indexPosition);

            return (
              <button
                key={stop.id}
                type="button"
                tabIndex={-1}
                onClick={() => navigate(stop.id)}
                aria-hidden="true"
                className="absolute inset-x-3 top-1/2 flex items-center justify-end gap-2 text-right"
                style={{
                  transform: `translateY(-50%) rotateX(${angle}deg) translateZ(${RADIUS}px)`,
                  opacity: Math.max(facing, 0) ** 1.6,
                }}
              >
                <span
                  className={`whitespace-nowrap font-semibold uppercase tracking-[0.18em] transition-colors ${
                    isCentered
                      ? "text-[12px] text-sky-100"
                      : isPassed
                        ? "text-[10px] text-emerald-200/60"
                        : "text-[10px] text-slate-400"
                  }`}
                  style={{ transform: `scale(${0.82 + facing * 0.18})` }}
                >
                  {stop.label}
                </span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all ${
                    isCentered
                      ? "scale-125 bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.9)]"
                      : isPassed
                        ? "bg-emerald-300/70"
                        : "bg-slate-600"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Centre indicator — the "read here" line a watch's date window
           implies with its own frame, made explicit since this window has
           no physical edge of its own. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 top-1/2 h-6 -translate-y-1/2 rounded-md border-y border-sky-300/25 bg-sky-300/4"
        />
      </div>
    </nav>
  );
}
