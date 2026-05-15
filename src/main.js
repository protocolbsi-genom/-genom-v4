import { initUI, goTo, navSection, showHomePage, showLibraryPage,
  hidePages, closeModal, copyGenome, setTagGroup, fillInputs,
  fillTagsIn, fillChapterExample, fillAllFromAnna } from './modules/ui.js';
import { collectData, updateIntegrity, buildAndShow, pb, updateOrient } from './modules/genome.js';
import { saveCurrentPersona, clearGenomeForm, loadPersona,
  deletePersona, renderPersonaLibrary } from './modules/storage.js';
import { analyzeText } from './modules/analysis.js';
import { login, register, logout, isLoggedIn, getUser } from './modules/api.js';

// Expose all functions to window for HTML onclick handlers
window.goTo = goTo;
window.navSection = navSection;
window.showHomePage = showHomePage;
window.showLibraryPage = showLibraryPage;
window.hidePages = hidePages;
window.closeModal = closeModal;
window.copyGenome = copyGenome;
window.setTagGroup = setTagGroup;
window.fillChapterExample = fillChapterExample;
window.fillAllFromAnna = fillAllFromAnna;
window.buildAndShow = buildAndShow;
window.pb = pb;
window.updateOrient = updateOrient;
window.saveCurrentPersona = saveCurrentPersona;
window.clearGenomeForm = clearGenomeForm;
window.loadPersona = loadPersona;
window.deletePersona = deletePersona;
window.renderPersonaLibrary = renderPersonaLibrary;
window.analyzeText = analyzeText;
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.apiLogin = apiLogin;
window.apiRegister = apiRegister;

function showLoginModal() {
  document.getElementById('login-modal').classList.add('open');
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('login-error').style.display = 'none';
}

async function apiLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  try {
    await login(email, password);
    closeLoginModal();
    updateAuthUI();
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

async function apiRegister() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  try {
    await register(email, password);
    closeLoginModal();
    updateAuthUI();
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

function updateAuthUI() {
  const btn = document.getElementById('btn-login');
  if (isLoggedIn()) {
    const u = getUser();
    btn.textContent = u?.email || 'ВОЙТИ';
    btn.onclick = () => { logout(); updateAuthUI(); };
  } else {
    btn.textContent = 'ВОЙТИ';
    btn.onclick = showLoginModal;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  initUI();
});
