import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, GitBranch, Layers, Share2, Loader2, Download, ChevronRight,
  Upload, X, FileIcon, BookmarkPlus, CheckCircle, Globe,
} from 'lucide-react';
import { api } from '../lib/api';
import { TOPICS } from '../lib/worksheets';
import type {
  Worksheet, Flashcards, Quiz, MindMap, AIError,
} from '../services/aiTypes';

type Tab = 'drafting' | 'mindmap' | 'flashcards' | 'share';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
type Level = typeof LEVELS[number];

function isAIError(r: unknown): r is AIError {
  return typeof r === 'object' && r !== null && 'error' in r;
}

function TabButton({ active, icon: Icon, label, onClick }: {
  active: boolean; icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap ${
        active ? 'bg-earth-700 text-white' : 'text-earth-600 hover:bg-earth-100'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

function AIFallback() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
      <p className="font-semibold mb-1">AI generation failed</p>
      <p>The AI service is temporarily unavailable. Wait a moment and try again.</p>
    </div>
  );
}

function SavedBadge() {
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-olive-700 bg-olive-50 border border-olive-200 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Saved to Trail
    </span>
  );
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── PDF text extraction ───────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: { str?: string }) => it.str ?? '').join(' '));
  }
  return pages.join('\n\n');
}

// ── PPTX text extraction ──────────────────────────────────────────────────────

async function extractPptxText(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip   = await JSZip.loadAsync(await file.arrayBuffer());
  const texts: string[] = [];

  for (const [name, entry] of Object.entries(zip.files)) {
    if (!name.startsWith('ppt/slides/slide') || name.includes('_rels')) continue;
    const xml = await entry.async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const runs = Array.from(doc.getElementsByTagName('a:t'));
    const slideText = runs.map(el => el.textContent ?? '').join(' ').trim();
    if (slideText) texts.push(slideText);
  }

  return texts.join('\n\n');
}

// ── Shared Document Input ─────────────────────────────────────────────────────

interface DocInputProps {
  context: string;
  setContext: (v: string) => void;
  fileName: string | null;
  setFileName: (v: string | null) => void;
}

function DocInput({ context, setContext, fileName, setFileName }: DocInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const loadFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();

    if (name.endsWith('.pdf')) {
      setExtracting(true);
      try {
        const text = await extractPdfText(file);
        setContext(text); setFileName(file.name);
      } catch {
        alert('Could not extract text from this PDF. Try copying and pasting the text instead.');
      } finally { setExtracting(false); }
      return;
    }

    if (name.endsWith('.pptx')) {
      setExtracting(true);
      try {
        const text = await extractPptxText(file);
        setContext(text); setFileName(file.name);
      } catch {
        alert('Could not extract text from this PPTX. Try copying and pasting the text instead.');
      } finally { setExtracting(false); }
      return;
    }

    if (name.endsWith('.ppt')) {
      alert('Old .ppt format is not supported. Please save as .pptx and try again.');
      return;
    }

    const allowed = file.type.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt');
    if (!allowed) { alert('Unsupported file type. Upload .txt, .md, .pdf, or .pptx.'); return; }

    const reader = new FileReader();
    reader.onload = e => { setContext((e.target?.result as string) ?? ''); setFileName(file.name); };
    reader.readAsText(file);
  }, [setContext, setFileName]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file);
  }, [loadFile]);

  const clear = () => { setContext(''); setFileName(null); if (inputRef.current) inputRef.current.value = ''; };
  const wordCount = context.trim() ? context.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-earth-800">Your Document</p>
          <p className="text-xs text-earth-500 mt-0.5">Upload .txt, .md, .pdf, or .pptx — AI generates content from it</p>
        </div>
        {context && (
          <button onClick={clear} className="flex items-center gap-1 text-xs text-earth-400 hover:text-red-500 transition-colors shrink-0">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {!context && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-colors ${
            dragging ? 'border-earth-500 bg-earth-50' : 'border-earth-300 hover:border-earth-400 hover:bg-earth-50/60'
          }`}
        >
          {extracting ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-earth-400 animate-spin" />
              <p className="text-sm font-semibold text-earth-600">Extracting text…</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-earth-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-earth-600">Drop a file here</p>
              <p className="text-xs text-earth-400 mt-1">or click to browse &nbsp;·&nbsp; Supports .txt, .md, .pdf, .pptx</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.pdf,.pptx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void loadFile(f); }}
          />
        </div>
      )}

      {fileName && (
        <div className="flex items-center gap-2 bg-earth-100 rounded-xl px-3 py-2 w-fit text-sm text-earth-700">
          <FileIcon className="w-4 h-4 text-earth-500 shrink-0" />
          <span className="font-medium truncate max-w-[240px]">{fileName}</span>
        </div>
      )}

      <textarea
        className="input min-h-[150px] resize-y font-mono text-xs leading-relaxed"
        placeholder="Paste lesson notes, a textbook excerpt, an article, or any study material here…"
        value={context}
        onChange={e => { setContext(e.target.value); if (fileName) setFileName(null); }}
      />

      {context.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-earth-400">
          <span>{wordCount.toLocaleString()} words · {context.length.toLocaleString()} chars</span>
          {context.length > 4000 && <span className="text-amber-600">First ~4000 chars sent to AI</span>}
        </div>
      )}
    </div>
  );
}

// ── PDF worksheet export ──────────────────────────────────────────────────────

function buildWorksheetPdfBlob(ws: Worksheet, level: string): Blob {
  function escape(v: string) { return v.replace(/[\\()]/g, m => `\\${m}`); }
  function wrap(text: string, w = 86) {
    const words = text.split(/\s+/); const lines: string[] = []; let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > w) { if (line) lines.push(line); line = word; } else { line = next; }
    }
    if (line) lines.push(line); return lines;
  }
  const titleLines = wrap(ws.title, 50).map(l => `(${escape(l)}) Tj T*`).join('\n');
  const bodyLines = [
    '', `LEVEL: ${level} | ~${ws.minutes} MIN`, '',
    'LEARNING OBJECTIVES', ...ws.objectives.map((o, i) => `${i + 1}. ${o}`),
    '', 'PRACTICE TASKS', ...ws.tasks.map((t, i) => `${i + 1}. ${t}`),
    '', 'REFLECTION', ws.reflection,
  ].flatMap(l => wrap(l));
  const bodyStream = bodyLines.map(l => `(${escape(l)}) Tj T*`).join('\n');
  const content = `0.18 0.42 0.31 rg\n0 745 612 47 re\nf\n0 0 0 rg\nBT\n/F1 16 Tf\n50 759 Td\n16 TL\n1 1 1 rg\n${titleLines}\nET\n` +
    `BT\n/F1 11 Tf\n50 720 Td\n14 TL\n0 0 0 rg\n${bodyStream}\nET`;
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const stream = `stream\n${content}\nendstream`;
  const obj4 = `4 0 obj\n<< /Length ${stream.length} >>\n${stream}\nendobj\n`;
  const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const body  = `%PDF-1.4\n${obj1}${obj2}${obj3}${obj4}${obj5}`;
  const xref  = `xref\n0 6\n0000000000 65535 f \n`;
  const pdf   = `${body}\n${xref}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

// ── PPTX worksheet export ─────────────────────────────────────────────────────

async function exportWorksheetPptx(ws: Worksheet, level: string) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const slide = pptx.addSlide();
  slide.background = { color: 'F5F1EB' };
  slide.addText(ws.title, { x: 0.5, y: 0.3, w: '90%', h: 0.8, fontSize: 28, bold: true, color: '3A2010' });
  slide.addText(`Level: ${level}  ·  ~${ws.minutes} min`, { x: 0.5, y: 1.0, w: '90%', h: 0.4, fontSize: 14, color: '7A6050' });
  slide.addText('Learning Objectives', { x: 0.5, y: 1.5, w: '90%', h: 0.4, fontSize: 16, bold: true, color: '2E6B3E' });
  ws.objectives.forEach((obj, i) => {
    slide.addText(`${i + 1}. ${obj}`, { x: 0.7, y: 1.9 + i * 0.4, w: '85%', h: 0.4, fontSize: 13, color: '3A2010' });
  });

  const slide2 = pptx.addSlide();
  slide2.background = { color: 'F5F1EB' };
  slide2.addText('Practice Tasks', { x: 0.5, y: 0.3, w: '90%', h: 0.5, fontSize: 22, bold: true, color: '2E6B3E' });
  ws.tasks.forEach((task, i) => {
    slide2.addText(`${i + 1}. ${task}`, { x: 0.7, y: 0.9 + i * 0.55, w: '85%', h: 0.5, fontSize: 13, color: '3A2010' });
  });

  const slide3 = pptx.addSlide();
  slide3.background = { color: 'F5F1EB' };
  slide3.addText('Reflection', { x: 0.5, y: 0.3, w: '90%', h: 0.5, fontSize: 22, bold: true, color: '2E6B3E' });
  slide3.addText(ws.reflection, { x: 0.5, y: 1.0, w: '90%', h: 2, fontSize: 14, italic: true, color: '5A4030' });

  await pptx.writeFile({ fileName: `${ws.title}.pptx` });
}

// ── Drafting tab ──────────────────────────────────────────────────────────────

function DraftingTab({ context }: { context: string }) {
  const qc = useQueryClient();
  const [level, setLevel]   = useState<Level>('Beginner');
  const [focus, setFocus]   = useState('');
  const [result, setResult] = useState<Worksheet | null>(null);
  const [savedToTrail, setSavedToTrail] = useState(false);
  const [exporting, setExporting]       = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: Worksheet | AIError }>('/api/worksheets/generate', {
        context: context.trim() || undefined,
        topic:   context.trim() ? undefined : 'General',
        level,
        focus:   focus || undefined,
      });
      return res.data.data;
    },
    onSuccess: data => { if (!isAIError(data)) { setResult(data); setSavedToTrail(false); } },
  });

  const trailMutation = useMutation({
    mutationFn: (ws: Worksheet) =>
      api.post('/api/trail/save', { type: 'worksheet', title: ws.title, durationMin: ws.minutes }),
    onSuccess: () => {
      setSavedToTrail(true);
      qc.invalidateQueries({ queryKey: ['dailyPlan'] });
    },
  });

  const exportTxt = (ws: Worksheet) => {
    downloadText([
      ws.title, `Level: ${level} | ~${ws.minutes} min`, '',
      'Objectives:', ...ws.objectives.map(o => `  • ${o}`), '',
      'Tasks:', ...ws.tasks.map((t, i) => `  ${i + 1}. ${t}`), '',
      `Reflection: ${ws.reflection}`,
    ].join('\n'), `${ws.title}.txt`);
  };

  const exportPdf = (ws: Worksheet) => {
    const blob = buildWorksheetPdfBlob(ws, level);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${ws.title}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPptx = async (ws: Worksheet) => {
    setExporting(true);
    try { await exportWorksheetPptx(ws, level); } finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Level</label>
          <select className="input" value={level} onChange={e => setLevel(e.target.value as Level)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Focus <span className="text-earth-400 font-normal">(optional)</span></label>
          <input className="input" placeholder="e.g. key terms, comprehension, real-world examples…" value={focus} onChange={e => setFocus(e.target.value)} />
        </div>
      </div>

      <button onClick={() => mutation.mutate()} disabled={!context.trim() || mutation.isPending} className="btn-primary flex items-center gap-2">
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mutation.isPending ? 'Generating…' : 'Generate Worksheet'}
      </button>
      {!context.trim() && <p className="text-xs text-earth-400">↑ Add a document above first.</p>}

      {mutation.isSuccess && isAIError(mutation.data) && <AIFallback />}

      {result && (
        <div className="bg-white border border-earth-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="font-black text-earth-800 text-lg">{result.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {savedToTrail ? <SavedBadge /> : (
                <button
                  onClick={() => trailMutation.mutate(result)}
                  disabled={trailMutation.isPending}
                  className="flex items-center gap-1 text-xs font-semibold text-earth-600 hover:text-earth-800 bg-earth-100 hover:bg-earth-200 px-2 py-1 rounded-lg transition-colors"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" /> Save to Trail
                </button>
              )}
              <button onClick={() => exportTxt(result)} title="TXT" className="flex items-center gap-1 text-xs font-semibold text-earth-500 hover:text-earth-700 px-2 py-1 rounded-lg hover:bg-earth-100">
                <Download className="w-3.5 h-3.5" /> TXT
              </button>
              <button onClick={() => exportPdf(result)} title="PDF" className="flex items-center gap-1 text-xs font-semibold text-earth-500 hover:text-earth-700 px-2 py-1 rounded-lg hover:bg-earth-100">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button onClick={() => void exportPptx(result)} disabled={exporting} title="PPTX" className="flex items-center gap-1 text-xs font-semibold text-earth-500 hover:text-earth-700 px-2 py-1 rounded-lg hover:bg-earth-100 disabled:opacity-50">
                <Download className="w-3.5 h-3.5" /> {exporting ? '…' : 'PPTX'}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-earth-500 uppercase tracking-wide mb-1">Objectives</p>
            <ul className="space-y-1">
              {result.objectives.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-earth-700">
                  <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-earth-400 shrink-0" />{o}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold text-earth-500 uppercase tracking-wide mb-1">Tasks</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              {result.tasks.map((t, i) => <li key={i} className="text-sm text-earth-700">{t}</li>)}
            </ol>
          </div>
          <div className="bg-earth-50 rounded-xl p-3">
            <p className="text-xs font-bold text-earth-500 uppercase tracking-wide mb-1">Reflection</p>
            <p className="text-sm text-earth-700 italic">"{result.reflection}"</p>
          </div>
          <p className="text-xs text-earth-400">~{result.minutes} minutes</p>
        </div>
      )}
    </div>
  );
}

// ── Mind Map tab ──────────────────────────────────────────────────────────────

function MindMapTab({ context }: { context: string }) {
  const qc = useQueryClient();
  const [result, setResult] = useState<MindMap | null>(null);
  const [savedToTrail, setSavedToTrail] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: MindMap | AIError }>('/api/mind-map/generate', {
        context: context.trim() || undefined,
        topic:   context.trim() ? undefined : 'General',
      });
      return res.data.data;
    },
    onSuccess: data => { if (!isAIError(data)) { setResult(data); setSavedToTrail(false); } },
  });

  const trailMutation = useMutation({
    mutationFn: (mm: MindMap) =>
      api.post('/api/trail/save', { type: 'mindmap', title: mm.center, durationMin: 10 }),
    onSuccess: () => {
      setSavedToTrail(true);
      qc.invalidateQueries({ queryKey: ['dailyPlan'] });
    },
  });

  return (
    <div className="space-y-4">
      <button onClick={() => mutation.mutate()} disabled={!context.trim() || mutation.isPending} className="btn-primary flex items-center gap-2">
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mutation.isPending ? 'Thinking…' : 'Generate Mind Map'}
      </button>
      {!context.trim() && <p className="text-xs text-earth-400">↑ Add a document above first.</p>}

      {mutation.isSuccess && isAIError(mutation.data) && <AIFallback />}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-black text-earth-800 text-xl">{result.center}</h3>
            <div className="flex gap-2">
              {savedToTrail ? <SavedBadge /> : (
                <button
                  onClick={() => trailMutation.mutate(result)}
                  disabled={trailMutation.isPending}
                  className="flex items-center gap-1 text-xs font-semibold text-earth-600 bg-earth-100 hover:bg-earth-200 px-2 py-1 rounded-lg transition-colors"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" /> Save to Trail
                </button>
              )}
              <button onClick={() => downloadJson(result, `mindmap-${result.center}.json`)} className="flex items-center gap-1.5 text-xs font-semibold text-earth-500 hover:text-earth-700">
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.branches.map((b, i) => (
              <div key={i} className="bg-white border border-earth-200 rounded-2xl p-4">
                <p className="font-bold text-earth-700 mb-2 text-sm">{b.label}</p>
                <ul className="space-y-1">
                  {b.children.map((c, j) => (
                    <li key={j} className="flex gap-2 text-xs text-earth-600"><span className="text-earth-300 shrink-0">–</span>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Flashcards / Quiz tab ─────────────────────────────────────────────────────

function FlashcardsTab({ context, initialMode }: { context: string; initialMode?: 'flashcards' | 'quiz' }) {
  const qc = useQueryClient();
  const [mode, setMode]     = useState<'flashcards' | 'quiz'>(initialMode ?? 'flashcards');
  const [level, setLevel]   = useState<Level>('Beginner');
  const [count, setCount]   = useState(5);
  const [result, setResult] = useState<Flashcards | Quiz | null>(null);
  const [fullQuiz, setFullQuiz] = useState<any | null>(null);
  const [flip, setFlip]     = useState<Record<number, boolean>>({});
  const [savedToTrail, setSavedToTrail] = useState(false);
  const [cardsAutoSaved, setCardsAutoSaved] = useState(false);

  const maxCount = mode === 'flashcards' ? 20 : 10;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { context: context.trim() || undefined, topic: context.trim() ? undefined : 'General', level, count };
      if (mode === 'flashcards') {
        const res = await api.post<{ data: Flashcards & { saved?: boolean } | AIError }>('/api/flashcards/generate', payload);
        return res.data.data;
      }
      const res = await api.post<{ data: { quiz: Quiz; full: Quiz } | AIError }>('/api/quiz/generate', payload);
      return res.data.data;
    },
    onSuccess: data => {
      if (!isAIError(data)) {
        // Quiz responses are returned as { quiz, full } from the API (masked answers)
        if ('quiz' in (data as any) && (data as any).quiz) {
          setResult((data as any).quiz as Quiz);
          setFullQuiz((data as any).full ?? null);
        } else {
          setResult(data as any);
          setFullQuiz(null);
        }
        setFlip({});
        setSavedToTrail(false);
        // Flashcards are auto-saved to SR deck by the API
        if ('cards' in data) {
          setCardsAutoSaved(true);
          qc.invalidateQueries({ queryKey: ['srCards'] });
        }
      }
    },
  });

  const trailMutation = useMutation({
    mutationFn: (payload?: any) => {
      const title = mode === 'flashcards'
        ? `${count} AI Flashcards (${level})`
        : `${count}-Question Quiz (${level})`;
      const body: any = { type: mode === 'flashcards' ? 'flashcards' : 'quiz', title, durationMin: Math.ceil(count * 1.5) };
      if (mode === 'quiz' && fullQuiz) body.payload = fullQuiz;
      if (mode === 'flashcards' && result) body.payload = result;
      return api.post('/api/trail/save', body);
    },
    onSuccess: () => {
      setSavedToTrail(true);
      qc.invalidateQueries({ queryKey: ['dailyPlan'] });
    },
  });

  const isFlashcards = (r: Flashcards | Quiz): r is Flashcards => 'cards' in r;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-earth-100 rounded-xl p-1 w-fit">
        {(['flashcards', 'quiz'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setResult(null); setCount(5); setCardsAutoSaved(false); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${mode === m ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Level</label>
          <select className="input" value={level} onChange={e => setLevel(e.target.value as Level)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Count ({count}) <span className="text-earth-400 font-normal">max {maxCount}</span></label>
          <input type="range" min={2} max={maxCount} value={Math.min(count, maxCount)} onChange={e => setCount(+e.target.value)} className="w-full mt-2" />
        </div>
      </div>

      <button onClick={() => mutation.mutate()} disabled={!context.trim() || mutation.isPending} className="btn-primary flex items-center gap-2">
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mutation.isPending ? 'Generating…' : `Generate ${Math.min(count, maxCount)} ${mode === 'flashcards' ? 'Cards' : 'Questions'}`}
      </button>
      {!context.trim() && <p className="text-xs text-earth-400">↑ Add a document above first.</p>}

      {mutation.isSuccess && isAIError(mutation.data) && <AIFallback />}

      {result && (
        <div className="flex items-center gap-2 flex-wrap">
          {cardsAutoSaved && mode === 'flashcards' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-olive-700 bg-olive-50 border border-olive-200 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Cards saved to Study Coach
            </span>
          )}
          {savedToTrail ? <SavedBadge /> : (
            <button
              onClick={() => trailMutation.mutate()}
              disabled={trailMutation.isPending}
              className="flex items-center gap-1 text-xs font-semibold text-earth-600 bg-earth-100 hover:bg-earth-200 px-2 py-1 rounded-lg transition-colors"
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> Save to Trail
            </button>
          )}
        </div>
      )}

      {result && isFlashcards(result) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {result.cards.map((card, i) => (
            <button key={i} onClick={() => setFlip(f => ({ ...f, [i]: !f[i] }))}
              className="bg-white border border-earth-200 rounded-2xl p-4 text-left hover:shadow-md transition-all min-h-[80px] flex items-center">
              <p className="text-sm text-earth-700 font-medium">{flip[i] ? card.back : card.front}</p>
              <span className="ml-auto text-xs text-earth-300 shrink-0 pl-2">tap to {flip[i] ? 'flip' : 'reveal'}</span>
            </button>
          ))}
        </div>
      )}

      {result && !isFlashcards(result) && (
        <div className="space-y-4">
          {(result as Quiz).questions.map((q, i) => (
            <div key={i} className="bg-white border border-earth-200 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-earth-800 text-sm">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, j) => (
                  <div key={j} className={`text-xs rounded-lg px-3 py-2 border ${j === q.answer ? 'bg-olive-50 border-olive-300 text-olive-800 font-semibold' : 'bg-earth-50 border-earth-200 text-earth-600'}`}>
                    {String.fromCharCode(65 + j)}. {opt}
                  </div>
                ))}
              </div>
              <p className="text-xs text-earth-500 italic">{q.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Share / Community tab ─────────────────────────────────────────────────────

type ShareMode = 'community' | 'publish';

function ShareTab({ context }: { context: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode]             = useState<ShareMode>('community');
  const [title, setTitle]           = useState('');
  const [subject, setSubject]       = useState<typeof TOPICS[number]['key']>('math');
  const [extra, setExtra]           = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileText, setFileText]     = useState('');
  const [extracting, setExtracting] = useState(false);
  const [sent, setSent]             = useState(false);
  const [publishResult, setPublishResult] = useState<{ score: number; reason: string } | null>(null);

  const resolvedBody = useCallback((): string => {
    const parts: string[] = [];
    if (fileText.trim()) parts.push(fileText.slice(0, 10000));
    if (context.trim()) parts.push(context.slice(0, 10000));
    if (extra.trim()) parts.push(extra.trim());
    return parts.join('\n\n---\n\n').slice(0, 12000);
  }, [context, extra, fileText]);

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadFile(file);
    setFileText('');
    setExtracting(true);
    try {
      let text = '';
      if (file.name.endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else if (file.name.endsWith('.pptx')) {
        text = await extractPptxText(file);
      } else {
        text = await file.text();
      }
      setFileText(text);
    } catch {
      setFileText('');
    } finally {
      setExtracting(false);
    }
  }, []);

  const communityMutation = useMutation({
    mutationFn: async () => {
      await api.post('/community/notebooks', { title, body: resolvedBody(), subject });
    },
    onSuccess: () => setSent(true),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: { published: boolean; score: number; reason: string; topics: string[] } }>(
        '/api/community/publish', { title, body: resolvedBody(), subject },
      );
      return res.data.data;
    },
    onSuccess: data => {
      if (data.published) setSent(true);
      else setPublishResult({ score: data.score, reason: data.reason });
    },
  });

  const handleSubmit = () => {
    if (mode === 'community') communityMutation.mutate();
    else publishMutation.mutate();
  };

  const isPending = communityMutation.isPending || publishMutation.isPending;
  const isErr     = communityMutation.isError   || publishMutation.isError;

  const hasContent = context.trim() || extra.trim() || fileText.trim();

  if (sent) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">🎉</p>
        <p className="font-black text-earth-800 text-xl">
          {mode === 'publish' ? 'Published to Community!' : 'Shared!'}
        </p>
        <p className="text-earth-500 text-sm">
          {mode === 'publish'
            ? 'Your material is now visible in Community Published.'
            : 'Your note is now visible in the community.'}
        </p>
        <button className="btn-secondary" onClick={() => { setSent(false); setTitle(''); setExtra(''); setUploadFile(null); setFileText(''); setPublishResult(null); }}>
          Share another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode switcher */}
      <div className="flex gap-1 bg-earth-100 rounded-xl p-1 w-fit">
        <button onClick={() => setMode('community')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'community' ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'}`}>
          <Share2 className="w-3.5 h-3.5" /> Community
        </button>
        <button onClick={() => setMode('publish')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'publish' ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'}`}>
          <Globe className="w-3.5 h-3.5" /> ✨ Publish
        </button>
      </div>

      {mode === 'publish' && (
        <div className="bg-olive-50 border border-olive-200 rounded-xl p-3 text-sm text-olive-800">
          <p className="font-semibold mb-1">Community Published</p>
          <p>AI scans your material for educational validity (score ≥ 70/100 required) before publishing to the public library.</p>
        </div>
      )}

      <div>
        <label className="label">Title</label>
        <input className="input" placeholder="e.g. My notes on the Water Cycle" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="label">Subject</label>
        <select className="input" value={subject} onChange={e => setSubject(e.target.value as typeof subject)}>
          {TOPICS.filter(t => t.key !== 'all').map(t => (
            <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
          ))}
        </select>
      </div>

      {/* File upload for notes */}
      <div>
        <label className="label">Upload notes file <span className="text-earth-400 font-normal">(optional — .txt, .md, .pdf, .pptx)</span></label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-earth-300 hover:border-earth-400 rounded-xl p-4 text-center cursor-pointer transition-colors"
        >
          {uploadFile ? (
            <div className="flex items-center justify-center gap-2 text-sm text-earth-700">
              <FileIcon className="w-4 h-4 text-earth-500" />
              <span className="font-medium">{uploadFile.name}</span>
              {extracting && <Loader2 className="w-3.5 h-3.5 animate-spin text-earth-400" />}
              {!extracting && fileText && <CheckCircle className="w-3.5 h-3.5 text-olive-500" />}
              <button
                onClick={e => { e.stopPropagation(); setUploadFile(null); setFileText(''); }}
                className="text-earth-400 hover:text-red-500 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-earth-400 mx-auto mb-1" />
              <p className="text-xs text-earth-500">Click to upload a notes file</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.pdf,.pptx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleFileSelect(f); }}
          />
        </div>
      </div>

      {context.trim() && (
        <div className="bg-earth-50 border border-earth-200 rounded-xl px-4 py-2 text-xs text-earth-600">
          Studio document ({context.length.toLocaleString()} chars) will be included.
        </div>
      )}

      <div>
        <label className="label">Additional notes <span className="text-earth-400 font-normal">(optional)</span></label>
        <textarea className="input min-h-[100px] resize-y" placeholder="Add context, tips, or links…" value={extra} onChange={e => setExtra(e.target.value)} />
      </div>

      {publishResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Not ready for publishing (score: {publishResult.score}/100)</p>
          <p>{publishResult.reason}</p>
        </div>
      )}

      {isErr && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">Could not complete. Please try again.</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!title.trim() || !hasContent || isPending}
        className="btn-primary flex items-center gap-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isPending
          ? mode === 'publish' ? 'Validating & publishing…' : 'Sharing…'
          : mode === 'publish' ? '✨ Validate & Publish' : 'Share to Community'}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'drafting',   label: 'Worksheets',   icon: FileText  },
  { id: 'mindmap',    label: 'Mind Maps',    icon: GitBranch },
  { id: 'flashcards', label: 'Cards & Quiz', icon: Layers    },
  { id: 'share',      label: 'Share',        icon: Share2    },
];

export function ContentStudioPage() {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const urlMode = searchParams.get('mode') as 'flashcards' | 'quiz' | null;

  const resolvedTab: Tab = (urlTab === 'mindmap' || urlTab === 'flashcards' || urlTab === 'share')
    ? urlTab
    : 'drafting';

  const [tab, setTab]           = useState<Tab>(resolvedTab);
  const [context, setContext]   = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  // Sync if user navigates to a different trail task while already on this page
  useEffect(() => {
    if (urlTab) setTab(resolvedTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-earth-800">Content Studio</h1>
        <p className="text-earth-500 text-sm mt-1">Upload a document — AI turns it into worksheets, mind maps, and flashcards.</p>
      </div>

      <div className="bg-white border border-earth-200 rounded-2xl p-5">
        <DocInput context={context} setContext={setContext} fileName={fileName} setFileName={setFileName} />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(t => (
          <TabButton key={t.id} active={tab === t.id} icon={t.icon} label={t.label} onClick={() => setTab(t.id)} />
        ))}
      </div>

      <div className="bg-parchment border border-earth-200 rounded-2xl p-5">
        {tab === 'drafting'   && <DraftingTab   context={context} />}
        {tab === 'mindmap'    && <MindMapTab    context={context} />}
        {tab === 'flashcards' && <FlashcardsTab context={context} initialMode={urlMode ?? undefined} />}
        {tab === 'share'      && <ShareTab      context={context} />}
      </div>
    </div>
  );
}
