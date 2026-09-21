import { readFileSync, writeFileSync } from 'node:fs';

// Index the editable resume source; no PDF parsing or hosted embeddings needed.
const source = readFileSync(new URL('../public/resume.tex', import.meta.url), 'utf8')
  .replace(/(?<!\\)%.*$/gm, '');
function plain(text) {
  return text
    .replace(/\\(?:begin|end)\{[^}]+\}(?:\[[^\]]*\])?/g, '')
    .replace(/\\(?:vspace|hspace)\{[^}]*\}/g, '')
    .replace(/\\textcolor\{[^}]*\}/g, '')
    .replace(/\\textasciitilde/g, '~')
    .replace(/\\[%&]/g, match => match.slice(1))
    .replace(/\\\\(?:\[[^\]]*\])?/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
const sections = [...source.matchAll(/\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\})/g)];
const chunks = sections.flatMap(([, heading, body], sectionIndex) => {
  // Keep each employer/project together instead of splitting facts mid-sentence.
  const parts = body.split(/(?=\\jobentry|\\projectentry)/).map(plain).filter(Boolean);
  return parts.map((text, index) => ({
    id: `resume-${sectionIndex}-${index}`,
    title: `Resume: ${plain(heading)}`,
    url: '/resume.tex',
    text,
  }));
});
if (!chunks.length || !chunks.some(chunk => chunk.text.includes('KMP College'))) {
  throw new Error('Resume indexing failed: review the source format.');
}
writeFileSync(new URL('../app/data/resume-index.json', import.meta.url), JSON.stringify(chunks, null, 2) + '\n');
console.log(`Indexed ${chunks.length} resume passages.`);
