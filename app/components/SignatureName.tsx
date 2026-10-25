"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export const SIGNATURE_FACES = [
  { varName: "--font-sign-stylescript", scale: 1.24, tracking: "0.01em" },
  { varName: "--font-sign-leckerli", scale: 0.88, tracking: "0em" },
  { varName: "--font-sign-pacifico", scale: 0.92, tracking: "0em" },
  { varName: "--font-sign-sendflowers", scale: 1.03, tracking: "0.01em" },
  { varName: "--font-sign-passion", scale: 0.95, tracking: "0.01em" },
] as const;

const FACES = SIGNATURE_FACES;
const HOLD_MS = 2100;

// The traveller's title, carried wherever the signature goes.
//
// It lives here rather than at the four call sites so the name and the title
// cannot drift apart, and so a fifth placement gets it without being told.
// Deliberately *not* set in a handwriting face: two scripts stacked read as
// two signatures arguing. It is the chrome's own eyebrow treatment instead,
// sized in `em` so it follows whatever size each caller asks the signature
// for, with a floor that keeps it legible on the mobile entry card.
export const SIGNATURE_TITLE = "Skyline Nomad";

export default function SignatureName({
  text = "Umar Suhail",
  title = SIGNATURE_TITLE,
  className = "",
  active = true,
}: {
  text?: string;
  /** `null` drops the title where there is genuinely no room for it. */
  title?: string | null;
  className?: string;
  active?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % FACES.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [active]);

  const face = FACES[index];

  const signature = (
    <span className="relative block h-[1.3em] w-full" aria-label={text}>
      <AnimatePresence initial={false}>
        <motion.span
          key={face.varName}
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.9, y: "0.1em" }}
          animate={{ opacity: 1, scale: 1, y: "0em" }}
          exit={{ opacity: 0, scale: 1.08, y: "-0.1em" }}
          transition={{
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

  if (!title) return <span className={`block w-full ${className}`}>{signature}</span>;

  return (
    <span className={`block w-full ${className}`}>
      {/* The signature keeps its own 1.3em box untouched: the loader pins
          its position against the US mark's geometry, and a wrapper that
          changed that height would move the mark's neighbour. */}
      {signature}
      <span className="mt-[0.35em] block whitespace-nowrap text-center font-semibold uppercase leading-none text-sky-200/55 text-[max(9px,0.26em)] tracking-[0.42em] indent-[0.42em]">
        {title}
      </span>
    </span>
  );
}
