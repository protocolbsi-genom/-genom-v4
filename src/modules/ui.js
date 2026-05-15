import { CHAPTERS, SINGLE_TAG_GROUPS, CHAPTER_KEYS } from '../data/chapters.js';
import { DEFAULTS, DEFAULT_TAGS } from '../data/defaults.js';
import { collectData, updateIntegrity, buildAndShow, pb, updateOrient, getGenome, generatePromptText } from './genome.js';
import { initPreviewChat } from './chat.js';


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
  const statsEl = document.getElementById('genome-stats');
  CHAPTERS.forEach((c, i) => {
    const t = document.createElement('div');
    t.className = 'ch-tab' + (i === 0 ? ' active' : '');
    t.dataset.id = i;
    t.innerHTML = `<div class="ch-dot"></div>${c.icon} ${c.label}`;
    t.onclick = () => goTo(i);
    if (i === 24) {
      t.className += ' ch25-inline';
      if (statsEl) statsEl.appendChild(t);
    } else {
      tabsEl.appendChild(t);
    }
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
      updatePreviewTab();
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
  window.showLanding();
}

export function showLibraryPage() {
  window.showDashboard();
}

export function hidePages() {
  // no-op, old page system
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

export function updateGenomeStats() {
  const fields = document.querySelectorAll('[data-k]');
  const filled = [...fields].filter(el => el.value?.trim()).length;
  const tags = document.querySelectorAll('.tag.on');
  const totalTags = document.querySelectorAll('.tag[data-g]').length;

  const fieldPct = fields.length ? Math.round(filled / fields.length * 100) : 0;
  const tagPct = totalTags ? Math.round(tags.length / totalTags * 100) : 0;
  const overall = Math.round((fieldPct * 0.6 + tagPct * 0.4));

  document.getElementById('gs-fields').textContent = `${filled} / ${fields.length}`;
  document.getElementById('gs-tags').textContent = `${tags.length} / ${totalTags}`;
  document.getElementById('gs-pct').textContent = overall + '%';

  const bar = document.getElementById('gs-bar');
  bar.style.width = overall + '%';
  bar.className = 'genome-stat-fill' + (overall < 25 ? ' pink' : overall < 50 ? '' : overall < 75 ? ' blue' : ' green');

  const preview = document.getElementById('prompt-preview');
  if (preview) {
    const words = preview.value.split(/\s+/).filter(Boolean).length;
    document.getElementById('gs-words').textContent = words.toLocaleString('ru-RU');
  }

  let score = '—';
  if (overall > 80) score = '9/10';
  else if (overall > 60) score = '7/10';
  else if (overall > 40) score = '5/10';
  else if (overall > 20) score = '3/10';
  else if (overall > 0) score = '1/10';
  document.getElementById('gs-score').textContent = score;
}

export function updatePreviewTab() {
  const g = getGenome();
  const title = document.getElementById('ch25-title');
  const avatar = document.getElementById('chat-avatar');
  const preview = document.getElementById('prompt-preview');

  if (title) {
    const name = g.name || g.nickname || 'Превью';
    title.textContent = name;
    const tab = document.querySelector('.ch-tab[data-id="24"]');
    if (tab) tab.innerHTML = `<div class="ch-dot"></div>↑ ${name}`;
  }
  if (avatar) {
    const gender = g.gender || '';
    avatar.textContent = gender.toLowerCase().includes('жен') || gender.toLowerCase().includes('female') ? '♀' : '♂';
  }
  if (preview) {
    const text = generatePromptText(g);
    preview.value = text;
  }
  updateGenomeStats();
  initPreviewChat();
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
  updatePreviewTab();
  if (window.resetChat) window.resetChat();
  window.goToGenome();
}
