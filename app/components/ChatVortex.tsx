"use client";

import { useEffect, useRef } from "react";

type ChatVortexProps = {
    /**
     * Only the open panel animates. Closed, the loop is cancelled outright
     * rather than left spinning behind a hidden element — this page already
     * runs a WebGL starfield and two particle canvases, and an idle chat
     * window has no business competing with them for frame budget.
     */
    active: boolean;
    /** Accent the disk is tinted with, as an `r, g, b` triple. */
    tint?: string;
    className?: string;
};

// One mote of infalling matter. Polar, not cartesian: the whole effect is
// angular velocity rising as radius falls, which is trivial in polar terms
// and a differential equation in cartesian ones.
type Mote = {
    angle: number;
    // Normalised 0-1 against the field radius, so resizing the panel doesn't
    // require rebuilding the field.
    radius: number;
    // Per-mote multiplier on the shared orbital law, so motes at the same
    // radius don't travel as a rigid sheet.
    speed: number;
    size: number;
    // Fixed per-mote offset out of the disk plane, scaled by radius when
    // drawn. A disk with no thickness reads as a drawn ellipse; this is what
    // gives the spiral a bit of body.
    thickness: number;
    // 0-2, the colour band. Fixed at spawn and sorted on, so the draw loop
    // assigns fillStyle three times a frame instead of once per mote.
    band: number;
};

const MAX_MOTES = 220;
// Everything inside this fraction of the field radius has fallen in: the mote
// is recycled back out to the rim. Also the radius of the dark core drawn over
// the disk, which is what makes the fall read as being swallowed rather than
// as motes blinking out.
const CORE = 0.13;
// The disk is a circle seen at a shallow angle, not from directly above.
const SQUASH = 0.44;
// Base angular speed in radians/second at the rim. Orbital speed scales as
// r^-1.5 from here (Kepler), which is what gives the core its whipping
// acceleration without any of it being keyframed.
const ORBIT = 0.55;
// Fraction of its remaining radius a mote falls per second.
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
                // Distributed by sqrt so the motes spread evenly over the
                // disk's *area*; a uniform radius crowds them all at the core.
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
            // The disk is wider than the panel on purpose: its rim runs off
            // both sides, so what shows is the busy middle of the spiral
            // rather than a complete, obviously-circular object.
            fieldRadius = Math.max(width, height) * 0.62;
        };

        let raf = 0;
        let last = 0;

        const render = (elapsed: number) => {
            const cx = width / 2;
            const cy = height * 0.46;

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = "lighter";

            // Two gradients carry everything that isn't a mote: the disk's own
            // heat, and the lit rim just outside the horizon. Both are painted
            // once per frame — the alternative, a glow per mote, is the
            // shadowBlur trap the logo canvas already learned to avoid.
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

            // Under the motes, not over them: the far side of the disk has to
            // stay readable through it, and at this alpha a rim painted last
            // washes the whole panel out.
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
                    // Kepler: the closer in, the faster around. This single
                    // line is the whole illusion — the outer field drifts
                    // while the core whips.
                    mote.angle +=
                        ORBIT * mote.speed * elapsed * Math.pow(mote.radius, -1.5) * 0.06;
                    mote.radius -= mote.radius * INFALL * elapsed;
                    if (mote.radius <= CORE) {
                        // Swallowed — recycled to the rim at a fresh angle, so
                        // the field neither depletes nor pulses as a cohort.
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

                // Brightest just before the horizon and faded at the rim, so
                // the disk has a lit inner edge and dissolves at its outside
                // instead of ending on a hard circle.
                const fade =
                    Math.min(1, (1.08 - mote.radius) * 1.5) *
                    Math.min(1, (mote.radius - CORE) * 7);
                ctx.globalAlpha = Math.max(0, fade);
                const s = mote.size * (1 + (1 - mote.radius) * 0.9);
                ctx.fillRect(x - s / 2, y - s / 2, s, s);
            }

            ctx.globalAlpha = 1;

            // The horizon itself, painted over the spiral in the panel's own
            // background colour, with a soft edge so motes dim into it rather
            // than clipping against it. This is what makes the infall read as
            // being swallowed instead of as motes blinking out.
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
            // Clamped so a backgrounded tab doesn't return and teleport the
            // whole field through the horizon in one step.
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
                // Also the recovery path for opening before first layout:
                // start() no-ops while the canvas still measures zero, and
                // this is the callback that fires once it doesn't.
                start();
            } else {
                // A resize while closed still repaints once, so the panel
                // opens onto a drawn field rather than a blank canvas.
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
