import { data } from './state.js';
import { dbFetch, dbInsert, dbUpdate, dbDelete } from './api.js';
import { ICON_PENCIL, ICON_TRASH, ICON_ARROW_UP, ICON_ARROW_DOWN } from './icons.js';

let editingId = null;

export async function loadCategories() {
  data.categories = await dbFetch('categories?select=*&order=position.asc,name.asc');
}

export function categoryName(id) {
  const c = data.categories.find(c => c.id === id);
  return c ? c.name : 'Ohne Kategorie';
}

export function categorySelectOptionsHtml(selectedId) {
  return data.categories.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
}

export function populateCategorySelects() {
  document.querySelectorAll('.category-select').forEach(sel => {
    sel.innerHTML = `<option value="">Kategorie</option>${categorySelectOptionsHtml(null)}`;
  });
}

// Gruppiert Artikel nach Kategorie und sortiert die Gruppen nach der
// benutzerdefinierten Kategorie-Reihenfolge (position) statt alphabetisch,
// damit Katalog und Einkaufsliste dem Rundgang durch den Supermarkt folgen.
// Artikel ohne Kategorie landen als letzte Gruppe.
export function groupItemsByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.category_id ?? 'none';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const entries = Array.from(groups.entries()).map(([key, groupItems]) => {
    const cat = key === 'none' ? null : data.categories.find(c => c.id === key);
    return {
      id: key === 'none' ? null : key,
      name: cat ? cat.name : 'Ohne Kategorie',
      position: cat ? cat.position : Infinity,
      items: groupItems
    };
  });
  entries.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  return entries;
}

export function renderCategoryManager() {
  const el = document.getElementById('categories-content');
  if (!data.categories.length) {
    el.innerHTML = '<p class="empty-hint">Noch keine Kategorien. Leg oben die erste an.</p>';
    return;
  }
  el.innerHTML = `
    <div class="category-group">
      <ul class="item-list">
        ${data.categories.map((cat, i) => renderCategoryRow(cat, i, data.categories.length)).join('')}
      </ul>
    </div>`;
}

function renderCategoryRow(cat, index, total) {
  if (editingId === cat.id) {
    return `
      <li class="item-row item-row--edit">
        <form class="edit-form" onsubmit="return saveCategoryEdit(event, ${cat.id})">
          <input type="text" name="name" value="${escapeAttr(cat.name)}" required>
          <div class="edit-actions">
            <button type="submit" class="btn-primary btn-sm">Speichern</button>
            <button type="button" class="btn-secondary btn-sm" onclick="cancelCategoryEdit()">Abbrechen</button>
          </div>
        </form>
      </li>`;
  }
  return `
    <li class="item-row">
      <span class="item-name">${escapeHtml(cat.name)}</span>
      <span class="item-row-actions">
        <button class="icon-btn icon-btn--sm" onclick="moveCategoryUp(${cat.id})" ${index === 0 ? 'disabled' : ''} aria-label="Nach oben">${ICON_ARROW_UP}</button>
        <button class="icon-btn icon-btn--sm" onclick="moveCategoryDown(${cat.id})" ${index === total - 1 ? 'disabled' : ''} aria-label="Nach unten">${ICON_ARROW_DOWN}</button>
        <button class="icon-btn" onclick="startCategoryEdit(${cat.id})" aria-label="Bearbeiten">${ICON_PENCIL}</button>
        <button class="icon-btn" onclick="removeCategory(${cat.id})" aria-label="Löschen">${ICON_TRASH}</button>
      </span>
    </li>`;
}

export function startCategoryEdit(id) {
  editingId = id;
  renderCategoryManager();
}

export function cancelCategoryEdit() {
  editingId = null;
  renderCategoryManager();
}

export async function saveCategoryEdit(event, id) {
  event.preventDefault();
  const name = event.target.name.value.trim();
  if (!name) return false;
  const updated = await dbUpdate('categories', id, { name });
  const idx = data.categories.findIndex(c => c.id === id);
  if (idx !== -1) data.categories[idx] = updated;
  data.categories.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  editingId = null;
  refreshAfterCategoryChange();
  return false;
}

export async function removeCategory(id) {
  if (!confirm('Diese Kategorie wirklich löschen? Zugehörige Artikel wandern zu "Ohne Kategorie".')) return;
  await dbDelete('categories', id);
  data.categories = data.categories.filter(c => c.id !== id);
  data.catalog.forEach(item => { if (item.category_id === id) item.category_id = null; });
  data.items.forEach(item => { if (item.category_id === id) item.category_id = null; });
  refreshAfterCategoryChange();
}

export async function submitCategoryForm(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  if (!name) return false;
  const maxPosition = data.categories.reduce((max, c) => Math.max(max, c.position), 0);
  const row = await dbInsert('categories', { name, position: maxPosition + 1, created_by: data.userId });
  data.categories.push(row);
  form.reset();
  refreshAfterCategoryChange();
  return false;
}

async function moveCategory(id, direction) {
  const idx = data.categories.findIndex(c => c.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= data.categories.length) return;

  const a = data.categories[idx];
  const b = data.categories[swapIdx];
  const [posA, posB] = [a.position, b.position];

  await Promise.all([
    dbUpdate('categories', a.id, { position: posB }),
    dbUpdate('categories', b.id, { position: posA })
  ]);
  a.position = posB;
  b.position = posA;
  data.categories.sort((x, y) => x.position - y.position || x.name.localeCompare(y.name));
  refreshAfterCategoryChange();
}

export function moveCategoryUp(id) {
  return moveCategory(id, 'up');
}

export function moveCategoryDown(id) {
  return moveCategory(id, 'down');
}

function refreshAfterCategoryChange() {
  renderCategoryManager();
  populateCategorySelects();
  window.renderCatalog?.();
  window.renderActiveList?.();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }
