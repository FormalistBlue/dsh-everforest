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
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.en.md#compatibility"><img src="https://img.shields.io/badge/DSH-0.2.1--rc.3-7fbbb3?labelColor=333C43" alt="DSH 0.2.1-rc.3"></a>
  <a href="https://everforest.vercel.app/ports"><img src="https://img.shields.io/badge/Everforest-Ports-e69875?labelColor=333C43" alt="Everforest Ports"></a>
</p>

<p align="center">Six variants — Dark / Light × Hard / Medium / Soft — default to <a href="https://github.com/FireIsGood/obsidian-everforest-enchanted">Everforest Enchanted</a>'s pairing (Dark Soft / Light Hard).</p>

## Previews

**Dark · Soft (default)**

![Everforest Dark Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-soft.png)

**Light · Hard (default)**

![Everforest Light Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-hard.png)

> Both images are full-window screenshots from the desktop app. Defaults: Dark Soft / Light Hard; the other four strengths are one click away in Settings → Everforest.

## Installation

Open **Add plugin → Install a third-party plugin** in the DSH plugin page and enter `dsh-everforest`; for local development you can also select this repository directory. Alternatively, ask the agent to call `plugin_manager`'s `install_bundle` (target `dsh-everforest`).

> **Upgrading**: changes to the Host half (`index.js` / `src/host-config.js`) need a **DSH restart** — refreshing the page does not reload it. Upgrading to 0.3.0 therefore needs one restart. Updating the npm package without restarting leaves the new Client on the localStorage-only fallback (choices still apply, they are just not written to the Host yet); the first load after the restart seeds the local cache into the Host. After that, picking a strength writes through DSH's settings service into the Host configuration and is broadcast to every browser on the profile, with no further restart.

## Usage

- Open **Settings → Everforest**: the Appearance control (Follow system / Dark / Light) is at the top, followed by six palette cards (Dark / Light × three strengths).
- Selections apply immediately; defaults are Dark Soft / Light Hard.
- Colour mode (the medium-colour content layer) has been a **default feature with no Settings switch since 2026-10-24**: chat Markdown h1–h6 headings, emphasis, tables and session-status rows are tinted automatically. It only injects scoped CSS and never changes the token layer or the palette data; the Settings page no longer shows any related option.
- Strengths are saved in the **Host configuration** of the current profile (the `everforest` row in `cordis.patch.yml`) and shared by every browser and window on that profile; this browser's localStorage is only a first-frame cache and an old-host fallback.
- Picking a card in the other scheme's group also switches DSH Appearance (written to the global appearance preference); choose **Follow system** to restore automatic switching.
- Every browser and window on the same profile (including tabs on the same address) syncs strength changes live.
- **Restore defaults** resets the strengths only; it never rewrites DSH's global appearance preference.
- UI copy follows DSH's language (zh / en).

## Compatibility

- Targets DSH **0.2.1-rc.3** (re-checked 2026-10-24; compatibility starts at rc.2); `engines.dsh` stays `>=0.2.1-rc.2 <0.3.0-0` — rc.3 satisfies it, so the lower bound is deliberately not raised.
- 0.2.1-rc.3 re-check: the built-in ui-theme still declares the same 8 sheets / 206 colour tokens (same extraction SHA-256), the new "More" menus use existing tokens only, and the `configForms` / slots / `index-inject` / HMR integration points are unchanged — no breaking changes.
- Colours are overridden mainly through `--dsw-*` / `--shiki-*` tokens, with no component CSS changes; the always-on colour-mode sheet (a default feature with no Settings switch since 2026-10-24) and one global `::selection` rule (`src/selection.js`, which keeps each element's own text colour) are the only injected CSS. If a DSH upgrade renames a token, the missing entries fall back to the native palette (no blank screen).
- Strengths are persisted through DSH's official settings / `configForms` channel into the current profile's Host configuration (the Host half's `@deepseek-ai/schemastery` is resolved from DSH's own installation and never shipped with the package); on an older host without that channel the plugin falls back to browser localStorage.
- Full token inventory: [docs/reference/token-inventory.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/token-inventory.md).

## Notes

- Palette data comes from sainnhe's Everforest (six background ramps) and Everforest Enchanted (default pairing, header colours, UI semantics); see [docs/reference/palette.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/palette.md).
- Text selection uses Everforest's `bg_visual` while keeping each element's own text colour (syntax / link colours are not flattened).
- In the light variants, text-bearing surfaces are lifted 25% toward `bg0` and passed through a contrast guard (body text ≥ 4.5:1); the sidebar keeps a visible boundary against the content card.
- Not covered: terminal ANSI 16 colours, brand / file-icon artwork. Per-level heading colours have no DSH token; the default-on colour mode covers them with scoped CSS (the token layer keeps monochrome headings). **First paint is covered**: the Host half injects the current palette before the Client loads (this browser's cache wins, falling back to the Host value when it is missing or invalid), so the Web loading screen / first frame (including the loading spinner ring and its progress arc) is already Everforest and Desktop cold start is at most one native frame. See [docs/design.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/design.md) and [docs/reference/contrast.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/contrast.md).

## Development

- **No runtime dependencies**: the Host half's `import '@deepseek-ai/schemastery'` is resolved by the DSH runtime from its own installation and is not shipped with the package.
- The repository declares a single devDependency (`@deepseek-ai/schemastery`) for `node --test` / CI; run `npm install` before testing for the first time.
- `npm test` (= `node --test`), `npm run check` (palette / build / contrast `--check`), `npm run build` (rebuilds and commits `client.js`).
- `npm run build:dev` produces a local debugging build: `client.js` additionally carries a floating Everforest panel over the main UI, so Appearance (follow system / dark / light) and all six strengths can be switched without opening Settings. The panel shares the Settings page's state (Host config + first-paint cache); its position and collapsed state persist in `localStorage`. While the Client-side HMR transport is attached a rebuild swaps the panel in live, otherwise reload the page.
- **A dev build must never be committed or published**: the panel code only enters the artifact under `npm run build:dev` (`src/dev-panel.js` plus the `// @dev-only:` blocks in `src/client-entry.js`), and `npm run build` restores the production bundle without it. `npm run check`, CI and `prepack` on `npm publish` all reject a `client.js` left as a dev build and ask for `npm run build` first.

## License

MIT (this plugin). Palette data comes from [Everforest](https://github.com/sainnhe/everforest) (Copyright (c) 2019 sainnhe) and [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) (Copyright (c) 2023 FireIsGood), both MIT; see [THIRD_PARTY_NOTICES.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/THIRD_PARTY_NOTICES.md).
