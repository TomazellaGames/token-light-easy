# Token Light Easy

A Foundry VTT module that adds a lightbulb button to the Token HUD so GMs and players can toggle token lighting on and off — and pick from a list of presets — with a single click.

**Compatible with:** Foundry VTT v13 · v14  
**License:** GPL-3.0-or-later

---

## Features

- **Token HUD button** — right-click any token you own to see the lightbulb icon alongside the standard controls
- **Left-click** the button to toggle the active light on/off
- **Right-click** the button to choose a different light source from a popup menu
- **Three built-in presets** — Torch, Flashlight, and Point Light
- **Fully custom light sources** — set every parameter the Foundry light tab exposes: radius, color, animation, coloration technique, darkness range, and more
- **Item-based player permissions** — when enabled, a player only sees the lights whose ID is tagged on one of their actor's items
- **GM-only item editing** — prevent players from changing which light source is assigned to an item
- **Import / Export** — share your light preset library as a JSON file

---

## Installation

### Method 1 — Foundry Package Browser (recommended)

1. Open Foundry VTT and go to **Configuration → Add-on Modules → Install Module**
2. Paste the manifest URL in the **Manifest URL** field:
   ```
   https://github.com/TomazellaGames/token-light-easy/releases/latest/download/module.json
   ```
3. Click **Install** and enable the module in your world.

### Method 2 — Manual

1. Download the latest `module.zip` from the [Releases page](https://github.com/TomazellaGames/token-light-easy/releases)
2. Extract the zip so you have a folder named `token-light-easy`
3. Place that folder inside your Foundry `Data/modules/` directory
4. Restart Foundry and enable the module in your world's module list

---

## How to Use

### Token HUD Button

Right-click any token you own (or any token, if you are the GM). A small lightbulb icon appears among the HUD controls on the left side.

| Action | Result |
|---|---|
| **Left-click** the lightbulb | Toggles the token's light on or off using the currently selected preset |
| **Right-click** the lightbulb | Opens a menu listing all available light sources; clicking one activates it immediately |

The icon glows gold when a light is active.

### Settings Panel

Open **Game Settings → Configure Settings → Module Settings** and click **Configure** next to **Token Light Easy** (GM only).

The settings panel has three sections:

**General Settings**

| Setting | Default | Description |
|---|---|---|
| Default Token Light | Torch | The preset selected by default when a token has no prior light choice |
| Restrict by Item Tags | On | When enabled, non-GM players only see lights whose ID matches a Light Source tag on one of the token actor's items |
| Only GM Can Edit Item Light Source | On | When enabled, players can see but not change the Light Source field on item sheets |

**Light Sources list**

A drag-sortable list of all light presets (built-in + custom). Each row has:
- A drag handle for reordering
- The preset name
- **Edit** (pencil) — opens the full light editor
- **Duplicate** (copy) — creates an editable copy
- **Delete** (trash) — removes the preset (built-in presets cannot be deleted)

Click **Add New Light** at the bottom of the list to create a preset from scratch.

Click **Import** or **Export** to transfer presets as a JSON file (see [Import / Export](#import--export) below).

Clicking **Save Settings** saves the default light and both permission toggles. Changes to the light source list are saved immediately when you add, edit, duplicate, delete, or reorder.

### Light Source Editor

Each light source has a name (used as its ID) and the full set of lighting parameters:

| Group | Fields |
|---|---|
| Emission | Bright radius, Dim radius, Emission angle |
| Color | Color picker + hex input, Alpha (intensity) |
| Visual Effects | Luminosity, Attenuation, Coloration technique, Saturation, Contrast, Shadows |
| Darkness | Minimum darkness threshold, Maximum darkness threshold |
| Animation | Type, Speed, Intensity, Reverse |
| Advanced | Negative light, Priority |

The light preview updates live in the editor. Click **Save** to apply, or **Cancel** to discard.

> **Note:** Built-in light sources (Torch, Flashlight, Point Light) can be duplicated but not edited or deleted directly.

### Item Sheet — Light Source Field

When the module is active, every item sheet gains a **Light Source** dropdown at the bottom of its form. Set it to any light preset ID to tag that item as granting access to that light source.

This only matters when **Restrict by Item Tags** is ON. In that mode:
- A player whose actor owns an item tagged as "Torch" will see **Torch** in their right-click light menu
- A player with no tagged items sees no light options at all
- GMs always see every light regardless of this setting

If **Only GM Can Edit Item Light Source** is ON, the dropdown is visible to players but disabled — only the GM can assign or change a light source on an item.

---

## Import / Export

In the Settings Panel, under the Light Sources list:

**Export** — Downloads the current full light source library as `token-light-easy-lights.json`. The JSON is a plain array of light source objects and can be opened in any text editor.

**Import** — Opens a file picker. After selecting a valid `.json` file, you choose:
- **Merge** — Adds imported lights whose ID does not already exist in your library. Existing lights are untouched.
- **Replace Custom** — Removes all your current non-built-in lights, then adds every light from the file. Built-in presets (Torch, Flashlight, Point Light) are always preserved.

Imported lights are never marked as built-in, so they can be edited and deleted after import.

---

## Built-in Light Presets

| Name | Bright | Dim | Angle | Animation |
|---|---|---|---|---|
| Torch | 3 | 6 | 360° | Torch (speed 5, intensity 5) |
| Flashlight | 8 | 16 | 60° | None |
| Point Light | 8 | 16 | 360° | None |

---

## License

This module is released under the [GNU General Public License v3.0 or later](LICENSE).  
It is not affiliated with or endorsed by Foundry Gaming LLC.
