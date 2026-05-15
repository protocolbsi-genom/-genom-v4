import './styles/style.css';
import { initUI, goTo, navSection, showHomePage, showLibraryPage,
  hidePages, closeModal, copyGenome, setTagGroup, fillInputs,
  fillTagsIn, fillChapterExample, fillAllFromAnna } from './modules/ui.js';
import { collectData, updateIntegrity, buildAndShow, pb, updateOrient } from './modules/genome.js';
import { saveCurrentPersona, clearGenomeForm, loadPersona,
  deletePersona, renderPersonaLibrary } from './modules/storage.js';
import { analyzeText } from './modules/analysis.js';

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

// Init after DOM ready
document.addEventListener('DOMContentLoaded', initUI);
