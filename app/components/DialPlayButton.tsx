"use client";

import { useEffect, useState } from "react";
import { playTick } from "../lib/tick-sound";
import { markAutopilotTried, useAutoplayEnabled } from "../lib/visit-history";

// The middle of the dial: the autopilot's transport control.
//
// The face has held the page number, then the gearbox, then the assistant.
// This is the one that earns it — the dial is the instrument you travel with,
// and the autopilot is travel that drives itself, so starting and stopping it
// belongs on the same hand. The assistant moved back to the latch bar.
//
// It is only ever a trigger. MultiverseFlight owns the autopilot's lifecycle
// and broadcasts `flight-autopilot-state`; this reads that back so the glyph
// can never disagree with what the flight is actually doing — including when
// the tour ends on its own or hands back after a scroll.

function PlayGlyph({ size }: { size: number }) {
  const s = size / 24;
  const o = 60 - (24 * s) / 2;
  return (
    <g transform={`translate(${o} ${o}) scale(${s})`} pointerEvents="none">
      {/* Nudged right: a triangle centred on its bounding box reads as
          sitting left of centre, because its visual mass is at the base. */}
      <path d="M9 6.5 L18.5 12 L9 17.5 Z" fill="var(--flight-ink)" />
    </g>
  );
}

function PauseGlyph({ size }: { size: number }) {
  const s = size / 24;
  const o = 60 - (24 * s) / 2;
  return (
    <g transform={`translate(${o} ${o}) scale(${s})`} pointerEvents="none">
      <rect x="8" y="6.5" width="3" height="11" rx="1" fill="var(--flight-ink)" />
      <rect x="13" y="6.5" width="3" height="11" rx="1" fill="var(--flight-ink)" />
    </g>
  );
}

export default function DialPlayButton({ compact }: { compact: boolean }) {
  const [running, setRunning] = useState(false);
  const [pressed, setPressed] = useState(false);
  const enabled = useAutoplayEnabled();

  useEffect(() => {
    const onState = (event: Event) =>
      setRunning(
        Boolean((event as CustomEvent<{ running?: boolean }>).detail?.running),
      );
    window.addEventListener("flight-autopilot-state", onState as EventListener);
    return () =>
      window.removeEventListener(
        "flight-autopilot-state",
        onState as EventListener,
      );
  }, []);

  const toggle = () => {
    // Running means stop. The autopilot's `pause` leaves it armed to resume,
    // which is the right behaviour for a scroll handback but the wrong one
    // for a deliberate press on the transport.
    window.dispatchEvent(
      new CustomEvent("flight-autopilot", {
        detail: { action: running ? "stop" : "start" },
      }),
    );
    if (!running) markAutopilotTried();
    playTick(running ? 0.68 : 0.86, 0.42);
  };

  const label = !enabled
    ? "Autoplay is switched off in settings"
    : running
      ? "Stop the tour"
      : "Fly the tour";

  return (
    <g
      role="button"
      tabIndex={enabled ? 0 : -1}
      aria-label={label}
      aria-pressed={running}
      aria-disabled={!enabled}
      className={`gear-control outline-none ${
        enabled ? "cursor-pointer" : "cursor-default"
      }`}
      style={{ opacity: enabled ? 1 : 0.45 }}
      // Every pointer event stops here. The whole dial is a drag surface, and
      // without this, pressing the button would also grab the bezel and fly
      // the page out from under the press.
      onPointerDown={(e) => {
        e.stopPropagation();
        if (enabled) setPressed(true);
      }}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => {
        e.stopPropagation();
        setPressed(false);
        if (enabled) toggle();
      }}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onKeyDown={(e) => {
        if (!enabled || (e.key !== "Enter" && e.key !== " ")) return;
        // Space would otherwise scroll the page out from under the dial.
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        setPressed(true);
      }}
      onKeyUp={(e) => {
        if (!enabled || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        e.stopPropagation();
        setPressed(false);
        toggle();
      }}
      onBlur={() => setPressed(false)}
    >
      <defs>
        {/* Black neumorphism, done with gradients rather than blurred
           shadows: an SVG drop-shadow filter rasterises its subtree into an
           offscreen buffer every frame this ring turns. */}
        <linearGradient id="gear-face" x1="18%" y1="0%" x2="82%" y2="100%">
          <stop offset="0%" stopColor="var(--flight-gear-face-1)" />
          <stop offset="55%" stopColor="var(--flight-gear-face-2)" />
          <stop offset="100%" stopColor="var(--flight-gear-face-3)" />
        </linearGradient>
        <linearGradient id="gear-face-pressed" x1="82%" y1="100%" x2="18%" y2="0%">
          <stop offset="0%" stopColor="var(--flight-gear-face-1)" />
          <stop offset="55%" stopColor="var(--flight-gear-face-3)" />
          <stop offset="100%" stopColor="var(--flight-gear-face-pressed)" />
        </linearGradient>
        <linearGradient id="gear-bevel" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
        </linearGradient>
        <linearGradient id="gear-bevel-pressed" x1="80%" y1="100%" x2="20%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="45%" stopColor="rgba(0,0,0,0.6)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.9)" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="24" fill="color-mix(in srgb, var(--flight-dial-case) 72%, black)" />
      <circle
        className="gear-face"
        cx="60"
        cy="60"
        r={pressed ? 21.4 : 22}
        fill={pressed ? "url(#gear-face-pressed)" : "url(#gear-face)"}
        stroke="transparent"
        strokeWidth="1.5"
        style={{ transition: "r 180ms ease-out" }}
      />
      <circle
        cx="60"
        cy="60"
        r={pressed ? 21.4 : 22}
        fill="none"
        stroke={pressed ? "url(#gear-bevel-pressed)" : "url(#gear-bevel)"}
        strokeWidth="1.8"
        style={{ transition: "r 180ms ease-out" }}
      />

      {running ? (
        <PauseGlyph size={compact ? 19 : 22} />
      ) : (
        <PlayGlyph size={compact ? 19 : 22} />
      )}

      {/* Lit while the tour is flying. The same ring the gearbox's hold used
          to fill, reused as a state light. */}
      <circle
        cx="60"
        cy="60"
        r="27"
        fill="none"
        stroke="var(--flight-accent)"
        strokeWidth="2"
        pointerEvents="none"
        style={{
          opacity: running ? 0.95 : 0,
          transition: "opacity 220ms ease-out",
        }}
      />
    </g>
  );
}
