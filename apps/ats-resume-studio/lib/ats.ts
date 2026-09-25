export type Check={label:string;pass:boolean;detail:string};
export function sourceChecks(tex:string):Check[]{
 const lower=tex.toLowerCase();
 return [
  {label:'Unicode text mapping',pass:/\\pdfgentounicode\s*=\s*1/.test(tex)||lower.includes('glyphtounicode'),detail:'Helps PDF text extraction map glyphs to Unicode.'},
  {label:'Searchable-text package',pass:lower.includes('\\usepackage{cmap}')||lower.includes('\\usepackage[utf8]{inputenc}'),detail:'Source includes text/searchability support.'},
  {label:'No shell escape directives',pass:!lower.includes('write18')&&!lower.includes('shellesc'),detail:'Avoids unsafe external command execution.'},
  {label:'No dense table layout',pass:!lower.includes('tabular')&&!lower.includes('longtable'),detail:'Tables can produce confusing ATS reading order.'},
  {label:'Standard resume sections',pass:['experience','education','skills'].filter(x=>lower.includes(x)).length>=2,detail:'Uses recognizable resume section names.'},
  {label:'Contact information',pass:/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(tex),detail:'An email address is present in source.'},
  {label:'Photo is optional',pass:!lower.includes('includegraphics')||lower.includes('ifshowphoto')||lower.includes('iffileexists'),detail:'Graphics are isolated from the text content.'}
 ];
}
export function keywordMatches(text:string,job:string){
 const stop=new Set('the and with for from that this your you are our will have has into about role team their they its who but not can all'.split(' '));
 const words=(job.toLowerCase().match(/[a-z][a-z-]{2,}/g)||[]).filter(w=>!stop.has(w));
 const counts=new Map<string,number>(); words.forEach(w=>counts.set(w,(counts.get(w)||0)+1));
 return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([word])=>({word,found:text.toLowerCase().includes(word)}));
}