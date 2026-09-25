// Groups the flat "skills" detail lines (e.g. "React JS — Expert") into the
// three showcases used by both the standalone /skills page (SkillsShowcase)
// and the brief in-flight layovers on the home page (MultiverseFlight), so
// editing the skill list in one place updates both.
export type SkillGroupName = "Frontend Development" | "UI/UX Design" | "Backend & Tooling";

/** One step in a tool's history with Umar: when, which version (or phase),
 *  and what it meant. Shown down the left edge of the layover while the
 *  flight is level with the tool. */
export type ToolMilestone = { date: string; version: string; note: string };

export type SkillGroupItem = {
  label: string;
  level: string;
  icon: string;
  usage: string;
  timeline?: ToolMilestone[];
};

export type SkillGroup = { name: SkillGroupName; blurb: string; items: SkillGroupItem[] };

// `icon` keys into the self-hosted BrandIcon registry (app/components/icons/
// brand-icon.tsx) — no icon-library runtime dependency.
// ORDER IS SIGNIFICANT — the first pattern that matches wins (see the
// `.find()` below), so anything whose name *contains* a more generic
// technology's name has to be listed before that generic one. "Tailwind CSS"
// matching /\bcss3?\b/ and rendering with the CSS3 logo is exactly the bug
// this ordering prevents; the generic single-word patterns are grouped at the
// end of each section for that reason.
// `usage` is the one-line "where I actually used this" note rendered under
// each mark on the /skills page — every line is anchored to a real role in
// `profile.ts` (EFR, Epixel, Aspire, Uvionics) or a real project from the
// `projects` list, so the two files must be updated together.
// `timeline` is optional and personal: it is Umar's history with the tool,
// so only add one he has given. The version notes are the tool's own public
// release history.
const SKILL_META: {
  pattern: RegExp;
  icon: string;
  group: SkillGroupName;
  usage: string;
  timeline?: ToolMilestone[];
}[] = [
  // Compound names first — each of these contains a generic term below.
  {
    pattern: /\btailwind\b/i,
    icon: "tailwindcss",
    group: "Frontend Development",
    usage: "Design system for the loyalty platform, GetLife Insurance UK, and today's EFR dashboards.",
    timeline: [
      { date: "2023", version: "Tailwind 3", note: "Where it started, alongside Next.js." },
      { date: "Jan 2025", version: "Tailwind 4", note: "CSS-first config and the new Oxide engine." },
      { date: "Today", version: "Tailwind 4.3", note: "What this site is styled with." },
    ],
  },
  {
    pattern: /material[-\s]?ui/i,
    icon: "mui",
    group: "Frontend Development",
    usage: "Themed MUI across Epixel's MLM admin suite so a large component library stayed on-brand.",
    timeline: [
      { date: "Nov 2022", version: "Material-UI", note: "At Epixel: themed across the MLM admin suite." },
    ],
  },
  {
    pattern: /\breact\b/i,
    icon: "react",
    group: "Frontend Development",
    usage: "Every role since Uvionics — now EFR's biometric monitoring dashboards and face recognition platforms.",
    timeline: [
      { date: "Aug 2018", version: "React 16", note: "Where it started: class components, lifecycle methods, setState." },
      { date: "Feb 2019", version: "React 16.8", note: "Hooks — from classes to function components." },
      { date: "Oct 2020", version: "React 17", note: "The new JSX transform and gradual upgrades." },
      { date: "Mar 2022", version: "React 18", note: "Concurrent rendering, automatic batching, streaming Suspense." },
      { date: "Dec 2024", version: "React 19", note: "Actions, use() and Server Components." },
    ],
  },
  {
    pattern: /\bnext(\.js)?\b/i,
    icon: "nextjs",
    group: "Frontend Development",
    usage: "Led Dashboard v2's Angular-to-Next.js migration, and built the loyalty platform on it from scratch.",
    timeline: [
      { date: "2021", version: "Next 12", note: "Where it started: Pages Router, getServerSideProps, the Rust compiler." },
      { date: "Oct 2022", version: "Next 13", note: "Migrated apps from 12 to 13 — the new App Router, layouts, Server Components." },
      { date: "May 2023", version: "Next 13.4", note: "The App Router goes stable." },
      { date: "Oct 2023", version: "Next 14", note: "Server Actions stable." },
      { date: "Oct 2024", version: "Next 15", note: "React 19, async request APIs, Turbopack for dev." },
      { date: "Oct 2025", version: "Next 16", note: "What this site is built on, today on 16.3." },
    ],
  },
  {
    pattern: /\btypescript\b/i,
    icon: "typescript",
    group: "Frontend Development",
    usage: "Typed the multi-tenant config, role/permission model, and export APIs behind Dashboard v2.",
    timeline: [
      { date: "2022", version: "TypeScript 4.x", note: "Where it started — and 4.9's satisfies operator landed that November." },
      { date: "Mar 2023", version: "TypeScript 5.0", note: "Standard decorators and const type parameters." },
      { date: "Jun 2024", version: "TypeScript 5.5", note: "Inferred type predicates." },
      { date: "Mar 2025", version: "TypeScript 7 preview", note: "The native Go compiler, previewed for roughly 10x faster builds." },
    ],
  },
  {
    pattern: /\bjavascript\b/i,
    icon: "javascript",
    group: "Frontend Development",
    usage: "From the first Uvionics component libraries to the AI chatbot interfaces at Aspire Systems.",
    timeline: [
      { date: "2018", version: "ES2018", note: "Where it started: object rest/spread, Promise.finally, async iteration." },
      { date: "Jun 2020", version: "ES2020", note: "Optional chaining, nullish coalescing, BigInt." },
      { date: "Jun 2022", version: "ES2022", note: "Top-level await, class fields, .at()." },
      { date: "Jun 2025", version: "ES2025", note: "Iterator helpers and the new Set methods." },
    ],
  },
  {
    pattern: /\bhtml5?\b/i,
    icon: "html5",
    group: "Frontend Development",
    usage: "Pixel-perfect, semantic markup from design mockups — the craft I started on at Uvionics.",
    timeline: [
      { date: "2016", version: "HTML5", note: "Where it started, in college." },
      { date: "Aug 2018", version: "Uvionics", note: "First role: pixel-perfect UI built from design mockups." },
      { date: "Today", version: "Semantic HTML", note: "Every panel of this site, words first in the markup." },
    ],
  },
  {
    pattern: /\bcss3?\b/i,
    icon: "css3",
    group: "Frontend Development",
    usage: "Responsive, cross-browser layouts at Uvionics and the real-time chatbot monitoring dashboard.",
    timeline: [
      { date: "2016", version: "CSS3", note: "Where it started, in college: floats, then flexbox." },
      { date: "Mar 2017", version: "CSS Grid", note: "Grid lands in every major browser." },
      { date: "Aug 2018", version: "Uvionics", note: "Responsive, cross-browser layouts from mockups." },
      { date: "2023", version: "Modern CSS", note: "Container queries, :has() and native nesting everywhere." },
    ],
  },
  {
    pattern: /\bredux\b/i,
    icon: "redux",
    group: "Frontend Development",
    usage: "Complex workflow state at Aspire Systems, plus Redux-Saga on a US insurance platform.",
    timeline: [
      { date: "Nov 2020", version: "Redux + Saga", note: "Where it started, at Aspire Systems: workflow state and a US insurance platform." },
      { date: "Today", version: "Redux Toolkit", note: "The same store, written the modern way." },
    ],
  },
  {
    pattern: /\bzustand\b/i,
    icon: "zustand",
    group: "Frontend Development",
    usage: "Lightweight client state in recent Next.js builds where a full Redux store was overkill.",
    timeline: [
      { date: "Recently", version: "Zustand", note: "Lightweight client state in recent Next.js builds." },
    ],
  },
  {
    pattern: /\bfigma\b/i,
    icon: "figma",
    group: "UI/UX Design",
    usage: "Wireframes through developer handoff for the EFR dashboards and the loyalty platform.",
    timeline: [
      { date: "Nov 2024", version: "Figma", note: "At EFR: wireframes through developer handoff for the dashboards." },
    ],
  },
  {
    pattern: /photoshop/i,
    icon: "photoshop",
    group: "UI/UX Design",
    usage: "Imagery, mockup retouching, and export pipelines for marketing and product screens.",
    timeline: [
      { date: "2016", version: "Photoshop CC", note: "Where it started: layers, masks and retouching." },
      { date: "Oct 2018", version: "Photoshop CC 2019", note: "The Content-Aware Fill workspace." },
      { date: "Oct 2020", version: "Photoshop 2021", note: "Neural Filters and Sky Replacement." },
      { date: "Sep 2023", version: "Photoshop 2024", note: "Generative Fill and Generative Expand, powered by Firefly." },
    ],
  },
  {
    pattern: /illustrator/i,
    icon: "illustrator",
    group: "UI/UX Design",
    usage: "Vector logos, icon sets, and illustration work that ships straight into the UI as SVG.",
    timeline: [
      { date: "2016", version: "Illustrator CC", note: "Where it started: vector logos and icon work." },
      { date: "Oct 2020", version: "Illustrator on iPad", note: "Vector work off the desktop." },
      { date: "Jun 2023", version: "Generative Recolor", note: "Firefly-driven palette exploration." },
      { date: "Oct 2023", version: "Text to Vector", note: "Generated vector graphics, editable as paths." },
    ],
  },
  {
    pattern: /premiere/i,
    icon: "premiere",
    group: "UI/UX Design",
    usage: "Product demo reels and short-form video cuts for launches and client walkthroughs.",
    timeline: [
      { date: "2016", version: "Premiere Pro CC", note: "Where it started: cuts, titles and colour." },
      { date: "Nov 2019", version: "Auto Reframe", note: "One edit, reframed for every aspect ratio." },
      { date: "Mar 2021", version: "Speech to Text", note: "Automatic transcripts and captions." },
      { date: "May 2023", version: "Text-Based Editing", note: "Editing a cut from its transcript." },
      { date: "Apr 2025", version: "Generative Extend", note: "Firefly-extended clips and audio." },
    ],
  },
  {
    pattern: /after effects/i,
    icon: "aftereffects",
    group: "UI/UX Design",
    usage: "Motion studies and animated explainers that set the timing for the real UI transitions.",
    timeline: [
      { date: "2016", version: "After Effects CC", note: "Where it started: keyframes, easing, motion studies." },
      { date: "Oct 2020", version: "Roto Brush 2", note: "Machine-learning rotoscoping." },
      { date: "Oct 2021", version: "Multi-Frame Rendering", note: "Renders spread across every core." },
      { date: "Jan 2024", version: "3D models", note: "Native 3D model import into compositions." },
    ],
  },
  {
    pattern: /\bnode(\.js)?\b/i,
    icon: "nodejs",
    group: "Backend & Tooling",
    usage: "Server-side APIs for Dashboard v2's exports and heavy operations, plus the US insurance platform.",
    timeline: [
      { date: "Nov 2020", version: "Node 14", note: "Where it started, at Aspire Systems: the US insurance platform." },
      { date: "Apr 2022", version: "Node 18", note: "Built-in fetch and a native test runner." },
      { date: "Apr 2023", version: "Node 20", note: "Stable test runner, experimental permission model." },
      { date: "Apr 2024", version: "Node 22", note: "require(esm) and a built-in WebSocket client." },
      { date: "May 2025", version: "Node 24", note: "The current line." },
    ],
  },
  {
    pattern: /mongodb/i,
    icon: "mongodb",
    group: "Backend & Tooling",
    usage: "Document modelling and queries behind Node.js services on internal and side projects.",
    timeline: [
      { date: "2020", version: "MongoDB 4.4", note: "Where it started, alongside Node." },
      { date: "Jul 2021", version: "MongoDB 5.0", note: "Time series collections." },
      { date: "Jun 2023", version: "Atlas Vector Search", note: "Vector queries next to the documents." },
      { date: "Oct 2024", version: "MongoDB 8.0", note: "A performance-first release." },
    ],
  },
  {
    pattern: /\bgit\b/i,
    icon: "git",
    group: "Backend & Tooling",
    usage: "Branching, review, and release standards I set for the team I led at Epixel Solutions.",
    timeline: [
      { date: "Aug 2018", version: "Git", note: "Since the first role at Uvionics." },
    ],
  },
  {
    pattern: /\bdocker\b/i,
    icon: "docker",
    group: "Backend & Tooling",
    usage: "Containerised the Dashboard v2 frontend and its Node services for parity across environments.",
    timeline: [
      { date: "Recently", version: "Docker", note: "Picked up recently: the Dashboard v2 frontend and its Node services, containerised." },
    ],
  },
];

const GROUP_ORDER: { name: SkillGroupName; blurb: string }[] = [
  { name: "Frontend Development", blurb: "Building fast, accessible interfaces end to end." },
  { name: "UI/UX Design", blurb: "From wireframes to polished visuals and motion." },
  { name: "Backend & Tooling", blurb: "APIs, data, and the workflow that ships it." },
];

function parseSkillLine(line: string) {
  const [label, level = ""] = line.split(/\s+—\s+/);
  return { label: label.trim(), level: level.trim() };
}

export function getSkillGroups(details: string[]): SkillGroup[] {
  const byGroup = new Map<SkillGroupName, SkillGroupItem[]>();
  for (const line of details) {
    const { label, level } = parseSkillLine(line);
    const meta = SKILL_META.find((m) => m.pattern.test(label));
    if (!meta) continue;
    const list = byGroup.get(meta.group) ?? [];
    list.push({
      label,
      level,
      icon: meta.icon,
      usage: meta.usage,
      ...(meta.timeline && { timeline: meta.timeline }),
    });
    byGroup.set(meta.group, list);
  }
  return GROUP_ORDER.map((g) => ({ ...g, items: byGroup.get(g.name) ?? [] })).filter(
    (g) => g.items.length > 0,
  );
}
