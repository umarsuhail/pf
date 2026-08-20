"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion/react";
import { POWER2_IN, POWER2_OUT, POWER3_OUT } from "../lib/easings";

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

    // In-flight animate() controls for each tweened field, so a new tween
    // can stop the previous one first — the motion equivalent of GSAP's
    // `overwrite: true`.
    xCtrl?: NumberControls;
    yCtrl?: NumberControls;
    alphaCtrl?: NumberControls;
};

type ParticleLogoProps = {
    src?: string;
    className?: string;

    particleCount?: number;

    /**
     * 1 = normal
     * 2 = faster
     * 0.5 = slower
     */
    speed?: number;

    /**
     * How far particles travel away from the logo.
     */
    disperseStrength?: number;

    /**
     * Automatically loop the animation.
     */
    loop?: boolean;

    /**
     * Fixed pixel diameter for the formed logo — independent of the
     * canvas's own size, so it reads the same across breakpoints and
     * doesn't rescale when its container is resized.
     */
    size?: number;
};

export default function ParticleLogo({
    src = "/images/us.png",
    className = "",
    particleCount = 624,
    speed = 1,
    disperseStrength = 480,
    loop = true,
    size = 180,
}: ParticleLogoProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const mouseRef = useRef({
        x: 0,
        y: 0,
        active: false,
    });

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        let animationFrame = 0;
        let destroyed = false;
        const timeouts: number[] = [];

        // The entry card (and its logo) stay mounted for the whole flight —
        // scrolling past it used to leave this canvas drawing every particle,
        // sparks' shadowBlur included, on every frame indefinitely. Only
        // actually drawing while some part of the canvas is on screen is
        // what stops that from taxing the main thread for the rest of the
        // session.
        let isVisible = true;
        const visibilityObserver = new IntersectionObserver(
            ([entry]) => {
                isVisible = entry?.isIntersecting ?? true;
            },
            { threshold: 0 },
        );
        visibilityObserver.observe(canvas);

        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const particles: Particle[] = [];

        const logo = new Image();

        const random = (min: number, max: number) =>
            Math.random() * (max - min) + min;

        // Retargets (or starts) a single tweened field on a particle,
        // stopping whatever was already animating that field first — the
        // motion equivalent of GSAP's `overwrite: true`.
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

        const resize = () => {
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const getLogoPoints = (): Promise<
            { x: number; y: number; alpha: number }[]
        > => {
            return new Promise((resolve) => {
                const resolveLogo = () => resolve(sampleLogo());

                // `complete` can be true for a failed image as well as a
                // successfully cached one. Only sample once the browser has
                // a usable image, otherwise the canvas gets zero particles.
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

        const sampleLogo = () => {
            const sampleCanvas = document.createElement("canvas");
            const sampleSize = 500;

            sampleCanvas.width = sampleSize;
            sampleCanvas.height = sampleSize;

            const sampleCtx = sampleCanvas.getContext("2d");

            if (!sampleCtx) return [];

            sampleCtx.clearRect(0, 0, sampleSize, sampleSize);

            sampleCtx.drawImage(logo, 0, 0, sampleSize, sampleSize);

            const imageData = sampleCtx.getImageData(0, 0, sampleSize, sampleSize);

            const points: {
                x: number;
                y: number;
                alpha: number;
            }[] = [];

            /*
             * Sample pixels from the logo.
             *
             * Transparent pixels are ignored.
             */
            for (let y = 0; y < sampleSize; y += 3) {
                for (let x = 0; x < sampleSize; x += 3) {
                    const index = (y * sampleSize + x) * 4;

                    const r = imageData.data[index];
                    const g = imageData.data[index + 1];
                    const b = imageData.data[index + 2];
                    const a = imageData.data[index + 3];

                    if (a < 80) continue;

                    /*
                     * Ignore nearly-white pixels.
                     * Remove this condition if your logo is white.
                     */
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

            /*
             * Shuffle points.
             */
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
            const points = await getLogoPoints();

            if (destroyed) return;

            particles.length = 0;

            const rect = canvas.getBoundingClientRect();

            const canvasWidth = rect.width;
            const canvasHeight = rect.height;

            const logoSize = size;

            const scale = logoSize / 500;

            const offsetX =
                canvasWidth / 2 - logoSize / 2;

            const offsetY =
                canvasHeight / 2 - logoSize / 2;

            const count = Math.min(
                particleCount,
                points.length
            );

            for (let i = 0; i < count; i++) {
                const point = points[i];

                const homeX =
                    offsetX + point.x * scale;

                const homeY =
                    offsetY + point.y * scale;

                /*
                 * Start particles randomly around the logo.
                 */
                const angle = Math.random() * Math.PI * 2;

                const distance = random(
                    disperseStrength * 0.3,
                    disperseStrength
                );

                particles.push({
                    x: homeX + Math.cos(angle) * distance,
                    y: homeY + Math.sin(angle) * distance,

                    homeX,
                    homeY,

                    vx: 0,
                    vy: 0,

                    // Fine points and occasional four-point sparks feel more
                    // like a holographic instrument readout than confetti.
                    size: random(0.5, 1.45),

                    alpha: point.alpha,
                    tone: random(0, 1),
                    twinkle: random(0, Math.PI * 2),
                    isSpark: Math.random() > 0.9,

                    delay: random(0, 0.8),

                    rotation: random(0, Math.PI * 2),
                    rotationSpeed: random(-0.02, 0.02),
                });
            }
        };

        const draw = () => {
            if (destroyed) return;

            if (!isVisible) {
                animationFrame = requestAnimationFrame(draw);
                return;
            }

            const rect = canvas.getBoundingClientRect();

            ctx.clearRect(
                0,
                0,
                rect.width,
                rect.height
            );

            // The formed portrait gets a restrained ice-blue bloom. This is
            // drawn once per frame, rather than putting a costly blur on every
            // particle, so the mark stays crisp on lower-power devices.
            const halo = ctx.createRadialGradient(
                rect.width / 2,
                rect.height / 2,
                0,
                rect.width / 2,
                rect.height / 2,
                Math.min(rect.width, rect.height) * 0.46
            );
            halo.addColorStop(0, "rgba(56, 189, 248, 0.11)");
            halo.addColorStop(0.52, "rgba(14, 165, 233, 0.035)");
            halo.addColorStop(1, "rgba(14, 165, 233, 0)");
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, rect.width, rect.height);
            ctx.globalCompositeOperation = "lighter";

            /*
             * Mouse influence.
             */
            const mouse = mouseRef.current;
            const frameTime = performance.now();

            particles.forEach((particle) => {
                if (mouse.active) {
                    const dx = particle.x - mouse.x;
                    const dy = particle.y - mouse.y;

                    const distance = Math.sqrt(
                        dx * dx + dy * dy
                    );

                    const radius = 140;

                    if (distance < radius && distance > 0) {
                        const force =
                            (1 - distance / radius) * 2.5;

                        particle.vx +=
                            (dx / distance) * force;

                        particle.vy +=
                            (dy / distance) * force;
                    }
                }

                /*
                 * Spring back toward logo.
                 */
                const dx =
                    particle.homeX - particle.x;

                const dy =
                    particle.homeY - particle.y;

                particle.vx += dx * 0.008;
                particle.vy += dy * 0.008;

                particle.vx *= 0.90;
                particle.vy *= 0.90;

                particle.x += particle.vx;
                particle.y += particle.vy;

                particle.rotation +=
                    particle.rotationSpeed;

                ctx.save();

                ctx.translate(
                    particle.x,
                    particle.y
                );

                ctx.rotate(
                    particle.rotation
                );

                const shimmer =
                    0.78 + Math.sin(frameTime * 0.002 + particle.twinkle) * 0.22;
                ctx.globalAlpha = particle.alpha * shimmer;

                /*
                 * Particle appearance.
                 */
                const isBright = particle.tone > 0.72;
                ctx.fillStyle = isBright
                    ? "rgba(224, 242, 254, 1)"
                    : particle.tone > 0.35
                        ? "rgba(125, 211, 252, 0.92)"
                        : "rgba(56, 189, 248, 0.82)";

                if (particle.isSpark) {
                    const arm = particle.size * 2.1;
                    // Canvas shadow blur is a CPU-side blur pass per call —
                    // by far the most expensive thing drawn here, done for
                    // ~10% of every particle every frame. Kept small rather
                    // than dropped entirely since the sparks read as flat
                    // crosses without any glow at all.
                    ctx.shadowBlur = 3;
                    ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
                    ctx.fillRect(-particle.size * 0.38, -arm, particle.size * 0.76, arm * 2);
                    ctx.fillRect(-arm, -particle.size * 0.38, arm * 2, particle.size * 0.76);
                } else {
                    // A rotated square is less playful than a soft circle and
                    // gives the assembled image a contemporary, faceted grain.
                    const edge = particle.size * 1.35;
                    ctx.fillRect(-edge / 2, -edge / 2, edge, edge);
                }

                ctx.restore();
            });

            ctx.globalCompositeOperation = "source-over";

            animationFrame =
                requestAnimationFrame(draw);
        };

        /*
         * FORM LOGO
         */
        const formLogo = () => {
            particles.forEach((particle) => {
                const duration = 1.9 / speed;
                const delay = (particle.delay * 0.4) / speed;

                tweenField(particle, "x", "xCtrl", particle.homeX, {
                    duration,
                    delay,
                    ease: POWER3_OUT,
                });
                tweenField(particle, "y", "yCtrl", particle.homeY, {
                    duration,
                    delay,
                    ease: POWER3_OUT,
                });
            });
        };

        /*
         * DISPERSE LOGO
         */
        const disperseLogo = () => {
            particles.forEach((particle) => {
                const dx =
                    particle.x - particle.homeX;

                const dy =
                    particle.y - particle.homeY;

                let angle = Math.atan2(
                    dy,
                    dx
                );

                /*
                 * If the particle is already
                 * near the center, give it
                 * a random direction.
                 */
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

                // Same delay/duration/ease on x, y and alpha reproduces the
                // original's x/y tween whose onStart fired a matching alpha
                // fade — they were always in lockstep, so there's no need
                // to chain them.
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

        const runAnimation = () => {
            /*
             * Start invisible.
             */
            particles.forEach((particle) => {
                particle.alpha = 0;
            });

            /*
             * Fade particles in and form logo.
             */
            particles.forEach((particle) => {
                tweenField(particle, "alpha", "alphaCtrl", 1, {
                    duration: 0.5 / speed,
                    delay: particle.delay / speed,
                    ease: POWER2_OUT,
                });
            });

            formLogo();

            if (loop) {
                const disperseTimeout = window.setTimeout(() => {
                    if (destroyed) return;

                    disperseLogo();

                    const resetTimeout = window.setTimeout(() => {
                        if (destroyed) return;

                        /*
                         * Reset particles.
                         */
                        particles.forEach(
                            (particle) => {
                                const angle =
                                    Math.random() *
                                    Math.PI *
                                    2;

                                const distance =
                                    disperseStrength;

                                particle.x =
                                    particle.homeX +
                                    Math.cos(angle) *
                                    distance;

                                particle.y =
                                    particle.homeY +
                                    Math.sin(angle) *
                                    distance;

                                particle.alpha = 0;
                            }
                        );

                        runAnimation();
                    }, (1.5 / speed) * 1000);
                    timeouts.push(resetTimeout);
                }, (3.1 / speed) * 1000);
                timeouts.push(disperseTimeout);
            }
        };

        const handleMouseMove = (
            event: MouseEvent
        ) => {
            const rect =
                canvas.getBoundingClientRect();

            mouseRef.current.x =
                event.clientX - rect.left;

            mouseRef.current.y =
                event.clientY - rect.top;

            mouseRef.current.active = true;
        };

        const handleMouseLeave = () => {
            mouseRef.current.active = false;
        };

        const initialize = async () => {
            resize();

            await createParticles();

            if (destroyed) return;

            draw();

            runAnimation();
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
            "mouseleave",
            handleMouseLeave
        );

        initialize();

        return () => {
            destroyed = true;

            cancelAnimationFrame(
                animationFrame
            );

            visibilityObserver.disconnect();

            timeouts.forEach((id) => window.clearTimeout(id));

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
                "mouseleave",
                handleMouseLeave
            );
        };
    }, [
        src,
        particleCount,
        speed,
        disperseStrength,
        loop,
        size,
    ]);

    return (
        <canvas
            ref={canvasRef}
            className={`block h-full w-full ${className}`}
            style={{
                width: "100%",
                height: "100%",
            }}
        />
    );
}
