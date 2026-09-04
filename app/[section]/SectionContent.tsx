"use client";

import { motion, stagger, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeftIcon } from "../components/icons/arrow-left";
import { ArrowRightIcon } from "../components/icons/arrow-right";
import { CardIcon } from "../components/icons/card-icon";
import type { AnimatedIconHandle } from "../components/icons/card-icon";
import type { FlightCard } from "../data/sections";
import CallbackForm from "../components/CallbackForm";
import NarratedText from "../components/NarratedText";
import HandwritingText from "../components/TypoGraphyHand";
import { SkillsShowcase } from "./SkillsShowcase";

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
    <>
      {card.id === "skills" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-slate-950/10 backdrop-blur-[6px]"
        />
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-24 pt-28 sm:px-8"
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

      {card.id === "skills" ? (
        <SkillsShowcase card={card} itemVariants={itemVariants} />
      ) : (
        <>
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
            className={`relative overflow-hidden rounded-[2rem] border border-white/15 p-8 shadow-[0_32px_80px_-20px_rgba(2,8,23,0.7)] sm:p-12 ${card.image ? "mt-8" : "mt-12"
              }`}
            style={{ background: gradient }}
          >
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100 backdrop-blur-md">
                <CardIcon id={card.id} size={14} aria-hidden="true" />
                {card.eyebrow}
              </span>
              <h1 className="mt-6 max-w-[20ch] text-4xl font-semibold leading-[1.1] text-sky-50 sm:text-5xl lg:text-6xl">
                <HandwritingText
                  className="text-5xl font-semibold"
                >
                  {card.title}
                </HandwritingText>

              </h1>
              <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-slate-100/90 sm:text-lg">
                <NarratedText id={card.id} text={card.description} />
              </p>
            </div>

            {/* Subtle decorative glow overlay inside the header */}
            <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          </motion.header>

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
        </>
      )}

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
    </>
  );
}
