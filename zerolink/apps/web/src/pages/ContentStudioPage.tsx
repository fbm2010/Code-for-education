import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  FileText, GitBranch, Layers, Share2, Loader2, Download, ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { TOPICS } from '../lib/worksheets';
import type {
  Worksheet, Flashcards, Quiz, MindMap, OllamaError,
} from '../services/ollamaTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'drafting' | 'mindmap' | 'flashcards' | 'share';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
type Level = typeof LEVELS[number];

// ── Small helpers ─────────────────────────────────────────────────────────────

function isError(r: unknown): r is OllamaError {
  return typeof r === 'object' && r !== null && 'error' in r;
}

function TabButton({ id, active, icon: Icon, label, onClick }: {
  id: Tab; active: boolean; icon: React.ElementType; label: string; onClick: () => void;
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

function OfflineFallback() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
      <p className="font-semibold mb-1">Local AI offline</p>
      <p>Install Ollama and pull <code className="bg-amber-100 px-1 rounded">llama3.2</code> to enable AI generation, or use the manual worksheets in the Coach tab.</p>
    </div>
  );
}

// ── Download helpers ─────────────────────────────────────────────────────────

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Drafting tab ─────────────────────────────────────────────────────────────

function DraftingTab() {
  const [topic, setTopic]   = useState('');
  const [level, setLevel]   = useState<Level>('Beginner');
  const [focus, setFocus]   = useState('');
  const [result, setResult] = useState<Worksheet | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: Worksheet | OllamaError }>('/api/worksheets/generate', { topic, level, focus: focus || undefined });
      return res.data.data;
    },
    onSuccess: data => {
      if (!isError(data)) setResult(data);
    },
  });

  const exportText = (ws: Worksheet) => {
    const lines = [
      ws.title,
      `Level: ${level} | ~${ws.minutes} min`,
      '',
      'Objectives:',
      ...ws.objectives.map(o => `  • ${o}`),
      '',
      'Tasks:',
      ...ws.tasks.map((t, i) => `  ${i + 1}. ${t}`),
      '',
      `Reflection: ${ws.reflection}`,
    ];
    downloadText(lines.join('\n'), `${ws.title}.txt`);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-earth-600">Generate a custom worksheet for any topic using local AI.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Topic</label>
          <input
            className="input"
            placeholder="e.g. Fractions, Weather, Adverbs…"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Level</label>
          <select className="input" value={level} onChange={e => setLevel(e.target.value as Level)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Focus <span className="text-earth-400 font-normal">(optional)</span></label>
        <input
          className="input"
          placeholder="e.g. word problems, real-world application…"
          value={focus}
          onChange={e => setFocus(e.target.value)}
        />
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!topic.trim() || mutation.isPending}
        className="btn-primary flex items-center gap-2"
      >
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mutation.isPending ? 'Generating…' : 'Generate Worksheet'}
      </button>

      {mutation.isSuccess && isError(mutation.data) && <OfflineFallback />}

      {result && (
        <div className="bg-white border border-earth-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-black text-earth-800 text-lg">{result.title}</h3>
            <button
              onClick={() => exportText(result)}
              className="flex items-center gap-1.5 text-xs font-semibold text-earth-500 hover:text-earth-700 shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-earth-500 uppercase tracking-wide mb-1">Objectives</p>
            <ul className="space-y-1">
              {result.objectives.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-earth-700">
                  <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-earth-400 shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold text-earth-500 uppercase tracking-wide mb-1">Tasks</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              {result.tasks.map((t, i) => (
                <li key={i} className="text-sm text-earth-700">{t}</li>
              ))}
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

// ── Mind Map tab ─────────────────────────────────────────────────────────────

function MindMapTab() {
  const [topic, setTopic]   = useState('');
  const [result, setResult] = useState<MindMap | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: MindMap | OllamaError }>('/api/mind-map/generate', { topic });
      return res.data.data;
    },
    onSuccess: data => { if (!isError(data)) setResult(data); },
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-earth-600">Generate a visual mind map outline for any concept.</p>

      <div className="flex gap-3">
        <input
          className="input flex-1"
          placeholder="e.g. The Water Cycle, Democracy, Photosynthesis…"
          value={topic}
          onChange={e => setTopic(e.target.value)}
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!topic.trim() || mutation.isPending}
          className="btn-primary whitespace-nowrap flex items-center gap-2"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mutation.isPending ? 'Thinking…' : 'Generate'}
        </button>
      </div>

      {mutation.isSuccess && isError(mutation.data) && <OfflineFallback />}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-earth-800 text-xl text-center w-full">{result.center}</h3>
            <button
              onClick={() => downloadJson(result, `mindmap-${result.center}.json`)}
              className="flex items-center gap-1.5 text-xs font-semibold text-earth-500 hover:text-earth-700 shrink-0 ml-3"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.branches.map((b, i) => (
              <div key={i} className="bg-white border border-earth-200 rounded-2xl p-4">
                <p className="font-bold text-earth-700 mb-2 text-sm">{b.label}</p>
                <ul className="space-y-1">
                  {b.children.map((c, j) => (
                    <li key={j} className="flex gap-2 text-xs text-earth-600">
                      <span className="text-earth-300 shrink-0">–</span>{c}
                    </li>
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

// ── Flashcards / Quiz tab ────────────────────────────────────────────────────

function FlashcardsTab() {
  const [mode, setMode]     = useState<'flashcards' | 'quiz'>('flashcards');
  const [topic, setTopic]   = useState('');
  const [level, setLevel]   = useState<Level>('Beginner');
  const [count, setCount]   = useState(8);
  const [result, setResult] = useState<Flashcards | Quiz | null>(null);
  const [flip, setFlip]     = useState<Record<number, boolean>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'flashcards') {
        const res = await api.post<{ data: Flashcards | OllamaError }>('/api/flashcards/generate', { topic, level, count });
        return res.data.data;
      } else {
        const res = await api.post<{ data: Quiz | OllamaError }>('/api/quiz/generate', { topic, level, count });
        return res.data.data;
      }
    },
    onSuccess: data => { if (!isError(data)) { setResult(data); setFlip({}); } },
  });

  const isFlashcards = (r: Flashcards | Quiz): r is Flashcards => 'cards' in r;

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-2 bg-earth-100 rounded-xl p-1 w-fit">
        {(['flashcards', 'quiz'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
              mode === m ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <p className="text-sm text-earth-600">
        {mode === 'flashcards' ? 'Generate study cards for quick review.' : 'Generate a multiple-choice quiz.'}
      </p>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <label className="label">Topic</label>
          <input className="input" placeholder="e.g. Photosynthesis…" value={topic} onChange={e => setTopic(e.target.value)} />
        </div>
        <div>
          <label className="label">Level</label>
          <select className="input" value={level} onChange={e => setLevel(e.target.value as Level)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Count ({count})</label>
          <input type="range" min={3} max={mode === 'flashcards' ? 20 : 10} value={count} onChange={e => setCount(+e.target.value)} className="w-full mt-2" />
        </div>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!topic.trim() || mutation.isPending}
        className="btn-primary flex items-center gap-2"
      >
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mutation.isPending ? 'Generating…' : `Generate ${count} ${mode === 'flashcards' ? 'Cards' : 'Questions'}`}
      </button>

      {mutation.isSuccess && isError(mutation.data) && <OfflineFallback />}

      {result && isFlashcards(result) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {result.cards.map((card, i) => (
            <button
              key={i}
              onClick={() => setFlip(f => ({ ...f, [i]: !f[i] }))}
              className="bg-white border border-earth-200 rounded-2xl p-4 text-left hover:shadow-md transition-all min-h-[80px] flex items-center"
            >
              <p className="text-sm text-earth-700 font-medium">
                {flip[i] ? card.back : card.front}
              </p>
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
                  <div
                    key={j}
                    className={`text-xs rounded-lg px-3 py-2 border ${
                      j === q.answer
                        ? 'bg-olive-50 border-olive-300 text-olive-800 font-semibold'
                        : 'bg-earth-50 border-earth-200 text-earth-600'
                    }`}
                  >
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

// ── Share Notebook tab ───────────────────────────────────────────────────────

function ShareTab() {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [subject, setSubject] = useState<typeof TOPICS[number]['key']>('math');
  const [sent, setSent]     = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/community/notebooks', { title, body, subject });
    },
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">🎉</p>
        <p className="font-black text-earth-800 text-xl">Notebook shared!</p>
        <p className="text-earth-500 text-sm">Your note is now visible in the Village community.</p>
        <button className="btn-secondary" onClick={() => { setSent(false); setTitle(''); setBody(''); }}>Share another</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-earth-600">Share a study note or resource with the ZeroLink community.</p>

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

      <div>
        <label className="label">Content</label>
        <textarea
          className="input min-h-[160px] resize-y"
          placeholder="Write your notes, tips, or resource links here…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          Could not share notebook. Please try again.
        </p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={!title.trim() || !body.trim() || mutation.isPending}
        className="btn-primary flex items-center gap-2"
      >
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mutation.isPending ? 'Sharing…' : 'Share to Village'}
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'drafting',   label: 'Worksheets',  icon: FileText  },
  { id: 'mindmap',    label: 'Mind Maps',   icon: GitBranch },
  { id: 'flashcards', label: 'Cards & Quiz',icon: Layers    },
  { id: 'share',      label: 'Share Note',  icon: Share2    },
];

export function ContentStudioPage() {
  const [tab, setTab] = useState<Tab>('drafting');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-earth-800">Content Studio</h1>
        <p className="text-earth-500 text-sm mt-1">AI-powered tools to create, explore, and share learning content.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(t => (
          <TabButton key={t.id} id={t.id} active={tab === t.id} icon={t.icon} label={t.label} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {/* Tab body */}
      <div className="bg-parchment border border-earth-200 rounded-2xl p-5">
        {tab === 'drafting'   && <DraftingTab />}
        {tab === 'mindmap'    && <MindMapTab />}
        {tab === 'flashcards' && <FlashcardsTab />}
        {tab === 'share'      && <ShareTab />}
      </div>
    </div>
  );
}
