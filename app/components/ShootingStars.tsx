"use client";

import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

const LAUNCH_INTERVAL_MS = 3_000;
const MIN_FLIGHT_SECONDS = 1.35;
const MAX_FLIGHT_SECONDS = 2.15;

type StarAsset = {
  src: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  width: string;
};

// A single, separately timed placeholder for the star that approaches along
// the viewer's depth axis. Replace this source when the final artwork lands;
// its motion and cadence live on `.ambient-depth-star` in globals.css.
const depthStarAsset: StarAsset = {
  src: "/space/star2.svg",
  intrinsicWidth: 89,
  intrinsicHeight: 48,
  width: "clamp(60px, 6vw, 110px)",
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
    // Restore the original top-left to bottom-right flight. The lane still
    // varies so successive stars do not trace one identical diagonal.
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
    let launchTimer = 0;
    const cleanupTimers = new Set<number>();

    const launch = () => {
      if (disposed) return;

      const star = createStar(nextId.current++);
      // One active streak at most. Its flight is deliberately shorter than
      // the cadence, leaving a quiet beat before the next launch.
      setActiveStars([star]);

      const cleanupTimer = window.setTimeout(() => {
        cleanupTimers.delete(cleanupTimer);
        setActiveStars((current) =>
          current.filter((candidate) => candidate.id !== star.id),
        );
      }, star.duration * 1_000 + 200);
      cleanupTimers.add(cleanupTimer);

      launchTimer = window.setTimeout(launch, LAUNCH_INTERVAL_MS);
    };

    launchTimer = window.setTimeout(launch, LAUNCH_INTERVAL_MS);

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
      <Image
        src={depthStarAsset.src}
        alt=""
        width={depthStarAsset.intrinsicWidth}
        height={depthStarAsset.intrinsicHeight}
        className="ambient-depth-star absolute h-auto max-w-none select-none"
        style={{
          left: "68%",
          top: "16%",
          width: depthStarAsset.width,
          maxWidth: "none",
          zIndex: 2,
        }}
        unoptimized
      />
    </div>
  );
}
