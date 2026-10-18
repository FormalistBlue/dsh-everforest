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
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/dsh-everforest" alt="license"></a>
</p>

<p align="center">Six variants — Dark / Light × Hard / Medium / Soft — default to <a href="https://github.com/FireIsGood/obsidian-everforest-enchanted">Everforest Enchanted</a>'s pairing (Dark Soft / Light Hard).</p>

## Previews

| | Dark | Light |
|:-:|:-:|:-:|
| **Hard** | ![Everforest Dark Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-hard.png) | ![Everforest Light Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-hard.png) |
| **Medium** | ![Everforest Dark Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-medium.png) | ![Everforest Light Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-medium.png) |
| **Soft** | ![Everforest Dark Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-soft.png) | ![Everforest Light Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-soft.png) |

> Previews are illustrative UI renderings built from each variant's actual palette. Defaults: Dark Soft / Light Hard.

## Installation

Open **Add plugin → Install a third-party plugin** in the DSH plugin page and enter `dsh-everforest`; for local development you can also select this repository directory. Alternatively, ask the agent to call `plugin_manager`'s `install_bundle` (target `dsh-everforest`).

## Usage

- Open **Settings → Everforest**: the Appearance control (Follow system / Dark / Light) is at the top, followed by six palette cards (Dark / Light × three strengths).
- Selections apply and persist immediately; defaults are Dark Soft / Light Hard.
- Picking a card in the other scheme's group also switches DSH Appearance (written to the global appearance preference); choose **Follow system** to restore automatic switching.
- UI copy follows DSH's language (zh / en).

## Compatibility

- Targets DSH **0.2.1-rc.2**; `engines.dsh` is `>=0.2.1-rc.2 <0.3.0-0`.
- Colours are overridden only through `--dsw-*` / `--shiki-*` tokens, with no component CSS changes; if a DSH upgrade renames a token, the missing entries fall back to the native palette (no blank screen).
- Full token inventory: [docs/reference/token-inventory.md](docs/reference/token-inventory.md).

## Notes

- Palette data comes from sainnhe's Everforest (six background ramps) and Everforest Enchanted (default pairing, header colours, UI semantics); see [docs/reference/palette.md](docs/reference/palette.md).
- In the light variants, text-bearing surfaces are lifted 25% toward `bg0` and passed through a contrast guard (body text ≥ 4.5:1); the sidebar keeps a visible boundary against the content card.
- Not covered: terminal ANSI 16 colours, brand / file-icon artwork, per-level heading colours, first-paint loading screen. See [docs/design.md](docs/design.md) and [docs/reference/contrast.md](docs/reference/contrast.md).

## License

MIT (this plugin). Palette data comes from [Everforest](https://github.com/sainnhe/everforest) (Copyright (c) 2019 sainnhe) and [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) (Copyright (c) 2023 FireIsGood), both MIT; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
