"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import ParticleLogo from "./HeroLogo";
import SignatureName from "./SignatureName";
import {
  makeStarSeeds,
  STARFIELD_SEED_EVENT,
  type StarfieldSeedDetail,
  type StarSeed,
} from "../lib/starfield";

// Panel zero. The US mark assembles itself out of particles under the Milky
// Way, and it assembles exactly as fast as the page loads: the particles'
// progress home *is* the loading progress, so the mark is only whole when
// the site is ready. Then it shatters — bursting outward past the camera —
// and the pieces that survive settle as the starfield the whole flight is
// flown through. They are not made to look like it: the loader hands their
// exact positions to SpaceParticles, which puts its own stars there, so the
// dots on screen when the loader lifts *are* the app's particles.
//
// The flight closes by gathering those stars back into the same mark
// (`gatherFromStars` on the closing ParticleLogo), and loops. The story
// opens and ends on the US, made of the same particles.

// The shatter, from the first burst to the pieces settling as stars.
const SHATTER_S = 1.7;
// After the hand-off: long enough for the field to have drawn its seeded
// stars before this canvas goes, then unmounted.
const HANDOFF_FADE_MS = 220;

// Real milestones, in the order a page reaches them. Only their count drives
// the mark; the labels are for screen readers (the visible report is the
// mark itself).
const GATES = [
  { id: "cabin", label: "Cabin systems" },
  { id: "instruments", label: "Instruments" },
  { id: "starchart", label: "Star chart" },
] as const;

// The meter never jumps. It closes the gap to the next milestone
// proportionally, so the mark eases together rather than snapping, and is
// capped at a top speed — without the cap a warm load resolves every
// milestone at once and the particles would slam home in a few frames.
const FILL_MS = 1800;
const MAX_SPEED = 100 / FILL_MS;
// A beat with the mark whole before the camera flies into it, so it is read
// as a mark and not as the moment before a transition — and long enough for
// the signature under it, which only finishes arriving as the mark does.
const HOLD_FORMED_MS = 1200;
// Nothing here may strand the visitor behind the overlay: if a milestone
// never resolves (a font that fails to decode, a hung asset), the mark is
// finished and cleared anyway.
const MAX_WAIT_MS = 6000;

// The mark's size, from the viewport it has to sit in. Read once on the
// client (the server has no viewport, and the canvas is not in the server
// HTML's layout anyway — only its box is).
function markSizeFor() {
  if (typeof window === "undefined") return 280;
  const short = Math.min(window.innerWidth, window.innerHeight);
  return Math.round(Math.min(360, Math.max(190, short * 0.46)));
}

// Two tiled dot fields at different pitches, so the star layer never lines
// up into a visible grid.
const STARS_NEAR =
  "radial-gradient(1.2px 1.2px at 12% 18%, rgba(224,242,254,0.9), transparent 60%), radial-gradient(1px 1px at 68% 34%, rgba(186,230,253,0.8), transparent 60%), radial-gradient(1.4px 1.4px at 38% 72%, rgba(240,249,255,0.85), transparent 60%), radial-gradient(1px 1px at 86% 82%, rgba(186,230,253,0.7), transparent 60%)";

const STARS_FAR =
  "radial-gradient(0.8px 0.8px at 24% 56%, rgba(186,230,253,0.7), transparent 60%), radial-gradient(0.9px 0.9px at 78% 12%, rgba(224,242,254,0.75), transparent 60%), radial-gradient(0.7px 0.7px at 52% 88%, rgba(186,230,253,0.6), transparent 60%), radial-gradient(0.8px 0.8px at 6% 94%, rgba(224,242,254,0.65), transparent 60%)";

export default function PageLoader() {
  const progress = useMotionValue(0);
  // The shatter, 0 (the mark) to 1 (the starfield).
  const shatter = useMotionValue(0);
  // Where the pieces settle, and therefore where the field's first stars
  // are seeded. As many as the field launches with (see SpaceParticles).
  // Client-only (the server has no viewport); nothing in the DOM depends on
  // it, so there is no hydration mismatch to worry about.
  const [starSeeds] = useState<StarSeed[]>(() =>
    typeof window === "undefined"
      ? []
      : makeStarSeeds(window.innerWidth <= 768 ? 120 : 240, window.innerHeight),
  );
  const [handedOff, setHandedOff] = useState(false);
  // The sky clears while the pieces are still flying, so they land in the
  // page, not in the loader.
  const skyOpacity = useTransform(shatter, [0.25, 0.85], [1, 0]);
  // The signature arrives with the last of the particles, not after them:
  // it is the mark being signed as it completes.
  const signatureOpacity = useTransform(progress, [0.82, 1], [0, 1]);
  const signatureY = useTransform(progress, [0.82, 1], [10, 0]);
  const [markSize] = useState(markSizeFor);
  // Only the stage name goes through React (three changes in the loader's
  // life); the progress itself is a motion value the canvas reads per frame.
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const startedAt = performance.now();
    let reached = 0;
    let shown = 0;
    let last = startedAt;
    let formedAt = 0;
    let raf = 0;
    let cancelled = false;
    let namedStage = -1;

    const pass = () => {
      if (cancelled) return;
      reached = Math.min(GATES.length, reached + 1);
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;

      const target = (reached / GATES.length) * 100;
      const step = Math.min(MAX_SPEED, (target - shown) * 0.008) * dt;
      shown = Math.min(target, shown + step);
      // Snapped home once visually there, so the mark hands over to its
      // own physics instead of creeping toward 1 forever.
      const value = shown >= 99.9 ? 1 : shown / 100;
      progress.set(value);

      const atStage = Math.min(GATES.length, Math.floor(shown / (100 / GATES.length)));
      if (atStage !== namedStage) {
        namedStage = atStage;
        setStage(atStage);
      }

      if (reached === GATES.length && value === 1) {
        if (!formedAt) formedAt = now;
        if (now - formedAt >= HOLD_FORMED_MS) {
          setReady(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    // Gate 1 — the document itself is parsed.
    const onDomReady = () => pass();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
    } else {
      pass();
    }

    // Gate 2 — the local faces this site sets its type in have landed.
    if (document.fonts) {
      document.fonts.ready.then(pass, pass);
    } else {
      pass();
    }

    // Gate 3 — every subresource the page asked for is aboard.
    const onLoad = () => pass();
    if (document.readyState === "complete") {
      pass();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    const failsafe = window.setTimeout(() => {
      if (cancelled) return;
      reached = GATES.length;
    }, MAX_WAIT_MS);

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      document.removeEventListener("DOMContentLoaded", onDomReady);
      window.removeEventListener("load", onLoad);
      document.body.style.overflow = "";
    };
  }, [progress]);

  useEffect(() => {
    if (!ready) return;
    document.body.style.overflow = "";
    let timeout = 0;

    const handOff = () => {
      window.dispatchEvent(
        new CustomEvent<StarfieldSeedDetail>(STARFIELD_SEED_EVENT, {
          detail: { stars: starSeeds },
        }),
      );
      setHandedOff(true);
      timeout = window.setTimeout(() => setHidden(true), HANDOFF_FADE_MS + 60);
    };

    // Reduced motion: no burst. The field is seeded and the loader fades.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shatter.set(1);
      handOff();
      return () => window.clearTimeout(timeout);
    }

    // Linear here; each particle shapes its own route (fast out of the
    // burst, easing into its seat).
    const burst = animate(shatter, 1, {
      duration: SHATTER_S,
      ease: "linear",
      onComplete: handOff,
    });
    return () => {
      burst.stop();
      window.clearTimeout(timeout);
    };
  }, [ready, shatter, starSeeds]);

  if (hidden) return null;

  const stageLabel = GATES[stage]?.label ?? "Cleared for departure";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      className={`fixed inset-0 z-100 overflow-hidden ${ready ? "pointer-events-none" : ""}`}
    >
      {/* The sky. Its own layer so it can dissolve on the exit while the
         mark is still flying at the camera — underneath it is the page, whose
         first frame is the `departure` gradient, so the dissolve lands on
         panel one rather than cutting to it. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: skyOpacity,
          background:
            "radial-gradient(120% 90% at 50% 50%, #04121f 0%, #020a13 55%, #01050a 100%)",
        }}
      >
        {/* The real sky: Umar's /bg.gif, drifting very slowly. Keep the photo
           small (it is part of what the loader waits for) and dark in the
           middle, where the US forms. */}
        <div
          className="loader-photo absolute -inset-[6%] bg-cover bg-center"
          style={{ backgroundImage: "url(/bg.gif)" }}
        />
        {/* A second sky (bg2.jpg), held at zero opacity and smoothly blended
           up over the sky above it and back — same box, so it reads as the
           frame itself drifting into another view rather than a hard cut. */}
        <div
          aria-hidden="true"
          className="loader-photo-glitch absolute -inset-[6%] bg-cover bg-center"
          style={{ backgroundImage: "url(/bg2.jpg)" }}
        />
        <div
          className="loader-nebula-b absolute -inset-[20%]"
          style={{
            background:
              "radial-gradient(38% 32% at 70% 72%, rgba(91,141,177,0.10) 0%, rgba(21,48,85,0.05) 45%, transparent 70%)",
          }}
        />
        <div
          className="loader-stars absolute inset-0"
          style={{ background: STARS_NEAR, backgroundSize: "220px 220px" }}
        />
        <div
          className="loader-stars-late absolute inset-0"
          style={{ background: STARS_FAR, backgroundSize: "140px 140px" }}
        />
        {/* A slow dark pool blended into the sky under it (mix-blend-mode:
           darken, not just stacked opacity), so the backdrop keeps its own
           quiet drift independent of the mark's shatter — and the centre,
           where the US forms, stays the darkest part of the frame as it
           wanders. */}
        <div
          aria-hidden="true"
          className="loader-darken absolute -inset-[25%]"
          style={{
            background:
              "radial-gradient(42% 42% at 50% 50%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 45%, transparent 75%)",
            mixBlendMode: "darken",
          }}
        />
      </motion.div>

      {/* The mark, full-screen so it can shatter across the whole viewport.
         It stays fully opaque through the shatter — its last frame is the
         starfield's first — and is only taken away once the field has been
         seeded with the same stars. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity ease-out ${
          handedOff ? "opacity-0" : "opacity-100"
        }`}
        style={{ transitionDuration: `${HANDOFF_FADE_MS}ms` }}
      >
        <ParticleLogo
          progress={progress}
          shatter={shatter}
          shatterInto={starSeeds}
          size={markSize}
          particleCount={1100}
          disperseStrength={Math.round(markSize * 1.5)}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {/* The signature, under the mark. Positioned off the mark's own size
         (see the `top` below), so it sits the same distance below the US
         at any screen size. It fades with the sky on the exit rather than
         flying: it is under the mark, not part of it. */}
      <motion.div
        className={`pointer-events-none absolute inset-x-0 flex justify-center transition-opacity duration-300 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
        // The same size markSizeFor() computes, in CSS: set from JS it
        // differs between the server's guess and the client's measurement,
        // which is a hydration mismatch on the very first element painted.
        style={{ top: "calc(50% + clamp(190px, 46vmin, 360px) * 0.47)" }}
      >
        <motion.div style={{ opacity: signatureOpacity, y: signatureY }}>
          <SignatureName
            active={!ready}
            className="text-[clamp(1.6rem,6vw,2.6rem)] text-sky-100/90 drop-shadow-[0_2px_18px_rgba(125,211,252,0.35)]"
          />
        </motion.div>
      </motion.div>

      <span className="sr-only">
        {ready ? "Loaded" : `Loading — ${stageLabel}`}
      </span>

      {/* Umar's line. It stays in the lower edge, out of the mark's way. */}
      <p
        className={`absolute inset-x-0 bottom-10 px-6 text-center text-xs font-semibold uppercase tracking-[0.32em] text-sky-100/60 transition-opacity duration-300 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        Loading his world. thanks for visiting.
      </p>
    </div>
  );
}
