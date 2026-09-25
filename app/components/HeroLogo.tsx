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

    // Discrete twinkle burst, in performance.now() milliseconds. Zero when
    // the particle isn't mid-shimmer; only ever set by the shimmer
    // scheduler in draw(), which keeps at most SHIMMER_SLOTS of them
    // burning at a time.
    shimmerStart: number;
    shimmerEnd: number;

    // Where the particle was scattered to and the bend of its route home —
    // kept so a `progress`-driven assembly can place it anywhere along that
    // route on any frame, instead of tweening along it on a clock.
    startX: number;
    startY: number;
    controlX: number;
    controlY: number;

    // Set by the click burst: until this timestamp the particle draws as a
    // four-point spark whatever it usually is, so an impact throws off a
    // cloud of sparks rather than the same dust travelling faster.
    sparkUntil: number;

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
     * Inline box for the canvas. The caller owns the element's size (see
     * the render comment below), and a box computed from the live viewport
     * — as the end-of-flight mark's is — cannot be expressed as a static
     * class, so it arrives here instead.
     */
    style?: CSSProperties;

    /**
     * Fires on click, alongside (not instead of) the built-in scatter
     * flourish — the click handler already calls stopPropagation() to keep
     * the scatter from being cut off by an ancestor's own click handler, so
     * a parent that wants to react to the click (e.g. opening a panel)
     * needs this rather than its own onClick.
     */
    onActivate?: () => void;

    /**
     * Assembles the mark from a 0..1 value instead of on formIn's clock —
     * the page loader passes its real loading progress, so the US is exactly
     * as complete as the load is. Each particle is placed along the same
     * curved route formIn() flies it, staggered so the mark draws itself on
     * rather than arriving as one dissolve. At 1 the particles are home and
     * the ordinary physics (hover, twinkle, click scatter) takes over. When
     * set, `active` is ignored.
     */
    progress?: MotionValue<number>;

    /**
     * Shatters the mark into the starfield, 0..1. The particles burst
     * outward from the centre — the camera rushing through the US — and
     * `shatterInto.length` of them settle exactly on those star positions,
     * softening on the way from the mark's sparks into the field's own blue
     * dots; the rest burn out in flight. At 1 they are indistinguishable
     * from the stars SpaceParticles is about to be seeded with. Only
     * meaningful on a full-viewport canvas (the loader's).
     */
    shatter?: MotionValue<number>;
    shatterInto?: StarSeed[];

    /**
     * The closing mark forms out of the starfield rather than out of
     * nowhere: on formIn it asks SpaceParticles for the stars on screen,
     * which hides them, and its particles start from exactly those spots.
     * Released back to the field when the mark disperses. See lib/starfield.
     */
    gatherFromStars?: boolean;
};

type FormControls = { formIn: () => void; formOut: () => void };

// Three fixed colour bands the particles are drawn in. Kept as a lookup so
// draw() can batch by band rather than deriving a colour string per particle.
// Drawn with "lighter" compositing, so these accumulate where particles
// overlap — the denser strokes of the mark bloom to near-white on their own
// rather than needing a blur. Warmed and brightened from the previous
// values, which left the assembled mark reading as flat grey-blue dust.
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

// Every particle already breathes on its own low-amplitude sine (see draw()),
// which is the mark's ambient texture. On top of that, individual sparks
// catch the light one at a time: a slow flare up to white-hot and back down.
// Deliberately never more than two at once — the whole read of a twinkle is
// that the eye is drawn to a few points, and a field of them flaring together
// collapses back into the uniform pulse the sine already provides.
const SHIMMER_SLOTS = 2;
// Flare duration and the pause a slot takes before claiming its next spark.
// Both randomised per burst so the slots drift out of step instead of
// settling into a visible rhythm.
const SHIMMER_DURATION_MIN = 620;
const SHIMMER_DURATION_MAX = 1150;
const SHIMMER_GAP_MIN = 260;
const SHIMMER_GAP_MAX = 1400;
// A spark has to be essentially fully formed before it can be picked, so
// bursts never fire on particles still flying in or already dispersing.
const SHIMMER_MIN_ALPHA = 0.6;
// Peak size multiplier at the top of the flare.
const SHIMMER_GROWTH = 1.5;

// --- Pointer response ----------------------------------------------------
// Hovering used to do one thing: shove particles directly away from the
// cursor. Pure radial repulsion reads as a bubble being pushed around, so
// the field now also turns around the pointer, brightens under it and
// answers the pointer arriving — the mark behaves like something with its
// own charge rather than a surface being dented.
//
// How much of the repulsion is spent orbiting instead of fleeing. Enough to
// see the field wheel; past ~0.5 the mark visibly unwinds and takes a long
// time to settle back into legible glyphs.
const HOVER_SWIRL = 0.34;
// Brightness and size lift directly under the cursor, falling off to nothing
// at the edge of its radius. Applied through alpha and draw size only — the
// colour bands are what the draw loop batches by, so tinting per particle
// here would undo that batching.
const HOVER_LIFT = 0.85;
const HOVER_GROWTH = 0.7;
// The hover factor eases rather than snapping, so leaving the canvas relaxes
// the field instead of dropping it. Per millisecond.
const HOVER_EASE = 0.006;
// Sparks flare several times more often under a pointer — the mark reads as
// waking up to it.
const HOVER_SHIMMER_RUSH = 0.28;

// Shockwave rings: the visible half of an impulse. The particle kick is
// applied once, when the ring is created (a ring is only a few pixels wide,
// so testing every particle against it each frame would cost far more than
// the effect is worth and read no differently).
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

// Click: everything blows out from the pointer, the mark whites out for an
// instant, and the dust it throws burns as sparks on the way.
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
    // Populated synchronously by the setup effect below, read by the
    // separate `active`-prop-watching effect (and the click handler) so
    // triggering a reveal/scatter doesn't have to tear down and rebuild
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
        intensity: 0,
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

        // Moves both axes along one quadratic curve. A single controller owns
        // x and y so a new lifecycle action can cleanly interrupt the path.
        // Curved travel gives assembly a graceful orbit and keeps the click
        // scatter from looking like rigid, straight radial spokes.
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

        // Cached canvas dimensions — draw() runs every frame, and calling
        // getBoundingClientRect there is a forced layout read 60 times a
        // second. The size only changes on resize, so it's read once here.
        let viewW = 0;
        let viewH = 0;
        // The bloom gradient only depends on the canvas size, so it's built
        // here on resize rather than re-created inside every draw() frame.
        let halo: CanvasGradient | null = null;

        const resize = () => {
            // offsetWidth/Height, not getBoundingClientRect: the rect is
            // post-transform, and this canvas sits inside the closing beat's
            // own scale animation. Measured mid-scale, the backing store came
            // out at 0.9x its CSS box and the mark was drawn small and
            // stretched back up — a soft, faintly blurred logo. Offsets are
            // layout size, so they ignore the ancestor's transform.
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
                // The canvas can be intentionally larger than the mark so a
                // scatter has room to breathe. Key the resting glow to the
                // ink size, not that expanded drawing field, so the unchanged
                // UI does not suddenly inherit a much larger blue wash.
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

        const sampleLogo = (step = 3) => {
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
             * and denser than particleCount actually needs a source
             * pool for. 3px cuts that to ~27,900 while still leaving far
             * more candidate points than particles requested.
             *
             * Transparent pixels are ignored.
             */
            for (let y = 0; y < sampleSize; y += step) {
                for (let x = 0; x < sampleSize; x += step) {
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
            let points = await getLogoPoints();

            // The sampler's default 3px step leaves far more candidates than
            // the old counts needed, but a denser mark can genuinely outrun
            // it — and running short means silently drawing fewer particles
            // than asked for. Only then is the more expensive 2px pass worth
            // paying for (~62k reads against ~28k).
            if (points.length < particleCount * 1.3) {
                points = sampleLogo(2);
            }

            if (destroyed) return;

            particles.length = 0;

            // Layout size again (see resize): measured through the ancestor's
            // scale, every particle's home would be laid out for a smaller
            // box than the one being drawn into, hanging the mark off-centre.
            const canvasWidth = canvas.offsetWidth;
            const canvasHeight = canvas.offsetHeight;

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
                const startX = homeX + Math.cos(angle) * distance;
                const startY = homeY + Math.sin(angle) * distance;
                // The same bend formIn() applies, fixed per particle so a
                // progress-driven assembly retraces one stable route.
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

        // --- Pointer state ---------------------------------------------
        // `hover` is the eased 0-1 presence of the pointer, not the raw
        // boolean: every hover effect below is scaled by it, so the field
        // gathers itself back up when the pointer leaves instead of the
        // forces vanishing between one frame and the next.
        let hover = 0;
        let lastFrameTime = performance.now();
        // Live shockwaves, oldest first. Bounded — a visitor clicking as fast
        // as they can should not be able to accumulate rings.
        const rings: Ring[] = [];
        let flashUntil = 0;

        const addRing = (ring: Ring) => {
            rings.push(ring);
            if (rings.length > RING_LIMIT) rings.shift();
        };

        // One outward shove, applied when a wave is born rather than tracked
        // across the frames it expands through: at these speeds the eye reads
        // the kick and the ring as the same event either way, and this costs
        // one pass instead of one per frame for the ring's whole life.
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

        // The twinkle scheduler's whole state: SHIMMER_SLOTS "torches", each
        // holding at most one burning spark. A slot that isn't holding one is
        // waiting out its gap, so the number of particles flaring at any
        // instant can never exceed the slot count.
        const shimmerSlots = Array.from({ length: SHIMMER_SLOTS }, (_, i) => ({
            particle: null as Particle | null,
            // Staggered first claims so the slots don't both light up on the
            // very first formed frame.
            nextAt: i * 520,
        }));

        // Called once per frame, not per particle: retires finished bursts and
        // hands each free slot a new spark. Picking is a single random probe
        // rather than a filtered scan — at ~12% sparks a probe usually lands,
        // and when it doesn't the slot simply tries again a frame or two
        // later, which costs nothing and keeps the pick unbiased.
        const updateShimmer = (now: number) => {
            for (const slot of shimmerSlots) {
                const burning = slot.particle;
                if (burning) {
                    if (now < burning.shimmerEnd) continue;
                    slot.particle = null;
                    // Under a pointer the pauses between flares collapse, so
                    // the same two torches light far more often.
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
                    // Missed — retry shortly rather than burning the whole gap.
                    slot.nextAt = now + 80;
                    continue;
                }

                candidate.shimmerStart = now;
                candidate.shimmerEnd =
                    now + random(SHIMMER_DURATION_MIN, SHIMMER_DURATION_MAX);
                slot.particle = candidate;
            }
        };

        // True once the dormant branch below has wiped the canvas, so it
        // doesn't re-clear on every skipped frame.
        let dormantClean = false;
        let progressHandedOff = false;

        // --- Shatter -----------------------------------------------------
        type ShatterRoute = {
            sx: number; sy: number; cx: number; cy: number;
            tx: number; ty: number;
            /** Star size to settle as; 0 for a particle that burns out. */
            px: number;
        };
        let shatterPlan: ShatterRoute[] | null = null;

        // The field's point sprite (SpaceParticles' circle texture, tinted
        // and at its opacity), drawn once and stamped per star.
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

        // Pairs particles with stars *by angle around the centre*, so every
        // route leads outward — the burst reads as flying through the mark,
        // not as the particles shuffling to random seats.
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
                // Burn-outs: thrown straight out past the edges.
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
                // A slight, particle-specific curve so the burst swirls a
                // little instead of firing in straight spokes.
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
                // The bloom belongs to the whole mark; as the mark shatters
                // there is nothing left for it to be the glow of.
                const bloom = shatter ? 1 - Math.min(1, shatter.get()) : 1;
                ctx.globalAlpha = bloom;
                ctx.fillStyle = halo;
                ctx.fillRect(0, 0, viewW, viewH);
                ctx.globalAlpha = 1;
            }
            ctx.globalCompositeOperation = "lighter";

            /*
             * Mouse influence.
             */
            const mouse = mouseRef.current;
            mouse.intensity +=
                ((mouse.active ? 1 : 0) - mouse.intensity) * 0.075;
            const frameTime = performance.now();

            // Eased pointer presence. dt is clamped so a backgrounded tab
            // returning after seconds doesn't jump the field to full hover.
            const dt = Math.min(frameTime - lastFrameTime, 50);
            lastFrameTime = frameTime;
            const hoverTarget = mouse.active ? 1 : 0;
            hover += (hoverTarget - hover) * Math.min(1, HOVER_EASE * dt);

            updateShimmer(frameTime);

            // Radius scales with the mark: a fixed 140px reached across a
            // small mark entirely (so the whole thing fled the pointer) and
            // barely dimpled a large one.
            const hoverRadius = Math.max(90, size * 0.38);
            const flash =
                flashUntil > frameTime
                    ? (flashUntil - frameTime) / CLICK_FLASH_MS
                    : 0;
            // Progress-driven assembly (the loader). Places every particle on
            // its route home for the current progress, before the physics
            // below runs — zeroing its velocity so the spring does not fight
            // the placement. Hands over for good once progress reaches 1.
            if (progress && !progressHandedOff) {
                const value = Math.min(1, Math.max(0, progress.get()));
                for (const particle of particles) {
                    // Up to 45% of the bar of stagger: the last particles
                    // leave late but still land exactly at 1.
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

            // The shatter. Places every particle on its burst route for the
            // current value and holds the physics off while it runs (see
            // `shattering` below): the spring would pull each one a few
            // pixels back toward the mark every frame, and the whole point
            // is that they land *exactly* on the stars they hand over to.
            const shatterValue =
                shatter && shatterInto ? Math.min(1, Math.max(0, shatter.get())) : 0;
            const shattering = shatterValue > 0;
            if (shattering && !shatterPlan) shatterPlan = planShatter();
            if (shattering && shatterPlan) {
                // Fast out of the burst, easing into place: the flight
                // decelerates into the field rather than stopping on it.
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
                    // Kept particles hand their spark look over to the star
                    // sprite drawn after this pass; the rest simply burn out.
                    particle.alpha = route.px > 0 ? 1 - soften : 1 - burnOut;
                });
            }

            // Tracks the last colour band written to the context so the batch
            // below only reassigns fillStyle when the band actually changes.
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
                        // A restrained radial push plus a stronger tangent
                        // turns the old hard-edged hole into a fluid wake that
                        // curls around the pointer and settles gently.
                        particle.vx +=
                            (normalX * 0.2 - normalY * 0.42) * hoverLift;
                        particle.vy +=
                            (normalY * 0.2 + normalX * 0.42) * hoverLift;
                    }
                }

                /*
                 * Spring back toward logo.
                 */
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

                // Drawn in the canvas's own coordinate space — no save /
                // translate / rotate / restore per particle. Those four calls
                // times hundreds of particles times 60fps dominated this loop,
                // and at a 1-2px draw size the rotation they existed to apply
                // is not perceptible. `rotation` is still advanced for the
                // sparks, which are large enough to read it.
                const shimmer =
                    0.78 + Math.sin(frameTime * 0.002 + particle.twinkle) * 0.22;

                // The scheduler's flare, on top of the ambient sine: a half
                // sine over the burst's own span, so it rises to a peak and
                // falls back to nothing with no seam at either end. For all
                // but the one or two burning sparks this is a single compare.
                let burst = 0;
                if (particle.shimmerEnd > frameTime) {
                    const span = particle.shimmerEnd - particle.shimmerStart;
                    const t = (frameTime - particle.shimmerStart) / span;
                    burst = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));
                }

                // Flaring lifts the particle the rest of the way to fully
                // opaque rather than adding to it, so the burst can't clip
                // against globalAlpha's ceiling and flatten at its peak. The
                // pointer's own lift works the same way, so a particle under
                // the cursor brightens toward white without ever clipping.
                const lift = hoverLift * HOVER_LIFT + flash;
                ctx.globalAlpha =
                    particle.alpha *
                    Math.min(
                        1,
                        shimmer + burst * (1 - shimmer) + hoverLift * 0.18,
                    );

                const band = toneBand(particle.tone);
                if (band !== currentBand) {
                    // Particles are pre-sorted by band, so this runs ~3x per
                    // frame rather than once per particle.
                    currentBand = band;
                    ctx.fillStyle = TONE_COLORS[band];
                }

                if (burst > 0) {
                    // A flaring spark burns white regardless of its own band.
                    // Invalidating currentBand rather than restoring it lets
                    // the next particle reassign its own colour — two extra
                    // fillStyle writes per frame at most, since only the
                    // slot-held sparks ever reach this.
                    ctx.fillStyle = TONE_COLORS[2];
                    currentBand = -1;
                }

                const flare =
                    1 + burst * SHIMMER_GROWTH + hoverLift * 0.42;
                const drawX = particle.x;
                const drawY = particle.y;

                // Ordinary dust turns to sparks for the length of a click
                // burst, so an impact throws off something that reads as
                // debris catching the light rather than the same points
                // simply moving faster.
                if (particle.isSpark || particle.sparkUntil > frameTime) {
                    particle.rotation += particle.rotationSpeed;
                    const arm = particle.size * 2.2 * flare;
                    const thickness = particle.size * 0.78 * flare;
                    // An axis-aligned cross with a faint wider core instead of
                    // ctx.shadowBlur. Shadow blur is a native per-call blur
                    // pass; even at ~12% of the particles and two rects each it
                    // would be the single most expensive thing on the page,
                    // and it does not show up in a JS profile because the cost
                    // is native.
                    // The extra translucent square reads as the same bloom.
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

            // The stars the kept particles are becoming: the field's own soft
            // blue dot, at the size the field draws that star's depth at,
            // coming up as the spark fades. Normal blending, like the field.
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

            // Shockwaves, over the dust they threw. Still under "lighter",
            // so a ring crossing the mark brightens it rather than drawing a
            // grey hoop across it. Iterated backwards so finished rings can
            // be spliced out in the same pass.
            for (let i = rings.length - 1; i >= 0; i--) {
                const ring = rings[i];
                const t = (frameTime - ring.start) / ring.duration;
                // A ring can be scheduled a beat into the future; arc()
                // throws on a negative radius, so it waits rather than
                // drawing itself inside out.
                if (t < 0) continue;
                if (t >= 1) {
                    rings.splice(i, 1);
                    continue;
                }
                // Fast out of the gate, coasting as it widens and thins.
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

        // Whether the logo is currently formed (or forming) — guards
        // against redundant re-triggers, e.g. two intersection callbacks
        // firing in a row, or a redundant call from the `active`-prop
        // effect landing before/after this one.
        let visible = false;
        let releaseTimeout = 0;

        /*
         * FORM IN — fades particles up from nothing and draws them
         * together into the logo. One-shot: no auto-disperse/reform loop.
         */
        // `snap` is the reassembly after a click: shorter, and on a curve
        // that overshoots home and settles back, so the mark pulls itself
        // together with some recoil instead of drifting politely back the
        // way it does when it first forms.
        const formIn = (snap = false) => {
            if (visible || destroyed || particles.length === 0) return;
            visible = true;

            // Formed out of the starfield: the stars on screen are taken out
            // of the field and become the first particles of the mark, each
            // starting from where that star was.
            if (gatherFromStars) {
                const rect = canvas.getBoundingClientRect();
                // The canvas can be mid-scale (the closing beat animates its
                // parent); map viewport points into its layout coordinates.
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
                                    // Visible from the first frame, as the
                                    // star it just was.
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
                // Bend around the direct route by a stable, particle-specific
                // amount. Opposing bends interleave into a soft spiral while
                // the stagger keeps the logo drawing itself on rather than
                // arriving as one flat dissolve.
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

        /*
         * FORM OUT — scatters particles back outward and fades them, the
         * mirror image of formIn. Also one-shot. Shared by the scroll/
         * `active` lifecycle and the click-to-scatter handler below.
         */
        const formOut = () => {
            if (!visible || destroyed || particles.length === 0) return;
            visible = false;

            // The stars go back to the field once the scatter has carried
            // the mark's particles away, not while they are still the mark.
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
         * SPACE SHATTER — every point gets an independent polar destination in
         * one broad disc. Sampling radius by square root distributes particles
         * evenly by area, avoiding the four source-shaped clumps, a hollow ring,
         * or any other readable geometry while the mark is apart.
         */
        let scatterTimeout = 0;
        const scatterIntoSpace = (originX: number, originY: number) => {
            if (!visible || destroyed || particles.length === 0) return;
            visible = false;

            // The impact itself: a hard wave off the pointer and an instant
            // of white. Both are what sell the click as a strike rather than
            // the particles simply being told to leave.
            flashUntil = performance.now() + CLICK_FLASH_MS;
            // Everything here is sized against the canvas box rather than the
            // mark: a wave wider than the box is clipped to four arcs at the
            // edges, which reads as a circle drawn under a mask instead of
            // something expanding.
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
            // A second, slower wave a beat behind the first — one ring reads
            // as a circle drawn on the canvas, two read as a detonation.
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
                // Bow each path independently around its straight midpoint so
                // the burst stays organic without regrouping into directional
                // bands on its way outward.
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
            // The outward snap finishes around 1.25s; the remaining beat lets
            // the broad field hang in space before the softer return begins.
            scatterTimeout = window.setTimeout(() => {
                if (destroyed) return;
                formIn();
            }, 1780 / speed);
        };

        // Pointer position in the canvas's own drawing space. The rect is
        // where the canvas actually sits on screen, transforms included, so
        // dividing by how much it is scaled is what keeps the cursor and the
        // particles it pushes in the same place while the closing beat is
        // still scaling in.
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
            // Canvas space, not client space: the closing beat scales the
            // mark, so a raw clientX/clientY offset drifts away from the
            // particles it is supposed to be pushing.
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

        // The pointer arriving is its own small event: a soft wave off the
        // entry point, so the mark acknowledges being approached instead of
        // only reacting once the cursor is already inside it.
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
            // The logo is its own click target — this stops the click from
            // bubbling to whatever the canvas is nested inside (e.g. the
            // portal card's own "click anywhere to navigate" handler),
            // which would otherwise cut the scatter off mid-animation.
            event.stopPropagation();
            mouseRef.current.active = false;
            canvas.style.cursor = "default";
            scatterIntoSpace(x, y);
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

            if (progress) {
                // Drawn from the first frame; placement comes from progress,
                // not from formIn's tweens.
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
        progress,
        shatter,
        shatterInto,
        gatherFromStars,
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
            className={`block ${className}`}
            style={style}
        />
    );
}
