import { initUI, goTo, navSection, closeModal, copyGenome, setTagGroup,
  fillChapterExample, fillAllFromAnna } from './modules/ui.js';
import { buildAndShow, pb, updateOrient } from './modules/genome.js';
import { saveCurrentPersona, loadPersona, deletePersona, renderPersonaLibrary, viewPersona, downloadPersonaText, closePersonaDetail } from './modules/storage.js';
import { analyzeText } from './modules/analysis.js';
import { copyPromptPreview, sendChatMessage, initPreviewChat, resetChat } from './modules/chat.js?v=1';
import { login, register, logout, isLoggedIn, getUser } from './modules/api.js';

window.goTo = goTo;
window.navSection = navSection;
window.closeModal = closeModal;
window.copyGenome = copyGenome;
window.setTagGroup = setTagGroup;
window.fillChapterExample = fillChapterExample;
window.fillAllFromAnna = fillAllFromAnna;
window.buildAndShow = buildAndShow;
window.pb = pb;
window.updateOrient = updateOrient;
window.saveCurrentPersona = saveCurrentPersona;
window.goToGenome = () => showPage('app');
window.loadPersona = loadPersona;
window.deletePersona = deletePersona;
window.renderPersonaLibrary = renderPersonaLibrary;
window.viewPersona = viewPersona;
window.downloadPersonaText = downloadPersonaText;
window.closePersonaDetail = closePersonaDetail;
window.analyzeText = analyzeText;
window.copyPromptPreview = copyPromptPreview;
window.sendChatMessage = sendChatMessage;
window.resetChat = resetChat;
window.scrollToFeatures = () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });

let authMode = 'login';

function showPage(id) {
  document.querySelectorAll('.surface-page').forEach(p => p.style.display = 'none');
  document.getElementById('app-container').style.display = 'none';

  if (id === 'app') {
    document.getElementById('app-container').style.display = 'flex';
    return;
  }
  const page = document.getElementById(id);
  if (page) page.style.display = 'block';
}

window.showLanding = () => showPage('page-landing');
window.showLandingAuth = () => showPage('page-auth');

window.showDashboard = async () => {
  if (!isLoggedIn()) { showPage('page-landing'); return; }
  const u = getUser();
  document.getElementById('sidebar-user').textContent = u.email;

  const dbEl = document.getElementById('sidebar-db-status');
  dbEl.innerHTML = '<span class="status-dot" style="background:var(--tx3)"></span> База данных: проверка...';
  try {
    const r = await fetch('/api/me', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('genom_v4_token') }
    });
    const data = await r.json();
    dbEl.innerHTML = data.user
      ? '<span class="status-dot" style="background:var(--acc)"></span> База данных: подключена'
      : '<span class="status-dot" style="background:var(--acc2)"></span> База данных: ошибка';
  } catch {
    dbEl.innerHTML = '<span class="status-dot" style="background:var(--acc2)"></span> База данных: недоступна';
  }

  await renderPersonaLibrary();
  showPage('app');
};

window.toggleAuthMode = () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.querySelector('.auth-title').textContent = authMode === 'login' ? 'Вход' : 'Регистрация';
  document.getElementById('auth-btn').textContent = authMode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ';
  document.getElementById('auth-toggle-text').textContent = authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?';
  document.getElementById('auth-toggle-btn').textContent = authMode === 'login' ? 'РЕГИСТРАЦИЯ' : 'ВОЙТИ';
  document.getElementById('auth-error').style.display = 'none';
};

window.handleAuth = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-pass').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Заполните email и пароль';
    errEl.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errEl.textContent = 'Пароль должен быть от 6 символов';
    errEl.style.display = 'block';
    return;
  }

  try {
    if (authMode === 'login') {
      await login(email, password);
    } else {
      await register(email, password, email.split('@')[0]);
    }
    showDashboard();
  } catch (e) {
    errEl.textContent = e.message || 'Ошибка соединения';
    errEl.style.display = 'block';
  }
};

window.handleLogout = () => {
  logout();
  document.getElementById('auth-pass').value = '';
  document.getElementById('auth-email').value = '';
  authMode = 'login';
  document.querySelector('.auth-title').textContent = 'Вход';
  document.getElementById('auth-btn').textContent = 'ВОЙТИ';
  document.getElementById('app-container').style.display = 'none';
  showPage('page-landing');
};

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  showPage('page-landing');
});
