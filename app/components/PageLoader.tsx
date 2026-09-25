"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// The first frame of the story, not a splash screen.
//
// The old loader played /bg.mp4 in a rounded preview card over a #020617
// backdrop. Two problems beyond the 1.1MB on the critical path: the video
// owned 90% of the progress meter, so the reveal was gated on a *film*
// finishing rather than on the app being ready — a fast connection still sat
// through the clip — and #020617 is not the page's colour. body is
// `linear-gradient(180deg, #002d54, #00101f)`, so lifting the overlay was a
// visible cut from near-black to navy.
//
// The artwork already carries Umar's name and role in dimensional lettering,
// so it is the title rather than a texture behind a second title. The loader
// leaves that plate unobscured, places the recurring astronaut in its empty
// upper space, and keeps readiness feedback at the bottom edge.
const EXIT_DURATION_MS = 700;
// Long enough that a warm cache does not flash the card for three frames,
// short enough that it is never the reason anyone waits.
const MIN_VISIBLE_MS = 900;
// Where the synthetic meter creeps to while the app is still loading. It must
// never reach 100 on its own — arriving at 100 and sitting there is worse than
// arriving at 92 and finishing.
const CREEP_CEILING = 92;
const CREEP_TAU = 850;

// Tied to progress rather than to a timer, so the words are reporting
// something real: each line is the band of the meter it belongs to.
const STATUS_STEPS = [
  { at: 0, text: "Initializing thrusters…" },
  { at: 30, text: "Setting up React state…" },
  { at: 60, text: "Bootstrapping environment." },
  { at: 90, text: "Loading his world. Thanks for visiting." },
] as const;

export default function PageLoader() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    let cancelled = false;
    let loaded = document.readyState === "complete";
    let loadedAt = loaded ? performance.now() : 0;
    const started = performance.now();
    let detachWindow = () => {};

    // One rAF drives both the creep and the finish, so the number never jumps
    // between two authorities — it eases to the ceiling while waiting, then
    // eases the rest of the way once the app is actually up.
    const frame = (now: number) => {
      if (cancelled) return;
      const creep = CREEP_CEILING * (1 - Math.exp(-(now - started) / CREEP_TAU));

      if (loaded) {
        const t = Math.min(1, (now - loadedAt) / 450);
        const eased = 1 - (1 - t) ** 3;
        setProgress(Math.min(100, Math.round(creep + (100 - creep) * eased)));
        if (t >= 1 && now - started >= MIN_VISIBLE_MS) {
          setReady(true);
          return;
        }
      } else {
        setProgress(Math.round(creep));
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    if (!loaded) {
      const onLoad = () => {
        loaded = true;
        loadedAt = performance.now();
      };
      detachWindow = () => window.removeEventListener("load", onLoad);
      window.addEventListener("load", onLoad, { once: true });
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      detachWindow();
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

  const stepIndex = STATUS_STEPS.reduce(
    (found, step, i) => (progress >= step.at ? i : found),
    0,
  );
  const orbitAngle = (progress / 100) * Math.PI * 2 - Math.PI / 2;
  const orbitDotX = 80 + Math.cos(orbitAngle) * 62;
  const orbitDotY = 80 + Math.sin(orbitAngle) * 62;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      aria-label={ready ? "Ready" : `${STATUS_STEPS[stepIndex].text} ${progress} percent`}
      // Only opacity and a hair of scale on the way out: both compositor-only,
      // so the handover cannot compete for the main thread with the flight
      // mounting underneath it.
      className={`fixed inset-0 z-100 overflow-hidden transition-[opacity,transform] ease-out ${
        ready
          ? "pointer-events-none scale-[1.02] opacity-0 duration-700"
          : "scale-100 opacity-100 duration-300"
      }`}
      // Matches the concrete plate while bg.jpg is decoding, avoiding a dark
      // flash before the image appears.
      style={{ background: "#e8e8e6" }}
    >
      <style>{`
        @keyframes plFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1.5deg); }
          50%      { transform: translate3d(0, -14px, 0) rotate(1.5deg); }
        }
        @keyframes plSheen {
          from { transform: translateX(-100%); }
          to   { transform: translateX(320%); }
        }
        @keyframes plOrbit {
          to { transform: rotate(360deg); }
        }
        @keyframes plPulse {
          0%, 100% { opacity: 0.65; transform: scale(0.78); }
          50%      { opacity: 1; transform: scale(1.25); }
        }
        .pl-bg     { object-fit: cover; object-position: 50% 45%; }
        .pl-float  { animation: plFloat 7s ease-in-out infinite; }
        .pl-sheen  { animation: plSheen 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .pl-orbit  { animation: plOrbit 18s linear infinite; transform-origin: 80px 80px; }
        .pl-pulse  { animation: plPulse 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @media (orientation: portrait) {
          .pl-bg { object-fit: contain; object-position: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pl-float, .pl-sheen, .pl-orbit, .pl-pulse { animation: none; }
        }
      `}</style>

      {/* Landscape fills the viewport and crops only the plate's empty upper/
          lower concrete. Portrait contains the full 1.32:1 artwork because
          cropping its sides would crop the name itself. No tint or scrim: the
          background's lettering is the intro title. */}
      <Image
        src="/bg.jpg"
        alt="Umar Suhail — UI/UX Engineer and Frontend Developer"
        fill
        priority
        sizes="100vw"
        className="pl-bg"
      />

      <div className="relative h-full w-full px-6">
        {/* The astronaut the cards carry, drifting. `unoptimized` is required:
            /_next/image returns 400 for SVG unless dangerouslyAllowSVG is on,
            so an optimized <Image> here would silently render nothing. */}
        <div className="absolute left-1/2 top-[6%] aspect-square h-[clamp(10rem,24vh,13.5rem)] -translate-x-1/2">
          <svg
            aria-hidden="true"
            viewBox="0 0 160 160"
            className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_8px_20px_rgba(14,165,233,0.18)]"
          >
            <defs>
              <linearGradient id="loader-orbit-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="55%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="rgba(15, 23, 42, 0.12)"
              strokeWidth="1.5"
            />
            <circle
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke="rgba(15, 23, 42, 0.16)"
              strokeWidth="1"
              strokeDasharray="2 9"
              className="pl-orbit"
            />
            <circle
              cx="80"
              cy="80"
              r="62"
              pathLength="100"
              fill="none"
              stroke="url(#loader-orbit-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={100 - progress}
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dashoffset 220ms cubic-bezier(0.22,1,0.36,1)" }}
            />
            <circle
              cx={orbitDotX}
              cy={orbitDotY}
              r="4"
              fill="#e0f2fe"
              stroke="#0ea5e9"
              strokeWidth="2"
              className="pl-pulse"
            />
          </svg>

          <div className="pl-float absolute inset-[22%]">
            <Image
              src="/space/oastr.svg"
              alt=""
              fill
              unoptimized
              priority
              className="object-contain drop-shadow-[0_10px_30px_rgba(2,8,23,0.35)]"
              aria-hidden="true"
            />
          </div>

          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-sky-300/25 bg-slate-950 px-3 py-1 text-[10px] font-bold tabular-nums tracking-[0.14em] text-sky-100 shadow-[0_8px_24px_rgba(2,8,23,0.28)]">
            {progress}%
          </div>
        </div>

        {/* A compact telemetry console anchors the loading state without
            covering the artwork's name or role. */}
        <div className="absolute bottom-[clamp(1.25rem,4vh,3rem)] left-1/2 w-[min(88vw,540px)] -translate-x-1/2 rounded-2xl border border-sky-300/20 bg-slate-950/[0.92] px-5 py-4 shadow-[0_24px_70px_rgba(2,8,23,0.28)] backdrop-blur-md sm:px-6">
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.34em] text-sky-100/80">
                Lost in Space
              </span>
            </div>
          </div>

          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #38bdf8, #7dd3fc 55%, #34d399)",
                boxShadow: "0 0 14px rgba(56,189,248,0.72)",
                transition: "width 220ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
            {/* A travelling highlight, so the rail reads as live even during
                the flat stretch where the meter waits on the network. */}
            <div
              aria-hidden="true"
              className="pl-sheen absolute inset-y-0 w-1/3 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(226,240,255,0.5), transparent)",
              }}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex gap-1.5" aria-hidden="true">
              {STATUS_STEPS.map((step) => (
                <span
                  key={step.at}
                  className="h-1.5 w-1.5 rounded-full transition-[background-color,box-shadow] duration-500"
                  style={{
                    background:
                      progress >= step.at ? "#7dd3fc" : "rgba(255,255,255,0.14)",
                    boxShadow:
                      progress >= step.at
                        ? "0 0 8px rgba(125,211,252,0.65)"
                        : "none",
                  }}
                />
              ))}
            </div>

            {/* All lines stay mounted so the status can crossfade without the
                console changing height as copy lengths change. */}
            <div className="relative h-4 flex-1">
              {STATUS_STEPS.map((step, i) => (
                <p
                  key={step.text}
                  aria-hidden="true"
                  className="absolute inset-0 truncate text-right text-[9px] font-semibold uppercase tracking-[0.18em] text-sky-100/65 transition-opacity duration-500"
                  style={{ opacity: i === stepIndex ? 1 : 0 }}
                >
                  {step.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
