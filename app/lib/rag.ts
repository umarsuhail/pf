import { aboutMe, contact, experiences, projects, skills } from '../data/profile';
import { cards } from '../data/sections';
import resume from '../data/resume-index.json';

export type Passage = { id: string; title: string; url: string; text: string };

const documents: Passage[] = [
  { id: 'profile', title: 'About Umar', url: '/home', text: aboutMe },
  { id: 'skills', title: 'Technical skills', url: '/skills', text: skills.map(s => `${s.name}: ${s.level}`).join('. ') },
  { id: 'contact', title: 'Contact', url: '/contact', text: Object.entries(contact).map(([key, value]) => `${key}: ${value}`).join('. ') },
  ...experiences.map((role, i) => ({ id: `role-${i}`, title: `${role.company} experience`, url: '/experience', text: `${role.title} at ${role.company}, ${role.period}, ${role.location}. ${role.description} ${role.achievements.join('. ')} Technologies: ${role.technologies.join(', ')}.` })),
  ...projects.map((project, i) => ({ id: `project-${i}`, title: project.name, url: '/projects', text: `${project.name}: ${project.about} Stack: ${project.stacks.join(', ')}.` })),
  ...cards.flatMap(card => [
    { id: `section-${card.id}`, title: card.title, url: `/${card.id}`, text: `${card.description} ${card.details.join('. ')}` },
    ...(card.projects ?? []).map((project, i) => ({ id: `card-project-${i}`, title: project.title, url: '/projects', text: `${project.title}: ${project.description} Stack: ${project.stack.join(', ')}` })),
  ]),
  ...resume,
];

const stopWords = new Set('a an the is are was were be been being do does did have has had he his him her she they them it its i me my you your we our of in at to for from on and or with about what which who when where how can could would should tell please umar suhail'.split(' '));
function tokens(text: string): string[] {
  return (text.toLowerCase().replace(/next\.js/g, 'nextjs').replace(/react\.?(js)?\b/g, 'react').match(/[a-z0-9]+/g) ?? [])
    .filter(word => !stopWords.has(word));
}
const aliases: [RegExp, string][] = [
  [/\b(education|studied|study|college|degree|qualification|university)\b/i, 'education bachelor college engineering'],
  [/\b(worked|career|employment|employers|experience)\b/i, 'experience developer engineer'],
  [/\b(built|projects?|portfolio)\b/i, 'projects dashboard platform'],
  [/\b(stack|skills?|technologies|tools)\b/i, 'skills frontend react typescript'],
  [/\b(reach|contact|email|phone|hire)\b/i, 'contact email phone'],
  [/\b(efr|emirates)\b/i, 'emirates face recognition'],
  [/\b(certificates?|certifications?|certified)\b/i, 'certifications certified'],
];
const index = documents.map(doc => ({ doc, terms: tokens(`${doc.title} ${doc.title} ${doc.text}`) }));
const averageLength = index.reduce((sum, entry) => sum + entry.terms.length, 0) / index.length;

/** Local BM25 retrieval: works even when every model/embedding API is down. */
export function retrieve(message: string, previousUserMessages: string[] = []): Passage[] {
  const followup = /\b(it|that|those|there|them|this|more)\b/i.test(message) || tokens(message).length < 2;
  let query = `${followup ? previousUserMessages.slice(-2).join(' ') : ''} ${message}`;
  for (const [pattern, expansion] of aliases) if (pattern.test(query)) query += ` ${expansion}`;
  if (/\b(introduce|summary|summarize|yourself)\b|who is umar|about umar/i.test(message)) query += 'frontend experience projects skills';
  const terms = [...new Set(tokens(query))];
  const ranked = index.map(({ doc, terms: words }) => {
    let score = 0;
    for (const term of terms) {
      const frequency = words.filter(word => word === term).length;
      if (!frequency) continue;
      const count = index.filter(entry => entry.terms.includes(term)).length;
      const idf = Math.log(1 + (index.length - count + 0.5) / (count + 0.5));
      score += idf * frequency * 2.2 / (frequency + 1.2 * (0.25 + 0.75 * words.length / averageLength));
    }
    return { doc, score };
  }).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score);
  let remaining = 9000;
  return ranked.slice(0, 6).flatMap(({ doc }) => {
    if (doc.text.length > remaining) return [];
    remaining -= doc.text.length;
    return [doc];
  });
}

export function contextFor(passages: Passage[]): string {
  return passages.map(p => `[${p.id}] ${p.title}\n${p.text}`).join('\n\n');
}

export function offlineAnswer(passages: Passage[]): string {
  if (!passages.length) return "I couldn't find that information in Umar's portfolio or resume. Try asking about his skills, projects, experience, education, or contact details.";
  return `AI replies are currently unavailable. Here are relevant excerpts from Umar's portfolio and resume:\n\n${passages.slice(0, 2).map(p => `${p.title}: ${p.text}`).join('\n\n')}`;
}
