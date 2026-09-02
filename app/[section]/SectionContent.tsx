"use client";

import { motion, stagger, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeftIcon } from "../components/icons/arrow-left";
import { ArrowRightIcon } from "../components/icons/arrow-right";
import { CardIcon } from "../components/icons/card-icon";
import { DownloadIcon } from "../components/icons/download";
import type { AnimatedIconHandle } from "../components/icons/card-icon";
import type { FlightCard } from "../data/sections";
import CallbackForm from "../components/CallbackForm";
import NarratedText from "../components/NarratedText";

const RESUME_URL = "/umar-suhail-resume-2026.pdf";

const SKILL_ICONS = [
  { name: "React", src: "/images/react.webp" },
  { name: "Next.js", src: "/images/next.png" },
  { name: "TypeScript", src: "/images/typescript.svg" },
  { name: "JavaScript", src: "/images/javascript.png" },
  { name: "Tailwind CSS", src: "/images/tailwind.png" },
];

export function SectionContent({
  card,
  gradient,
  previous,
  next,
}: {
  card: FlightCard;
  gradient: string;
  previous: FlightCard;
  next: FlightCard;
}) {
  const backArrowRef = useRef<AnimatedIconHandle>(null);
  const previousArrowRef = useRef<AnimatedIconHandle>(null);
  const nextArrowRef = useRef<AnimatedIconHandle>(null);
  const downloadRef = useRef<AnimatedIconHandle>(null);

  // Framer Motion animation variants for staggered children
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { delayChildren: stagger(0.1, { startDelay: 0.1 }) },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-4xl px-6 pb-24 pt-28 sm:px-8"
    >
      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/60 transition-colors hover:text-sky-50"
          onMouseEnter={() => backArrowRef.current?.startAnimation()}
          onMouseLeave={() => backArrowRef.current?.stopAnimation()}
        >
          <ArrowLeftIcon ref={backArrowRef} size={14} aria-hidden="true" />
          Back to the flight
        </Link>
      </motion.div>

      {/* OPTIONAL HERO IMAGE */}
      {card.image && (
        <motion.div
          variants={itemVariants}
          className="relative mt-8 h-[35vh] min-h-[300px] w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl sm:h-[45vh]"
        >
          <div className="absolute inset-0 bg-slate-900/20 mix-blend-multiply z-10" />
          <Image
            src={card.image}
            alt={card.title}
            fill
            className="object-cover transition-transform duration-1000 ease-out hover:scale-105"
            priority
          />
        </motion.div>
      )}

      {/* HEADER ENTRY */}
      <motion.header
        variants={itemVariants}
        className={`relative overflow-hidden rounded-[2rem] border border-white/15 p-8 shadow-[0_32px_80px_-20px_rgba(2,8,23,0.7)] sm:p-12 ${
          card.image ? "mt-8" : "mt-12"
        }`}
        style={{ background: gradient }}
      >
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100 backdrop-blur-md">
            <CardIcon id={card.id} size={14} aria-hidden="true" />
            {card.eyebrow}
          </span>
          <h1 className="mt-6 max-w-[20ch] text-4xl font-semibold leading-[1.1] text-sky-50 sm:text-5xl lg:text-6xl">
            {card.title}
          </h1>
          <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-slate-100/90 sm:text-lg">
            <NarratedText id={card.id} text={card.description} />
          </p>

          {card.id === "resume" && (
            <a
              href={RESUME_URL}
              download
              onMouseEnter={() => downloadRef.current?.startAnimation()}
              onMouseLeave={() => downloadRef.current?.stopAnimation()}
              className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-sky-50 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/20"
            >
              <DownloadIcon ref={downloadRef} size={16} aria-hidden="true" />
              Download Resume
            </a>
          )}
        </div>

        {/* Subtle decorative glow overlay inside the header */}
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </motion.header>

      {/* SKILL ICONS */}
      {card.id === "skills" && (
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6"
        >
          {SKILL_ICONS.map((skill, idx) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, y: 24, scale: 0.7 }}
              animate={{ opacity: 1, y: [0, -10, 0], scale: 1 }}
              transition={{
                opacity: { duration: 0.5, delay: 0.35 + idx * 0.08 },
                scale: {
                  type: "spring",
                  stiffness: 200,
                  damping: 14,
                  delay: 0.35 + idx * 0.08,
                },
                y: {
                  duration: 2.6 + idx * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.9 + idx * 0.08,
                },
              }}
              whileHover={{ scale: 1.15, y: -8, transition: { duration: 0.25 } }}
              title={skill.name}
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-lg backdrop-blur-sm transition-colors hover:border-sky-300/40 hover:bg-white/[0.08] sm:h-20 sm:w-20"
            >
              <Image
                src={skill.src}
                alt={skill.name}
                width={48}
                height={48}
                className="h-full w-full object-contain"
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* DETAILS LIST */}
      <motion.section
        variants={itemVariants}
        aria-labelledby="details-heading"
        className="mt-16"
      >
        <div className="flex items-center gap-4">
          <h2
            id="details-heading"
            className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-100/60"
          >
            Details
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <ul className="mt-8 space-y-4">
          {card.details.map((line, idx) => (
            <motion.li
              variants={itemVariants}
              key={idx}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-5 text-sm leading-relaxed text-slate-100/80 backdrop-blur-sm transition-colors hover:bg-white/[0.04] sm:text-base"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-white/10 transition-all group-hover:bg-sky-400/40" />
              {line}
            </motion.li>
          ))}
        </ul>
      </motion.section>

      {card.id === "contact" && (
        <motion.div variants={itemVariants}>
          <CallbackForm />
        </motion.div>
      )}

      {/* FOOTER NAVIGATION */}
      <motion.nav
        variants={itemVariants}
        aria-label="Other sections"
        className="mt-20 flex flex-col gap-6 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between"
      >
        <Link
          href={`/${previous.id}`}
          className="group flex flex-col items-start gap-1 transition-colors hover:text-sky-50"
          onMouseEnter={() => previousArrowRef.current?.startAnimation()}
          onMouseLeave={() => previousArrowRef.current?.stopAnimation()}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-100/40">
            Previous
          </span>
          <div className="flex items-center gap-3 text-sm font-medium text-sky-100/80">
            <ArrowLeftIcon ref={previousArrowRef} size={16} aria-hidden="true" />
            <span>{previous.eyebrow.replace(/^\d+\s*\/\s*/, "")}</span>
          </div>
        </Link>
        <Link
          href={`/${next.id}`}
          className="group flex flex-col items-start sm:items-end gap-1 transition-colors hover:text-sky-50"
          onMouseEnter={() => nextArrowRef.current?.startAnimation()}
          onMouseLeave={() => nextArrowRef.current?.stopAnimation()}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-100/40">
            Next
          </span>
          <div className="flex items-center gap-3 text-sm font-medium text-sky-100/80">
            <span>{next.eyebrow.replace(/^\d+\s*\/\s*/, "")}</span>
            <ArrowRightIcon ref={nextArrowRef} size={16} aria-hidden="true" />
          </div>
        </Link>
      </motion.nav>
    </motion.div>
  );
}
