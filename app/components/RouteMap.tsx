"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAIN_FLIGHT_STOPS } from "../data/flightStops";
import { scrollFromProgress } from "../data/flightTimeline";

type RouteStop = {
  id: string;
  label: string;
  progress: number;
};

const stops: RouteStop[] = MAIN_FLIGHT_STOPS;

const ANGLE_STEP = 26;
const RADIUS = 108;
const MAX_VISIBLE_ANGLE = 92;
const ROW_HEIGHT = 46;

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

function scrollToProgress(p: number) {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  if (max <= 0) return;
  window.scrollTo({
    top: max * scrollFromProgress(clamp(p, 0, 1)),
    behavior: "auto",
  });
}

export default function RouteMap() {
  const [isVisible, setIsVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragStartY = useRef(0);
  const dragStartIndex = useRef(0);
  const indexPositionRef = useRef(0);
  const [centeredIndex, setCenteredIndex] = useState(0);
  const stopRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const writeStops = useCallback((x: number) => {
    stops.forEach((_stop, i) => {
      const angle = (i - x) * ANGLE_STEP;
      const el = stopRefs.current[i];
      if (!el) return;
      if (Math.abs(angle) > MAX_VISIBLE_ANGLE) {
        el.style.display = "none";
        return;
      }
      el.style.display = "";
      const rad = (angle * Math.PI) / 180;
      const facing = Math.cos(rad);
      el.style.transform = `translateY(-50%) rotateX(${angle}deg) translateZ(${RADIUS}px)`;
      el.style.opacity = String(Math.max(facing, 0) ** 1.6);
      const label = labelRefs.current[i];
      if (label) label.style.transform = `scale(${0.82 + facing * 0.18})`;
    });
  }, []);

  const applyIndexPosition = useCallback(
    (x: number) => {
      indexPositionRef.current = x;
      const rounded = Math.round(x);
      setCenteredIndex((prev) => (prev === rounded ? prev : rounded));
      writeStops(x);
    },
    [writeStops],
  );

  useLayoutEffect(() => {
    writeStops(indexPositionRef.current);
  });

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
    const handleProgressUpdate = (event: Event) => {
      if (draggingRef.current) return;
      const customEvent = event as CustomEvent<{ progress?: number }>;
      if (typeof customEvent.detail?.progress === "number") {
        const clamped = clamp(customEvent.detail.progress, 0, 1);
        applyIndexPosition(progressToIndexPosition(clamped));
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
  }, [applyIndexPosition]);

  const navigate = (id: string) => {
    const targetIndex = stops.findIndex((stop) => stop.id === id);
    if (targetIndex !== -1) applyIndexPosition(targetIndex);
    window.dispatchEvent(
      new CustomEvent("navigate-flight-section", { detail: { id } }),
    );
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    dragStartY.current = e.clientY;
    dragStartIndex.current = indexPositionRef.current;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - dragStartY.current;
    const nextIndex = clamp(
      dragStartIndex.current - deltaY / ROW_HEIGHT,
      0,
      stops.length - 1,
    );
    applyIndexPosition(nextIndex);
    scrollToProgress(indexPositionToProgress(nextIndex));
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const nearest = Math.round(indexPositionRef.current);
    applyIndexPosition(nearest);
    scrollToProgress(stops[nearest].progress);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      navigate(stops[Math.min(centeredIndex + 1, stops.length - 1)].id);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      navigate(stops[Math.max(centeredIndex - 1, 0)].id);
    }
  };

  return (
    <nav
      aria-label="Journey route map"
      aria-hidden={!isVisible}
      className={`fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 transition-all duration-300 sm:block lg:right-8 ${
        isVisible ? "opacity-100" : "pointer-events-none translate-x-6 opacity-0"
      }`}
    >
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
        className="relative h-[52vh] w-36 touch-none select-none rounded-[28px] border border-white/15 bg-slate-950/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_24px_rgba(2,8,23,0.4),0_20px_50px_rgba(2,8,23,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
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
            const angle = (i - centeredIndex) * ANGLE_STEP;
            const rad = (angle * Math.PI) / 180;
            const facing = Math.cos(rad);
            const isCentered = i === centeredIndex;
            const isPassed = i <= centeredIndex;

            return (
              <button
                key={stop.id}
                ref={(el) => {
                  stopRefs.current[i] = el;
                }}
                type="button"
                tabIndex={-1}
                onClick={() => navigate(stop.id)}
                aria-hidden="true"
                className="absolute inset-x-3 top-1/2 flex items-center justify-end gap-2 text-right"
                style={{
                  display: Math.abs(angle) > MAX_VISIBLE_ANGLE ? "none" : undefined,
                  transform: `translateY(-50%) rotateX(${angle}deg) translateZ(${RADIUS}px)`,
                  opacity: Math.max(facing, 0) ** 1.6,
                }}
              >
                <span
                  ref={(el) => {
                    labelRefs.current[i] = el;
                  }}
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

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 top-1/2 h-6 -translate-y-1/2 rounded-md border-y border-sky-300/25 bg-sky-300/4"
        />
      </div>
    </nav>
  );
}
