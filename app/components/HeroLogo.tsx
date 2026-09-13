"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
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
     * Fixed pixel diameter for the formed logo — independent of the
     * canvas's own size, so it reads the same across breakpoints and
     * doesn't rescale when its container is resized.
     */
    size?: number;

    /**
     * Controls the form-in/disperse-out lifecycle explicitly — pass the
     * parent's own "is this actually in view" signal when it has one (e.g.
     * a sticky scroll-driven card, where geometric viewport intersection
     * alone can't tell visible from opacity-faded-out). Left undefined,
     * the component watches its own viewport intersection instead, which
     * is the right default for a plain, normally-scrolled element.
     */
    active?: boolean;

    /**
     * Fires on click, alongside (not instead of) the built-in shatter
     * flourish — the click handler already calls stopPropagation() to keep
     * the shatter from being cut off by an ancestor's own click handler, so
     * a parent that wants to react to the click (e.g. opening a panel)
     * needs this rather than its own onClick.
     */
    onActivate?: () => void;
};

type FormControls = { formIn: () => void; formOut: () => void };

// Three fixed colour bands the particles are drawn in. Kept as a lookup so
// draw() can batch by band rather than deriving a colour string per particle.
// Drawn with "lighter" compositing, so these accumulate where particles
// overlap — the denser strokes of the mark bloom to near-white on their own
// rather than needing a blur. Warmed and brightened from the previous
// values, which left the assembled mark reading as flat grey-blue dust.
const TONE_COLORS = [
    "rgba(56, 170, 248, 0.8)",
    "rgba(150, 220, 255, 0.86)",
    "rgba(240, 250, 255, 0.92)",
] as const;

function toneBand(tone: number) {
    if (tone > 0.72) return 2;
    if (tone > 0.35) return 1;
    return 0;
}

export default function ParticleLogo({
    src = "/images/us.png",
    className = "",
    particleCount = 624,
    speed = 1,
    disperseStrength = 480,
    size = 180,
    active,
    onActivate,
}: ParticleLogoProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Populated synchronously by the setup effect below, read by the
    // separate `active`-prop-watching effect (and the click handler) so
    // triggering a reveal/shatter doesn't have to tear down and rebuild
    // the whole canvas/particle setup.
    const controlsRef = useRef<FormControls | null>(null);
    // The last `active` value actually acted on — either by initialize()
    // below (mount) or by the watcher effect itself (subsequent changes).
    // Compared against rather than just "skip the first run", because a
    // controlled caller's very first render often already carries a real
    // value (e.g. starting at `false` before its own scroll effect flips
    // it true) — treating that as a no-op transition would silently
    // swallow the first genuine reveal.
    const lastAppliedActiveRef = useRef<boolean | undefined>(undefined);

    const mouseRef = useRef({
        x: 0,
        y: 0,
        active: false,
    });

    useEffect(() => {
        if (active === undefined) return;
        // formIn()/formOut() are both idempotent (guarded by the closure's
        // own `visible` flag), so a redundant call here — e.g. racing
        // initialize()'s own async mount-time decision — is harmless; this
        // guard is purely to skip genuinely-unchanged values.
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

        // The entry card (and its logo) stay mounted for the whole flight —
        // scrolling past it used to leave this canvas drawing every particle,
        // sparks' shadowBlur included, on every frame indefinitely. Only
        // actually drawing while some part of the canvas is on screen is
        // what stops that from taxing the main thread for the rest of the
        // session. Separate from (and unrelated to) the reveal/`active`
        // lifecycle below — this is purely a draw-loop perf gate.
        let isVisible = true;
        const paintVisibilityObserver = new IntersectionObserver(
            ([entry]) => {
                isVisible = entry?.isIntersecting ?? true;
            },
            { threshold: 0 },
        );
        paintVisibilityObserver.observe(canvas);

        // Every other canvas effect in the app caps this at 1.5 for the same
        // reason: a retina/3x phone otherwise renders (and re-renders,
        // every frame) at 4-9x the pixel count of a 1x display for no
        // visible gain at this size.
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

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

        // Cached canvas dimensions — draw() runs every frame, and calling
        // getBoundingClientRect there is a forced layout read 60 times a
        // second. The size only changes on resize, so it's read once here.
        let viewW = 0;
        let viewH = 0;
        // The bloom gradient only depends on the canvas size, so it's built
        // here on resize rather than re-created inside every draw() frame.
        let halo: CanvasGradient | null = null;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            viewW = rect.width;
            viewH = rect.height;

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            halo = ctx.createRadialGradient(
                viewW / 2,
                viewH / 2,
                0,
                viewW / 2,
                viewH / 2,
                Math.min(viewW, viewH) * 0.46,
            );
            halo.addColorStop(0, "rgba(56, 189, 248, 0.11)");
            halo.addColorStop(0.52, "rgba(14, 165, 233, 0.035)");
            halo.addColorStop(1, "rgba(14, 165, 233, 0)");
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

            // Letterboxed, not stretched. Drawing straight to sampleSize x
            // sampleSize squashed any non-square source into a square — the
            // sampled points then carried that distortion into the mark.
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

            /*
             * Sample pixels from the logo. One-time cost (runs once per
             * mount, not per frame), but a 2px step over a 500x500 canvas is
             * 62,500 getImageData reads on the main thread before the first
             * particle even appears — a real startup hitch on slow devices,
             * and denser than particleCount (900) actually needs a source
             * pool for. 3px cuts that to ~27,900 while still leaving far
             * more candidate points than particles requested.
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

            // Fit to the mark's actual ink, not to the source image's frame.
            //
            // The old maths mapped the whole 500x500 sample box to `size` and
            // centred *that* box. Any transparent padding baked into the PNG
            // therefore became padding in the particle field: the mark landed
            // off-centre by however asymmetric that padding was, and rendered
            // smaller than the requested size (only the inked fraction of the
            // box carried points), which is most of why the logo was hard to
            // make out. Measuring the sampled points' own bounding box and
            // fitting that to `size` makes the result independent of how the
            // artwork happens to be positioned in its file.
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
            // Longest ink axis fills `size`, so the aspect ratio of the
            // original mark is preserved rather than stretched to a square.
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
                    // Floor raised off 0.5: sub-pixel rects get antialiased
                    // down to almost nothing, so a good share of the points
                    // were paying full cost while being invisible — part of
                    // why the assembled mark looked sparser than its count.
                    size: random(0.53, 1.12),

                    // Starts invisible — formIn() fades it up. (point.alpha,
                    // the source pixel's own opacity, isn't used as a
                    // target: every particle fades to fully opaque.)
                    alpha: 0,
                    tone: random(0, 1),
                    twinkle: random(0, Math.PI * 2),
                    isSpark: Math.random() > 0.9,

                    delay: random(0, 0.8),

                    rotation: random(0, Math.PI * 2),
                    rotationSpeed: random(-0.02, 0.02),
                });
            }

            // Grouped so draw() can set fillStyle once per colour band
            // instead of assigning a colour string per particle per frame —
            // each assignment re-parses the CSS colour natively. Sparks last
            // within each band, since they draw differently.
            particles.sort(
                (a, b) =>
                    toneBand(a.tone) - toneBand(b.tone) ||
                    Number(a.isSpark) - Number(b.isSpark),
            );
        };

        // True once the dormant branch below has wiped the canvas, so it
        // doesn't re-clear on every skipped frame.
        let dormantClean = false;

        const draw = () => {
            if (destroyed) return;

            if (!isVisible) {
                animationFrame = requestAnimationFrame(draw);
                return;
            }

            // Dormant gate. The observer above only knows geometry, and this
            // canvas lives in a full-screen sticky wrapper — geometrically
            // "on screen" from the moment the page loads, even while its
            // wrapper sits at opacity 0 for the whole flight. Between
            // formOut's completed fade and the next formIn every particle's
            // alpha has tweened to ~0, so running the physics and painting
            // hundreds of invisible rects each frame was a permanent tax on
            // the entire page. One cheap alpha scan skips all of it until
            // the next reveal actually starts.
            if (!visible) {
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

            // The formed portrait gets a restrained ice-blue bloom. Cached on
            // resize (it only depends on canvas size) and drawn once per
            // frame, rather than putting a costly blur on every particle, so
            // the mark stays crisp on lower-power devices.
            if (halo) {
                ctx.fillStyle = halo;
                ctx.fillRect(0, 0, viewW, viewH);
            }
            ctx.globalCompositeOperation = "lighter";

            /*
             * Mouse influence.
             */
            const mouse = mouseRef.current;
            const frameTime = performance.now();
            // Tracks the last colour band written to the context so the batch
            // below only reassigns fillStyle when the band actually changes.
            let currentBand = -1;

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

                // Drawn in the canvas's own coordinate space — no save /
                // translate / rotate / restore per particle. Those four calls
                // times hundreds of particles times 60fps dominated this loop,
                // and at a 1-2px draw size the rotation they existed to apply
                // is not perceptible. `rotation` is still advanced for the
                // sparks, which are large enough to read it.
                const shimmer =
                    0.78 + Math.sin(frameTime * 0.002 + particle.twinkle) * 0.22;
                ctx.globalAlpha = particle.alpha * shimmer;

                const band = toneBand(particle.tone);
                if (band !== currentBand) {
                    // Particles are pre-sorted by band, so this runs ~3x per
                    // frame rather than once per particle.
                    currentBand = band;
                    ctx.fillStyle = TONE_COLORS[band];
                }

                if (particle.isSpark) {
                    particle.rotation += particle.rotationSpeed;
                    const arm = particle.size * 2.1;
                    const thickness = particle.size * 0.76;
                    // An axis-aligned cross with a faint wider core instead of
                    // ctx.shadowBlur. Shadow blur is a native per-call blur
                    // pass; at ~10% of the particles and two rects each it was
                    // the single most expensive thing on the page, and it does
                    // not show up in a JS profile because the cost is native.
                    // The extra translucent square reads as the same bloom.
                    ctx.fillRect(particle.x - thickness / 2, particle.y - arm, thickness, arm * 2);
                    ctx.fillRect(particle.x - arm, particle.y - thickness / 2, arm * 2, thickness);
                    ctx.globalAlpha = particle.alpha * shimmer * 0.28;
                    const halo = particle.size * 2.6;
                    ctx.fillRect(particle.x - halo / 2, particle.y - halo / 2, halo, halo);
                } else {
                    const edge = particle.size * 1.35;
                    ctx.fillRect(particle.x - edge / 2, particle.y - edge / 2, edge, edge);
                }
            });

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";

            animationFrame =
                requestAnimationFrame(draw);
        };

        // Whether the logo is currently formed (or forming) — guards
        // against redundant re-triggers, e.g. two intersection callbacks
        // firing in a row, or a redundant call from the `active`-prop
        // effect landing before/after this one.
        let visible = false;

        /*
         * FORM IN — fades particles up from nothing and draws them
         * together into the logo. One-shot: no auto-disperse/reform loop.
         */
        const formIn = () => {
            if (visible || destroyed || particles.length === 0) return;
            visible = true;

            particles.forEach((particle) => {
                const duration = 1.9 / speed;
                const delay = (particle.delay * 0.4) / speed;

                tweenField(particle, "alpha", "alphaCtrl", 1, {
                    duration: 0.5 / speed,
                    delay: particle.delay / speed,
                    ease: POWER2_OUT,
                });
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
         * FORM OUT — scatters particles back outward and fades them, the
         * mirror image of formIn. Also one-shot. Shared by the scroll/
         * `active` lifecycle and the click-to-shatter handler below.
         */
        const formOut = () => {
            if (!visible || destroyed || particles.length === 0) return;
            visible = false;

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

                // Same delay/duration/ease on x, y and alpha — they were
                // always in lockstep, so there's no need to chain them.
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

        /*
         * SHATTER — an explosive click response: every particle blasts
         * outward from the pointer itself (not just its own home position),
         * hard and fast, then the logo reassembles on its own once the
         * burst settles. One-shot per click; ignored while already mid-
         * shatter or not currently formed.
         */
        let shatterTimeout = 0;
        const shatter = (originX: number, originY: number) => {
            if (!visible || destroyed || particles.length === 0) return;
            visible = false;

            particles.forEach((particle) => {
                const dx = particle.homeX - originX;
                const dy = particle.homeY - originY;
                const originDistance = Math.sqrt(dx * dx + dy * dy) || 1;
                // Particles nearer the click point get blown further —
                // reads as an impact radiating outward, not a uniform pop.
                const kick = disperseStrength * random(1.1, 1.9);
                const falloff = Math.max(0.4, 1 - originDistance / 260);
                const distance = kick * falloff + random(0, 40);
                const angle =
                    Math.atan2(dy, dx) + random(-0.35, 0.35);

                const duration = random(0.35, 0.55) / speed;
                const delay = random(0, 0.12) / speed;

                tweenField(particle, "x", "xCtrl", particle.homeX + Math.cos(angle) * distance, {
                    duration,
                    delay,
                    ease: POWER2_OUT,
                });
                tweenField(particle, "y", "yCtrl", particle.homeY + Math.sin(angle) * distance, {
                    duration,
                    delay,
                    ease: POWER2_OUT,
                });
                tweenField(particle, "alpha", "alphaCtrl", 0.15, {
                    duration: duration * 0.8,
                    delay,
                    ease: POWER2_OUT,
                });
            });

            window.clearTimeout(shatterTimeout);
            shatterTimeout = window.setTimeout(() => {
                if (destroyed) return;
                formIn();
            }, 650 / speed);
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

        const handleClick = (event: MouseEvent) => {
            // The logo is its own click target — this stops the click from
            // bubbling to whatever the canvas is nested inside (e.g. the
            // portal card's own "click anywhere to navigate" handler),
            // which would otherwise cut the shatter off mid-animation.
            event.stopPropagation();
            const rect = canvas.getBoundingClientRect();
            shatter(event.clientX - rect.left, event.clientY - rect.top);
            onActivate?.();
        };

        // Uncontrolled mode (no `active` prop): the component watches its
        // own scroll-into/out-of-viewport transitions directly.
        let revealObserver: IntersectionObserver | undefined;

        const initialize = async () => {
            resize();

            await createParticles();

            if (destroyed) return;

            draw();

            if (active === undefined) {
                revealObserver = new IntersectionObserver(
                    ([entry]) => {
                        if (entry.isIntersecting) formIn();
                        else formOut();
                    },
                    { threshold: 0.2 },
                );
                revealObserver.observe(canvas);
            } else {
                // Keeps the watcher effect's own comparison in sync with
                // whatever this mount-time decision actually was, so it
                // correctly recognizes the *next* real change rather than
                // mistaking it for a no-op (see lastAppliedActiveRef above).
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

            window.clearTimeout(shatterTimeout);

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
                "mouseleave",
                handleMouseLeave
            );

            canvas.removeEventListener(
                "click",
                handleClick
            );
        };
        // `active`'s initial value (read once, above) decides whether this
        // setup drives itself via IntersectionObserver or waits to be
        // told — deliberately excluded here so toggling it afterward
        // (handled by the separate effect above, via controlsRef) doesn't
        // tear down and rebuild the whole canvas/particle setup.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        src,
        particleCount,
        speed,
        disperseStrength,
        size,
    ]);

    // No inline width/height, and no `h-full w-full` baked in. Both used to
    // be here, and an inline style beats every class the caller passes — so a
    // caller asking for `h-[min(58vw,420px)]` silently got a canvas stretched
    // to its flex parent instead. In the end-of-flight cluster that parent is
    // the full viewport, which meant a ~1400x760 canvas clearing, gradient-
    // filling and redrawing every particle each frame (and it shoved the
    // tagline and signature to opposite edges of the screen). The caller owns
    // the box; `resize()` reads whatever that box actually is.
    return (
        <canvas
            ref={canvasRef}
            className={`block cursor-pointer ${className}`}
        />
    );
}
