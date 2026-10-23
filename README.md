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
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DSH%20Web-Plugin-a7c080?labelColor=333C43" alt="DSH Web plugin"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.md#%E5%85%BC%E5%AE%B9%E6%80%A7"><img src="https://img.shields.io/badge/DSH-0.2.1--rc.2-7fbbb3?labelColor=333C43" alt="DSH 0.2.1-rc.2"></a>
  <a href="https://everforest.vercel.app/ports"><img src="https://img.shields.io/badge/Everforest-Ports-e69875?labelColor=333C43" alt="Everforest Ports"></a>
</p>

<p align="center">提供深色 / 浅色 × 硬 / 中 / 软共 6 档配色，默认对齐 <a href="https://github.com/FireIsGood/obsidian-everforest-enchanted">Everforest Enchanted</a>（深色 Soft / 浅色 Hard）。</p>

<p align="center">0.4.0 起提供实验性「色彩模式」（默认关闭）：把 Everforest 里尚未上场的高饱和强调色用到聊天 Markdown 内容与会话记录状态行上。</p>

## 预览

| | 深色 Dark | 浅色 Light |
|:-:|:-:|:-:|
| **硬 Hard** | ![Everforest Dark Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-hard.png) | ![Everforest Light Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-hard.png) |
| **中 Medium** | ![Everforest Dark Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-medium.png) | ![Everforest Light Medium](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-medium.png) |
| **软 Soft** | ![Everforest Dark Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-soft.png) | ![Everforest Light Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-soft.png) |

> 预览图按各档实际配色渲染的界面示意。默认：深色 Soft / 浅色 Hard。

## 安装

在 DSH 的插件管理页打开 **Add plugin → Install a third-party plugin**，输入 `dsh-everforest` 安装；本地开发时也可以直接选择本仓库目录。或由 Agent 调用 `plugin_manager` 的 `install_bundle`（目标 `dsh-everforest`）。

> **升级提示**：Host 半部（`index.js` / `src/host-config.js`）的改动需要**重启 DSH** 才生效，仅刷新页面不够；0.3.0 与 0.4.0 升级都至少重启一次（0.4.0 的 Host `Config` 增加了 `colorMode` 字段）。只更新 npm 包但没重启时，新 Client 会退回 localStorage-only（选择仍生效、只是暂不写 Host），重启 DSH 后第一次加载会把本地缓存一次性播种到 Host。重启之后在设置页切换强度 / 色彩模式由 DSH 的 settings 服务写入 Host 配置，并在同一 profile 的浏览器间实时广播，无需再重启。

## 使用

- 打开 **Settings → Everforest**：顶部是「跟随系统 / 深色 / 浅色」外观控制，下面是 6 张色卡（深色 / 浅色各 3 档强度）。
- 选中即时生效；默认深色 Soft / 浅色 Hard。
- 强度保存在当前 profile 的 **Host 配置**（`cordis.patch.yml` 的 `everforest` 行），登录同一 profile 的所有浏览器 / 窗口共享；本浏览器的 localStorage 只作为首帧缓存和旧宿主兜底。
- 点另一深浅色组的色卡会同时切换 DSH 外观（写入全局外观偏好）；「跟随系统」可恢复自动跟随。
- 同一 profile 下所有浏览器 / 窗口（含同一地址的多个标签页）的强度选择会实时同步。
- **色彩模式（实验性，默认关闭）**：开启后 h1–h3 标题、列表 marker、引用条 / 分隔线、表格表头色带与隔行斑马纹、任务列表 checkbox，以及工作区会话记录的「待确认 / 已完成未查看」行底色与状态点会使用 Everforest 强调色；关闭时渲染与 0.3.0 完全一致。开关与强度写在同一份 Host 配置里，同一 profile 的所有浏览器共享。
- 「恢复默认」只重置深浅强度与色彩模式，不改写 DSH 的全局外观偏好。
- 中英文文案随 DSH 语言切换。

## 兼容性

- 目标 DSH **0.2.1-rc.2**；`engines.dsh` 为 `>=0.2.1-rc.2 <0.3.0-0`。
- 仅通过 `--dsw-*` / `--shiki-*` token 覆盖默认配色，不改组件样式；实验性「色彩模式」开启时才额外注入一段作用域 CSS（只命中聊天 Markdown 内容与会话记录状态行，且只在开关打开时生效），关闭时不匹配任何元素。DSH 升级若 token 改名，缺失项退回原生配色（不会白屏）；若组件类名 / DOM 结构变化，色彩模式可能静默失效——这是实验性边界，token 层不受影响。
- 强度偏好走 DSH 官方的 settings / `configForms` 通道写入当前 profile 的 Host 配置（Host 半部的 `@deepseek-ai/schemastery` 由 DSH 运行时解析，不随包安装）；旧宿主上没有该通道时自动降级为浏览器 localStorage。
- 完整 token 清单见 [docs/reference/token-inventory.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/token-inventory.md)。

## 说明

- 配色数据取自 sainnhe 的 Everforest（6 套背景色阶）与 Everforest Enchanted（默认配对、header 色、UI 语义），见 [docs/reference/palette.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/palette.md)。
- 浅色档的正文表面向 `bg0` 提亮 25% 并做对比度守卫（正文 ≥ 4.5:1）；侧栏与内容卡保留可辨边界。
- 未覆盖：终端 ANSI 16 色、brand / 文件图标 artwork；h4–h6 标题不分级着色（色彩模式只做 h1–h3）。色彩模式的标题 / 状态点色值是对调色板强调色做 3:1 对比度守卫后的派生值，浅色档会明显被压暗（偏「淡彩」）；表格色带与行底色是绿色 / 橙色混入背景的淡染。**首帧已覆盖**：Host 半部在 Client 加载前注入当前配色（本浏览器缓存优先，缺失 / 非法时用 Host 配置兜底），Web 的 loading 页 / 首帧（含 loading 动效的 spinner 环与进度弧）即为 Everforest，Electron 冷启动最多 1 帧原生色。详见 [docs/design.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/design.md) 与 [docs/reference/contrast.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/contrast.md)。

## 开发

- **运行时零依赖**：Host 半部 `import '@deepseek-ai/schemastery'` 由 DSH 运行时从自身安装解析，不随包安装。
- 仓库只声明一个 devDependency（`@deepseek-ai/schemastery`）供 `node --test` 与 CI 使用；首次跑测试前先 `npm install`。
- `npm test`（= `node --test`）、`npm run check`（palette / build / contrast 三项 `--check`）、`npm run build`（重建并提交 `client.js`）。

## License

MIT（本插件）。配色数据来自 [Everforest](https://github.com/sainnhe/everforest)（Copyright (c) 2019 sainnhe）与 [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（Copyright (c) 2023 FireIsGood），二者均为 MIT，署名见 [THIRD_PARTY_NOTICES.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/THIRD_PARTY_NOTICES.md)。
