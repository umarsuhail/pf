"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FLIGHT_SECTION_STOPS } from "../data/flightStops";
import { progressFromScroll } from "../data/flightTimeline";
import { playTick, primeTicks } from "../lib/tick-sound";
import { useTravelGear } from "../lib/travel-gear";
import DialGearButton from "./DialGearButton";

// Dial moves are discrete and must not inherit the document's global smooth
// scrolling. The 3D camera owns the short visual settle after the document
// lands; adding browser easing underneath it is what made the dial feel
// slippery and let several section moves blend into one long glide.
function scrollToProgress(p: number) {
  window.dispatchEvent(
    new CustomEvent("navigate-flight-progress", {
      detail: { progress: Math.min(1, Math.max(0, p)), source: "dial" },
    }),
  );
}

// Mandatory snapping and a hand on the ring are the same argument had twice:
// both decide where the document lands. The ring wins while it is being
// turned — the flight has to follow it continuously, in every gear — so the
// flight suspends its landings for the length of the gesture.
function announceTurning(turning: boolean) {
  window.dispatchEvent(
    new CustomEvent("flight-dial-turn", { detail: { turning } }),
  );
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
// audible click. Feedback follows physical rotation only; document scroll
// never drives the ring or its detents.
const DETENTS = 36;
const DETENT_DEGREES = TURN / DETENTS;

// Turning the ring travels *continuously*: a quarter of the way through the
// gear's rotation is a quarter of the way to the next section, and the flight
// moves under the finger the whole time.
//
// This replaces a sector model — turn 48°, release, and the page jumped a
// whole section — which made the dial a set of buttons arranged in a circle
// and left the ring with nothing to say in between them. How much rotation a
// section costs is the gear's decision now (lib/travel-gear.ts): three full
// revolutions in first, one in second, a third of one in third. The detents
// are what make that legible — 108 clicks to cross a section in first gear,
// 12 in third — so the ring reports the distance, not just the arrival.
//
// Movement below MIN_TRAVEL is the hand resting rather than travelling, and
// re-dispatching scroll for it would only fight the camera's own settle.
const MIN_TRAVEL = 0.0004;

const BEZEL_RETURN_TRANSITION = "transform 380ms cubic-bezier(0.2,0.8,0.2,1)";

const stops = FLIGHT_SECTION_STOPS;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function getActiveId(p: number) {
  let id = stops[0]?.id ?? "home";
  for (const stop of stops) if (p >= stop.progress) id = stop.id;
  return id;
}

function nearestStopIndex(p: number) {
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;
  stops.forEach((stop, index) => {
    const candidate = Math.abs(stop.progress - p);
    if (candidate < distance) {
      nearest = index;
      distance = candidate;
    }
  });
  return nearest;
}

// The dial's own coordinate: stop index plus the fraction travelled toward
// the next one, so 1.0 of it is always exactly one section no matter how
// unevenly the stops are spaced along the track (Experience -> Contact is
// nearly three times the span of Projects -> Experience). Turning the ring
// moves in *this* space and converts back, which is why a revolution is one
// section everywhere on the flight rather than one section's worth of raw
// progress carried over into the next.
function turnFromProgress(p: number) {
  const last = stops.length - 1;
  for (let i = 0; i < last; i++) {
    const from = stops[i].progress;
    const to = stops[i + 1].progress;
    if (p < to || i === last - 1) {
      return i + (p - from) / Math.max(to - from, 1e-6);
    }
  }
  return 0;
}

function progressFromTurn(turn: number) {
  const last = stops.length - 1;
  const clamped = Math.min(last, Math.max(0, turn));
  const index = Math.min(last - 1, Math.floor(clamped));
  const from = stops[index].progress;
  const to = stops[index + 1].progress;
  return clamp01(from + (to - from) * (clamped - index));
}

// Where the document actually is, right now. The flight only broadcasts
// progress once something moves, so on a reload into a restored scroll
// position this is the only source for the dial's opening state.
function readProgress() {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  // Through the timeline, not straight across: scroll position and flight
  // progress are different clocks (see data/flightTimeline.ts), and reading
  // one as the other puts the dial's opening label in the wrong section by
  // however much the layover leg has been stretched.
  return clamp01(progressFromScroll(window.scrollY / max));
}

// 0° = straight up, increasing clockwise — the watch convention, and the same
// one the pointer maths below uses, so the two never need converting.
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// --- The bezel's engraved ring ------------------------------------------
// Built once at module scope. These never change, and rebuilding them on every
// render of a component that reports scroll would be needless work.
//
// Two densities. The engraved ring is 72 lines; on a phone that is 72 vector
// nodes inside a layer that rotates under the finger, which on a low-end GPU
// is real money for detail that is roughly one device pixel wide at 68px
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
  // How much ground one turn of the ring covers. The wheel reads the same
  // gear for its own landings (see MultiverseFlight), which is what keeps the
  // two inputs feeling like two speeds of one vehicle rather than two
  // unrelated controls.
  const gear = useTravelGear();
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
  // Where the gesture started, in the dial's own turn coordinate, and how far
  // the ring has been turned since. Travel is always start + rotation/ratio
  // rather than an accumulation of per-frame steps, so a long turn cannot
  // drift the traveller away from what the ring itself reads.
  const turnStartRef = useRef(0);
  const gestureRotationRef = useRef(0);
  // The ring's absolute angle, persisted across gestures: a bezel that snaps
  // back to zero every time you let go is a slider, not a bezel.
  const bezelAngleRef = useRef(0);
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

  const applyBezelRotation = useCallback((degrees: number) => {
    if (bezelRef.current) {
      bezelRef.current.style.transform = `rotate(${degrees}deg)`;
    }
  }, []);

  const applyVisual = useCallback((p: number) => {
    progressRef.current = p;
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
      if (typeof detail?.progress === "number") {
        const progress = clamp01(detail.progress);
        applyVisual(progress);
        setActiveId(getActiveId(progress));
      }
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
  // DOM here instead.
  //
  // activeId is re-seeded here too, and that is not belt-and-braces. Its
  // useState initialiser runs during the first render, which for this
  // component is *before the flight's track exists*: the dial is mounted
  // with ssr:false, so on that render `scrollHeight - innerHeight` is not yet
  // the 2200svh corridor and readProgress() answers 0. The label therefore
  // opened on "Hello" — and because the flight only broadcasts progress when
  // the camera spring actually moves, reloading deep in the page left it
  // reading "Hello" until the visitor scrolled, no matter where they were.
  useEffect(() => {
    applyVisual(readProgress());
    // Deferred a frame, for the same reason it is needed at all: the track
    // has to have been laid out before readProgress() can mean anything, and
    // a synchronous setState in an effect body is a cascading render besides.
    const frame = requestAnimationFrame(() => {
      const progress = readProgress();
      applyVisual(progress);
      setActiveId(getActiveId(progress));
    });
    return () => cancelAnimationFrame(frame);
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
    (p: number) => {
      const clamped = clamp01(p);
      applyVisual(clamped);
      setActiveId(getActiveId(clamped));
      scrollToProgress(clamped);
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
      gestureRotationRef.current = 0;
      pinchStartDistanceRef.current = Math.hypot(b.x - a.x, b.y - a.y);
      pinchStartScaleRef.current = dialScaleRef.current;
      return;
    }

    draggingRef.current = true;
    setDragging(true);
    announceTurning(true);
    // React state updates after this event. Disable easing synchronously so
    // even the first pointer sample tracks the finger instead of lagging.
    if (bezelRef.current) bezelRef.current.style.transition = "none";
    lastAngleRef.current = pointerAngle(e.clientX, e.clientY);
    // The gesture is measured from where the flight actually is, so grabbing
    // the ring after scrolling with the wheel picks up from there rather
    // than from wherever the last turn left off.
    turnStartRef.current = turnFromProgress(progressRef.current);
    gestureRotationRef.current = 0;
    lastDetentRef.current = Math.round(bezelAngleRef.current / DETENT_DEGREES);
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
    // A pointermove with no button held is a hover, and hovers fire over this
    // element constantly. If a release was ever missed — capture lost, the
    // button let go outside the window, a context menu eating the pointerup —
    // the drag flag would still be set and every hover after that would fly
    // the page. Treat the absence of a button as the release it is.
    if (e.pointerType === "mouse" && e.buttons === 0) {
      endDrag();
      return;
    }
    const angle = pointerAngle(e.clientX, e.clientY);

    // Unwrap across the ±180° seam. Without this, turning up through 12
    // o'clock reads as a 359° jump backwards and the flight lurches the
    // length of the page.
    let delta = angle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    lastAngleRef.current = angle;

    gestureRotationRef.current += delta;
    bezelAngleRef.current += delta;
    applyBezelRotation(bezelAngleRef.current);

    // One click per detent crossed, fired from the crossing rather than a
    // timer, so the rate of clicking is the rate the ring is actually being
    // turned. Read off the ring's absolute angle, not the gesture's, so the
    // clicks stay evenly spaced across a release and re-grab.
    const detent = Math.round(bezelAngleRef.current / DETENT_DEGREES);
    if (detent !== lastDetentRef.current) detentFeedback(detent);

    // The whole of the travel, recomputed from the gesture's origin: the
    // flight follows the ring continuously instead of waiting for a sector
    // to complete. `degreesPerSection` is the gear ratio — the same rotation
    // covers three times as much ground in second as in first.
    const travelled =
      turnStartRef.current + gestureRotationRef.current / gear.degreesPerSection;
    const next = progressFromTurn(travelled);
    if (Math.abs(next - progressRef.current) < MIN_TRAVEL) return;
    commit(next);
  };

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    // Landings are the wheel's again. In a gear that has them, the browser
    // settles to the nearest one from wherever the ring was let go — which
    // is what a landing means; only first gear leaves you exactly there.
    announceTurning(false);
    gestureRotationRef.current = 0;
    if (bezelRef.current) {
      bezelRef.current.style.transition = BEZEL_RETURN_TRANSITION;
    }

    // Third gear lands. It is the section-to-section gear, so letting go
    // between two of them would be the one thing it is not for — the ring is
    // eased the remaining fraction of a section so the landing is visible on
    // the bezel too, not just in the page.
    //
    // First and second leave the traveller exactly where they stopped:
    // stopping between two places is the whole point of a low gear, and a
    // snap-back would undo the last part of every careful turn.
    if (!gear.settlesOnStops) return;

    const landing = stops[nearestStopIndex(progressRef.current)];
    if (!landing) return;
    const remainder =
      turnFromProgress(landing.progress) - turnFromProgress(progressRef.current);
    bezelAngleRef.current += remainder * gear.degreesPerSection;
    applyBezelRotation(bezelAngleRef.current);
    lastDetentRef.current = Math.round(bezelAngleRef.current / DETENT_DEGREES);
    commit(landing.progress);
  }, [applyBezelRotation, commit, gear]);

  // The release can arrive anywhere.
  //
  // Pointer capture is supposed to guarantee that the pointerup comes back to
  // the element that took it, and usually it does — but capture is lost on a
  // context menu, on a browser gesture, on a re-render that swaps the node,
  // and on anything that interrupts the pointer stream. Every one of those
  // left the dial believing a hand was still on it: incoming flight progress
  // was ignored (so the label froze wherever it was) and the next hover over
  // the ring scrolled the page. Listening for the release on the window for
  // the length of the drag closes all of those at once.
  useEffect(() => {
    if (!dragging) return;
    const release = () => endDrag();
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    // A drag that survives the tab going away is a drag nobody is holding.
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [dragging, endDrag]);

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

  // Keyboard travel. One key, one section — and the ring turns the gear's
  // worth of degrees to get there, so what a keyboard user sees the bezel do
  // is the same movement a hand would have had to make.
  const toSection = (direction: 1 | -1) => {
    const currentIndex = nearestStopIndex(progressRef.current);
    const targetIndex = Math.min(
      stops.length - 1,
      Math.max(0, currentIndex + direction),
    );
    const target = stops[targetIndex];
    if (!target) return;
    const turned =
      turnFromProgress(target.progress) - turnFromProgress(progressRef.current);
    if (bezelRef.current) {
      bezelRef.current.style.transition = BEZEL_RETURN_TRANSITION;
    }
    bezelAngleRef.current += turned * gear.degreesPerSection;
    applyBezelRotation(bezelAngleRef.current);
    lastDetentRef.current = Math.round(bezelAngleRef.current / DETENT_DEGREES);
    commit(target.progress);
    playTick(direction > 0 ? 1.05 : 0.92, 0.28);
  };

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => toSection(1),
      ArrowUp: () => toSection(1),
      ArrowLeft: () => toSection(-1),
      ArrowDown: () => toSection(-1),
      PageDown: () => toSection(1),
      PageUp: () => toSection(-1),
      Home: () => commit(stops[0]?.progress ?? 0),
      End: () => commit(stops[stops.length - 1]?.progress ?? 1),
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
  // GPU: each one rasterises its subtree into an offscreen buffer. The lume
  // reads fine as flat colour at 68px, so compact mode skips those layers.
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
          ? "bottom-0 left-1/2 w-52 max-w-[calc(100vw-1rem)] -translate-x-1/2 pb-3"
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
        // The dial's position must not depend on the label above it. On
        // phones the wrapper is a fixed width and the dial is centred in it;
        // on desktop the wrapper is shrink-to-fit and right-anchored, so its
        // width is whatever the label needs — left-aligning the face in there
        // meant "Experience" pushed the dial sideways and "Hello" pulled it
        // back. Pinning the face to the wrapper's right edge (the same edge
        // the label grows inward from, and the origin its scale grows from)
        // leaves it still while the name changes.
        className={
          compact
            ? "mx-auto -my-5 w-fit touch-none p-5"
            : "-m-5 flex justify-end touch-none p-5"
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={endDrag}
        onWheel={onWheel}
      >
        <svg
          ref={rootRef}
          role="slider"
          tabIndex={0}
          aria-label="Rotary flight control — turn and release to move one section, hold to continue, pinch to resize"
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
            // Mid-drag the ring tracks the hand exactly. Release uses a
            // slightly longer mechanical return, like a telephone rotary.
            transition: dragging ? "none" : BEZEL_RETURN_TRANSITION,
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

        {/* A fixed face track. It deliberately does not fill with scroll
           progress: the rotary is a physical input, not a scroll indicator. */}
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="2.5"
        />
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="url(#dial-lume)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8 269"
          transform="rotate(-94 60 60)"
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

        {/* The middle of the face is the gearbox — see DialGearButton.
           It replaces the page number that used to sit here: with the section
           named on the card directly above the dial, the centre was spending
           the only readout the face has on a figure that was already legible
           two centimetres away, while the gear — which changes how far every
           gesture travels — had nowhere to live. The number is still spoken
           in the slider's aria-valuetext, so nothing was lost for a screen
           reader. */}
        <DialGearButton compact={compact} />

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
