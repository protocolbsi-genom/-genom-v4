// Chat module for preview tab 25
import { collectData, getGenome } from './genome.js';

let chatHistory = [];
let chatInitialized = false;

export function copyPromptPreview() {
  const el = document.getElementById('prompt-preview');
  if (!el) return;
  navigator.clipboard.writeText(el.value).then(() => {
    const btn = document.querySelector('[onclick="copyPromptPreview()"]');
    if (btn) { btn.textContent = '✓'; setTimeout(() => btn.textContent = 'СКОПИРОВАТЬ', 2000); }
  });

  collectData();
  const snap = JSON.parse(JSON.stringify(getGenome()));
  const name = snap.name || snap.nickname;
  if (!name) return;

  const list = JSON.parse(localStorage.getItem('genome_v4_personas') || '[]');
  const item = { id: Date.now().toString(36), name, updatedAt: new Date().toISOString(), data: snap };
  list.unshift(item);
  localStorage.setItem('genome_v4_personas', JSON.stringify(list));

  const token = localStorage.getItem('genom_v4_token');
  if (token) {
    fetch('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ id: item.id, name: item.name, data: snap }),
    }).catch(() => {});
  }

  if (window.renderPersonaLibrary) window.renderPersonaLibrary();
}

export function initPreviewChat(force = false) {
  if (chatInitialized && !force) return;
  chatInitialized = true;
  chatHistory = [];
  const container = document.getElementById('chat-messages');
  if (!container) return;
  if (force || !container.children.length) container.innerHTML = '';

  const token = localStorage.getItem('genom_v4_token');
  if (!token) {
    addMessage('Войди в аккаунт, чтобы общаться с AI', 'system');
    return;
  }

  if (force || !container.children.length) {
    addMessage('Привет! Я твой AI-помощник. Задай любой вопрос о личности или попроси меня представиться от её лица.', 'system');
  }
}

export function resetChat() {
  chatInitialized = false;
  initPreviewChat(true);
}

export async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const container = document.getElementById('chat-messages');
  if (!input || !container) return;
  const text = input.value.trim();
  if (!text) return;

  const token = localStorage.getItem('genom_v4_token');
  if (!token) { addMessage('Войди в аккаунт для чата', 'system'); return; }

  // Get current genome from the preview textarea
  const preview = document.getElementById('prompt-preview');
  if (!preview || !preview.value) { addMessage('Сначала заполни хотя бы имя в Ядре личности', 'system'); return; }

  addMessage(text, 'user');
  input.value = '';
  input.disabled = true;

  // Collect genome data from the form
  collectData();
  const genome = getGenome();

  try {
    const res = await fetch('/api/chat/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ genome, message: text }),
    });
    const data = await res.json();
    addMessage(data.reply || 'Нет ответа', 'ai');
  } catch (e) {
    addMessage('Ошибка: ' + e.message, 'system');
  }
  input.disabled = false;
  input.focus();
}

function addMessage(text, type) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-' + type;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
