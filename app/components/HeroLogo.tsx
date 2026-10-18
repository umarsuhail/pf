"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { animate, type MotionValue } from "framer-motion";
import { BACK_OUT, POWER2_IN, POWER2_OUT, POWER3_OUT } from "../lib/easings";
import {
    STARFIELD,
    STARFIELD_GATHER_EVENT,
    STARFIELD_RELEASE_EVENT,
    type StarfieldGatherDetail,
    type StarSeed,
} from "../lib/starfield";

type NumberControls = { stop: () => void };

type Particle = {
    x: number;
    y: number;

    homeX: number;
    homeY: number;

    vx: number;
    vy: number;

    size: number;
    alpha: number;
    tone: number;
    twinkle: number;
    isSpark: boolean;

    delay: number;

    rotation: number;
    rotationSpeed: number;

    shimmerStart: number;
    shimmerEnd: number;

    startX: number;
    startY: number;
    controlX: number;
    controlY: number;

    sparkUntil: number;

    xCtrl?: NumberControls;
    yCtrl?: NumberControls;
    alphaCtrl?: NumberControls;
};

type ParticleLogoProps = {
    src?: string;
    className?: string;

    particleCount?: number;

    speed?: number;

    disperseStrength?: number;

    size?: number;

    active?: boolean;

    style?: CSSProperties;

    onActivate?: () => void;

    progress?: MotionValue<number>;

    shatter?: MotionValue<number>;
    shatterInto?: StarSeed[];

    gatherFromStars?: boolean;
};

type FormControls = { formIn: () => void; formOut: () => void };

const TONE_COLORS = [
    "rgba(56, 181, 248, 0.84)",
    "rgba(158, 224, 255, 0.9)",
    "rgba(244, 252, 255, 0.96)",
] as const;

function toneBand(tone: number) {
    if (tone > 0.72) return 2;
    if (tone > 0.35) return 1;
    return 0;
}

const SHIMMER_SLOTS = 2;
const SHIMMER_DURATION_MIN = 620;
const SHIMMER_DURATION_MAX = 1150;
const SHIMMER_GAP_MIN = 260;
const SHIMMER_GAP_MAX = 1400;
const SHIMMER_MIN_ALPHA = 0.6;
const SHIMMER_GROWTH = 1.5;

const HOVER_SWIRL = 0.34;
const HOVER_LIFT = 0.85;
const HOVER_GROWTH = 0.7;
const HOVER_EASE = 0.006;
const HOVER_SHIMMER_RUSH = 0.28;

const RING_LIMIT = 4;
type Ring = {
    x: number;
    y: number;
    start: number;
    duration: number;
    radius: number;
    strength: number;
    width: number;
};

const CLICK_FLASH_MS = 170;
const CLICK_SPARK_MS = 560;

export default function ParticleLogo({
    src = "/images/us2.png",
    className = "",
    particleCount = 760,
    speed = 1,
    disperseStrength = 480,
    size = 180,
    active,
    onActivate,
    style,
    progress,
    shatter,
    shatterInto,
    gatherFromStars = false,
}: ParticleLogoProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controlsRef = useRef<FormControls | null>(null);
    const lastAppliedActiveRef = useRef<boolean | undefined>(undefined);

    const mouseRef = useRef({
        x: 0,
        y: 0,
        active: false,
        intensity: 0,
    });

    useEffect(() => {
        if (active === undefined) return;
        if (lastAppliedActiveRef.current === active) return;
        lastAppliedActiveRef.current = active;
        if (active) controlsRef.current?.formIn();
        else controlsRef.current?.formOut();
    }, [active]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        let animationFrame = 0;
        let destroyed = false;

        let isVisible = true;
        const paintVisibilityObserver = new IntersectionObserver(
            ([entry]) => {
                isVisible = entry?.isIntersecting ?? true;
            },
            { threshold: 0 },
        );
        paintVisibilityObserver.observe(canvas);

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        const particles: Particle[] = [];

        const logo = new Image();

        const random = (min: number, max: number) =>
            Math.random() * (max - min) + min;

        const tweenField = (
            particle: Particle,
            valueKey: "x" | "y" | "alpha",
            controlKey: "xCtrl" | "yCtrl" | "alphaCtrl",
            target: number,
            opts: { duration: number; delay?: number; ease: readonly number[] },
        ) => {
            particle[controlKey]?.stop();
            particle[controlKey] = animate(particle[valueKey], target, {
                duration: opts.duration,
                delay: opts.delay,
                ease: opts.ease as unknown as [number, number, number, number],
                onUpdate: (latest: number) => {
                    particle[valueKey] = latest;
                },
            });
        };

        const tweenPath = (
            particle: Particle,
            controlX: number,
            controlY: number,
            targetX: number,
            targetY: number,
            opts: { duration: number; delay?: number; ease: readonly number[] },
        ) => {
            const startX = particle.x;
            const startY = particle.y;
            const previousXCtrl = particle.xCtrl;
            previousXCtrl?.stop();
            if (particle.yCtrl !== previousXCtrl) particle.yCtrl?.stop();

            const pathCtrl = animate(0, 1, {
                duration: opts.duration,
                delay: opts.delay,
                ease: opts.ease as unknown as [number, number, number, number],
                onUpdate: (latest: number) => {
                    const inverse = 1 - latest;
                    particle.x =
                        inverse * inverse * startX +
                        2 * inverse * latest * controlX +
                        latest * latest * targetX;
                    particle.y =
                        inverse * inverse * startY +
                        2 * inverse * latest * controlY +
                        latest * latest * targetY;
                },
            });

            particle.xCtrl = pathCtrl;
            particle.yCtrl = pathCtrl;
        };

        let viewW = 0;
        let viewH = 0;
        let halo: CanvasGradient | null = null;

        const resize = () => {
            viewW = canvas.offsetWidth;
            viewH = canvas.offsetHeight;

            canvas.width = viewW * dpr;
            canvas.height = viewH * dpr;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            halo = ctx.createRadialGradient(
                viewW / 2,
                viewH / 2,
                0,
                viewW / 2,
                viewH / 2,
                Math.min(size * 0.58, Math.min(viewW, viewH) * 0.46),
            );
            halo.addColorStop(0, "rgba(125, 211, 252, 0.135)");
            halo.addColorStop(0.44, "rgba(56, 189, 248, 0.05)");
            halo.addColorStop(0.72, "rgba(14, 165, 233, 0.015)");
            halo.addColorStop(1, "rgba(14, 165, 233, 0)");
        };

        const getLogoPoints = (): Promise<
            { x: number; y: number; alpha: number }[]
        > => {
            return new Promise((resolve) => {
                const resolveLogo = () => resolve(sampleLogo());

                if (logo.complete && logo.naturalWidth > 0) {
                    resolveLogo();
                } else {
                    logo.onload = resolveLogo;
                    logo.onerror = () => resolve([]);
                    logo.src = src;
                }
            });
        };

        logo.src = src;

        const sampleLogo = (step = 3) => {
            const sampleCanvas = document.createElement("canvas");
            const sampleSize = 500;

            sampleCanvas.width = sampleSize;
            sampleCanvas.height = sampleSize;

            const sampleCtx = sampleCanvas.getContext("2d");

            if (!sampleCtx) return [];

            sampleCtx.clearRect(0, 0, sampleSize, sampleSize);

            const ratio = Math.min(
                sampleSize / logo.naturalWidth,
                sampleSize / logo.naturalHeight,
            );
            const drawW = logo.naturalWidth * ratio;
            const drawH = logo.naturalHeight * ratio;
            sampleCtx.drawImage(
                logo,
                (sampleSize - drawW) / 2,
                (sampleSize - drawH) / 2,
                drawW,
                drawH,
            );

            const imageData = sampleCtx.getImageData(0, 0, sampleSize, sampleSize);

            const points: {
                x: number;
                y: number;
                alpha: number;
            }[] = [];

            for (let y = 0; y < sampleSize; y += step) {
                for (let x = 0; x < sampleSize; x += step) {
                    const index = (y * sampleSize + x) * 4;

                    const r = imageData.data[index];
                    const g = imageData.data[index + 1];
                    const b = imageData.data[index + 2];
                    const a = imageData.data[index + 3];

                    if (a < 80) continue;

                    const brightness = (r + g + b) / 3;

                    if (brightness > 245 && a < 180) {
                        continue;
                    }

                    points.push({
                        x,
                        y,
                        alpha: a / 255,
                    });
                }
            }

            for (let i = points.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));

                [points[i], points[j]] = [
                    points[j],
                    points[i],
                ];
            }

            return points;
        };

        const createParticles = async () => {
            let points = await getLogoPoints();

            if (points.length < particleCount * 1.3) {
                points = sampleLogo(2);
            }

            if (destroyed) return;

            particles.length = 0;

            const canvasWidth = canvas.offsetWidth;
            const canvasHeight = canvas.offsetHeight;

            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            for (const point of points) {
                if (point.x < minX) minX = point.x;
                if (point.x > maxX) maxX = point.x;
                if (point.y < minY) minY = point.y;
                if (point.y > maxY) maxY = point.y;
            }

            const inkWidth = Math.max(maxX - minX, 1);
            const inkHeight = Math.max(maxY - minY, 1);
            const scale = size / Math.max(inkWidth, inkHeight);
            const inkCenterX = (minX + maxX) / 2;
            const inkCenterY = (minY + maxY) / 2;

            const count = Math.min(
                particleCount,
                points.length
            );

            for (let i = 0; i < count; i++) {
                const point = points[i];

                const homeX =
                    canvasWidth / 2 + (point.x - inkCenterX) * scale;

                const homeY =
                    canvasHeight / 2 + (point.y - inkCenterY) * scale;

                const angle = Math.random() * Math.PI * 2;

                const distance = random(
                    disperseStrength * 0.3,
                    disperseStrength
                );
                const startX = homeX + Math.cos(angle) * distance;
                const startY = homeY + Math.sin(angle) * distance;
                const twinkle = random(0, Math.PI * 2);
                const bend =
                    Math.min(distance * 0.28, size * 0.48) *
                    (Math.sin(twinkle) >= 0 ? 1 : -1);
                const routeDX = homeX - startX;
                const routeDY = homeY - startY;

                particles.push({
                    x: startX,
                    y: startY,
                    startX,
                    startY,
                    controlX:
                        (startX + homeX) / 2 - (routeDY / distance) * bend,
                    controlY:
                        (startY + homeY) / 2 + (routeDX / distance) * bend,

                    homeX,
                    homeY,

                    vx: 0,
                    vy: 0,

                    size: random(0.53, 1.12),

                    alpha: 0,
                    tone: random(0, 1),
                    twinkle,
                    isSpark: Math.random() > 0.88,

                    delay: random(0, 0.8),

                    rotation: random(0, Math.PI * 2),
                    rotationSpeed: random(-0.02, 0.02),

                    shimmerStart: 0,
                    shimmerEnd: 0,
                    sparkUntil: 0,
                });
            }

            particles.sort(
                (a, b) =>
                    toneBand(a.tone) - toneBand(b.tone) ||
                    Number(a.isSpark) - Number(b.isSpark),
            );
        };

        let hover = 0;
        let lastFrameTime = performance.now();
        const rings: Ring[] = [];
        let flashUntil = 0;

        const addRing = (ring: Ring) => {
            rings.push(ring);
            if (rings.length > RING_LIMIT) rings.shift();
        };

        const impulse = (
            originX: number,
            originY: number,
            power: number,
            reach: number,
        ) => {
            for (const particle of particles) {
                const dx = particle.x - originX;
                const dy = particle.y - originY;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                if (distance > reach) continue;
                const falloff = 1 - distance / reach;
                const force = power * falloff * falloff;
                particle.vx += (dx / distance) * force;
                particle.vy += (dy / distance) * force;
            }
        };

        const shimmerSlots = Array.from({ length: SHIMMER_SLOTS }, (_, i) => ({
            particle: null as Particle | null,
            nextAt: i * 520,
        }));

        const updateShimmer = (now: number) => {
            for (const slot of shimmerSlots) {
                const burning = slot.particle;
                if (burning) {
                    if (now < burning.shimmerEnd) continue;
                    slot.particle = null;
                    const gap = 1 - hover * (1 - HOVER_SHIMMER_RUSH);
                    slot.nextAt =
                        now + random(SHIMMER_GAP_MIN, SHIMMER_GAP_MAX) * gap;
                    continue;
                }

                if (now < slot.nextAt) continue;

                const candidate =
                    particles[Math.floor(Math.random() * particles.length)];

                if (
                    !candidate ||
                    !candidate.isSpark ||
                    candidate.alpha < SHIMMER_MIN_ALPHA ||
                    candidate.shimmerEnd > now
                ) {
                    slot.nextAt = now + 80;
                    continue;
                }

                candidate.shimmerStart = now;
                candidate.shimmerEnd =
                    now + random(SHIMMER_DURATION_MIN, SHIMMER_DURATION_MAX);
                slot.particle = candidate;
            }
        };

        let dormantClean = false;
        let progressHandedOff = false;

        type ShatterRoute = {
            sx: number; sy: number; cx: number; cy: number;
            tx: number; ty: number;
            px: number;
        };
        let shatterPlan: ShatterRoute[] | null = null;

        let starSprite: HTMLCanvasElement | null = null;
        if (shatterInto) {
            starSprite = document.createElement("canvas");
            starSprite.width = starSprite.height = 64;
            const sctx = starSprite.getContext("2d");
            if (sctx) {
                const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                g.addColorStop(0, "rgba(59,130,246,1)");
                g.addColorStop(0.6, "rgba(59,130,246,0.6)");
                g.addColorStop(1, "rgba(59,130,246,0)");
                sctx.globalAlpha = STARFIELD.opacity;
                sctx.fillStyle = g;
                sctx.fillRect(0, 0, 64, 64);
            }
        }

        const smoothstep = (a: number, b: number, v: number) => {
            const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
            return t * t * (3 - 2 * t);
        };

        const planShatter = (): ShatterRoute[] => {
            const cx = viewW / 2;
            const cy = viewH / 2;
            const seeds = shatterInto ?? [];
            const order = particles.map((_, i) => i);
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            const keptCount = Math.min(seeds.length, particles.length);
            const angleOf = (x: number, y: number) => Math.atan2(y - cy, x - cx);
            const kept = order
                .slice(0, keptCount)
                .sort(
                    (a, b) =>
                        angleOf(particles[a].x, particles[a].y) -
                        angleOf(particles[b].x, particles[b].y),
                );
            const targets = seeds
                .map((seed) => ({ x: seed.nx * viewW, y: seed.ny * viewH, px: seed.px }))
                .sort((a, b) => angleOf(a.x, a.y) - angleOf(b.x, b.y));

            const reach = Math.max(viewW, viewH);
            const plan: ShatterRoute[] = particles.map((particle) => {
                const dx = particle.x - cx;
                const dy = particle.y - cy;
                const d = Math.hypot(dx, dy) || 1;
                const throwTo = reach * random(0.55, 1.0);
                return {
                    sx: particle.x, sy: particle.y,
                    cx: particle.x, cy: particle.y,
                    tx: cx + (dx / d) * throwTo,
                    ty: cy + (dy / d) * throwTo,
                    px: 0,
                };
            });
            kept.forEach((index, k) => {
                const particle = particles[index];
                const target = targets[k];
                const dx = target.x - particle.x;
                const dy = target.y - particle.y;
                const d = Math.hypot(dx, dy) || 1;
                const bend = d * 0.14 * (Math.sin(particle.twinkle) >= 0 ? 1 : -1);
                plan[index] = {
                    sx: particle.x, sy: particle.y,
                    cx: (particle.x + target.x) / 2 - (dy / d) * bend,
                    cy: (particle.y + target.y) / 2 + (dx / d) * bend,
                    tx: target.x, ty: target.y,
                    px: target.px,
                };
            });
            return plan;
        };

        const draw = () => {
            if (destroyed) return;

            if (!isVisible) {
                animationFrame = requestAnimationFrame(draw);
                return;
            }

            if (!visible) {
                if (dormantClean) {
                    animationFrame = requestAnimationFrame(draw);
                    return;
                }
                let anyAlive = false;
                for (const particle of particles) {
                    if (particle.alpha > 0.004) {
                        anyAlive = true;
                        break;
                    }
                }
                if (!anyAlive) {
                    if (!dormantClean) {
                        ctx.clearRect(0, 0, viewW, viewH);
                        dormantClean = true;
                    }
                    animationFrame = requestAnimationFrame(draw);
                    return;
                }
            }
            dormantClean = false;

            ctx.clearRect(0, 0, viewW, viewH);

            if (halo) {
                const bloom = shatter ? 1 - Math.min(1, shatter.get()) : 1;
                ctx.globalAlpha = bloom;
                ctx.fillStyle = halo;
                ctx.fillRect(0, 0, viewW, viewH);
                ctx.globalAlpha = 1;
            }
            ctx.globalCompositeOperation = "lighter";

            const mouse = mouseRef.current;
            mouse.intensity +=
                ((mouse.active ? 1 : 0) - mouse.intensity) * 0.075;
            const frameTime = performance.now();

            const dt = Math.min(frameTime - lastFrameTime, 50);
            lastFrameTime = frameTime;
            const hoverTarget = mouse.active ? 1 : 0;
            hover += (hoverTarget - hover) * Math.min(1, HOVER_EASE * dt);

            updateShimmer(frameTime);

            const hoverRadius = Math.max(90, size * 0.38);
            const flash =
                flashUntil > frameTime
                    ? (flashUntil - frameTime) / CLICK_FLASH_MS
                    : 0;
            if (progress && !progressHandedOff) {
                const value = Math.min(1, Math.max(0, progress.get()));
                for (const particle of particles) {
                    const lead = (particle.delay / 0.8) * 0.45;
                    const local = Math.min(
                        1,
                        Math.max(0, (value - lead) / (1 - lead)),
                    );
                    const t = 1 - (1 - local) * (1 - local);
                    const inverse = 1 - t;
                    particle.x =
                        inverse * inverse * particle.startX +
                        2 * inverse * t * particle.controlX +
                        t * t * particle.homeX;
                    particle.y =
                        inverse * inverse * particle.startY +
                        2 * inverse * t * particle.controlY +
                        t * t * particle.homeY;
                    particle.alpha = Math.min(1, local * 3);
                    particle.vx = 0;
                    particle.vy = 0;
                }
                if (value >= 1) progressHandedOff = true;
            }

            const shatterValue =
                shatter && shatterInto ? Math.min(1, Math.max(0, shatter.get())) : 0;
            const shattering = shatterValue > 0;
            if (shattering && !shatterPlan) shatterPlan = planShatter();
            if (shattering && shatterPlan) {
                const e = 1 - Math.pow(1 - shatterValue, 3);
                const inverse = 1 - e;
                const burnOut = smoothstep(0.12, 0.6, shatterValue);
                const soften = smoothstep(0.45, 0.95, shatterValue);
                shatterPlan.forEach((route, i) => {
                    const particle = particles[i];
                    particle.x =
                        inverse * inverse * route.sx +
                        2 * inverse * e * route.cx +
                        e * e * route.tx;
                    particle.y =
                        inverse * inverse * route.sy +
                        2 * inverse * e * route.cy +
                        e * e * route.ty;
                    particle.vx = 0;
                    particle.vy = 0;
                    particle.alpha = route.px > 0 ? 1 - soften : 1 - burnOut;
                });
            }

            let currentBand = -1;

            particles.forEach((particle) => {
                let hoverLift = 0;
                if (!shattering && mouse.intensity > 0.001) {
                    const dx = particle.x - mouse.x;
                    const dy = particle.y - mouse.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const radius = Math.max(96, size * 0.46);

                    if (distance < radius && distance > 0) {
                        hoverLift =
                            (1 - distance / radius) * mouse.intensity;
                        const normalX = dx / distance;
                        const normalY = dy / distance;
                        particle.vx +=
                            (normalX * 0.2 - normalY * 0.42) * hoverLift;
                        particle.vy +=
                            (normalY * 0.2 + normalX * 0.42) * hoverLift;
                    }
                }

                const dx =
                    particle.homeX - particle.x;

                const dy =
                    particle.homeY - particle.y;

                if (!shattering) {
                    particle.vx += dx * 0.008;
                    particle.vy += dy * 0.008;

                    particle.vx *= 0.90;
                    particle.vy *= 0.90;

                    particle.x += particle.vx;
                    particle.y += particle.vy;
                }

                const shimmer =
                    0.78 + Math.sin(frameTime * 0.002 + particle.twinkle) * 0.22;

                let burst = 0;
                if (particle.shimmerEnd > frameTime) {
                    const span = particle.shimmerEnd - particle.shimmerStart;
                    const t = (frameTime - particle.shimmerStart) / span;
                    burst = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));
                }

                const lift = hoverLift * HOVER_LIFT + flash;
                ctx.globalAlpha =
                    particle.alpha *
                    Math.min(
                        1,
                        shimmer + burst * (1 - shimmer) + hoverLift * 0.18,
                    );

                const band = toneBand(particle.tone);
                if (band !== currentBand) {
                    currentBand = band;
                    ctx.fillStyle = TONE_COLORS[band];
                }

                if (burst > 0) {
                    ctx.fillStyle = TONE_COLORS[2];
                    currentBand = -1;
                }

                const flare =
                    1 + burst * SHIMMER_GROWTH + hoverLift * 0.42;
                const drawX = particle.x;
                const drawY = particle.y;

                if (particle.isSpark || particle.sparkUntil > frameTime) {
                    particle.rotation += particle.rotationSpeed;
                    const arm = particle.size * 2.2 * flare;
                    const thickness = particle.size * 0.78 * flare;
                    ctx.fillRect(drawX - thickness / 2, drawY - arm, thickness, arm * 2);
                    ctx.fillRect(drawX - arm, drawY - thickness / 2, arm * 2, thickness);
                    ctx.globalAlpha =
                        particle.alpha *
                        (shimmer + burst * (1 - shimmer)) *
                        (0.31 + burst * 0.22);
                    const halo = particle.size * 2.8 * flare;
                    ctx.fillRect(drawX - halo / 2, drawY - halo / 2, halo, halo);
                } else {
                    const edge = particle.size * 1.35 * flare;
                    ctx.fillRect(drawX - edge / 2, drawY - edge / 2, edge, edge);
                }
            });

            if (shattering && shatterPlan && starSprite) {
                const soften = smoothstep(0.45, 0.95, shatterValue);
                const sprite = starSprite;
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = soften;
                shatterPlan.forEach((route, i) => {
                    if (route.px <= 0) return;
                    const particle = particles[i];
                    ctx.drawImage(
                        sprite,
                        particle.x - route.px / 2,
                        particle.y - route.px / 2,
                        route.px,
                        route.px,
                    );
                });
                ctx.globalCompositeOperation = "lighter";
            }

            for (let i = rings.length - 1; i >= 0; i--) {
                const ring = rings[i];
                const t = (frameTime - ring.start) / ring.duration;
                if (t < 0) continue;
                if (t >= 1) {
                    rings.splice(i, 1);
                    continue;
                }
                const eased = 1 - (1 - t) ** 3;
                const fade = (1 - t) ** 2 * ring.strength;
                ctx.globalAlpha = fade;
                ctx.strokeStyle = TONE_COLORS[1];
                ctx.lineWidth = Math.max(0.4, ring.width * (1 - t * 0.75));
                ctx.beginPath();
                ctx.arc(ring.x, ring.y, ring.radius * eased, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";

            animationFrame =
                requestAnimationFrame(draw);
        };

        let visible = false;
        let releaseTimeout = 0;

        const formIn = (snap = false) => {
            if (visible || destroyed || particles.length === 0) return;
            visible = true;

            if (gatherFromStars) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = rect.width ? viewW / rect.width : 1;
                const scaleY = rect.height ? viewH / rect.height : 1;
                const order = particles.map((_, i) => i).sort(() => Math.random() - 0.5);
                window.dispatchEvent(
                    new CustomEvent<StarfieldGatherDetail>(STARFIELD_GATHER_EVENT, {
                        detail: {
                            count: Math.min(320, particles.length),
                            within: {
                                left: rect.left,
                                top: rect.top,
                                right: rect.right,
                                bottom: rect.bottom,
                            },
                            respond: (points) => {
                                points.forEach((point, k) => {
                                    const particle = particles[order[k]];
                                    particle.x = (point.x - rect.left) * scaleX;
                                    particle.y = (point.y - rect.top) * scaleY;
                                    particle.alpha = 0.35;
                                });
                            },
                        },
                    }),
                );
            }

            particles.forEach((particle) => {
                const duration = 2.3 / speed;
                const delay = (particle.delay * 0.52) / speed;
                const dx = particle.homeX - particle.x;
                const dy = particle.homeY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const bendDirection = Math.sin(particle.twinkle) >= 0 ? 1 : -1;
                const bend =
                    Math.min(distance * 0.28, size * 0.48) * bendDirection;
                const controlX =
                    (particle.x + particle.homeX) / 2 -
                    (dy / distance) * bend;
                const controlY =
                    (particle.y + particle.homeY) / 2 +
                    (dx / distance) * bend;

                tweenField(particle, "alpha", "alphaCtrl", 1, {
                    duration: 0.78 / speed,
                    delay: particle.delay / speed,
                    ease: POWER2_OUT,
                });
                tweenPath(
                    particle,
                    controlX,
                    controlY,
                    particle.homeX,
                    particle.homeY,
                    {
                        duration,
                        delay,
                        ease: POWER2_OUT,
                    },
                );
            });
        };

        const formOut = () => {
            if (!visible || destroyed || particles.length === 0) return;
            visible = false;

            if (gatherFromStars) {
                window.clearTimeout(releaseTimeout);
                releaseTimeout = window.setTimeout(() => {
                    window.dispatchEvent(new CustomEvent(STARFIELD_RELEASE_EVENT));
                }, 700);
            }

            particles.forEach((particle) => {
                const dx =
                    particle.x - particle.homeX;

                const dy =
                    particle.y - particle.homeY;

                let angle = Math.atan2(
                    dy,
                    dx
                );

                if (
                    Math.abs(dx) < 10 &&
                    Math.abs(dy) < 10
                ) {
                    angle =
                        Math.random() *
                        Math.PI *
                        2;
                }

                const distance =
                    disperseStrength *
                    random(0.7, 1.2);

                const duration = 0.9 / speed;
                const delay = random(0, 0.5) / speed;

                tweenField(particle, "x", "xCtrl", particle.homeX + Math.cos(angle) * distance, {
                    duration,
                    delay,
                    ease: POWER2_IN,
                });
                tweenField(particle, "y", "yCtrl", particle.homeY + Math.sin(angle) * distance, {
                    duration,
                    delay,
                    ease: POWER2_IN,
                });
                tweenField(particle, "alpha", "alphaCtrl", 0, {
                    duration,
                    delay,
                    ease: POWER2_IN,
                });
            });
        };

        controlsRef.current = { formIn, formOut };

        let scatterTimeout = 0;
        const scatterIntoSpace = (originX: number, originY: number) => {
            if (!visible || destroyed || particles.length === 0) return;
            visible = false;

            flashUntil = performance.now() + CLICK_FLASH_MS;
            const shortSide = Math.min(viewW, viewH);
            addRing({
                x: originX,
                y: originY,
                start: performance.now(),
                duration: 620,
                radius: shortSide * 0.34,
                strength: 0.85,
                width: 3.4,
            });
            addRing({
                x: originX,
                y: originY,
                start: performance.now() + 90,
                duration: 780,
                radius: shortSide * 0.46,
                strength: 0.4,
                width: 1.6,
            });

            particles.forEach((particle) => {
                const centerX = viewW / 2;
                const centerY = viewH / 2;
                const impactDistance = Math.hypot(
                    particle.homeX - originX,
                    particle.homeY - originY,
                );
                const angle = random(0, Math.PI * 2);
                const maxReach = Math.min(
                    size * 1.55,
                    Math.min(viewW, viewH) * 0.46,
                );
                const distance = maxReach * Math.sqrt(random(0.04, 1));
                const targetX = centerX + Math.cos(angle) * distance;
                const targetY = centerY + Math.sin(angle) * distance;
                const bend = distance * random(-0.32, 0.32);
                const controlX =
                    (particle.homeX + targetX) / 2 - Math.sin(angle) * bend;
                const controlY =
                    (particle.homeY + targetY) / 2 + Math.cos(angle) * bend;
                const duration =
                    (0.72 + (distance / maxReach) * 0.38 + random(0, 0.1)) /
                    speed;
                const delay =
                    Math.min(0.1, impactDistance / Math.max(size * 7, 1)) /
                    speed;

                tweenPath(
                    particle,
                    controlX,
                    controlY,
                    targetX,
                    targetY,
                    {
                        duration,
                        delay,
                        ease: POWER3_OUT,
                    },
                );
                tweenField(particle, "alpha", "alphaCtrl", random(0.2, 0.58), {
                    duration: duration * 0.72,
                    delay,
                    ease: POWER2_OUT,
                });
            });

            window.clearTimeout(scatterTimeout);
            scatterTimeout = window.setTimeout(() => {
                if (destroyed) return;
                formIn();
            }, 1780 / speed);
        };

        const toCanvasSpace = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = rect.width / (canvas.offsetWidth || rect.width || 1);
            const scaleY = rect.height / (canvas.offsetHeight || rect.height || 1);
            return {
                x: (event.clientX - rect.left) / (scaleX || 1),
                y: (event.clientY - rect.top) / (scaleY || 1),
            };
        };

        const handleMouseMove = (
            event: MouseEvent
        ) => {
            const { x, y } = toCanvasSpace(event);
            const interactionRadius = size * 0.64;
            const insideLogo =
                Math.hypot(x - viewW / 2, y - viewH / 2) <=
                interactionRadius;

            mouseRef.current.x = x;
            mouseRef.current.y = y;
            mouseRef.current.active = insideLogo;
            canvas.style.cursor = insideLogo ? "pointer" : "default";
        };

        const handleMouseEnter = (event: MouseEvent) => {
            if (!visible) return;
            const { x, y } = toCanvasSpace(event);
            addRing({
                x,
                y,
                start: performance.now(),
                duration: 560,
                radius: Math.min(viewW, viewH) * 0.3,
                strength: 0.28,
                width: 1.4,
            });
            impulse(x, y, 1.5, Math.min(viewW, viewH) * 0.34);
        };

        const handleMouseLeave = () => {
            mouseRef.current.active = false;
            canvas.style.cursor = "default";
        };

        const handleClick = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (
                Math.hypot(x - viewW / 2, y - viewH / 2) >
                size * 0.64
            ) {
                return;
            }
            event.stopPropagation();
            mouseRef.current.active = false;
            canvas.style.cursor = "default";
            scatterIntoSpace(x, y);
            onActivate?.();
        };

        let revealObserver: IntersectionObserver | undefined;

        const initialize = async () => {
            resize();

            await createParticles();

            if (destroyed) return;

            draw();

            if (progress) {
                visible = true;
            } else if (active === undefined) {
                revealObserver = new IntersectionObserver(
                    ([entry]) => {
                        if (entry.isIntersecting) formIn();
                        else formOut();
                    },
                    { threshold: 0.2 },
                );
                revealObserver.observe(canvas);
            } else {
                lastAppliedActiveRef.current = active;
                if (active) formIn();
            }
        };

        window.addEventListener(
            "resize",
            resize
        );

        canvas.addEventListener(
            "mousemove",
            handleMouseMove
        );

        canvas.addEventListener(
            "mouseenter",
            handleMouseEnter
        );

        canvas.addEventListener(
            "mouseleave",
            handleMouseLeave
        );

        canvas.addEventListener(
            "click",
            handleClick
        );

        initialize();

        return () => {
            destroyed = true;

            cancelAnimationFrame(
                animationFrame
            );

            window.clearTimeout(scatterTimeout);
            window.clearTimeout(releaseTimeout);

            paintVisibilityObserver.disconnect();
            revealObserver?.disconnect();
            controlsRef.current = null;

            particles.forEach((particle) => {
                particle.xCtrl?.stop();
                particle.yCtrl?.stop();
                particle.alphaCtrl?.stop();
            });

            window.removeEventListener(
                "resize",
                resize
            );

            canvas.removeEventListener(
                "mousemove",
                handleMouseMove
            );

            canvas.removeEventListener(
                "mouseenter",
                handleMouseEnter
            );

            canvas.removeEventListener(
                "mouseleave",
                handleMouseLeave
            );

            canvas.removeEventListener(
                "click",
                handleClick
            );
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        src,
        particleCount,
        speed,
        disperseStrength,
        size,
        progress,
        shatter,
        shatterInto,
        gatherFromStars,
    ]);

    return (
        <canvas
            ref={canvasRef}
            className={`block ${className}`}
            style={style}
        />
    );
}
