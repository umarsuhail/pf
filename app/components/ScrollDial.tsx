"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cards, sectionProgressMap } from "../data/sections";
import { playTick, primeTicks } from "../lib/tick-sound";

// Scrolling the real document is what drives the flight — the dial is just
// another input onto that same scroll position, like the wheel or a key.
// `behavior: "auto"` is deliberate on a live scrub: globals.css sets
// `scroll-behavior: smooth` on <html>, and inheriting that would turn every
// frame of a drag into its own competing smooth-scroll animation.
function scrollToProgress(p: number, behavior: ScrollBehavior = "auto") {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return;
  window.scrollTo({ top: max * Math.min(1, Math.max(0, p)), behavior });
}

// A rotating bezel, not a potentiometer.
//
// The previous dial swept a fixed -145°..145° arc with a dead gap at the
// bottom, because it read the pointer's *absolute* angle: with a full circle
// there is no way to tell "just past the start" from "just before the end",
// so the arc had to be cut open to stay unambiguous.
//
// A physical bezel — the Watch 4 Classic's is the reference here — has no
// absolute position at all. You grab it and turn, and it turns; where it
// started is irrelevant. Tracking the *delta* between pointer samples rather
// than the angle itself gives exactly that, and with it the whole 360° comes
// back: the ring is continuous, it can be spun past a full turn, and there is
// no dead zone to steer around. It also means one full turn = one full
// journey, which is a far better mental model than "sweep this 290° arc".
const TURN = 360;

// The real bezel is a notched ring: 36 detents, one every 10°, each with an
// audible click. Matching the count matters more than it sounds — it sets how
// much scroll one "click" is worth (1/36th of the flight), which is what makes
// a slow turn feel like it is stepping through content rather than sliding.
const DETENTS = 36;
const DETENT_PROGRESS = 1 / DETENTS;

// On release, a stop this close pulls the dial onto it. Roughly one detent:
// close enough that the intent was obviously that section, far enough that
// stopping deliberately between two of them is still respected.
const RELEASE_SNAP_WINDOW = 0.03;

const stops = cards.map((card) => ({
  id: card.id,
  label: card.eyebrow.split("/").slice(1).join("/").trim() || card.id,
  progress: sectionProgressMap[card.id] ?? 0,
}));

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function getActiveId(p: number) {
  let id = stops[0]?.id ?? "home";
  for (const stop of stops) if (p >= stop.progress) id = stop.id;
  return id;
}

function nearestStop(p: number) {
  return stops.reduce((best, stop) =>
    Math.abs(stop.progress - p) < Math.abs(best.progress - p) ? stop : best,
  );
}

// Where the document actually is, right now. The flight only broadcasts
// progress once something moves, so on a reload into a restored scroll
// position this is the only source for the dial's opening state.
function readProgress() {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? clamp01(window.scrollY / max) : 0;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// 0° = straight up, increasing clockwise — the watch convention, and the same
// one the pointer maths below uses, so the two never need converting.
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Progress 1 would make start and end the same point, which SVG draws as
// nothing at all rather than as a closed circle. Stopping a hair short keeps
// the ring visually complete without the degenerate case.
function describeArc(r: number, fromDeg: number, toDeg: number) {
  const sweep = Math.min(toDeg - fromDeg, 359.99);
  const start = polar(60, 60, r, fromDeg);
  const end = polar(60, 60, r, fromDeg + sweep);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${
    sweep > 180 ? 1 : 0
  } 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

// --- The bezel's engraved ring ------------------------------------------
// Built once at module scope. These never change, and rebuilding them on every
// render of a component that tracks scroll would be the most expensive thing
// in the file.
//
// Two densities. The engraved ring is 72 lines; on a phone that is 72 vector
// nodes inside a layer that rotates on every scroll frame, which on a low-end
// GPU is real money for detail that is roughly one device pixel wide at 68px
// across. The compact ring keeps the machined read at a third of the nodes.
function buildKnurls(count: number) {
  const everyDeg = 360 / count;
  const majorEvery = count / 12; // 12 "hour" marks regardless of density
  return Array.from({ length: count }, (_, i) => {
    const deg = i * everyDeg;
    const major = i % majorEvery === 0;
    const inner = polar(60, 60, major ? 50.5 : 52.5, deg);
    const outer = polar(60, 60, 57.5, deg);
    return { deg, major, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  });
}

const KNURLS_FULL = buildKnurls(72);
const KNURLS_COMPACT = buildKnurls(24);

// Same 1024px line MultiverseFlight uses for `isMobile`, so the dial and the
// scene it reports on never disagree about which layout they are in.
const COMPACT_QUERY = "(max-width: 1023px)";
const MIN_DIAL_SCALE = 1;
const COMPACT_MAX_DIAL_SCALE = 2.25;
const DESKTOP_MAX_DIAL_SCALE = 1.7;

export default function ScrollDial() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches,
  );
  const [activeId, setActiveId] = useState(() => getActiveId(readProgress()));
  const [dragging, setDragging] = useState(false);
  const [pinching, setPinching] = useState(false);
  const [dialScale, setDialScale] = useState(1);
  const [isVisible, setIsVisible] = useState(true);

  // Everything the scroll broadcast touches lives in refs and is written
  // straight to the DOM. `flight-progress-update` fires on every scroll tick
  // (~60/s); routing that through setState would re-render the whole dial —
  // ~90 bezel nodes included — once a frame for the entire length of the
  // page. Only activeId (a handful of changes per journey) is state.
  const progressRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastDetentRef = useRef(0);
  // Whether the drag in progress came from a finger — see detentFeedback.
  const isTouchDragRef = useRef(false);
  const pointersRef = useRef(
    new Map<number, { x: number; y: number; type: string }>(),
  );
  const pinchingRef = useRef(false);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const dialScaleRef = useRef(1);

  const rootRef = useRef<SVGSVGElement>(null);
  const bezelRef = useRef<SVGGElement>(null);
  const arcRef = useRef<SVGPathElement>(null);

  const maxDialScale = compact
    ? COMPACT_MAX_DIAL_SCALE
    : DESKTOP_MAX_DIAL_SCALE;

  const applyScaleVisual = useCallback((scale: number) => {
    dialScaleRef.current = scale;
    if (rootRef.current) {
      rootRef.current.style.transform = `scale(${scale})`;
    }
  }, []);

  const commitScale = useCallback(
    (scale: number) => {
      const next = Math.min(maxDialScale, Math.max(MIN_DIAL_SCALE, scale));
      applyScaleVisual(next);
      setDialScale(next);
    },
    [applyScaleVisual, maxDialScale],
  );

  const applyVisual = useCallback((p: number) => {
    progressRef.current = p;
    if (bezelRef.current) {
      bezelRef.current.style.transform = `rotate(${p * TURN}deg)`;
    }
    if (arcRef.current) {
      arcRef.current.setAttribute("d", describeArc(44, 0, p * TURN));
    }
    rootRef.current?.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  }, []);

  // Mirrors the journey rail's own show/hide, driven from the cockpit tray.
  useEffect(() => {
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ visible?: boolean }>).detail;
      setIsVisible((prev) => detail?.visible ?? !prev);
    };
    window.addEventListener("toggle-route-map", onToggle as EventListener);
    return () =>
      window.removeEventListener("toggle-route-map", onToggle as EventListener);
  }, []);

  // The flight broadcasts camera progress (not raw scroll) — see
  // MultiverseFlight. Ignored mid-drag so an incoming frame can't fight the
  // hand that is currently turning the ring.
  useEffect(() => {
    const onProgress = (event: Event) => {
      if (draggingRef.current) return;
      const detail = (
        event as CustomEvent<{ progress?: number; activeId?: string }>
      ).detail;
      if (typeof detail?.progress === "number") applyVisual(clamp01(detail.progress));
      if (detail?.activeId) setActiveId(detail.activeId);
    };
    window.addEventListener("flight-progress-update", onProgress as EventListener);
    return () =>
      window.removeEventListener("flight-progress-update", onProgress as EventListener);
  }, [applyVisual]);

  useEffect(() => {
    primeTicks();
  }, []);

  // matchMedia, not a resize listener: this fires twice per session rather
  // than on every pixel of a mobile URL-bar slide, which is exactly the kind
  // of churn that makes a scroll-tracking component expensive on a phone.
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // First paint. The markup below renders at a static zero — reading
  // progressRef during render would be both a lint error and a lie, since a
  // ref change never triggers one — so the opening frame is written to the
  // DOM here instead. activeId is seeded in its own initialiser above, which
  // keeps this effect to pure DOM writes.
  useEffect(() => {
    applyVisual(readProgress());
  }, [applyVisual]);

  // If an orientation/breakpoint change lowers the allowed maximum, settle
  // the dial back inside the new viewport-safe range.
  useEffect(() => {
    commitScale(dialScaleRef.current);
  }, [commitScale]);

  // One detent's worth of feedback: the click the ring makes, plus the haptic
  // on hardware that has one. Fired from the crossing, not from a timer, so it
  // tracks how fast the ring is actually turning.
  //
  // The haptic is gated on the drag having come from a finger. Chrome requires
  // a real *tap* before it will honour navigator.vibrate — a mouse press does
  // not count, and calling it anyway does not throw, it logs an intervention
  // to the console on every single detent. Gating on pointerType is also just
  // correct: a vibration is a touch-device affordance, and a mouse user is
  // already getting the tick.
  const detentFeedback = useCallback((index: number) => {
    lastDetentRef.current = index;
    playTick(1.35, 0.22);
    if (!isTouchDragRef.current) return;
    try {
      navigator.vibrate?.(6);
    } catch {
      /* unsupported, or blocked by a permissions policy — the click carries it */
    }
  }, []);

  const commit = useCallback(
    (p: number, behavior: ScrollBehavior = "auto") => {
      const clamped = clamp01(p);
      applyVisual(clamped);
      setActiveId(getActiveId(clamped));
      scrollToProgress(clamped, behavior);
    },
    [applyVisual],
  );

  const pointerAngle = (clientX: number, clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    return Math.atan2(dx, -dy) * (180 / Math.PI);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });

    const touchPoints = [...pointersRef.current.values()].filter(
      (pointer) => pointer.type === "touch",
    );
    if (touchPoints.length >= 2) {
      const [a, b] = touchPoints;
      pinchingRef.current = true;
      setPinching(true);
      draggingRef.current = false;
      setDragging(false);
      pinchStartDistanceRef.current = Math.hypot(b.x - a.x, b.y - a.y);
      pinchStartScaleRef.current = dialScaleRef.current;
      return;
    }

    draggingRef.current = true;
    setDragging(true);
    lastAngleRef.current = pointerAngle(e.clientX, e.clientY);
    lastDetentRef.current = Math.round(progressRef.current / DETENT_PROGRESS);
    isTouchDragRef.current = e.pointerType === "touch";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointersRef.current.get(e.pointerId);
    if (pointer) {
      pointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: pointer.type,
      });
    }

    if (pinchingRef.current) {
      const touchPoints = [...pointersRef.current.values()].filter(
        (item) => item.type === "touch",
      );
      if (touchPoints.length < 2) return;
      const [a, b] = touchPoints;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const startDistance = Math.max(1, pinchStartDistanceRef.current);
      const next = Math.min(
        maxDialScale,
        Math.max(
          MIN_DIAL_SCALE,
          pinchStartScaleRef.current * (distance / startDistance),
        ),
      );
      applyScaleVisual(next);
      return;
    }

    if (!draggingRef.current) return;
    const angle = pointerAngle(e.clientX, e.clientY);

    // Unwrap across the ±180° seam. Without this, turning up through 12
    // o'clock reads as a 359° jump backwards and the flight lurches the
    // length of the page.
    let delta = angle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    lastAngleRef.current = angle;

    const next = clamp01(progressRef.current + delta / TURN);
    commit(next);

    const detent = Math.round(next / DETENT_PROGRESS);
    if (detent !== lastDetentRef.current) detentFeedback(detent);
  };

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);

    // The dial's own version of what CSS scroll snap does for the wheel: let
    // go near a section and the ring settles onto it. Same threshold idea as
    // `proximity`, applied here because a programmatic scrub is not a gesture
    // the snap engine will act on.
    const stop = nearestStop(progressRef.current);
    if (Math.abs(stop.progress - progressRef.current) <= RELEASE_SNAP_WINDOW) {
      commit(stop.progress, prefersReducedMotion() ? "auto" : "smooth");
      playTick(0.9, 0.3);
    }
  }, [commit]);

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (pinchingRef.current) {
      if (pointersRef.current.size < 2) {
        pinchingRef.current = false;
        setPinching(false);
        commitScale(dialScaleRef.current);
      }
      return;
    }
    endDrag();
  };

  const step = (detents: number) =>
    commit(progressRef.current + detents * DETENT_PROGRESS);

  const toSection = (direction: 1 | -1) => {
    const current = progressRef.current;
    const ordered = direction === 1 ? stops : [...stops].reverse();
    const next = ordered.find((s) =>
      direction === 1 ? s.progress > current + 0.001 : s.progress < current - 0.001,
    );
    commit(next ? next.progress : direction === 1 ? 1 : 0, "smooth");
  };

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowUp: () => step(1),
      ArrowLeft: () => step(-1),
      ArrowDown: () => step(-1),
      PageDown: () => toSection(1),
      PageUp: () => toSection(-1),
      Home: () => commit(0, "smooth"),
      End: () => commit(1, "smooth"),
      "+": () => commitScale(dialScaleRef.current + 0.15),
      "=": () => commitScale(dialScaleRef.current + 0.15),
      "-": () => commitScale(dialScaleRef.current - 0.15),
      "0": () => commitScale(1),
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Desktop trackpads expose pinch as ctrl+wheel. Restricting the resize to
    // that modifier keeps ordinary wheel scrolling available to the flight.
    if (!e.ctrlKey) return;
    e.preventDefault();
    commitScale(dialScaleRef.current - e.deltaY * 0.004);
  };

  // The dial reads the flight's section stops, which only exist on "/".
  // On a detail page it would be a ring of labels for a scroll position that
  // means nothing.
  if (pathname !== "/") return null;

  const activeLabel = stops.find((s) => s.id === activeId)?.label ?? stops[0]?.label ?? "";
  const activeIndex = stops.findIndex((s) => s.id === activeId);
  // Zero-padded to two digits to match the cards' own eyebrows and, more
  // practically, so the figure does not change width as it counts up and shift
  // itself off the dial's centre line.
  const pad = (n: number) => String(n).padStart(2, "0");
  const pageNumber = pad(Math.max(0, activeIndex) + 1);
  const pageTotal = pad(stops.length);
  const knurls = compact ? KNURLS_COMPACT : KNURLS_FULL;
  // Filters are the single most expensive thing an SVG can carry on a weak
  // GPU: each one rasterises its subtree into an offscreen buffer, and the pip
  // and arc here sit inside a layer that rotates on every scroll frame. The
  // lume reads fine as flat colour at 68px.
  const glow = (css: string) => (compact ? undefined : css);
  const size = compact ? 68 : 108;

  return (
    <div
      aria-hidden={!isVisible}
      // Phones put it bottom-centre, in the thumb arc and clear of the
      // browser's own sliding toolbar (hence the safe-area inset) — that
      // toolbar reclaiming the bottom of the screen mid-scroll is exactly what
      // makes dragging the page awkward, and this is the way around it that
      // does not involve dragging the page at all.
      //
      // Desktop puts it on the right edge, where the journey rail used to be:
      // one navigator instead of two things saying the same thing.
      className={`fixed z-50 transition-all duration-300 ${
        compact
          ? "bottom-0 left-1/2 -translate-x-1/2 pb-3"
          : "right-4 top-1/2 -translate-y-1/2 lg:right-8"
      } ${
        isVisible
          ? "opacity-100"
          : `pointer-events-none opacity-0 ${compact ? "translate-y-6" : "translate-x-6"}`
      }`}
      style={compact ? { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" } : undefined}
    >
      {/* The section being flown through, named — a small card of its own
         above the dial. It sits outside the face rather than inside it
         because the face now carries the page number, and because a name of
         unknown length ("Experience") cannot be lettered legibly inside a
         68px circle at any size worth reading.
         Right-aligned on desktop so a long name grows inward from the screen
         edge instead of off it; centred over the dial on phones. */}
      <div className={`mb-2 flex ${compact ? "justify-center" : "justify-end"}`}>
        <span className="whitespace-nowrap rounded-lg border border-white/12 bg-[linear-gradient(160deg,rgba(30,41,59,0.95),rgba(2,6,16,0.95))] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-sky-100 shadow-[0_6px_18px_rgba(2,8,23,0.5)]">
          {activeLabel}
        </span>
      </div>
      <div
        className="-m-5 touch-none p-5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onWheel={onWheel}
      >
        <svg
          ref={rootRef}
          role="slider"
          tabIndex={0}
          aria-label="Flight position — turn to travel, pinch to resize"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={`${activeLabel}, page ${pageNumber} of ${pageTotal}`}
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            dragging ? "cursor-grabbing" : pinching ? "cursor-zoom-in" : "cursor-grab"
          }`}
          style={{
            transform: `scale(${dialScale})`,
            transformOrigin: compact ? "bottom center" : "center right",
            transition: pinching
              ? "none"
              : "transform 220ms cubic-bezier(0.22,1,0.36,1)",
            willChange: pinching ? "transform" : undefined,
          }}
          onKeyDown={onKeyDown}
        >
        <defs>
          {/* Brushed steel. A linear ramp with repeated light/dark stops is
             what sells a machined ring at this size — a single gradient reads
             as plastic. */}
          <linearGradient id="dial-steel" x1="12%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="#8a97a8" />
            <stop offset="18%" stopColor="#59657a" />
            <stop offset="34%" stopColor="#97a5b6" />
            <stop offset="52%" stopColor="#4a5568" />
            <stop offset="70%" stopColor="#8593a6" />
            <stop offset="86%" stopColor="#495366" />
            <stop offset="100%" stopColor="#7c8b9e" />
          </linearGradient>
          <linearGradient id="dial-face" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#101a27" />
            <stop offset="55%" stopColor="#070d16" />
            <stop offset="100%" stopColor="#04080f" />
          </linearGradient>
          <linearGradient id="dial-lume" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          {/* Sheen across the top-left of the crystal, so the face reads as
             glass over a dial rather than as a flat hole. */}
          <radialGradient id="dial-crystal" cx="32%" cy="24%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* --- Case ------------------------------------------------------ */}
        <circle cx="60" cy="60" r="59" fill="#0b1019" />
        <circle
          cx="60"
          cy="60"
          r="58"
          fill="none"
          stroke="url(#dial-steel)"
          strokeWidth="2"
          opacity="0.55"
        />

        {/* --- Rotating bezel -------------------------------------------- */}
        {/* One transform on a group the browser has already promoted: turning
           the ring costs a composite, not a repaint of 72 engraved lines. */}
        <g
          ref={bezelRef}
          style={{
            transform: "rotate(0deg)",
            transformOrigin: "60px 60px",
            transformBox: "view-box",
            // Mid-drag the ring must track the hand exactly; released, a short
            // ease absorbs the step between scroll samples.
            transition: dragging ? "none" : "transform 260ms cubic-bezier(0.22,1,0.36,1)",
            willChange: "transform",
          }}
        >
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="url(#dial-steel)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="58"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.6"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="0.8"
          />
          {knurls.map((k) => (
            <line
              key={k.deg}
              x1={k.x1}
              y1={k.y1}
              x2={k.x2}
              y2={k.y2}
              stroke={k.major ? "rgba(226,240,255,0.85)" : "rgba(12,18,28,0.75)"}
              strokeWidth={k.major ? 1.5 : 0.9}
              strokeLinecap="round"
            />
          ))}
          {/* The lume pip. On a diver's bezel this is the mark you line up
             with the minute hand; here it is the flight's position, read
             against the fixed index on the case above it. */}
          <polygon
            points="60,1.5 64.4,10.5 55.6,10.5"
            fill="url(#dial-lume)"
            style={{ filter: glow("drop-shadow(0 0 3px rgba(125,211,252,0.9))") }}
          />
        </g>

        {/* --- Face ------------------------------------------------------ */}
        <circle cx="60" cy="60" r="49" fill="url(#dial-face)" />
        <circle
          cx="60"
          cy="60"
          r="49"
          fill="none"
          stroke="rgba(0,0,0,0.8)"
          strokeWidth="2"
        />

        {/* Unlit minute track, then the lit run of it travelled so far. */}
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="2.5"
        />
        <path
          ref={arcRef}
          d={describeArc(44, 0, 0)}
          fill="none"
          stroke="url(#dial-lume)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ filter: glow("drop-shadow(0 0 3px rgba(56,189,248,0.55))") }}
        />

        {/* Section indices, printed on the dial rather than on the bezel —
           they are the fixed scale the rotating ring is read against. */}
        {stops.map((stop, index) => {
          const deg = stop.progress * TURN;
          const inner = polar(60, 60, 38, deg);
          const outer = polar(60, 60, 44, deg);
          const passed = index <= activeIndex;
          return (
            <line
              key={stop.id}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={passed ? "#7dd3fc" : "rgba(226,240,255,0.28)"}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Page number, the way a watch shows a date: the big figure is where
           you are, the small one is how many there are. Numbered to match the
           cards' own eyebrows ("01 / Hello"), so the dial and the card in view
           always agree.

           This is plain state, not a per-frame ref write like the percent
           readout it replaces — the number changes a handful of times across
           the whole flight rather than sixty times a second, so a re-render on
           those few changes is cheaper than writing textContent on every tick.
           Continuous feedback while turning the bezel is the arc and the ring
           itself, which is where a watch puts it too. */}
        <text
          x="60"
          y={compact ? 62 : 60}
          textAnchor="middle"
          className={`fill-sky-50 font-semibold ${compact ? "text-[19px]" : "text-[24px]"}`}
          style={{ letterSpacing: "0.02em" }}
        >
          {pageNumber}
        </text>
        <text
          x="60"
          y={compact ? 74 : 75}
          textAnchor="middle"
          className={`fill-slate-400 font-semibold ${compact ? "text-[8px]" : "text-[9px]"}`}
          style={{ letterSpacing: "0.14em" }}
        >
          /{pageTotal}
        </text>

        {/* Crystal sheen. Skipped on phones — a full-face radial gradient over
           the dial is another composited layer for a highlight that is a few
           pixels wide at this size. */}
        {!compact && (
          <circle cx="60" cy="60" r="49" fill="url(#dial-crystal)" pointerEvents="none" />
        )}

        {/* --- Fixed index on the case ----------------------------------- */}
        {/* Outside the rotating group on purpose: a bezel is only legible
           against something that does not move with it. */}
        <polygon points="60,13 63,7 57,7" fill="#e2f2ff" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
}
