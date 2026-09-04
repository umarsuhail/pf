"use client";

import { motion } from "framer-motion";
import { experiences, projects, skills, contact } from "../data/profile";

// Marvel-style end-title crawl — self-playing, not scroll-driven, so it
// keeps rolling regardless of whether the visitor is still scrolling,
// pulling toward the globe, or has stopped entirely at the end of the track.
type CreditBlock = { heading: string; lines: string[] };

const CREDIT_BLOCKS: CreditBlock[] = [
  { heading: "Portfolio Of", lines: ["Umar Suhail"] },
  {
    heading: "Role",
    lines: ["Lead Frontend Engineer", "Application Developer"],
  },
  {
    heading: "Featuring",
    lines: skills.filter((s) => s.level === "Expert").map((s) => s.name),
  },
  { heading: "Projects", lines: projects.map((p) => p.name) },
  { heading: "Experience", lines: experiences.map((e) => e.company) },
  { heading: "Originally From", lines: ["Thrissur, Kerala"] },
  { heading: "Based In", lines: ["Abu Dhabi, United Arab Emirates"] },
  {
    heading: "Get In Touch",
    lines: [contact.email, contact.linkedin, contact.github],
  },
  { heading: "Thank You For Flying", lines: ["umarsuhail.dev"] },
];

const CRAWL_DURATION = 55;

function CreditsColumn() {
  return (
    <div className="flex flex-col items-end gap-10 pb-24">
      {CREDIT_BLOCKS.map((block, i) => (
        <div key={i} className="text-right">
          <p className="text-[9px] font-semibold uppercase tracking-[0.42em] text-sky-300/50">
          
            {block.heading}
          </p>
          <div className="mt-2 space-y-1">
            {block.lines.map((line, j) => (
              <p
                key={j}
                className="text-xs font-medium uppercase tracking-[0.12em] text-sky-100/70 sm:text-sm"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EndCredits() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-[6%] hidden w-[min(30vw,320px)] overflow-hidden [mask-image:linear-gradient(180deg,transparent_0%,black_14%,black_86%,transparent_100%)] sm:block">
      {/* The doubled list plus a -50% loop is the standard seamless-marquee
         trick: at the halfway mark the second copy is exactly where the
         first started, so the reset is invisible. */}
      <motion.div
        animate={{ y: ["0%", "-50%"] }}
        transition={{ duration: CRAWL_DURATION, repeat: Infinity, ease: "linear" }}
      >
        <CreditsColumn />
        <CreditsColumn />
      </motion.div>
    </div>
  );
}
