<h1 align="center">🌲 Everforest for DeepSeek Harness</h1>

<p align="center">
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.en.md">English</a> | 中文
</p>

<p align="center">
  Everforest 是一套以绿色为基调、温暖柔和的护眼配色。<br>
  本项目为 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>（DSH）带来深色 / 浅色主题，基于
  <a href="https://github.com/sainnhe">sainnhe</a> 原创的 <a href="https://github.com/sainnhe/everforest">Everforest</a> 方案。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-everforest"><img src="https://img.shields.io/npm/v/dsh-everforest" alt="npm version"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/dsh-everforest" alt="license"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/actions/workflows/ci.yml"><img src="https://github.com/FormalistBlue/dsh-everforest/actions/workflows/ci.yml/badge.svg" alt="verify"></a>
</p>

<p align="center">提供深色 / 浅色 × 硬 / 中 / 软共 6 档配色，默认对齐 <a href="https://github.com/FireIsGood/obsidian-everforest-enchanted">Everforest Enchanted</a>（深色 Soft / 浅色 Hard）。</p>

## 预览

| | 深色 Dark | 浅色 Light |
|:-:|:-:|:-:|
| **硬 Hard** | ![Everforest Dark Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-hard.png) | ![Everforest Light Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-hard.png) |
| **中 Medium** | ![Everforest Dark Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-medium.png) | ![Everforest Light Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-medium.png) |
| **软 Soft** | ![Everforest Dark Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-soft.png) | ![Everforest Light Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-soft.png) |

> 预览图按各档实际配色渲染的界面示意。默认：深色 Soft / 浅色 Hard。

## 安装

在 DSH 的插件管理页打开 **Add plugin → Install a third-party plugin**，输入 `dsh-everforest` 安装；本地开发时也可以直接选择本仓库目录。或由 Agent 调用 `plugin_manager` 的 `install_bundle`（目标 `dsh-everforest`）。

## 使用

- 打开 **Settings → Everforest**：顶部是「跟随系统 / 深色 / 浅色」外观控制，下面是 6 张色卡（深色 / 浅色各 3 档强度）。
- 选中即时生效并保存；默认深色 Soft / 浅色 Hard。
- 点另一深浅色组的色卡会同时切换 DSH 外观（写入全局外观偏好）；「跟随系统」可恢复自动跟随。
- 中英文文案随 DSH 语言切换。

## 兼容性

- 目标 DSH **0.2.1-rc.2**；`engines.dsh` 为 `>=0.2.1-rc.2 <0.3.0-0`。
- 仅通过 `--dsw-*` / `--shiki-*` token 覆盖配色，不改组件样式；DSH 升级若 token 改名，缺失项退回原生配色（不会白屏）。
- 完整 token 清单见 [docs/reference/token-inventory.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/token-inventory.md)。

## 说明

- 配色数据取自 sainnhe 的 Everforest（6 套背景色阶）与 Everforest Enchanted（默认配对、header 色、UI 语义），见 [docs/reference/palette.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/palette.md)。
- 浅色档的正文表面向 `bg0` 提亮 25% 并做对比度守卫（正文 ≥ 4.5:1）；侧栏与内容卡保留可辨边界。
- 未覆盖：终端 ANSI 16 色、brand / 文件图标 artwork、逐级标题彩色；loading 动效的灰色 spinner / 边框仍是 DSH 原生。**首帧已覆盖**：Host 半部在 Client 加载前注入当前配色，Web 的 loading 页 / 首帧即为 Everforest，Electron 冷启动最多 1 帧原生色。详见 [docs/design.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/design.md) 与 [docs/reference/contrast.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/contrast.md)。

## License

MIT（本插件）。配色数据来自 [Everforest](https://github.com/sainnhe/everforest)（Copyright (c) 2019 sainnhe）与 [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（Copyright (c) 2023 FireIsGood），二者均为 MIT，署名见 [THIRD_PARTY_NOTICES.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/THIRD_PARTY_NOTICES.md)。
