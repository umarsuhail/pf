"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type Particle = {
    x: number;
    y: number;

    homeX: number;
    homeY: number;

    vx: number;
    vy: number;

    size: number;
    alpha: number;

    delay: number;

    rotation: number;
    rotationSpeed: number;
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
};

export default function ParticleLogo({
    src = "/images/us.png",
    className = "",
    particleCount = 624,
    speed = 1,
    disperseStrength = 480,
    loop = true,
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

        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const particles: Particle[] = [];

        const logo = new Image();

        const random = (min: number, max: number) =>
            Math.random() * (max - min) + min;

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
            const size = 500;

            sampleCanvas.width = size;
            sampleCanvas.height = size;

            const sampleCtx = sampleCanvas.getContext("2d");

            if (!sampleCtx) return [];

            sampleCtx.clearRect(0, 0, size, size);

            sampleCtx.drawImage(logo, 0, 0, size, size);

            const imageData = sampleCtx.getImageData(0, 0, size, size);

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
            for (let y = 0; y < size; y += 3) {
                for (let x = 0; x < size; x += 3) {
                    const index = (y * size + x) * 4;

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

            /*
             * Logo occupies ~65% of the canvas.
             */
            const logoSize =
                Math.min(canvasWidth, canvasHeight) * 0.68;

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

                    size: random(0.7, 2.2),

                    alpha: point.alpha,

                    delay: random(0, 0.8),

                    rotation: random(0, Math.PI * 2),
                    rotationSpeed: random(-0.02, 0.02),
                });
            }
        };

        const draw = () => {
            if (destroyed) return;

            const rect = canvas.getBoundingClientRect();

            ctx.clearRect(
                0,
                0,
                rect.width,
                rect.height
            );

            /*
             * Mouse influence.
             */
            const mouse = mouseRef.current;

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

                ctx.globalAlpha =
                    particle.alpha;

                /*
                 * Particle appearance.
                 */
                ctx.fillStyle =
                    "rgba(255,255,255,1)";

                ctx.beginPath();

                ctx.arc(
                    0,
                    0,
                    particle.size,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.restore();
            });

            animationFrame =
                requestAnimationFrame(draw);
        };

        /*
         * FORM LOGO
         */
        const formLogo = () => {
            particles.forEach((particle) => {
                gsap.to(particle, {
                    x: particle.homeX,
                    y: particle.homeY,

                    duration: 1.9 / speed,

                    delay:
                        particle.delay *
                        0.4 /
                        speed,

                    ease: "power3.out",

                    overwrite: true,
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

                gsap.to(particle, {
                    x:
                        particle.homeX +
                        Math.cos(angle) * distance,

                    y:
                        particle.homeY +
                        Math.sin(angle) * distance,

                    duration:
                        0.9 / speed,

                    delay:
                        random(0, 0.5) /
                        speed,

                    ease: "power2.in",

                    overwrite: true,

                    onStart: () => {
                        gsap.to(particle, {
                            alpha: 0,
                            duration:
                                0.9 / speed,
                            ease: "power2.in",
                        });
                    },
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
                gsap.to(particle, {
                    alpha: 1,

                    duration:
                        0.5 / speed,

                    delay:
                        particle.delay /
                        speed,

                    ease: "power2.out",
                });
            });

            formLogo();

            if (loop) {
                gsap.delayedCall(
                    3.1 / speed,
                    () => {
                        disperseLogo();

                        gsap.delayedCall(
                            1.5 / speed,
                            () => {
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
                            }
                        );
                    }
                );
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

            gsap.killTweensOf(particles);

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