"use client";

import { useEffect, useState } from "react";
import { playTick } from "../lib/tick-sound";

// The middle of the dial, which used to be the gearbox.
//
// The gears are gone — the flight does not snap any more, so there is no
// ratio left to choose — and the one readout the dial has room for is better
// spent on the way in to the assistant. HoloChat already owns its own open
// state and listens for `toggle-holochat`; this is a trigger, not a second
// source of truth, so it reads the state back off `holochat-state`.
//
// A click, not a three-second hold. The hold existed because changing gear
// altered how far every gesture travelled under someone mid-read; opening a
// panel is reversible by the same button that opened it, so making it
// deliberate would be ceremony for its own sake.

// The glyph is lucide's bot-message-square, the same one HoloChat shows in
// its own header, inlined because this lives inside the dial's <svg> and the
// icon component renders a <div> around its own.
//
// Its art is a 24-unit box; the dial's face is 120 units with the button
// centred at (60, 60). Scaled to `size` units and offset by half of that, so
// the glyph's own centre lands on the button's.
function ChatGlyph({ size }: { size: number }) {
  const scale = size / 24;
  const offset = 60 - (24 * scale) / 2;
  return (
    <g
      transform={`translate(${offset} ${offset}) scale(${scale})`}
      fill="none"
      stroke="var(--flight-ink)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    >
      <path d="M12 6V2H8" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
      <path d="M9 11v2" />
      <path d="M15 11v2" />
    </g>
  );
}

export default function DialChatButton({ compact }: { compact: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const onState = (event: Event) =>
      setIsOpen(
        Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open),
      );
    window.addEventListener("holochat-state", onState as EventListener);
    return () =>
      window.removeEventListener("holochat-state", onState as EventListener);
  }, []);

  const toggle = () => {
    window.dispatchEvent(new CustomEvent("toggle-holochat"));
    // Lower and softer than the bezel's detent, so opening the assistant
    // never sounds like one more notch of travel.
    playTick(0.72, 0.42);
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={isOpen ? "Close the assistant" : "Open the assistant"}
      aria-pressed={isOpen}
      className="gear-control cursor-pointer outline-none"
      // Every pointer event stops here. The whole dial is a drag surface, and
      // without this, pressing the button would also grab the bezel and fly
      // the page out from under the press.
      onPointerDown={(e) => {
        e.stopPropagation();
        setPressed(true);
      }}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => {
        e.stopPropagation();
        setPressed(false);
        toggle();
      }}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        // Space would otherwise scroll the page out from under the dial.
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        setPressed(true);
      }}
      onKeyUp={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
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
           offscreen buffer every frame this ring turns, which is exactly the
           cost the compact dial strips out elsewhere. A bevel ring lit from
           the top-left and a face gradient running the same way read as
           raised at this size for nothing. */}
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
        {/* The bevel: light where the light is, black where it is not. */}
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

      {/* The button stands on the face: a soft dark seat under it, then the
         cap itself, then the bevel. Pressed, the whole stack flips its
         lighting so the cap reads as pushed into the dial. */}
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

      <ChatGlyph size={compact ? 19 : 22} />

      {/* Open, the accent ring sits lit around the cap — the same ring the
         gear's hold used to fill, reused as a plain state light. */}
      <circle
        cx="60"
        cy="60"
        r="27"
        fill="none"
        stroke="var(--flight-accent)"
        strokeWidth="2"
        pointerEvents="none"
        style={{
          opacity: isOpen ? 0.95 : 0,
          transition: "opacity 220ms ease-out",
        }}
      />
    </g>
  );
}
