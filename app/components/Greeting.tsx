"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SIGNATURE_FACES } from "./SignatureName";
import { useEffect, useState } from "react";

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// One boot-screen-style cycle per time of day — same spirit as the iPhone
// "hello" startup screen, just swapped for a greeting that actually matches
// when the visitor is looking at it.
const GREETINGS: Record<TimeOfDay, string[]> = {
  morning: [
    "Good Morning",
    "Buenos Días",
    "Bonjour",
    "Guten Morgen",
    "Bom Dia",
    "Buongiorno",
    "おはようございます",
    "早上好",
    "좋은 아침이에요",
    "صباح الخير",
    "सुप्रभात",
    "Доброе утро",
  ],
  afternoon: [
    "Good Afternoon",
    "Buenas Tardes",
    "Bon Après-midi",
    "Guten Tag",
    "Boa Tarde",
    "Buon Pomeriggio",
    "こんにちは",
    "下午好",
    "안녕하세요",
    "مساء الخير",
    "शुभ दोपहर",
    "Добрый день",
  ],
  evening: [
    "Good Evening",
    "Buenas Noches",
    "Bonsoir",
    "Guten Abend",
    "Boa Noite",
    "Buonasera",
    "こんばんは",
    "晚上好",
    "안녕하세요",
    "مساء الخير",
    "शुभ संध्या",
    "Добрый вечер",
  ],
  night: [
    "Good Night",
    "Buenas Noches",
    "Bonne Nuit",
    "Gute Nacht",
    "Boa Noite",
    "Buonanotte",
    "おやすみなさい",
    "晚安",
    "안녕히 주무세요",
    "تصبح على خير",
    "शुभ रात्रि",
    "Спокойной ночи",
  ],
};

// One line's worth of room, held constant. 1.45em clears the tallest
// ascender/descender in the set at the largest applied scale (1.24) and
// leaves headroom for the non-Latin greetings, which fall back to a system
// face whose metrics this list cannot correct for. It sits inside the range
// the heading used to occupy in flow (leading-tight against faces scaled
// 0.88-1.24), so reserving it changes the composition by nothing.
const BOX = "h-[1.45em]";

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export default function Greeting({ className = "" }: { className?: string }) {
  // Null until mounted — the visitor's local hour is only knowable on the
  // client, and guessing during server rendering would mismatch on hydration.
  const [words, setWords] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // The local hour is an external, client-only input (unknowable during
    // SSR) — this is the one-time read-and-store effect React's own docs
    // carve out an exception for, not state derivable from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWords(GREETINGS[getTimeOfDay(new Date().getHours())]);
  }, []);

  useEffect(() => {
    if (!words) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, 1800);
    return () => clearInterval(id);
  }, [words]);

  // Same fixed box as the mounted state, so the first real greeting drops
  // into a slot that already exists instead of growing the heading.
  if (!words) return <span className={`inline-block ${BOX} ${className}`} />;

  // Each greeting is set in a different hand, drawn from the same pool the
  // signature cycles through (TwinkleStar, the single decorative face this
  // used to use, no longer exists). The face is keyed off the word index
  // rather than its own timer, so a new language and a new hand always
  // arrive together as one change instead of drifting against each other.
  //
  // `scale` and `tracking` come from the shared list and matter as much here:
  // these faces set the same string at widths up to 40% apart, and without
  // the correction each greeting would land at a visibly different size.
  const face = SIGNATURE_FACES[index % SIGNATURE_FACES.length];

  return (
    // A fixed box with every greeting taken out of flow inside it — the same
    // device SignatureName uses, for the same reason. In flow, each greeting
    // was sizing the <h2> itself: these faces differ in metrics and each
    // carries its own `scale`, so the heading's height changed on every swap
    // and the bio and button below it stepped. `mode="wait"` made it far
    // worse — the outgoing word unmounted before the incoming one arrived, so
    // for half a second the heading held no line box at all and the whole
    // column collapsed upward and sprang back. With a fixed box and a sync
    // crossfade, nothing downstream can move no matter which face, language
    // or script is mounted.
    <span
      className={`relative inline-block ${BOX} align-top ${className}`}
      aria-label={words[index]}
    >
      {/* An invisible copy of the current greeting, in flow, purely to give
         the box a width — everything visible below is out of flow, so without
         this the span (and the <h2> around it, which is sized to its content
         in the card's flex column) would measure zero wide. Only its width is
         used; its height is overridden by the fixed box. And since the
         greeting is left-aligned and the visible copies anchor to the left
         edge, a width that changes with the word moves nothing. */}
      <span
        aria-hidden="true"
        className="invisible block whitespace-nowrap leading-none"
        style={{
          fontFamily: `var(${face.varName})`,
          fontSize: `${face.scale}em`,
          letterSpacing: face.tracking,
        }}
      >
        {words[index]}
      </span>

      {/* Default (sync) mode, not popLayout: both words animate at once for a
         real crossfade, and neither participates in layout. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={index}
          aria-hidden="true"
          initial={{ opacity: 0, y: "0.18em", scale: 0.94 }}
          animate={{ opacity: 1, y: "0em", scale: 1 }}
          exit={{ opacity: 0, y: "-0.18em", scale: 1.05 }}
          transition={{
            // Opacity settles first so two different hands are never both
            // fully legible at once — overlapping legibility is what reads as
            // a double image when their widths differ this much.
            opacity: { duration: 0.35, ease: "easeInOut" },
            y: { duration: 0.55, ease: "easeInOut" },
            scale: { duration: 0.55, ease: "easeInOut" },
          }}
          className="absolute inset-0 flex items-center justify-start whitespace-nowrap leading-none"
          style={{
            fontFamily: `var(${face.varName})`,
            fontSize: `${face.scale}em`,
            letterSpacing: face.tracking,
            transformOrigin: "0% 50%",
            willChange: "transform, opacity",
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
