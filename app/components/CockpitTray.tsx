"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cards } from "../data/sections";
import { NARRATION_SPANS } from "../data/narration";
import { CardIcon } from "./icons/card-icon";
import { BotMessageSquareIcon } from "./icons/bot-message-square";
import { XIcon } from "./icons/x";
import type { AnimatedIconHandle } from "./icons/card-icon";

// Overhead console: a small latch sits on the top edge, and pulling it drops
// the whole assembly into the cockpit — a centre nav console flanked by two
// equipment bays, all hanging off one rail so they read as a single unit.
const stops = cards.map((card) => ({
  id: card.id,
  code: card.eyebrow.split("/")[0].trim(),
  label: card.eyebrow.split("/").slice(1).join("/").trim() || card.id,
}));

const TRAY_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.8,
} as const;

// The soundtrack is a two-act programme, not a loop. intro.mp3 is the
// narration with its own background music already mixed in (see
// data/narration.ts — still played through the "span" machinery below in
// case it's ever split back into multiple clips, but there's just the one
// now), then tomoon.mp3 takes over on a loop for however long the visitor
// stays. It starts the instant the narration ends and ramps up under it
// (see runRamp), so there's no dead air between the two.
const MAIN_SRC = "/music/tomoon.mp3";
const TARGET_VOLUME = 0.42;

// Brushed steel: a raking light gradient for the body, a hard specular line
// along the top edge and a dark one along the bottom, so every surface reads
// as a milled plate rather than a flat panel.
const METAL_SURFACE =
  "relative overflow-hidden border border-white/12 " +
  "bg-[linear-gradient(158deg,#3a4a5f_0%,#1c2734_16%,#0e151f_40%,#0a1017_56%,#1a2430_80%,#0b1119_100%)] " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.8),inset_1px_0_0_rgba(255,255,255,0.06),inset_-1px_0_0_rgba(0,0,0,0.5),0_26px_64px_rgba(2,8,23,0.72)]";

// Fine vertical brush lines over the body — cheap, and it kills the flatness
// of a plain gradient at large panel sizes.
function BrushedGrain() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.55] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px)]"
    />
  );
}

// The travelling highlight. Skewed and blend-screened so it reads as light
// raking across metal instead of a white bar sliding over a box.
function Sheen({
  delay = 0,
  duration = 3.2,
  active = true,
}: {
  delay?: number;
  duration?: number;
  active?: boolean;
}) {
  if (!active) return null;
  return (
    <motion.span
      aria-hidden="true"
      style={{ willChange: "transform" }}
      className="pointer-events-none absolute inset-y-0 -left-[45%] w-[38%] -skew-x-12 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.05)_35%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.05)_65%,transparent_100%)]"
      animate={{ x: ["0%", "420%"] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: 4.2,
        ease: "easeInOut",
      }}
    />
  );
}

function Rivets({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute flex justify-between ${className}`}
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#c9d6e4,#4a5a6d_55%,#0b1119)] shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
        />
      ))}
    </span>
  );
}

// The closed latch floats alone at the very top of the page, so its flat
// top edge can get a pair of concave "ear" flares — the classic iPhone
// notch trick: a small square masked with a radial gradient so it reads as
// solid near the notch's corner and fades to nothing away from it, faking
// a corner that curves the *opposite* way from a normal border-radius.
const NOTCH_EAR = 14;
const NOTCH_COLOR = "#1c2734";
function notchEarStyle(corner: "top right" | "top left") {
  const mask = `radial-gradient(circle at ${corner}, black ${NOTCH_EAR}px, transparent ${NOTCH_EAR}px)`;
  return {
    width: NOTCH_EAR,
    height: NOTCH_EAR,
    backgroundColor: NOTCH_COLOR,
    WebkitMaskImage: mask,
    maskImage: mask,
  } as const;
}

// Collapsed state: squeezed to a sliver at the corner nearest the console
// (set by transformOrigin below) and nudged the rest of the way across the
// gap, so the bay reads as folding into the tray.
const folded = (side: "left" | "right") => ({
  x: side === "left" ? "22%" : "-22%",
  y: "-38%",
  scaleX: 0.18,
  scaleY: 0.12,
  opacity: 0,
});

// Equipment bay — deliberately empty. Drop content into the inner slot.
function EquipmentBay({
  side,
  label,
  sheenDelay,
}: {
  side: "left" | "right";
  label: string;
  sheenDelay: number;
}) {
  return (
    <motion.section
      aria-label={label}
      // Anchored to the corner nearest the console, so the bay unfolds out of
      // the tray and retracts back into it rather than sliding off the top
      // edge as a separate slab.
      style={{ transformOrigin: side === "left" ? "top right" : "top left" }}
      initial={folded(side)}
      animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
      exit={{ ...folded(side), transition: { ...TRAY_SPRING, delay: 0 } }}
      transition={{ ...TRAY_SPRING, delay: 0.08 }}
      className={`pointer-events-auto hidden h-[46vh] max-h-[520px] w-[24vw] max-w-[400px] flex-col border-t-0 lg:flex ${METAL_SURFACE} ${
        side === "left"
          ? "justify-self-start rounded-br-3xl border-l-0"
          : "justify-self-end rounded-bl-3xl border-r-0"
      }`}
    >
      <BrushedGrain />
      <Sheen delay={sheenDelay} />
      <Rivets className="inset-x-3 top-2" />

      <header className="relative z-10 mt-5 flex items-center justify-between px-4">
        <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-sky-200/55">
          {label}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70 shadow-[0_0_8px_rgba(252,211,77,0.8)]" />
      </header>

      {/* Empty slot — content goes here */}
      <div
        className="relative z-10 m-3 mt-3 flex-1 rounded-xl border border-white/8 shadow-[inset_0_2px_12px_rgba(0,0,0,0.7)]"
        style={{
          backgroundColor: "rgba(2,8,23,0.45)",
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <Rivets className="inset-x-3 bottom-2" />
    </motion.section>
  );
}

export default function CockpitTray() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");
  const [isLatchHot, setIsLatchHot] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [leg, setLeg] = useState(-1);
  const [track, setTrack] = useState<"intro" | "main" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSidenavVisible, setIsSidenavVisible] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // The <audio> elements themselves are expensive to justify keeping around
  // for a visitor who never touches the console — they're only mounted once
  // the tray is actually expanded (or the latch's own play button is
  // pressed before that ever happens).
  const [audioReady, setAudioReady] = useState(false);
  const pendingPlayRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stopIconRefs = useRef<Record<string, AnimatedIconHandle | null>>({});
  // NARRATION_SPANS is down to a single combined clip now (see
  // data/narration.ts), but this still walks it as a sequence in case it's
  // ever split back into multiple — spanIndexRef tracks which is loaded.
  const narrationRef = useRef<HTMLAudioElement>(null);
  const spanIndexRef = useRef(0);
  const mainRef = useRef<HTMLAudioElement>(null);
  // Where each deck's volume is heading; one rAF loop walks both there.
  const levelsRef = useRef({ intro: 0, main: 0 });
  const rampRef = useRef(0);

  useEffect(() => {
    const handleProgressUpdate = (event: Event) => {
      const nextActive = (event as CustomEvent<{ activeId?: string }>).detail
        ?.activeId;
      if (nextActive) setActiveId(nextActive);
    };

    window.addEventListener(
      "flight-progress-update",
      handleProgressUpdate as EventListener,
    );
    return () =>
      window.removeEventListener(
        "flight-progress-update",
        handleProgressUpdate as EventListener,
      );
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  useEffect(() => () => cancelAnimationFrame(rampRef.current), []);

  // One loop ramps both decks toward their targets. Cutting volume outright
  // pops, and a crossfade needs the two moving at once — a deck that reaches
  // zero with nowhere to go is paused so it stops decoding.
  const runRamp = useCallback(() => {
    cancelAnimationFrame(rampRef.current);

    const step = () => {
      let settled = true;

      for (const key of ["intro", "main"] as const) {
        const el = key === "intro" ? narrationRef.current : mainRef.current;
        if (!el) continue;
        const target = levelsRef.current[key];
        const delta = target - el.volume;

        if (Math.abs(delta) < 0.02) {
          el.volume = target;
          if (target === 0 && !el.paused) el.pause();
          continue;
        }
        el.volume = Math.min(1, Math.max(0, el.volume + delta * 0.06));
        settled = false;
      }

      if (!settled) rampRef.current = requestAnimationFrame(step);
    };

    rampRef.current = requestAnimationFrame(step);
  }, []);

  // The narration clock NarratedText (on the home card) times its
  // word-by-word reveal against — which of the 4 clips is playing, its real
  // position within that clip, or an inactive signal that snaps any
  // narrated text to fully readable.
  const emitNarration = (spanIndex: number, currentTime: number, duration: number, active: boolean) => {
    window.dispatchEvent(
      new CustomEvent("narration-progress", { detail: { spanIndex, currentTime, duration, active } }),
    );
  };

  // Bring tomoon.mp3 (looping) up under intro.mp3 and fade the intro out.
  // Declared first since playNextSpan's own fallback (no more spans left,
  // or the browser refused the asset) skips straight here.
  const handOverToMain = useCallback(() => {
    const main = mainRef.current;
    if (!main || !main.paused) return;

    main.volume = 0;
    void main
      .play()
      .then(() => {
        setTrack("main");
        levelsRef.current = { intro: 0, main: TARGET_VOLUME };
        runRamp();
        emitNarration(NARRATION_SPANS.length, 0, 0, false);
      })
      .catch(() => setTrack(null));
  }, [runRamp]);

  // Plays NARRATION_SPANS[spanIndexRef.current] on the shared narration
  // element, advancing sequentially — each clip cuts straight into the
  // next (spoken sentences, not music, so no crossfade between them).
  const playNextSpan = useCallback(() => {
    const narration = narrationRef.current;
    if (!narration) return;
    const span = NARRATION_SPANS[spanIndexRef.current];
    if (!span) {
      handOverToMain();
      return;
    }

    narration.src = span.src;
    narration.currentTime = 0;
    void narration
      .play()
      .then(() => {
        setTrack("intro");
        emitNarration(spanIndexRef.current, 0, span.fallbackDuration, true);
      })
      // This clip is missing or the browser refused it — skip to the next
      // sentence rather than going silent on just one span.
      .catch(() => {
        spanIndexRef.current += 1;
        playNextSpan();
      });
  }, [handOverToMain]);

  const onNarrationEnded = useCallback(() => {
    spanIndexRef.current += 1;
    if (spanIndexRef.current >= NARRATION_SPANS.length) {
      handOverToMain();
      return;
    }
    playNextSpan();
  }, [handOverToMain, playNextSpan]);

  const onNarrationProgress = () => {
    const narration = narrationRef.current;
    const span = NARRATION_SPANS[spanIndexRef.current];
    if (!narration || !span) return;
    const duration = Number.isFinite(narration.duration) ? narration.duration : span.fallbackDuration;
    emitNarration(spanIndexRef.current, narration.currentTime, duration, true);
  };

  const startAudio = useCallback(() => {
    const narration = narrationRef.current;
    const main = mainRef.current;
    if (!narration || !main) return;

    main.pause();
    main.currentTime = 0;
    main.volume = 0;
    narration.volume = 0;
    levelsRef.current = { intro: TARGET_VOLUME, main: 0 };

    spanIndexRef.current = 0;
    playNextSpan();
    runRamp();
  }, [playNextSpan, runRamp]);

  // The <audio> elements themselves only mount once audioReady flips true
  // (tray expanded, or the latch's own play button pressed first) — so a
  // play request that arrives before that has happened has nothing to call
  // .play() on yet. This remembers the request and fires it the moment the
  // elements exist, via the effect below.
  const requestPlayback = useCallback(() => {
    if (narrationRef.current) {
      startAudio();
      return;
    }
    pendingPlayRef.current = true;
    setAudioReady(true);
  }, [startAudio]);

  useEffect(() => {
    if (audioReady && pendingPlayRef.current) {
      pendingPlayRef.current = false;
      startAudio();
    }
  }, [audioReady, startAudio]);

  const stopAudio = useCallback(() => {
    levelsRef.current = { intro: 0, main: 0 };
    runRamp();
    setTrack(null);
    emitNarration(NARRATION_SPANS.length, 0, 0, false);
  }, [runRamp]);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (narrationRef.current) narrationRef.current.muted = next;
      if (mainRef.current) mainRef.current.muted = next;
      return next;
    });
  };

  // Engaging is the one click that starts everything: the tour flies itself
  // and the soundtrack runs under it. Audio can only ever begin here, from a
  // real gesture — nothing autoplays on load. The flight only exists on "/",
  // so engaging from a section detail page has to land there first — a tour
  // starts at the beginning, not wherever the visitor happened to be reading.
  const toggleAutopilot = useCallback(() => {
    if (isRunning) {
      window.dispatchEvent(
        new CustomEvent("flight-autopilot", { detail: { action: "stop" } }),
      );
      return;
    }
    requestPlayback();
    setIsOpen(false);

    if (pathname !== "/") {
      sessionStorage.setItem("autopilot-pending", "1");
      router.push("/");
      return;
    }

    window.dispatchEvent(
      new CustomEvent("flight-autopilot", { detail: { action: "start" } }),
    );
  }, [isRunning, pathname, requestPlayback, router]);

  // The tour also ends on its own, or when the user takes the controls back
  // by scrolling — the music follows it either way.
  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ running?: boolean; index?: number }>)
        .detail;
      const running = Boolean(detail?.running);
      setIsRunning(running);
      setLeg(running ? (detail?.index ?? -1) : -1);
      if (!running) stopAudio();
    };

    window.addEventListener("flight-autopilot-state", onState as EventListener);
    return () =>
      window.removeEventListener(
        "flight-autopilot-state",
        onState as EventListener,
      );
  }, [stopAudio]);

  const navigate = (id: string) => {
    setActiveId(id);
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent("navigate-flight-section", { detail: { id } }),
    );
  };

  // RouteMap (the right-edge journey rail) owns its own visibility, driven
  // by this toggle rather than a prop — the two are separately-mounted
  // siblings in layout.tsx. The dispatch has to happen outside the state
  // updater: React can invoke that updater during its own render pass, and
  // this event is heard synchronously by RouteMap's listener, which called
  // its setState while CockpitTray was still rendering.
  const toggleSidenav = () => {
    const next = !isSidenavVisible;
    setIsSidenavVisible(next);
    window.dispatchEvent(
      new CustomEvent("toggle-route-map", { detail: { visible: next } }),
    );
  };

  // HoloChat is likewise a separate sibling — this just asks it to flip,
  // and reports its own open/closed state back so this button's icon and
  // highlight stay in sync with it (including when closed from inside the
  // panel itself).
  useEffect(() => {
    const onChatState = (event: Event) => {
      const open = (event as CustomEvent<{ open?: boolean }>).detail?.open;
      if (typeof open === "boolean") setIsChatOpen(open);
    };
    window.addEventListener("holochat-state", onChatState as EventListener);
    return () =>
      window.removeEventListener("holochat-state", onChatState as EventListener);
  }, []);

  const toggleChat = () => {
    window.dispatchEvent(new CustomEvent("toggle-holochat"));
  };

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
    >
      {/* Mounted only once actually needed (tray opened, or the latch's own
         play button pressed first) — see requestPlayback/audioReady. */}
      {audioReady && (
        <>
          {/* No static src — playNextSpan sets it imperatively per clip. */}
          <audio
            ref={narrationRef}
            preload="none"
            onTimeUpdate={onNarrationProgress}
            onEnded={onNarrationEnded}
          />
          <audio ref={mainRef} src={MAIN_SRC} loop preload="none" />
        </>
      )}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="rail"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ ...TRAY_SPRING, damping: 24 }}
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 hidden h-2.5 origin-center border-x-0 border-t-0 lg:block ${METAL_SURFACE}`}
          >
            <Sheen delay={0} duration={2.6} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start">
        {/* Side bays parked for now — the console flies on its own.
        <AnimatePresence initial={false}>
          {isOpen && (
            <EquipmentBay
              key="bay-left"
              side="left"
              label="Port Bay"
              sheenDelay={0}
            />
          )}
        </AnimatePresence>
        */}
        <div aria-hidden="true" />

        {/* Centre column: the console, with the latch hanging beneath it */}
        <div className="col-start-2 flex flex-col items-center">
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.nav
                key="console"
                aria-label="Cockpit section tray"
                initial={{ y: "-100%", rotateX: -55, opacity: 0 }}
                animate={{ y: 0, rotateX: 0, opacity: 1 }}
                exit={{
                  y: "-100%",
                  rotateX: -55,
                  opacity: 0,
                  transition: { ...TRAY_SPRING, delay: 0.1 },
                }}
                transition={TRAY_SPRING}
                style={{ transformOrigin: "top center", perspective: 900 }}
                className={`pointer-events-auto w-[min(94vw,880px)] rounded-b-3xl border-t-0 px-3 pb-4 pt-4 sm:px-5 ${METAL_SURFACE}`}
              >
                <BrushedGrain />
                <Sheen delay={0.45} />
                <Rivets className="inset-x-4 top-2.5" />

                {/* Console header strip */}
                <div className="relative z-10 mb-3 mt-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-sky-200/60">
                    Nav Console
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-emerald-300/70">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                    Systems Online
                  </span>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {stops.map((stop, i) => {
                    const isActive = activeId === stop.id;
                    return (
                      <motion.button
                        key={stop.id}
                        type="button"
                        onClick={() => navigate(stop.id)}
                        onMouseEnter={() => stopIconRefs.current[stop.id]?.startAnimation()}
                        onMouseLeave={() => stopIconRefs.current[stop.id]?.stopAnimation()}
                        aria-current={isActive ? "page" : undefined}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 + i * 0.03, duration: 0.25 }}
                        className={`group relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          isActive
                            ? "border-sky-300/50 bg-sky-400/15 shadow-[inset_0_0_18px_rgba(125,211,252,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]"
                            : "border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.5)] hover:border-sky-300/35 hover:bg-white/[0.08]"
                        }`}
                      >
                        <span className="flex w-full items-center justify-between">
                          <span
                            className={`text-[9px] font-semibold tracking-[0.22em] ${
                              isActive ? "text-sky-200" : "text-slate-500"
                            }`}
                          >
                            {stop.code}
                          </span>
                          <span
                            className={`h-1.5 w-1.5 rounded-full transition-all ${
                              isActive
                                ? "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.9)]"
                                : "bg-slate-600 group-hover:bg-sky-300/60"
                            }`}
                          />
                        </span>
                        <span
                          className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] ${
                            isActive ? "text-sky-50" : "text-slate-300"
                          }`}
                        >
                          <CardIcon
                            id={stop.id}
                            size={11}
                            ref={(el) => {
                              stopIconRefs.current[stop.id] = el;
                            }}
                          />
                          {stop.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Autopilot — one control flies the tour and scores it */}
                <div className="relative z-10 mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
                  <button
                    type="button"
                    onClick={toggleAutopilot}
                    aria-pressed={isRunning}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                      isRunning
                        ? "border-amber-300/45 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25"
                        : "border-sky-200/30 bg-[linear-gradient(160deg,#33445a,#0d141d)] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.6)] hover:border-sky-200/60"
                    }`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                      {isRunning ? (
                        <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
                      ) : (
                        <path fill="currentColor" d="M8 5.14v13.72L19 12z" />
                      )}
                    </svg>
                    {isRunning ? "Disengage" : "Autoplay"}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {isRunning
                        ? `Autopilot · Leg ${Math.min(leg + 1, stops.length)}/${stops.length}`
                        : "Autopilot Standby"}
                    </p>
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/90">
                      {isRunning
                        ? (stops[leg]?.label ?? "Departing")
                        : "Sit back — it flies itself"}
                    </p>
                    {/* Tour progress across the seven stops */}
                    <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                      <motion.span
                        className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,#34d399,#7dd3fc)]"
                        animate={{
                          scaleX: isRunning
                            ? Math.min(1, (leg + 1) / stops.length)
                            : 0,
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-pressed={isMuted}
                    aria-label={isMuted ? "Unmute soundtrack" : "Mute soundtrack"}
                    className={`shrink-0 transition-colors ${
                      isMuted ? "text-slate-600" : "text-sky-200/80 hover:text-sky-100"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d={
                          isMuted
                            ? "M3 9v6h4l5 5V4L7 9zm16.07-4.07l-1.41 1.41A7.5 7.5 0 0 1 17.66 17.66l1.41 1.41a9.5 9.5 0 0 0 0-14.14M4.27 3L3 4.27 19.73 21 21 19.73z"
                            : "M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12"
                        }
                      />
                    </svg>
                  </button>

                  {/* Level meter — reads the deck that is actually playing.
                     Hidden below sm: the autopilot row is already tight
                     against the status text on a phone-width console, and
                     this is the most dispensable part of it. */}
                  <div className="hidden h-6 items-end gap-[3px] sm:flex">
                    {[0.5, 0.9, 0.65, 1, 0.75].map((peak, i) => {
                      const live = track !== null && !isMuted;
                      return (
                        <motion.span
                          key={i}
                          style={{ transformOrigin: "bottom" }}
                          className={`h-6 w-[3px] rounded-sm ${
                            track === "intro"
                              ? "bg-gradient-to-t from-amber-400/50 to-amber-200"
                              : "bg-gradient-to-t from-emerald-400/50 to-sky-300"
                          }`}
                          animate={
                            live
                              ? { scaleY: [0.16, 0.92 * peak, 0.33, 0.75 * peak, 0.16] }
                              : { scaleY: 0.16 }
                          }
                          transition={
                            live
                              ? {
                                  duration: 1.1 + i * 0.17,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }
                              : { duration: 0.25 }
                          }
                        />
                      );
                    })}
                  </div>
                </div>

                <Rivets className="inset-x-4 bottom-2.5" />
              </motion.nav>
            )}
          </AnimatePresence>

          {/* The latch — always visible, hangs just under the console. Closed,
             it's floating free against the page, so it gets the notch ears;
             open, it's flush against the console above it and a flare there
             would just read as a seam, so they're skipped. */}
          <div className="relative inline-block">
            {!isOpen && (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 right-full"
                  style={notchEarStyle("top right")}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 left-full"
                  style={notchEarStyle("top left")}
                />
              </>
            )}
            <div
              onPointerEnter={() => setIsLatchHot(true)}
              onPointerLeave={() => setIsLatchHot(false)}
              className={`pointer-events-auto flex items-center gap-1 rounded-b-xl border-t-0 px-1.5 py-1 ${METAL_SURFACE}`}
            >
            <Sheen delay={0.2} duration={2.4} active={isOpen || isLatchHot} />

            {/* Autopilot is reachable with the tray shut — it is the control
               you want mid-flight, and the tray closes when it engages. */}
            <button
              type="button"
              onClick={toggleAutopilot}
              aria-pressed={isRunning}
              aria-label={isRunning ? "Disengage autopilot" : "Autoplay the tour"}
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                isRunning
                  ? "text-amber-300 drop-shadow-[0_0_5px_rgba(252,211,77,0.8)]"
                  : "text-slate-500 hover:text-sky-200"
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                {isRunning ? (
                  <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
                ) : (
                  <path fill="currentColor" d="M8 5.14v13.72L19 12z" />
                )}
              </svg>
            </button>

            <span aria-hidden="true" className="relative z-10 h-3 w-px bg-white/15" />

            {/* Journey rail (RouteMap) show/hide — a separate mounted
               sibling, toggled purely over the event bus (see toggleSidenav
               above). */}
            <button
              type="button"
              onClick={toggleSidenav}
              aria-pressed={isSidenavVisible}
              aria-label={isSidenavVisible ? "Hide journey rail" : "Show journey rail"}
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                isSidenavVisible ? "text-sky-200" : "text-slate-500 hover:text-sky-200"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>

            <span aria-hidden="true" className="relative z-10 h-3 w-px bg-white/15" />

            {/* VEGA chat — moved here from its own floating button; HoloChat
               still owns the panel and its animation, this just flips it. */}
            <button
              type="button"
              onClick={toggleChat}
              aria-pressed={isChatOpen}
              aria-label={isChatOpen ? "Close VEGA" : "Open VEGA, the portfolio assistant"}
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                isChatOpen ? "text-sky-200" : "text-slate-500 hover:text-sky-200"
              }`}
            >
              {isChatOpen ? <XIcon size={12} /> : <BotMessageSquareIcon size={12} />}
            </button>

            <span aria-hidden="true" className="relative z-10 h-3 w-px bg-white/15" />

            <button
              type="button"
              onClick={() =>
                setIsOpen((prev) => {
                  const next = !prev;
                  // Expanding the tray is the trigger to load the music —
                  // it doesn't start playback, just makes the elements exist.
                  if (next) setAudioReady(true);
                  return next;
                })
              }
              aria-expanded={isOpen}
              aria-label={isOpen ? "Close section tray" : "Open section tray"}
              className="relative z-10 flex h-5 w-10 items-center justify-center gap-1 rounded-md text-sky-200/70 transition-colors hover:text-sky-100 sm:w-12"
            >
              <span className="h-[3px] w-4 rounded-full bg-current opacity-50 sm:w-5" />
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={TRAY_SPRING}
              >
                <path
                  fill="currentColor"
                  d="m12 15.5l-6-6L7.4 8.1l4.6 4.6l4.6-4.6L18 9.5z"
                />
              </motion.svg>
            </button>
            </div>
          </div>
        </div>

        {/*
        <AnimatePresence initial={false}>
          {isOpen && (
            <EquipmentBay
              key="bay-right"
              side="right"
              label="Starboard Bay"
              sheenDelay={0.9}
            />
          )}
        </AnimatePresence>
        */}
        <div aria-hidden="true" />
      </div>
    </div>
  );
}
