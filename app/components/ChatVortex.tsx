"use client";

import { useEffect, useRef } from "react";

type ChatVortexProps = {
    active: boolean;
    tint?: string;
    className?: string;
};

type Mote = {
    angle: number;
    radius: number;
    speed: number;
    size: number;
    thickness: number;
    band: number;
};

const MAX_MOTES = 220;
const CORE = 0.13;
const SQUASH = 0.44;
const ORBIT = 0.55;
const INFALL = 0.16;

export default function ChatVortex({
    active,
    tint = "125, 211, 252",
    className = "",
}: ChatVortexProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        let width = 0;
        let height = 0;
        let fieldRadius = 0;

        const motes: Mote[] = [];
        const random = (min: number, max: number) =>
            Math.random() * (max - min) + min;

        for (let i = 0; i < MAX_MOTES; i++) {
            motes.push({
                angle: random(0, Math.PI * 2),
                radius: CORE + Math.sqrt(Math.random()) * (1 - CORE),
                speed: random(0.72, 1.35),
                size: random(0.6, 1.5),
                thickness: random(-1, 1),
                band: Math.random() > 0.86 ? 2 : Math.random() > 0.45 ? 1 : 0,
            });
        }
        motes.sort((a, b) => a.band - b.band);

        const bandColors = [
            `rgba(${tint}, 0.30)`,
            `rgba(${tint}, 0.55)`,
            "rgba(235, 248, 255, 0.85)",
        ];

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            fieldRadius = Math.max(width, height) * 0.62;
        };

        let raf = 0;
        let last = 0;

        const render = (elapsed: number) => {
            const cx = width / 2;
            const cy = height * 0.46;

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = "lighter";

            const coreRadius = fieldRadius * CORE;
            const diskR = fieldRadius * 0.9;
            const disk = ctx.createRadialGradient(cx, cy, 0, cx, cy, diskR);
            disk.addColorStop(0, `rgba(${tint}, 0.16)`);
            disk.addColorStop(0.45, "rgba(99, 102, 241, 0.09)");
            disk.addColorStop(1, "rgba(2, 6, 23, 0)");
            ctx.fillStyle = disk;
            ctx.beginPath();
            ctx.ellipse(cx, cy, diskR, diskR * SQUASH * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            const rimR = coreRadius * 1.9;
            const rim = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR);
            rim.addColorStop(0.3, `rgba(${tint}, 0)`);
            rim.addColorStop(0.58, "rgba(186, 230, 253, 0.14)");
            rim.addColorStop(1, `rgba(${tint}, 0)`);
            ctx.fillStyle = rim;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rimR, rimR * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();

            let currentBand = -1;
            for (const mote of motes) {
                if (elapsed > 0) {
                    mote.angle +=
                        ORBIT * mote.speed * elapsed * Math.pow(mote.radius, -1.5) * 0.06;
                    mote.radius -= mote.radius * INFALL * elapsed;
                    if (mote.radius <= CORE) {
                        mote.radius = 1;
                        mote.angle = random(0, Math.PI * 2);
                        mote.speed = random(0.72, 1.35);
                    }
                }

                const r = mote.radius * fieldRadius;
                const x = cx + Math.cos(mote.angle) * r;
                const y = cy + Math.sin(mote.angle) * r * SQUASH + mote.thickness * r * 0.06;

                if (mote.band !== currentBand) {
                    currentBand = mote.band;
                    ctx.fillStyle = bandColors[mote.band];
                }

                const fade =
                    Math.min(1, (1.08 - mote.radius) * 1.5) *
                    Math.min(1, (mote.radius - CORE) * 7);
                ctx.globalAlpha = Math.max(0, fade);
                const s = mote.size * (1 + (1 - mote.radius) * 0.9);
                ctx.fillRect(x - s / 2, y - s / 2, s, s);
            }

            ctx.globalAlpha = 1;

            ctx.globalCompositeOperation = "source-over";
            const holeR = coreRadius * 1.5;
            const hole = ctx.createRadialGradient(cx, cy, 0, cx, cy, holeR);
            hole.addColorStop(0, "rgba(2, 6, 23, 1)");
            hole.addColorStop(0.6, "rgba(2, 6, 23, 0.9)");
            hole.addColorStop(1, "rgba(2, 6, 23, 0)");
            ctx.fillStyle = hole;
            ctx.beginPath();
            ctx.ellipse(cx, cy, holeR, holeR * 0.82, 0, 0, Math.PI * 2);
            ctx.fill();
        };

        const frame = (time: number) => {
            raf = requestAnimationFrame(frame);
            const elapsed = last ? Math.min((time - last) / 1000, 0.05) : 0;
            last = time;
            render(elapsed);
        };

        const start = () => {
            if (raf || !width) return;
            last = 0;
            raf = requestAnimationFrame(frame);
        };

        const stop = () => {
            if (!raf) return;
            cancelAnimationFrame(raf);
            raf = 0;
        };

        const observer = new ResizeObserver(() => {
            resize();
            if (active && !reduceMotion) {
                start();
            } else {
                render(0);
            }
        });
        observer.observe(canvas);

        resize();
        if (active && !reduceMotion) start();
        else render(0);

        return () => {
            stop();
            observer.disconnect();
        };
    }, [active, tint]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        />
    );
}
