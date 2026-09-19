import { data } from './state.js';
import { dbFetch, dbInsert, dbUpdate, dbDelete } from './api.js';
import { renderCatalog } from './catalog.js';
import { groupItemsByCategory } from './categories.js';
import { ICON_TRASH } from './icons.js';

export async function loadActiveListAndItems() {
  const active = await dbFetch('lists?select=*&is_active=eq.true&limit=1');
  if (active && active.length) {
    data.activeList = active[0];
  } else {
    data.activeList = await dbInsert('lists', { name: 'Einkaufsliste', is_active: true, created_by: data.userId });
  }
  data.items = await dbFetch(`list_items?select=*&list_id=eq.${data.activeList.id}&order=created_at.asc`);
}

export function renderActiveList() {
  const el = document.getElementById('active-list-content');
  const open = data.items.filter(i => !i.checked);
  const done = data.items.filter(i => i.checked);

  if (!data.items.length) {
    el.innerHTML = '<p class="empty-hint">Noch nichts auf der Liste. Wähle oben Artikel aus dem Katalog oder füge unten einen neuen hinzu.</p>';
    return;
  }

  let html = groupItemsByCategory(open).map(group => `
    <details class="category-group" open>
      <summary class="category-title">${group.name} <span class="count">${group.items.length}</span></summary>
      <ul class="item-list">
        ${group.items.map(renderItemRow).join('')}
      </ul>
    </details>
  `).join('');

  if (done.length) {
    html += `
      <details class="category-group checked-group">
        <summary class="category-title">Erledigt <span class="count">${done.length}</span></summary>
        <ul class="item-list">
          ${done.map(renderItemRow).join('')}
        </ul>
        <button class="btn-secondary btn-sm clear-done-btn" onclick="clearCheckedItems()">Erledigte entfernen</button>
      </details>`;
  }

  el.innerHTML = html;
}

function renderItemRow(item) {
  return `
    <li class="item-row">
      <label class="item-check">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleItemChecked(${item.id})">
        <span class="item-name ${item.checked ? 'item-name--checked' : ''}">${escapeHtml(item.name)}${item.quantity ? ` <span class="item-qty">(${escapeHtml(item.quantity)})</span>` : ''}</span>
      </label>
      <button class="icon-btn" onclick="removeListItem(${item.id})" aria-label="Entfernen">${ICON_TRASH}</button>
    </li>`;
}

export async function toggleItemChecked(id) {
  const item = data.items.find(i => i.id === id);
  if (!item) return;
  const checked = !item.checked;
  const patch = { checked, checked_by: checked ? data.userId : null, checked_at: checked ? new Date().toISOString() : null };
  const updated = await dbUpdate('list_items', id, patch);
  Object.assign(item, updated);
  renderActiveList();
}

export async function removeListItem(id) {
  await dbDelete('list_items', id);
  data.items = data.items.filter(i => i.id !== id);
  renderActiveList();
}

export async function clearCheckedItems() {
  const doneIds = data.items.filter(i => i.checked).map(i => i.id);
  if (!doneIds.length) return;
  await Promise.all(doneIds.map(id => dbDelete('list_items', id)));
  data.items = data.items.filter(i => !i.checked);
  renderActiveList();
}

export async function handleQuickAdd(event) {
  event.preventDefault();
  const nameInput = document.getElementById('quick-add-input');
  const categorySelect = document.getElementById('quick-add-category');
  const saveToCatalog = document.getElementById('quick-add-save-catalog');

  const name = nameInput.value.trim();
  if (!name) return false;
  const categoryId = categorySelect.value ? Number(categorySelect.value) : null;

  let catalogItemId = null;
  if (saveToCatalog.checked) {
    const catalogRow = await dbInsert('catalog_items', { name, category_id: categoryId, created_by: data.userId });
    data.catalog.push(catalogRow);
    data.catalog.sort((a, b) => a.name.localeCompare(b.name));
    catalogItemId = catalogRow.id;
    renderCatalog();
  }

  const row = await dbInsert('list_items', {
    list_id: data.activeList.id,
    catalog_item_id: catalogItemId,
    name,
    category_id: categoryId,
    created_by: data.userId
  });
  data.items.push(row);
  renderActiveList();

  nameInput.value = '';
  categorySelect.value = '';
  nameInput.focus();
  return false;
}

export function openPicker() {
  const el = document.getElementById('picker-content');
  const onListCatalogIds = new Set(data.items.map(i => i.catalog_item_id).filter(Boolean));

  if (!data.catalog.length) {
    el.innerHTML = '<p class="empty-hint">Noch keine Stammartikel im Katalog. Leg zuerst welche im Katalog-Tab an.</p>';
  } else {
    el.innerHTML = groupItemsByCategory(data.catalog).map(group => `
      <div class="category-group">
        <h3 class="category-title">${group.name}</h3>
        <ul class="item-list">
          ${group.items.map(item => {
            const onList = onListCatalogIds.has(item.id);
            return `
              <li class="item-row">
                <label class="item-check">
                  <input type="checkbox" value="${item.id}" ${onList ? 'checked disabled' : ''} class="picker-checkbox">
                  <span class="item-name">${escapeHtml(item.name)}${onList ? ' <span class="item-qty">(auf der Liste)</span>' : ''}</span>
                </label>
              </li>`;
          }).join('')}
        </ul>
      </div>
    `).join('');
  }

  document.getElementById('picker-modal').style.display = 'flex';
}

export function closePicker() {
  document.getElementById('picker-modal').style.display = 'none';
}

export async function confirmPicker() {
  const checkboxes = document.querySelectorAll('.picker-checkbox:checked:not(:disabled)');
  const chosen = Array.from(checkboxes).map(cb => data.catalog.find(c => c.id === Number(cb.value))).filter(Boolean);

  for (const catalogItem of chosen) {
    const row = await dbInsert('list_items', {
      list_id: data.activeList.id,
      catalog_item_id: catalogItem.id,
      name: catalogItem.name,
      category_id: catalogItem.category_id,
      quantity: catalogItem.default_quantity,
      created_by: data.userId
    });
    data.items.push(row);
  }

  renderActiveList();
  closePicker();
}

export async function completeShopping() {
  if (!data.items.length) {
    if (!confirm('Die Liste ist leer. Trotzdem einen neuen Einkauf starten?')) return;
  } else if (!confirm('Einkauf abschließen und Liste zurücksetzen?')) {
    return;
  }
  await dbUpdate('lists', data.activeList.id, { is_active: false });
  data.activeList = await dbInsert('lists', { name: 'Einkaufsliste', is_active: true, created_by: data.userId });
  data.items = [];
  renderActiveList();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
