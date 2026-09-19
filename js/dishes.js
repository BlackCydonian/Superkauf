import { data } from './state.js';
import { dbFetch, dbInsert, dbUpdate, dbDelete, dbDeleteMany } from './api.js';
import { groupItemsByCategory, categorySelectOptionsHtml } from './categories.js';
import { addItemsToActiveList } from './list.js';
import { ICON_PENCIL, ICON_TRASH, ICON_PLUS } from './icons.js';

let draft = null; // { id, name, ingredients: [{name, quantity, category_id}], steps: [string] }
let pickerDishId = null;

function emptyIngredient() {
  return { name: '', quantity: '', category_id: null };
}

export async function loadDishes() {
  data.dishes = await dbFetch('dishes?select=*,dish_ingredients(*)&order=name.asc&dish_ingredients.order=position.asc');
}

export function renderDishes() {
  const el = document.getElementById('dishes-content');
  if (draft) {
    renderDishEditor(el);
    return;
  }
  if (!data.dishes.length) {
    el.innerHTML = '<p class="empty-hint">Noch keine Speisen. Leg oben die erste an.</p>';
    return;
  }
  el.innerHTML = data.dishes.map(renderDishCard).join('');
}

function renderDishCard(dish) {
  const ingredientNames = dish.dish_ingredients.map(i => i.name).join(', ') || 'Keine Zutaten hinterlegt';
  return `
    <div class="dish-card">
      <div class="dish-card-header">
        <span class="dish-name">${escapeHtml(dish.name)}</span>
        <span class="item-row-actions">
          <button class="icon-btn" onclick="editDish(${dish.id})" aria-label="Bearbeiten">${ICON_PENCIL}</button>
          <button class="icon-btn" onclick="removeDish(${dish.id})" aria-label="Löschen">${ICON_TRASH}</button>
        </span>
      </div>
      <p class="dish-ingredients-preview">${escapeHtml(ingredientNames)}</p>
      <button class="btn-secondary btn-icon btn-sm" onclick="openDishPicker(${dish.id})">${ICON_PLUS} Zur Einkaufsliste</button>
    </div>`;
}

export function newDish() {
  draft = { id: null, name: '', ingredients: [emptyIngredient()], steps: [''] };
  renderDishes();
}

export function editDish(id) {
  const dish = data.dishes.find(d => d.id === id);
  if (!dish) return;
  draft = {
    id: dish.id,
    name: dish.name,
    ingredients: dish.dish_ingredients.length
      ? dish.dish_ingredients.map(i => ({ name: i.name, quantity: i.quantity || '', category_id: i.category_id }))
      : [emptyIngredient()],
    steps: dish.steps && dish.steps.length ? [...dish.steps] : ['']
  };
  renderDishes();
}

export function cancelDishEditor() {
  draft = null;
  renderDishes();
}

function renderDishEditor(el) {
  el.innerHTML = `
    <form class="dish-editor" onsubmit="return saveDish(event)">
      <input type="text" class="dish-name-input" value="${escapeAttr(draft.name)}" placeholder="Name der Speise" oninput="updateDraftName(this.value)" required>

      <h4 class="editor-subheading">Zutaten</h4>
      <div>
        ${draft.ingredients.map((ing, i) => renderIngredientRow(ing, i)).join('')}
      </div>
      <button type="button" class="btn-secondary btn-sm btn-icon" onclick="addDraftIngredient()">${ICON_PLUS} Zutat hinzufügen</button>

      <h4 class="editor-subheading">Zubereitung</h4>
      <div>
        ${draft.steps.map((step, i) => renderStepRow(step, i)).join('')}
      </div>
      <button type="button" class="btn-secondary btn-sm btn-icon" onclick="addDraftStep()">${ICON_PLUS} Schritt hinzufügen</button>

      <div class="edit-actions dish-editor-actions">
        <button type="submit" class="btn-primary">Speichern</button>
        <button type="button" class="btn-secondary" onclick="cancelDishEditor()">Abbrechen</button>
      </div>
    </form>`;
}

function renderIngredientRow(ing, i) {
  return `
    <div class="ingredient-row">
      <input type="text" value="${escapeAttr(ing.name)}" placeholder="Zutat" oninput="updateDraftIngredient(${i}, 'name', this.value)">
      <input type="text" value="${escapeAttr(ing.quantity)}" placeholder="Menge" oninput="updateDraftIngredient(${i}, 'quantity', this.value)">
      <select onchange="updateDraftIngredientCategory(${i}, this.value)">
        <option value="">Kategorie</option>${categorySelectOptionsHtml(ing.category_id)}
      </select>
      <button type="button" class="icon-btn" onclick="removeDraftIngredient(${i})" aria-label="Zutat entfernen">${ICON_TRASH}</button>
    </div>`;
}

function renderStepRow(step, i) {
  return `
    <div class="step-row">
      <span class="step-number">${i + 1}.</span>
      <input type="text" value="${escapeAttr(step)}" placeholder="Arbeitsschritt" oninput="updateDraftStep(${i}, this.value)">
      <button type="button" class="icon-btn" onclick="removeDraftStep(${i})" aria-label="Schritt entfernen">${ICON_TRASH}</button>
    </div>`;
}

export function updateDraftName(value) {
  draft.name = value;
}

export function updateDraftIngredient(i, field, value) {
  draft.ingredients[i][field] = value;
}

export function updateDraftIngredientCategory(i, value) {
  draft.ingredients[i].category_id = value ? Number(value) : null;
}

export function updateDraftStep(i, value) {
  draft.steps[i] = value;
}

export function addDraftIngredient() {
  draft.ingredients.push(emptyIngredient());
  renderDishes();
}

export function removeDraftIngredient(i) {
  draft.ingredients.splice(i, 1);
  if (!draft.ingredients.length) draft.ingredients.push(emptyIngredient());
  renderDishes();
}

export function addDraftStep() {
  draft.steps.push('');
  renderDishes();
}

export function removeDraftStep(i) {
  draft.steps.splice(i, 1);
  if (!draft.steps.length) draft.steps.push('');
  renderDishes();
}

export async function saveDish(event) {
  event.preventDefault();
  const name = draft.name.trim();
  if (!name) return false;

  const ingredients = draft.ingredients
    .filter(i => i.name.trim())
    .map((i, idx) => ({ name: i.name.trim(), quantity: i.quantity.trim() || null, category_id: i.category_id ?? null, position: idx }));
  const steps = draft.steps.map(s => s.trim()).filter(Boolean);

  let dishId = draft.id;
  if (dishId) {
    await dbUpdate('dishes', dishId, { name, steps });
    await dbDeleteMany('dish_ingredients', `dish_id=eq.${dishId}`);
  } else {
    const row = await dbInsert('dishes', { name, steps, created_by: data.userId });
    dishId = row.id;
  }
  if (ingredients.length) {
    await dbInsert('dish_ingredients', ingredients.map(i => ({ ...i, dish_id: dishId })));
  }

  draft = null;
  await loadDishes();
  renderDishes();
  return false;
}

export async function removeDish(id) {
  if (!confirm('Diese Speise wirklich löschen?')) return;
  await dbDelete('dishes', id);
  data.dishes = data.dishes.filter(d => d.id !== id);
  renderDishes();
}

export function openDishPicker(dishId) {
  const dish = data.dishes.find(d => d.id === dishId);
  if (!dish) return;
  pickerDishId = dishId;

  document.getElementById('dish-picker-heading').textContent = `Zutaten für „${dish.name}“`;
  const el = document.getElementById('dish-picker-content');

  if (!dish.dish_ingredients.length) {
    el.innerHTML = '<p class="empty-hint">Diese Speise hat keine Zutaten hinterlegt.</p>';
  } else {
    el.innerHTML = groupItemsByCategory(dish.dish_ingredients).map(group => `
      <div class="category-group">
        <h3 class="category-title">${group.name}</h3>
        <ul class="item-list">
          ${group.items.map(ing => `
            <li class="item-row">
              <label class="item-check">
                <input type="checkbox" value="${ing.id}" checked class="dish-picker-checkbox">
                <span class="item-name">${escapeHtml(ing.name)}${ing.quantity ? ` <span class="item-qty">(${escapeHtml(ing.quantity)})</span>` : ''}</span>
              </label>
            </li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  document.getElementById('dish-picker-modal').style.display = 'flex';
}

export function closeDishPicker() {
  document.getElementById('dish-picker-modal').style.display = 'none';
  pickerDishId = null;
}

export async function confirmDishPicker() {
  const dish = data.dishes.find(d => d.id === pickerDishId);
  if (!dish) return;

  const checkboxes = document.querySelectorAll('.dish-picker-checkbox:checked');
  const chosenIds = new Set(Array.from(checkboxes).map(cb => Number(cb.value)));
  const chosen = dish.dish_ingredients.filter(i => chosenIds.has(i.id));

  await addItemsToActiveList(chosen.map(ing => ({
    name: ing.name,
    category_id: ing.category_id,
    quantity: ing.quantity
  })));

  closeDishPicker();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }
