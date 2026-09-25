'use client';
import Editor from '@monaco-editor/react';
import {useEffect,useMemo,useRef,useState} from 'react';
import {FileText,Image as ImageIcon,Upload,Download,Play,ShieldCheck,AlertTriangle,CheckCircle2,Save,Briefcase,Code2} from 'lucide-react';
import {keywordMatches,sourceChecks} from '@/lib/ats';
type Asset={name:string,file:File,url:string};
const starter=String.raw`\\documentclass[10pt,a4paper]{article}
\\usepackage[a4paper,margin=1.5cm]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage{cmap}
\\usepackage[hidelinks]{hyperref}
\\pdfgentounicode=1
\\pagestyle{empty}
\\begin{document}
{\\LARGE\\bfseries YOUR NAME}\\par
email@example.com | +971 00 000 0000
\\section*{Professional Summary}
Customer-focused professional...
\\section*{Skills}
Customer Service | Communication | Teamwork
\\section*{Experience}
\\textbf{Job Title} \\hfill 2025--2026\\\\
Company, Location
\\begin{itemize}\\item Achievement or responsibility.\\end{itemize}
\\section*{Education}
Degree, Institution
\\end{document}`.replaceAll('\\\\','\\');
export default function Home(){
 const [tex,setTex]=useState(starter),[assets,setAssets]=useState<Asset[]>([]),[pdf,setPdf]=useState(''),[pdfBlob,setPdfBlob]=useState<Blob|null>(null),[log,setLog]=useState(''),[busy,setBusy]=useState(false),[tab,setTab]=useState<'checks'|'job'|'log'>('checks'),[job,setJob]=useState(''),[extracted,setExtracted]=useState('');
 const texInput=useRef<HTMLInputElement>(null),assetInput=useRef<HTMLInputElement>(null);
 const checks=useMemo(()=>sourceChecks(tex),[tex]),matches=useMemo(()=>keywordMatches(extracted||tex,job),[extracted,tex,job]);
 useEffect(()=>()=>{assets.forEach(a=>URL.revokeObjectURL(a.url));if(pdf)URL.revokeObjectURL(pdf)},[assets,pdf]);
 function openTex(f?:File){if(!f)return;const r=new FileReader();r.onload=()=>setTex(String(r.result));r.readAsText(f)}
 function addAssets(files:FileList|null){if(!files)return;setAssets(old=>[...old,...Array.from(files).filter(f=>/\.(png|jpe?g|pdf)$/i.test(f.name)).map(file=>({name:file.name,file,url:URL.createObjectURL(file)}))])}
 async function compile(){setBusy(true);setLog('');try{const fd=new FormData();fd.append('tex',tex);assets.forEach(a=>fd.append('asset:'+a.name,a.file));const r=await fetch('/api/compile',{method:'POST',body:fd});if(!r.ok){const e=await r.json();setLog((e.error||'Compile error')+'\n\n'+(e.log||e.detail||''));setTab('log');return}const blob=await r.blob();if(pdf)URL.revokeObjectURL(pdf);setPdfBlob(blob);setPdf(URL.createObjectURL(blob));const vf=new FormData();vf.append('pdf',new File([blob],'resume.pdf',{type:'application/pdf'}));const vr=await fetch('/api/validate',{method:'POST',body:vf});if(vr.ok){const v=await vr.json();setExtracted(v.text);setLog(`Compilation successful.\nExtractable characters: ${v.chars}\nExtracted lines: ${v.lines}\nText-layer check: ${v.pass?'PASS':'REVIEW'}`)}else setLog('Compiled successfully, but PDF text extraction validation is unavailable.')}catch(e:unknown){setLog(e instanceof Error?e.message:String(e));setTab('log')}finally{setBusy(false)}}
 function saveTex(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([tex],{type:'text/plain'}));a.download='resume.tex';a.click();URL.revokeObjectURL(a.href)}
 function downloadPdf(){if(!pdfBlob)return;const a=document.createElement('a');a.href=URL.createObjectURL(pdfBlob);a.download='resume-ats.pdf';a.click();URL.revokeObjectURL(a.href)}
 return <main className="h-screen min-h-[720px] flex flex-col overflow-hidden"><header className="h-16 shrink-0 bg-white border-b flex items-center px-5 gap-4"><div className="w-9 h-9 rounded-xl bg-slate-950 text-white grid place-items-center"><FileText size={19}/></div><div><h1 className="font-semibold leading-5">ATS Resume Studio</h1><p className="text-xs text-slate-500">LaTeX → searchable PDF</p></div><div className="ml-auto flex gap-2"><button onClick={()=>texInput.current?.click()} className="btn"><Upload size={15}/> Open .tex</button><button onClick={saveTex} className="btn"><Save size={15}/> Save .tex</button><button onClick={compile} disabled={busy} className="btn bg-slate-950 text-white border-slate-950"><Play size={15}/>{busy?'Compiling…':'Compile PDF'}</button><button onClick={downloadPdf} disabled={!pdfBlob} className="btn"><Download size={15}/> PDF</button></div><input ref={texInput} type="file" accept=".tex,text/plain" className="hidden" onChange={e=>openTex(e.target.files?.[0])}/></header>
 <div className="flex flex-1 min-h-0"><aside className="w-56 shrink-0 bg-white border-r p-3 overflow-auto scrollbar"><div className="label">PROJECT</div><button className="file active"><Code2 size={15}/> resume.tex</button><div className="label mt-5">ASSETS</div>{assets.map((a,i)=><div key={a.url} className="file group"><ImageIcon size={15}/><span className="truncate">{a.name}</span><button className="ml-auto opacity-0 group-hover:opacity-100" onClick={()=>setAssets(x=>x.filter((_,j)=>j!==i))}>×</button></div>)}<button onClick={()=>assetInput.current?.click()} className="mt-2 w-full border border-dashed rounded-xl py-3 text-xs text-slate-500 hover:bg-slate-50">+ Add photo / image</button><input ref={assetInput} multiple type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={e=>addAssets(e.target.files)}/><div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><b>Image resumes supported.</b><br/>Upload <code>photo.jpg</code> or other referenced assets. Text stays as LaTeX text; images are embedded separately.</div></aside>
 <section className="flex-1 min-w-0 grid grid-cols-2"><div className="min-w-0 border-r bg-white p-3"><div className="h-full rounded-xl overflow-hidden border"><Editor height="100%" language="latex" value={tex} onChange={v=>setTex(v||'')} options={{fontSize:13,minimap:{enabled:false},wordWrap:'on',automaticLayout:true,scrollBeyondLastLine:false}}/></div></div><div className="min-w-0 bg-slate-200 p-4 overflow-auto scrollbar">{pdf?<iframe title="PDF preview" src={pdf+'#toolbar=0&navpanes=0'} className="w-full h-full min-h-[650px] bg-white rounded-xl shadow-lg"/>:<div className="h-full grid place-items-center text-center text-slate-500"><div><FileText className="mx-auto mb-3" size={42}/><b className="text-slate-700">PDF preview</b><p className="text-sm mt-1">Compile to preview the searchable PDF.</p></div></div>}</div></section>
 <aside className="w-80 shrink-0 bg-white border-l flex flex-col"><div className="flex border-b">{(['checks','job','log'] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 text-xs font-semibold uppercase ${tab===t?'border-b-2 border-slate-900':'text-slate-400'}`}>{t}</button>)}</div><div className="p-4 overflow-auto scrollbar">{tab==='checks'&&<><div className="flex items-center gap-2 mb-4"><ShieldCheck size={20}/><div><b>ATS readability</b><p className="text-xs text-slate-500">Concrete checks, not a proprietary ATS score.</p></div></div>{checks.map(c=><div key={c.label} className="flex gap-2 mb-4">{c.pass?<CheckCircle2 size={17} className="text-emerald-600 shrink-0"/>:<AlertTriangle size={17} className="text-amber-600 shrink-0"/>}<div><div className="text-sm font-medium">{c.label}</div><div className="text-xs text-slate-500">{c.detail}</div></div></div>)}{extracted&&<div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><b>Compiled text layer detected.</b><br/>{extracted.replace(/\s/g,'').length.toLocaleString()} extractable characters.</div>}</>}
 {tab==='job'&&<><div className="flex gap-2 items-center mb-3"><Briefcase size={18}/><b>Job match explorer</b></div><p className="text-xs text-slate-500 mb-3">Paste a job description. This highlights literal keyword coverage; it does not predict ATS ranking.</p><textarea value={job} onChange={e=>setJob(e.target.value)} className="w-full h-40 border rounded-xl p-3 text-xs resize-none" placeholder="Paste job description…"/>{job&&<div className="mt-4 flex flex-wrap gap-2">{matches.map(m=><span key={m.word} className={`px-2 py-1 rounded-lg text-xs ${m.found?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{m.found?'✓':'○'} {m.word}</span>)}</div>}</>}
 {tab==='log'&&<pre className="text-[11px] whitespace-pre-wrap font-mono">{log||'Compile output will appear here.'}</pre>}</div></aside></div>
 <style jsx global>{`.btn{height:36px;padding:0 12px;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600}.btn:disabled{opacity:.4}.label{font-size:10px;font-weight:700;letter-spacing:.12em;color:#94a3b8;padding:7px}.file{width:100%;display:flex;align-items:center;gap:8px;padding:8px;border-radius:9px;font-size:12px;text-align:left}.file.active{background:#f1f5f9;font-weight:600}`}</style></main>
}