import { describe, it, expect } from 'vitest';
import { resolveI18n } from '../services/i18nService.js';

describe('i18nService.resolveI18n', () => {
  it('returns the requested language', () => {
    expect(resolveI18n({ en: 'Hello', sw: 'Habari' }, 'sw')).toBe('Habari');
  });

  it('falls back to English when requested language is missing', () => {
    expect(resolveI18n({ en: 'Hello', sw: 'Habari' }, 'fr')).toBe('Hello');
  });

  it('falls back to first value when neither requested lang nor en exist', () => {
    expect(resolveI18n({ sw: 'Habari', fr: 'Bonjour' }, 'ar')).toBe('Habari');
  });

  it('returns empty string for empty object', () => {
    expect(resolveI18n({}, 'en')).toBe('');
  });

  it('returns English when lang is en', () => {
    expect(resolveI18n({ en: 'Hello' }, 'en')).toBe('Hello');
  });

  it('returns value for only-entry when lang matches', () => {
    expect(resolveI18n({ ar: 'مرحبا' }, 'ar')).toBe('مرحبا');
  });

  it('falls back through en when single-lang obj has only ar and requesting sw', () => {
    expect(resolveI18n({ ar: 'مرحبا' }, 'sw')).toBe('مرحبا'); // only available
  });
});
