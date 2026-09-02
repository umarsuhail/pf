"use client";

<<<<<<< HEAD
import { motion, stagger, type Variants } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeftIcon } from "../components/icons/arrow-left";
import { ArrowRightIcon } from "../components/icons/arrow-right";
import { ActivityIcon } from "../components/icons/activity";
import { BotIcon } from "../components/icons/bot";
import { BotMessageSquareIcon } from "../components/icons/bot-message-square";
import { BriefcaseBusinessIcon } from "../components/icons/briefcase-business";
import { CardIcon } from "../components/icons/card-icon";
import { CpuIcon } from "../components/icons/cpu";
import { FileTextIcon } from "../components/icons/file-text";
import { FolderKanbanIcon } from "../components/icons/folder-kanban";
import { DownloadIcon } from "../components/icons/download";
import { HistoryIcon } from "../components/icons/history";
import { RocketIcon } from "../components/icons/rocket";
import { SparklesIcon } from "../components/icons/sparkles";
import { UserIcon } from "../components/icons/user";
import { BrandIcon } from "../components/icons/brand-icon";
import type { AnimatedIconHandle } from "../components/icons/card-icon";
import { cards as allCards } from "../data/sections";
import type { FlightCard } from "../data/sections";
import { getSkillGroups } from "../data/skillGroups";
import CallbackForm from "../components/CallbackForm";
import NarratedText from "../components/NarratedText";
import HandwritingText from "../components/TypoGraphyHand";
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
  "relative overflow-hidden rounded-[2rem] border border-white/15 p-8 shadow-[0_32px_80px_-20px_rgba(2,8,23,0.7)] sm:p-12";

function Eyebrow({ card }: { card: FlightCard }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100 backdrop-blur-md">
      <CardIcon id={card.id} size={14} aria-hidden="true" />
      {card.eyebrow}
    </span>
  );
}

function GlowOverlay() {
  return (
    <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
  );
}

// Contact details are single "Label: value" lines.
function parseContactLine(line: string): { label: string; value: string } {
  const separator = line.indexOf(": ");
  if (separator === -1) return { label: line, value: "" };
  return { label: line.slice(0, separator), value: line.slice(separator + 2) };
}

const ALL_PROJECTS = "All Projects";

// One badge icon + accent per project card, keyed by title so it's easy to
// extend when a new project is added to the data.
const PROJECT_ICONS: Record<string, { Icon: typeof ActivityIcon; accent: string }> = {
  "Enterprise Dashboard — Transaction & Revenue Monitoring": {
    Icon: ActivityIcon,
    accent: "border-indigo-400/30 bg-indigo-500/15 text-indigo-300",
  },
  "Biometric Identity & Recognition Platform": {
    Icon: UserIcon,
    accent: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  },
  "AI-Powered Visual Assistant": {
    Icon: BotIcon,
    accent: "border-amber-400/30 bg-amber-500/15 text-amber-300",
  },
  "Tenant & Configuration Management Platform": {
    Icon: CpuIcon,
    accent: "border-sky-400/30 bg-sky-500/15 text-sky-300",
  },
  "AI Chatbot & Monitoring Systems": {
    Icon: BotMessageSquareIcon,
    accent: "border-blue-400/30 bg-blue-500/15 text-blue-300",
  },
  "Resume & Career Tools": {
    Icon: FileTextIcon,
    accent: "border-purple-400/30 bg-purple-500/15 text-purple-300",
  },
};
const DEFAULT_PROJECT_ICON = { Icon: FolderKanbanIcon, accent: "border-white/15 bg-white/10 text-slate-200" };

function projectStats(count: number) {
  return [
    { Icon: HistoryIcon, value: "7+", label: "Years Experience" },
    { Icon: FolderKanbanIcon, value: `${count}`, label: "Projects Delivered" },
    { Icon: BriefcaseBusinessIcon, value: "Enterprise", label: "Scale Solutions" },
    { Icon: CpuIcon, value: "Modern", label: "Tech Stack" },
  ];
}
=======
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
>>>>>>> 8a13a2e (ccc)

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
<<<<<<< HEAD

  const projects = card.projects ?? [];
  const [activeCategory, setActiveCategory] = useState(ALL_PROJECTS);
  const categories = useMemo(
    () => [ALL_PROJECTS, ...Array.from(new Set(projects.map((p) => p.category)))],
    [projects],
  );
  const visibleProjects =
    activeCategory === ALL_PROJECTS
      ? projects
      : projects.filter((p) => p.category === activeCategory);

  // Flat list (no group headings) for the home page's "Tech I Work With"
  // preview — same source (`skillGroups.ts`) the standalone /skills page and
  // the in-flight layovers use, so all three stay in sync automatically.
  const homeTechItems = useMemo(
    () => getSkillGroups(allCards.find((c) => c.id === "skills")?.details ?? []).flatMap((g) => g.items),
    [],
  );
=======
  const downloadRef = useRef<AnimatedIconHandle>(null);
>>>>>>> 8a13a2e (ccc)

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
<<<<<<< HEAD
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
        className={`relative z-10 mx-auto w-full px-6 pb-24 pt-28 sm:px-8 ${
          card.id === "projects" || card.id === "home" ? "max-w-6xl" : "max-w-4xl"
        }`}
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
              className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-2 lg:items-center"
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
                <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-slate-100/80 sm:text-lg">
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
              <div className="relative mx-auto w-full max-w-sm">
                <div className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/10 blur-3xl" />
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
                    className={`absolute hidden rounded-xl border border-white/10 bg-slate-900/85 px-4 py-3 shadow-lg backdrop-blur-md sm:block ${chip.pos}`}
                  >
                    <p className="text-xs font-semibold text-sky-50">{chip.title}</p>
                    <p className="text-[11px] text-slate-100/60">{chip.detail}</p>
                  </div>
                ))}
              </div>
            </motion.header>

            <motion.div
              variants={itemVariants}
              className="mt-10 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:grid-cols-4"
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

            <motion.div variants={itemVariants} className="mt-16 grid gap-10 lg:grid-cols-2">
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
                <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
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
              <h1 className="mt-6 max-w-[20ch] text-4xl font-semibold leading-[1.1] text-sky-50 sm:text-5xl lg:text-6xl">
                <HandwritingText className="text-5xl font-semibold">{card.title}</HandwritingText>
              </h1>
              <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-slate-100/90 sm:text-lg">
                <NarratedText id={card.id} text={card.description} />
              </p>
            </div>
            <GlowOverlay />
          </motion.header>
        )}

        {/* PROJECTS — display hero with stats + a placeholder visual */}
        {card.id === "projects" && (
          <motion.header
            variants={itemVariants}
            className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center"
          >
            <div>
              <Eyebrow card={card} />
              <h1 className="mt-6 text-4xl font-semibold leading-[1.1] text-sky-50 sm:text-5xl">
                <HandwritingText className="text-4xl font-semibold sm:text-5xl">{card.title}</HandwritingText>
              </h1>
              <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-slate-100/80 sm:text-lg">
                <NarratedText id={card.id} text={card.description} />
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {projectStats(projects.length).map(({ Icon, value, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                  >
                    <Icon size={18} className="text-sky-300" aria-hidden="true" />
                    <p className="mt-2 text-lg font-semibold text-sky-50">{value}</p>
                    <p className="text-xs text-slate-100/60">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-64 overflow-hidden rounded-4xl sm:h-80 lg:h-full lg:min-h-[320px]">
              <Image src="/images/pro-hero.png" alt="" fill className="object-cover" />
            </div>
          </motion.header>
        )}

        {/* PROJECTS — filterable grid of project cards */}
        {card.id === "projects" && (
          <motion.section variants={itemVariants} className="mt-16">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-sky-100/60">
                <FolderKanbanIcon size={14} aria-hidden="true" />
                Featured Projects
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      activeCategory === category
                        ? "border-sky-300/40 bg-sky-400/15 text-sky-50"
                        : "border-white/10 bg-white/[0.03] text-slate-100/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProjects.map((project) => {
                const { Icon, accent } = PROJECT_ICONS[project.title] ?? DEFAULT_PROJECT_ICON;
                return (
                  <motion.div
                    variants={itemVariants}
                    key={project.title}
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="relative h-40 w-full overflow-hidden border-b border-white/5">
                      <Image
                        src={project.image}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <span
                        className={`absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-sm ${accent}`}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="relative p-6">
                      <h3 className="text-base font-semibold text-sky-50 sm:text-lg">
                        {project.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-100/80">
                        {project.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {project.stack.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-100/70"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                        View Case Study
                        <ArrowRightIcon size={12} aria-hidden="true" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA banner */}
            <div className="mt-10 flex flex-col items-start gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-300/30 bg-sky-400/10 text-sky-300">
                  <RocketIcon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-sky-50">Interested in working together?</p>
                  <p className="text-sm text-slate-100/60">Let&apos;s build something great.</p>
                </div>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/15 px-5 py-2.5 text-sm font-semibold text-sky-50 transition-colors hover:bg-sky-400/25"
              >
                Let&apos;s Connect
                <ArrowRightIcon size={14} aria-hidden="true" />
              </Link>
            </div>
          </motion.section>
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
                  <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-slate-100/80">
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
              <h1 className="mt-6 max-w-[20ch] text-4xl font-semibold leading-[1.1] text-sky-50 sm:text-5xl lg:text-6xl">
                <HandwritingText className="text-4xl font-semibold sm:text-5xl lg:text-6xl">{card.title}</HandwritingText>
              </h1>
              <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-slate-100/90 sm:text-lg">
                <NarratedText id={card.id} text={card.description} />
              </p>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {card.details.map((line) => {
                  const { label, value } = parseContactLine(line);
                  return (
                    <div
                      key={line}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-sm"
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
=======
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
>>>>>>> 8a13a2e (ccc)
  );
}
