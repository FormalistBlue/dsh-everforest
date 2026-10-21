# Changelog

`dsh-everforest` 的所有重要变更记录在此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：补丁版本只做配色修正、工程与文档修复，不改变 token/API 契约。

## [Unreleased]

计划作为 **0.2.1** 补丁发布（不改变对外契约）。

### Added

- **Windows 换行安全网**：新增 `.gitattributes`（`* text=auto eol=lf`）。Git for Windows 默认
  `core.autocrlf=true`，此前全新 clone 会把文本文件签出为 CRLF，直接导致 `node scripts/build.mjs --check`
  与 `tests/palette.test.mjs` 的 LF 断言失败；现在两种平台签出均为 LF。二进制资产标记为 binary，
  生成物在 GitHub diff 中折叠。
- **PR/推送 CI**：新增 `verify` workflow（`ci.yml`）：Ubuntu + Windows × Node 20/22/24 六格矩阵，
  跑 `node --test` 与 `npm run check`（palette / build / contrast 三项 `--check`）。仓库此前只有发布
  workflow，PR 零检查。
- **发布前门禁**：`publish.yml` 在 `npm publish` 之前跑同一组测试与检查，失败即中止发布；
  `workflow_dispatch` 手动发布也必须落在 `v<version>` 标签对应的提交上（此前可绕过 tag↔version 校验）。
- **自动 GitHub Release**：tag 推送（且发布成功后）用 `--generate-notes` 创建 Release，预发布版本自动
  `--prerelease`；已存在的 Release 会跳过（幂等）。
- **CHANGELOG.md**：回填 0.1.0 → 0.2.0 的发布记录。
- **跨窗口强度同步**：`client-entry.js` 监听 `storage` 事件，同一地址的其他标签页 / 窗口写入强度后，
  本窗口重读状态、重建 token 覆盖层并刷新设置页；`clear()` 按默认配对处理。此前多窗口各持旧值，
  后操作的一方会把对方选择写回（丢失更新）。
- **loading spinner / 边框着色**：boot token 6→8，新增 `--dsw-alias-border-l2`（spinner 环）与
  `--dsw-alias-brand-primary`（进度弧）；Web loading 页首帧即完整 Everforest。装包
  `dsh-web-frontend@0.2.1-rc.2` 的 CSS 里两者以 alias token 为主值、局部字面量只是 fallback，
  旧文档「局部字面变量、不可覆盖」的结论已作废并同步修正（README / design / assessment / releasing）。

### Fixed

- **启动自检假警告**：`SELF_CHECK_TOKENS` 移除了 `--dsw-focus-ring-color`。DSH 只在
  `html[data-input-modality=pointer] body :focus-visible` 上声明它，`getComputedStyle(document.body)`
  永远取到空值，导致每次启动都误报「token 可能被改名」。其余 5 个探针保持；新增 computed-style stub
  测试，锁定「探针可解析时不告警、缺失时才告警、focus ring 不再是探针」。
- **设置页注册失败后不再永久缺失**：`settingsUiMounted` 只在 `slots.register` 成功后置位，
  `settingsUiPrepared` 保证重试不重复注册字典 / 样式表；此前注册抛异常会把 flag 留在 true，
  `ctx.inject` 兜底被跳过，整段会话都没有设置页。
- **「当前选择」行的无障碍命名**：行容器补 `role="group"`，`aria-label` 才会进入无障碍树
  （裸 `<div>` 的 `aria-label` 会被忽略）；测试新增「所有 `aria-label` 必须有命名 role」的通用断言。
- **构建器静默丢导出**：`build.mjs` 拒绝一条语句多绑定的 `export const a = 1, b = 2`
  （原实现只把 `a` 导出到模块表，`b` 静默消失），并导出 `parseModule` 供负向测试；CLI 行为不变。
- **light·soft 聊天气泡变成白色**（用户走查「聊天气泡框变成白色的了」）：2026-10-19 的修复把
  light·soft 气泡翻到「抬起」方向，用近白冷调（`#ffffff` + 4% `header-aqua`)——在暖奶油画布上像一块
  白卡片。现改为白 → `fg.green` 13% 的淡鼠尾草纸 `#f0f3de`（文字 4.94:1），对画布明度差 1.06:1，
  以绿 vs 暖奶油的色相差异承担区分，气泡边界门槛对该档放宽到 1.05（其余亮色档 1.10 不变）。
- **diff 行底色看不清（深色）/ 看不出（浅色）**（用户走查：深色「浅绿色背景配白色的文字」；浅色
  「绿色背景太不明显」→ 二次走查「light·soft 还是偏浅」）：`FileDiff` 的 added/deleted 行底由
  `--dsw-alias-file-diff-*-bg` 绘制、代码文字继承 `label-primary`。深色档原直接取 `bg_green` `#48574e`
  （dark·soft），近白文字仅 4.52:1，行号 gutter 又向亮端提亮到 `#797e6e`（2.09:1）；浅色档原
  `bg0` → `bg_green` 混 45%，与代码画布只有 1.001–1.007:1，added/deleted 行与普通代码没有区别。
  现在：dark 行底向 `bg0` 收 40%（`#404d4a`，文字 5.23:1）、gutter 深色改向暗退（行号 3.97–6.30:1）；
  light 行底把 `bg0` 向绿 / 红墨色压到 4.5 门槛（hard / medium 与代码画布 1.15 / 1.10 明度差，文字仍
  4.56+），light·soft 因代码画布本身卡在 4.5:1，单独允许行底文字降到 4.1:1（`#e5e0b6` / `#f4d8c4`，
  与画布 1.09 / 1.10 明度差，2026-10-21 用户确认的可见性取舍）。新增 diff 行底文本硬门槛（light·soft
  4.1 例外）与「marker on gutter」报告项，报告见 `docs/reference/contrast.md` §2e / §4 / §6.3。

### Changed

- **文档口径**：README 中英、`design.md`、`assessment.md`、`releasing.md` 更新首帧 / spinner 覆盖面，
  并记录「恢复默认只重置强度、不改 DSH 全局外观偏好」（用户确认 2026-10-21）；`design.md` §12 新增
  2026-10-21 P1 打磨记录。
- **npm 页面链接**：`README.md` / `README.en.md` 中的 `docs/...`、`LICENSE`、`THIRD_PARTY_NOTICES.md`
  改用 GitHub 绝对 URL。`docs/` 不在 `files` 白名单内，npm 页面上的相对链接此前全部 404。
- **`prepack` 表述纠正**：`prepack` 实际是 `build.mjs -C`（只校验产物是否最新，不重新生成）。
  同步修正 `publish.yml` 注释、`docs/design.md`、`docs/releasing.md` 三处旧说法。

## [0.2.0] - 2026-10-19

### Added

- **首帧注入（Host 半部）**：`index.js` 通过 `webserver/index-inject` 注入 boot 脚本，在 Client 加载前
  用当前配色重绘 DSH 的 pre-Client loading 页面。Web 端 loading 页 / 首帧即 Everforest，Desktop 冷启动
  最多 1 帧原生色。配色与 Client token 层同源（同一个 `tokensFor()` 表），scheme 取自 ui-theme 解析后的
  boot 属性而非裸 `prefers-color-scheme`，强度取自本浏览器 localStorage。
- `tests/host-boot.test.mjs`：boot 行形状、JSON/HTML 安全、6×6 取值与 Client token 层一致、scheme 回退、
  幂等性。
- 英文 README（`README.en.md`）、6 张六档预览图、`screenshots.json`（市场条目素材）。

### Fixed

- **浅色聊天气泡与画布分离**：旧映射把用户气泡画成 `#FDFAEE`，与浅色 `#FFFBEF` 画布仅 1.02:1，气泡融进
  背景。light-hard/medium 改用 header-aqua 的鼠尾草色倾向并做对比度守卫（边界 1.17/1.14:1，正文 4.61/4.53:1）；
  light-soft 因 `bg0` 与正文已只有 4.66:1，改为略冷的近白抬起卡片（边界 1.15:1、正文 5.37:1）。
  新增「气泡 vs bg-base ≥ 1.10:1」硬门槛与报告章节。

### Changed

- 客户端入口 `src/index.js` 更名为 `src/client-entry.js`：npm 11 packlist 在根 `main` 为 `index.js` 且
  `files` 含嵌套文件时会把嵌套的 `src/index.js` 误打进 tarball；`files` 现在与运行时文件一一对应。
- `files` 白名单扩展：Host 半部直接 import 的 `src/color.js`、`src/palette.js`、`src/state.js`、
  `src/tokens.js` 随包发布（0.2.0 起 Host 半部不再是 461 字节的空壳）。
- 文档澄清 diff 区域没有语法高亮（按 shiki 验收会误判），并记录 Host 侧持久化暂缓、系统跟随边界。

## [0.1.2] - 2026-10-18

### Fixed

- **侧栏与内容区分离**：DSH 用 `--dsw-specific-sidebar-fill` 画侧栏列、Windows 标题栏条与内容卡边框，
  而内容卡是 `--dsw-alias-bg-base`（bg0）。两者此前都映射到 bg0（Enchanted 的扁平风格），浅/深色下窗口
  糊成一整块。侧栏改为 `mix(bg0, bg1, 80%)` 并走 readableSurface 对比度守卫（浅色略深的纸、深色略亮的
  面板，方向与原生一致），新增「侧栏 / bg-base ≥ 1.02:1」硬门槛，并把侧栏视为承载文本的表面
  （label-primary ≥ 4.5:1）。

## [0.1.1] - 2026-10-18

### Changed

- **发布链路切换**：首个通过 GitHub Actions + npm Trusted Publishing（OIDC）发布、带 SLSA provenance
  的版本。代码与 0.1.0 完全相同，只有版本号与 README 更新；0.1.0 是本机 `npm publish`（无 provenance），
  0.1.1 用来把 registry 上的版本换成可验证的 CI 产物。

## [0.1.0] - 2026-10-18

首个发布（本地 `npm publish`，无 tag、无 provenance）。

### Added

- **6 档配色**：Dark / Light × Hard / Medium / Soft，默认对齐 Everforest Enchanted（深色 Soft / 浅色 Hard）。
- **Client token 覆盖层**：206 个颜色 token（77 static + 107 alias + 11 specific + 11 shiki）+ 6 个辅助量，
  每条同时带 light / dark 值，跟随 DSH 自身 Appearance 开关；未覆盖项保持原生（字体、圆角、阴影、
  focus ring 等）。
- **设置页**（`settings.section`，id `everforest`，order 25）：6 张色卡、中英文案、按浏览器 localStorage
  持久化、恢复默认；**跟随系统 / 深色 / 浅色**外观控制（写 DSH 全局外观偏好 `ctx.theme.setTheme`，
  选过色卡后可用它恢复自动跟随，当前状态行内显示）；卸载时清理 override / style / locale / 事件监听。
- **对比度守卫**：`scripts/check-contrast.mjs` 对正文在各级表面上的 WCAG AA（≥ 4.5:1）等硬门槛做校验，
  生成 `docs/reference/contrast.md`；行内代码 chip 映射到 `bg_blue` 表面并纳入门槛。
- **零依赖工具链**：`scripts/build.mjs`（按模块 IIFE 打包 `client.js`，产物入库）、`palette.mjs`
  （从 `docs/reference/palette.md` 生成 `src/palette.js` 并做一致性校验）、`extract-theme-tokens.mjs`
  （从 ui-theme 构建产物抽取 token 清单）、`extract-asar-package.mjs`（零依赖读 Electron asar）。
- **文档**：`docs/design.md`（方案）、`docs/reference/palette.md`（色阶）、`docs/reference/token-inventory.md`
  （206 token 清单）、`docs/releasing.md`（发布与上架 runbook）、`THIRD_PARTY_NOTICES.md`。

[Unreleased]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/FormalistBlue/dsh-everforest/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/dsh-everforest/v/0.1.0
