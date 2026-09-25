"use client";

import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

const MIN_LAUNCH_DELAY_MS = 1_800;
const MAX_LAUNCH_DELAY_MS = 4_800;
const MIN_FLIGHT_SECONDS = 3.8;
const MAX_FLIGHT_SECONDS = 5.4;

type StarAsset = {
  src: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  width: string;
};

type ActiveStar = StarAsset & {
  id: number;
  top: string;
  left: string;
  duration: number;
  endX: string;
  endY: string;
  startScale: number;
  endScale: number;
  zIndex: number;
};

type ShootingStarStyle = CSSProperties & {
  "--shoot-end-x": string;
  "--shoot-end-y": string;
  "--shoot-start-scale": number;
  "--shoot-end-scale": number;
};

const starAssets: StarAsset[] = [
  {
    src: "/space/star1.svg",
    intrinsicWidth: 250,
    intrinsicHeight: 129,
    width: "clamp(145px, 17vw, 290px)",
  },
  {
    src: "/space/star2.svg",
    intrinsicWidth: 89,
    intrinsicHeight: 48,
    width: "clamp(72px, 8vw, 138px)",
  },
  {
    src: "/space/star3.svg",
    intrinsicWidth: 213,
    intrinsicHeight: 253,
    width: "clamp(130px, 15vw, 250px)",
  },
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createStar(id: number): ActiveStar {
  const asset = starAssets[Math.floor(Math.random() * starAssets.length)];

  return {
    ...asset,
    id,
    // Every pass begins beyond the top-left edge, but the randomized lane
    // keeps successive meteors from tracing the same diagonal.
    top: `${randomBetween(-42, 8).toFixed(1)}vh`,
    left: `${randomBetween(-48, -20).toFixed(1)}vw`,
    duration: randomBetween(MIN_FLIGHT_SECONDS, MAX_FLIGHT_SECONDS),
    endX: `${randomBetween(145, 170).toFixed(1)}vw`,
    endY: `${randomBetween(118, 145).toFixed(1)}vh`,
    startScale: randomBetween(0.68, 0.9),
    endScale: randomBetween(0.96, 1.14),
    zIndex: Math.floor(randomBetween(1, 4)),
  };
}

export default function ShootingStars() {
  const reduceMotion = useReducedMotion();
  const [activeStars, setActiveStars] = useState<ActiveStar[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;

    let disposed = false;
    let isFirstLaunch = true;
    let launchTimer = 0;
    const cleanupTimers = new Set<number>();

    const launch = () => {
      if (disposed) return;

      const star = createStar(nextId.current++);
      setActiveStars((current) =>
        isFirstLaunch ? [star] : [...current, star],
      );
      isFirstLaunch = false;

      const cleanupTimer = window.setTimeout(() => {
        cleanupTimers.delete(cleanupTimer);
        setActiveStars((current) =>
          current.filter((candidate) => candidate.id !== star.id),
        );
      }, star.duration * 1_000 + 200);
      cleanupTimers.add(cleanupTimer);

      // The upper bound is deliberately below five seconds, leaving a little
      // scheduling slack while still meeting the requested maximum interval.
      launchTimer = window.setTimeout(
        launch,
        randomBetween(MIN_LAUNCH_DELAY_MS, MAX_LAUNCH_DELAY_MS),
      );
    };

    // Start soon after the flight appears instead of making the first screen
    // wait for a full random interval.
    launchTimer = window.setTimeout(launch, 650);

    return () => {
      disposed = true;
      window.clearTimeout(launchTimer);
      cleanupTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen"
    >
      {activeStars.map((star) => {
        const style: ShootingStarStyle = {
          top: star.top,
          left: star.left,
          width: star.width,
          maxWidth: "none",
          zIndex: star.zIndex,
          animationDuration: `${star.duration}s`,
          "--shoot-end-x": star.endX,
          "--shoot-end-y": star.endY,
          "--shoot-start-scale": star.startScale,
          "--shoot-end-scale": star.endScale,
        };

        return (
          <Image
            key={star.id}
            src={star.src}
            alt=""
            width={star.intrinsicWidth}
            height={star.intrinsicHeight}
            className="ambient-shooting-star absolute h-auto max-w-none select-none"
            style={style}
            unoptimized
          />
        );
      })}
    </div>
  );
}
