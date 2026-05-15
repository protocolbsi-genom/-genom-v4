import { CHAPTERS, SINGLE_TAG_GROUPS, CHAPTER_KEYS } from '../data/chapters.js';
import { DEFAULTS, DEFAULT_TAGS } from '../data/defaults.js';
import { collectData, updateIntegrity, buildAndShow, pb, updateOrient } from './genome.js';
import { saveCurrentPersona, loadPersona, deletePersona, renderPersonaLibrary } from './storage.js';

let cur = 0;

export function initUI() {
  buildTabs();
  injectChapterTools();
  setupTagListeners();
  setupInputListeners();
  setupModalClose();
  updateNav();
  updateIntegrity();
}

function buildTabs() {
  const tabsEl = document.getElementById('chapters');
  CHAPTERS.forEach((c, i) => {
    const t = document.createElement('div');
    t.className = 'ch-tab' + (i === 0 ? ' active' : '');
    t.dataset.id = i;
    t.innerHTML = `<div class="ch-dot"></div>${c.icon} ${c.label}`;
    t.onclick = () => goTo(i);
    tabsEl.appendChild(t);
  });
}

function setupTagListeners() {
  document.querySelectorAll('.tag').forEach(t => {
    t.addEventListener('click', () => {
      const g = t.dataset.g;
      if (g && SINGLE_TAG_GROUPS.includes(g)) {
        document.querySelectorAll(`.tag[data-g="${g}"]`).forEach(x => x.classList.remove('on'));
      }
      t.classList.toggle('on');
      collectData();
      updateIntegrity();
    });
  });
}

function setupInputListeners() {
  document.addEventListener('input', e => {
    if (e.target.dataset.k !== undefined || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
      collectData();
      updateIntegrity();
    }
  });
}

function setupModalClose() {
  document.getElementById('modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
}

export function goTo(idx) {
  const chs = document.querySelectorAll('.chapter');
  const tabs = document.querySelectorAll('.ch-tab');
  chs[cur].classList.remove('active');
  tabs[cur].classList.remove('active');
  cur = Math.max(0, Math.min(idx, CHAPTERS.length - 1));
  chs[cur].classList.add('active');
  tabs[cur].classList.add('active');
  tabs[cur].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  const main = document.querySelector('.main');
  if (main) main.scrollTo(0, 0);
  window.scrollTo(0, 0);
  updateNav();
}

export function navSection(dir) { goTo(cur + dir); }

function updateNav() {
  const total = CHAPTERS.length;
  document.getElementById('nav-pct').textContent = `${cur + 1} / ${total}`;
  document.getElementById('nav-fill').style.width = ((cur + 1) / total * 100) + '%';
  document.getElementById('btn-prev').style.opacity = cur === 0 ? '0.3' : '1';
  document.getElementById('btn-next').textContent = cur === total - 1 ? '⬛ ДНК' : 'Далее →';
  document.getElementById('btn-next').onclick = cur === total - 1 ? buildAndShow : () => navSection(1);
}

function injectChapterTools() {
  document.querySelectorAll('.chapter').forEach(ch => {
    const id = parseInt(ch.dataset.id, 10);
    if (id === 24) return;
    const header = ch.querySelector('.chapter-header');
    if (!header || header.querySelector('.chapter-tools')) return;
    const tools = document.createElement('div');
    tools.className = 'chapter-tools';
    const btn = document.createElement('button');
    btn.className = 'chapter-fill-btn';
    btn.type = 'button';
    btn.textContent = 'АННА';
    btn.onclick = () => fillChapterExample(id);
    tools.appendChild(btn);
    header.appendChild(tools);
  });
}

export function showHomePage() {
  document.getElementById('library-page').classList.remove('open');
  document.getElementById('home-page').classList.add('open');
}

export function showLibraryPage() {
  renderPersonaLibrary();
  document.getElementById('home-page').classList.remove('open');
  document.getElementById('library-page').classList.add('open');
}

export function hidePages() {
  document.getElementById('home-page').classList.remove('open');
  document.getElementById('library-page').classList.remove('open');
}

export function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

export function copyGenome() {
  const txt = document.getElementById('output-text').textContent;
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.querySelector('.modal-copy');
    btn.textContent = '✓ СКОПИРОВАНО';
    setTimeout(() => btn.textContent = 'СКОПИРОВАТЬ ДНК', 2000);
  });
}

export function setTagGroup(group, values, root = document) {
  if (!values) return;
  const wanted = Array.isArray(values) ? values : String(values).split(',').map(v => v.trim()).filter(Boolean);
  const tags = [...root.querySelectorAll(`.tag[data-g="${group}"]`)];
  tags.forEach(t => t.classList.toggle('on', wanted.includes(t.textContent.trim())));
}

export function fillInputs(keys) {
  keys.forEach(k => {
    const el = document.querySelector(`[data-k="${k}"]`);
    if (el && DEFAULTS[k] !== undefined) el.value = DEFAULTS[k];
  });
}

export function fillTagsIn(root) {
  const groups = [...new Set([...root.querySelectorAll('.tag[data-g]')].map(t => t.dataset.g))];
  groups.forEach(g => {
    root.querySelectorAll(`.tag[data-g="${g}"]`).forEach(t => t.classList.remove('on'));
    setTagGroup(g, DEFAULT_TAGS[g], root);
  });
}

export function fillChapterExample(id) {
  const ch = document.querySelector(`.chapter[data-id="${id}"]`);
  if (!ch) return;
  fillInputs(CHAPTER_KEYS[id] || []);
  fillTagsIn(ch);
  collectData();
  updateIntegrity();
}

export function fillAllFromAnna() {
  document.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k;
    if (DEFAULTS[k] !== undefined) el.value = DEFAULTS[k];
  });
  document.querySelectorAll('.tag[data-g]').forEach(t => t.classList.remove('on'));
  Object.entries(DEFAULT_TAGS).forEach(([group, values]) => setTagGroup(group, values));
  document.getElementById('orientation').value = 10;
  updateOrient(10);
  collectData();
  updateIntegrity();
  hidePages();
}
