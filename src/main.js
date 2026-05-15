import { initUI, closeModal, copyGenome, setTagGroup, fillChapterExample, fillAllFromAnna } from './modules/ui.js';
import { buildAndShow, pb, updateOrient } from './modules/genome.js';
import { saveCurrentPersona, loadPersona, deletePersona, renderPersonaLibrary } from './modules/storage.js';
import { analyzeText } from './modules/analysis.js';
import { login, register, logout, isLoggedIn, getUser } from './modules/api.js';

window.closeModal = closeModal;
window.copyGenome = copyGenome;
window.setTagGroup = setTagGroup;
window.fillChapterExample = fillChapterExample;
window.fillAllFromAnna = fillAllFromAnna;
window.buildAndShow = buildAndShow;
window.pb = pb;
window.updateOrient = updateOrient;
window.saveCurrentPersona = saveCurrentPersona;
window.loadPersona = loadPersona;
window.deletePersona = deletePersona;
window.renderPersonaLibrary = renderPersonaLibrary;
window.analyzeText = analyzeText;
window.scrollToFeatures = () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });

let authMode = 'login';

function showPage(id) {
  document.querySelectorAll('.surface-page').forEach(p => p.style.display = 'none');
  const page = document.getElementById(id);
  if (page) page.style.display = 'block';

  const cabinet = document.getElementById('btn-cabinet');
  const pill = document.getElementById('integrity-pill');
  const loginBtn = document.getElementById('btn-login');

  if (id === 'page-landing' || id === 'page-auth') {
    cabinet.style.display = 'none';
    pill.style.display = 'none';
    loginBtn.style.display = 'flex';
    loginBtn.textContent = isLoggedIn() ? 'КАБИНЕТ' : 'ВОЙТИ';
    loginBtn.onclick = isLoggedIn() ? showDashboard : showLandingAuth;
  }
  if (id === 'page-dashboard' || id === 'page-genome') {
    cabinet.style.display = 'flex';
    loginBtn.style.display = 'none';
    if (id === 'page-genome') {
      pill.style.display = 'flex';
    } else {
      pill.style.display = 'none';
    }
  }
}

window.showLanding = () => showPage('page-landing');
window.showLandingAuth = () => showPage('page-auth');

window.showDashboard = async () => {
  if (!isLoggedIn()) { showPage('page-landing'); return; }
  const u = getUser();
  document.getElementById('dash-email').textContent = u.email;
  document.getElementById('db-status').innerHTML = '<span class="status-dot" style="background:var(--tx3)"></span> База данных: проверка...';

  try {
    const me = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('genom_v4_token') } }).then(r => r.json());
    if (me.user) {
      document.getElementById('db-status').innerHTML = '<span class="status-dot" style="background:var(--acc)"></span> База данных: подключена';
    } else {
      document.getElementById('db-status').innerHTML = '<span class="status-dot" style="background:var(--acc2)"></span> База данных: ошибка';
    }
  } catch {
    document.getElementById('db-status').innerHTML = '<span class="status-dot" style="background:var(--acc2)"></span> База данных: недоступна';
  }

  await renderPersonaLibrary();
  const listHtml = document.getElementById('persona-list')?.innerHTML;
  if (listHtml) document.getElementById('dash-persona-list').innerHTML = listHtml;
  showPage('page-dashboard');
};

window.goToGenome = () => showPage('page-genome');

window.toggleAuthMode = () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.querySelector('.auth-title').textContent = authMode === 'login' ? 'Вход' : 'Регистрация';
  document.getElementById('auth-btn').textContent = authMode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ';
  document.getElementById('auth-toggle-text').textContent = authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?';
  document.getElementById('auth-toggle-btn').textContent = authMode === 'login' ? 'РЕГИСТРАЦИЯ' : 'ВОЙТИ';
  document.getElementById('auth-error').style.display = 'none';
};

window.handleAuth = async () => {
  const email = document.getElementById('auth-email').value.trim() || 'user@genom.app';
  const password = document.getElementById('auth-pass').value || 'genom123';
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';

  try {
    if (authMode === 'login') {
      await login(email, password).catch(async () => {
        await register(email, password, email.split('@')[0]);
      });
    } else {
      await register(email, password, email.split('@')[0]).catch(async () => {
        await login(email, password);
      });
    }
    showDashboard();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
};

window.handleLogout = () => {
  logout();
  showPage('page-landing');
  document.querySelector('.auth-title').textContent = 'Вход';
  authMode = 'login';
  document.getElementById('auth-btn').textContent = 'ВОЙТИ';
  document.getElementById('auth-pass').value = '';
  document.getElementById('auth-email').value = '';
};

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  document.getElementById('page-landing').style.display = 'block';
});
