import { MODULE_ID } from './constants.js';
import { registerDataSettings, registerConfigMenu } from './settings.js';
import { onRenderTokenHUD } from './token-hud.js';
import { onRenderItemSheet } from './item-field.js';

Hooks.once('init', async () => {
  // Register data settings FIRST — synchronous, no class dependency.
  // Must happen before any await so the settings exist for all subsequent hooks.
  registerDataSettings();

  // Load templates — use v13+ API if available, otherwise fall back
  const templates = [
    `modules/${MODULE_ID}/templates/light-edit-app.hbs`,
    `modules/${MODULE_ID}/templates/light-sources-config.hbs`,
  ];
  if (foundry.applications?.handlebars?.loadTemplates) {
    await foundry.applications.handlebars.loadTemplates(templates);
  } else {
    await loadTemplates(templates);
  }

  // Import the real class and register the settings menu with it so FoundryVTT's
  // type validation (requires Application/ApplicationV2 subclass) passes.
  const { LightSourcesConfig } = await import('./apps/light-sources-config.js');
  registerConfigMenu(LightSourcesConfig);
});

Hooks.on('renderTokenHUD', onRenderTokenHUD);

// Catch both legacy and v14 ApplicationV2 item sheet hooks
Hooks.on('renderItemSheet', onRenderItemSheet);
Hooks.on('renderItemSheetV2', onRenderItemSheet);
