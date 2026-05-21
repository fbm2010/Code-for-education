import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText, Filter, Printer } from 'lucide-react';
import { usePrefsStore } from '../stores/prefsStore';

type Worksheet = {
  id: string;
  courseSlug: string;
  topic: 'math' | 'science' | 'language' | 'geography' | 'arts' | 'technology';
  title: string;
  level: string;
  minutes: number;
  objectives: string[];
  tasks: string[];
  reflection: string;
};

const TOPICS = [
  { key: 'all', label: 'All Worksheets', icon: '🧭' },
  { key: 'math', label: 'Math', icon: '📐' },
  { key: 'science', label: 'Science', icon: '🔬' },
  { key: 'language', label: 'Language', icon: '📚' },
  { key: 'geography', label: 'Geography', icon: '🌍' },
  { key: 'arts', label: 'Arts', icon: '🎨' },
  { key: 'technology', label: 'Technology', icon: '💻' },
] as const;

const COPY: Record<string, { heading: string; subtitle: string; download: string; print: string; objectives: string; tasks: string; reflection: string; back: string; empty: string }> = {
  en: { heading: 'Course Worksheets', subtitle: 'Pick a topic button, read the worksheet online, or click any worksheet to download it as a PDF.', download: 'Download PDF', print: 'Print', objectives: 'Learning goals', tasks: 'Practice trail', reflection: 'Reflection', back: 'Back to Map', empty: 'No worksheets in this category yet.' },
  sw: { heading: 'Karatasi za Mazoezi', subtitle: 'Chagua mada, soma mtandaoni, au bofya karatasi kupakua PDF.', download: 'Pakua PDF', print: 'Chapisha', objectives: 'Malengo', tasks: 'Mazoezi', reflection: 'Tafakari', back: 'Rudi Ramani', empty: 'Hakuna karatasi kwenye kundi hili bado.' },
  fr: { heading: 'Fiches d’exercices', subtitle: 'Choisis un sujet, lis en ligne ou clique sur une fiche pour télécharger le PDF.', download: 'Télécharger PDF', print: 'Imprimer', objectives: 'Objectifs', tasks: 'Pratique', reflection: 'Réflexion', back: 'Retour à la carte', empty: 'Aucune fiche dans cette catégorie.' },
  ar: { heading: 'أوراق العمل', subtitle: 'اختر موضوعًا، اقرأ على الموقع، أو اضغط لتنزيل ملف PDF.', download: 'تنزيل PDF', print: 'طباعة', objectives: 'الأهداف', tasks: 'التدريب', reflection: 'التأمل', back: 'العودة إلى الخريطة', empty: 'لا توجد أوراق عمل هنا بعد.' },
  hi: { heading: 'कार्यपत्रक', subtitle: 'विषय चुनें, वेबसाइट पर पढ़ें, या PDF डाउनलोड करने के लिए क्लिक करें।', download: 'PDF डाउनलोड', print: 'प्रिंट', objectives: 'लक्ष्य', tasks: 'अभ्यास', reflection: 'चिंतन', back: 'मानचित्र पर लौटें', empty: 'इस श्रेणी में अभी कार्यपत्रक नहीं हैं।' },
  es: { heading: 'Hojas de trabajo', subtitle: 'Elige un tema, lee en línea o haz clic para descargar el PDF.', download: 'Descargar PDF', print: 'Imprimir', objectives: 'Objetivos', tasks: 'Práctica', reflection: 'Reflexión', back: 'Volver al mapa', empty: 'Aún no hay hojas en esta categoría.' },
  pt: { heading: 'Fichas de atividades', subtitle: 'Escolha um tema, leia online ou clique para baixar o PDF.', download: 'Baixar PDF', print: 'Imprimir', objectives: 'Objetivos', tasks: 'Prática', reflection: 'Reflexão', back: 'Voltar ao mapa', empty: 'Ainda não há fichas nesta categoria.' },
  ha: { heading: 'Takardun Aiki', subtitle: 'Zaɓi batu, karanta a shafi, ko danna don sauke PDF.', download: 'Sauke PDF', print: 'Buga', objectives: 'Manufofi', tasks: 'Aiki', reflection: 'Tunani', back: 'Koma Taswira', empty: 'Babu takardu a wannan rukuni tukuna.' },
};

const WORKSHEETS: Worksheet[] = [
  { id: 'math-number-market', courseSlug: 'foundations-of-math', topic: 'math', title: 'Number Market: Addition & Subtraction', level: 'Beginner', minutes: 20, objectives: ['Add and subtract within 20', 'Explain your strategy using words or drawings'], tasks: ['A mango costs 7 coins and a banana costs 5 coins. How many coins altogether?', 'You have 18 beans. You plant 6. How many are left?', 'Write your own market word problem and solve it.'], reflection: 'Which strategy helped most: counting on, drawing, or using objects?' },
  { id: 'math-fraction-cooking', courseSlug: 'foundations-of-math', topic: 'math', title: 'Cooking Fractions', level: 'Intermediate', minutes: 25, objectives: ['Recognize halves, thirds, and quarters', 'Compare simple fractions'], tasks: ['Draw a flatbread split into 2 equal pieces. Shade 1/2.', 'Which is larger: 1/3 or 1/4? Explain with a drawing.', 'A recipe uses 3/4 cup of water. Mark it on a cup sketch.'], reflection: 'Where do you use fractions at home?' },
  { id: 'science-water-cycle', courseSlug: 'earth-and-water-science', topic: 'science', title: 'Water Cycle Field Notes', level: 'Beginner', minutes: 25, objectives: ['Name evaporation, condensation, and precipitation', 'Connect weather observations to the water cycle'], tasks: ['Sketch clouds and arrows showing water moving up and down.', 'Observe the sky for 5 minutes. What clues show rain may come?', 'Put these in order: cloud forms, rain falls, puddle dries.'], reflection: 'How does rain support your community?' },
  { id: 'science-plant-detective', courseSlug: 'living-world', topic: 'science', title: 'Plant Detective', level: 'Beginner', minutes: 20, objectives: ['Identify roots, stems, leaves, flowers', 'Describe what plants need to grow'], tasks: ['Find a safe plant to observe. Draw and label four parts.', 'List three things this plant needs.', 'Predict what happens if the plant gets no sunlight for a week.'], reflection: 'What plants are important where you live?' },
  { id: 'language-story-map', courseSlug: 'english-beginners', topic: 'language', title: 'Story Map Builder', level: 'Beginner', minutes: 30, objectives: ['Identify character, setting, problem, and solution', 'Write a short paragraph from a plan'], tasks: ['Choose a character from your community.', 'Describe where the story happens using three details.', 'Write the problem and solution in two complete sentences.'], reflection: 'What makes a story easy to remember?' },
  { id: 'language-vocab-trail', courseSlug: 'swahili-basics', topic: 'language', title: 'Vocabulary Trail', level: 'Beginner', minutes: 15, objectives: ['Practice five new words', 'Use each word in context'], tasks: ['Pick five useful words from today’s lesson.', 'Draw a small icon for each word.', 'Write one sentence using each word.'], reflection: 'Which word will you use today?' },
  { id: 'geo-map-my-route', courseSlug: 'maps-and-places', topic: 'geography', title: 'Map My Route', level: 'Beginner', minutes: 25, objectives: ['Use symbols and directions', 'Create a simple route map'], tasks: ['Draw your route from home to a learning place.', 'Add a legend with at least four symbols.', 'Write directions using north, south, east, or west.'], reflection: 'What landmark helps you avoid getting lost?' },
  { id: 'arts-patterns', courseSlug: 'arts-and-culture', topic: 'arts', title: 'Patterns Around Us', level: 'Beginner', minutes: 20, objectives: ['Recognize repeating patterns', 'Create a pattern inspired by local art'], tasks: ['Find or imagine a pattern with two repeating shapes.', 'Create an ABAB or AABB pattern border.', 'Explain what colors or shapes you chose and why.'], reflection: 'How can art tell a community story?' },
  { id: 'tech-safe-password', courseSlug: 'technology-frontier', topic: 'technology', title: 'Strong Password Workshop', level: 'Beginner', minutes: 20, objectives: ['Explain why passwords matter', 'Create a memorable strong password pattern'], tasks: ['List three things a password should not include.', 'Build a practice password from a phrase, numbers, and symbols.', 'Write two safety rules for shared devices.'], reflection: 'How can you keep an account safe without writing the password publicly?' },
];

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, match => `\\${match}`);
}

function wrapText(text: string, width = 86) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildWorksheetPdf(worksheet: Worksheet, labels: typeof COPY.en) {
  const lines = [
    `ZeroLink Worksheet: ${worksheet.title}`,
    `Topic: ${worksheet.topic} | Level: ${worksheet.level} | Time: ${worksheet.minutes} minutes`,
    '',
    labels.objectives,
    ...worksheet.objectives.map((item, i) => `${i + 1}. ${item}`),
    '',
    labels.tasks,
    ...worksheet.tasks.map((item, i) => `${i + 1}. ${item}`),
    '',
    `${labels.reflection}: ${worksheet.reflection}`,
  ].flatMap(line => wrapText(line));

  const content = [
    'BT',
    '/F1 12 Tf',
    '50 770 Td',
    '16 TL',
    ...lines.slice(0, 44).map((line, index) => `${index === 0 ? '/F1 16 Tf ' : ''}(${escapePdfText(line)}) Tj T*${index === 0 ? ' /F1 12 Tf' : ''}`),
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadWorksheetPdf(worksheet: Worksheet, labels: typeof COPY.en) {
  const blob = buildWorksheetPdf(worksheet, labels);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${worksheet.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CourseWorksheetsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { prefs } = usePrefsStore();
  const labels = COPY[prefs.primaryLanguage] ?? COPY.en;
  const inferredTopic = TOPICS.some(t => t.key !== 'all' && slug?.includes(t.key)) ? slug?.split('-')[0] : 'all';
  const [topic, setTopic] = useState<string>(inferredTopic ?? 'all');

  const worksheets = useMemo(() => {
    const slugMatches = slug ? WORKSHEETS.filter(w => w.courseSlug === slug || w.topic === slug || slug.includes(w.topic)) : WORKSHEETS;
    const base = slugMatches.length ? slugMatches : WORKSHEETS;
    return topic === 'all' ? base : base.filter(w => w.topic === topic);
  }, [slug, topic]);

  return (
    <div className="space-y-6" dir={prefs.primaryLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/map" className="text-sm font-semibold text-earth-500 hover:text-earth-700">← {labels.back}</Link>
          <h1 className="text-3xl font-black text-earth-800 mt-2">📄 {labels.heading}</h1>
          <p className="text-earth-500 mt-1 max-w-2xl">{labels.subtitle}</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" aria-hidden="true" /> {labels.print}
        </button>
      </div>

      <section className="card" aria-labelledby="worksheet-filters">
        <h2 id="worksheet-filters" className="font-black text-earth-800 mb-3 flex items-center gap-2">
          <Filter className="w-5 h-5 text-earth-400" aria-hidden="true" /> Topics
        </h2>
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Worksheet topic filters">
          {TOPICS.map(t => (
            <button
              key={t.key}
              onClick={() => setTopic(t.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                topic === t.key ? 'bg-earth-400 text-white' : 'bg-earth-100 text-earth-600 hover:bg-earth-200'
              }`}
              aria-pressed={topic === t.key}
            >
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {worksheets.map(worksheet => (
          <article key={worksheet.id} className="card card-hover flex flex-col">
            <button
              className="text-left flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-earth-400 rounded-xl"
              onClick={() => downloadWorksheetPdf(worksheet, labels)}
              aria-label={`${labels.download}: ${worksheet.title}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs bg-earth-100 text-earth-600 font-bold px-2 py-0.5 rounded-full uppercase">
                    {worksheet.topic}
                  </span>
                  <h2 className="text-xl font-black text-earth-800 mt-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-earth-400" aria-hidden="true" /> {worksheet.title}
                  </h2>
                </div>
                <span className="text-xs text-earth-400 shrink-0">⏱ {worksheet.minutes} min</span>
              </div>
              <div className="space-y-4 text-sm text-earth-600">
                <div>
                  <h3 className="font-bold text-earth-800 mb-1">{labels.objectives}</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {worksheet.objectives.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-earth-800 mb-1">{labels.tasks}</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    {worksheet.tasks.map(item => <li key={item}>{item}</li>)}
                  </ol>
                </div>
                <p className="bg-earth-50 rounded-xl p-3"><strong>{labels.reflection}:</strong> {worksheet.reflection}</p>
              </div>
            </button>
            <button
              className="btn-primary mt-4 text-sm flex items-center justify-center gap-2"
              onClick={() => downloadWorksheetPdf(worksheet, labels)}
            >
              <Download className="w-4 h-4" aria-hidden="true" /> {labels.download}
            </button>
          </article>
        ))}
        {worksheets.length === 0 && <p className="card text-center text-earth-500 py-12 lg:col-span-2">{labels.empty}</p>}
      </div>
    </div>
  );
}