// Groups the flat "skills" detail lines (e.g. "React JS — Expert") into the
// three showcases used by both the standalone /skills page (SkillsShowcase)
// and the brief in-flight layovers on the home page (MultiverseFlight), so
// editing the skill list in one place updates both.
export type SkillGroupName = "Frontend Development" | "UI/UX Design" | "Backend & Tooling";

export type SkillGroupItem = { label: string; level: string; icon: string };

export type SkillGroup = { name: SkillGroupName; blurb: string; items: SkillGroupItem[] };

const SKILL_META: { pattern: RegExp; icon: string; group: SkillGroupName }[] = [
  { pattern: /\breact\b/i, icon: "logos:react", group: "Frontend Development" },
  { pattern: /\bnext(\.js)?\b/i, icon: "logos:nextjs-icon", group: "Frontend Development" },
  { pattern: /\btypescript\b/i, icon: "logos:typescript-icon", group: "Frontend Development" },
  { pattern: /\bjavascript\b/i, icon: "logos:javascript", group: "Frontend Development" },
  { pattern: /\bhtml5?\b/i, icon: "logos:html-5", group: "Frontend Development" },
  { pattern: /\bcss3?\b/i, icon: "logos:css-3", group: "Frontend Development" },
  { pattern: /\btailwind\b/i, icon: "logos:tailwindcss-icon", group: "Frontend Development" },
  { pattern: /\bredux\b/i, icon: "logos:redux", group: "Frontend Development" },
  { pattern: /material-ui/i, icon: "logos:material-ui", group: "Frontend Development" },
  { pattern: /\bfigma\b/i, icon: "logos:figma", group: "UI/UX Design" },
  { pattern: /photoshop/i, icon: "logos:adobe-photoshop", group: "UI/UX Design" },
  { pattern: /illustrator/i, icon: "logos:adobe-illustrator", group: "UI/UX Design" },
  { pattern: /premiere/i, icon: "logos:adobe-premiere", group: "UI/UX Design" },
  { pattern: /after effects/i, icon: "logos:adobe-after-effects", group: "UI/UX Design" },
  { pattern: /\bnode(\.js)?\b/i, icon: "logos:nodejs-icon", group: "Backend & Tooling" },
  { pattern: /mongodb/i, icon: "logos:mongodb", group: "Backend & Tooling" },
  { pattern: /\bgit\b/i, icon: "logos:git-icon", group: "Backend & Tooling" },
  { pattern: /\bjenkins\b/i, icon: "logos:jenkins", group: "Backend & Tooling" },
  { pattern: /\bdocker\b/i, icon: "logos:docker-icon", group: "Backend & Tooling" },
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
