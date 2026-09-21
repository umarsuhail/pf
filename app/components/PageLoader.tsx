"use client";

import { useEffect, useRef, useState } from "react";

// The opening film is also useful loading time: the app renders underneath
// this overlay, and the reveal waits for both the film and window load.
const EXIT_DURATION_MS = 700;
const END_FRAME_HOLD_MS = 2000;
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Sweeps from sky-blue to violet as progress climbs, instead of a fixed accent
const ringColor = (progress: number) => `hsl(${190 + progress * 1.7}, 85%, 65%)`;

export default function PageLoader() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    let cancelled = false;
    let detachVideo = () => {};
    let detachWindow = () => {};
    let appLoaded = document.readyState === "complete";
    let videoRatio = 0;

    // The video owns 90% of the meter and normal app loading owns the final
    // 10%. The application keeps loading underneath this fixed overlay, but
    // the reveal is gated on both jobs so a fast app never cuts the film off.
    const updateProgress = () => {
      if (cancelled) return;
      setProgress(
        Math.min(100, Math.round(videoRatio * 90 + (appLoaded ? 10 : 0))),
      );
    };

    const videoFinished = new Promise<void>((resolve) => {
      const video = videoRef.current;
      if (!video || video.error || video.ended) {
        videoRatio = 1;
        updateProgress();
        resolve();
        return;
      }

      let settled = false;
      let endHoldTimeout = 0;
      const onTimeUpdate = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        videoRatio = Math.min(1, video.currentTime / video.duration);
        updateProgress();
      };
      const settle = () => {
        if (settled) return;
        settled = true;
        videoRatio = 1;
        updateProgress();
        detachVideo();
        resolve();
      };
      const onEnded = () => {
        videoRatio = 1;
        updateProgress();
        endHoldTimeout = window.setTimeout(settle, END_FRAME_HOLD_MS);
      };
      detachVideo = () => {
        window.clearTimeout(endHoldTimeout);
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("error", settle);
      };

      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ended", onEnded, { once: true });
      video.addEventListener("error", settle, { once: true });
      video.currentTime = 0;
      void video.play().catch(settle);
    });

    const windowLoaded = new Promise<void>((resolve) => {
      if (appLoaded) {
        updateProgress();
        resolve();
      } else {
        const onLoad = () => {
          appLoaded = true;
          updateProgress();
          resolve();
        };
        detachWindow = () => window.removeEventListener("load", onLoad);
        window.addEventListener("load", onLoad, { once: true });
      }
    });

    Promise.all([videoFinished, windowLoaded]).then(() => {
      if (cancelled) return;
      setProgress(100);
      setReady(true);
    });

    return () => {
      cancelled = true;
      detachVideo();
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
      {/* Stays a landscape-shaped preview card on phones — a 70vh × 70vw box
         in portrait would be an awkward tall crop of the background video. */}
      <div className="relative aspect-16/10 w-[86vw] overflow-hidden rounded-2xl shadow-2xl shadow-black/60 lg:aspect-auto lg:h-[70vh] lg:w-[70vw] lg:rounded-3xl">
        <video
          ref={videoRef}
          aria-hidden="true"
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover object-center"
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>
        {/* Blue/steel ambient glow, drifting and screen-blended so it reads
           as light moving across the card rather than a flat color wash. */}
        <div aria-hidden="true" className="loader-card-glow absolute inset-0" />
      </div>

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
