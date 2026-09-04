"use client";

import { useEffect, useState } from "react";

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
  { id: "contact", label: "Contact", progress: 0.92 },
];

const LAST_STOP = stops[stops.length - 1].progress;

export default function RouteMap() {
  const [activeId, setActiveId] = useState("home");
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

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

  useEffect(() => {
    const handleProgressUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        progress?: number;
        activeId?: string;
      }>;
      if (typeof customEvent.detail?.progress === "number") {
        const clamped = Math.min(1, Math.max(0, customEvent.detail.progress));
        // Quantize so React can skip re-renders for sub-visible changes
        setJourneyProgress(Math.round(clamped * 500) / 500);
      }
      if (customEvent.detail?.activeId) {
        setActiveId(customEvent.detail.activeId);
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
    setActiveId(id);
    window.dispatchEvent(
      new CustomEvent("navigate-flight-section", { detail: { id } }),
    );
  };

  // Position along the visible track, normalized to the final stop
  const trackPosition = (p: number) => (p / LAST_STOP) * 100;
  const fillHeight = Math.min(trackPosition(journeyProgress), 100);

  return (
    <nav
      aria-label="Journey route map"
      aria-hidden={!isVisible}
      className={`fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 transition-all duration-300 sm:block lg:right-8 ${
        isVisible ? "opacity-100" : "pointer-events-none translate-x-6 opacity-0"
      }`}
    >
      <div className="relative h-[62vh] w-10">
        {/* Route track */}
        <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-white/10" />

        {/* Traveled portion */}
        <div
          className="absolute left-1/2 top-0 w-[3px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#38bdf8_0%,#34d399_100%)] shadow-[0_0_12px_rgba(56,189,248,0.6)] transition-[height] duration-300 ease-out"
          style={{ height: `${fillHeight}%` }}
        />

        {/* Ship marker riding the route */}
        <div
          className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-sky-200 shadow-[0_0_16px_rgba(125,211,252,0.9)] transition-[top] duration-300 ease-out"
          style={{ top: `${fillHeight}%` }}
        />

        {/* Stations */}
        {stops.map((stop) => {
          const isActive = activeId === stop.id;
          const isPassed = journeyProgress >= stop.progress;
          return (
            <button
              key={stop.id}
              type="button"
              onClick={() => navigate(stop.id)}
              aria-label={`Go to ${stop.label}`}
              aria-current={isActive ? "step" : undefined}
              className="group absolute left-1/2 -translate-x-1/2 -translate-y-1/2 p-2"
              style={{ top: `${trackPosition(stop.progress)}%` }}
            >
              <span
                className={`block h-3 w-3 rounded-full border-2 transition-all duration-300 ${
                  isActive
                    ? "scale-125 border-sky-100 bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.9)]"
                    : isPassed
                      ? "border-emerald-200/70 bg-emerald-300/80"
                      : "border-white/30 bg-slate-900/80 group-hover:border-sky-300/70"
                }`}
              />
              <span
                className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur-md transition-all duration-300 ${
                  isActive
                    ? "border-sky-200/30 bg-slate-900/80 text-sky-100 opacity-100"
                    : "border-white/10 bg-slate-900/70 text-slate-300 opacity-0 group-hover:opacity-100"
                }`}
              >
                {stop.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
