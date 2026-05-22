import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL = config.GROQ_MODEL;

export type AIError = { error: 'ai_unavailable'; fallback: true };

export type Worksheet = {
  title: string;
  objectives: string[];
  tasks: string[];
  reflection: string;
  minutes: number;
};

export type Flashcards = { cards: Array<{ front: string; back: string }> };

export type Quiz = {
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }>;
};

export type MindMap = {
  center: string;
  branches: Array<{ label: string; children: string[] }>;
};

export type ValidationResult = {
  valid: boolean;
  score: number;
  reason: string;
  topics: string[];
};

function extractJSON(raw: string): string {
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
  const objStart = stripped.indexOf('{');
  const arrStart = stripped.indexOf('[');
  if (objStart === -1 && arrStart === -1) throw new Error('No JSON found');
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    const end = stripped.lastIndexOf(']');
    if (end === -1) throw new Error('Malformed array');
    return stripped.slice(arrStart, end + 1);
  }
  const end = stripped.lastIndexOf('}');
  if (end === -1) throw new Error('Malformed object');
  return stripped.slice(objStart, end + 1);
}

async function chat<T>(systemPrompt: string, userMessage: string): Promise<T | AIError> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const err = await res.text();
        logger.warn({ status: res.status, err, attempt }, 'Groq API returned non-OK');
        // Retry on 5xx or rate-limit (429)
        if (res.status >= 500 || res.status === 429) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        return { error: 'ai_unavailable', fallback: true };
      }

      const body = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content ?? '';
      const jsonStr = extractJSON(content.trim());
      return JSON.parse(jsonStr) as T;
    } catch (err) {
      logger.warn({ err, attempt }, 'Groq API error or parse error');
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      return { error: 'ai_unavailable', fallback: true };
    }
  }
  return { error: 'ai_unavailable', fallback: true };
}

function sourceClause(topic: string, context?: string): string {
  if (context?.trim()) {
    const snippet = context.trim().slice(0, 4000);
    return `Document excerpt:\n${snippet}\n\n`;
  }
  return `Topic: "${topic}"\n\n`;
}

export async function generateWorksheet(
  topic: string, level: string, focus?: string, context?: string,
): Promise<Worksheet | AIError> {
  const system = 'You are an expert educational content creator. Output ONLY a valid JSON object matching the exact schema requested. No markdown fences, no explanation. Write thorough, detailed content — each objective should be a full sentence, each task should be a clear multi-step instruction with examples where helpful, and the reflection should be 2-3 sentences that prompt genuine metacognitive thinking.';
  const prompt =
    `${sourceClause(topic, context)}` +
    `Create a comprehensive, detailed learning worksheet for ${level} level${focus ? `, focus: ${focus}` : ''}.\n` +
    `Requirements:\n` +
    `- title: descriptive and specific\n` +
    `- objectives: 4-5 full-sentence learning goals that are measurable\n` +
    `- tasks: 6-8 detailed practice activities; each task should include clear instructions and, where relevant, a worked example or prompt\n` +
    `- reflection: 2-3 sentences of meaningful metacognitive questions\n` +
    `- minutes: realistic time estimate\n` +
    `Output exactly this JSON schema: {"title":string,"objectives":[string,string,string,string],"tasks":[string,string,string,string,string,string],"reflection":string,"minutes":number}`;
  return chat<Worksheet>(system, prompt);
}

export async function generateFlashcards(
  topic: string, count: number, level: string, context?: string,
): Promise<Flashcards | AIError> {
  const system = 'You are an expert educational content creator. Output ONLY a valid JSON object. No markdown fences, no explanation. Each flashcard front should pose a clear, specific question or prompt. Each back should provide a thorough answer — 1-3 complete sentences — that gives real understanding, not just a single word.';
  const prompt =
    `${sourceClause(topic, context)}` +
    `Create exactly ${count} high-quality flashcards at ${level} level.\n` +
    `Requirements:\n` +
    `- front: a focused question, definition prompt, or concept name\n` +
    `- back: a thorough 1-3 sentence answer with context or an example\n` +
    `Output exactly this JSON schema: {"cards":[{"front":string,"back":string}]}`;
  const result = await chat<Flashcards | Array<{ front: string; back: string }>>(system, prompt);
  if (result && 'error' in (result as object)) return result as AIError;
  if (Array.isArray(result)) return { cards: result as Array<{ front: string; back: string }> };
  return result as Flashcards;
}

export async function generateQuiz(
  topic: string, count: number, level: string, context?: string,
): Promise<Quiz | AIError> {
  const system = 'You are an expert educational content creator. Output ONLY a valid JSON object. No markdown fences, no explanation. Write questions that test genuine understanding, not just recall. Make wrong options plausible — not obviously wrong. Explanations must be thorough: 2-3 sentences explaining why the correct answer is right AND why common wrong answers are wrong.';
  const prompt =
    `${sourceClause(topic, context)}` +
    `Create exactly ${count} high-quality multiple-choice questions at ${level} level.\n` +
    `Requirements:\n` +
    `- question: clear, unambiguous, tests real understanding\n` +
    `- options: 4 options, all plausible, no trick answers\n` +
    `- answer: zero-based index of the correct option\n` +
    `- explanation: 2-3 sentences explaining the correct answer and addressing common misconceptions\n` +
    `Output exactly this JSON schema: {"questions":[{"question":string,"options":[string,string,string,string],"answer":number,"explanation":string}]}`;
  return chat<Quiz>(system, prompt);
}

export async function generateMindMap(topic: string, context?: string): Promise<MindMap | AIError> {
  const system = 'You are an expert educational content creator. Output ONLY a valid JSON object. No markdown fences, no explanation. Each branch label should be a key concept or theme. Each child should be a specific, descriptive sub-concept or example — full phrases, not single words.';
  const prompt =
    `${sourceClause(topic, context)}` +
    `Create a rich mind map with 5-6 main branches, each with 3-4 descriptive child concepts.\n` +
    `Requirements:\n` +
    `- center: the core topic as a clear phrase\n` +
    `- branches: 5-6 distinct thematic categories\n` +
    `- children: 3-4 specific sub-concepts or examples per branch, written as descriptive phrases\n` +
    `Output exactly this JSON schema: {"center":string,"branches":[{"label":string,"children":[string,string,string]}]}`;
  return chat<MindMap>(system, prompt);
}

export async function validateEducationalContent(content: string): Promise<ValidationResult | AIError> {
  const system = 'You are an educational content validator. Output ONLY a valid JSON object. No markdown fences, no explanation.';
  const snippet = content.trim().slice(0, 3000);
  const prompt =
    `Analyze this content for educational validity and appropriateness for a community learning platform:\n\n"${snippet}"\n\n` +
    `Output exactly this JSON schema: {"valid":boolean,"score":number,"reason":string,"topics":[string]}` +
    `\nWhere: score is 0-100 (70+ is suitable for community publishing), valid is true if content is educational and not harmful/spam.`;
  return chat<ValidationResult>(system, prompt);
}

export async function checkGroq(): Promise<{ available: boolean; model: string }> {
  try {
    const res = await fetch(`${GROQ_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${config.GROQ_API_KEY}` },
      signal: AbortSignal.timeout(5_000),
    });
    return { available: res.ok, model: MODEL };
  } catch {
    return { available: false, model: MODEL };
  }
}
