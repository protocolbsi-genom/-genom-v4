// Chat module for preview tab 25

export function copyPromptPreview() {
  const el = document.getElementById('prompt-preview');
  if (!el) return;
  navigator.clipboard.writeText(el.value).then(() => {
    const btn = document.querySelector('[onclick="copyPromptPreview()"]');
    if (btn) { btn.textContent = '✓'; setTimeout(() => btn.textContent = 'СКОПИРОВАТЬ', 2000); }
  });
}

export async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const msgEl = document.getElementById('chat-messages');
  if (!input || !msgEl) return;
  const text = input.value.trim();
  if (!text) return;

  const token = localStorage.getItem('genom_v4_token');
  if (!token) { addChatMessage(msgEl, 'Система: войди в аккаунт для чата', 'system'); return; }

  addChatMessage(msgEl, text, 'user');
  input.value = '';
  input.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ personaId: 'preview', message: text }),
    });
    const data = await res.json();
    addChatMessage(msgEl, data.reply || 'Нет ответа', 'ai');
  } catch (e) {
    addChatMessage(msgEl, 'Ошибка: ' + e.message, 'system');
  }
  input.disabled = false;
  input.focus();
}

function addChatMessage(container, text, type) {
  const div = document.createElement('div');
  div.className = 'chat-msg chat-' + type;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

export function addChatSystemMessage(msg) {
  const container = document.getElementById('chat-messages');
  if (container) addChatMessage(container, msg, 'system');
}
