import { MODULE_ID, SETTINGS, ITEM_FLAGS } from './constants.js';
import { getAllLightSources } from './settings.js';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Injects the "Light Source" dropdown field into any item sheet.
 * Handles both legacy Application (jQuery html) and ApplicationV2 (HTMLElement html).
 */
export function onRenderItemSheet(sheet, html, _data) {
  const el = (html instanceof HTMLElement) ? html : (html?.[0] ?? html);
  if (!el) return;

  // Prevent double-injection on re-renders that fire both legacy and v2 hooks
  if (el.querySelector('.tle-item-light-section')) return;

  const item = sheet.document ?? sheet.object;
  if (!item || item.documentName !== 'Item') return;

  const lightSources = getAllLightSources();
  const currentId = item.getFlag(MODULE_ID, ITEM_FLAGS.LIGHT_SOURCE_ID) ?? 'none';

  const options = [
    `<option value="none"${currentId === 'none' ? ' selected' : ''}>None</option>`,
    ...lightSources.map(ls =>
      `<option value="${escapeHtml(ls.id)}"${currentId === ls.id ? ' selected' : ''}>${escapeHtml(ls.id)}</option>`
    ),
  ].join('');

  const section = document.createElement('div');
  section.className = 'tle-item-light-section';
  section.innerHTML = `
    <div class="form-group tle-item-light-group">
      <label class="tle-item-light-label">
        <i class="fa-solid fa-lightbulb"></i> Light Source
      </label>
      <div class="form-fields">
        <select class="tle-item-light-select">${options}</select>
      </div>
      <p class="hint">Grants access to this light source on the token HUD.</p>
    </div>
  `;

  // Find the best injection point across various game systems
  const target =
    el.querySelector('.sheet-body .tab.active .tab-body') ??
    el.querySelector('.sheet-body .tab.active') ??
    el.querySelector('.tab.active') ??
    el.querySelector('.sheet-body') ??
    el.querySelector('.window-content form') ??
    el.querySelector('form') ??
    el;

  target.appendChild(section);

  const select = section.querySelector('.tle-item-light-select');

  // Disable the dropdown for non-GM players when the GM-only setting is on
  if (game.settings.get(MODULE_ID, SETTINGS.GM_ONLY_ITEM_EDIT) && !game.user.isGM) {
    select.disabled = true;
    select.title = 'Only GMs can change the Light Source on items.';
  }

  select.addEventListener('change', async (e) => {
    const val = e.target.value;
    try {
      if (val === 'none') {
        await item.unsetFlag(MODULE_ID, ITEM_FLAGS.LIGHT_SOURCE_ID);
      } else {
        await item.setFlag(MODULE_ID, ITEM_FLAGS.LIGHT_SOURCE_ID, val);
      }
    } catch (err) {
      console.error(`${MODULE_ID} | Failed to set light source flag on item`, err);
    }
  });
}
