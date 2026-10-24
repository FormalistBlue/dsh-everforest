# Changelog

`dsh-everforest` 的所有重要变更记录在此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：补丁版本只做配色修正、工程与文档修复，不改变 token/API 契约。

## [Unreleased]

### Added

- **工作区「当前会话」行显示效果（2026-10-24 用户反馈「选中的 tab 激活显示效果不明显，深色 / 浅色都不明显，
  同时要和已完成 / 待回答的颜色区分开」）**：DSH 把选中会话行与 hover 合画成同一条规则
  （`.wnFoaW_sessionRow:hover,.wnFoaW_selected{background:var(--dsw-alias-interactive-bg-hover)}`，0.2.1-rc.3 安装包核对），
  该 token 是 `bg5` 的 16% alpha、对侧栏只有约 2.6 L*，所以打开中的会话几乎找不到，也和 hover 无法区分。
  新增 `src/active-session.js`（纯 ESM）+ `src/client-entry.js` 的常驻样式表：只用稳定锚点
  `[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`，把选中行画成 palette1 的 `bg_blue`
  （与色彩模式给「待确认 / 已完成」行的 `bg_yellow` / `bg_green` 属不同色相、且复用 DSH business primary 的蓝色语义），
  再按「先保文本 4.5:1、再尽量可见」两步守卫：向 `bg0` 微调到正文达标，若离侧栏仍不足 4.5 L* 则向 `fg.blue`
  混合到 4.5 L* 或文本门槛先到为止。实测 light-hard `#DCECE9`(4.58:1) / light-medium `#DDEAE6`(4.52) /
  light-soft `#E6E8DB`(4.50，画布已贴 4.5 门槛、只保留色相) / dark-hard `#384B55`(5.39) /
  dark-medium `#3A515D`(4.94) / dark-soft `#3F5764`(4.51)。样式**常驻**、与色彩模式无关（导航可见性，
  不是内容着色；与 `selection.js` 同级；色彩模式自 2026-10-24 起也没有设置开关）。门禁：`tests/active-session.test.mjs`（8 项）、
  `scripts/check-contrast.mjs` 新增 G17 + 报告 §2g、`tests/integration.test.mjs` 注入/卸载断言；
  `docs/design.md` §15 记录方案与边界。

- **原生文本选区（`::selection`，2026-10-24）**：DSH 声明了 `--dsw-alias-bg-document-selection`，但
  176 张样式表里没有任何 `::selection` 规则消费它，文字选中长期是浏览器原生蓝底白字。新增
  `src/selection.js`（纯 ESM）+ `src/client-entry.js` 注入一条常驻 `<style data-plugin-css="dsh-everforest/selection">`：
  六档各一条规则，底色取当前变体的 `bg_visual`（light 三档统一 `#DED8DB`；dark hard/medium/soft
  `#4C3743` / `#543A48` / `#5C3F4F`），文字 `color: inherit` 保留元素自身颜色——代码语法色、链接色、
  色彩模式标题色在选中时都不会被统一成同一种墨色（与 Enchanted 的行为一致；第一版写死 `color: fg`，
  用户反馈「选中的文字颜色全部变成一样的」后改掉）。与色彩模式解耦（色彩模式自 2026-10-24 起已无开关，选区始终生效）；
  `--dsw-alias-bg-document-selection` 的 40% 透明语义未改。新增 `tests/selection.test.mjs`（4 项），
  `scripts/build.mjs` 的 `SOURCES` 与 `tests/integration.test.mjs` 的样式表计数同步；
  `docs/design.md` §16.2 记录方案与实测。

- **开发期调试面板（dev-only 构建，2026-10-24）**：`npm run build:dev` 打出的 `client.js` 额外把一块
  浮动 Everforest 面板挂到主界面（`shell.overlay`），可直接切换外观（跟随 / 深色 / 浅色）与
  深/浅各 3 档强度，免去反复打开设置页；面板可拖动、可折叠成圆钮，位置与折叠状态存 `localStorage`。
  面板与设置页共用同一个 store（`select` / `reset` / `setPreference`），写 Host 配置、
  首帧缓存、跨窗口广播和 DSH Appearance 的行为完全一致。面板**只存在于开发构建**：`src/dev-panel.js`
  与 `src/client-entry.js` 的 `// @dev-only:` 段由 `scripts/build.mjs` 在生产构建中剥离，`--check` /
  CI / `prepack` 拒绝停留在开发产物的 `client.js`；`npm run build` 恢复发布构建。DSH Client HMR
  轮询 bundle 产物，重新构建后无需刷新页面即热替换。新增 `tests/dev-panel.test.mjs`（16 项）与
  `tests/integration.test.mjs` 的 dev-bundle 用例，`docs/design.md` §14 记录方案与真机验收。

- **主题切换过渡（原型，2026-10-24 用户要求「先做一个出来看看效果」；同日第二轮改为聚光灯式切换，第三轮修掉浅→深结束闪白，第四轮去掉同色系软硬切换渐变）**：
  深/浅色切换改为 **View Transitions 圆形揭示（聚光灯）**：新主题快照在上层，从点击位置以
  `clip-path: circle()` 扩张揭示，旧主题快照留在底层（实现同 rspress 的外观切换，
  web-infra-dev/rspress#1270）。揭示方向统一为「新主题从点击点扩张」：镜像做法（旧主题在上层向点击点
  收缩）在 View Transition 拆除快照时，clip 动画结束与快照移除之间会整帧丢掉 clip，把旧快照无裁剪地
  画一帧；浅→深时旧快照正是浅色页，于是结束瞬间闪白（真机 screencast 实测 5 次复现 4 次）。只裁新快照
  在结构上不会闪错色：即使丢帧，露出的也是目标主题。选圆形揭示是因为颜色插值式过渡在深浅互换中途
  文字与画布等亮度（实测 50% 处 1.01:1，整页发灰），而圆形揭示只有移动边缘混合像素，正文全程可读。
  实现：`src/theme-spotlight.js`（伪元素样式表 + 控制器 + 指针原点跟踪 +
  `resolveSchemePreference`）与 `src/client-entry.js` 的接线；DSH 自带 Appearance 行通过在 ThemeRuntime
  实例上包装 `setTheme` 覆盖（插件卸载时还原），插件自己的色卡 / 外观控件在过渡回调内包住 change；
  OS 系统深浅色翻转与跨窗口广播无法在变更前拦截，保持瞬切（无发灰）。同深浅色内的强度切换（软/中/硬）
  为**瞬切**：180ms 颜色渐变已按要求移除，`src/theme-transition.js` 及其样式表、
  prepended `theme/change` 监听器、结束后的同值 token 重放和首屏动画守卫一并删除（全插件只剩 scheme
  切换有动画，注入的 `<style>` 从 4 个减为 3 个）。`prefers-reduced-motion: reduce` / 不支持 View
  Transitions 时一律瞬切。已知取舍：揭示时长 400ms、原点取最后一次 `pointerdown`；设置弹窗也参与快照，
  弹窗内的选中描边会在揭示结束后随 React 重渲染更新；Windows 原生标题栏 / 终端由页面快照覆盖，但原生
  窗口框架仍在揭示开始时切色。新增 `tests/theme-spotlight.test.mjs` 与 `tests/integration.test.mjs` 的
  聚光灯生命周期 / 瞬切用例（210 项全通过）；本次按用户要求先交付可目检原型，`docs/design.md`
  与 `docs/assessment.md` 的正式记录待验收后补。

### Changed

- **插件图标改为「鲸鱼 + 旧山脊松树」（2026-10-25 用户要求「不要最下面的五段色带，树木和山还是用以前的，去掉太阳，
  上面放绿色的鲸鱼」）**：`icon.svg` 去掉月亮与五段色带，只保留跃起的绿色鲸鱼（轮廓从用户提供的 1024×1024 插画中提取，
  `vtracer` 二值描摹成 256 画布路径约 1.6 KB，再缩放进 64 画布）与上一版图标的远景山脊 `#4D5960`、森林山脊 `#A7C080`、
  两棵松 `#293136`；山脊与松树整组下移 12 个单位，让原来的 52 底边正好落到 64，去掉色带后仍铺满圆角画框。文件 3.1 KB
  （远低于 256 KiB 上限），仍是自包含 SVG（无脚本、无外链），`package.json` 的 `icon` / `exports["./icon"]` / `files`
  与 `tests/integration.test.mjs` 的图标断言均无需改动；36px（插件卡片实际显示尺寸）目检鲸鱼、山脊与松树均可辨。

- **README / 市场预览换成 2 张真机截图（2026-10-24 用户决定「就用2张真实的就行了，不需要用整纵横6张」「不用裁剪，直接使用原图」）**：
  `README.md` / `README.en.md` 的预览从 6 张分档示意图表格改为 2 张真机完整窗口截图——深色 Soft（默认）与浅色 Hard（默认），
  对应 `.github/assets/everforest-dark-soft.png` / `everforest-light-hard.png`（1263×981，未裁剪）；删除其余 4 档旧示意图。
  仓库根 `screenshots.json` 同步由 6 项减为这 2 项（市场允许 1–8 张）；`tests/integration.test.mjs` 的 README 断言改为这 2 张，
  并新增 `screenshots.json` 与仓库图一致的校验；`docs/releasing.md` §8.4 同步。其余 4 档强度仍可在 Settings → Everforest 切换，
  README 说明保留。

- **色彩模式改为默认提供、移除设置页开关（2026-10-24 用户要求「把设置中的色彩模式这个选项去掉，作为默认提供的功能」）**：
  设置页不再有色彩模式区块（标题 / 说明 / `role="switch"` 开关 / 5 个强调色装饰片全部删除），
  中英 locale 键由 23 减到 18（删 `colorMode.title/desc/on/off/switch`，中英同步）。状态与持久化回到两个强度：
  客户端 state 为 `{ light, dark }`；localStorage payload 为 `{ version: 1, light, dark }`
  （`STATE_VERSION` 仍为 1，0.3.x 缓存同形沿用）；Host `Config`（`src/host-config.js`）只剩
  `light` / `dark` 两个 volatile 字段；迁移（seed）/ `isDefaultState` /「恢复默认」只涉及两个强度。
  **兼容性**：0.4.x 带 `colorMode` 的旧缓存仍合法（读取时忽略、不触发修复重写，下次写入自然丢弃）；
  旧 profile patch 里残留的 `colorMode` 键被 schemastery 忽略（未知键不报错、值不生效），插件不读也不主动
  unset，**无需手改 patch**。`<html>` 上仍写 `data-everforest-color-mode="on"`（现在恒为 `on`，作为作用域
  CSS 锚点，不再是开关状态）+ `data-everforest-light` / `data-everforest-dark`；token 层、24 个角色色值与
  34 条作用域规则零改动。dev-only 调试面板去掉色彩模式开关行与页脚「色彩模式 开/关」。版本号保持 0.4.0、
  不发布。`scripts/check-contrast.mjs` 报告文案同步（「默认提供、无开关」）并重新生成
  `docs/reference/contrast.md`；`docs/design.md` 新增 §13.9、`docs/assessment.md` 新增 §18 记录。

- **「待确认 / 待审批」会话行底色由红改黄（2026-10-24 用户反馈「红色就像是报错了一样，改成黄色试试看」）**：
  `src/color-mode.js` 的 `ROW_RAMP.warn` 由 `bgRed` 改为 palette1 的 `bgYellow`（done 行继续用 `bgGreen`），
  状态点仍是橙色 `fg.orange`（「等你处理」的语义色相不变）。浅色档的 `bg_yellow` 与暖奶油画布几乎同明度
  （约 1 L*），因此新增可见性下限 `ROW_WARN_SEPARATION = 3.5`：向 `fg.yellow` 以 1% 步长加深，到 3.5 L*
  或正文 4.5:1 门槛先到为止（`liftWarnFill()`，只作用于 warning 行）。实测 base/hover：light-hard
  `#FBEAC0`(4.69) / `#F9E6B5`(4.53)、light-medium `#F8E6BB`(4.53) / `#F8E6B9`(4.52)、light-soft
  `#F2E6C9`(4.51) / `#F2E6C7`(4.50，画布已贴门槛、只保留色相)。
  **同日第二轮（用户「深色档再亮/更黄一点」）**：palette 的深色 `bg_yellow` 是低饱和橄榄色、在浅色文字下
  亮度已到 4.5:1 上限，因此深色档反相——行底改为 `mix(fg.yellow, bgDim, 0.22)` 的亮琥珀，行内文字改用
  `--dsw-alias-label-primary-inverted`（= `bgDim`），三条 `body[data-ds-dark-theme]` 作用域规则让标题 /
  尾标（`[class*="_time"]`）/ 状态点一起换墨，浅色档保持淡黄底 + 深墨不变；深色档实测 base/hover：
  dark-hard `#B19A6B`(5.82) / `#B89F6E`(6.21)、dark-medium `#B39C6D`(5.47) / `#B9A170`(5.82)、
  dark-soft `#B49D6F`(5.04) / `#BAA272`(5.36)（括号内为深墨对比度）。hover 时展开的行尾操作按钮
  （「…」/ 归档 / 置顶）也一并改用深墨，避免在琥珀底上消失（用户反馈「hover 上去 icon 看不见」）。门禁：`tests/color-mode.test.mjs`
  快照 / 来源 / 方向 / 字面规则 / 「深色 warn 必须反相」更新，G13 按 scheme 选文字色继续守 4.5:1，
  `docs/reference/contrast.md` §2f 重新生成；`docs/design.md` §13.8.1 记录两轮取值与边界。

- **UI 强调色改用官方 accent（2026-10-24，用户目检确认）**：品牌 / 主按钮 / 链接 / 深潜标签 / 危险
  hover 等 15 个 token 从 Enchanted 的 `header-aqua` / `header-blue` 改为官方 `fg.aqua` / `fg.blue` /
  `fg.red`（`brand-primary`、`brand-primary-new-color`、`button-primary-fill/-hover/-dimmed`、
  `button-info-fill/-hover`、`link`、`label-primary-bluish`、`label-deep-diving(+shimmer)`、
  `interactive-bg-hover-accent/-danger`、`onboarding-accent`、`sidebar-nav-item-active-accent`），
  设置页色卡第 5 段同步改为 `fg.aqua`；`header-*` 只保留给 onboarding 渐变、shiki link 与浅色气泡染色。
  品牌前景对比度 dark 5.31 / light 2.91（原 3.48 / 3.13，仍高于 2.5 的品牌门槛）；`tests/tokens.test.mjs` /
  `tests/integration.test.mjs` / `tests/settings-page.test.mjs` 与 `docs/reference/contrast.md` 同步，
  `npm run check` 全绿；`docs/design.md` §16.1 记录。

- **适配 DSH 0.2.1-rc.3 复核（2026-10-24，无破坏性变更、无源码改动）**：本机 DSH Desktop 已自动更新到
  `0.2.1-rc.3`（安装包 `@deepseek-ai/dsh` 与 `dsh-desktop` 均为 rc.3）。对照安装包与
  `dsh-v0.2.1-rc.2...dsh-v0.2.1-rc.3` 源码 diff 逐项复核：ui-theme 仍是同 8 张样式表 / 206 个颜色 token
  （77 static + 107 alias + 11 specific + 11 shiki），安装包 `ui-theme/lib/client.js` 的提取结果与 0.4.0
  记录的 SHA-256 `882ea20f…` 一致（`token-inventory.json` 无需重新生成）；boot 页 spinner 环 / 进度弧仍取
  `--dsw-alias-border-l2` / `--dsw-alias-brand-primary`（构建 CSS 与 rc.2 逐字节相同）；色彩模式依赖的
  `[class*="markdown"]` / `[class*="fileLink"]` / `data-row-key^="session:"` / `data-state` 锚点在 rc.3
  构建中保持；settings / `configForms`（含 `writable: true`）、`engines.dsh` 预发布匹配
  （`includePrerelease: true`）与 `webserver/index-inject` 首帧 row API 均无变化。rc.3 新增的「更多」菜单
  （`ui-entry-customization`）与侧栏 / 右侧栏面板 pin 只使用既有 menu / interactive / label token，已在覆盖层内。
  **无代码改动**：`engines.dsh` 维持 `>=0.2.1-rc.2 <0.3.0-0`（rc.3 满足该区间，不抬高下限以免隐藏仍用 rc.2
  的用户）；仅把 README / design / assessment / releasing / token-inventory / contrast 的版本口径与复核记录改为
  rc.3。已知非阻塞上游小瑕疵：rc.3 右侧栏「更多工具」图标硬编码 `stroke="#A6B2C7"`，浅色档对比 1.76–2.04:1，
  属 DSH 自身字面量、不走 token，插件不做 DOM 特例。现有 `node --test` 全量通过，未改测试。

- **会话状态行改用 palette 原色（2026-10-24 用户反馈「深色模式下的绿色和红色都感觉有点不好看，
  去 palette.md 找点颜色试试」）**：「工作区」侧栏里「待确认 / 已完成未查看」会话行保持整行实色底
  （用户明确不要渐变、不要左侧 border），行底改为直接取 Everforest 官方 palette1 的 `bg_red` /
  `bg_green`，不再由强调色推导：dark `#493B40`/`#3C4841`（hard）、`#514045`/`#425047`（medium）、
  `#59464C`/`#48574E`（soft），light `#FFE7DE`/`#F3F5D9`（hard）、`#FDE3DA`/`#F0F1D2`（medium）、
  `#F6E4D2`/`#EBE8CB`（soft）；soft 档只在 `label-primary` 不足 4.5:1 时沿 `bg0` 方向微调（新增
  `readableRowFill()` 守卫）。hover 向对应 `fg` 强调色混 16% 后重新守卫（dark·soft 的 done 行因底色已贴
  门槛而几乎不变，已记录为边界）。角色仍 24 个、规则仍 34 条；OKLab 派生方案及其 `toOklab` / `fromOklab`
  辅助函数已移除。测试 `tests/color-mode.test.mjs` 19 项（行底 palette 来源 / 红绿方向 / hover 守卫）；
  `docs/reference/contrast.md` 已重新生成，G13 全绿。样张与方案见 `docs/design.md` §13.8。

- **设置页边框宽度统一（2026-10-24 用户截图反馈「everforest 里面的 border 宽度没有统一」）**：
  选中强度卡的描边实际是 2px（1px `border` + 1px inset `box-shadow`），而外观三卡、未选中卡片、
  色卡条、恢复按钮都是 1px（当时的色彩模式开关行同日随后移除，见 Removed）。现在 `.everforest-page` 只声明一个 `--everforest-border-width: .5px`
  （DSH 自带 `.5px solid` 卡片 / 输入框口径，DPR 1 下渲染为 1px 实色），页面内的 `border` 全部引用它；
  选中态只改 `border-color`、删除 inset box-shadow。`tests/settings-page.test.mjs` 新增「所有 solid 边框
  引用同一变量 / 只声明一次宽度 / 禁止 box-shadow」三项断言，`docs/design.md` 新增 §6.2 记录。

- **深色模式边框可见度修正（2026-10-24 用户反馈「设置界面里面的各种边框线条有点不明显」）**：
  DSH 的设置卡片 / 行 / 输入框统一用 `.5px solid` 画在 `bg2` 填充上，而 Everforest 深色 ramp 压缩
  （`bg0` → `bg5` 仅约 2.0:1），上游 45/60/75/90% 的 `bg5` alpha 落在自己的填充上只有 1.29:1，卡片描边
  融进页面。修正两处：深色边框墨色由 `bg5` 向 `grey1` 提亮 20%（`DARK_BORDER_LIFT = 0.2`），每档 alpha
  抬高一档（`l1/l2/l3/l4` = 60/78/90/100%，`border-l2-darkmode-thin` 30→45%）；浅色档完全不变（仍是
  Enchanted 的 45/60/75/90%）。`settings-card-stroke` / `button-ghost-active-border` /
  `onboarding-checkbox-border` 复用同一档位，设置页卡片、分隔线、输入框描边一起变清楚：dark·soft 卡片
  描边对自己的填充 1.29 → 1.52:1、对页面底 1.73 → 2.08:1。`tests/tokens.test.mjs` 钉住新色值并新增两道
  下限（卡片描边 / 填充 ≥ 1.45:1、描边 / 页面 ≥ 1.8:1），`docs/design.md`（§4 映射表 / 视觉修正记录 /
  §9 走查项）同步。

- **深色模式行内 code 芯片底色调整（2026-10-24 用户截图要求，参考 Everforest Enchanted）**：
  `--dsw-alias-markdown-inline-code` 在 dark 侧由 `bg_blue`（比 `bg0` 高一档的灰蓝，读成抬起的色块）
  改为以 `bg_dim` 为起点、向 `bg0` 提亮 30%（`DARK_INLINE_CHIP_LIFT = 0.3`；dark·soft 芯片
  `#2C343A` on 画布 `#333C43`，1.13:1），呈「比画布略深的凹陷代码底」；纯 `bg_dim` 的中间版本经
  真机目检偏深（用户二次反馈），故保留 30% 提亮。浅色档保持 `bg_blue`（淡薄荷）。色值仍由
  `src/tokens.js` 的 `inlineCodeSurface` 派生，`label-primary` 4.5:1 与色彩模式 `inlineCode` 3:1
  两道门槛重算后均通过；`docs/reference/contrast.md` 与 `docs/design.md`（§4 映射表 / 视觉修正记录）同步。

### Removed

- **设置页「色彩模式」区块与开关**（2026-10-24）：标题、功能说明、`role="switch"` 开关、当前 scheme 的
  5 个强调色装饰片，以及 `colorMode.title` / `desc` / `on` / `off` / `switch` 五个 locale 键（中英同步，
  键集 23 → 18）。
- **Host `Config` 的 `colorMode` 字段**：schema 只声明 `light` / `dark` 两个 volatile 字段；旧 patch 里
  残留的键被 schemastery 忽略（兼容、不主动清理），插件也不再写入或 `unset` 它。
- **dev-only 调试面板的色彩模式开关行与页脚「色彩模式 开/关」**：面板只剩外观与两个强度分组。
- **对比度报告里的旧口径**：`scripts/check-contrast.mjs` 生成的「可在设置页关闭 / 不随色彩模式开关 /
  关闭时零匹配」等表述随脚本改为「默认提供、无开关；`data-everforest-color-mode` 恒为 `on`，仅作
  作用域锚点」，`docs/reference/contrast.md` 由脚本重新生成（禁止手改）。

### Fixed

- **调试面板折叠后跑到左上角且点不出来（2026-10-24 用户反馈「点了一下最小化，然后他就跑到最左上角去了，
  然后就点不出来了」）**：面板的 `<style>` 原本写在展开态子树里，折叠时随展开树一起卸载，小圆钮退回成
  无样式按钮、落进 `shell.overlay`（click-through 层）的普通文档流左上角，并继承 `pointer-events: none`
  导致鼠标无法命中（UIA 的 Invoke 仍能触发，所以表现为「看不见又点不到」）。修复：样式表在展开/折叠
  两种状态下都渲染；`position: fixed`、`left/top`、`z-index`、`pointer-events: auto` 改为内联兜底，
  任何一次渲染丢样式都不会再逃逸或失去点击；折叠位置也统一走视口 clamp。`tests/dev-panel.test.mjs`
  新增回归断言（折叠态必须仍有样式表 + 内联结构性样式）。真机用鼠标完整走通
  展开 → 折叠（圆钮留在原位置、38×38 圆形）→ 再展开。

## [0.4.0] - 2026-10-23

次版本：新增**实验性「色彩模式」**（默认开启，可在设置页关闭）。开启后把 Everforest 调色板里此前未上场的强调色用到聊天
Markdown 内容与工作区会话记录的状态行。初版（用户目检选定「中彩」档并确认范围）覆盖 h1–h3 标题、
列表 marker、引用条 / 分隔线、表格表头色带与隔行斑马纹、任务列表 checkbox，以及会话记录「待确认」行
淡橙底 + 橙色状态点、「已完成未查看」行淡绿底 + 绿色状态点；用户验收初版后，参考 Obsidian
**Everforest Enchanted** 的 markdown 配色（同一上游：FireIsGood/obsidian-everforest-enchanted 的
`theme.css`，MIT）扩展为完整富文本角色——h1–h6 六色标题、strong + em 紫、行内 code 蓝、内部文件链接
aqua、删除线与已完成任务淡化、引用块淡底、表格行 hover、复选框蓝。默认配色与 0.3.0 逐字节一致：
色彩模式只注入一段作用域 CSS，**不改变 token 层**，开关关闭时所有选择器都不匹配。

### Added

- **色彩模式开关（实验性，默认开启）**：设置页新增「色彩模式」区块（`role="switch"` + `aria-checked`、
  当前 scheme 的 5 个强调色装饰片）；开关与两个强度一起写入当前 profile 的 Host 配置
  （`Config` 新增 `colorMode` 布尔字段，默认 `false`、标记 `.volatile()`），同一 profile 的所有浏览器共享。
  中英文案（`colorMode.title/desc/on/off/switch`）随 DSH 语言切换。
- **色彩引擎 `src/color-mode.js`**：`colorModeRoles()` 对 6 个配色变体实算 **24 个「中彩」角色色值**，
  全部由 `tokensFor()` 的表面值与 `resolvePalette()` 的强调色派生并做对比度守卫：
  - 标题 `h1–h6 = red / orange / yellow / green / blue / purple`（Enchanted 的逐级标题语义；h1–h4
    大号 / 加粗按 3:1，h5–h6 与强调文字同档）；
  - `strong` + `em` = `purple`（标题内 `color: inherit` 保留标题色）；行内 code 文字 = `blue`
    （落在 DSH 的蓝底芯片上，按芯片底色守卫）；内部文件链接 = `header-aqua`（外链仍用官方 link token）；
    `del` 与已完成任务 = `label-tertiary`（刻意弱化，不设门槛）；
  - 引用块 = aqua 左边框 + aqua 8% 淡底（另加右内边距 / 圆角）；表格表头绿色带 14%、斑马纹 6%、
    行 hover 10%；checkbox accent = blue；
  - 会话行「待确认」`orange` / 「已完成」`green` 混入侧栏底（12%，hover 18%）+ 状态点，
    状态点对 `bg0` 与侧栏两个表面都按 3:1 守卫；
  - 强调文字（h5/h6、strong/em、内部链接、行内 code）对可能落到的每个 markdown 表面（画布 / 表头带 /
    斑马纹 / 行 hover / 引用块淡底）≥ 3:1；`colorModeStyles()` 生成静态样式表：6 个自定义属性块
    （浅色 `body:not([data-ds-dark-theme])`、深色 `body[data-ds-dark-theme]`，强度由
    `html[data-everforest-light|dark]` 选择）+ 28 条元素规则（26 条变量驱动 + 2 条字面规则），
    共 34 条规则，全部以 `html[data-everforest-color-mode="on"]` 开头。
- **作用域**：只命中聊天 Markdown（`[class*="markdown"]`，排除 compact 推理变体）与会话树行
  （`[role="treeitem"][data-row-key^="session:"]:has([data-state=…])`，选中行不覆盖、hover 单独加深）；
  fenced code 块与外部链接保持既有 token 颜色，「运行中」不上色。
- **对比度硬门槛 G9–G16**：大号标题（h1–h4）/ 装饰 ≥3.0、彩色表面上的正文 ≥4.5、状态点对两个表面
  ≥3.0、角色色值合法性，以及**新增 G16**：强调文字（h5/h6、emphasis、内部链接、行内 code）对其可能
  落到的每个 markdown 表面 ≥3.0。3:1 而非 4.5:1 是刻意的——浅色档 Everforest 强调色按 4.5 守卫会
  混成墨色（颜色消失），Enchanted 同类文本约 2.6:1；正文 `label-primary` 仍保持 4.5:1。
  `docs/reference/contrast.md` 新增「色彩模式（中彩）」章节（§2f，24 角色表 + G9–G16 明细）。
- 测试：`tests/color-mode.test.mjs` 由 12 项增至 **17 项**（24 角色快照、G16 多表面守卫、字面规则、
  规则总数、CSS 作用域 / 颜色合法性）；全量套件在提交前由门禁复核。

### Changed

- `src/state.js`：state 变为 `{ light, dark, colorMode }`；localStorage payload 增加可选 `colorMode`，
  **`STATE_VERSION` 保持 1**（0.3.x 缓存缺字段视为 `false`、不算损坏、仍参与迁移；非布尔值按损坏处理）。
- `src/durable.js` / `src/host-config.js` / `src/client-entry.js`：Host 写入一次原子提交三个字段
  （`light` / `dark` / `colorMode`），「恢复默认」unset 三个字段；host 表单就绪前的选择继续排队补写；
  跨浏览器广播 / storage 事件比较也包含该 flag。`hostState()` 与首帧 boot payload **保持只含两个强度**
  （色彩模式只影响 Client 挂载后的内容层，不影响首帧 token）。
- **色彩模式改为默认开启（2026-10-23 用户要求）**：`DEFAULT_COLOR_MODE = true`（`src/state.js`）；
  Host `Config` 的 `colorMode` 默认值、localStorage 默认状态、`resetState` / 恢复默认、首帧缓存与设置页
  开关的默认态全部跟随。只有显式 `false`（用户拨过开关并已持久化）才关闭；0.3.x 缓存 / profile patch
  缺该字段时解析为开启。0.4.x 已写下的显式 `false` 继续保留（视为用户选择），需手动拨一次开关才开。
- **设置页文案精简 + 外观控件对齐 DSH（2026-10-23 用户截图复核）**：删除标题下的说明、外观当前状态说明、
  色彩模式实验性提示、页尾 Host / 缓存说明共 6 条解释性文案（中英同步删键：`intro`、
  `appearance.systemActive/fixed`、`colorMode.experimental`、`hint.scheme/storage`）；「外观」由
  `跟随系统 / 深色 / 浅色` 分段按钮改为 DSH 自带 Appearance row 同款的 `浅色 / 深色 / 跟随系统` 图标卡片
  （顺序、16×16 SVG path、`--dsw-radius-xl` 卡片、`--dsw-alias-border-l4` 边框、hover / 选中底色均对齐；
  唯一偏差：选中描边用 `--dsw-alias-brand-primary`，因为 DSH 原生 `--dsw-static-neutral-bluish-400`
  在 Everforest 浅色下与未选中边框几乎同色）。token 层与行为路径不变，README 保持原文案。
- 设置页「恢复默认」、README 中英、`docs/design.md`（§1 / §9 / §10 与 §13 重写为 24 角色）、
  `docs/assessment.md`（§6、§14 指针与新增 §15 富文本扩展决策）、`docs/reference/palette.md`
  （§5 语义映射 / 偏差、§6 派生色）同步；`package.json` `version` 0.4.0、`files` 增 `src/color-mode.js`。

### Notes

- **实验性边界**：色彩模式依赖 DSH 0.2.1-rc.2 的 Markdown 容器类名（`[class*="markdown"]`）与 `fileLink` /
  行内 code / 任务列表等结构，以及会话行 `data-row-key` / `data-state` / `role=treeitem` 等语义锚点；
  DSH 升级若改名，模式可能静默失效（token 层不受影响）。官方主题扩展点只支持 token 覆盖，选择器注入
  属本项目的实验性例外，升级 DSH 后需回归。
- **浅色档的「淡彩」取舍**：light 三档的彩色文字 / 装饰实测贴着 3:1 门槛；light·soft 的表格三档绿染会
  收敛为同一色，会话行底退化为侧栏底色（行底不可见，只有状态点还有颜色）。这是保留色相与可读性之间
  的已知取舍，真机目检时按此预期。
- **真实界面目检需要重启 DSH**（Host `Config` schema 变化），刷新页面只更新 Client 半部；未重启时色彩模式
  开关仍可用，但只写入 localStorage（旧宿主降级）。**默认开启后仍可完全关闭**：关闭时渲染与 0.3.0 逐字节一致
  （选择器零匹配、token 层未改）。**2026-10-23 已发布**：tag `v0.4.0`（commit `af4ec47`）→ publish run
  `39910070876` → npm `latest`（`dist.shasum` `96fbeac4516ad0baf63ac43141c8da239a1d1bcf`，带 SLSA provenance），
  GitHub Release 已自动创建；详见 `docs/releasing.md`。

## [0.3.0] - 2026-10-22

次版本：强度偏好的**真源**从浏览器 `localStorage` 迁到当前 profile 的 Host 配置（官方 settings / `configForms` 通道），
同一 profile 的所有浏览器共享；`localStorage` 降为首帧缓存与旧宿主兜底。Appearance（light / dark / system）仍归
DSH 自己的全局偏好，本插件不另存。

### Added

- **Host 侧持久化（`configForms`）**：Host 半部新增 `src/host-config.js`，导出
  `Config = Schema.object({ light, dark })`（`union(STRENGTHS)`、默认 `hard` / `soft`、两个叶子字段标记
  `.volatile()`）；`index.js` 导出 `Config` 并改为 `apply(ctx, config)`。DSH settings 服务把 volatile 字段投影成
  以 profile entry id（`everforest`）为键的表单；Client 用软注入 `ctx.inject(['configForms'], …)` 等待服务，
  再通过 `ctx.configForms.get('everforest')` 读写，写入落当前 profile 的 `cordis.patch.yml`：

  ```yaml
  - id: everforest
    name: dsh-everforest
    config:
      light: hard
      dark: soft
  ```

  同一 profile 的所有已认证浏览器共享同一份强度，不再按 origin 各存一份。
- **Client 侧持久化胶水**：新增 `src/durable.js`（`hasUserLayer` / `shouldSeed` / `stateFromHost` /
  `statesEqual` / set-unset ops / `bootHintState` 纯函数）；`src/state.js` 增加 `readStoredState()` 区分
  「有真实缓存选择」与「无 / 默认」；表单就绪前用户点的强度先排队（`queuedWrite`），服务到达后补写一次，
  不会被首次 adopt 覆盖或静默丢弃。
- **首帧 B 方案（缓存优先、Host 兜底）**：boot 注入脚本先读本浏览器 `localStorage['dsh-everforest/v1']` 缓存，
  缓存缺失 / 版本不符 / 字段非法时逐字段回退到 emit 时嵌入的 Host 值，再回退默认配对；解析结果写入
  `window.__EVERFOREST_BOOT__`，Client 首帧直接沿用，不再先画默认值。Web 每次 index 渲染重新生成脚本
  （Host 值实时读取），Desktop 的 boot payload 在 Host ready 时采集一次（运行中改档后重载窗口靠缓存兜底）。
- **0.2.1 旧值一次性播种**：`readStoredState()` 读到真实非默认强度、且 Host 文档尚无用户层时，Client 启动后把
  缓存值一次性写入 Host（一次 `mutate` 写两个字段、带观察到的 revision）；此后清空 localStorage，强度仍来自 Host。
- **`settings.configure({ auto: false })`**：声明本插件自己渲染设置页，DSH 不会在 Plugins 页再生成一份重复的
  自动表单；这是可选接线，settings 服务缺失时静默跳过并保持 localStorage 降级。
- **测试**：新增 `tests/durable.test.mjs`（`hasUserLayer` / 播种判定 / set-unset ops / 归一化 / `bootHintState`
  的纯函数）；`tests/host-boot.test.mjs` 增 Config 导出且 light/dark 均 volatile、非法值拒绝、emit 时读取、
  `settings.configure` 失败不致命、首帧 B 各分支与 `__EVERFOREST_BOOT__` 发布；`tests/integration.test.mjs`
  增假 configForms 生命周期（就绪采纳、播种、选择、恢复默认、写入被拒、旧宿主降级、延迟到达、跨浏览器广播、
  就绪前排队补写、卸载清理、manifest / Host import 守卫）；`tests/state.test.mjs` 增 `readStoredState`。

### Changed

- **持久化语义**：`localStorage` 从「唯一持久化」降为「首帧缓存 + 旧宿主兜底」，key 与数据格式不变（仍是
  `dsh-everforest/v1`）；同一 origin 的 `storage` 事件同步保留，作为没有 Host 广播时的兜底。
- **首帧强度来源**：从「只读 localStorage、缺失即默认」改为 B 方案（缓存 → Host → 默认）。
- **依赖口径**：运行时仍是零依赖——Host 半部 `import '@deepseek-ai/schemastery'` 由 DSH 运行时从自身安装解析，
  不随包安装；仓库改为声明一个 devDependency（`@deepseek-ai/schemastery`）供 `node --test` 使用，CI / publish
  在测试前执行 `npm install --no-package-lock --ignore-scripts --no-audit --no-fund`。capability 集合不变。
- **`cordis.patch.yml` 行成为契约**：entry id `everforest` 现在是 Client 定位 configForms 表单的键
  （`ENTRY_ID`）——Host `src/host-config.js` 与 Client `src/durable.js` 各持一份常量（bundle 不能 import
  schemastery 的 Host 模块），改名会静默退化为 localStorage-only；测试把 patch 行与两份常量一起钉住。
- **文案**：`locale/en.json` / `locale/zh.json` 的 `meta.description`、`src/locale.js` 的 `hint.storage`
  （EN / ZH，键集不变）改为 profile 级 Host 持久化、同 profile 浏览器共享、localStorage 仅首帧缓存、
  Host 半部更新需重启 DSH。
- **构建/发布**：`client.js` 因文案改动重新构建；`package.json` 版本 0.3.0、`files` 增加 `src/host-config.js`；
  `.github/workflows/ci.yml` / `publish.yml` 在 Test 前安装 devDependency，并更新「无依赖、无安装步骤」的旧注释。
- **文档**：README 中英、`design.md`（§1 / §2 / §3.2 / §5 / §7 / §8 / §9 / §10 / §11 与 §12 的 0.3.0 记录）、
  `assessment.md`（新增 §13 落地记录）、`releasing.md` 同步 0.3.0 口径。

### Fixed

- **换浏览器 / 换端口丢强度**：0.2.1 的跨窗口同步只在同一 origin 内生效；用浏览器打开 Host URL（端口每次随机）
  或换一个浏览器就是另一份值。现在强度以 Host 为真源，这些场景都读同一份。
- **首帧在「Host 有值、本机无缓存」时回退默认**：旧 boot 脚本只读 localStorage，新浏览器 / 清缓存 / 新端口
  的首帧会先画默认配对；B 方案改用 Host 值兜底。
- **设置页旧文案与实现不符**：`hint.storage` 不再声称「按浏览器 / 窗口保存」（EN / ZH 同步）。
- **「恢复默认」在一次强度写入在途时被静默丢弃**：真实 Host 写要等一次往返才 fold 进镜像快照，这期间 `user`
  仍是 `{}`；旧实现据此跳过 `unset`，随后在途的 `set` 落地并广播，把刚点的「恢复默认」覆盖掉（需再点一次）。
  现在 Client 记录在途写数量（`writesInFlight`），此时把 `unset` 排在表单控制器的写队列之后——控制器本身串行化
  写，最终状态落在继承的默认值上；`tests/integration.test.mjs` 用异步假 form 复现该窗口作为回归用例。

### Known limitations

- **Host 半部更新需重启 DSH**：升级到 0.3.0 后必须重启 DSH（只刷新页面不会重载 `index.js`）。**只换 npm 包
  不重启时**，新 Client 会因 Host 半部仍是旧版而退回 localStorage-only——选择仍生效、只是暂不写 Host；重启
  DSH 后第一次加载会把本地缓存一次性播种到 Host。之后修改 `config.light` / `config.dark` 由 settings 服务运行时
  写入，不需要再重启。
- **profile 级隔离**：强度按 profile 各存各的，不同 profile 之间不共享。
- **写入被拒绝时回读 Host**：home patch / `--patch` 覆盖等场景以 `mutate` 的 `response.ok === false` 表现——
  settings 服务回读后返回 `false`，Client adopt 远端值并 `console.warn` 一次，设置页不弹错（代码里的
  `writable: false` 守卫只是防御，0.2.1-rc.2 的 native provider 恒报告可写）。旧宿主（没有 settings 服务，
  或 schemastery 无 `volatile()`）下表单不出现，强度退回 localStorage（仍按 origin，旧行为）。
- **手改配置非法值分两种情况**：运行中把 `cordis.patch.yml` 的 `config.light` / `dark` 改成枚举外的值，Loader
  的 volatile-only 更新捕获解析错误 → Host 记 warning、保留旧引用、entry 保持 ACTIVE（主题不丢），改回合法值
  即热恢复；只有冷启动 / 重挂时才 `Config` 校验失败、entry 不激活（无主题），改回合法值或删除 `config` 后重启
  恢复。
- **一次性迁移与跨浏览器重置的取舍**：浏览器 A「恢复默认」清掉 Host override 后，若另一个从未升级打开的浏览器
  B 仍持有 0.2.1 的非默认 localStorage 缓存，B 下次加载会把这个旧值当作待迁移值**重新播种回 Host 一次**；之后
  B 的缓存与 Host 收敛，不会反复。0.3.0 接受该取舍（一次性迁移只以「Host 无用户层」为条件，无法区分「从未
  选择」与「刚被重置」）。
- **没有插件详情页设置卡片**：强度只在本插件自己的 Settings → Everforest 页修改；本插件声明自行渲染设置页
  （`settings.configure({ auto: false })`），DSH 不会生成第二份自动表单。
- **首帧可能短暂显示过期缓存**：若本浏览器缓存落后于 Host（例如另一个浏览器刚改过、本窗口未收到广播），首帧
  画缓存值，Client 拿到 Host 快照后立即 adopt 一次；随后缓存与 Host 收敛。

> 0.3.0 自动化验收：`node --test` **144/144 通过**（Node 22）、`npm run check` 全绿（palette / build / contrast，
> `client.js` 已重建为 v0.3.0 头）、`npm pack --dry-run` 清单齐全（含 `src/host-config.js`）。跨浏览器共享、
> Web / Desktop 首帧与重启行为的真机目检，以及发布，仍待按
> [`docs/releasing.md`](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/releasing.md) §5 完成。

## [0.2.1] - 2026-10-21

补丁版本，不改变对外契约。

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

[Unreleased]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/FormalistBlue/dsh-everforest/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/dsh-everforest/v/0.1.0
