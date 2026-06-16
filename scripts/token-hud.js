import {
  MODULE_ID,
  SETTINGS,
  TOKEN_FLAGS,
  ITEM_FLAGS,
} from './constants.js';
import { getAllLightSources, getLightSourceById } from './settings.js';

// ---- Helpers ----

function isV14Plus() {
  return (game.release?.generation ?? 13) >= 14;
}

function getContextMenuClass() {
  return CONFIG?.ux?.ContextMenu
    ?? globalThis.ContextMenu
    ?? foundry.applications?.ux?.ContextMenu
    ?? null;
}

/** Returns lights available to this user for this token. */
function getAvailableLights(token) {
  const allLights = getAllLightSources();
  if (game.user.isGM) return allLights;

  const restrict = game.settings.get(MODULE_ID, SETTINGS.RESTRICT_BY_ITEMS);
  if (!restrict) return allLights;

  const actor = token.actor;
  if (!actor) return [];

  const itemLightIds = new Set(
    actor.items
      .map(item => item.getFlag(MODULE_ID, ITEM_FLAGS.LIGHT_SOURCE_ID))
      .filter(id => id && id !== 'none')
  );

  if (!itemLightIds.size) return [];
  return allLights.filter(l => itemLightIds.has(l.id));
}

/** Build a flat update object for token.document.update() that applies all light fields. */
function buildLightUpdate(lightData) {
  return {
    'light.negative':        lightData.negative        ?? false,
    'light.priority':        lightData.priority        ?? 0,
    'light.alpha':           lightData.alpha           ?? 0.5,
    'light.angle':           lightData.angle           ?? 360,
    'light.bright':          lightData.bright          ?? 0,
    'light.color':           lightData.color           ?? null,
    'light.coloration':      lightData.coloration      ?? 1,
    'light.dim':             lightData.dim             ?? 0,
    'light.attenuation':     lightData.attenuation     ?? 0.5,
    'light.luminosity':      lightData.luminosity      ?? 0.5,
    'light.saturation':      lightData.saturation      ?? 0,
    'light.contrast':        lightData.contrast        ?? 0,
    'light.shadows':         lightData.shadows         ?? 0,
    'light.animation.type':      lightData.animation?.type      ?? null,
    'light.animation.speed':     lightData.animation?.speed     ?? 5,
    'light.animation.intensity': lightData.animation?.intensity ?? 5,
    'light.animation.reverse':   lightData.animation?.reverse   ?? false,
    'light.darkness.min':    lightData.darkness?.min   ?? 0,
    'light.darkness.max':    lightData.darkness?.max   ?? 1,
  };
}

/** Toggle light on/off for a token. */
async function toggleLight(token, hudElement) {
  const wasEnabled = token.document.getFlag(MODULE_ID, TOKEN_FLAGS.LIGHT_ENABLED) ?? false;
  const willEnable = !wasEnabled;

  let selectedLightId = token.document.getFlag(MODULE_ID, TOKEN_FLAGS.SELECTED_LIGHT)
    ?? game.settings.get(MODULE_ID, SETTINGS.DEFAULT_LIGHT);

  // Make sure the selected light is still available to this token
  const available = getAvailableLights(token);
  if (!available.some(l => l.id === selectedLightId) && available.length > 0) {
    selectedLightId = available[0].id;
  }

  const updateData = {
    [`flags.${MODULE_ID}.${TOKEN_FLAGS.LIGHT_ENABLED}`]: willEnable,
    [`flags.${MODULE_ID}.${TOKEN_FLAGS.SELECTED_LIGHT}`]: selectedLightId,
  };

  if (willEnable) {
    const lightSource = getLightSourceById(selectedLightId);
    if (lightSource) {
      Object.assign(updateData, buildLightUpdate(lightSource.light));
    }
  } else {
    Object.assign(updateData, {
      'light.dim': 0,
      'light.bright': 0,
      'light.animation.type': null,
    });
  }

  await token.document.update(updateData);

  // Immediately reflect state on the button without waiting for re-render
  if (hudElement) {
    const btn = hudElement.querySelector('.tle-light-btn');
    if (btn) {
      btn.classList.toggle('active', willEnable);
      btn.dataset.tooltip = buildTooltip(willEnable, selectedLightId);
    }
  }
}

/** Select a light source and immediately activate it. */
async function selectLight(token, lightId, hudElement) {
  const lightSource = getLightSourceById(lightId);
  if (!lightSource) return;

  const updateData = {
    [`flags.${MODULE_ID}.${TOKEN_FLAGS.SELECTED_LIGHT}`]: lightId,
    [`flags.${MODULE_ID}.${TOKEN_FLAGS.LIGHT_ENABLED}`]: true,
    ...buildLightUpdate(lightSource.light),
  };

  await token.document.update(updateData);

  if (hudElement) {
    const btn = hudElement.querySelector('.tle-light-btn');
    if (btn) {
      btn.classList.add('active');
      btn.dataset.tooltip = buildTooltip(true, lightId);
    }
  }
}

function buildTooltip(enabled, lightId) {
  return enabled
    ? `Light: ${lightId} (click to turn off)`
    : `Light: ${lightId || 'None'} (click to turn on)`;
}

// ---- Context menu for light source selection ----

let _lightContextMenu = null;

function getLightContextMenu() {
  const ContextMenuClass = getContextMenuClass();
  if (!ContextMenuClass) return null;
  if (_lightContextMenu) return _lightContextMenu;

  _lightContextMenu = new ContextMenuClass(
    document.body,
    '.tle-ctx-trigger',
    [],
    { fixed: true, jQuery: false, ...(isV14Plus() ? { relative: 'cursor' } : {}) }
  );
  return _lightContextMenu;
}

function buildContextMenuItems(available, selectedLightId, token, hudElement) {
  if (isV14Plus()) {
    return available.map(light => ({
      label: light.id,
      icon: light.id === selectedLightId ? 'fa-solid fa-check' : 'fa-solid fa-lightbulb',
      onClick: () => void selectLight(token, light.id, hudElement),
    }));
  }
  // v13 format
  return available.map(light => ({
    name: light.id,
    icon: light.id === selectedLightId
      ? '<i class="fa-solid fa-check"></i>'
      : '<i class="fa-solid fa-lightbulb"></i>',
    callback: () => void selectLight(token, light.id, hudElement),
  }));
}

// ---- Main hook handler ----

export function onRenderTokenHUD(hud, html, _context) {
  // Normalize: v14 passes HTMLElement, v12/13 may pass jQuery
  const element = (html instanceof HTMLElement) ? html : (html?.[0] ?? html);
  if (!element) return;

  // Guard against double-injection on part re-renders in v14 ApplicationV2
  if (element.querySelector('.tle-light-btn')) return;

  const token = hud.object;
  if (!token) return;

  // Only show if the user can control this token
  if (!token.isOwner && !game.user.isGM) return;

  const available = getAvailableLights(token);
  if (!available.length) return;

  const lightEnabled = token.document.getFlag(MODULE_ID, TOKEN_FLAGS.LIGHT_ENABLED) ?? false;
  const selectedLightId = token.document.getFlag(MODULE_ID, TOKEN_FLAGS.SELECTED_LIGHT)
    ?? game.settings.get(MODULE_ID, SETTINGS.DEFAULT_LIGHT);

  // --- Build the button ---
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `icon tle-light-btn${lightEnabled ? ' active' : ''}`;
  btn.dataset.tooltip = buildTooltip(lightEnabled, selectedLightId);
  btn.setAttribute('aria-label', 'Toggle Token Light');
  btn.innerHTML = '<i class="fa-solid fa-lightbulb"></i>';

  // FoundryVTT processes pointerdown on the canvas layer and can close the HUD before
  // a 'click' event fires. Handle both left and right clicks via 'pointerdown' instead.
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (e.button === 0) {
      // Left click — toggle light
      void toggleLight(token, element).catch(err => {
        console.error(`${MODULE_ID} | Failed to toggle light:`, err);
      });
    } else if (e.button === 2) {
      // Right click — show light selection menu
      const menu = getLightContextMenu();
      if (menu) {
        menu.menuItems = buildContextMenuItems(available, selectedLightId, token, element);
        ui.context?.close?.({ animate: false });
        ui.context = menu;
        void menu.render(btn, { event: e, animate: false });
      } else {
        showSimpleLightMenu(e, available, selectedLightId, token, element);
      }
    }
  });

  // Suppress the browser's native context menu on this button
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // --- Inject into the Token HUD ---
  // Try common selectors for the left-side controls column in v12-v14
  const leftCol = element.querySelector('.col.left')
    ?? element.querySelector('menu.col')
    ?? element.querySelector('[data-action="combat"]')?.parentElement
    ?? element.querySelector('.controls');

  const target = leftCol ?? element;
  target.appendChild(btn);

  // Debug: log where the button was placed so it can be verified in the browser console
  console.debug(
    `${MODULE_ID} | Injected light button into <${target.tagName.toLowerCase()} class="${target.className}">`,
    '— HUD root:', `<${element.tagName.toLowerCase()} class="${element.className}">`
  );
}

// ---- Simple fallback menu (when ContextMenu isn't available) ----

function showSimpleLightMenu(triggerEvent, available, selectedLightId, token, hudElement) {
  closeSimpleLightMenu();

  const menu = document.createElement('div');
  menu.id = 'tle-simple-light-menu';
  menu.className = 'tle-simple-light-menu';

  for (const light of available) {
    const item = document.createElement('div');
    item.className = `tle-light-menu-item${light.id === selectedLightId ? ' active' : ''}`;
    item.innerHTML = `<i class="fa-solid fa-${light.id === selectedLightId ? 'check' : 'lightbulb'}"></i> ${escapeHtml(light.id)}`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSimpleLightMenu();
      void selectLight(token, light.id, hudElement);
    });
    menu.appendChild(item);
  }

  document.body.appendChild(menu);

  // Position near the trigger
  const rect = triggerEvent.currentTarget?.getBoundingClientRect?.() ?? { left: triggerEvent.clientX, bottom: triggerEvent.clientY };
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 200)}px`;
  menu.style.top = `${rect.bottom + 4}px`;

  // Close on outside click
  requestAnimationFrame(() => {
    document.addEventListener('click', closeSimpleLightMenu, { once: true, capture: true });
    document.addEventListener('contextmenu', closeSimpleLightMenu, { once: true, capture: true });
  });
}

function closeSimpleLightMenu() {
  document.getElementById('tle-simple-light-menu')?.remove();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
