import { getGenome, collectData, updateIntegrity } from './genome.js';
import { isLoggedIn, getPersonas as apiGetPersonas, savePersona as apiSavePersona, deletePersona as apiDeletePersona } from './api.js';

function getPersonas() {
  try { return JSON.parse(localStorage.getItem('genome_v4_personas') || '[]'); }
  catch (e) { return []; }
}

function setPersonas(list) {
  localStorage.setItem('genome_v4_personas', JSON.stringify(list));
}

function currentGenomeSnapshot() {
  collectData();
  return JSON.parse(JSON.stringify(getGenome()));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

function goToGenome() {
  window.goToGenome();
}

export async function saveCurrentPersona() {
  const snap = currentGenomeSnapshot();
  const fallback = snap.name || 'Новая личность';
  const title = prompt('Название личности для сохранения:', fallback);
  if (!title) return;

  // save locally
  const list = getPersonas();
  const existing = list.findIndex(p => p.name === title);
  const item = {
    id: existing >= 0 ? list[existing].id : Date.now().toString(36),
    name: title,
    updatedAt: new Date().toISOString(),
    data: snap,
  };
  if (existing >= 0) list[existing] = item; else list.unshift(item);
  setPersonas(list);

  // save to cloud if logged in
  if (isLoggedIn()) {
    try {
      await apiSavePersona(item.id, title, snap);
    } catch (e) {
      console.warn('Cloud save failed:', e);
    }
  }

  renderPersonaLibrary();
}

export function clearGenomeForm() {
  document.querySelectorAll('[data-k]').forEach(el => { el.value = ''; });
  document.querySelectorAll('.tag.on').forEach(t => t.classList.remove('on'));
  document.getElementById('orientation').value = 0;
  window.updateOrient(0);
  Object.keys(getGenome()).forEach(k => delete getGenome()[k]);
}

export function loadPersona(id) {
  const item = getPersonas().find(p => p.id === id);
  if (!item) return;
  clearGenomeForm();
  Object.entries(item.data || {}).forEach(([k, v]) => {
    if (k.startsWith('tag_')) {
      window.setTagGroup(k.replace(/^tag_/, ''), v);
    } else if (k === 'orientation_val') {
      document.getElementById('orientation').value = v;
      window.updateOrient(v);
    } else if (k === 'orientation_label') {
      document.getElementById('orient-val').textContent = v;
    } else {
      const el = document.querySelector(`[data-k="${k}"]`);
      if (el) el.value = v;
    }
  });
  collectData();
  updateIntegrity();
  goToGenome();
  window.goTo(0);
}

export async function deletePersona(id) {
  const item = getPersonas().find(p => p.id === id);
  if (!item) return;
  if (!confirm(`Удалить личность "${item.name}"?`)) return;
  setPersonas(getPersonas().filter(p => p.id !== id));
  if (isLoggedIn()) {
    try { await apiDeletePersona(id); } catch {}
  }
  renderPersonaLibrary();
}

export async function renderPersonaLibrary() {
  let list;

  if (isLoggedIn()) {
    try {
      const cloudPersonas = await apiGetPersonas();
      const localPersonas = getPersonas();
      // merge: cloud takes precedence for same-id items
      const merged = [...cloudPersonas];
      localPersonas.forEach(local => {
        if (!merged.find(m => m.id === local.id)) {
          merged.push(local);
        }
      });
      list = merged;
      setPersonas(merged);
    } catch {
      list = getPersonas();
    }
  } else {
    list = getPersonas();
  }
  const el = document.getElementById('dash-persona-list');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="card-body" style="font-size:12px;color:var(--tx3);line-height:1.8">Пока нет сохранённых личностей. Заполни геном и нажми SAVE.</div></div>`;
    return;
  }
  el.innerHTML = list.map(p => {
    const d = p.data || {};
    const sub = [d.name, d.tag_agent_type, d.agent_role].filter(Boolean).join(' · ');
    const date = new Date(p.updatedAt).toLocaleString('ru-RU');
    return `<div class="persona-item">
      <div class="persona-meta">
        <div class="persona-name">${escapeHtml(p.name)}</div>
        <div class="persona-sub">${escapeHtml(sub || 'Без описания')} · ${date}</div>
      </div>
      <div class="persona-actions">
        <button class="mini-btn primary" onclick="loadPersona('${p.id}')">LOAD</button>
        <button class="mini-btn pink" onclick="deletePersona('${p.id}')">DEL</button>
      </div>
    </div>`;
  }).join('');
}
