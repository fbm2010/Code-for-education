import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { usePrefsStore } from '../../stores/prefsStore';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'SVG', 'CANVAS']);
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;

// WeakMaps survive React re-renders but are cleared on full page reload — that's fine
const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Partial<Record<(typeof TRANSLATABLE_ATTRS)[number], string>>>();

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (element.closest('[data-no-translate]')) return true;
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (SKIP_TAGS.has(current.tagName)) return true;
  }
  return false;
}

function meaningfulText(value: string): boolean {
  const text = value.trim();
  return text.length > 1 && /[\p{L}]/u.test(text);
}

function preserveSpacing(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated.trim()}${trailing}`;
}

function collectTextNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (shouldSkipElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
      const base = originalText.get(node) ?? node.nodeValue ?? '';
      return meaningfulText(base) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

function collectAttrTargets(root: HTMLElement) {
  const targets: Array<{ element: Element; attr: (typeof TRANSLATABLE_ATTRS)[number]; text: string }> = [];
  root.querySelectorAll('*').forEach(element => {
    if (shouldSkipElement(element)) return;
    for (const attr of TRANSLATABLE_ATTRS) {
      const value = element.getAttribute(attr);
      const stored = originalAttrs.get(element)?.[attr];
      const text = stored ?? value ?? '';
      if (meaningfulText(text)) targets.push({ element, attr, text });
    }
  });
  return targets;
}

function restoreOriginals(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const original = originalText.get(node);
    if (original !== undefined) node.nodeValue = original;
  }
  root.querySelectorAll('*').forEach(element => {
    const stored = originalAttrs.get(element);
    if (!stored) return;
    for (const attr of TRANSLATABLE_ATTRS) {
      const orig = stored[attr];
      if (orig !== undefined) element.setAttribute(attr, orig);
    }
  });
}

async function translateBatch(texts: string[], targetLang: string, signal: AbortSignal): Promise<string[]> {
  const translated: string[] = [];
  for (let i = 0; i < texts.length; i += 60) {
    const chunk = texts.slice(i, i + 60);
    const res = await api.post(
      '/translate/batch',
      { texts: chunk, targetLang, sourceLang: 'en' },
      { signal, timeout: 30_000 },
    );
    translated.push(...(res.data.data.texts as string[]));
  }
  return translated;
}

export function PageTranslator() {
  const lang = usePrefsStore(state => state.prefs.primaryLanguage);
  const location = useLocation();
  const runId = useRef(0);
  const [translating, setTranslating] = useState(false);
  // Flag to suppress MutationObserver while we are writing translated text to the DOM
  const writing = useRef(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
  }, [lang]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const controller = new AbortController();
    const currentRun = ++runId.current;

    const translatePage = async () => {
      if (lang === 'en') {
        writing.current = true;
        restoreOriginals(root as HTMLElement);
        writing.current = false;
        return;
      }

      const textNodes = collectTextNodes(root as HTMLElement);
      const attrTargets = collectAttrTargets(root as HTMLElement);

      // Save originals on first encounter
      textNodes.forEach(node => {
        if (!originalText.has(node)) {
          originalText.set(node, node.nodeValue ?? '');
        }
      });
      attrTargets.forEach(({ element, attr }) => {
        const existing = originalAttrs.get(element) ?? {};
        if (!existing[attr]) {
          existing[attr] = element.getAttribute(attr) ?? '';
          originalAttrs.set(element, existing);
        }
      });

      // Collect the canonical English texts for each node
      const texts = [
        ...textNodes.map(node => (originalText.get(node) ?? node.nodeValue ?? '').trim()),
        ...attrTargets.map(({ element, attr }) => (originalAttrs.get(element)?.[attr] ?? element.getAttribute(attr) ?? '').trim()),
      ];

      if (texts.length === 0) return;

      setTranslating(true);
      let translated: string[];
      try {
        translated = await translateBatch(texts, lang, controller.signal);
      } catch {
        setTranslating(false);
        return;
      }
      setTranslating(false);
      if (currentRun !== runId.current) return;

      // Write translations — pause the observer so it doesn't fire on our own DOM writes
      writing.current = true;
      textNodes.forEach((node, i) => {
        const original = originalText.get(node) ?? node.nodeValue ?? '';
        const t = translated[i];
        if (t) node.nodeValue = preserveSpacing(original, t);
      });
      attrTargets.forEach(({ element, attr }, i) => {
        const original = originalAttrs.get(element)?.[attr] ?? element.getAttribute(attr) ?? '';
        const t = translated[textNodes.length + i];
        if (t) element.setAttribute(attr, preserveSpacing(original, t));
      });
      writing.current = false;
    };

    // Debounce initial run so the page has time to render
    let debounceTimer = window.setTimeout(() => void translatePage(), 300);

    const observer = new MutationObserver(() => {
      // Ignore mutations we caused ourselves
      if (writing.current) return;
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => void translatePage(), 400);
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(debounceTimer);
      observer.disconnect();
      controller.abort();
    };
  }, [lang, location.pathname]);

  if (translating && lang !== 'en') {
    return (
      <div
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
        className="bg-earth-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg"
        role="status"
        aria-live="polite"
      >
        translating…
      </div>
    );
  }

  return null;
}
