// Genom v4 — Internationalization

import { LANGUAGES, DEFAULT_LANG } from '../data/translations.js';

let currentLang = DEFAULT_LANG;

export function getLang() { return currentLang; }

export function getLangLabel() {
  return LANGUAGES[currentLang]?.['lang.name'] || 'Русский';
}

export function setLanguage(lang) {
  if (!LANGUAGES[lang]) return;
  currentLang = lang;
  localStorage.setItem('genom_v4_lang', lang);
  applyTranslations();
}

export function initLanguage() {
  const saved = localStorage.getItem('genom_v4_lang');
  if (saved && LANGUAGES[saved]) currentLang = saved;
  applyTranslations();
}

export function t(key, fallback) {
  return LANGUAGES[currentLang]?.[key] || LANGUAGES[DEFAULT_LANG]?.[key] || fallback || key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const text = t(key, el.dataset.i18nFallback);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = text;
    } else {
      el.innerHTML = text;
    }
  });
}
