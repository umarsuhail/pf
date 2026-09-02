"use client";

import { useEffect, useState } from "react";

// Assets the very first screen depends on — gate the loader on these
// actually finishing, not a fake timer. (earth.png no longer exists; the
// entry portal and the end-of-flight globe both use a1.png now.)
const CRITICAL_ASSETS = ["/bg.jpg", "/a1.png"];
const MIN_VISIBLE_MS = 900;
const EXIT_DURATION_MS = 700;
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Sweeps from sky-blue to violet as progress climbs, instead of a fixed accent
const ringColor = (progress: number) => `hsl(${190 + progress * 1.7}, 85%, 65%)`;

export default function PageLoader() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Nudge the visitor to turn the phone while the assets are still loading,
  // so the flight is already in its proper orientation by the time it starts.
  const [needsRotate, setNeedsRotate] = useState(false);

  useEffect(() => {
    const check = () =>
      setNeedsRotate(
        window.innerWidth < 1024 && window.innerHeight > window.innerWidth,
      );
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    let cancelled = false;
    let loaded = 0;
    const total = CRITICAL_ASSETS.length + 1; // +1 for full window load
    const startedAt = Date.now();

    const bump = () => {
      loaded += 1;
      if (!cancelled) setProgress(Math.round((loaded / total) * 100));
    };

    const preloadImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          bump();
          resolve();
        };
        img.onerror = () => {
          bump();
          resolve();
        };
        img.src = src;
      });

    const windowLoaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", () => resolve(), { once: true });
      }
    }).then(bump);

    Promise.all([...CRITICAL_ASSETS.map(preloadImage), windowLoaded]).then(() => {
      if (cancelled) return;
      // Never flash for fast loads, never feel stuck for slow ones
      const remaining = Math.max(MIN_VISIBLE_MS - (Date.now() - startedAt), 0);
      window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, remaining);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.body.style.overflow = "";
    const timeout = window.setTimeout(() => setHidden(true), EXIT_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [ready]);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      className={`fixed inset-0 z-100 flex items-center justify-center bg-background transition-[opacity,transform,filter] ease-out ${
        ready
          ? "pointer-events-none scale-110 opacity-0 blur-md duration-700"
          : "scale-100 opacity-100 blur-none duration-500"
      }`}
    >
      {/* Stays a landscape card on phones — a 70vh × 70vw box in portrait is
         a tall crop that fights the image and previews the wrong shape for
         the flight the visitor is about to rotate into. */}
      <div
        className="aspect-16/10 w-[86vw] rounded-2xl bg-cover bg-center shadow-2xl shadow-black/60 lg:aspect-auto lg:h-[70vh] lg:w-[70vw] lg:rounded-3xl"
        style={{ backgroundImage: "url(/bg.jpg)" }}
      />

      <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-6">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle
              cx="32"
              cy="32"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
            />
            <circle
              cx="32"
              cy="32"
              r={RADIUS}
              fill="none"
              stroke={ringColor(progress)}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
              style={{
                transition: "stroke-dashoffset 300ms ease-out, stroke 300ms ease-out",
              }}
            />
          </svg>
          <span className="absolute text-xs font-semibold text-sky-100">
            {progress}%
          </span>
        </div>
        <p className="px-6 text-center text-xs font-semibold uppercase tracking-[0.32em] text-sky-100/80">
          Loading his world. thanks for visiting.
        </p>

        {needsRotate && (
          <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              className="loader-rotate-hint shrink-0 text-(--accent)"
              aria-hidden="true"
            >
              <rect
                x="7"
                y="2"
                width="10"
                height="20"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="10.5"
                y1="19"
                x2="13.5"
                y2="19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[11px] font-medium text-sky-100/90">
              Rotate your phone for the full experience
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
