// Groups the flat "skills" detail lines (e.g. "React JS — Expert") into the
// three showcases used by both the standalone /skills page (SkillsShowcase)
// and the brief in-flight layovers on the home page (MultiverseFlight), so
// editing the skill list in one place updates both.
export type SkillGroupName = "Frontend Development" | "UI/UX Design" | "Backend & Tooling";

export type SkillGroupItem = { label: string; level: string; icon: string; usage: string };

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
const SKILL_META: { pattern: RegExp; icon: string; group: SkillGroupName; usage: string }[] = [
  // Compound names first — each of these contains a generic term below.
  {
    pattern: /\btailwind\b/i,
    icon: "tailwindcss",
    group: "Frontend Development",
    usage: "Design system for the loyalty platform, GetLife Insurance UK, and today's EFR dashboards.",
  },
  {
    pattern: /material[-\s]?ui/i,
    icon: "mui",
    group: "Frontend Development",
    usage: "Themed MUI across Epixel's MLM admin suite so a large component library stayed on-brand.",
  },
  {
    pattern: /\breact\b/i,
    icon: "react",
    group: "Frontend Development",
    usage: "Every role since Uvionics — now EFR's biometric monitoring dashboards and face recognition platforms.",
  },
  {
    pattern: /\bnext(\.js)?\b/i,
    icon: "nextjs",
    group: "Frontend Development",
    usage: "Led Dashboard v2's Angular-to-Next.js migration, and built the loyalty platform on it from scratch.",
  },
  {
    pattern: /\btypescript\b/i,
    icon: "typescript",
    group: "Frontend Development",
    usage: "Typed the multi-tenant config, role/permission model, and export APIs behind Dashboard v2.",
  },
  {
    pattern: /\bjavascript\b/i,
    icon: "javascript",
    group: "Frontend Development",
    usage: "From the first Uvionics component libraries to the AI chatbot interfaces at Aspire Systems.",
  },
  {
    pattern: /\bhtml5?\b/i,
    icon: "html5",
    group: "Frontend Development",
    usage: "Pixel-perfect, semantic markup from design mockups — the craft I started on at Uvionics.",
  },
  {
    pattern: /\bcss3?\b/i,
    icon: "css3",
    group: "Frontend Development",
    usage: "Responsive, cross-browser layouts at Uvionics and the real-time chatbot monitoring dashboard.",
  },
  {
    pattern: /\bredux\b/i,
    icon: "redux",
    group: "Frontend Development",
    usage: "Complex workflow state at Aspire Systems, plus Redux-Saga on a US insurance platform.",
  },
  {
    pattern: /\bzustand\b/i,
    icon: "zustand",
    group: "Frontend Development",
    usage: "Lightweight client state in recent Next.js builds where a full Redux store was overkill.",
  },
  {
    pattern: /\bfigma\b/i,
    icon: "figma",
    group: "UI/UX Design",
    usage: "Wireframes through developer handoff for the EFR dashboards and the loyalty platform.",
  },
  {
    pattern: /photoshop/i,
    icon: "photoshop",
    group: "UI/UX Design",
    usage: "Imagery, mockup retouching, and export pipelines for marketing and product screens.",
  },
  {
    pattern: /illustrator/i,
    icon: "illustrator",
    group: "UI/UX Design",
    usage: "Vector logos, icon sets, and illustration work that ships straight into the UI as SVG.",
  },
  {
    pattern: /premiere/i,
    icon: "premiere",
    group: "UI/UX Design",
    usage: "Product demo reels and short-form video cuts for launches and client walkthroughs.",
  },
  {
    pattern: /after effects/i,
    icon: "aftereffects",
    group: "UI/UX Design",
    usage: "Motion studies and animated explainers that set the timing for the real UI transitions.",
  },
  {
    pattern: /\bnode(\.js)?\b/i,
    icon: "nodejs",
    group: "Backend & Tooling",
    usage: "Server-side APIs for Dashboard v2's exports and heavy operations, plus the US insurance platform.",
  },
  {
    pattern: /mongodb/i,
    icon: "mongodb",
    group: "Backend & Tooling",
    usage: "Document modelling and queries behind Node.js services on internal and side projects.",
  },
  {
    pattern: /\bgit\b/i,
    icon: "git",
    group: "Backend & Tooling",
    usage: "Branching, review, and release standards I set for the team I led at Epixel Solutions.",
  },
  {
    pattern: /\bdocker\b/i,
    icon: "docker",
    group: "Backend & Tooling",
    usage: "Containerised the Dashboard v2 frontend and its Node services for parity across environments.",
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
    list.push({ label, level, icon: meta.icon, usage: meta.usage });
    byGroup.set(meta.group, list);
  }
  return GROUP_ORDER.map((g) => ({ ...g, items: byGroup.get(g.name) ?? [] })).filter(
    (g) => g.items.length > 0,
  );
}
