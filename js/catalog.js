import { data } from './state.js';
import { dbFetch, dbInsert, dbUpdate, dbDelete } from './api.js';
import { categorySelectOptionsHtml, groupItemsByCategory } from './categories.js';
import { ICON_PENCIL, ICON_TRASH } from './icons.js';

let editingId = null;

export async function loadCatalog() {
  data.catalog = await dbFetch('catalog_items?select=*&order=name.asc');
}

export function renderCatalog() {
  const el = document.getElementById('catalog-content');
  if (!data.catalog.length) {
    el.innerHTML = '<p class="empty-hint">Noch keine Stammartikel. Leg oben den ersten an.</p>';
    return;
  }

  el.innerHTML = groupItemsByCategory(data.catalog).map(group => `
    <div class="category-group">
      <h3 class="category-title">${group.name}</h3>
      <ul class="item-list">
        ${group.items.map(item => renderCatalogRow(item)).join('')}
      </ul>
    </div>
  `).join('');
}

function renderCatalogRow(item) {
  if (editingId === item.id) {
    return `
      <li class="item-row item-row--edit">
        <form class="edit-form" onsubmit="return saveCatalogEdit(event, ${item.id})">
          <input type="text" name="name" value="${escapeAttr(item.name)}" required>
          <select name="category_id"><option value="">Ohne Kategorie</option>${categorySelectOptionsHtml(item.category_id)}</select>
          <input type="text" name="default_quantity" value="${escapeAttr(item.default_quantity || '')}" placeholder="Menge (optional)">
          <div class="edit-actions">
            <button type="submit" class="btn-primary btn-sm">Speichern</button>
            <button type="button" class="btn-secondary btn-sm" onclick="cancelCatalogEdit()">Abbrechen</button>
          </div>
        </form>
      </li>`;
  }
  return `
    <li class="item-row">
      <span class="item-name">${escapeHtml(item.name)}${item.default_quantity ? ` <span class="item-qty">(${escapeHtml(item.default_quantity)})</span>` : ''}</span>
      <span class="item-row-actions">
        <button class="icon-btn" onclick="startCatalogEdit(${item.id})" aria-label="Bearbeiten">${ICON_PENCIL}</button>
        <button class="icon-btn" onclick="removeCatalogItem(${item.id})" aria-label="Löschen">${ICON_TRASH}</button>
      </span>
    </li>`;
}

export function startCatalogEdit(id) {
  editingId = id;
  renderCatalog();
}

export function cancelCatalogEdit() {
  editingId = null;
  renderCatalog();
}

export async function saveCatalogEdit(event, id) {
  event.preventDefault();
  const form = event.target;
  const patch = {
    name: form.name.value.trim(),
    category_id: form.category_id.value ? Number(form.category_id.value) : null,
    default_quantity: form.default_quantity.value.trim() || null
  };
  const updated = await dbUpdate('catalog_items', id, patch);
  const idx = data.catalog.findIndex(c => c.id === id);
  if (idx !== -1) data.catalog[idx] = updated;
  editingId = null;
  renderCatalog();
  return false;
}

export async function removeCatalogItem(id) {
  if (!confirm('Diesen Stammartikel wirklich löschen?')) return;
  await dbDelete('catalog_items', id);
  data.catalog = data.catalog.filter(c => c.id !== id);
  renderCatalog();
}

export async function submitCatalogForm(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  if (!name) return false;
  const row = await dbInsert('catalog_items', {
    name,
    category_id: form.category_id.value ? Number(form.category_id.value) : null,
    default_quantity: form.default_quantity.value.trim() || null,
    created_by: data.userId
  });
  data.catalog.push(row);
  data.catalog.sort((a, b) => a.name.localeCompare(b.name));
  form.reset();
  renderCatalog();
  return false;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}
