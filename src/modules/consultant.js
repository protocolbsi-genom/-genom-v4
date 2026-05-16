import { getGenome, collectData } from './genome.js';
import { CHAPTERS, CHAPTER_KEYS } from '../data/chapters.js';
import { getCurrentChapterIndex } from './ui.js';
import { isLoggedIn } from './api.js';

let initialized = false;

export function initConsultant() {
  if (initialized) return;
  initialized = true;

  document.getElementById('cons-btn')?.addEventListener('click', toggleConsultant);
  document.getElementById('cons-close')?.addEventListener('click', toggleConsultant);
  document.getElementById('cons-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendConsultant();
  });
  document.getElementById('cons-send')?.addEventListener('click', sendConsultant);
}

export function toggleConsultant() {
  const panel = document.getElementById('cons-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open');
  if (!isOpen) {
    document.getElementById('cons-input')?.focus();
  }
}

function addMsg(text, role) {
  const el = document.createElement('div');
  el.className = 'cons-msg cons-' + role;
  el.textContent = text;
  const container = document.getElementById('cons-msgs');
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

export async function sendConsultant() {
  const input = document.getElementById('cons-input');
  const msg = input.value.trim();
  if (!msg || !isLoggedIn()) return;
  input.value = '';
  addMsg(msg, 'user');

  collectData();
  const genome = getGenome();
  const chIdx = getCurrentChapterIndex();
  const chData = CHAPTERS[chIdx] || {};
  const chKeys = CHAPTER_KEYS[chIdx] || [];

  const chValues = {};
  chKeys.forEach(k => {
    const v = genome[k] || genome['tag_' + k];
    if (v) chValues[k] = v;
  });

  const chLabel = chData.label || '—';
  const chIcon = chData.icon || '';
  const chName = chIcon + ' ' + chLabel;

  const genomeSummary = {};
  Object.keys(genome).forEach(k => {
    if (k.startsWith('tag_')) return;
    const v = genome[k] || genome['tag_' + k];
    if (v) genomeSummary[k] = v;
  });
  const tagFields = {};
  Object.keys(genome).filter(k => k.startsWith('tag_')).forEach(k => {
    const v = genome[k];
    if (v) tagFields[k.replace('tag_', '')] = v;
  });

  const token = localStorage.getItem('genom_v4_token');

  try {
    const res = await fetch('/api/consultant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        message: msg,
        chapterIndex: chIdx,
        chapterName: chName,
        chapterFields: chKeys,
        chapterValues: chValues,
        genomeSummary,
        tagFields,
        fullGenome: genome,
      }),
    });
    const data = await res.json();
    addMsg(data.reply || 'Нет ответа', 'ai');
  } catch (e) {
    addMsg('Ошибка: ' + e.message, 'system');
  }
}
