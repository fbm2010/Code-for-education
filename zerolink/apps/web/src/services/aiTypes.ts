export type AIError = { error: 'ai_unavailable'; fallback: true };

export type Worksheet = {
  title: string;
  objectives: string[];
  tasks: string[];
  reflection: string;
  minutes: number;
};

export type Flashcards = {
  cards: Array<{ front: string; back: string }>;
};

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
