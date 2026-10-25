"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { cards } from "../data/sections";
import { NARRATION_SPANS } from "../data/narration";
import {
  SOUNDTRACK_LENGTH_TOLERANCE,
  SOUNDTRACK_SECONDS,
  SOUNDTRACK_SRCS,
} from "../data/soundtrack";
import {
  DEFAULT_MISSION_THEME,
  isMissionTheme,
  MISSION_THEMES,
  MISSION_THEME_STORAGE_KEY,
  type MissionTheme,
} from "../lib/mission-theme";
import { toggleNavigatorUi, useNavigatorUi } from "../lib/navigator-ui";
import { clearSoundtrackClock, setSoundtrackClock } from "../lib/soundtrack-clock";
import {
  getTrackChoice,
  shouldOfferAutoplayToggle,
  shouldSkipIntro,
  TRACK_RANDOM,
} from "../lib/visit-history";
import AutopilotPrompt from "./AutopilotPrompt";
import { CardIcon } from "./icons/card-icon";
import type { AnimatedIconHandle } from "./icons/card-icon";
import {
  BrushedGrain,
  METAL_SURFACE,
  Rivets,
  Sheen,
  TRAY_SPRING,
} from "./mission-surface";

const stops = cards.map((card) => ({
  id: card.id,
  code: card.eyebrow.split("/")[0].trim(),
  label: card.eyebrow.split("/").slice(1).join("/").trim() || card.id,
}));

const CONSOLE_OPEN = { duration: 0.42, ease: [0.22, 1, 0.36, 1] } as const;
const CONSOLE_CLOSE = { duration: 0.24, ease: [0.4, 0, 1, 1] } as const;

// The list and the length contract both live in data/soundtrack.ts, because
// the autopilot has to read the same numbers to stay in sync with them.
const MAIN_TRACKS = SOUNDTRACK_SRCS;
const TARGET_VOLUME = 0.42;

const NOTCH_EAR = 14;
function notchEarStyle(corner: "top right" | "top left") {
  const mask = `radial-gradient(circle at ${corner}, black ${NOTCH_EAR}px, transparent ${NOTCH_EAR}px)`;
  return {
    width: NOTCH_EAR,
    height: NOTCH_EAR,
    backgroundColor: "var(--flight-metal-ear)",
    WebkitMaskImage: mask,
    maskImage: mask,
  } as const;
}

const folded = (side: "left" | "right") => ({
  x: side === "left" ? "22%" : "-22%",
  y: "-38%",
  scaleX: 0.18,
  scaleY: 0.12,
  opacity: 0,
});

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

      <div
        className="mission-console-well relative z-10 m-3 mt-3 flex-1 rounded-xl border"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--flight-accent) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--flight-accent) 6%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <Rivets className="inset-x-3 bottom-2" />
    </motion.section>
  );
}

export default function CockpitTray() {
  const navigatorUi = useNavigatorUi();
  // Read when the prompt opens rather than on every render: the visit count
  // does not change while the page is open.
  const offerAutoplayToggle = useSyncExternalStore(
    () => () => {},
    shouldOfferAutoplayToggle,
    () => false,
  );
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");
  const [isLatchHot, setIsLatchHot] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [leg, setLeg] = useState(-1);
  const [track, setTrack] = useState<"intro" | "main" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [missionTheme, setMissionTheme] = useState<MissionTheme>(() => {
    if (typeof window === "undefined") return DEFAULT_MISSION_THEME;
    try {
      const stored = localStorage.getItem(MISSION_THEME_STORAGE_KEY);
      return isMissionTheme(stored) ? stored : DEFAULT_MISSION_THEME;
    } catch {
      return DEFAULT_MISSION_THEME;
    }
  });
  const [audioReady, setAudioReady] = useState(false);
  const pendingPlayRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stopIconRefs = useRef<Record<string, AnimatedIconHandle | null>>({});
  const narrationRef = useRef<HTMLAudioElement>(null);
  const spanIndexRef = useRef(0);
  const mainRef = useRef<HTMLAudioElement>(null);
  // Never played. It exists only to pull the upcoming file into the HTTP
  // cache while the current one is still going, so swapping `src` on the
  // real element is near-instant instead of a silent gap. Alternating two
  // *playback* elements would be truly gapless, but the volume ramp targets
  // mainRef specifically — one preloader keeps that logic untouched.
  const preloadRef = useRef<HTMLAudioElement>(null);
  // Remaining picks. Refilled, reshuffled, when it empties.
  const trackBagRef = useRef<string[]>([]);
  const lastTrackRef = useRef<string | null>(null);
  // One warm per track. `timeupdate` fires several times a second and the
  // element loops, so without this the preload would be re-issued forever.
  const warmedRef = useRef(false);
  const levelsRef = useRef({ intro: 0, main: 0 });
  const rampRef = useRef(0);

  useLayoutEffect(() => {
    document.documentElement.dataset.missionTheme = missionTheme;
  }, [missionTheme]);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== MISSION_THEME_STORAGE_KEY) return;
      setMissionTheme(
        isMissionTheme(event.newValue) ? event.newValue : DEFAULT_MISSION_THEME,
      );
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const selectMissionTheme = (theme: MissionTheme) => {
    setMissionTheme(theme);
    try {
      localStorage.setItem(MISSION_THEME_STORAGE_KEY, theme);
    } catch {
    }
  };

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

  // Fisher-Yates over a copy. Pure random would repeat the same track
  // back-to-back roughly one time in four at this list length; a bag that
  // plays through everything before reshuffling never does.
  const takeNextTrack = useCallback(() => {
    // A pinned track is pinned for the whole journey and every journey
    // after it, so the bag is never consulted — drawing from it would mean
    // the choice held for one pass and then quietly stopped holding.
    const chosen = getTrackChoice();
    if (chosen !== TRACK_RANDOM) {
      lastTrackRef.current = chosen;
      return chosen;
    }
    if (!trackBagRef.current.length) {
      const bag = [...MAIN_TRACKS];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // Avoid a repeat across the seam between two bags.
      if (bag.length > 1 && bag[bag.length - 1] === lastTrackRef.current) {
        [bag[bag.length - 1], bag[0]] = [bag[0], bag[bag.length - 1]];
      }
      trackBagRef.current = bag;
    }
    const next = trackBagRef.current.pop() ?? MAIN_TRACKS[0];
    lastTrackRef.current = next;
    return next;
  }, []);

  /** Warms whatever is up next without playing it. */
  const warmNextTrack = useCallback(() => {
    const preloader = preloadRef.current;
    if (!preloader) return;
    // Peek at the bag without consuming it. An empty bag means the next
    // journey will refill and reshuffle, and which track wins is not decided
    // yet — nothing to warm, and the switch is rare enough to afford a load.
    if (getTrackChoice() !== TRACK_RANDOM) return;
    const upcoming = trackBagRef.current[trackBagRef.current.length - 1];
    if (!upcoming || preloader.src.endsWith(upcoming)) return;
    preloader.src = upcoming;
    preloader.load();
  }, []);

  // Warmed part-way through rather than at track start: at start it would
  // compete for bandwidth with the track actually playing, which is the one
  // the listener is waiting on. By 40% the current file is comfortably
  // buffered and the next journey is still minutes away.
  // The autopilot times a whole tour against SOUNDTRACK_SECONDS, so a file
  // of a different length silently desynchronises the closing mark. Nothing
  // else would surface that — the tour would just end early or late.
  const onMainMetadata = useCallback(() => {
    const main = mainRef.current;
    if (!main || !Number.isFinite(main.duration)) return;
    const drift = Math.abs(main.duration - SOUNDTRACK_SECONDS);
    if (drift > SOUNDTRACK_LENGTH_TOLERANCE) {
      console.warn(
        `Soundtrack: ${main.currentSrc.split("/").pop()} is ${main.duration.toFixed(2)}s, ` +
          `but the autopilot is timed against ${SOUNDTRACK_SECONDS}s. ` +
          `Update SOUNDTRACK_SECONDS or re-render the track.`,
      );
    }
  }, []);

  const onMainTimeUpdate = useCallback(() => {
    if (warmedRef.current) return;
    const main = mainRef.current;
    if (!main || !Number.isFinite(main.duration) || !main.duration) return;
    if (main.currentTime / main.duration < 0.4) return;
    warmedRef.current = true;
    warmNextTrack();
  }, [warmNextTrack]);

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

  const emitNarration = (spanIndex: number, currentTime: number, duration: number, active: boolean) => {
    window.dispatchEvent(
      new CustomEvent("narration-progress", { detail: { spanIndex, currentTime, duration, active } }),
    );
  };

  const handOverToMain = useCallback(() => {
    emitNarration(NARRATION_SPANS.length, 0, 0, false);
    const main = mainRef.current;
    if (!main || !main.paused) return;

    main.volume = 0;
    // The src is chosen here, not during render: Math.random() in a component
    // body is non-deterministic and Next refuses to prerender it — the same
    // thing that broke the career timeline on `new Date()`. handOverToMain
    // only ever runs from a gesture, so there is nothing to prerender.
    const src = takeNextTrack();
    main.src = src;
    warmedRef.current = false;
    void main
      .play()
      .then(() => {
        setTrack("main");
        // Published only once the element is really playing: the flight
        // reads this as its clock, and a src that was set but refused would
        // hand it a time that never advances.
        setSoundtrackClock(main, src);
        levelsRef.current = { intro: 0, main: TARGET_VOLUME };
        runRamp();
      })
      .catch(() => setTrack(null));
  }, [runRamp, takeNextTrack]);

  // One track per journey, not per track-length.
  //
  // The element loops, so a single track covers a whole pass of the flight
  // however long that pass takes — someone who lingers in the toolkit hears
  // the same piece throughout rather than a cut halfway down the corridor.
  // The track only changes when the flight itself wraps back to the origin,
  // which `flight-loop-rush` announces (see runLoop in MultiverseFlight).
  const advanceJourneyTrack = useCallback(() => {
    const main = mainRef.current;
    // Nothing playing means the visitor never started the tour; the next one
    // to start will draw from the bag on its own.
    if (!main || main.paused) return;
    const src = takeNextTrack();
    main.src = src;
    warmedRef.current = false;
    main.volume = levelsRef.current.main;
    void main
      .play()
      .then(() => setSoundtrackClock(main, src))
      .catch(() => setTrack(null));
  }, [takeNextTrack]);

  useEffect(() => {
    window.addEventListener("flight-loop-rush", advanceJourneyTrack);
    return () =>
      window.removeEventListener("flight-loop-rush", advanceJourneyTrack);
  }, [advanceJourneyTrack]);

  // The dial's chapter skip, once the flight is flying to the music: the
  // tour follows the song, so skipping a beat means moving the song.
  useEffect(() => {
    const onSeek = (event: Event) => {
      const to = (event as CustomEvent<{ to?: number }>).detail?.to;
      const main = mainRef.current;
      if (!main || main.paused || typeof to !== "number") return;
      main.currentTime = to;
    };
    window.addEventListener("flight-soundtrack-seek", onSeek as EventListener);
    return () =>
      window.removeEventListener("flight-soundtrack-seek", onSeek as EventListener);
  }, []);

  const playNextSpanRef = useRef<() => void>(() => {});
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
      .catch(() => {
        spanIndexRef.current += 1;
        playNextSpanRef.current();
      });
  }, [handOverToMain]);
  useEffect(() => {
    playNextSpanRef.current = playNextSpan;
  });

  const skipIntro = useCallback(() => {
    const narration = narrationRef.current;
    if (narration) {
      narration.pause();
      narration.currentTime = 0;
    }
    spanIndexRef.current = NARRATION_SPANS.length;
    levelsRef.current = { intro: 0, main: TARGET_VOLUME };
    handOverToMain();
  }, [handOverToMain]);

  useEffect(() => {
    const onSkip = () => skipIntro();
    window.addEventListener("flight-skip-intro", onSkip);
    return () => window.removeEventListener("flight-skip-intro", onSkip);
  }, [skipIntro]);

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

    // Skipping is decided here rather than by stopping the voice later: the
    // flight departs on the music, so handing straight over starts the track
    // and releases the Home leg in one beat, with no silence between them.
    if (shouldSkipIntro()) {
      spanIndexRef.current = NARRATION_SPANS.length;
      levelsRef.current = { intro: 0, main: TARGET_VOLUME };
      handOverToMain();
      runRamp();
      return;
    }

    spanIndexRef.current = 0;
    playNextSpan();
    runRamp();
  }, [handOverToMain, playNextSpan, runRamp]);

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
    clearSoundtrackClock();
    levelsRef.current = { intro: 0, main: 0 };
    runRamp();
    setTrack(null);
    emitNarration(NARRATION_SPANS.length, 0, 0, false);
  }, [runRamp]);

  const pauseAudio = useCallback(() => {
    cancelAnimationFrame(rampRef.current);
    narrationRef.current?.pause();
    mainRef.current?.pause();
  }, []);

  const resumeAudio = useCallback(() => {
    const active = track === "intro" ? narrationRef.current : mainRef.current;
    if (!active) return;
    void active
      .play()
      .then(runRamp)
      .catch(() => {});
  }, [runRamp, track]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (narrationRef.current) narrationRef.current.muted = next;
    if (mainRef.current) mainRef.current.muted = next;
    window.dispatchEvent(new CustomEvent("flight-sound-mute", { detail: { muted: next } }));
  };

  const wentFullscreenRef = useRef(false);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (typeof el.requestFullscreen !== "function") return;
    try {
      void el
        .requestFullscreen()
        .then(() => {
          wentFullscreenRef.current = true;
        })
        .catch(() => {});
    } catch {
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (!wentFullscreenRef.current) return;
    wentFullscreenRef.current = false;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const [askLaunch, setAskLaunch] = useState(false);
  const fullscreenChoiceRef = useRef(false);

  const canFullscreen = () =>
    typeof document !== "undefined" &&
    typeof document.documentElement.requestFullscreen === "function" &&
    !document.fullscreenElement;

  const launchAutopilot = useCallback(
    (useFullscreen: boolean) => {
      fullscreenChoiceRef.current = useFullscreen;
      // Audio is armed by the launch event now (see onLaunch), which covers
      // this path and the dial's alike. Calling it here as well restarted
      // the narration from span zero a frame after it had already begun.
      setIsOpen(false);
      setAskLaunch(false);
      if (useFullscreen) enterFullscreen();

      if (pathname !== "/") {
        sessionStorage.setItem("autopilot-pending", "1");
        router.push("/");
        return;
      }

      window.dispatchEvent(
        new CustomEvent("flight-autopilot", { detail: { action: "start" } }),
      );
    },
    [enterFullscreen, pathname, router],
  );

  const toggleAutopilot = useCallback(() => {
    if (isRunning) {
      window.dispatchEvent(
        new CustomEvent("flight-autopilot", { detail: { action: "pause" } }),
      );
      return;
    }

    if (isPaused && pathname === "/") {
      resumeAudio();
      setIsOpen(false);
      if (fullscreenChoiceRef.current) enterFullscreen();
      window.dispatchEvent(
        new CustomEvent("flight-autopilot", { detail: { action: "resume" } }),
      );
      return;
    }

    // Opened whether or not fullscreen is available: the prompt carries the
    // journey's settings now, so skipping it on a browser that cannot go
    // fullscreen would hide them from exactly the visitors with the least
    // room to spare.
    setAskLaunch(true);
  }, [isPaused, isRunning, pathname, resumeAudio, enterFullscreen]);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          running?: boolean;
          paused?: boolean;
          index?: number;
        }>
      ).detail;
      const running = Boolean(detail?.running);
      const paused = Boolean(detail?.paused);
      setIsRunning(running);
      setIsPaused(paused);
      setLeg(running || paused ? (detail?.index ?? -1) : -1);
      if (paused) {
        pauseAudio();
      } else if (!running) {
        stopAudio();
        exitFullscreen();
      }
    };

    // The tour can be launched from places that do not go through
    // launchAutopilot — the dial's transport button dispatches the command
    // straight to the flight. Arming the audio there too means the
    // soundtrack is tied to the tour actually starting rather than to one
    // particular button having started it. `flight-autopilot-launch` fires
    // once per start, synchronously inside the gesture that caused it, so
    // the play() this leads to still counts as user-initiated.
    const onLaunch = () => requestPlayback();

    window.addEventListener("flight-autopilot-launch", onLaunch);
    window.addEventListener("flight-autopilot-state", onState as EventListener);
    return () => {
      window.removeEventListener("flight-autopilot-launch", onLaunch);
      window.removeEventListener(
        "flight-autopilot-state",
        onState as EventListener,
      );
    };
  }, [pauseAudio, stopAudio, exitFullscreen, requestPlayback]);

  const navigate = (id: string) => {
    setActiveId(id);
    setIsOpen(false);

    if (pathname !== "/") {
      router.push(id === "home" ? "/" : `/${id}`);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("navigate-flight-section", { detail: { id } }),
    );
  };

  // Swaps the navigator rather than hiding it. Removing it entirely left the
  // flight with no visible way to move through it, which is a worse use of
  // the press than offering the other instrument.
  const toggleSidenav = () => {
    toggleNavigatorUi();
  };

  const routeId = pathname.split("/").filter(Boolean)[0];
  const visibleActiveId =
    pathname === "/" || !stops.some((stop) => stop.id === routeId)
      ? activeId
      : routeId;

  return (
    <div
      ref={containerRef}
      className="mission-chrome pointer-events-none fixed inset-x-0 top-0 z-50"
    >
      <AutopilotPrompt
        open={askLaunch}
        canFullscreen={canFullscreen()}
        offerAutoplayToggle={offerAutoplayToggle}
        onLaunch={launchAutopilot}
        onDismiss={() => setAskLaunch(false)}
      />

      {/* Always mounted, never preloaded.
          These used to render only once `audioReady` flipped, which made
          starting the soundtrack a two-step dance: arm the flag, wait for a
          render, then play from an effect. Playing from an effect is a
          different task to the click that asked for it, so the browser no
          longer sees a user gesture and rejects the play() outright.
          `preload="none"` means an element that is mounted but never played
          costs nothing — no request is made until play() is called — so
          there is no reason to gate them. refs exist from first paint, and
          every caller can play synchronously inside the gesture. */}
      <audio
        ref={narrationRef}
        preload="none"
        onTimeUpdate={onNarrationProgress}
        onEnded={onNarrationEnded}
      />
      {/* `loop` is deliberate: a journey has no fixed length, so the track
          has to outlast whatever pace the visitor takes. The next one is
          drawn when the flight wraps, not when the file ends. */}
      <audio
        ref={mainRef}
        preload="none"
        loop
        onLoadedMetadata={onMainMetadata}
        onTimeUpdate={onMainTimeUpdate}
      />
      <audio ref={preloadRef} preload="auto" aria-hidden="true" />

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
        <div aria-hidden="true" />

        <div className="col-start-2 flex flex-col items-center">
          <motion.div
            initial={false}
            animate={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            transition={isOpen ? CONSOLE_OPEN : CONSOLE_CLOSE}
            className="grid w-[min(94vw,880px)]"
          >
            <div className="min-h-0 overflow-hidden">
              <motion.nav
                aria-label="Cockpit section tray"
                aria-hidden={!isOpen}
                inert={!isOpen}
                initial={false}
                animate={{
                  y: isOpen ? 0 : -12,
                  opacity: isOpen ? 1 : 0,
                  scale: isOpen ? 1 : 0.985,
                }}
                transition={isOpen ? CONSOLE_OPEN : CONSOLE_CLOSE}
                style={{ transformOrigin: "top center" }}
                className={`w-full rounded-b-3xl border-t-0 px-3 pb-4 pt-4 sm:px-5 ${
                  isOpen ? "pointer-events-auto" : "pointer-events-none"
                } ${METAL_SURFACE}`}
              >
                <BrushedGrain />
                <Sheen delay={0.45} active={isOpen} />
                <Rivets className="inset-x-4 top-2.5" />

                <div className="relative z-10 mb-3 mt-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-sky-200/60">
                    Nav Console
                  </span>
                  <div className="flex items-center gap-1" role="group" aria-label="Interface theme">
                    {MISSION_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={missionTheme === theme.id}
                        onClick={() => selectMissionTheme(theme.id)}
                        data-theme-option={theme.id}
                        className="mission-theme-option"
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {stops.map((stop) => {
                    const isActive = visibleActiveId === stop.id;
                    return (
                      <motion.button
                        key={stop.id}
                        type="button"
                        onClick={() => navigate(stop.id)}
                        onMouseEnter={() => stopIconRefs.current[stop.id]?.startAnimation()}
                        onMouseLeave={() => stopIconRefs.current[stop.id]?.stopAnimation()}
                        aria-current={isActive ? "page" : undefined}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.14 }}
                        className="mission-console-stop group relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-colors"
                      >
                        <span className="flex w-full items-center justify-between">
                          <span
                            className="mission-console-code text-[9px] font-semibold tracking-[0.22em]"
                          >
                            {stop.code}
                          </span>
                          <span
                            className="mission-console-dot h-1.5 w-1.5 rounded-full transition-all"
                          />
                        </span>
                        <span
                          className="mission-console-label flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-tight tracking-[0.1em]"
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

                <div className="mission-console-well relative z-10 mt-3 flex items-center gap-3 rounded-lg border px-3 py-2">
                  <button
                    type="button"
                    onClick={toggleAutopilot}
                    aria-pressed={isRunning || isPaused}
                    aria-label={
                      isRunning
                        ? "Pause autoplay"
                        : isPaused
                          ? "Continue autoplay"
                          : "Start autoplay"
                    }
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                      isRunning
                        ? "border-amber-300/45 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25"
                        : isPaused
                          ? "border-sky-300/45 bg-sky-400/15 text-sky-100 hover:bg-sky-400/25"
                        : "border-sky-200/30 bg-[linear-gradient(160deg,#33445a,#0d141d)] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.6)] hover:border-sky-200/60"
                    }`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                      {isRunning ? (
                        <>
                          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                        </>
                      ) : (
                        <path fill="currentColor" d="M8 5.14v13.72L19 12z" />
                      )}
                    </svg>
                    {isRunning ? "Pause" : isPaused ? "Continue" : "Autoplay"}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {isRunning || isPaused
                        ? `Autopilot · Leg ${Math.min(leg + 1, stops.length)}/${stops.length}`
                        : "Autopilot Standby"}
                    </p>
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/90">
                      {isRunning
                        ? (stops[leg]?.label ?? "Departing")
                        : isPaused
                          ? `Paused at ${stops[leg]?.label ?? "current position"}`
                          : "Sit back — it flies itself"}
                    </p>
                    <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                      <motion.span
                        className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,#34d399,#7dd3fc)]"
                        animate={{
                          scaleX: isRunning || isPaused
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

                  <div className="hidden h-6 items-end gap-[3px] sm:flex">
                    {[0.5, 0.9, 0.65, 1, 0.75].map((peak, i) => {
                      const live = track !== null && !isMuted && !isPaused;
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
            </div>
          </motion.div>

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

            <button
              type="button"
              onClick={toggleAutopilot}
              aria-pressed={isRunning || isPaused}
              aria-label={
                isRunning
                  ? "Pause autoplay"
                  : isPaused
                    ? "Continue autoplay"
                    : "Autoplay the tour"
              }
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                isRunning
                  ? "text-amber-300 drop-shadow-[0_0_5px_rgba(252,211,77,0.8)]"
                  : isPaused
                    ? "text-sky-300 drop-shadow-[0_0_5px_rgba(125,211,252,0.7)]"
                  : "text-slate-500 hover:text-sky-200"
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                {isRunning ? (
                  <>
                    <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                    <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                  </>
                ) : (
                  <path fill="currentColor" d="M8 5.14v13.72L19 12z" />
                )}
              </svg>
            </button>

            {pathname === "/" && (
              <>
                <span aria-hidden="true" className="relative z-10 h-3 w-px bg-white/15" />

                <button
                  type="button"
                  onClick={toggleSidenav}
                  aria-pressed={navigatorUi === "infinity"}
                  aria-label={
                    navigatorUi === "dial"
                      ? "Switch to the route track"
                      : "Switch to the bezel dial"
                  }
                  className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                    navigatorUi === "infinity"
                      ? "text-sky-200"
                      : "text-slate-500 hover:text-sky-200"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              </>
            )}


            <span aria-hidden="true" className="relative z-10 h-3 w-px bg-white/15" />

            {/* The assistant. It spent a while in the middle of the dial;
                that seat is the autopilot's transport now, and this bar is
                the one piece of chrome that never closes, so the way in to
                VEGA lives here. HoloChat owns the panel — this only flips it. */}
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("toggle-holochat"))
              }
              aria-label="Open VEGA, the portfolio assistant"
              className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-sky-200"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 6V2H8" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
                <path d="M9 11v2" />
                <path d="M15 11v2" />
              </svg>
            </button>

            <span aria-hidden="true" className="relative z-10 h-3 w-px bg-white/15" />

            <button
              type="button"
              onClick={() =>
                setIsOpen((prev) => {
                  const next = !prev;
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

        <div aria-hidden="true" />
      </div>
    </div>
  );
}
