"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playTick } from "../lib/tick-sound";
import {
  setTravelGear,
  TRAVEL_GEAR_IDS,
  useTravelGear,
} from "../lib/travel-gear";

// The gear lives in the middle of the dial, where the page number used to be.
//
// It is one button, not three: the dial has room for exactly one readout at
// its centre, and a gearbox that shows the gear you are in and steps to the
// next one is the same control a watch's pusher is. The number in the middle
// of the face is therefore the gear, and the section you are in is named on
// the card above the dial — which is where a name that long belongs anyway.
//
// Changing gear takes a three-second hold. It is not a click because it is
// not a preference: it changes how far every scroll and every turn of the
// ring travels, mid-journey, under someone who is reading. The length of the
// hold is the part of the gesture that says so — you have to mean it, and you
// have three seconds to change your mind. The ring drawing around the button
// is not decoration either: a press that does nothing for three seconds reads
// as a broken button.
const HOLD_MS = 3000;

const RING_RADIUS = 27;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function DialGearButton({ compact }: { compact: boolean }) {
  const gear = useTravelGear();
  const [holding, setHolding] = useState(false);
  const timerRef = useRef(0);
  // Whether the hold came from a finger, for the same reason the dial gates
  // its own haptics: Chrome logs an intervention on every navigator.vibrate
  // that a real tap did not precede.
  const isTouchRef = useRef(false);

  const cancelHold = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setHolding(false);
  }, []);

  const beginHold = useCallback(
    (fromTouch: boolean) => {
      isTouchRef.current = fromTouch;
      setHolding(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setHolding(false);
        // One button, so engaging means stepping: 1 -> 2 -> 3 -> 1.
        const next =
          TRAVEL_GEAR_IDS[(TRAVEL_GEAR_IDS.indexOf(gear.id) + 1) % TRAVEL_GEAR_IDS.length];
        setTravelGear(next);
        // Lower and longer than the ring's detent click, so a gear change
        // never sounds like one more notch.
        playTick(0.72, 0.42);
        if (!isTouchRef.current) return;
        try {
          navigator.vibrate?.([14, 40, 14]);
        } catch {
          /* unsupported or blocked by policy — the sound carries it */
        }
      }, HOLD_MS);
    },
    [gear.id],
  );

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // Same reason the dial itself watches the window for its release: if the
  // pointerup is lost — capture broken, released outside, tab switched away —
  // a hold nobody is holding would keep counting and change gear on its own
  // three seconds later.
  useEffect(() => {
    if (!holding) return;
    window.addEventListener("pointerup", cancelHold);
    window.addEventListener("pointercancel", cancelHold);
    window.addEventListener("blur", cancelHold);
    return () => {
      window.removeEventListener("pointerup", cancelHold);
      window.removeEventListener("pointercancel", cancelHold);
      window.removeEventListener("blur", cancelHold);
    };
  }, [holding, cancelHold]);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${gear.label} engaged. ${gear.description} Hold three seconds for the next gear.`}
      className="cursor-pointer outline-none [&:focus-visible_.gear-face]:stroke-sky-300/70"
      // Every pointer event stops here. The whole dial is a drag surface, and
      // without this, pressing the gear would also grab the bezel and fly the
      // page while the hold ran.
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        beginHold(e.pointerType === "touch");
      }}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => {
        e.stopPropagation();
        cancelHold();
      }}
      onPointerCancel={cancelHold}
      // Capture means sliding off still reports a leave, so a finger that
      // wanders off the button cancels rather than engaging behind your back.
      onPointerLeave={cancelHold}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        // Space scrolls the page and both keys fire a click on release; the
        // hold has to be the only way in, from any input.
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        beginHold(false);
      }}
      onKeyUp={cancelHold}
      onBlur={cancelHold}
    >
      <defs>
        {/* Black neumorphism, done with gradients rather than blurred
           shadows: an SVG drop-shadow filter rasterises its subtree into an
           offscreen buffer every frame this ring turns, which is exactly the
           cost the compact dial strips out elsewhere. A bevel ring lit from
           the top-left and a face gradient running the same way read as
           raised at this size for nothing. */}
        <linearGradient id="gear-face" x1="18%" y1="0%" x2="82%" y2="100%">
          <stop offset="0%" stopColor="#151b25" />
          <stop offset="55%" stopColor="#0a0e15" />
          <stop offset="100%" stopColor="#05070b" />
        </linearGradient>
        <linearGradient id="gear-face-pressed" x1="82%" y1="100%" x2="18%" y2="0%">
          <stop offset="0%" stopColor="#151b25" />
          <stop offset="55%" stopColor="#05070b" />
          <stop offset="100%" stopColor="#02040a" />
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
         cap itself, then the bevel. Held, the whole stack flips its lighting
         so the cap reads as pushed into the dial for the length of the hold. */}
      <circle cx="60" cy="60" r="24" fill="rgba(0,0,0,0.55)" />
      <circle
        className="gear-face"
        cx="60"
        cy="60"
        r={holding ? 21.4 : 22}
        fill={holding ? "url(#gear-face-pressed)" : "url(#gear-face)"}
        stroke="transparent"
        strokeWidth="1.5"
        style={{ transition: "r 180ms ease-out" }}
      />
      <circle
        cx="60"
        cy="60"
        r={holding ? 21.4 : 22}
        fill="none"
        stroke={holding ? "url(#gear-bevel-pressed)" : "url(#gear-bevel)"}
        strokeWidth="1.8"
        style={{ transition: "r 180ms ease-out" }}
      />

      {/* The readout: what gear you are in. */}
      <text
        x="60"
        y={compact ? 55 : 54.5}
        textAnchor="middle"
        className={`fill-slate-500 font-semibold ${compact ? "text-[5px]" : "text-[6px]"}`}
        style={{ letterSpacing: "0.32em" }}
      >
        GEAR
      </text>
      <text
        x="60"
        y={compact ? 70 : 70}
        textAnchor="middle"
        className={`fill-sky-100 font-semibold tabular-nums ${
          compact ? "text-[17px]" : "text-[20px]"
        }`}
        style={{ letterSpacing: "0.02em" }}
      >
        {gear.id}
      </text>

      {/* Hold progress. A dash offset on a linear transition rather than an
         animation loop: the browser owns the three seconds, and cancelling is
         one fast transition back to empty. */}
      <circle
        cx="60"
        cy="60"
        r={RING_RADIUS}
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={holding ? 0 : RING_CIRCUMFERENCE}
        transform="rotate(-90 60 60)"
        pointerEvents="none"
        style={{
          opacity: holding ? 0.95 : 0,
          transition: holding
            ? `stroke-dashoffset ${HOLD_MS}ms linear, opacity 120ms ease-out`
            : "stroke-dashoffset 200ms ease-out, opacity 260ms ease-out",
        }}
      />
    </g>
  );
}
