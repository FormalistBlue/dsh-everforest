<h1 align="center">🌲 Everforest for DeepSeek Harness</h1>

<p align="center">
  English | <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.md">中文</a>
</p>

<p align="center">
  Everforest is a green-based color scheme designed to be warm and soft in order to protect developers' eyes.<br>
  This repo brings dark and light themes to <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> (DSH),
  based on the original <a href="https://github.com/sainnhe/everforest">Everforest</a> scheme by
  <a href="https://github.com/sainnhe">sainnhe</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-everforest"><img src="https://img.shields.io/npm/v/dsh-everforest" alt="npm version"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/dsh-everforest" alt="license"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/actions/workflows/ci.yml"><img src="https://github.com/FormalistBlue/dsh-everforest/actions/workflows/ci.yml/badge.svg" alt="verify"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DSH%20Web-Plugin-a7c080?labelColor=333C43" alt="DSH Web plugin"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.en.md#compatibility"><img src="https://img.shields.io/badge/DSH-0.2.1--rc.2-7fbbb3?labelColor=333C43" alt="DSH 0.2.1-rc.2"></a>
  <a href="https://everforest.vercel.app/ports"><img src="https://img.shields.io/badge/Everforest-Ports-e69875?labelColor=333C43" alt="Everforest Ports"></a>
</p>

<p align="center">Six variants — Dark / Light × Hard / Medium / Soft — default to <a href="https://github.com/FireIsGood/obsidian-everforest-enchanted">Everforest Enchanted</a>'s pairing (Dark Soft / Light Hard).</p>

<p align="center">0.4.0 adds an experimental <strong>color mode</strong> that is on by default and can be switched off that puts Everforest's so-far unused saturated accents on chat Markdown rich text (h1–h6 colour-graded headings, bold / italic, inline code, internal links, strikethrough, blockquotes, tables, …) and on session-record status rows.</p>

## Previews

| | Dark | Light |
|:-:|:-:|:-:|
| **Hard** | ![Everforest Dark Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-hard.png) | ![Everforest Light Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-hard.png) |
| **Medium** | ![Everforest Dark Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-medium.png) | ![Everforest Light Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-medium.png) |
| **Soft** | ![Everforest Dark Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-soft.png) | ![Everforest Light Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-soft.png) |

> Previews are illustrative UI renderings built from each variant's actual palette. Defaults: Dark Soft / Light Hard.

## Installation

Open **Add plugin → Install a third-party plugin** in the DSH plugin page and enter `dsh-everforest`; for local development you can also select this repository directory. Alternatively, ask the agent to call `plugin_manager`'s `install_bundle` (target `dsh-everforest`).

> **Upgrading**: changes to the Host half (`index.js` / `src/host-config.js`) need a **DSH restart** — refreshing the page does not reload it. Upgrading to 0.3.0 or 0.4.0 therefore needs one restart (0.4.0 adds the `colorMode` field to the Host `Config`). Updating the npm package without restarting leaves the new Client on the localStorage-only fallback (choices still apply, they are just not written to the Host yet); the first load after the restart seeds the local cache into the Host. After that, picking a strength or toggling color mode writes through DSH's settings service into the Host configuration and is broadcast to every browser on the profile, with no further restart.

## Usage

- Open **Settings → Everforest**: the Appearance control (Follow system / Dark / Light) is at the top, followed by six palette cards (Dark / Light × three strengths).
- Selections apply immediately; defaults are Dark Soft / Light Hard.
- Strengths are saved in the **Host configuration** of the current profile (the `everforest` row in `cordis.patch.yml`) and shared by every browser and window on that profile; this browser's localStorage is only a first-frame cache and an old-host fallback.
- Picking a card in the other scheme's group also switches DSH Appearance (written to the global appearance preference); choose **Follow system** to restore automatic switching.
- Every browser and window on the same profile (including tabs on the same address) syncs strength changes live.
- **Color mode (experimental, on by default)**: when enabled, chat rich text uses Everforest accents — h1–h6 colour-graded headings, purple bold / italic, blue inline code, aqua internal file links, faded strikethrough and completed tasks, tinted blockquotes, list markers / blockquote bars / rules, table header bands / zebra rows / row hover, and blue checkboxes; the "waiting for you / finished-unopened" session rows and status dots are tinted too ("running" rows stay uncoloured). With it off the rendering is identical to 0.3.0. The switch lives in the same Host configuration as the strengths and is shared by every browser on the profile.
- **Restore defaults** resets the strengths and color mode only; it never rewrites DSH's global appearance preference.
- UI copy follows DSH's language (zh / en).

## Compatibility

- Targets DSH **0.2.1-rc.2**; `engines.dsh` is `>=0.2.1-rc.2 <0.3.0-0`.
- Colours are overridden only through `--dsw-*` / `--shiki-*` tokens, with no component CSS changes for the default palette; the experimental **color mode** additionally injects one scoped stylesheet (chat Markdown rich text and session-record status rows only, and only while the switch is on) — with it off nothing matches. If a DSH upgrade renames a token, the missing entries fall back to the native palette (no blank screen); if DSH renames component classes / DOM hooks, color mode may silently stop applying — that is the experimental boundary, the token layer is unaffected.
- Strengths are persisted through DSH's official settings / `configForms` channel into the current profile's Host configuration (the Host half's `@deepseek-ai/schemastery` is resolved from DSH's own installation and never shipped with the package); on an older host without that channel the plugin falls back to browser localStorage.
- Full token inventory: [docs/reference/token-inventory.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/token-inventory.md).

## Notes

- Palette data comes from sainnhe's Everforest (six background ramps) and Everforest Enchanted (default pairing, header colours, UI semantics); see [docs/reference/palette.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/palette.md).
- In the light variants, text-bearing surfaces are lifted 25% toward `bg0` and passed through a contrast guard (body text ≥ 4.5:1); the sidebar keeps a visible boundary against the content card.
- Not covered: terminal ANSI 16 colours, brand / file-icon artwork; default headings stay single-colour — h1–h6 levels only split colours in the experimental color mode. Color-mode heading / accent-text / status-dot values are derived from the palette accents through contrast guards (coloured text and decorations ≥ 3:1, while body text on tinted surfaces keeps 4.5:1), so light variants look noticeably muted ("pastel") and in light Soft the table washes / session-row tints are barely visible; table bands and row tints are green / orange washes over the background. **First paint is covered**: the Host half injects the current palette before the Client loads (this browser's cache wins, falling back to the Host value when it is missing or invalid), so the Web loading screen / first frame (including the loading spinner ring and its progress arc) is already Everforest and Desktop cold start is at most one native frame. See [docs/design.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/design.md) and [docs/reference/contrast.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/contrast.md).

## Development

- **No runtime dependencies**: the Host half's `import '@deepseek-ai/schemastery'` is resolved by the DSH runtime from its own installation and is not shipped with the package.
- The repository declares a single devDependency (`@deepseek-ai/schemastery`) for `node --test` / CI; run `npm install` before testing for the first time.
- `npm test` (= `node --test`), `npm run check` (palette / build / contrast `--check`), `npm run build` (rebuilds and commits `client.js`).

## License

MIT (this plugin). Palette data comes from [Everforest](https://github.com/sainnhe/everforest) (Copyright (c) 2019 sainnhe) and [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) (Copyright (c) 2023 FireIsGood), both MIT; see [THIRD_PARTY_NOTICES.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/THIRD_PARTY_NOTICES.md).
