"use client";

import { useEffect, useRef } from "react";

const BACKGROUND = "#020617"; // matches --background in globals.css
const STARS_PER_PIXEL = 1 / 3800;
const MAX_DPR = 1.5;
const TINTED_STAR_CHANCE = 0.18;

type Star = {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  tinted: boolean;
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = parseInt(
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean,
    16,
  );
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export default function Space({ tint }: { tint?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tintRgb = tint ? hexToRgb(tint) : null;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    const seed = () => {
      const count = Math.floor(width * height * STARS_PER_PIXEL);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        // Mostly faint pinpricks, a few brighter stars
        radius: Math.random() < 0.85 ? 0.4 + Math.random() * 0.5 : 0.9 + Math.random() * 0.6,
        baseAlpha: 0.25 + Math.random() * 0.65,
        twinkleSpeed: 0.3 + Math.random() * 0.9,
        twinklePhase: Math.random() * Math.PI * 2,
        tinted: !!tintRgb && Math.random() < TINTED_STAR_CHANCE,
      }));
    };

    const draw = (time: number) => {
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, width, height);

      // Bake this portal's accent color into the space as a soft nebula wash
      if (tintRgb) {
        const [r, g, b] = tintRgb;
        const glow = ctx.createRadialGradient(
          width * 0.5,
          height * 0.55,
          0,
          width * 0.5,
          height * 0.55,
          Math.max(width, height) * 0.75,
        );
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.24)`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      const t = time * 0.001;
      const tintColor = tintRgb ? `rgb(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]})` : "#ffffff";
      for (const star of stars) {
        const twinkle = reduceMotion
          ? 1
          : 0.75 + 0.25 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        ctx.fillStyle = star.tinted ? tintColor : "#ffffff";
        ctx.globalAlpha = star.baseAlpha * twinkle;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      draw(0);
    };

    resize();
    window.addEventListener("resize", resize);

    let rafId = 0;
    if (!reduceMotion) {
      const animate = (time: number) => {
        rafId = requestAnimationFrame(animate);
        draw(time);
      };
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [tint]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      aria-hidden="true"
    />
  );
}
