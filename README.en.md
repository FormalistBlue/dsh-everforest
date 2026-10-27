<p align="center">
  <img src="https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-icon.png" width="120" alt="Everforest">
</p>

<h1 align="center">🌲 Everforest for DeepSeek Harness</h1>

<p align="center">
  English | <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.md">中文</a>
</p>

<p align="center">
  Everforest is a warm, soft colour scheme built on forest tones that is easy on the eyes.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-everforest"><img src="https://img.shields.io/npm/v/dsh-everforest" alt="npm version"></a>
  <a href="https://dsh-plugin.org/plugins/formalistblue/dsh-everforest"><img src="https://dsh-plugin.org/badges/listed.svg" alt="Listed on dsh-plugin.org"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DSH%20Web-Plugin-a7c080?labelColor=333C43" alt="DSH Web plugin"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.en.md"><img src="https://img.shields.io/badge/DSH-0.2.1--rc.3-7fbbb3?labelColor=333C43" alt="DSH 0.2.1-rc.3"></a>
  <a href="https://everforest.vercel.app/ports"><img src="https://img.shields.io/badge/Everforest-Ports-e69875?labelColor=333C43" alt="Everforest Ports"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/dsh-everforest" alt="license"></a>
</p>

dsh-everforest provides an Everforest colour theme for DeepSeek Harness, on both web and desktop. Forest tones, with six dark and light palettes. Chat content (headings, code, links, tables and more) is restyled with independent colours, and every tone and saturation level is tuned individually for a warm, gentle, easy-on-the-eyes experience.

## ✨ Previews

**Dark · Soft (default)**

![Everforest Dark Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-soft.png)

**Light · Hard (default)**

![Everforest Light Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-hard.png)

## 🚀 Installation

1. 🧩 Open the **Plugins** page in the sidebar.
2. 📃 Click the arrow next to **Add plugin** and choose **Install a third-party plugin**.
3. ✅ Enter `dsh-everforest` to install, then click **Enable**.

## 🔥 Features

- 🌳 Soft sage green and warm cream tones; natural and easy on the eyes.
- 👀 Built around eye comfort: contrast and saturation are gentler on the eyes.
- 🎨 Two main palettes, dark and light, to pick from as you like.
- 🖌️ Chat content is colourised: headings, text, code and more all follow the Everforest palette, and each of the six strengths has its own design.
- 📄 The workspace session list is colour-coded by state: waiting for you / done at a glance.
- ⌛️ The loading page shown when the app opens matches the active palette, so startup feels natural.
- ⚙️ Open **Settings → Everforest** to choose one of six strengths:
  - Dark:
    - **Soft (default)** lowest contrast, softest;
    - **Medium** balanced contrast;
    - **Hard** highest contrast, sharpest.
  - Light:
    - **Soft** lowest contrast, softest;
    - **Medium** balanced contrast;
    - **Hard (default)** highest contrast, clearest to read.

## ✅ Feature Status

**Palettes and coverage**
- ✅ Six Everforest palettes: dark / light × soft / medium / hard
- ✅ Defaults match the upstream pairing: dark Soft, light Hard
- ✅ Full colour-token coverage (incl. shiki code highlighting, diff, sidebar, overlays, borders and state colours)
- ✅ Contrast checked for every one of the six palettes

**Content colouring**
- ✅ Markdown rich text: h1–h6 six-colour headings, bold / italic, inline code, internal file links, blockquotes, horizontal rules, task lists, table headers / zebra stripes / hover
- ✅ Session status rows: waiting for confirmation (yellow fill) and done-unread (green fill), with status dots
- ✅ Workspace active-session row highlight
- ✅ Native text-selection colours, preserving each element's own text colour
- ✅ First-paint loading page, spinner ring and progress arc

**Settings and persistence**
- ✅ Settings page: six strengths plus the appearance control (light / dark / follow system)
- ✅ Applies instantly, no restart needed
- ✅ Preference saved to the current profile's Host config: survives restarts and is shared by every browser on that profile
- ✅ Cross-scheme spotlight transition

**Release and engineering**
- ✅ npm installation, plugin-market listing, real-window screenshots and the market screenshot manifest
- ✅ Automated tests cover colours, settings, persistence and the transition
- ✅ Build and contrast checks run automatically

**Planned**
- ⬜ More interface languages (Chinese / English today; other languages fall back to English)
- ⬜ Finer-grained custom palette controls
- ⬜ Distinct colouring for thinking-process content and tool calls
- ⬜ Richer first-paint (loading) page
- ⬜ Refined colouring for dropdown options
- ⬜ Built-in automatic light/dark schedule
- ⬜ Compatibility polish for other third-party plugin pages
- ⬜ Refined table styling in chat content

## 📚 References

- The overall palette is based on <a href="https://github.com/sainnhe">sainnhe</a>'s original <a href="https://github.com/sainnhe/everforest">Everforest</a> scheme.
- Some colours reference <a href="https://github.com/FireIsGood/obsidian-everforest-enchanted">Everforest Enchanted</a>.

## 📜 License

[MIT License](https://github.com/FormalistBlue/dsh-everforest/blob/main/LICENSE) (this plugin).
