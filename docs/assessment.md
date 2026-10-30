# 可行性评估与方案取舍

> 日期：2026-10-18 · 评估对象：DSH **0.2.1-rc.2**（Desktop，Windows）· 结论：**可行，采用路线 A**（见下）。
> 2026-10-19 更新：首帧 Host boot 注入已实现于 0.2.0（见 §3 / §5 / §9 / §12）；shiki / diff 口径修正。
> 2026-10-21 更新：0.2.1 的 P1 打磨落地（loading spinner boot token、跨窗口同步、设置页失败重试、无障碍、构建守卫），见 §5 / §11 与 [design.md](design.md) §12。
> 2026-10-22 更新：**0.3.0 Host 侧持久化落地**（`configForms`）：强度真源迁到当前 profile 的 `cordis.patch.yml`，同一 profile 所有浏览器共享；localStorage 降为「首帧缓存 + 旧宿主兜底」，0.2.1 旧值一次性播种，首帧改 B 方案。见 §3 / §5 / §7 / §8 / §9 与新增 §13。
> 2026-10-23 更新：**0.4.0 实验性色彩模式（中彩）落地**（初版默认关闭，同日按用户要求改为默认开启、token 层零差异）；用户验收初版（h1–h3 + 表格 + 会话行）后要求补齐 h1–h6 与参考 Enchanted 的富文本角色，扩展轮同日完成。见 §14 / §15 与 [design.md](design.md) §13。
> 2026-10-23 更新（设置页）：用户截图复核要求去掉解释性文案、外观改用 DSH 默认样式；已按 DSH `AppearanceRow` 对齐并删除 6 条文案，见 §17 与 [design.md](design.md) §6.1。
> 2026-10-24 更新：DSH Desktop 已升级 **0.2.1-rc.3**；对照安装包与 `dsh-v0.2.1-rc.2...dsh-v0.2.1-rc.3` 源码 diff 复核 token（提取 SHA-256 相同）、boot spinner、markdown / 会话行锚点、settings / `configForms` 与 `includePrerelease` 行为均无变化；`engines.dsh` 不抬高下限，文档目标改为 rc.3（逐项证据见 [design.md](design.md) §12）。
> 2026-10-30 更新：DSH Desktop 已升级 **0.2.1-rc.5**（rc.3→rc.4 只有 ACP stdout 修复，rc.4→rc.5 只有思考内容展示优化）；对照安装包复核 token（提取 SHA-256 与 rc.3 相同）、web-frontend 渲染 bundle（逐字节相同）、markdown / 表格 / 会话行锚点、settings / `configForms` / `locale` / `slots` / `index-inject` 集成点均无变化，真机复核 6 张样式表与 token 生效；`engines.dsh` 区间仍满足，文档目标改为 rc.5（证据见 [design.md](design.md) §12）。
> 2026-10-24 更新（色彩模式）：用户要求把设置里的「色彩模式」选项去掉、作为默认提供的功能——设置页区块 / 开关 / 5 个色片与 5 个 locale 键移除，状态、Host `Config`、缓存回到两个强度，旧 `colorMode` 缓存字段与 profile patch 残留键兼容忽略。见新增 §18 与 [design.md](design.md) §13.9。
> 2026-10-25 更新：**1.0.0 首个稳定版发布**（tag `v1.0.0` / npm `latest`）——0.4.0 之后未发布的批次作为稳定行为一起发布：UI 强调色改用官方 accent、会话状态行改 palette 原色、工作区当前会话行、原生文本选区、深浅切换聚光灯、dev-only 调试面板、图标与市场素材；token 计数与分类口径同日复核修正。见新增 §19 与 [design.md](design.md) §14–§17 / §10。
> 2026-10-27 更新：**1.1.0 发布**（tag `v1.1.0`）——「跟随系统」下 OS 深浅翻转也走聚光灯；README 重写「特性」并新增「功能实现」清单。见 §20。
> 2026-10-28 更新：**1.2.0 发布**（tag `v1.2.0`）——聊天表格边框与拖拽列宽（fill 表相邻两列重分配、宽表 Element 表格式滚动、最后一列可拖窄）。见新增 §21 与 [design.md](design.md) §18。

## 1. 结论

做一个 Everforest 主题插件是可行的，而且成本比最初 README 设想的「host-only + 注入 `<style>`」更低：

- **官方扩展点已经存在**：Client 的 `ctx.theme.overrideTokens(source, tokens)` 接受任意 CSS 变量名 → `{ light, dark }` 的映射，正好覆盖「6 套调色板 + 随深浅色切换」的需求。
- **不需要改 DSH 组件 CSS，也不需要构建工具链**：正文是一份普通 JS 的 Client 半部；Host 半部承载 bundle 行、`Config`（强度 schema）与一条首帧注入 row，并在 0.3.0 起承担 Host 侧持久化的声明端（见 §3 / §5）。
- **覆盖率高**：UI 主样式由 token 驱动，覆盖 195 个颜色 token 即可整站改色，另有 11 个 `--shiki-*` 接管代码块高亮。已知硬编码例外：终端空态 SVG（`#17191d` / `#fff`）、macOS darwin 渐变、品牌与文件类型图标 artwork、主题样式表自身的字面 token 值（可被覆盖）。**首帧 / loading 页**在 0.2.0 已由 Host 半部经 `webserver/index-inject` 注入调色板覆盖；2026-10-21 起 loading spinner 环与进度弧也走 boot token（见 §5）。
- **配色数据已有权威来源**：官方 `palette.md` 提供 6 套背景色阶；**主参考选定 Everforest Enchanted**（Obsidian 端口）——它的背景值严格等于官方 dark-soft / light-hard，并给出 `header-*` 自定义色与完整的 UI 语义映射。因此默认配对采用「深色 soft / 浅色 hard」，与 Enchanted 观感一致，其余四档强度作为可选。
- **已知缺口**：终端 ANSI 16 色（xterm 内置默认盘）、brand mark 固定图、macOS 专用渐变；逐级标题彩色 DSH 无对应 token，0.4.0 起由色彩模式的作用域 CSS 覆盖（2026-10-24 起默认提供、无开关）。都不影响主体观感。

## 2. 调研方法（可复现）

1. **运行时检查**（权威、无侵入）：`cordis_inspect_query` 查询 Client `Service`（`theme` 契约）、`Theme.listTokens`、`Slots.listSubTree`（`settings.section` 拓扑）、Host `Config`（包名与 `packageDir`）。
2. **安装包解包**：DSH Desktop 的代码在 `resources/app.asar` 内，shell 工具无法直接读取。用零依赖 Node 脚本解析 asar 头（`uint32@4` = header pickle 大小，JSON 从 `{"files"` 起、数据区自 `8 + headerSize` 开始），导出 `@deepseek-ai/dsh-client-ui-theme`、`-ui-layout`、`-ui-chat`、`-ui-sidebar-terminal` 四个包后统计（2026-10-18 审计复核，口径修正）：
   - `--dsw-*` 变量声明：**403** 个**唯一名**是 ui-theme 单包 8 张 sheet 的合计（含字体 / 圆角 / 阴影；不是四个包的声明总数，按出现次数约 600+）；颜色类 **77 static + 107 alias + 11 specific = 195**，另有 **11** 个 shiki 变量（9 个 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background`）。
   - alias 107 的构成：101 条在 `design-platform.css`，2 条在 `base.css`（settings-card），4 条在 `onboarding.css`。
   - light 侧 alias/specific 声明 **118** 条（其中 `design-platform.css` 单 sheet 112 条 = 101 alias + 11 specific）：**76 条直接 `var(--dsw-static-*)` + 7 条含 static 的 `color-mix`** 可自动跟随；**29 条字面量 + 6 条 alias 间引用（共 35 条）**必须显式处理（2026-10-25 复核修正；旧口径「74 + 5 + 28 + 5 = 112」按 design-platform 单 sheet 拆分，提取口径差 1 条分类边界、总数 112 一致，差 6 条来自 `base.css` 的 2 条 alias-ref 与 `onboarding.css` 的 4 条）。
   - `body[data-ds-dark-theme]` 重定义 **77 个 static + 104 个 alias**（28 literal / 5 alias-ref / 65 var-static / 6 color-mix；3 个 alias 无 dark 覆盖——`onboarding-accent`、`settings-card-fill`、`settings-card-stroke`，按级联沿用 light 声明，插件两侧仍显式给值。旧文档的「101」是 2026-10-18 审计时数字，更早的「105」属误记）。
3. **第三方插件先例**：`dshmarket`、`dsh-cost-meter`、`dsh-context`（安装于本机 profile）的清单与客户端代码，用于确认 `dsh.client.inject`、`settings.section`、`engines.dsh`、`dsh.compatibility` 的写法。
4. **配色数据核对**（详见 [`reference/palette.md`](reference/palette.md)）：
   - 官方 [palette.md](https://github.com/sainnhe/everforest/blob/master/palette.md) @ `85a86eb`：6 套背景色阶（dark/light × hard/medium/soft）与两套前景/强调色；
   - [在线调色板](https://everforest.vercel.app/palette) 抓取比对：页面内 100 个唯一色值与 palette.md 完全一致（扣除 light 色阶中 `bg_dim == bg2` 的重复）；
   - [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) `theme.css` @ `bdd7ac7`：默认配对（dark-soft / light-hard）、`header-*` 色、代码/链接/表格/选中/高亮的语义映射、light 选中色修正 `#DED8DB`。三者均 MIT。

## 3. 机制证据

| 事实 | 证据 |
|---|---|
| `overrideTokens(source, tokens)` 接受任意 CSS 变量名 | `theme` 服务契约；`validateOverrides` 只校验值为 `{ light, dark }` 两字符串，传裸字符串抛教学式错误 |
| 覆盖层以 **body 内联样式** 落地，优先级最高、自动按 scheme 取值 | `ui-layout` 的 `ThemePresenter.apply()`：`document.body.style.setProperty(name, value)`，apply 前先撤销上一批 `appliedTokens` |
| **覆盖层清理是调用方责任** | `ThemeRuntime.overrideTokens` 只把 layer 存进 root 级 `overrides` Map，不挂调用者 fiber；插件必须自己 `ctx.effect` 持有 disposer（`ctx.slots.register` 会自动挂 fiber，`ctx.locale.register` 不会） |
| 同 source 二次调用：整体替换、重新置顶，旧 disposer 变 no-op | `overrides.set(source, layer)` + `seq` 排序；disposer 先查 `overrides.get(source) !== layer` 再决定是否删除 |
| 覆盖 token 会出现在 `Theme.listTokens` | `ThemeRuntime.exportInspectTokens()` 把注册主题与 `overrides` 里的 token 名并入内置 14 条推荐清单（动态 token 描述为 “registered by the current Client composition”） |
| 内置 theme id = `light` / `dark`；`system` 只是 preference | `setTheme` 只接受已注册 id 或 `system`，未知 id throw；同值早退、不发事件 |
| `setTheme('light'/'dark')` 会持久写 Host Appearance 偏好 | `isThemePreference(id)` → `ctx.configForms.get('ui-theme').set(...)` → Host settings 文档（`$DSH_HOME/cordis.patch.yml`）；所有已认证浏览器共享，`system` 会被改成固定深浅色 |
| 注册第三方主题（`register`）**不能**持久化 | 设置 schema 仅 `light \| dark \| system`；第三方主题 id 不进 schema、不出现在 Appearance 色卡 |
| locale 内置 id 是 **`zh` / `en`**（不是 `zh-CN`） | `LOCALE_IDS = ['zh','en']`；`zh-CN` 只是 active=zh 时映射到 `<html lang>`；注册 `'zh-CN'` 会被 runtime 接受但永不命中查找链（静默回退英文） |
| 代码高亮是独立变量，可覆盖 | `ui-theme` 的 `shiki.css`：`:root{--shiki-token-constant:#1c7ed6; …}` + `body[data-ds-dark-theme]{…}`；`--shiki-foreground/background` 在 `:root` 引用 body 级 alias（级联上 guaranteed-invalid），必须显式给值。前端用 shiki 的 **css-variables** 主题（`variablePrefix: '--shiki-'`），`CodeBlock` 写 `className="shiki css-variables"` + 内联 `var(--shiki-background)` / `var(--shiki-foreground)`，token span 内联色来自 `var(--shiki-token-*)`；`--shiki-background` 在代码块卡片上会被 `--dsl-code-block-background`（默认 = `--dsw-alias-markdown-code-block`）的 `!important` 覆盖，两者都映射到同一 `codeSurface`，视觉一致 |
| Boot 注入是结构化契约，第三方 Host 半部可用 | `webserver/index-inject` 的 `IndexInjection` rows（`global` / `script` / `script-src` / `script-preload` / `style` / `html`，script/html 带 `placement: head \| body`）；`WebServer.collectIndexInjections()` 每次 emit、`renderIndex()` 先渲染 rows 再跑 `tapIndex`。Web 由 `dsh-host-frontend-static` 调用 `renderIndex`；Desktop 由 `dsh-desktop-host` 在 ready 时取 rows，经 `DESKTOP_IPC.boot` 交页面侧 boot 内核在插件 roster 前应用 |
| ui-theme 的 boot row 固定在前，且已解析外观 | Host 半部用 `{ prepend: true }` 监听；head style 写 `:root{color-scheme}` + `body{background-color:#fff/#151517;--dsh-boot-bg}`，body script 写 `data-ds-theme-source` / `data-ds-dark-theme`；boot 页 CSS `background:var(--dsw-alias-bg-base,var(--dsh-boot-bg,Canvas))`、文字 `var(--dsw-alias-label-*,fallback)` |
| 系统跟随的客户端链路 | `ThemeRuntime` 持有 `prefers-color-scheme` 监听，仅 `preference === 'system'` 时 publish；`ThemePresenter.apply()` 重设 `color-scheme`、`data-ds-theme-source`、body dark 属性与全部内联 token；Electron preload 把 `data-ds-theme-source` 同步到 `nativeTheme.themeSource`，Windows caption 探针读 `--dsw-specific-sidebar-fill` / `--dsw-alias-label-primary` 后回传 `windowsAppearance` |
| 设置页插槽可用，且三方插件已在用 | `Slots.listSubTree` 根 `settings.section` 的 occupants 含 `dsh-market`、`cost-meter`；注册项 `{ id, order, label }`，owner props `{ close }` |
| 设置页导航项图标不可定制 | `settings.section` 注册项只有 `id` / `order` / `label`，没有 icon 字段；第三方页面在设置导航显示 DSH 默认齿轮（`dshmarket` / `dsh-notify-me` 用 DOM 标记 + MutationObserver 自行换图标）；2026-10-30 起本插件同法只给自己那一行画松树图标（[design.md](design.md) §19） |
| 主题包由 Client 半部按包名加载 | `@deepseek-ai/dsh-client-modules`：`dsh.client.platform: 'web'` + `exports["./client"]`；入口格式唯一 `window.__ModuleLoader__.load({ id, factory(require) })`，id 必须等于包名；`dsh.client.inject` 只影响 bundle 到达顺序，不是服务注入 |
| `styles.insert` 不适用于已安装插件 | 它只是模型动态 Cordis 包 browser half 的闭包内建；npm 安装的 client bundle 需自己创建 `<style>`、打 `data-plugin` 标记，并在 `ctx.effect` cleanup 里移除 |
| 第三方 Client 半部可直接用 `ctx.theme` / `theme/change` | `dshmarket` 的 `src/client/index.ts`：`inject = ['slots','locale','theme']`、`themeStore.getSnapshot: () => ctx.theme.getTheme()` |
| Host `Config` 的 volatile 字段会被投影为设置表单 | `dsh-settings` 扫描活跃 profile 条目的 `Config`；Loader 对「仅 config 变化」走 volatile-only 更新——把新值原地 commit 到运行中的引用、不重挂插件（`cordis-plugin-loader/src/config/entry.ts` 的 `volatileOnly` / `commitVolatile` 分支）。非法值分两种：**运行中**解析失败被捕获 → Host warning、保留旧引用、entry 保持 ACTIVE（改回合法值热恢复）；**冷启动 / 重挂**校验失败 → entry 不激活 |
| `ctx.configForms.get(entryId)` 可读写第三方 entry 的表单 | `dsh-client-ui-settings` 的 `ConfigForms.get` 返回 `ConfigFormController`：`getSnapshot()` / `subscribe(listener)` / `set(field, value)` / `unset(field)` / `mutate(ops, expectedRevision)`；快照含 `status` / `value` / `base` / `user` / `revision` / `writable`；写入失败会回读（`recover`）并以 `false` 返回；`settings.configure({ auto: false }, ctx.fiber)` 可声明自动表单由插件自己渲染 |
| `@deepseek-ai/schemastery` 由 DSH 宿主提供 | 同生态参考包（`@nonamelego/dsh-catppuccin`）的 Host 半部直接 `import Schema from '@deepseek-ai/schemastery'`，只写 devDependency；本仓库沿用该口径，运行时零依赖不变 |

## 4. 路线对比与决策

| 路线 | 说明 | 结论 |
|---|---|---|
| **A. Client 半部 + `overrideTokens`** | 官方扩展点；任意 CSS 变量；自动双 scheme；卸载还原（disposer 挂 `ctx.effect`）；无构建依赖 | ✅ **采用** |
| B. Host-only + `webServer.tapIndex` 注入 `<style>` | 能做（token 样式表可被同优先级后置规则覆盖），但要自己写两套 `body` 规则、与内联变量博弈、卸载不干净、拿不到 `theme/change` | ❌ 放弃 |
| C. `register()` 注册主题 + Appearance 集成 | 设计上就不支持三方主题持久化，还要和内置 Appearance 行抢状态 | ❌ 放弃 |

补充：Host 半部保留，因为 bundle 需要一个插件行来承载 `package.json` 的 `dsh.client` 声明与 Plugin Manager 中的显示信息（标题 / 描述 / 图标 / 启停）；0.2.0 起它还是首帧调色板的注入入口（`webserver/index-inject`，见 §3 / §5）。

## 5. 决策记录

| 决策 | 结论 | 影响 |
|---|---|---|
| 变体数量 | **6 套**：Dark / Light × Hard / Medium / Soft | 深浅色两组各自保存强度；色卡分「深色 3 张 + 浅色 3 张」，点击即切到对应深浅色并应用该强度 |
| 配色数据源 | **主参考 Everforest Enchanted**（默认配对 dark-soft / light-hard、UI 语义映射；`header-*` 色自 2026-10-24 起只保留给 onboarding 渐变 / shiki link / 浅色气泡 / 色彩模式内部链接）；6 套背景色阶取自官方 `palette.md` | 默认观感与 Enchanted 一致；另外四档强度来自官方色阶；UI 强调色改用官方 accent（见 §19）。数据表、commit 快照与偏差记录见 [`reference/palette.md`](reference/palette.md) |
| 配置入口 | **直接做设置页**（`settings.section`），不依赖 Appearance 改造 | 需要自建状态存储与组件；0.3.0 起强度另经 Host `Config` 持久化（见下），设置页仍是唯一编辑入口 |
| 色卡交互（2026-10-18） | 点另一深浅色组的色卡时**同时调用 `ctx.theme.setTheme(scheme)`** 立即预览 | 会把用户 Appearance 偏好实打实写进 Host 设置（所有已认证浏览器共享，`system` → 固定深浅色）；设置页文案必须说明 |
| 偏好持久化（2026-10-18，**2026-10-22 被 0.3.0 取代**） | ~~localStorage（key 带版本号）~~ → 真源改为当前 profile 的 Host 配置；localStorage 降为「首帧缓存 + 旧宿主兜底」 | 0.2.1 时逐 origin 生效（Desktop 固定 origin 可跨重启，浏览器打开 Host URL 因端口随机不跨重启，与 DSH「Host 偏好跨浏览器共享」不同）；0.3.0 起同一 profile 所有浏览器共享，见下与 §13 |
| 跨窗口同步（2026-10-21） | 监听 `storage` 事件：同 origin 其他窗口写入后重读状态、重建覆盖层并刷新设置页 | 修复「多标签页各持旧值、后操作者把对方选择写回」的丢失更新；0.3.0 起 Host 广播是主路径，`storage` 只作没有广播时的兜底 |
| 恢复默认范围（2026-10-21） | 只重置深浅强度，不改 DSH 全局外观偏好 | 用户确认；Appearance 是 DSH 的全局 Host 偏好，插件页的「恢复默认」不应代改 |
| 兼容范围（2026-10-18） | `engines.dsh = ">=0.2.1-rc.2 <0.3.0-0"` | DSH 安装前与装载 profile 时都会强制；排除 0.3 及其预发布，避免 token 改名后半残 |
| 首帧闪动（2026-10-18） | 0.1.0 接受 loading/首帧为 DSH 原生色，0.3.0 再评估消除 | 首帧底色来自 Host boot 注入的字面 CSS；`dsh.client.immediately` 只用于 prefetch，不能依赖。**实际在 0.2.0 已由 Host boot 注入消除**（2026-10-21 spinner 补齐），见下方首帧注入行 |
| 首帧注入（2026-10-19） | **Host 半部监听 `webserver/index-inject` 追加 body script row**，在 Client 加载前写 boot 调色板；Web 首帧即 Everforest，Desktop 接受最多 1 帧原生色 | 8 个 boot token 与 `tokensFor()` 同值（2026-10-21 起含 spinner 环 / 进度弧）；写 body 内联变量（不用 `!important`），presenter 首次 apply 覆盖 |
| Host 侧强度偏好（2026-10-19） | ~~暂缓，先不做~~ → **2026-10-22 已落地（0.3.0）** | 0.2.1 的暂缓理由（第三方条目是否被 serve 需 spike、异步读取、跨浏览器事件）已被实现与集成测试覆盖；见下「2026-10-22 决策」与 §13 |
| **Host 真源（2026-10-22）** | 强度真源 = 当前 profile 的 `cordis.patch.yml` 中 `everforest` 行 `config`；Host `Config` 两个 volatile 叶子字段，Client 软注入 `ctx.inject(['configForms'])` 后经 `formsCtx.configForms.get('everforest')` 读写 | 同一 profile 所有浏览器共享、重启保持；写入被拒 / 旧宿主降级 localStorage；多 profile 各存各的 |
| **首帧 B 方案（2026-10-22）** | boot 脚本「缓存优先 → Host 值兜底 → 默认」，解析结果写 `window.__EVERFOREST_BOOT__` 供 Client 首帧沿用 | 解决新浏览器 / 清缓存 / Web 随机端口首帧画默认值的问题；Desktop 的 boot payload 只采集一次，缓存比它新 |
| **0.2.1 旧值迁移（2026-10-22）** | Host 无用户层 + 本地缓存非默认 → 启动时一次性播种到 Host；Host 已有用户层不覆盖 | 升级不丢旧选择；清 localStorage 后仍以 Host 为准 |
| **设置页声明（2026-10-22）** | `settings.configure({ auto: false })` 声明自动表单由本插件渲染 | DSH 不会在 Plugins 页生成重复的强度表单；强度只能在本插件 Settings → Everforest 修改 |
| **设置入口与导航图标（2026-10-22）** | 保留独立设置页，**不做** Appearance / General 快捷入口（`settings.general.item` 官方槽可用，但行内拿不到跳转设置分区的官方 API，只能做成重复控件）；导航图标**标为待做**，等 DSH 官方给 `settings.section` 加 `icon` 字段，0.x 不做 DOM 改写 | 用户确认；导航项沿用默认齿轮，功能不受影响；后续若上游加字段再补图标 |
| shiki / diff 口径（2026-10-19） | 修正：shiki 只覆盖**代码块**三处（聊天气泡 / 工具输出 / 文件预览）；diff 走 `file-diff` / `code-diff` token | 文档与验收清单同步；不再按「diff 有语法高亮」验收 |
| **UI 强调色（2026-10-24）** | 品牌 / 主按钮 / 链接 / 深潜标签 / 危险 hover 等 15 个 token 由 Enchanted `header-aqua` / `header-blue` 改为官方 palette `fg.aqua` / `fg.blue` / `fg.red`；`header-*` 收起为装饰用途 | 用户目检选定；浅色品牌前景 3.13 → 2.91 是唯一负向变化、用户接受；链接对比反而提高（见 §19） |
| **会话状态行配色（2026-10-24）** | 「待确认 / 待审批」行底由 `bg_red` 改 `bg_yellow`（用户反馈红色像报错），行底直接取 palette1 的 `bg_yellow` / `bg_green`；深色档反相为亮琥珀 + 深墨文字 | 替换 §14 / §15 的强调色推导；浅色档 `bg_yellow` 与画布近同明度，加 3.5 L* 可见性下限（见 §19） |
| **当前会话行 / 文本选区（2026-10-24）** | 两张**常驻**样式表：工作区选中会话行恒为 `bg_blue`（`[aria-selected]` 锚点 + 文本 / 可见性两步守卫）；`::selection` 取各档 `bg_visual` 且 `color: inherit` | 都属导航 / 选区可见性，与色彩模式解耦；「与 0.3.0 逐字节一致」的口径不再成立（见 §19） |
| **深浅切换过渡（2026-10-24/25）** | 跨深浅切换用 View Transitions `clip-path` 圆形揭示，只裁**新**主题快照；同深浅强度切换 / OS 翻转 / 跨窗口广播瞬切；包装 DSH `ThemeRuntime.setTheme` 以覆盖自带 Appearance 行 | 颜色插值 50% 处 1.01:1 发灰、镜像揭示浅→深闪白均被否决（见 §19） |
| **1.0.0 口径（2026-10-25）** | 0.4.0 之后未发布的批次作为**首个稳定版**发布；`engines.dsh` 维持 `>=0.2.1-rc.2 <0.3.0-0` | 升级 0.4.0 → 1.0.0 需重启一次 DSH；回滚无需清理 profile patch（见 §19 / [`releasing.md`](releasing.md)） |
| 发布目标 | **npm 发布** | 需 display 元数据（`meta.title` / `meta.description` + 图标）、`engines.dsh`、`files`/`exports` 白名单、LICENSE + THIRD_PARTY_NOTICES、README 截图 |
| 包名 | `dsh-everforest`（2026-10-18 查询 npm registry 未占用，发布前复核） | — |

> 关于持久化的复核轨迹：2026-10-19 的结论是「链路存在但暂缓」——DSH 的设置/表单链路已确认（Host `settings.describe()` 只投影带 `.volatile()` 字段的活跃 profile 条目；客户端 `ctx.configForms.get(entryId)` 提供 `value/base/user/revision/writable` + `set/unset/mutate`；写入经 settings 服务落 profile `cordis.patch.yml` 并在所有已认证浏览器间广播），但当时本插件 Host 条目 `status: absent`、第三方条目是否被 serve 无先例、异步读取会让主题晚于首帧。**2026-10-22 复核结论：链路可用，已落地 0.3.0**——Host 半部声明 `Config` 后条目被 serve（`tests/integration.test.mjs` 用假 configForms 固化契约），首帧用 B 方案（缓存优先、Host 兜底）不再依赖 Host 读取时序；localStorage 降为缓存并用旧 key 播种 Host。Appearance 偏好仍由 `setTheme` 写入（见上表色卡交互）。

## 6. 覆盖矩阵

| 区域 | 覆盖方式 | 状态 |
|---|---|---|
| 主背景 / 分层表面 / 浮层 | `--dsw-alias-bg-*`、`--dsw-static-neutral-bluish-*` | ✅ 设计覆盖 |
| 文字三级 / 弱化 / 反色 | `--dsw-alias-label-*` | ✅ |
| 边框 / 分隔 / 焦点环 | `--dsw-alias-border-l*`、`--dsw-alias-state-business-primary` | ✅（含 7 条边框类字面量，含旧文档漏掉的 `border-inverted*`） |
| 品牌 / 主按钮 / 链接 | `--dsw-alias-brand-primary`（=`aqua`，官方 accent；2026-10-24 起，原 `header-aqua`）、`--dsw-alias-link`（=`blue`，原 `header-blue`） | ✅（另需显式覆盖 `label-primary-foreground` / `brand-text` / `button-primary-hover` / `-dimmed`） |
| 状态色（成功 / 警告 / 错误 / 进行中） | `--dsw-alias-state-*`（`green` / `yellow` / `red` / `blue`） | ✅ |
| 侧栏 / 气泡 / 输入框 / selector / settings 卡片 | `--dsw-specific-*`（侧栏 = `bg0` → `bg1` 80% 混合 + 对比度守卫，保留列边界；其余 Enchanted 平铺/层级风格）、`settings-card-*`（alias 引用，自动跟随） | ✅ |
| 菜单 / 浮层材质 | `--dsw-menu-surface-fill`、`--dsw-alias-menu-group-header-fill`、`--dsw-menu-backdrop-filter`（非颜色，保持默认）；`--dsw-specific-menu` 是 alias 引用自动跟随 | ✅（字面量，需显式） |
| 滚动条 | `--dsw-alias-scrollbar-*` 实际引用 `--dsw-static-neutral-200/300`（light）与 `700/600`（dark），随 static 映射自动跟随 | ✅ |
| diff（代码差异） | `--dsw-alias-file-diff-*`（字面 rgb）/ `code-diff-*`（static 引用，自动）；diff 是逐行底色 + marker，**不做语法高亮** | ✅ |
| 文档预览 | `--dsw-alias-bg-document-preview` / `label-document-preview`（alias 引用，自动） | ✅ 自动 |
| 代码块语法高亮 | 9 个 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background`（共 11 个，全部显式）；作用于聊天气泡 / 工具输出 / 右侧文件预览三处 `CodeBlock` | ✅ |
| 首帧 / loading 页 | Host 半部经 `webserver/index-inject` 追加 body script，在 Client 加载前把 boot 调色板写成 body 内联 token（scheme 读 ui-theme 已解析值；强度按 B 方案：本浏览器缓存优先 → Host 值兜底 → 默认，结果发布到 `window.__EVERFOREST_BOOT__`）；Web 首帧即 Everforest，Desktop 最多 1 帧原生色；loading spinner / 边框已由 boot token 覆盖（2026-10-21） | ✅ 0.2.0 覆盖（spinner/边框 0.2.1 补齐；强度 B 方案 0.3.0） |
| 逐级标题颜色 | Enchanted 的 h1–h6 各一色；DSH 无逐级颜色 token | ⚠️ 默认层不覆盖（非目标）；0.4.0 起由色彩模式（作用域 CSS；2026-10-24 起默认提供、无开关）为 h1–h6 分级着色，见 §14 / §15 / §18 |
| 原生文本选区 | DSH 声明了 `--dsw-alias-bg-document-selection` 但无 `::selection` 消费者；常驻 `::selection` 样式表按六档取 `bg_visual` 底色、`color: inherit` 保留元素自身颜色 | ✅ 2026-10-24（design.md §16.2） |
| 工作区当前会话行 | 选中与 hover 合画成同一 token（对侧栏约 2.6 L*）；常驻样式表用 `[role="treeitem"][data-row-key^="session:"][aria-selected="true"]` 画 palette `bg_blue` + 文本 / 可见性两步守卫 | ✅ 2026-10-24（design.md §15；light·soft 只保留色相） |
| 深浅切换过渡 | 跨深浅切换经 View Transitions `clip-path: circle()` 从点击点揭示（只裁新快照）；同深浅强度切换 / OS 翻转 / 跨窗口广播瞬切 | ✅ 2026-10-24/25（design.md §17；无 View Transitions / reduced-motion 瞬切） |
| 终端 | 底色 / 字色 / 光标跟随 token；ANSI 16 色为 xterm 内置默认盘（DSH 只传 bg/fg/cursor，且 `minimumContrastRatio: 4.5` 会自行校正）；OSC 4/10/11 不受主题控制 | ⚠️ 部分 |
| brand mark / 文件类型图标 / 图片 | 固定 artwork（含终端空态 SVG 字面色） | ⚠️ 不覆盖 |
| macOS 侧栏 / 标题栏渐变 | `ui-layout` 内联硬编码（仅 darwin） | ⚠️ Windows 无影响 |

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 内部 token 名随 DSH 升级改名 | 部分区域退回原生蓝灰 | `engines.dsh` 限版本（安装前 / 装载时都强制）；启动自检（读关键 token 的 computed 值判断是否存在）；缺 token 不报错、只退化 |
| 对比度回归 | 文字 / 按钮可读性下降 | 建立对比度检查表（正文、二级、边框、brand 白字、diff、状态色），逐页走查；主按钮前景用 `bg0` 而非白色 |
| 覆盖面「半官方」 | 可能被未来 DSH 版本收紧 | 只用 `ctx.theme` 公开服务 + 文档化 token 优先，内部 token 集中在 `src/tokens.js` 单文件便于替换 |
| ~~持久化只在单 origin~~ **已解决（0.3.0）** | 0.2.1 换浏览器 / 用浏览器打开 Host URL 后回到默认强度 | 强度真源改为当前 profile 的 Host 配置（`cordis.patch.yml`），同一 profile 所有浏览器共享；localStorage 只作首帧缓存与旧宿主兜底 |
| Host 侧持久化的前置条件 | 旧宿主 / 被 home patch 或 `--patch` 覆盖的 profile 没有可用的 configForms → 写入失败 | 以 `mutate` 的 `response.ok === false` 为准：回读 Host 并以远端值为准、warn 一次，设置页不弹错；旧宿主 / `unavailable` / schemastery 无 `volatile()` 时降级 localStorage。`writable: false` 守卫只是防御（native provider 恒为 `true`，不可达） |
| 一次性迁移与跨浏览器重置 | 浏览器 A 恢复默认清掉 Host override 后，仍持有 0.2.1 非默认缓存的浏览器 B 下次加载会把旧值再播种回 Host 一次 | 已知取舍（0.3.0 接受）：之后 B 的缓存与 Host 收敛、不反复；消除它需要 per-browser 一次性标记或版本 / 时间戳判定（§13 后续） |
| Host 半部更新需重启 DSH | 升级 0.3.0 后只刷新页面不生效，用户以为持久化坏了 | README / CHANGELOG / releasing §5 明确写「0.3.0 升级需重启一次」；运行中改强度不再需要重启 |
| 手改 profile patch 成非法强度 | 运行中：Host 记 warning、保留旧引用、entry 保持 ACTIVE（主题不丢）；冷启动 / 重挂：entry 不激活（无主题） | 运行中改回枚举值即可热恢复；冷启动情况改回合法值或删除 `config` 后重启恢复 |
| 缓存与 Host 短暂不一致 | 另一个浏览器刚改过、本窗口未收到广播时，首帧画缓存值 | 首次 Host 快照就绪后 adopt 并回写缓存，只切换一次；属可接受的首帧级过渡（见 design.md §7） |
| 设置页插槽 / configForms 属内部契约 | DSH 改版可能调整 `settings.section` 或 `ConfigForms.get` 的形态 | 与 `dshmarket`/`cost-meter` 相同的设置页用法；configForms 走 `ctx.get` 可选读取、读取失败降级 localStorage；注册失败时降级为「无设置页、默认配对（深色 Soft / 浅色 Hard）」，不影响主题生效 |
| 覆盖层残留 | 插件停用后颜色不还原 | disposer 必须挂 `ctx.effect`（已写入 design §5）；验收项「停用后 body 内联变量消失」 |
| 首屏闪动 | 冷启动先看到 DSH 原生配色，再切 Everforest | 0.2.0 已由 Host boot 注入覆盖：Web 首帧即 Everforest；Desktop 窗口在 load 后才 show、rows 由页面侧在 IPC 后应用，接受最多 1 帧原生色；loading 动效的 spinner / 边框自 0.2.1 起也随 boot token 着色 |
| boot 注入残留 | 插件停用 / Client 半部加载失败时，页面保留启动调色板 | row 只写 presenter 也会写的 body 内联 token（Client 正常时首次 apply 必覆盖）；停用后 row 在 Host 重启 / 下次 index 渲染消失；Client 失败时保留到本页结束（可接受，README/design 已标注） |
| 常驻样式表 / 导航图标依赖 DSH DOM 锚点 | `aria-selected` / `data-row-key` / `::selection` / markdown 容器、设置导航按钮的 `[role="dialog"] nav button` 与按钮文本等锚点随 DSH 升级改名后，色彩模式 / 当前会话行 / 文本选区 / 设置导航图标会静默失效（token 层与页面不受影响） | 只用 a11y / data 契约锚点；每次 DSH 升级回归（rc.3 / rc.5 已复核）；单项失效只影响对应样式（导航图标回退默认齿轮），最坏可回退为停用插件（见 §19） |
| 包装 DSH `ThemeRuntime.setTheme` / `publish`（聚光灯） | 上游方法形态变化或其它插件也包装时行为叠加；跨窗口广播无法在变更前拦截 | 仅跨深浅走过渡、其余原样透传；`system` 跟随的 OS 翻转走 `publish` 包装（§20），广播仍瞬切；卸载按「原方法是否自有属性」还原；无 View Transitions / reduced-motion / 重入同步执行（见 §19 / §20） |
| `setTheme` 改写全局外观偏好 | 用户「跟随系统」被改成固定深浅色，且跨浏览器共享 | 已决策接受；设置页文案说明；恢复默认只重置强度、不改回 system |
| 版本判定文档互相矛盾 | 可能误判兼容策略 | 以 app-boot / plugin-manager 的行为为准（已实测代码路径：`semver.satisfies(..., { includePrerelease: true })`）；包内 `dsh-package-manifest` README 的「不强制」说法已过时 |
| 设置导航无图标 | 第三方页显示默认齿轮，观感不统一 | **2026-10-30 已解决（仅本插件行）**：DSH 仍无 `icon` 字段，改用 DOM 标记 + MutationObserver 给自己那一行画松树图标（同 `dshmarket` / `dsh-notify-me`），失效自动回退默认齿轮；其它第三方页仍显示默认齿轮（design.md §19） |
| 第三方插件兼容别名桥基于猜测名 | 猜错的名字不生效；未来 DSH 采纳同名 token 时可能被我们的内联值遮蔽 | 只写 DSH 未声明的名字（首次 apply 用 `getComputedStyle` 探测并跳过）、别名不得与真实 token 重名（测试对齐 token-inventory）、值直接拷贝真实 token 跟随 6 档与深浅；失效只影响对应插件页面，上游修好后删条目（design.md §20） |
| Enchanted 的平铺背景 | DSH 部分表面依赖明度差，平铺后可能层次不清（**已发生**：Windows 下侧栏 / 标题栏 / 内容卡同色，列边界消失） | 已按 `design.md` 开放问题 5 落地修正：保持 `bg0` 主底，侧栏单独取 `bg0` → `bg1` 80% 混合 + 对比度守卫，并新增「侧栏边界 ≥ 1.02:1」硬门槛；其余层级仍用 `bg1`/`bg2` |
| `header-*` 色不随强度变化 | 硬/软档的背景亮度差较大时，Enchanted 的常量 header 色对比度可能不足 | 6 档逐页对比度检查；不达标则按背景亮度小幅修正并回写 `reference/palette.md` |

## 8. 工作量

| 阶段 | 内容 | 估算 |
|---|---|---|
| 0.1.0 | 包骨架 / 构建脚本 / 6 套调色板 / token 映射表 / 覆盖层应用 / 设置页 / 持久化 / 本地安装验证 | **2–2.5 天** |
| 0.2.0 | 全页面对比度走查与修正 / shiki 调色与口径修正 / 中英文案 / 图标 / README 截图 / **首帧 boot 注入** / 系统跟随收尾 / npm 发布 / 兼容范围实测 | **2.5–3 天**（首帧注入约 1 天，含测试与双端实测） |
| 0.3.0 | **Host 侧偏好持久化（`configForms`）**：Host `Config`（volatile light/dark）、Client 读写 / 采纳 / 迁移播种、首帧 B 方案、localStorage 降级为缓存、文案 / CI / 发布元数据 | **约 1 天**（不含跨浏览器 / 双端人工目检） |

> 0.4.0 / 1.0.0 为多轮用户目检驱动的批次（2026-10-23 与 2026-10-24/25），未逐日统计工作量；范围与验证记录见 §14–§19。

## 9. 实现前待验证清单（2026-10-18 审计后状态）

| # | 项 | 状态 |
|---|---|---|
| 1 | `settings.section` 注册后导航项与页面实际渲染 | **源码已证可用**（`dshmarket` 现网用法 + slot 契约含 ownerProps `{close}`）；剩真机确认导航出现、label 随中英文切换、停用后消失 |
| 2 | localStorage 在 Desktop / 浏览器的可用性 | **源码已证**：Desktop Electron 主窗口 origin 固定 `dsh-app://app`（标准安全协议 + 默认持久 session），跨重启应保持；浏览器打开 Host URL 时端口每次随机（`--port 0`），不跨重启。**0.3.0 起它只是首帧缓存 / 旧宿主兜底**，跨浏览器持久化由 Host 配置承担；剩真机「选强度 → 换浏览器 / 重启 → 仍在」与「清 localStorage 不丢强度」确认 |
| 3 | `overrideTokens` 的 source 是否被钉为包名 | **假设不成立**：已安装 bundle 走普通 cordis ctx，`source` 由插件自己传（无强制、无校验）；façade 钉名只发生在模型动态 Cordis 包。同 source 替换 / 旧 disposer no-op / 校验规则源码已证；剩真机确认停用后内联变量消失 |
| 4 | `engines.dsh` 的安装 / 激活判定 | **已解决**：安装前（plugin-manager）与装载 profile 时（app-boot，`includePrerelease: true`）都强制；`>=0.2.1-rc.2 <0.3.0-0` 在本机通过。不兼容时安装被拒 / 已安装 bundle 被跳过并打印警告 |
| 5 | `--shiki-*` 生效表面 | **口径已修正（2026-10-19）**：shiki 只作用于**代码块**三处（聊天气泡 / 工具输出 / 右侧文件预览的 `CodeBlock`）；diff 不做语法高亮，走 `file-diff` / `code-diff` token。注入路径源码已证（前端 shiki css-variables 主题 + 内联 `var(--shiki-*)`）；剩真机逐处目检 |
| 6 | 默认配对与 Enchanted 一致（dark soft `bg0 #333C43` / light hard `bg0 #FFFBEF`） | 文档数据自洽；核对 body 内联 `--dsw-alias-bg-base`（或 Client 生效后的 computed `background-color`）。**不要用首帧阶段的 `body{background-color}` 字面值**——首帧由 Host boot row 决定，`--shiki-background` 之类被 `--dsl-code-block-background` 覆盖的 token 同理要按有效 token 校验 |
| 7 | 6 档强度 × 关键前景色的对比度检查记录 | 实现期工作项（`node` 脚本算 WCAG 对比度） |
| 8 | 首帧闪动 | **已实现并自动测试（0.2.0；0.3.0 改 B 方案）**：Host boot row 与 Client token 同值、缓存优先 / Host 兜底 / 非法值回退、`window.__EVERFOREST_BOOT__` 发布由 `tests/host-boot.test.mjs` 覆盖；Web 首帧与 Desktop 冷启动（原生色 ≤1 帧）已由用户真机确认通过（2026-10-22） |
| 9 | 覆盖 token 是否出现在 `Theme.listTokens` | **源码已证**（`exportInspectTokens` 并入 override 层 token 名）；已由用户真机确认（2026-10-22），作为安装后自检手段 |
| 10 | `client.js` 改动后的生效路径 | 已由用户真机确认（2026-10-22）：Plugins 页停用→启用（Host 重新快照 bundle）或重启 Host；单纯刷新页面预计不会换 bundle 字节。**Host 半部（`index.js` / `src/host-config.js`）改动需要重启 Host 进程**才生效（`Config` 注册与首帧 row 在启动期装载）；运行中改强度走 settings 通道，不需要重启 |
| 11 | Host boot row 的 JSON / HTML 安全与顺序 | **已由测试覆盖**：row 是纯 JSON、无 `</script`、脚本幂等、无 `!important`；Host 值再按枚举校验并做 JSON / U+2028 / U+2029 转义；顺序依赖 ui-theme 的 `{ prepend: true }`（源码已证） |
| 12 | `settings` / `configForms` 对第三方 entry 可用性 | **已解决（2026-10-22，0.3.0）**：Host `Config` 的 volatile 字段被投影为表单、`ctx.configForms.get('everforest')` 提供读写与订阅（源码 + 集成测试契约）；`settings.configure({ auto: false })` 让 DSH 不再生成重复自动表单。剩真机「选强度 → patch 出现 config → 换浏览器 / 重启仍在」与写入被拒降级确认 |
| 13 | 常驻样式表（色彩模式 / 当前会话行 / 文本选区 / 聚光灯）的注入、卸载与锚点 | **已由测试覆盖（1.0.0）**：`tests/integration.test.mjs` 断言常驻样式表共 4 张、含设置页 5 张且卸载后清空；锚点 / 取值由 `color-mode` / `active-session` / `selection` / `theme-spotlight` 各自单测钉住；真机目检见 §19 |

> **2026-10-22 真机目检**：用户确认 0.3.0 真机目检通过（按 [`releasing.md`](releasing.md) §5 清单：导航与设置页、跨浏览器共享 / 重启保持、0.2.1 迁移播种、首帧与「Host 半部需重启」等）；上表各「剩真机 / 待真机」项视为已确认（未逐项记录细节）。

## 10. 参考

- 配色数据：[sainnhe/everforest](https://github.com/sainnhe/everforest)（MIT）、[Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（MIT，主参考）、[在线调色板](https://everforest.vercel.app/palette)（校色）
- 本项目整理的数据表：[`reference/palette.md`](reference/palette.md)
- 本机插件先例：`dshmarket`（`settings.section` + `ctx.theme` 用法）、`dsh-cost-meter`（`dsh.compatibility` 写法）、`dsh-context`（`engines.dsh` + 双半部结构）
- DSH 实现：`@deepseek-ai/dsh-client-ui-theme`（`ThemeRuntime`、token 样式表、shiki）、`@deepseek-ai/dsh-client-ui-layout`（`ThemePresenter`）、`@deepseek-ai/dsh-client-ui-workspace`（会话行 `data-row-key` / `aria-selected` 锚点）
- 深浅切换过渡：View Transitions API（`document.startViewTransition` + `clip-path` 圆形揭示），实现参考 [web-infra-dev/rspress#1270](https://github.com/web-infra-dev/rspress/pull/1270)（MIT）

## 11. 2026-10-18 实现前审计

审计方式：三位审计员只读取证（本机 asar 内的包源码 + 公开仓库 tag `dsh-v0.2.1-rc.2` 交叉 + 已安装第三方插件实现 + `cordis_inspect_query`），结论已并入本文件、`design.md`、`reference/palette.md` 与 `README.md`。要点：

**结论**：技术路线（Client 半部 + `overrideTokens`）成立，无否决项；修正的是实现细节与文档口径。

**已确认正确**：`overrideTokens` 契约（任意 CSS 变量、`{light,dark}` 校验、同 source 替换并置顶、旧 disposer no-op、发 `theme/change`）；ThemePresenter 把 token 以 body 内联变量落地、按 scheme 取值、先撤旧批；`ThemeSnapshot.active.colorScheme` 可用于当前深浅色判断；`settings.section` 动态注册可用；`__ModuleLoader__.load({id,factory})` 是唯一入口格式且 id 必须等于包名；`Theme.listTokens` 会列出覆盖 token。

**已修正的错误假设**：
- locale 内置 id 是 `zh` / `en`（旧文档写 `'zh-CN'`，会被接受但静默回退英文）；
- 覆盖层 disposer **不会**随插件 fiber 自动清理，必须挂 `ctx.effect`（旧伪代码只置空变量）；
- `styles.insert` 只是模型动态 Cordis 包的内建，已安装 client bundle 要自己注入 `<style>`（带 `data-plugin`）并在 effect 清理；
- `dsh.client.inject` 只影响 bundle 到达顺序，不是服务注入；服务依赖写作模块导出的 `inject`；
- `dsh.client.immediately` 在本版本 module system 里没有可观察作用，不能用来论证首屏不闪；
- `setTheme('light'/'dark')` 会持久写 Host Appearance 偏好（跨浏览器，`system` 会被改固定）——已决策接受并写入设置页文案；
- Desktop 的 WebView origin 不是 `file://`，而是固定的 `dsh-app://app`；Host HTTP 端口每次启动随机；
- `engines.dsh` 在本版本**会**被强制（与安装包内 `dsh-package-manifest` README 的旧说法相反）；
- token 统计口径：403 是 ui-theme 单包唯一名；dark alias 为 101（非 105）；shiki 为 9 + 2；79/33 的分类需按 74+5 / 28+5 表述；
- 「除 mask 黑白外无硬编码」不成立：终端空态 SVG、首帧 CSS、darwin 渐变、artwork 等为例外（其中首帧 CSS 已于 0.2.0 由 Host boot 注入覆盖）；
- `static` 色阶不能「按明度一一对应」，需要插值 / 混合公式；
- 文档选中色要保留 40% 透明语义（`color-mix`），不能直接给实色；
- light 选中色 `#DED8DB` 上游只用于 light · hard，其余两档是本项目外推（已在 palette.md 标注）。

**环境**：本会话 sandbox 的 pwsh 曾因 Windows ACL 受限令牌 DLL 初始化失败（`0xC0000142`）完全不可用；切换 Full access 后恢复。本机 node 24.21.0 / pnpm 11.28.5 位于 Desktop 运行时目录（`dsh-runtimes/dsh-primary-runtime/dependencies`）；`plugin_manager` 的读操作可正常调用。

## 12. 2026-10-19 首帧注入 / 口径修正 / 0.2.0 收尾

**决策（用户确认）**

- shiki / diff 口径修正接受：shiki 只覆盖代码块三处，diff 走 diff token（无语法高亮）。
- Desktop 首帧接受「最多 1 帧原生色」，不追求绝对 0 帧。
- Host 侧强度偏好持久化**先不做**（暂缓）。→ **2026-10-22 已由 0.3.0 落地，见 §13**。
- 点另一深浅色组色卡即固定全局外观的 UX 保留。

**已实现**

- Host 半部 `index.js`：监听 `webserver/index-inject`，追加一条 `{ kind: 'script', placement: 'body', text }`；`createBootScript()` 从 `tokensFor()` 生成 6 个变体的值表，脚本读 ui-theme 已解析的 scheme + localStorage 强度，写 8 个 boot token 的 body 内联变量（2026-10-21 起含 spinner 环与进度弧）。
- `package.json`：版本 0.2.0；`files` 增加 Host 半部运行时 import 的 `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js`。
- 测试：`tests/host-boot.test.mjs`（row 形状、JSON/HTML 安全、6×6 与 Client token 同值、默认/损坏存储回退、固定深浅色 + 相反 OS、ui-theme 缺失回退、storage 抛错、幂等）；集成测试新增「Host 半部 import ↔ `files` 覆盖」核对。
- 2026-10-19 追加视觉修正：浅色聊天气泡与画布融为一体（旧映射 1.02:1）→ sage tint / light·soft 近白抬起卡片，新增「气泡 vs bg-base ≥ 1.10:1」硬门槛与单测（见 [design.md](design.md) §12 / [`reference/contrast.md`](reference/contrast.md) §2d）。
- 文档：本文件 §1/§3/§5/§6/§7/§8/§9/§11 更新；[design.md](design.md) §1/§2/§4/§5（新增「首帧注入」）/§7/§8/§9/§10/§11 更新 + §12 实现记录；README 中英与 `src/tokens.js` 顶部注释同步。

**证据补正**

- `dsh.client.immediately` 在本版本前端只用于 **prefetch**（`manifest.plugins.filter(p => p.immediately)`），不是「无作用」，也不是减闪手段。
- Electron 首帧注入走 `DESKTOP_IPC.boot` → 页面侧 boot 内核应用，**不需要 `tapIndex`**；`tapIndex` 只是 raw HTML escape hatch。
- boot 页实际消费 `var(--dsw-alias-bg-base, …)` / `var(--dsw-alias-label-*, …)`，所以 boot 脚本写 body 内联变量即可覆盖 loading 页底色与文字；spinner 环 / 进度弧同样以 alias token 为主值、局部字面量只是 fallback，因此 2026-10-21 把 `--dsw-alias-border-l2` / `--dsw-alias-brand-primary` 加入 boot token 即覆盖（旧文档「局部字面变量、不可覆盖」的结论已作废）。
- Windows 原生标题栏由 preload 探针在 body 属性/style 变化后回传 `windowsAppearance`；系统深浅色翻转会重跑，不是盲区（启动首帧兜底灰 → 插件生效后换色，属同类 1 帧级过渡）。

**残余（人工项）**：Web 首帧截图、Desktop 冷启动录屏（≤1 帧）、三处代码块与 diff 目检、系统跟随全链路走查（OS 切换 / DSH Appearance / 插件按钮 / Windows 标题栏）、全站视觉走查与 README 真机截图。另：Desktop 欢迎 / 登录窗口是 shell 独立文档，只跟随 light/dark，不走 `index-inject`（可接受边界）。

## 13. 2026-10-22 0.3.0 落地：Host 侧持久化（`configForms`）

**背景与决策**

0.2.1 的强度偏好只存在浏览器 `localStorage`：同一 profile 换浏览器、或用浏览器打开 Web Host（端口每次随机）就回到默认；0.2.0 起首帧由 Host boot 注入覆盖，但注入脚本本身也只读 localStorage。2026-10-19 因「第三方 Host 条目是否被 settings 服务 serve 无先例、异步读取让主题晚于首帧」暂缓（见 §5 注）。2026-10-22 复核 DSH 0.2.1-rc.2 源码后确认链路可用，0.3.0 落地：

| 决策 | 结论 |
|---|---|
| 真源 | 当前 profile 的 `cordis.patch.yml` 中 `everforest` 行的 `config { light, dark }`；同一 profile 所有已认证浏览器共享，重启保持 |
| Host 半部 | 新增 `src/host-config.js` 导出 `Config`（`union(STRENGTHS).default(...).volatile()` ×2）与 `hostState(config)`；`index.js` 导出 `Config`、改为 `apply(ctx, config)`，boot 脚本在 emit 时嵌入 Host 值作兜底 |
| Client | 软注入 `ctx.inject(['configForms'])` → `formsCtx.configForms.get('everforest')` 订阅快照：就绪后 adopt（重建覆盖层 / 刷新设置页 / 回写缓存）；选择 = 一次 `mutate` 写两个字段，恢复默认 = 一次 `mutate` 里 `unset` 两个字段（若上一次写仍在途，`unset` 排在控制器串行队列之后，不会被后到的 `set` 覆盖）；`mutate` 被拒（`response.ok=false`）adopt 远端并 warn 一次；就绪前的选择排队补写；`writable:false` 守卫仅为防御（native provider 恒 true） |
| localStorage | 降为「首帧缓存 + 旧宿主兜底」，key / 格式不变、不删除；跨 origin 的 `storage` 监听保留为兜底 |
| 首帧 | **B 方案**：缓存优先 → Host 值兜底 → 默认；结果写 `window.__EVERFOREST_BOOT__` 供 Client 首帧沿用，正常路径不闪；已知取舍：本浏览器缓存过期时先画缓存旧值、随后一次 adopt Host 值（之后收敛） |
| 迁移 | Host 无用户层 + 本地缓存非默认 → 启动时一次性播种；Host 已有用户层不覆盖。已知取舍：浏览器 A 恢复默认后，仍持有旧缓存的浏览器 B 下次加载会把旧值再播种回 Host 一次（之后收敛，不反复） |
| 边界 | 写入被拒（`response.ok=false`）→ 回读 Host 并以远端为准、warn 一次；旧宿主（无 settings、schemastery 无 `volatile()`）→ 降级 localStorage；手改非法值 → 运行中 warning + entry 保持 ACTIVE（热恢复）、冷启动 entry 不激活；多 profile 各存各的 |
| 设置页 | 仍只有本插件一页；`settings.configure({ auto: false })` 声明自动表单由插件渲染，DSH 不生成重复表单 |

**证据（DSH 0.2.1-rc.2 源码；抽取副本只读分析）**

- `dsh-settings` + `cordis-plugin-loader`：活跃 profile 条目的 `Config` 被 `settings.describe()` 投影；`.volatile()` 叶子字段走 volatile-only 更新（原地 commit，不重挂插件）；该路径解析失败被捕获 → Host warning、保留旧引用、entry 保持 ACTIVE（改回合法值热恢复）；冷启动校验失败 → entry 不激活。
- `dsh-client-ui-settings`：`ConfigForms.get(entryId)` → `ConfigFormController`（`getSnapshot` / `subscribe` / `set` / `unset` / `mutate`；快照 `status/value/base/user/revision/writable`；写入失败回读并返回 `false`）；`settings.configure({ auto: false }, ctx.fiber)` 把该 entry 的自动表单标为「插件自己渲染」。
- `@deepseek-ai/schemastery` 由 Host 从自身安装解析（同生态参考主题包写法一致），仓库只放 devDependency；运行时零依赖、零 capability 不变。

**实现与验证**

- 实现：`src/host-config.js`、`index.js`（`Config` / boot / `settings.configure`）、`src/durable.js`（Client 纯逻辑：用户层判定 / 播种 / ops / boot hint）、`src/state.js#readStoredState`、`client-entry.js` 的 configForms 软等待 / 采纳 / 播种 / 写路径（含就绪前行排队补写）、localStorage 缓存保留；文案（`locale/*.json` 的 `meta.description`、`src/locale.js#hint.storage`）与 README 中英、design.md §1/§2/§3.2/§5/§7/§8/§9/§10/§11/§12、releasing.md、CHANGELOG、CI / publish workflow 同步。
- 自动化：`node --test` **144/144 通过**（Node 22；`host-boot.test.mjs` 的 Config / B 方案、`durable.test.mjs` 的纯函数、`integration.test.mjs` 的假 configForms 生命周期（采纳 / 播种 / 选择 / 恢复默认 / 写入被拒 / 旧宿主降级 / 延迟到达 / 广播 / 排队补写 / 卸载清理）、`state.test.mjs` 的 `readStoredState`）+ `npm run check` 全绿（palette / build / contrast，`client.js` 已重建为 v0.3.0 头）+ `npm pack --dry-run` 清单齐全（含 `src/host-config.js`）。
- 行为级证据（真实 DSH 投影逻辑 + schemastery 3.18.5 复现）：`volatileForm(Config)` 非空、`projectForm` 得 `{ light, dark }`、round-trip 校验通过、非法值被拒、空 profile 有效值 `{ light: 'hard', dark: 'soft' }`。
- 人工：跨浏览器共享（两个浏览器 / 清 localStorage）、DSH 重启后保持、0.2.1 → 0.3.0 一次性播种、Web 与 Desktop 首帧三路径、Desktop 冷启动 ≤1 帧已于 2026-10-22 由用户真机确认通过（未逐项留存截图）；写入被拒回读与非法值两种表现仍以代码 / 测试为准，未单独留真机证据；发布注意（Host 重启、市场冷静期）见 [`releasing.md`](releasing.md)。

**残余与后续**

- 0.3.0 已发布（npm latest=0.3.0，2026-10-22）且真机目检由用户确认通过；市场版本由 npm 自动映射，无需为新版本改条目；描述文案不随功能追加——2026-10-22 的短文案沿用至 2026-10-27，随后由用户重写并经 PR #9853（2026-10-28 合并）上线，当前文案见 [`releasing.md`](releasing.md) §8.2；市场安装验收仍需等 24h `minimumReleaseAge` 冷静期过去。
- 已知取舍「一次性迁移与跨浏览器重置」（浏览器 B 的旧缓存会再播种一次）见 §7 风险表 / [design.md](design.md) §7 / §11 #12；0.3.0 接受，将来若消除需要 per-browser 一次性标记或版本 / 时间戳判定。

## 14. 2026-10-23 0.4.0：色彩模式（中彩，实验性）决策记录

> 注：本节记录**初版**（h1–h3 + 表格 + 会话行）的决策。初版验收后用户要求把标题扩展到 h1–h6 并参考 Enchanted 补齐富文本角色，下文「h4–h6 不做」「特殊格式保持单色」的口径已由 §15 的扩展轮取代，本节保留为历史记录。

**背景（用户诉求）**

用户提出「加一个色彩模式，现在 Everforest 配色还有很多颜色没有用起来；选上色彩模式后，聊天里的 h1、列表、表格、特殊文本格式，以及工作区对话记录里待确认 / 已完成还没查看的，都可以用上这些颜色」，要求先评估、后实现。

**评估结论（先审计后动工）**

- **「颜色没用起来」成立**：6 套调色板共 31 个角色键，其中 **8 个从未被任何 token 读取**（`bg4`、`bgYellow`、`bgPurple`、`fg.aqua`、`fg.grey0`、`headerOrange`、`headerYellow`、`headerGreen`；light 变体只用 21/31、dark 23/31）；212 个 token 里只有 52 个直接出现调色板色，其余 160 个是派生 / 守卫混合；`orange` / `purple` 各只服务 1 个 shiki token，header 7 色中 5 个无实质 UI 角色。
- **拆成两半，可行性不同**：
  - 会话记录状态：DSH 用 `StateDot` 的语义 token 表达（done→`state-success-primary`、warning→`state-warn-primary`、idle→`state-idle-primary`），**可做**；但「运行中」是共享 `label-tertiary` 的灰色 spinner（无专属色）、「失败」不在会话列表状态里、「已完成未查看」是 `completionUnread` 内存态（打开即清、不持久化）。
  - 聊天内容格式：DSH 没有按元素取色的 token（h1–h6 / p / strong / em 全部继承 `label-primary`；markdown 专属 color alias 只有 8 个且 4 个无消费者）。**分元素着色必须注入选择器级 CSS**，而官方主题契约只支持 token 覆盖；markdown 正文容器只有 CSS modules 哈希类名（无稳定 data 锚点），会话行则有稳定锚点（`data-row-key` / `role=treeitem` / `data-state`）。
- **对比度实算**：浅色档的强调色作为正文色只有 1.49–3.26，达标需混 54–94%（被洗成灰），所以正文级彩色文字不可行；作为大字号标题（3:1）可行但浅色档会被明显压暗（h3 可能是橄榄色）；表格色带 / 行底（`fg.green` / `fg.orange` 混入背景）在 4.5:1 约束下可行。

**方案与用户决策**

| 决策 | 结论（2026-10-23） |
|---|---|
| 强度档位 | 三档样张（轻彩 / 中彩 / 浓彩 + 关闭基线）目检后，先按**中彩**一档实现全部 6 个配色变体 |
| 标题范围 | 只做 **h1–h3**（h4–h6 不做） |
| 特殊格式 | 加粗 / 斜体 / 链接 / 行内 code 文字 / 引用文字保持单色（用户接受）；表格做表头色带 + 斑马纹、边框不动 |
| 会话记录 | 「待确认 / 已完成未查看」给**整行底色**；「运行中」不上色 |
| 浅色档 | 接受对比度守卫压暗后的「淡彩」 |
| 定位 | 实验性、默认开启（可关闭）、DSH 升级后需回归 |
| 实现路线 | token 层零差异 + 客户端注入**作用域 CSS**（`<html>` data 属性开关 + `body[data-ds-dark-theme]` 分深浅色 + 强度属性选择变体），走官方 `configForms` 持久化 |
| 被否决 | ①纯 token 色彩增强（无法分元素着色，且几乎不会真正用上那 8 个未用色）；②h4–h6 六色全量；③正文级彩色文字（浅色档对比度不可行）；④改调色板 / token 值来做色彩模式（破坏默认零差异与语义 token） |

**实现与验证**

- 新增 `src/color-mode.js`（6 变体 × 15 角色，全部由 `tokensFor()` + `resolvePalette()` 实算并做 3:1 / 4.5:1 守卫；静态样式表 = 6 个自定义属性块 + 15 条元素规则，全部以 `html[data-everforest-color-mode="on"]` 开头）；客户端在 `applyLayer` 同步 `<html>` 属性、独立 `ctx.effect` 注入样式（不依赖设置页 / slots / locale）。**扩展轮后为 24 角色 / 34 条规则，见 §15。**
- 状态与持久化：state 变为 `{ light, dark, colorMode }`，`STATE_VERSION` 保持 1（0.3.x 缓存兼容）；Host `Config` 增加第三个 volatile 布尔字段，写入 / 恢复默认 / 迁移播种都是一次原子操作含三个字段；boot payload 与 `hostState()` 保持只含两个强度（色彩模式只影响 Client 挂载后的内容层）。
- 会话行用 `:has([data-state=…])` 命中，跳过选中行、hover 单独加深；状态点直接按 `[data-state]` 覆盖颜色。
- 质量门：`scripts/check-contrast.mjs` 新增 **G9–G15**（标题 / 装饰 ≥3.0、彩色表面正文 ≥4.5、状态点对内容底与侧栏底都 ≥3.0、颜色合法性）；`node --test` **163/163 通过**、`npm run check` 全绿；60 个中彩角色值与方案 0 样张快照逐字节一致。**扩展轮新增 G16 并扩到 24 角色 / 144 个色值，见 §15。**
- 证据与留档：DSH UI 审计（可着色面 / 选择器稳定性 / 注入机制）与调色板对比度矩阵在临时目录 `%TEMP%\dsh-color-eval`（不入库）；样张与截图在仓库 `.tmp/color-mode-preview/`（gitignore 的临时目录，不入库）。

**风险与边界（与 design.md §13.7 一致）**

1. **选择器脆弱性最高**：markdown 正文容器没有稳定锚点，DSH 升级若改名 / 改结构，色彩模式可能静默失效（token 层与页面不受影响）；会话行锚点更稳。
2. **违背官方主题契约**：官方扩展点是 token 覆盖（「token 样式表是颜色值的唯一权威来源」），选择器注入是实验性例外，不承诺跨 DSH 版本兼容。
3. **浅色档必然 muted**：「淡彩」是 3:1 / 4.5:1 约束下的必然结果，已由用户接受。
4. **视觉噪音 / 维护面**：信息密度高的会话可能显得花；每次 DSH 升级都要回归选择器。
5. **回滚**：0.4.0 → 0.3.0 前必须从 profile patch 删除 `colorMode` 字段，否则 0.3.0 的 schema 校验失败、entry 不激活（无主题）。

**残余（人工项）**

真实 DSH 需**重启**后目检（Host `Config` 变化）：6 套配色下开启色彩模式的聊天 h1–h3 / 表格 / 会话行；关闭后与 0.3.0 无差异；换浏览器 / 重启后开关保持；回滚路径。当前自动化测试与样张不能替代真机目检。

## 15. 2026-10-23 富文本扩展（Enchanted 参考）

**背景（用户反馈）**

初版色彩模式（h1–h3 + 表格 + 会话行，见 §14）实现后经用户目检，反馈「还行」，随即提出两点：①标题要 h1–h6 全做；②参考 Obsidian **Everforest Enchanted** 的 markdown 配色，把加粗 / 斜体 / 行内 code / 内部链接 / 删除线 / 引用块 / 复选框 / 表格 hover 等富文本角色补齐。初版「特殊格式保持单色、h4–h6 不做」是当时为控制风险与视觉噪音的保守取舍，不是技术上不可行——扩展轮沿用同一条作用域 CSS 路径，把角色从 15 个扩到 **24 个**。

**参考来源与映射**

参考 [FireIsGood/obsidian-everforest-enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) 的 `theme.css` @ `bdd7ac7`（MIT，与本项目默认配色的同一上游）。其 markdown 配色语义为：h1–h6 依次 red → orange → yellow → green → blue → purple；strong + em = `fg-purple`；行内 code = `fg-blue`；内部链接 = `header-aqua`；删除线 = `text-faint`；引用块 / 表格给淡底；复选框 = `fg-blue`；已完成任务淡化。落到 DSH 实际存在的元素（全部经对比度守卫）：

| 角色 | 取值来源 | 说明 |
|---|---|---|
| h1–h6 | `fg.red / orange / yellow / green / blue / purple` | h1–h4 是大号 / 加粗文本按 3:1；h5–h6 与强调文字同档 |
| strong + em | `fg.purple` | 两者同色（与 Enchanted 一致）；标题内 `color: inherit` 保留标题色 |
| 行内 code 文字 | `fg.blue` | Enchanted 是 fg-blue 前景；DSH 的 inline-code chip 底色是另一个 token，故只对 chip 守卫 |
| 内部文件链接 | `fg.header-aqua` | 外链仍走官方 `--dsw-alias-link`（header-blue） |
| 删除线 / 已完成任务 | `label-tertiary` | 刻意弱化，不参与门槛（对应 Enchanted 的 `text-faint`） |
| 引用块 | aqua 左边框 + aqua 8% 淡底 | 淡底 + 右侧 12px padding / 圆角，给底色留白 |
| 表格 | 表头绿色带 14% / 斑马纹 6% / 行 hover 10% | 权重按 `label-primary ≥ 4.5:1` 反推 |
| 复选框 | `fg.blue` accent | 初版为 aqua |
| marker / quote / hr | `fg.aqua` | 沿用初版 |

**阈值取舍（本轮核心决策）**

三种候选，最终取中间：

1. **4.5:1（正文级）——否决**：浅色档 Everforest 强调色本身达不到。实算 light·soft：`fg.purple` 对画布只有 2.55:1，按 4.5 守卫后紫 / 蓝 / aqua 全部混成 `#5C6A72`（墨色）——即「有对比度、没颜色」。深色档本来就直接通过 4.5，守卫只在浅色档生效，因此 4.5 等于把浅色档的扩展角色全部关掉。
2. **完全照抄 Enchanted 的 ~2.6:1——否决**：Enchanted 在浅色下同类文本只有约 2.6:1（整体风格更淡）；照抄会让本插件的彩色文字明显偏淡，与「中彩」档位不符，也浪费深色档的对比度余量。
3. **3:1（采用，G16）**：对强调文字可能落到的每个 markdown 表面（画布、表头色带、斑马纹、行 hover、引用块淡底）取最弱值守卫；深色档自然通过，浅色档保留色相且严格优于 Enchanted。正文 `label-primary` 仍 4.5:1 不降级；装饰 / 状态点维持 3:1。代价与边界：light 三档实测 3.00–3.03，几乎无余量；light·soft 的表格三档绿染收敛为同一色、会话行底退化为侧栏底色（权重降到 0，行底不可见）。

**被否决的其它方案**

- 只做标题、不做富文本（初版口径）：用户明确要求参考 Enchanted，且同一作用域 CSS 的增量成本低。
- h5–h6 按正文 4.5:1、h1–h4 按 3:1：浅色档 h5/h6 会失去颜色，同一规则族出现两套阈值，解释成本高于收益。
- 为彩色文字修改调色板原值或新增 token：破坏默认层零差异与「强调色不随强度变化」的数据模型。
- 用 `!important` 压过 DSH 原有规则：不必要（作用域选择器优先级足够），且会让关闭 / 卸载更难清理。

**验证证据**

- `tests/color-mode.test.mjs` 12 → **17 项**通过；`node scripts/check-contrast.mjs --check` 全绿（G9–G16）；`docs/reference/contrast.md` §2f 重新生成（24 角色表 + 逐项实测值）。
- 6 变体 × 24 角色 = **144 个色值**逐字节钉住；全部 **34 条 CSS 规则**以 `html[data-everforest-color-mode="on"]` 开头、无 `!important`、关闭时零匹配。
- token 层与 boot payload 未改；状态 / 持久化 / 设置页未改——扩展只动 `src/color-mode.js`、`tests/color-mode.test.mjs` 与 `scripts/check-contrast.mjs`（及生成物）。
- 样张目检（2026-10-23）：用真实 `colorModeStyles()` + `tokensFor()` 渲染 6 变体（`.tmp/color-mode-preview/rich.mjs` / `shots-rich/`）。dark 三档与 light·hard / light·medium 的 h1–h6、加粗 / 斜体、行内 code、内部链接、删除线、引用块、表格、复选框、已完成任务淡化、会话行均清晰可辨；light·soft 仅表格三档同色与会话行底不可见（已记录边界），标题 / 强调文字仍保留色相。
- 全量 `node --test`（170 项）与 `npm run check` 由最终门禁复核。

**残余（人工项）**

真实 DSH 已于用户本机重启后目检（设置页、色彩模式开关、6 套配色下的聊天富文本与会话行，2026-10-23 确认「这次调整没什么问题了」）；**0.4.0 已发布**（tag `v0.4.0`，npm `latest`，见 `docs/releasing.md`）。

## 16. 2026-10-23 色彩模式改为默认开启

**用户要求**：0.4.0 验收后「色彩模式改为默认开启」。

**决策**：`src/state.js` 新增 `DEFAULT_COLOR_MODE = true` 作为单一默认来源；`createDefaultState` / `normalizeStrengths`（含 Host 表单值）/ `readState` / `readStoredState` / `resetState`、Host `Config` 的 `colorMode` schema 默认值、首帧缓存与设置页开关的默认态全部跟随。语义：**只有显式 `false` 关闭**；缺失字段（0.3.x 缓存 / profile patch）解析为 `true`；非布尔值在带版本的 payload 里仍按损坏处理（修复为默认值），Host 表单的非法值回退默认。

**迁移取舍**：0.4.0 初版默认关闭时，使用过的浏览器都写过显式 `colorMode: false`；升级后这些显式值继续保留（视为用户选择），不会自动翻成开启。只有从未写过该字段的旧缓存 / patch 采用新默认。没有做「旧 false 视为未选择」的强制迁移：那会把用户主动关闭的情况也翻掉，代价高于收益。

**连带改动**：恢复默认（`resetState` / 设置页 reset / Host unset 三字段）回到「默认配对 + 色彩模式开启」；`shouldSeed` 的「真实选择」判定从「colorMode 开启」改为「colorMode 关闭」；README / CHANGELOG / design §13 / palette / releasing 的「默认关闭」口径全部更新，`scripts/check-contrast.mjs` 报告文案同步并重新生成 `contrast.md`。

**验证**：`node --test` **170/170** 通过（state 20、durable 8、host-boot、settings-page 30、integration 39 等全绿）；`npm run check` 全绿；`node scripts/build.mjs` 重新生成 `client.js`。真机需刷新页面（Client 半部）后目检默认态。

## 17. 2026-10-23 设置页文案精简与外观控件改 DSH 样式

**用户反馈（截图复核）**：0.4.0 设置页里 4 处红框文字（标题下说明、外观当前状态说明、色彩模式实验性提示、页尾 Host / 缓存说明）不希望在界面显示；「外观」希望参考 DSH 默认设置页的显示样式。

**决策**

1. **文案全部移除，不做折叠 / tooltip 保留**：中英字典同步删键 `intro`、`appearance.systemActive`、`appearance.fixed`、`colorMode.experimental`、`hint.scheme`、`hint.storage`（键集 29 → 23，测试锁定）。持久化 / 重启口径仍写在 README 与设计文档，不再占用设置页。理由：这些信息属于「实现细节」，与 DSH 原生 Appearance row 不显示说明的风格不一致；用户明确要求界面不显示。
2. **外观控件改为 DSH `AppearanceRow` 同款**：顺序 `浅色 / 深色 / 跟随系统`；16×16 内联 SVG path 原样取自 DSH 的 `IconLightOutlineMedium` / `IconDarkOutlineMedium` / `IconFollowsystemOutlineMedium`（stroke 1.3、`currentColor`）；卡片规则照抄 `AppearanceRow.module.css` 的 `themeCube`（`flex: 180px`、`padding: 20px 32px`、`gap: 4px`、`.5px solid --dsw-alias-border-l4`、`--dsw-radius-xl`、`14px/22px`）；hover `--dsw-alias-interactive-bg-hover`、选中底色 `--dsw-alias-bg-module-platform`。不引入 DSH 的 icon 包（primitives 只静态打进外壳），改为内联 path 复制。
3. **选中描边用主题强调色**（唯一偏差）：DSH 用 `--dsw-static-neutral-bluish-400`；本主题把它映射成 light `#b8c0ae` / dark `#83887c`，light 下与未选中边框 `#bec5b2` 几乎同色，选中不可辨。改 `--dsw-alias-brand-primary`（aqua），同时与强度卡 / 色彩模式开关的选中态一致。

**被否决**

- 保留文案但改成 tooltip / 折叠：用户要求「不用显示」，tooltip 仍会在界面出现且增加交互面。
- 直接复用 DSH 原生 Appearance row（不渲染本页外观控件）：本插件的「点另一组色卡会改写外观」需要本页有可恢复 `system` 的入口；DSH 自带 row 在 General 设置，离强度卡远，体验更差。
- 选中态继续用 DSH 原生 token：浅色档不可辨（见上）。
- 修改 `--dsw-static-neutral-bluish-400` 的全局映射：它被 DSH 其他组件使用，改映射会外溢。

**验证**：`tests/settings-page.test.mjs` 27 项通过（新顺序 / 图标 path 数 / 选中态 / 被删文案不再渲染 / 按钮契约）；`.tmp/settings-preview/` 用真实 `SETTINGS_STYLES` + `tokensFor()` 渲染 dark-soft / light-hard 截图目检，选中卡片在浅色档可见；`npm test` 170 项、`npm run check` 全绿。

**残余**：真机 DSH 设置页需刷新 / 重启后目检（Client 半部改动，刷新页面即可加载新 `client.js`）。

## 18. 2026-10-24 色彩模式改为默认提供（移除设置页开关）

**用户要求**：把设置里的「色彩模式」选项去掉，作为默认提供的功能。0.4.0 发布后曾于 2026-10-23 按用户要求把默认值改为开启（§16）；本轮进一步移除设置项本身，功能常开。

**决策**

1. **设置页整块移除，不做隐藏 / 折叠 / 高级设置**：删掉色彩模式标题、说明、`role="switch"` 开关与 5 个强调色装饰片；`colorMode.title/desc/on/off/switch` 五个 locale 键中英同步删除（键集 **23 → 18**）。理由：用户明确要求设置里不出现该选项；保留隐藏入口会留下第二套状态语义。
2. **状态与持久化回到两个强度**：客户端 state 为 `{ light, dark }`；localStorage payload 为 `{ version: 1, light, dark }`，`STATE_VERSION` 仍为 1；Host `Config` 只剩 `light` / `dark` 两个 volatile 字段；迁移 / `isDefaultState` / 「恢复默认」只涉及两个强度。
3. **兼容优先，不强制迁移**：0.4.x 缓存里多出的 `colorMode` 字段读取时忽略、不触发修复重写，下次写入自然丢弃；旧 profile patch 里残留的 `colorMode` 键被 schemastery 忽略（未知键不报错、值不生效），插件不读也不主动 unset——**用户不需要手改 patch**。
4. **`<html>` 锚点保留**：`data-everforest-color-mode` 恒为 `"on"`，作为作用域 CSS 的锚点（不再是开关状态）；token 层、24 个角色色值与 34 条规则零改动。
5. **dev 面板同步**：去掉色彩模式开关行与页脚「色彩模式 开/关」。

**被否决**

- 保留开关但默认常开：用户要求的是「去掉这个选项」，默认值改不改都仍在设置页出现，未满足要求。
- 用环境变量 / 隐藏 URL 参数保留关闭能力：设置页之外再加一套配置入口，语义与维护成本都更高；且本功能是纯客户端样式，关闭诉求可用停用插件实现（代价是同时失去主题，已记录于 design §13.7 / §13.9）。
- 提升 `STATE_VERSION` 以清理旧字段：会丢弃所有 0.3.x / 0.4.x 既有缓存并经迁移回填，代价高于「读取时忽略 + 下次写入丢弃」。
- 迁移时主动 `unset` 旧 patch 的 `colorMode`：旧版本仍在读该字段时会造成额外写入；忽略即可，主动清理收益为零。

**验证**：`node scripts/check-contrast.mjs --check` 通过（报告重新生成）；设置页 / state / durable / host-boot / integration / dev 面板测试随代码同步覆盖本次变更（键集 18、旧缓存与旧 patch 的兼容读取、dev 面板无开关行）。版本号保持 0.4.0、不发布，变更记入 `CHANGELOG.md` `[Unreleased]`（Changed / Removed）。

**边界**：移除开关后没有单独关闭色彩模式的入口——若用户想退回单色内容层，只能停用插件（会同时失去主题）；该取舍已写入 design §13.7 第 5 条与 §13.9。真机验收刷新页面即可看到新设置页与默认提供的色彩模式；Host 半部的 schema 变化在 Host 启动时装载，但旧 `colorMode` 键兼容，不存在「为了兼容必须重启」的用例。

## 19. 2026-10-24/25 1.0.0：内容 / 交互层与首个稳定版

> 本节补记 §14–§18 之后、随 **1.0.0**（2026-10-25）发布的批次。§18 当时版本号仍记 0.4.0、未发布；这批改动最终一起进入首个稳定版。逐项实现细节见 [design.md](design.md) §14–§17 / §10，发布记录见 [`releasing.md`](releasing.md) 的「发布记录」与「1.0.0 发布注意」。

**背景（用户诉求的演进）**

0.4.0 发布后，用户先后提出：设置里的色彩模式去掉、作为默认功能（§18 已记）；强调色换成官方 palette；会话状态行「红色像是在报错」；工作区选中的 tab 看不出来、且要与待回答 / 已完成区分；选中的文字仍是浏览器蓝底白字；深浅切换想要过渡；开发期不想反复打开设置页调色；最后要求发布首个稳定版并重做图标与市场素材。这些改动超出「6 套配色 + token 覆盖」的原始范围，进入内容层（聊天 markdown / 会话行）、交互层（选区 / 切换过渡）与工程层（dev 构建 / 发布素材）。

**决策与落地**

| 主题 | 结论 | 理由 / 边界 |
|---|---|---|
| UI 强调色（2026-10-24） | 15 个 token（品牌 / 主按钮 / 链接 / 深潜标签 / 危险 hover / onboarding accent）由 `header-aqua` / `header-blue` 改为官方 `fg.aqua` / `fg.blue` / `fg.red`；`header-*` 只留 onboarding 渐变、shiki link、浅色气泡染色与色彩模式内部链接 | 用户对照 5 组样张目检选定「官方 fg accent」；浅色品牌前景 3.13 → 2.91（G4 门槛 2.5）是唯一负向变化、用户接受；链接对比反而提高（dark blue on bg0 5.17，原 3.28）。见 design §16.1 |
| 会话状态行（2026-10-24） | 「待确认 / 待审批」行底 `bg_red` → `bg_yellow`；行底不再由强调色推导，直接取 palette1 的 `bg_yellow` / `bg_green`；深色档反相为「`fg.yellow` 混 `bg_dim` 22% 的亮琥珀 + 深墨文字」；加 3.5 L* 可见性下限 | 用户两轮反馈：「红色像报错」→ 改黄；「深色档再亮 / 更黄一点」→ 深色反相。浅色档 `bg_yellow` 与画布近同明度（约 1 L*），靠 `liftWarnFill()` 压深到 3.5 L* 或文本 4.5:1 先到；light·soft 只保留色相。见 design §13.8 / §13.8.1 |
| 当前会话行（2026-10-24） | 新增 `src/active-session.js` + 常驻样式表：`[role="treeitem"][data-row-key^="session:"][aria-selected="true"]` 画 palette `bg_blue`，先保文本 4.5:1、再保对侧栏 ≥4.5 L* | 上游把选中与 hover 合画成同一 `interactive-bg-hover`（对侧栏约 2.6 L*），选中行等于找不到；蓝色是最后一个不与黄 / 绿状态行混淆的语义背景，也与 DSH business primary 一致。light·soft 画布已贴门槛、只留色相；与色彩模式无门控（常驻）。见 design §15 |
| 文本选区（2026-10-24） | 新增 `src/selection.js` + 常驻 `::selection`：六档取 `bg_visual` 底色、`color: inherit` | DSH 声明了选区 token，但安装包 176 张样式表里没有 `::selection` 消费者，token 层改不到；第一版写死 `color: fg` 被用户否（「选中的文字颜色全部变成一样的」），改 `inherit` 后代码语法色 / 链接色 / 标题色保持。见 design §16.2 |
| 深浅切换聚光灯（2026-10-24/25） | 跨深浅切换改为 View Transitions + `clip-path: circle()`：新主题快照在上层、从点击点扩张揭示，只裁新快照；时长 400ms、`ease-in`，原点取最后一次 `pointerdown`；包装 `ThemeRuntime.setTheme` 覆盖 DSH 自带 Appearance 行；2026-10-25 起 `system` 跟随的 OS 翻转也走揭示（包装 `publish`、原点固定视口中心，见 §20）；同深浅强度切换 / 跨窗口广播瞬切 | 颜色插值在 50% 处文字与画布 1.01:1（整页发灰）；镜像揭示在快照拆除时整帧丢 clip，浅→深闪白（真机 5 次复现 4 次）。「只裁新快照」结构上不会闪错色。无 View Transitions / reduced-motion / 重入一律同步执行。Windows 原生窗口框架在揭示开始时切色、设置弹窗参与快照是已知取舍。见 design §17 / §17.1 |
| dev 调试面板（2026-10-24） | `src/dev-panel.js` 挂在 `shell.overlay`，复用设置页同一个 store；只存在于 `npm run build:dev` 产物，`// @dev-only:` 段由构建剥离，`--check` / CI / `prepack` 拒绝开发产物 | 调 6 套配色不必反复开设置页；零新状态 / 零新持久化（写 Host、缓存、广播、Appearance 与设置页一致）。折叠态曾整块丢样式导致圆钮跑到左上角且不可点，已改为两种状态都渲染样式表 + 内联兜底。见 design §14 |
| 同批视觉修正（2026-10-24） | 深色边框描边由 `bg5` 向 `grey1` 提亮 20% 且每档 alpha 抬档；深色行内 code 芯片由 `bg_blue` 改 `bg_dim` → `bg0` 提亮 30%；设置页所有 solid 边框统一 `.5px` 单一变量、选中态去掉 inset box-shadow | 均为用户截图 / 目检反馈（「边框线条不明显」「border 宽度没统一」「深色 code 芯片像抬起的色块」）。见 design §4 / §6.2 |
| 图标与市场素材（2026-10-25） | `icon.svg` 改「跃起的绿色鲸鱼 + 山脊 / 松树」，去掉原有色带与天体元素；README / 市场预览由 6 张分档示意图改为 2 张真机完整窗口截图（dark-soft / light-hard，1263×981 未裁剪），`screenshots.json` 同步 2 项 | 用户要求；图标 3.1 KB 自包含 SVG，36px 目检可辨；市场允许 1–8 张，2 张即够。见 CHANGELOG 1.0.0 / design §10 |
| 发布口径（2026-10-25） | 0.4.0 之后未发布的批次（含 §18 的「默认提供」）作为 **1.0.0 首个稳定版**发布；`engines.dsh` 维持 `>=0.2.1-rc.2 <0.3.0-0`；升级 0.4.0 → 1.0.0 需重启一次 DSH，回滚无需清理 profile patch | 0.4.0 的 `colorMode` 字段已从 schema 移除、旧 patch 残留键被忽略；Host 半部仍需重启才装载新 schema。见 [`releasing.md`](releasing.md)「1.0.0 发布注意」 |

**与既有口径的修正（重要）**

- **token 计数与分类**：2026-10-25 复核修正了 §2 的三处数字——alias / specific 共 **118** 条（76 var-static + 7 color-mix + 29 literal + 6 alias-ref；旧「112」是 design-platform 单 sheet）、dark 侧 **104** 个 alias 有重定义、**35 条**必须显式给值（29 literal + 6 alias-ref）。证据：`docs/reference/token-inventory.json` 的 `counts` 与逐 token 形态；design §4 同日修正。
- **§6 品牌 / 链接映射**：由 `header-aqua` / `header-blue` 改为官方 `aqua` / `blue`（见上表）。
- **§14 / §15 的会话行配色**：这两节记录的是初版（强调色推导 / 红绿）方案；2026-10-24 起改成 palette 原色 + 黄 + 深色反相，以 design §13.8 / §13.8.1 为准。
- **「与 0.3.0 逐字节一致」不再成立**：色彩模式关闭时 token 层与 markdown 内容仍与基线一致，但当前会话行与文本选区是常驻样式，DOM 上恒有差异（design §15 已注明）。
- **§18 的版本状态**：§18 结尾「版本号保持 0.4.0、不发布」是当时状态；该批改动最终随 1.0.0 发布，`CHANGELOG.md` 记为 `## [1.0.0]`。

**验证与证据**

- 自动化：`node --test` **220/220** 通过（14 个测试文件；`theme-spotlight` 9 / `active-session` 8 / `selection` 4 / `dev-panel` 16 / `color-mode` 19 / `integration` 41 等）；`npm run check` 全绿（palette / build / contrast，`docs/reference/contrast.md` 由脚本重新生成）；`npm pack --dry-run` 清单含 `icon.svg`（`tests/integration.test.mjs` 断言自包含与尺寸上限）。
- 样式表：常驻 4 张（色彩模式 / 当前会话行 / 文本选区 / 聚光灯）+ 设置页 1 张 = 5 张；集成测试断言注入与卸载后清空。
- 对比度：当前会话行新增 **G17**（合法色值 + 文本 ≥4.5:1 + 相对侧栏 ≥0.02 L*）写入报告 §2g；6 档实测 light-hard `#DCECE9`(4.58) / light-medium `#DDEAE6`(4.52) / light-soft `#E6E8DB`(4.50) / dark-hard `#384B55`(5.39) / dark-medium `#3A515D`(4.94) / dark-soft `#3F5764`(4.51)。
- 真机验收（2026-10-24/25，Desktop 1294×857）记录见 design §14 / §15 / §16.2 / §17：当前会话行在 light·hard / dark·soft 下与黄 / 绿状态行并排可辨；文本选区在 h2 / strong / 行内 code 上保留各自颜色；聚光灯深浅两向、闪白修复、reduced-motion 兜底；dev 面板展开 / 折叠 / 拖动 / 写 Host 全部走通。
- 发布：tag `v1.0.0`（commit `aa3781f`）→ publish run `40116912287` → npm `latest` = `1.0.0`（`dist.shasum` `162d8c59…`，SLSA provenance），GitHub Release 由 workflow 自动创建。见 [`releasing.md`](releasing.md)「发布记录」。

**风险与边界（补充 §7 / §14）**

- 常驻样式表都依赖 DSH 的 DOM 锚点（markdown 容器 / `aria-selected` / `data-row-key` / `::selection` 优先级）；DSH 升级改名或改结构后可能静默失效，但 token 层与页面不受影响，回退办法是停用插件或单项回滚。
- 聚光灯包装了 `ThemeRuntime.setTheme` 与 `ThemeRuntime.publish`：上游方法形态变化、或其它插件也做包装时行为会叠加；`publish` 是更内部的接缝，DSH 升级改名时只让 OS 翻转退回瞬切（其余入口不受影响）、卸载时都还原。
- 已知视觉边界：light·soft 的当前会话行 / 色彩模式行底只能保留色相（画布已贴 4.5:1 门槛）；Windows 原生窗口框架在揭示开始时切色（页面快照覆盖标题栏 / 终端内容）；设置弹窗参与快照、弹窗内选中描边在揭示结束后随 React 重渲染更新；键盘 / 无指针路径从视口中心揭示。
- dev 面板只存在开发构建；并行会话重建发布产物会把它热替换掉，需再 `npm run build:dev`。
- 1.0.0 升级需重启一次 DSH 才装载两字段 schema；旧 patch 的 `colorMode` 键被忽略、无需手改；回滚到 0.4.0 / 0.3.0 不需要清理 patch。
- 工作量未逐日统计（见 §8 注）；市场 24h 冷静期内的版本映射等发布注意见 [`releasing.md`](releasing.md) §8.6。

## 20. 2026-10-25 追加：`system` 跟随下的 OS 翻转也走聚光灯（已随 1.1.0 发布）

> 触发：用户问「现在做了白天和黑夜模式的切换动画，如果是触发跟随系统自动切换，会有这个效果吗」。1.0.0 的口径是**没有**（OS 翻转由 ThemeRuntime 自己的 `prefers-color-scheme` 监听直接 `publish()`，不经过包装的 `setTheme`，旧帧拍不到只能瞬切）；用户确认要实现，并要求不影响已有三个入口的效果。

**决策**：把揭示接到 `ThemeRuntime.publish` 的实例包装上，且只在「OS 翻转」这一种 publish 放行；不改 token 层、不动已有接线。窄门条件是「新偏好与旧快照偏好都是 `system`、且解析出的 scheme 与旧帧不同」，它与 `spotlight.running` 一起把字体/字号、同深浅重栈、改偏好的 Host 广播、以及已有的 `setTheme` 路径全部保持原样（design §17.1）。

**实现（快照）**：`src/theme-spotlight.js` 增 `shouldRevealSystemFlip()` 与 `run(change, { origin: 'center' })`；`src/client-entry.js` 增第 5 段接线（实例 `publish` 包装/还原）；`client.js` 重建。文档：design §17.1、CHANGELOG 的 1.1.0 小节。

**验证与证据**

- 自动化：`node --test` **224/224**（新增 4 项：`shouldRevealSystemFlip` 六分支、`origin: 'center'` 忽略旧指针、集成「OS 翻转走揭示」、集成「其他 publish 仍瞬切 + setTheme 只揭示一次」）；`npm run check` 全绿（palette / build / contrast）。
- 真实浏览器验证（独立 Chrome + 真 `client.js` + 真 View Transition，最小 DSH runtime double）：`prefers-color-scheme` 翻转后 `startViewTransition` 调用 1 次，`::view-transition-new(root)` 的 `clip-path` 从 `circle(0px at 1280px 625px)`（2560×1249 视口的中心，忽略已记录的旧指针）扩张 400ms；中途截帧可见浅色页中央的深色圆形新帧。同一页面上「同 scheme publish」「改偏好的广播」均不建过渡，`setTheme` 跨深浅只建 1 次。
- 已装进本机 `desktop` profile 并触发 DSH client HMR 热替换（观察到 5 张 everforest 样式表整体移除后重建、各剩 1 张，`<html>` 属性与主题保持，控制台无新增错误），运行中的窗口即为新实现。

**残余（人工项）**：真实 OS 深浅切换的目检（Windows 设置里切「浅色 / 深色」、DSH 外观设为「跟随系统」）留给用户；自动化只能验到「publish 包装 → 过渡启动 → 换色发生在回调内 → 中心原点」。

**发布（2026-10-27）**：该实现随 **1.1.0** 发布（tag `v1.1.0`，publish run `40494550768`，npm `latest` = 1.1.0）；只改 Client 半部，升级后刷新页面即可生效。

## 21. 2026-10-27/28 1.2.0：聊天表格边框与拖拽列宽

> 触发：用户 2026-10-27 提出「优化一下聊天内容中的表格样式，比如加上边框，提供拖动表头边框控制列宽度的功能」。实现细节、多轮现场修正与真机读数见 [design.md](design.md) §18；发布记录见 [`releasing.md`](releasing.md)「1.2.0 发布注意」。

**决策与落地**

| 主题 | 结论 | 理由 / 边界 |
|---|---|---|
| 表格边框（2026-10-27） | 外框 `border-l3` + 列线 `border-l2`（`.5px`）；fill 表框画在滚动包装层，宽表框画在 `<table>`；首 / 末列补 16px 内边距、末行去掉叠加下边框 | 用户要「加边框」；彩色边框要 3:1 会被压成灰绿（§13.1 旧口径仍成立），中性色阶与 DSH 自己的 cell 分隔线同源 |
| 列宽拖动（2026-10-27） | 表头右缘 6px 命中 + `document` 级 pointer 事件，首次按下才锁定 `table-layout: fixed`；fill 表（<4 列）重分配相邻两列且总宽不变，宽表逐列独立改宽、表格总宽 = 列宽之和 | DSH 的 Markdown 渲染器是 memo 化 mdast switch、没有表格扩展点，交互只能走 DOM 侧接线；不加 DOM 节点 |
| 宽表布局（2026-10-28） | 撤掉「收窄换行」修法，改为 Element 表格式：容器收在正文列内、列宽保持自然长度、放不下时底部常驻 5px 横向滚动条；最后一列右边框也是拖动柄 | 用户三次反馈（错位 / 右侧越界 / 要 Element 表格式滚动）；前两版分别把表格裁掉或压成换行，最终方案保留 DSH 的 bleed 布局、只重新装箱包装层 |
| 复位与边界 | 双击边缘（两次 press 检测，不用 `dblclick`）复位；拖动中 Esc 取消；单列最小 64px；>12 列与触摸端不响应；列宽只在当前页面会话内有效 | `pointerdown` 的 `preventDefault()` 会抑制兼容鼠标事件、`dblclick` 不保证送达；触摸会与横向滚动打架 |

**验证与证据**

- 自动化：`node --test` **239/239**（1.1.0 的 224 项 + 本批 15 项：`table-resize` 14 项与公共 CSS 解析器）；`npm run check` 全绿（palette / build / contrast）；color-mode 样式表 48 条、resize 样式表 19 条规则由测试逐条钉住。
- 全场景矩阵：离线高保真页 `scenarios.mjs` 走真实 CDP 鼠标输入 **106/106**（深 / 浅两套主题，覆盖 fill / wide / 异常表 / 生命周期）；真机 fill 表 `203.64 / 541.8 → 243.64 / 501.8`、表格 745.44px 不变；宽表最后一列 `353 → 232.5`、表格 `1192.47 → 1072px`、逐列拖窄到 511px 后滚动条消失、双击复位。
- 发布：tag `v1.2.0`（commit `626671a`）→ publish run `40713360126` → npm `latest` = 1.2.0（`dist.shasum` `480aadf8…`，SLSA provenance），GitHub Release 自动创建；verify run `40713342591`（Linux / Windows × Node 20/22/24）全绿。只改 Client 半部，滚动升级刷新页面即可。
- 已知边界：列宽不持久化、触摸端不支持、宽表没有圆角（collapsed table）、选择器依赖 `.md-table-wide` / `[class*="tableScroll"]` 等 DSH 字面工具类（升级需回归）。

## 22. 2026-10-29 表格横向滚动条 hover 加粗 + 过渡动画（未发布）

> 触发：用户 2026-10-29 提出「之前修改了默认的表格样式，现在能不能优化一下，当 hover 滚动条的时候，让滚动条稍微变粗一点，让用户更容易选中」，随后追加「加上变化的时候的过渡动画效果」。实现与逐条读数见 [design.md](design.md) §18.1 / §18.3 / §18.4。

**决策与落地**

| 主题 | 结论 | 理由 / 边界 |
|---|---|---|
| hover 加粗形态 | 条位固定 10px；thumb 静止画 5px（透明下边框 + `background-clip: content-box` 内缩，位置与 1.2.0 一致），hover 画满 10px 并切到 DSH 的 hover 色 | 直接改条高会让包装层与表格后的正文在 hover 时跳 5px；固定轨道 + 内缩画法做到「变粗但零布局位移」，静止视觉逐像素不变 |
| 过渡方式 | 由新模块 `src/table-scrollbar.js` 用 `pointermove` + `requestAnimationFrame` 逐帧缓动 inset（ease-out cubic，160ms），**不写 CSS transition / `:hover` 规则** | Chromium 不会在滚动条伪元素上运行 CSS 过渡 / 动画（10s transition 也 `getAnimations()` 为空、像素直接是终态）；指针在原生滚动条上时事件仍派发给所属包装层，且包装层的自定义属性能被子滚动条伪元素继承，逐帧写 inset 就能真实重绘 |
| 否决的替代 | ① `::-webkit-scrollbar:hover`；② 包装层 `:hover::-webkit-scrollbar`；③ 保留 `::-webkit-scrollbar-thumb:hover` 改 border | ① Chromium 不匹配（指针在条上条高仍 5px）；② 经过表格任意位置就会加粗并跳 5px；③ 会瞬间跳变、把动画掐掉。`prefers-reduced-motion: reduce` 时控制器直接跳到终态 |
| 颜色与尺寸来源 | 颜色不动，仍取 DSH 主题滚动条 token（`--dsh-scrollbar-thumb` / `--dsh-scrollbar-thumb-hover`）；尺寸写死 10px / 5px 并由测试钉住 | 配色归主题层（§18.1 的既有口径）；尺寸是本功能的设计值，不引入新的外部变量依赖；Blink 把滚动条部件边框取整到整 CSS 像素，DPR 1 下过渡只有 5 → 4 → 3 → 2 → 1 → 0 六个绘制态（平台上限） |

**验证与证据**

- 自动化：`node --test` **252/252**（1.2.0 的 239 项 + 本轮样式 1 项 + 动画控制器 12 项）；`npm run check` 全绿（palette / build / contrast）；color-mode 样式表 48 → 50 条、字面规则 16 → 18 条，动画的命中几何与逐帧序列由 `tests/table-scrollbar.test.mjs` 钉住。
- 探针 + 离线高保真预览 + 过渡实测：design.md §18.4 的三条（Chromium 伪元素 / 事件 / 自定义属性继承行为、before / after 几何与逐行像素、真实控制器内联页的 4s 慢放采样：inline inset `4.88 → 4.70 → 4.52 → …`、computed border `5 → 4 → 3 → 2 → 1px`，hover 全程零布局位移）。
- 残余（人工项）：共享调试 Chrome 打不开需要 token 的 Web GUI，本会话也没有桌面 app 的 MCP 通道，真实窗口的 hover 手感目检留给用户；改的是 Client 半部（样式表 + 控制器），`client.js` 重建后刷新页面即生效。

**边界**：仅 Chromium / Electron 生效（Firefox 走 DSH 的 `scrollbar-width: thin` 兜底，不加粗）；过渡依赖「指针在原生滚动条上的事件仍派发到所属元素」这一 Blink 行为，若某版本改变则 hover 不再加粗（静止 5px 不受影响），rAF 不可用 / reduced-motion 时退化为瞬切；可滚动表格下方多 5px 透明条位、表格后正文下移 5px，不可滚动 / fill 表不受影响；依赖 `::-webkit-scrollbar*` 私有伪元素与主题的 thumb 绘制方式（DSH 升级需回归）。
