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
  if (page) { page.style.display = 'block'; }
  document.getElementById('btn-cabinet').style.display = 'none';
  document.getElementById('integrity-pill').style.display = 'none';
  if (id === 'page-genome') {
    document.getElementById('btn-cabinet').style.display = 'flex';
    document.getElementById('integrity-pill').style.display = 'flex';
  }
}

window.showLanding = () => showPage('page-landing');
window.showLandingAuth = () => showPage('page-auth');

window.showDashboard = async () => {
  if (!isLoggedIn()) { showPage('page-landing'); return; }
  const u = getUser();
  document.getElementById('dash-email').textContent = u.email;
  document.getElementById('btn-login').style.display = 'none';
  document.getElementById('integrity-pill').style.display = 'none';
  await renderPersonaLibrary();
  document.getElementById('dash-persona-list').innerHTML = document.getElementById('persona-list')?.innerHTML || '';
  showPage('page-dashboard');
};

window.goToGenome = () => {
  showPage('page-genome');
  document.getElementById('btn-cabinet').style.display = 'flex';
  document.getElementById('integrity-pill').style.display = 'flex';
};

window.toggleAuthMode = () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.querySelector('.auth-title').textContent = authMode === 'login' ? 'Вход' : 'Регистрация';
  document.getElementById('auth-btn').textContent = authMode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ';
  document.getElementById('auth-toggle-text').textContent = authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?';
  document.getElementById('auth-toggle-btn').textContent = authMode === 'login' ? 'РЕГИСТРАЦИЯ' : 'ВОЙТИ';
  document.getElementById('auth-error').style.display = 'none';
};

window.handleAuth = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-pass').value;
  const errEl = document.getElementById('auth-error');
  const sucEl = document.getElementById('auth-success');
  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!email || !password) { errEl.textContent = 'Заполни все поля'; errEl.style.display = 'block'; return; }
  if (authMode === 'register' && password.length < 6) { errEl.textContent = 'Пароль минимум 6 символов'; errEl.style.display = 'block'; return; }

  try {
    if (authMode === 'login') {
      await login(email, password);
      await showDashboard();
    } else {
      await register(email, password);
      sucEl.textContent = 'Аккаунт создан! Вход выполнен.';
      sucEl.style.display = 'block';
      setTimeout(() => showDashboard(), 1000);
    }
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
};

window.handleLogout = () => {
  logout();
  document.getElementById('btn-cabinet').style.display = 'none';
  document.getElementById('integrity-pill').style.display = 'none';
  showPage('page-landing');
};

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  document.getElementById('page-landing').style.display = 'block';
});
