// Groups the flat "skills" detail lines (e.g. "React JS — Expert") into the
// three showcases used by both the standalone /skills page (SkillsShowcase)
// and the brief in-flight layovers on the home page (MultiverseFlight), so
// editing the skill list in one place updates both.
export type SkillGroupName = "Frontend Development" | "UI/UX Design" | "Backend & Tooling";

export type SkillGroupItem = { label: string; level: string; icon: string };

export type SkillGroup = { name: SkillGroupName; blurb: string; items: SkillGroupItem[] };

// `icon` keys into the self-hosted BrandIcon registry (app/components/icons/
// brand-icon.tsx) — no icon-library runtime dependency.
const SKILL_META: { pattern: RegExp; icon: string; group: SkillGroupName }[] = [
  { pattern: /\breact\b/i, icon: "react", group: "Frontend Development" },
  { pattern: /\bnext(\.js)?\b/i, icon: "nextjs", group: "Frontend Development" },
  { pattern: /\btypescript\b/i, icon: "typescript", group: "Frontend Development" },
  { pattern: /\bjavascript\b/i, icon: "javascript", group: "Frontend Development" },
  { pattern: /\bhtml5?\b/i, icon: "html5", group: "Frontend Development" },
  { pattern: /\bcss3?\b/i, icon: "css3", group: "Frontend Development" },
  { pattern: /\btailwind\b/i, icon: "tailwindcss", group: "Frontend Development" },
  { pattern: /\bredux\b/i, icon: "redux", group: "Frontend Development" },
  { pattern: /material-ui/i, icon: "mui", group: "Frontend Development" },
  { pattern: /\bfigma\b/i, icon: "figma", group: "UI/UX Design" },
  { pattern: /photoshop/i, icon: "photoshop", group: "UI/UX Design" },
  { pattern: /illustrator/i, icon: "illustrator", group: "UI/UX Design" },
  { pattern: /premiere/i, icon: "premiere", group: "UI/UX Design" },
  { pattern: /after effects/i, icon: "aftereffects", group: "UI/UX Design" },
  { pattern: /\bnode(\.js)?\b/i, icon: "nodejs", group: "Backend & Tooling" },
  { pattern: /mongodb/i, icon: "mongodb", group: "Backend & Tooling" },
  { pattern: /\bgit\b/i, icon: "git", group: "Backend & Tooling" },
  { pattern: /\bjenkins\b/i, icon: "jenkins", group: "Backend & Tooling" },
  { pattern: /\bdocker\b/i, icon: "docker", group: "Backend & Tooling" },
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
    list.push({ label, level, icon: meta.icon });
    byGroup.set(meta.group, list);
  }
  return GROUP_ORDER.map((g) => ({ ...g, items: byGroup.get(g.name) ?? [] })).filter(
    (g) => g.items.length > 0,
  );
}
