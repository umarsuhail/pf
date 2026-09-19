"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

// The faces the name cycles through, in order. Each is registered in
// layout.tsx via next/font/local; this only references the CSS variables it
// publishes, so nothing here can pull a font into the bundle on its own.
//
// `scale` is measured, not guessed. Rendered at an identical 60px these
// faces set "Umar Suhail" at 250px (StyleScript), 350px (Leckerli), 337px
// (Pacifico) and 301px (Send Flowers) — a 40% spread. Left uncorrected the
// name visibly jumps size on every swap instead of simply changing hand.
// Each value normalises that face's width to the set's mean (~310px), so the
// signature holds one footprint while the handwriting changes underneath it.
export const SIGNATURE_FACES = [
  { varName: "--font-sign-stylescript", scale: 1.24, tracking: "0.01em" },
  { varName: "--font-sign-leckerli", scale: 0.88, tracking: "0em" },
  { varName: "--font-sign-pacifico", scale: 0.92, tracking: "0em" },
  { varName: "--font-sign-sendflowers", scale: 1.03, tracking: "0.01em" },
  { varName: "--font-sign-passion", scale: 0.95, tracking: "0.01em" },
] as const;

const FACES = SIGNATURE_FACES;
const HOLD_MS = 2100;

export default function SignatureName({
  text = "Umar Suhail",
  className = "",
  /** Cycling only runs while this is true — it is the closing beat's own
   *  reveal flag, so the interval is not left running for the whole
   *  session while the signature is nowhere near the screen. */
  active = true,
}: {
  text?: string;
  className?: string;
  active?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    // prefers-reduced-motion: settle on the first face and stop. A typeface
    // swapping under you every couple of seconds is exactly the kind of
    // involuntary motion that setting exists to suppress.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % FACES.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [active]);

  const face = FACES[index];

  return (
    // The wrapper owns a fixed box and the faces are taken out of flow
    // entirely (absolutely positioned inside it). Previously both faces
    // shared one grid cell, so the cell tracked whichever was taller and the
    // hairline below it stepped on every swap — that layout reflow, not the
    // crossfade, was most of the "jump". With a fixed box nothing downstream
    // can move no matter which face is mounted, or how many.
    //
    // 1.3em of height clears the tallest ascender/descender in the set at
    // the largest applied scale (1.24), so no face is ever clipped.
    <span
      className={`relative block h-[1.3em] w-full ${className}`}
      aria-label={text}
    >
      {/* Default (sync) mode, not popLayout: both faces animate at once for a
         real crossfade, and since neither participates in layout there is
         nothing for popLayout to protect against. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={face.varName}
          aria-hidden="true"
          // The size difference between faces is absorbed *into* the motion
          // instead of being fought. Each face resolves out of a slight
          // under-scale and blur and leaves through a slight over-scale, so
          // a hand that happens to set larger reads as part of a deliberate
          // zoom-through rather than a size pop. Scaling from the centre
          // (transformOrigin below) keeps the name pinned while it changes.
          initial={{ opacity: 0, scale: 0.9, y: "0.1em", filter: "blur(7px)" }}
          animate={{ opacity: 1, scale: 1, y: "0em", filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.08, y: "-0.1em", filter: "blur(7px)" }}
          transition={{
            // Opacity settles fastest so the two hands are never both fully
            // legible at once — overlapping legibility is what reads as a
            // double image when their widths differ.
            opacity: { duration: 0.45, ease: "easeInOut" },
            scale: { duration: 0.9, ease: [0.165, 0.84, 0.44, 1] },
            y: { duration: 0.9, ease: [0.165, 0.84, 0.44, 1] },
            filter: { duration: 0.5, ease: "easeOut" },
          }}
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap leading-none"
          style={{
            fontFamily: `var(${face.varName})`,
            fontSize: `${face.scale}em`,
            letterSpacing: face.tracking,
            transformOrigin: "50% 50%",
            willChange: "transform, opacity, filter",
          }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
