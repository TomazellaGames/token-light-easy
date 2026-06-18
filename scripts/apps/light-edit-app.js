import {
  MODULE_ID,
  DEFAULT_LIGHT_DATA,
  FALLBACK_COLORATION_TECHNIQUES,
} from '../constants.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Collect and expand form values; handles checkboxes and numeric inputs correctly. */
function _getFormData(form) {
  const FDE = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
  if (FDE) return foundry.utils.expandObject(new FDE(form).object);
  // Manual fallback for edge cases
  const raw = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    raw[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return foundry.utils.expandObject(raw);
}

/**
 * Dialog for creating or editing a light source.
 * Calls options.onSave(savedLightSource) on submit.
 */
export class LightEditApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(lightSource, options = {}) {
    super(options);
    this._lightSource = lightSource ?? {};
    this._isNew = !lightSource || options.forceNew;
    this._onSave = options.onSave ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: 'tle-light-edit',
    classes: ['tle-light-edit', 'sheet'],
    window: {
      title: 'Token Light Easy – Edit Light Source',
      resizable: true,
    },
    position: {
      width: 540,
      height: 620,
    },
  };

  static PARTS = {
    edit: {
      template: `modules/${MODULE_ID}/templates/light-edit-app.hbs`,
      scrollable: ['.tle-edit-scroll-body'],
    },
  };

  async _prepareContext(_options) {
    const source = this._lightSource;
    const light = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_LIGHT_DATA),
      foundry.utils.deepClone(source.light ?? {}),
      { inplace: false }
    );
    return {
      lightId: source.id ?? '',
      isBuiltin: source.builtin ?? false,
      isNew: this._isNew,
      light,
      animationTypes: this._buildAnimationTypes(light.animation?.type ?? null),
      colorationTechniques: this._buildColorationTechniques(light.coloration ?? 1),
    };
  }

  _buildAnimationTypes(selectedType) {
    const entries = Object.entries(CONFIG.Canvas?.lightAnimations ?? {});
    const types = [{ value: '', label: 'None', selected: !selectedType }];
    for (const [key, cfg] of entries) {
      types.push({
        value: key,
        label: game.i18n.localize(cfg.label ?? key),
        selected: selectedType === key,
      });
    }
    return types;
  }

  _buildColorationTechniques(selectedValue) {
    const source = CONFIG.Canvas?.colorationTechniques ?? FALLBACK_COLORATION_TECHNIQUES;
    return Object.entries(source).map(([key, cfg]) => ({
      value: parseInt(key),
      label: typeof cfg === 'string' ? cfg : game.i18n.localize(cfg.label ?? key),
      selected: selectedValue === parseInt(key),
    }));
  }

  // Called once when the window element is first inserted into the DOM.
  // this.element persists across re-renders, so we add all listeners here.
  _onFirstRender(_context, _options) {
    const el = this.element;

    // Color picker <-> hex text input sync
    el.addEventListener('input', (e) => {
      if (e.target.matches('input[type="color"][data-edit]')) {
        const text = el.querySelector(`[name="${e.target.dataset.edit}"]`);
        if (text) text.value = e.target.value;
      } else if (e.target.matches('[name="light.color"]')) {
        const val = e.target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          const picker = el.querySelector('input[type="color"][data-edit="light.color"]');
          if (picker) picker.value = val;
        }
      }
      if (e.target.matches('input[type="range"]')) {
        const display = e.target.nextElementSibling;
        if (display?.classList.contains('tle-range-value')) {
          display.textContent = parseFloat(e.target.value).toFixed(2);
        }
      }
    });

    // 'change' fires for color pickers when the palette is closed
    el.addEventListener('change', (e) => {
      if (e.target.matches('input[type="color"][data-edit]')) {
        const text = el.querySelector(`[name="${e.target.dataset.edit}"]`);
        if (text) text.value = e.target.value;
      }
    });

    // Form submit (the Save button has type="submit")
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._onSaveLight();
    });

    // Cancel button
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="cancel"]')) {
        e.preventDefault();
        void this.close();
      }
    });
  }

  async _onSaveLight() {
    const form = this.element.querySelector('form');
    const data = _getFormData(form);

    const lightId = (data.lightId ?? '').trim();
    if (!lightId) {
      ui.notifications.warn('Light ID cannot be empty.');
      return;
    }

    const light = {
      negative:    !!data.light?.negative,
      priority:    parseInt(data.light?.priority ?? 0) || 0,
      alpha:       parseFloat(data.light?.alpha ?? 0.5),
      angle:       parseFloat(data.light?.angle ?? 360),
      bright:      parseFloat(data.light?.bright ?? 0),
      color:       data.light?.color?.trim() || null,
      coloration:  parseInt(data.light?.coloration ?? 1),
      dim:         parseFloat(data.light?.dim ?? 0),
      attenuation: parseFloat(data.light?.attenuation ?? 0.5),
      luminosity:  parseFloat(data.light?.luminosity ?? 0.5),
      saturation:  parseFloat(data.light?.saturation ?? 0),
      contrast:    parseFloat(data.light?.contrast ?? 0),
      shadows:     parseFloat(data.light?.shadows ?? 0),
      animation: {
        type:      data.light?.animation?.type?.trim() || null,
        speed:     parseFloat(data.light?.animation?.speed ?? 5),
        intensity: parseFloat(data.light?.animation?.intensity ?? 5),
        reverse:   !!data.light?.animation?.reverse,
      },
      darkness: {
        min: parseFloat(data.light?.darkness?.min ?? 0),
        max: parseFloat(data.light?.darkness?.max ?? 1),
      },
    };

    const savedSource = {
      id: lightId,
      builtin: this._lightSource?.builtin ?? false,
      light,
    };

    await this._onSave?.(savedSource);
    this.close();
  }
}
