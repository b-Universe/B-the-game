# Artistic Standards

The visual identity of **B** is built on a specific intersection of gritty 90s comic book art and high-intensity digital neon aesthetics. Every asset from 32x32 icons to full-page illustrations should embody these pillars, ensuring a cohesive atmosphere throughout the archive.

---

## Visual Pillars

- **90s Indie Comic Aesthetic**: We draw heavy inspiration from artists like **Greg Capullo** and **Todd McFarlane**. Assets should feature bold shadows, gritty textures, and assertive line work.
- **Dark Space & Neon Rainbows**: The primary UI is dark-themed, but accents must uses vibrant, high-intensity neon rainbow palettes. This creates a smooth, responsive transition between the void-like background and the vibrant active elements.
- **Pixel Art & Low-Bit Precision**: Digital art assets, especially icons, should value a low-bit or 16/32-bit style. Render these with pixel-perfect scaling to keep them sharp on high-resolution displays.

---

## Icon Color Theory

Powerset icons are color-coded based on their position on the **Integrity Axis**. This allows players to identify the nature of a power at a glance.

| Category | Primary Color | Examples | Association |
| :--- | :--- | :--- | :--- |
| **Primal / Arcane** | Indigo / Violet | <span class="icon-row"><i class="b-icon primal affects-target-only extreme-ranged"></i><i class="b-icon primal location teleport-caster"></i><i class="b-icon primal location summon-undead"></i></span> | Ethereal stability and ancient heritage. |
| **Human / Baseline** | White | <span class="icon-row"><i class="b-icon human affects-target-only light-minor-ranged"></i><i class="b-icon human run-speed-and-jump-height"></i><i class="b-icon human affects-target-only light-minor-melee"></i></span> | Standard adaptability and soul architecture. |
| **Mutation** | Acid Green | <span class="icon-row"><i class="b-icon mutation cone moderate-ranged"></i><i class="b-icon mutation heal"></i><i class="b-icon mutation recovery"></i></span> | Biological instability and viral pathogens. |
| **Synthetic** | Neon Cyan | <span class="icon-row"><i class="b-icon synthetic summon summon-minor"></i><i class="b-icon synthetic pbaoe slow"></i><i class="b-icon synthetic pbaoe-allies resistance-defense-1"></i></span> | Hardware integration and network efficiency. |
| **Robotic** | Gold | <span class="icon-row"><i class="b-icon robotic targeted-aoe snipe"></i><i class="b-icon robotic large-defense-bonus"></i><i class="b-icon robotic summon summon-shitload"></i></span> | Absolute technological replacement. |

---

### Integrity Scaling

For powersets that fall between these primary nodes, use the `color-mix()` logic within your CSS or GIMP layers to blend the tints.

* **The Mutation Leak**: As a powerset drifts from **Human** to **Mutated**, the Gold/White base should gradually transition into Acid Green.
* **The Synthetic Leak**: As a powerset drifts from **Human** to **Synthetic**, the Gold/White base should gradually transition into Neon Cyan.
* **Visual Density**: Maintain the sharp 16/32-bit pixelated scaling for all icons to ensure they keep that pixel grid qwispy against the dark space background.

---

## Patch Notes Color Coding

When writing updates for `server/data/patch-notes.json`, we categorize changes using specific neon hex codes to keep the UI readable and visually consistent.

| Category | Color | Hex Code | Description |
| :--- | :--- | :--- | :--- |
| **[Engine]** | Neon Blue | `#3498db` | Core refactoring, performance, networking. |
| **[Gameplay]** | Neon Green | `#2ecc71` | Mechanics, combat, movement, powers. |
| **[Design]** | Gold/Yellow | `#f1c40f` | UI, artwork, map layouts, QoL features. |
| **[Fix]** | Neon Red | `#e74c3c` | Bug fixes, exploit patches. |
| **[Content]** | Purple | `#9b59b6` | New NPCs, lore, dialog, powersets. |

---

## 3D Modeling & Blockbench Standards

For models like Furniture and environmental assets, follow these strict configuration rules in Blockbench:

- **Format & UV**: Select the `generic` model type and use `Box UV` mapping.
- **Base Resolution**: Use `32x32` for your grid resolution.
- **Dynamic Texturing & Zero-UV Workflow**: All furniture models automatically tile textures from the builder's hotbar based on their physical 3D dimensions.
  - *The Rule*: You **do not** need to map UVs in Blockbench.
  - *The Math*: The engine's shader calculates seamless UVs procedurally in 3D space. For every 16 units of length in Blockbench (which equals 32 units or 1 Block in the engine), the texture will seamlessly loop 1 full time. This allows you to build a 44-unit long bench, and the wood grain will flawlessly tile across the entire object without stretching!
- **Per-Face Texturing (`useMeshUV`)**: For structural objects requiring precise art details (like doors with doorknobs or panels), you should map the UVs manually using Blockbench's Per-Face mapping.
  - *The Rule*: When adding the object to `FURNITURE_REGISTRY`, flag the item with `useMeshUV: true`.
  - *The Result*: The engine will bypass the procedural Box UV math and wrap the builder's chosen material perfectly to your mapped Blockbench coordinates.

---

## 2D Sprite & Entity Standards

Character and entity sprites are rendered in a 2D isometric style against the 3D world. To ensure engine compatibility, sprite sheets must follow a strict dimensional grid:

- **Directional Columns**: Sprite sheets must be divided into exactly **8 columns**, representing the 8 relative rendering directions (`down-left`, `down`, `down-right`, `right`, `up-right`, `up`, `up-left`, `left`).
- **Animation Frames (Rows)**: The number of rows defines the animation length. Standard states configured in the engine include:
  - `idle`, `hurt`, `death`: 12 frames (rows).
  - `walk`, `run`, `dash`, `jump`, `fly`, `fly-idle`: 8 frames (rows).
  - `attack1`, `attack2`, `throw-attack1`: 7 frames (rows).
- **Anti-Aliasing**: Do **not** use soft brushes or anti-aliasing when exporting. The engine explicitly applies a `NearestFilter` to all textures to maintain crisp, jagged 32-bit pixel edges.

---

## UI & Typography Standards

When designing or programming HUD elements, tooltips, floating combat texts, and overlay menus, maintain the retro digital feel:

- **Typography**: Always use `var(--font-mono)` (or a standard Monospace font) for system text, coordinates, and debug information. Use impact-style sans-serif *only* for high-priority elements like Critical Hits.
- **Text Shadows**: Avoid soft, blurry CSS drop-shadows. Use a hard, 1-pixel directional shadow (e.g., `text-shadow: 1px 1px 0 #000;`) to cleanly pop text off the background.
- **Borders & Backgrounds**: UI panels should use stark, slightly transparent void-dark backgrounds (e.g., `rgba(5, 7, 10, 0.8)`) paired with solid 1px or 2px brightly colored neon borders.

---

## Tools & Templates

To maintain consistency in power icon creation, use the master template:

- **GIMP Template**: `assets/icons/powers/power-template.xcf`.
- **Grid Settings**: Use a 32x32 canvas with 1px grid snapping for all power and archetype icons.
- **Export Settings**: Export as .png with no compression or interlacing to ensure the pixel grid remains qwispy.

<div align="left">
  <a href="#/contributing/contributing"><b>←  Back to Contributing</b></a>
</div>

---

<div class="nav-tray" style="flex-wrap: wrap;">
  <strong>B</strong><span>|</span>
  <a href="#/wiki/play-info">Play</a><span>|</span>
  <a href="#/wiki/discord-community">Discord</a>
</div>

<div class="nav-tray" style="margin-top: 10px; flex-wrap: wrap;">
  <strong>Categories:</strong>
  <a href="#/contributing/contributing">Contributing</a><span>|</span>
  <a href="#/contributing/contributing-on-github">GitHub Guide</a><span>|</span>
  <a href="#/contributing/technical-standards">Technical Standards</a><span>|</span>
  <a href="#/contributing/artistic-standards"><strong>Artistic Standards</strong></a><span>|</span>
  <a href="#/contributing/2026-roadmap">2026 Roadmap</a><span>|</span>
  <a href="#/contributing/stubs">Stubs</a>
</div>
