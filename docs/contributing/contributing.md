# Contributing to B

**B** is a collaborative project powered by custom **DenizenScript** accessories and community-driven docs. We welcome contributions that fit our technical standards and gritty digital aesthetic.

---

## Areas of Contribution

* **Documentation**: Expand stubs and refine gameplay guides for new operators.
* **Technical Scripts**: Develop **JavaScript** core systems, **DenizenScript** accessories, or **AHK 2.0** efficiency macros.
* **Asset & Art Creation**: Provide 3D models or gritty 90s-style illustrations for project skits.
  - **3D Models**: Furniture models must use the `generic` type and `Box UV` mapping, scaled for our 2048x2048 Master Atlas (see Artistic Standards).
  - **Icon Generation**: Use the template at `assets/icons/powers/power-template.xcf` with **GIMP**.
  - **Color Logic**: Tint icons based on the powerset position on the **Integrity Axis**.

---

## The AI & Automation Boundary

We understand that the rapid rise of Generative AI is a massive, highly valid concern for digital artists, writers, and traditional developers. We want to be unequivocally clear: **B is a project driven by raw human creativity.** We have absolutely zero interest in replacing the human soul of game development with prompt-generated content.

Our aesthetic, our lore, and our core game logic come directly from our team. We stand with creatives. 

With that said, maintaining a large-scale MMO architecture with a small team requires immense technical efficiency. To bridge this gap, we draw a strict, hard line between **Generative AI** and **Structural Automation**.

### What is Strictly Prohibited (Generative AI)
We do not allow LLMs or image generators to create the identity of **B**.
* **No AI Art:** All sprites, textures, and illustrations must be crafted by humans. We want the charm, intent, and grit of real pixel art.
* **No AI Lore or Writing:** Characters, world-building, dialogue, and quest lines must be written by people. We don't want generic, hallucinated filler.
* **No Generative Game Design:** The rules, mechanics, and balancing of powersets are meticulously crafted and argued over by our team.

### How We Actually Use Automation (Our Process So Far)
We treat automation and coding assistants strictly as **Force Multipliers** for tedious, mind-numbing maintenance. Our process so far restricts automation to the following structural tasks:
* **Boilerplate & Refactoring:** Using tools to apply a consistent CSS style across 50 UI elements, or rewriting a messy `switch` statement into a cleaner object map.
* **Bug Hunting & Regex:** Utilizing tools to spot a missing bracket in a 1,000-line JSON file, or to write complex Regular Expressions for string parsing.
* **Batch Processing:** Speeding up image exports by using **GIMP** filters and **AutoHotkey (AHK)** macros to batch-process hue/saturation shifts for powerset icons. This is the equivalent of a mechanical assembly line.
* **Validation:** Running custom scripts to verify that every item in our `FURNITURE_REGISTRY` actually has a corresponding 3D `.glb` model file in the repository.

If you use tools to speed up your workflow, stay transparent about where your logic ends and the automation begins. We respect the craft, and we want you to feel secure sharing your talents here.

---

## Getting Started

To contribute, review our technical requirements and project trajectory:

* **[Contributing on GitHub](contributing/contributing-on-github)**
  - Workflow for forking, cloning, and submitting pull requests to the **b-Universe** org.
* **[Technical Standards](contributing/technical-standards)**
  - Monospaced fonts, 2-space indentation, and clean code.
* **[Artistic Standards](contributing/artistic-standards)**
  - Guidelines for the bright rainbow and dark space theme.
* **[2026 Roadmap](contributing/2026-roadmap)**
  - High-priority goals for archive expansion and network upgrades.

---

<div class="nav-tray" style="flex-wrap: wrap;">
  <strong>B</strong><span>|</span>
  <a href="#/wiki/play-info">Play</a><span>|</span>
  <a href="#/wiki/discord-community">Discord</a>
</div>

<div class="nav-tray" style="margin-top: 10px; flex-wrap: wrap;">
  <strong>Categories:</strong>
  <a href="#/contributing/contributing"><strong>Contributing</strong></a><span>|</span>
  <a href="#/contributing/contributing-on-github">GitHub Guide</a><span>|</span>
  <a href="#/contributing/technical-standards">Technical Standards</a><span>|</span>
  <a href="#/contributing/artistic-standards">Artistic Standards</a><span>|</span>
  <a href="#/contributing/2026-roadmap">2026 Roadmap</a><span>|</span>
  <a href="#/contributing/stubs">Stubs</a>
</div>
