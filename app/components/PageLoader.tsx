"use client";

import { useEffect, useState } from "react";

// Assets the very first screen depends on — gate the loader on these
// actually finishing, not a fake timer. a1.png/a2.png (the end-of-flight
// earth/moon) used to be listed here too, but they're only ever seen after
// scrolling to ~90% of the flight — holding the opening loader on ~1.7MB of
// combined weight for content that far off just made the "necessary" wait
// longer for no visible benefit. next/image's own lazy loading fetches them
// once the visitor is actually approaching that point in the scroll.
const CRITICAL_ASSETS = ["/bg.jpg"];
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
      </div>
    </div>
  );
}
