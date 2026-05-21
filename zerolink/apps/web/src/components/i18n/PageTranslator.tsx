import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { usePrefsStore } from '../../stores/prefsStore';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'SVG', 'CANVAS']);
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;
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
  return text.length > 1 && /[\p{L}\p{N}]/u.test(text);
}

function preserveSpacing(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
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

async function translateBatch(texts: string[], targetLang: string, signal: AbortSignal): Promise<string[]> {
  const translated: string[] = [];
  for (let index = 0; index < texts.length; index += 80) {
    const chunk = texts.slice(index, index + 80);
    const res = await api.post('/translate/batch', { texts: chunk, targetLang, sourceLang: 'en' }, { signal });
    translated.push(...(res.data.data.texts as string[]));
  }
  return translated;
}

export function PageTranslator() {
  const lang = usePrefsStore(state => state.prefs.primaryLanguage);
  const location = useLocation();
  const runId = useRef(0);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const controller = new AbortController();
    const currentRun = ++runId.current;

    const translatePage = async () => {
      const textNodes = collectTextNodes(root);
      const attrTargets = collectAttrTargets(root);

      if (lang === 'en') {
        textNodes.forEach(node => {
          const original = originalText.get(node);
          if (original !== undefined) node.nodeValue = original;
        });
        attrTargets.forEach(({ element, attr }) => {
          const original = originalAttrs.get(element)?.[attr];
          if (original !== undefined) element.setAttribute(attr, original);
        });
        return;
      }

      const texts = [
        ...textNodes.map(node => {
          const value = originalText.get(node) ?? node.nodeValue ?? '';
          originalText.set(node, value);
          return value.trim();
        }),
        ...attrTargets.map(({ element, attr, text }) => {
          const existing = originalAttrs.get(element) ?? {};
          if (!existing[attr]) {
            existing[attr] = text;
            originalAttrs.set(element, existing);
          }
          return text.trim();
        }),
      ];

      if (texts.length === 0) return;

      const translated = await translateBatch(texts, lang, controller.signal);
      if (currentRun !== runId.current) return;

      textNodes.forEach((node, index) => {
        const original = originalText.get(node) ?? node.nodeValue ?? '';
        node.nodeValue = preserveSpacing(original, translated[index] ?? original.trim());
      });

      attrTargets.forEach(({ element, attr }, index) => {
        const translatedIndex = textNodes.length + index;
        const original = originalAttrs.get(element)?.[attr] ?? element.getAttribute(attr) ?? '';
        element.setAttribute(attr, translated[translatedIndex] ?? original);
      });
    };

    const timeout = window.setTimeout(() => void translatePage(), 100);
    const observer = new MutationObserver(() => {
      window.clearTimeout(timeout);
      void translatePage();
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      controller.abort();
    };
  }, [lang, location.pathname, location.search]);

  return null;
}