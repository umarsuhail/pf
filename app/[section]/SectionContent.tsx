"use client";

import { motion, stagger, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { ArrowLeftIcon } from "../components/icons/arrow-left";
import { ArrowRightIcon } from "../components/icons/arrow-right";
import { ActivityIcon } from "../components/icons/activity";
import { BotIcon } from "../components/icons/bot";
import { CardIcon } from "../components/icons/card-icon";
import { CpuIcon } from "../components/icons/cpu";
import { FolderKanbanIcon } from "../components/icons/folder-kanban";
import { DownloadIcon } from "../components/icons/download";
import { HistoryIcon } from "../components/icons/history";
import { SparklesIcon } from "../components/icons/sparkles";
import { BrandIcon } from "../components/icons/brand-icon";
import type { AnimatedIconHandle } from "../components/icons/card-icon";
import { cards as allCards } from "../data/sections";
import type { FlightCard } from "../data/sections";
import { getSkillGroups } from "../data/skillGroups";
import CallbackForm from "../components/CallbackForm";
import NarratedText from "../components/NarratedText";
import HandwritingText from "../components/TypoGraphyHand";
import { ProjectMissionLog } from "./ProjectMissionLog";
import { SkillsShowcase } from "./SkillsShowcase";

const RESUME_PDF_URL = "/umar-suhail-resume-2026.pdf";

// Real numbers already established in the home card's own `details` line
// ("Stats: 7+ years experience, 6+ projects delivered, ...") — kept as a
// dedicated list here so the hero stat tiles can each get their own icon.
const HOME_STATS = [
  { Icon: HistoryIcon, value: "7+", label: "Years Experience" },
  { Icon: FolderKanbanIcon, value: "6+", label: "Projects Delivered" },
  { Icon: ActivityIcon, value: "1M+", label: "Transactions Monitored" },
  { Icon: CpuIcon, value: "50+", label: "Tenant Configurations" },
];

const WHAT_I_DO = [
  {
    Icon: SparklesIcon,
    title: "UI Engineering",
    description: "Building clean, responsive, and accessible user interfaces with React and Next.js.",
  },
  {
    Icon: CpuIcon,
    title: "Frontend Architecture",
    description: "Designing scalable, maintainable frontend systems and reusable component libraries.",
  },
  {
    Icon: ActivityIcon,
    title: "Data & Analytics",
    description: "Building enterprise dashboards for transaction monitoring, revenue tracking, and reporting.",
  },
  {
    Icon: BotIcon,
    title: "AI & Integrations",
    description: "Integrating AI-powered features like face recognition and chatbots into production apps.",
  },
];

const PANEL_CLASS =
  "relative overflow-hidden rounded-[1.5rem] border border-white/15 p-5 shadow-[0_32px_80px_-20px_rgba(2,8,23,0.7)] sm:rounded-[2rem] sm:p-10 lg:p-12";

function Eyebrow({ card }: { card: FlightCard }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100">
      <CardIcon id={card.id} size={14} aria-hidden="true" />
      {card.eyebrow}
    </span>
  );
}
function GlowOverlay() {
  return (
    <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
  );
}

// Contact details are single "Label: value" lines.
function parseContactLine(line: string): { label: string; value: string } {
  const separator = line.indexOf(": ");
  if (separator === -1) return { label: line, value: "" };
  return { label: line.slice(0, separator), value: line.slice(separator + 2) };
}

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

  const projects = useMemo(() => card.projects ?? [], [card.projects]);

  // Flat list (no group headings) for the home page's "Tech I Work With"
  // preview — same source (`skillGroups.ts`) the standalone /skills page and
  // the in-flight layovers use, so all three stay in sync automatically.
  const homeTechItems = useMemo(
    () => getSkillGroups(allCards.find((c) => c.id === "skills")?.details ?? []).flatMap((g) => g.items),
    [],
  );

  // Framer Motion animation variants for staggered children
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { delayChildren: stagger(0.1, { startDelay: 0.1 }) },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <>
      {card.id === "skills" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-slate-950/10 "
        />
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        // Runs to the full width of a desktop display instead of stopping at
        // a 4xl/6xl column — on a 1440px+ screen that left roughly a third of
        // the viewport empty on either side. Tighter gutters on phones
        // (px-4) buy back real reading width where it is scarcest, and the
        // 8xl ceiling keeps line length sane on ultrawide monitors.
        className="detail-page relative z-10 mx-auto w-full max-w-[110rem] px-4 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-28 lg:px-12 xl:px-16"
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

        {/* HOME — portrait hero, stat row, What I Do + Tech I Work With */}
        {card.id === "home" && (
          <>
            <motion.header
              variants={itemVariants}
              className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-2 lg:items-center lg:gap-16"
            >
              <div>
                <Eyebrow card={card} />
                <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  <HandwritingText className="block text-sky-50">
                    <span className="block">Hi, I&apos;m</span>
                    <span className="block text-emerald-300">Umar Suhail</span>
                  </HandwritingText>
                </h1>
                <p className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
                  Lead Frontend Engineer
                  <span className="h-1 w-1 rounded-full bg-emerald-300/60" aria-hidden="true" />
                  7+ Years Experience
                </p>
                <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-slate-100/80 sm:text-xl lg:text-[1.375rem]">
                  I build modern, scalable, and high-performance web applications with a strong
                  focus on clean UI, great user experience, and solving real-world problems
                  through code.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-300"
                  >
                    View My Work
                    <ArrowRightIcon size={14} aria-hidden="true" />
                  </Link>
                  <a
                    href={RESUME_PDF_URL}
                    download
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-sky-50 transition duration-300 hover:bg-white/10"
                  >
                    Download CV
                    <DownloadIcon size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Portrait — TODO: swap for a higher-res headshot if you have one */}
              <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                <div className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/10" />
                <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-white/10">
                  <Image src="/images/me-s.jpg" alt="Umar Suhail" fill className="object-cover" />
                </div>
                {[
                  { title: "UI Engineering", detail: "Design Systems", pos: "-left-4 top-8 sm:-left-8" },
                  { title: "Architecture", detail: "Scalable & Maintainable", pos: "-right-4 top-2 sm:-right-8" },
                  { title: "Frontend", detail: "React, Next.js, TypeScript", pos: "-left-4 bottom-16 sm:-left-8" },
                  { title: "Problem Solver", detail: "Turning ideas into real products", pos: "-right-4 bottom-6 sm:-right-8" },
                ].map((chip) => (
                  <div
                    key={chip.title}
                    className={`absolute hidden rounded-xl border border-white/10 bg-slate-900/85 px-4 py-3 shadow-lg sm:block ${chip.pos}`}
                  >
                    <p className="text-xs font-semibold text-sky-50">{chip.title}</p>
                    <p className="text-[11px] text-slate-100/60">{chip.detail}</p>
                  </div>
                ))}
              </div>
            </motion.header>

            <motion.div
              variants={itemVariants}
              className="mt-10 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-4 sm:p-6"
            >
              {HOME_STATS.map(({ Icon, value, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-sky-50">{value}</p>
                    <p className="text-xs text-slate-100/60">{label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <h2 className="text-lg font-semibold text-sky-50">What I Do</h2>
                <div className="mt-4 h-px w-12 bg-emerald-300/50" />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {WHAT_I_DO.map(({ Icon, title, description }) => (
                    <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-sky-50">{title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-100/70">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-sky-50">Tech I Work With</h2>
                <div className="mt-4 h-px w-12 bg-emerald-300/50" />
                <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                  {homeTechItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-4 text-center"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                        <BrandIcon slug={item.icon} className="h-6 w-6" />
                      </span>
                      <p className="text-xs text-slate-100/70">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* SKILLS — grouped showcase with real animated brand marks */}
        {card.id === "skills" && <SkillsShowcase card={card} itemVariants={itemVariants} />}

        {/* EXPERIENCE — standard header, timeline body below */}
        {card.id === "experience" && (
          <motion.header
            variants={itemVariants}
            className={`${PANEL_CLASS} mt-12`}
            style={{ background: gradient }}
          >
            <div className="relative z-10">
              <Eyebrow card={card} />
              <h1 className="mt-6 max-w-[24ch] text-[2.5rem] font-semibold leading-[1.08] text-sky-50 sm:text-6xl lg:text-7xl">
                <HandwritingText className="text-5xl font-semibold">{card.title}</HandwritingText>
              </h1>
              <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-slate-100/90 sm:text-xl lg:text-[1.375rem]">
                <NarratedText id={card.id} text={card.description} />
              </p>
            </div>
            <GlowOverlay />
          </motion.header>
        )}

        {card.id === "projects" && (
          <motion.div variants={itemVariants} className="mt-12">
            <ProjectMissionLog projects={projects} />
          </motion.div>
        )}

        {/* EXPERIENCE — vertical timeline */}
        {card.id === "experience" && (
          <motion.section variants={itemVariants} className="mt-16">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-100/60">
                Career Timeline
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="relative mt-10 space-y-10 border-l border-white/10 pl-8">
              {(card.timeline ?? []).map((job) => (
                <motion.div variants={itemVariants} key={job.company} className="relative">
                  <span className="absolute -left-[2.375rem] top-1.5 h-3 w-3 rounded-full bg-sky-400 ring-4 ring-sky-400/20" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-100/50">
                    {job.period} · {job.location}
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold text-sky-50">
                    {job.role} — {job.company}
                  </h3>
                  <p className="mt-2 max-w-[72ch] text-base leading-relaxed text-slate-100/80">
                    {job.summary}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* CONTACT — single full-width panel with the contact grid */}
        {card.id === "contact" && (
          <motion.section
            variants={itemVariants}
            className={`${PANEL_CLASS} mt-12`}
            style={{ background: gradient }}
          >
            <div className="relative z-10">
              <Eyebrow card={card} />
              <h1 className="mt-6 max-w-[24ch] text-[2.5rem] font-semibold leading-[1.08] text-sky-50 sm:text-6xl lg:text-7xl">
                <HandwritingText className="text-4xl font-semibold sm:text-5xl lg:text-6xl">{card.title}</HandwritingText>
              </h1>
              <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-slate-100/90 sm:text-xl lg:text-[1.375rem]">
                <NarratedText id={card.id} text={card.description} />
              </p>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {card.details.map((line) => {
                  const { label, value } = parseContactLine(line);
                  return (
                    <div
                      key={line}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 "
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-100/50">
                        {label}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-50/90">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <GlowOverlay />
          </motion.section>
        )}

        {card.id === "contact" && (
          <motion.div variants={itemVariants} className="mt-16">
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
