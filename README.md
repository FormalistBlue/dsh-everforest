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
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.md#%E5%85%BC%E5%AE%B9%E6%80%A7"><img src="https://img.shields.io/badge/DSH-0.2.1--rc.3-7fbbb3?labelColor=333C43" alt="DSH 0.2.1-rc.3"></a>
  <a href="https://everforest.vercel.app/ports"><img src="https://img.shields.io/badge/Everforest-Ports-e69875?labelColor=333C43" alt="Everforest Ports"></a>
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

在 DSH 的插件管理页打开 **添加插件 → 安装第三方插件**（英文界面为 Add plugin → Install a third-party plugin），输入 `dsh-everforest` 安装；本地开发时也可以直接选择本仓库目录。或由 Agent 调用 `plugin_manager` 的 `install_bundle`（目标 `dsh-everforest`）。

> **升级提示**：Host 半部（`index.js` / `src/host-config.js`）的改动需要**重启 DSH** 才生效，仅刷新页面不够；0.3.0 升级必须先重启一次。只更新 npm 包但没重启时，新 Client 会退回 localStorage-only（选择仍生效、只是暂不写 Host），重启 DSH 后第一次加载会把本地缓存一次性播种到 Host。重启之后在设置页切换强度由 DSH 的 settings 服务写入 Host 配置，并在同一 profile 的浏览器间实时广播，无需再重启。

## 使用

- 打开 **Settings → Everforest**：顶部是「跟随系统 / 深色 / 浅色」外观控制，下面是 6 张色卡（深色 / 浅色各 3 档强度）。
- 选中即时生效；默认深色 Soft / 浅色 Hard。
- 色彩模式（中彩内容着色）自 2026-10-24 起**默认提供、没有设置开关**：聊天 Markdown 的 h1–h6 标题 / 强调文字 / 表格与会话状态行自动着色；它只注入作用域 CSS，不改变 token 层与配色数据，设置页也不再显示相关选项。
- 强度保存在当前 profile 的 **Host 配置**（`cordis.patch.yml` 的 `everforest` 行），登录同一 profile 的所有浏览器 / 窗口共享；本浏览器的 localStorage 只作为首帧缓存和旧宿主兜底。
- 点另一深浅色组的色卡会同时切换 DSH 外观（写入全局外观偏好）；「跟随系统」可恢复自动跟随。
- 同一 profile 下所有浏览器 / 窗口（含同一地址的多个标签页）的强度选择会实时同步。
- 「恢复默认」只重置深浅强度，不改写 DSH 的全局外观偏好。
- 中英文文案随 DSH 语言切换。

## 兼容性

- 目标 DSH **0.2.1-rc.3**（2026-10-24 复核；兼容范围自 rc.2 起）；`engines.dsh` 保持 `>=0.2.1-rc.2 <0.3.0-0`（rc.3 满足该区间，不抬高下限）。
- 0.2.1-rc.3 复核：内置 ui-theme 仍是同 8 张样式表 / 206 个颜色 token（提取 SHA-256 不变），rc.3 新增的「更多」菜单只使用既有 token；`configForms` / slots / `index-inject` / HMR 等集成点均无变化，无破坏性改动。
- 配色主体通过 `--dsw-*` / `--shiki-*` token 覆盖，不改组件样式；另有默认提供的色彩模式作用域 CSS（无设置开关）与一条全局 `::selection` 规则（`src/selection.js`，文字选中保色）。DSH 升级若 token 改名，缺失项退回原生配色（不会白屏）。
- 强度偏好走 DSH 官方的 settings / `configForms` 通道写入当前 profile 的 Host 配置（Host 半部的 `@deepseek-ai/schemastery` 由 DSH 运行时解析，不随包安装）；旧宿主上没有该通道时自动降级为浏览器 localStorage。
- 完整 token 清单见 [docs/reference/token-inventory.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/token-inventory.md)。

## 说明

- 配色数据取自 sainnhe 的 Everforest（6 套背景色阶）与 Everforest Enchanted（默认配对、header 色、UI 语义），见 [docs/reference/palette.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/palette.md)。
- 文字选中使用 Everforest 的 `bg_visual` 作底色，并保留文字自身颜色（语法色 / 链接色不会被统一）。
- 浅色档的正文表面向 `bg0` 提亮 25% 并做对比度守卫（正文 ≥ 4.5:1）；侧栏与内容卡保留可辨边界。
- 未覆盖：终端 ANSI 16 色、brand / 文件图标 artwork。逐级标题彩色在 DSH 没有对应 token，由默认提供的色彩模式用作用域 CSS 覆盖（token 层仍是单色标题）。**首帧已覆盖**：Host 半部在 Client 加载前注入当前配色（本浏览器缓存优先，缺失 / 非法时用 Host 配置兜底），Web 的 loading 页 / 首帧（含 loading 动效的 spinner 环与进度弧）即为 Everforest，Electron 冷启动最多 1 帧原生色。详见 [docs/design.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/design.md) 与 [docs/reference/contrast.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/reference/contrast.md)。

## 开发

- **运行时零依赖**：Host 半部 `import '@deepseek-ai/schemastery'` 由 DSH 运行时从自身安装解析，不随包安装。
- 仓库只声明一个 devDependency（`@deepseek-ai/schemastery`）供 `node --test` 与 CI 使用；首次跑测试前先 `npm install`。
- `npm test`（= `node --test`）、`npm run check`（palette / build / contrast 三项 `--check`）、`npm run build`（重建并提交 `client.js`）。
- `npm run build:dev`：生成本地调试用的开发构建——`client.js` 里额外带一个悬浮在主界面的 Everforest 面板，可直接切换外观（跟随系统 / 深色 / 浅色）与深/浅各 3 档强度，不必每次打开设置页。面板与设置页共用同一份状态（Host 配置 + 首帧缓存），面板位置与折叠状态保存在 `localStorage`，部署在 Client 端 HMR 接管时改动文件即热替换、否则刷新页面生效。
- **开发构建不能提交、也不能发布**：面板代码只由 `npm run build:dev` 打进产物（`src/dev-panel.js`，以及 `src/client-entry.js` 中 `// @dev-only:` 标记之间的段落），`npm run build` 恢复不含面板的发布构建；`npm run check`、CI 与 `npm publish` 的 `prepack` 都会拒绝停留在开发构建的 `client.js`，并提示先执行 `npm run build`。

## License

MIT（本插件）。配色数据来自 [Everforest](https://github.com/sainnhe/everforest)（Copyright (c) 2019 sainnhe）与 [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（Copyright (c) 2023 FireIsGood），二者均为 MIT，署名见 [THIRD_PARTY_NOTICES.md](https://github.com/FormalistBlue/dsh-everforest/blob/main/THIRD_PARTY_NOTICES.md)。
