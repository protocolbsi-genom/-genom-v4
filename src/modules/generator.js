import { CHAPTERS, CHAPTER_KEYS } from '../data/chapters.js';
import { LABELS, TAG_SPECS } from '../data/fieldLabels.js';
import { getCurrentChapterIndex } from './ui.js';
import { getGenome, collectData } from './genome.js';
import { isLoggedIn } from './api.js';

let initialized = false;

const GEN_URL = '/api/generate';

export function initGenerator() {
  if (initialized) return;
  initialized = true;

  document.getElementById('gen-btn')?.addEventListener('click', toggleGenerator);
  document.getElementById('gen-close')?.addEventListener('click', toggleGenerator);
  document.getElementById('gen-submit')?.addEventListener('click', generateChapter);
  document.getElementById('gen-insert')?.addEventListener('click', insertGenerated);

  document.getElementById('gen-desc')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateChapter();
  });
}

export function toggleGenerator() {
  const panel = document.getElementById('gen-panel');
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    document.getElementById('gen-desc')?.focus();
  }
}

export async function generateChapter() {
  const desc = document.getElementById('gen-desc');
  const msg = desc.value.trim();
  if (!msg || !isLoggedIn()) return;

  const submitBtn = document.getElementById('gen-submit');
  const resultEl = document.getElementById('gen-result');
  const insertBtn = document.getElementById('gen-insert');
  submitBtn.disabled = true;
  submitBtn.textContent = '...';
  resultEl.innerHTML = '';
  insertBtn.style.display = 'none';

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

  const token = localStorage.getItem('genom_v4_token');
  const prevDesc = localStorage.getItem('genom_last_desc') || '';

  try {
    const res = await fetch(GEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        description: msg,
        chapterIndex: chIdx,
        chapterName: chIcon + ' ' + chLabel,
        chapterFields: chKeys.map(k => ({
          key: k,
          label: (LABELS[k] && LABELS[k].t) || k,
          format: (LABELS[k] && LABELS[k].f) || 'текст',
        })),
        tagSpecs: TAG_SPECS,
        chapterValues: chValues,
        fullGenome: genome,
        previousDescription: prevDesc,
      }),
    });
    const data = await res.json();
    if (data.fields && Object.keys(data.fields).length) {
      localStorage.setItem('genom_last_desc', msg);
      window._genFields = data.fields;
      renderResult(data.fields);
      insertBtn.style.display = 'block';
    } else {
      resultEl.innerHTML = '<div class="gen-err">Не удалось сгенерировать. Попробуй описать иначе.</div>';
    }
  } catch (e) {
    resultEl.innerHTML = '<div class="gen-err">Ошибка: ' + e.message + '</div>';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'СГЕНЕРИРОВАТЬ';
  }
}

function renderResult(fields) {
  const el = document.getElementById('gen-result');
  el.innerHTML = '';
  Object.entries(fields).forEach(([k, v]) => {
    if (!v) return;
    const row = document.createElement('div');
    row.className = 'gen-field';
    row.innerHTML = '<span class="gen-field-key">' + k + '</span><span class="gen-field-val">' + escapeHtml(v) + '</span>';
    el.appendChild(row);
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function insertGenerated() {
  const fields = window._genFields;
  if (!fields) return;

  const chIdx = getCurrentChapterIndex();
  const chKeys = CHAPTER_KEYS[chIdx] || [];

  document.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k;
    if (chKeys.includes(k) && fields[k]) {
      el.value = fields[k];
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  collectData();
  document.getElementById('gen-result').innerHTML = '<div class="gen-ok">✓ Вставлено</div>';
  setTimeout(() => toggleGenerator(), 1500);
}
