export const MODULE_ID = 'token-light-easy';

export const SETTINGS = {
  LIGHT_SOURCES: 'lightSources',
  DEFAULT_LIGHT: 'defaultLight',
  RESTRICT_BY_ITEMS: 'restrictByItems',
  GM_ONLY_ITEM_EDIT: 'gmOnlyItemEdit',
};

export const TOKEN_FLAGS = {
  SELECTED_LIGHT: 'selectedLight',
  LIGHT_ENABLED: 'lightEnabled',
};

export const ITEM_FLAGS = {
  LIGHT_SOURCE_ID: 'lightSourceId',
};

export const DEFAULT_LIGHT_DATA = {
  negative: false,
  priority: 0,
  alpha: 0.5,
  angle: 360,
  bright: 0,
  color: null,
  coloration: 1,
  dim: 0,
  attenuation: 0.5,
  luminosity: 0.5,
  saturation: 0,
  contrast: 0,
  shadows: 0,
  animation: {
    type: null,
    speed: 5,
    intensity: 5,
    reverse: false,
  },
  darkness: { min: 0, max: 1 },
};

// Fallback coloration techniques if CONFIG.Canvas.colorationTechniques is unavailable
export const FALLBACK_COLORATION_TECHNIQUES = {
  0: { label: 'Legacy Coloration' },
  1: { label: 'Adaptive (Constrained)' },
  2: { label: 'Adaptive' },
  3: { label: 'Internal Halo' },
  4: { label: 'Coloration Only' },
  5: { label: 'Invert Color' },
  6: { label: 'Invert Color + Constrain' },
  7: { label: 'Natural Light' },
};

export const BUILTIN_LIGHTS = [
  {
    id: 'Torch',
    builtin: true,
    light: {
      ...DEFAULT_LIGHT_DATA,
      dim: 6,
      bright: 3,
      color: '#ff9329',
      alpha: 0.4,
      animation: { type: 'torch', speed: 5, intensity: 5, reverse: false },
    },
  },
  {
    id: 'Flashlight',
    builtin: true,
    light: {
      ...DEFAULT_LIGHT_DATA,
      dim: 16,
      bright: 8,
      angle: 60,
      animation: { type: null, speed: 5, intensity: 5, reverse: false },
    },
  },
  {
    id: 'Point Light',
    builtin: true,
    light: {
      ...DEFAULT_LIGHT_DATA,
      dim: 16,
      bright: 8,
      animation: { type: null, speed: 5, intensity: 5, reverse: false },
    },
  },
];
