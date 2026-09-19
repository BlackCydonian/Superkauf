import { data } from './state.js';
import * as api from './api.js';
import { loadCategories, populateCategorySelects, renderCategoryManager, startCategoryEdit, cancelCategoryEdit, saveCategoryEdit, removeCategory, submitCategoryForm } from './categories.js';
import { loadCatalog, renderCatalog, startCatalogEdit, cancelCatalogEdit, saveCatalogEdit, removeCatalogItem, submitCatalogForm } from './catalog.js';
import { loadActiveListAndItems, renderActiveList, toggleItemChecked, removeListItem, clearCheckedItems, handleQuickAdd, openPicker, closePicker, confirmPicker, completeShopping } from './list.js';

console.log('✅ app.js loaded successfully');

export function showLogin() {
  document.getElementById('login-screen').classList.add('show');
  document.getElementById('app').style.display = 'none';
}

export function hideLogin() {
  document.getElementById('login-screen').classList.remove('show');
  document.getElementById('app').style.display = '';
}

export function showTab(name) {
  data.activeTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelector('.quick-add-bar').style.display = name === 'einkauf' ? '' : 'none';
}

export async function init() {
  try {
    const supabase = api.get_supabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      showLogin();
      return;
    }

    data.accessToken = session.access_token;
    data.userId = session.user.id;
    hideLogin();

    await loadCategories();
    populateCategorySelects();
    await Promise.all([loadCatalog(), loadActiveListAndItems()]);
    renderCategoryManager();
    renderCatalog();
    renderActiveList();
    showTab('einkauf');
  } catch (e) {
    console.error('❌ init() error:', e.message, e);
    document.getElementById('active-list-content').innerHTML =
      `<p class="empty-hint" style="color:var(--red)">Fehler beim Laden: ${e.message}</p>`;
  }
}

window.signInWithGoogle = api.signInWithGoogle;
window.signOut = api.signOut;
window.showTab = showTab;
window.startCategoryEdit = startCategoryEdit;
window.cancelCategoryEdit = cancelCategoryEdit;
window.saveCategoryEdit = saveCategoryEdit;
window.removeCategory = removeCategory;
window.submitCategoryForm = submitCategoryForm;
window.startCatalogEdit = startCatalogEdit;
window.cancelCatalogEdit = cancelCatalogEdit;
window.saveCatalogEdit = saveCatalogEdit;
window.removeCatalogItem = removeCatalogItem;
window.submitCatalogForm = submitCatalogForm;
window.toggleItemChecked = toggleItemChecked;
window.removeListItem = removeListItem;
window.clearCheckedItems = clearCheckedItems;
window.handleQuickAdd = handleQuickAdd;
window.openPicker = openPicker;
window.closePicker = closePicker;
window.confirmPicker = confirmPicker;
window.completeShopping = completeShopping;
window.renderCatalog = renderCatalog;
window.renderActiveList = renderActiveList;

init();
