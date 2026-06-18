import {
  MODULE_ID,
  SETTINGS,
  DEFAULT_LIGHT_DATA,
} from '../constants.js';
import {
  getAllLightSources,
  getLightSourceById,
  saveLightSources,
  generateLightId,
} from '../settings.js';
import { LightEditApp } from './light-edit-app.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Cross-version confirm dialog: uses DialogV2 on v14+ to avoid V1 deprecation warnings. */
async function _confirmDialog(title, content) {
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (DialogV2) return DialogV2.confirm({ window: { title }, content });
  return Dialog.confirm({ title, content });
}

/**
 * Cross-version 3-button import-mode picker.
 * Returns 'merge', 'replace', or null (cancelled / closed).
 */
async function _promptImportMode() {
  const content = `
    <p>Choose how to import the light sources:</p>
    <ul style="margin:4px 0 0 16px">
      <li><strong>Merge</strong> — adds incoming lights whose ID does not already exist.</li>
      <li><strong>Replace Custom</strong> — removes all existing custom lights first, then adds the imported ones.</li>
    </ul>
  `;
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (DialogV2) {
    return DialogV2.wait({
      window: { title: 'Import Light Sources' },
      content,
      buttons: [
        { action: 'merge', label: 'Merge', icon: 'fas fa-code-branch', default: true },
        { action: 'replace', label: 'Replace Custom', icon: 'fas fa-rotate' },
      ],
    }).catch(() => null);
  }
  return new Promise(resolve => {
    new Dialog({
      title: 'Import Light Sources',
      content,
      buttons: {
        merge: { label: '<i class="fas fa-code-branch"></i> Merge', callback: () => resolve('merge') },
        replace: { label: '<i class="fas fa-rotate"></i> Replace Custom', callback: () => resolve('replace') },
        cancel: { label: 'Cancel', callback: () => resolve(null) },
      },
      default: 'merge',
      close: () => resolve(null),
    }).render(true);
  });
}

/** Collect and expand form values; handles checkboxes correctly. */
function _getFormData(form) {
  const FDE = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
  if (FDE) return foundry.utils.expandObject(new FDE(form).object);
  const raw = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    raw[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return foundry.utils.expandObject(raw);
}

export class LightSourcesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this._dragSrcIndex = null;
  }

  static DEFAULT_OPTIONS = {
    id: 'tle-light-sources-config',
    classes: ['tle-config', 'sheet'],
    window: {
      title: 'Token Light Easy – Configure',
      resizable: true,
    },
    position: {
      width: 620,
      height: 640,
    },
  };

  static PARTS = {
    config: {
      template: `modules/${MODULE_ID}/templates/light-sources-config.hbs`,
      scrollable: ['.tle-config-scroll-body'],
    },
  };

  async _prepareContext(_options) {
    const lightSources = getAllLightSources();
    const defaultLight = game.settings.get(MODULE_ID, SETTINGS.DEFAULT_LIGHT);
    const restrictByItems = game.settings.get(MODULE_ID, SETTINGS.RESTRICT_BY_ITEMS);
    const gmOnlyItemEdit = game.settings.get(MODULE_ID, SETTINGS.GM_ONLY_ITEM_EDIT);

    const defaultLightOptions = lightSources.map(ls => ({
      value: ls.id,
      label: ls.id,
      selected: ls.id === defaultLight,
    }));

    return { lightSources, defaultLightOptions, restrictByItems, gmOnlyItemEdit };
  }

  // Called once when the application window is first inserted into the DOM.
  // this.element persists across re-renders; all listeners added here remain valid.
  _onFirstRender(_context, _options) {
    // Click delegation catches all data-action buttons even after part re-renders
    this.element.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      const action = btn.dataset.action;
      const lightId = btn.dataset.lightId ?? null;
      switch (action) {
        case 'add-light':       return this._onAddLight();
        case 'edit-light':      return this._onEditLight(lightId);
        case 'duplicate-light': return void this._onDuplicateLight(lightId);
        case 'delete-light':    return void this._onDeleteLight(lightId);
        case 'export-lights':   return this._onExportLights();
        case 'import-lights':   return this._onImportLights();
        case 'cancel':          return void this.close();
      }
    });

    // Form submit (Save Settings button has type="submit")
    this.element.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._onSaveSettings();
    });

    // Drag-drop via delegation — this.element is persistent, so these also survive re-renders
    this.element.addEventListener('dragstart',  this._onDragStart.bind(this));
    this.element.addEventListener('dragover',   this._onDragOver.bind(this));
    this.element.addEventListener('dragleave',  this._onDragLeave.bind(this));
    this.element.addEventListener('drop',       this._onDrop.bind(this));
    this.element.addEventListener('dragend',    this._onDragEnd.bind(this));
  }

  async _onSaveSettings() {
    const form = this.element.querySelector('form');
    const data = _getFormData(form);
    await game.settings.set(MODULE_ID, SETTINGS.DEFAULT_LIGHT, data.defaultLight);
    await game.settings.set(MODULE_ID, SETTINGS.RESTRICT_BY_ITEMS, data.restrictByItems ?? false);
    await game.settings.set(MODULE_ID, SETTINGS.GM_ONLY_ITEM_EDIT, data.gmOnlyItemEdit ?? false);
    ui.notifications.info('Token Light Easy settings saved.');
    this.close();
  }

  // --- CRUD ---

  _onAddLight() {
    const newSource = {
      id: generateLightId(),
      builtin: false,
      light: foundry.utils.deepClone(DEFAULT_LIGHT_DATA),
    };
    new LightEditApp(newSource, {
      forceNew: true,
      onSave: async (saved) => {
        const lights = getAllLightSources();
        if (lights.some(l => l.id === saved.id)) {
          ui.notifications.warn(`A light source with ID "${saved.id}" already exists.`);
          return;
        }
        lights.push(saved);
        await saveLightSources(lights);
        this.render();
      },
    }).render({ force: true });
  }

  _onEditLight(lightId) {
    const source = getLightSourceById(lightId);
    if (!source) return;
    new LightEditApp(source, {
      onSave: async (saved) => {
        const lights = getAllLightSources();
        const idx = lights.findIndex(l => l.id === lightId);
        if (idx === -1) return;
        if (saved.id !== lightId && lights.some(l => l.id === saved.id)) {
          ui.notifications.warn(`A light source with ID "${saved.id}" already exists.`);
          return;
        }
        lights[idx] = saved;
        await saveLightSources(lights);
        this.render();
      },
    }).render({ force: true });
  }

  async _onDuplicateLight(lightId) {
    const source = getLightSourceById(lightId);
    if (!source) return;
    const lights = getAllLightSources();
    const copy = foundry.utils.deepClone(source);
    copy.builtin = false;
    let base = `${source.id} (Copy)`;
    let candidate = base;
    let n = 2;
    while (lights.some(l => l.id === candidate)) candidate = `${base} ${n++}`;
    copy.id = candidate;
    lights.push(copy);
    await saveLightSources(lights);
    this.render();
  }

  async _onDeleteLight(lightId) {
    const source = getLightSourceById(lightId);
    if (!source || source.builtin) return;
    const confirmed = await _confirmDialog(
      'Delete Light Source',
      `<p>Delete "<strong>${lightId}</strong>"? This cannot be undone.</p>`,
    );
    if (!confirmed) return;
    const lights = getAllLightSources().filter(l => l.id !== lightId);
    await saveLightSources(lights);
    const currentDefault = game.settings.get(MODULE_ID, SETTINGS.DEFAULT_LIGHT);
    if (currentDefault === lightId && lights.length > 0) {
      await game.settings.set(MODULE_ID, SETTINGS.DEFAULT_LIGHT, lights[0].id);
    }
    this.render();
  }

  // --- Import / Export ---

  _onExportLights() {
    const lights = getAllLightSources();
    const blob = new Blob([JSON.stringify(lights, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'token-light-easy-lights.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ui.notifications.info(`Token Light Easy: exported ${lights.length} light source(s).`);
  }

  _onImportLights() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) void this._processImport(file);
    });
    input.click();
  }

  async _processImport(file) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      ui.notifications.error('Token Light Easy: import failed — file is not valid JSON.');
      return;
    }
    if (!Array.isArray(data)) {
      ui.notifications.error('Token Light Easy: import failed — expected an array of light sources.');
      return;
    }
    const valid = data.every(l => typeof l?.id === 'string' && l.id.length > 0
      && l?.light && typeof l.light === 'object');
    if (!valid) {
      ui.notifications.error('Token Light Easy: import failed — one or more entries are missing "id" or "light".');
      return;
    }

    const mode = await _promptImportMode();
    if (!mode) return;

    const existing = getAllLightSources();
    const incoming = data.map(l => ({ ...l, builtin: false }));

    let result;
    if (mode === 'replace') {
      const builtins = existing.filter(l => l.builtin);
      const builtinIds = new Set(builtins.map(l => l.id));
      result = [...builtins, ...incoming.filter(l => !builtinIds.has(l.id))];
    } else {
      const existingIds = new Set(existing.map(l => l.id));
      result = [...existing, ...incoming.filter(l => !existingIds.has(l.id))];
    }

    await saveLightSources(result);
    const added = mode === 'replace'
      ? result.length - existing.filter(l => l.builtin).length
      : result.length - existing.length;
    ui.notifications.info(`Token Light Easy: imported ${Math.max(0, added)} light source(s).`);
    this.render();
  }

  // --- Drag-and-drop reordering ---
  // All handlers receive events delegated from this.element, so event.currentTarget
  // is always this.element. We navigate to the relevant list/row via event.target.

  _onDragStart(event) {
    const row = event.target.closest('.tle-light-row');
    if (!row) return;
    this._dragSrcIndex = parseInt(row.dataset.index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(this._dragSrcIndex));
    row.classList.add('tle-dragging');
  }

  _onDragOver(event) {
    const row = event.target.closest('.tle-light-row');
    if (!row || parseInt(row.dataset.index) === this._dragSrcIndex) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const list = row.closest('.tle-light-list');
    list?.querySelectorAll('.tle-light-row').forEach(r => r.classList.remove('tle-drag-over'));
    row.classList.add('tle-drag-over');
  }

  _onDragLeave(event) {
    const list = event.target.closest('.tle-light-list');
    if (list && !list.contains(event.relatedTarget)) {
      list.querySelectorAll('.tle-drag-over').forEach(r => r.classList.remove('tle-drag-over'));
    }
  }

  async _onDrop(event) {
    const list = event.target.closest('.tle-light-list');
    if (!list) return;
    event.preventDefault();
    list.querySelectorAll('.tle-light-row').forEach(r => r.classList.remove('tle-drag-over', 'tle-dragging'));

    const toRow = event.target.closest('.tle-light-row');
    if (!toRow || this._dragSrcIndex === null) return;

    const fromIndex = this._dragSrcIndex;
    const toIndex = parseInt(toRow.dataset.index);
    this._dragSrcIndex = null;
    if (fromIndex === toIndex) return;

    const lights = getAllLightSources();
    const [moved] = lights.splice(fromIndex, 1);
    lights.splice(toIndex, 0, moved);
    await saveLightSources(lights);
    this.render();
  }

  _onDragEnd(_event) {
    this.element.querySelectorAll('.tle-light-row').forEach(r => {
      r.classList.remove('tle-dragging', 'tle-drag-over');
    });
    this._dragSrcIndex = null;
  }
}
