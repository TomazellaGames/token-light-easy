import { MODULE_ID, SETTINGS, BUILTIN_LIGHTS } from './constants.js';

/**
 * Register only the data settings (no class dependency).
 * Must run synchronously at the start of `init` before any await.
 */
export function registerDataSettings() {
  game.settings.register(MODULE_ID, SETTINGS.LIGHT_SOURCES, {
    scope: 'world',
    config: false,
    default: BUILTIN_LIGHTS.map(l => foundry.utils.deepClone(l)),
  });

  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_LIGHT, {
    scope: 'world',
    config: false,
    default: 'Torch',
    type: String,
  });

  game.settings.register(MODULE_ID, SETTINGS.RESTRICT_BY_ITEMS, {
    scope: 'world',
    config: false,
    default: true,
    type: Boolean,
  });

  game.settings.register(MODULE_ID, SETTINGS.GM_ONLY_ITEM_EDIT, {
    scope: 'world',
    config: false,
    default: true,
    type: Boolean,
  });
}

/**
 * Register the settings menu button. Must be called with the real class AFTER it has
 * been dynamically imported, so FoundryVTT's type validation passes.
 */
export function registerConfigMenu(ConfigClass) {
  game.settings.registerMenu(MODULE_ID, 'configMenu', {
    name: 'Token Light Easy',
    label: 'Configure',
    hint: 'Manage light sources and module options.',
    icon: 'fa-solid fa-lightbulb',
    type: ConfigClass,
    restricted: true,
  });
}

// --- Light source helpers ---

export function getAllLightSources() {
  const stored = game.settings.get(MODULE_ID, SETTINGS.LIGHT_SOURCES);
  if (!Array.isArray(stored) || stored.length === 0) {
    return BUILTIN_LIGHTS.map(l => foundry.utils.deepClone(l));
  }
  return stored;
}

export function getLightSourceById(id) {
  return getAllLightSources().find(l => l.id === id) ?? null;
}

export async function saveLightSources(lightSources) {
  return game.settings.set(MODULE_ID, SETTINGS.LIGHT_SOURCES, lightSources);
}

export function generateLightId() {
  return `light_${foundry.utils.randomID(8)}`;
}
