import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const BASE_URL = `http://${config.OLLAMA_URL}`;
const MODEL    = config.OLLAMA_MODEL;

export type OllamaError = { error: 'ollama_unavailable'; fallback: true };

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

async function generate<T>(prompt: string, systemPrompt: string): Promise<T | OllamaError> {
  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, system: systemPrompt, stream: false }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Ollama returned non-OK');
      return { error: 'ollama_unavailable', fallback: true };
    }

    const body = await res.json() as { response?: string };
    const raw = (body.response ?? '').trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object in Ollama response');
    return JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as T;
  } catch (err) {
    logger.warn({ err }, 'Ollama unavailable or parse error');
    return { error: 'ollama_unavailable', fallback: true };
  }
}

export async function generateWorksheet(
  topic: string, level: string, focus?: string,
): Promise<Worksheet | OllamaError> {
  const system = 'Respond ONLY with valid JSON, no markdown, no explanation.';
  const prompt = `Create a classroom worksheet for the topic "${topic}" at ${level} level${focus ? `, focused on: ${focus}` : ''}.
Return JSON matching exactly: { "title": string, "objectives": string[], "tasks": string[], "reflection": string, "minutes": number }
objectives: 2-3 items. tasks: 3-5 concrete activities. reflection: one open question. minutes: realistic time (15-45).`;
  return generate<Worksheet>(prompt, system);
}

export async function generateFlashcards(
  topic: string, count: number, level: string,
): Promise<Flashcards | OllamaError> {
  const system = 'Respond ONLY with valid JSON, no markdown, no explanation.';
  const prompt = `Create ${count} flashcards for the topic "${topic}" at ${level} level.
Return JSON: { "cards": [ { "front": string, "back": string } ] }`;
  return generate<Flashcards>(prompt, system);
}

export async function generateQuiz(
  topic: string, count: number, level: string,
): Promise<Quiz | OllamaError> {
  const system = 'Respond ONLY with valid JSON, no markdown, no explanation.';
  const prompt = `Create ${count} multiple-choice quiz questions for the topic "${topic}" at ${level} level.
Return JSON: { "questions": [ { "question": string, "options": string[4], "answer": number (0-3 index), "explanation": string } ] }`;
  return generate<Quiz>(prompt, system);
}

export async function generateMindMap(topic: string): Promise<MindMap | OllamaError> {
  const system = 'Respond ONLY with valid JSON, no markdown, no explanation.';
  const prompt = `Create a mind map for the topic "${topic}".
Return JSON: { "center": string, "branches": [ { "label": string, "children": string[] } ] }
Use 4-6 branches, each with 2-4 children.`;
  return generate<MindMap>(prompt, system);
}

export async function checkOllama(): Promise<{ available: boolean; model: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return { available: false, model: null };
    const body = await res.json() as { models?: Array<{ name: string }> };
    const model = body.models?.find(m => m.name.startsWith(MODEL))?.name ?? null;
    return { available: true, model };
  } catch {
    return { available: false, model: null };
  }
}
