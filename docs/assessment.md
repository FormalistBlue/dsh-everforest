# 可行性评估与方案取舍

> 日期：2026-10-18 · 评估对象：DSH **0.2.1-rc.2**（Desktop，Windows）· 结论：**可行，采用路线 A**（见下）。
> 2026-10-19 更新：首帧 Host boot 注入已实现于 0.2.0（见 §3 / §5 / §9 / §12）；shiki / diff 口径修正。
> 2026-10-21 更新：0.2.1 的 P1 打磨落地（loading spinner boot token、跨窗口同步、设置页失败重试、无障碍、构建守卫），见 §5 / §11 与 [design.md](design.md) §12。
> 2026-10-22 更新：**0.3.0 Host 侧持久化落地**（`configForms`）：强度真源迁到当前 profile 的 `cordis.patch.yml`，同一 profile 所有浏览器共享；localStorage 降为「首帧缓存 + 旧宿主兜底」，0.2.1 旧值一次性播种，首帧改 B 方案。见 §3 / §5 / §7 / §8 / §9 与新增 §13。

## 1. 结论

做一个 Everforest 主题插件是可行的，而且成本比最初 README 设想的「host-only + 注入 `<style>`」更低：

- **官方扩展点已经存在**：Client 的 `ctx.theme.overrideTokens(source, tokens)` 接受任意 CSS 变量名 → `{ light, dark }` 的映射，正好覆盖「6 套调色板 + 随深浅色切换」的需求。
- **不需要改 DSH 组件 CSS，也不需要构建工具链**：正文是一份普通 JS 的 Client 半部；Host 半部承载 bundle 行、`Config`（强度 schema）与一条首帧注入 row，并在 0.3.0 起承担 Host 侧持久化的声明端（见 §3 / §5）。
- **覆盖率高**：UI 主样式由 token 驱动，覆盖 195 个颜色 token 即可整站改色，另有 11 个 `--shiki-*` 接管代码块高亮。已知硬编码例外：终端空态 SVG（`#17191d` / `#fff`）、macOS darwin 渐变、品牌与文件类型图标 artwork、主题样式表自身的字面 token 值（可被覆盖）。**首帧 / loading 页**在 0.2.0 已由 Host 半部经 `webserver/index-inject` 注入调色板覆盖；2026-10-21 起 loading spinner 环与进度弧也走 boot token（见 §5）。
- **配色数据已有权威来源**：官方 `palette.md` 提供 6 套背景色阶；**主参考选定 Everforest Enchanted**（Obsidian 端口）——它的背景值严格等于官方 dark-soft / light-hard，并给出 `header-*` 自定义色与完整的 UI 语义映射。因此默认配对采用「深色 soft / 浅色 hard」，与 Enchanted 观感一致，其余四档强度作为可选。
- **已知缺口**：终端 ANSI 16 色（xterm 内置默认盘）、brand mark 固定图、macOS 专用渐变、逐级标题彩色（DSH 无对应 token）。都不影响主体观感。

## 2. 调研方法（可复现）

1. **运行时检查**（权威、无侵入）：`cordis_inspect_query` 查询 Client `Service`（`theme` 契约）、`Theme.listTokens`、`Slots.listSubTree`（`settings.section` 拓扑）、Host `Config`（包名与 `packageDir`）。
2. **安装包解包**：DSH Desktop 的代码在 `resources/app.asar` 内，shell 工具无法直接读取。用零依赖 Node 脚本解析 asar 头（`uint32@4` = header pickle 大小，JSON 从 `{"files"` 起、数据区自 `8 + headerSize` 开始），导出 `@deepseek-ai/dsh-client-ui-theme`、`-ui-layout`、`-ui-chat`、`-ui-sidebar-terminal` 四个包后统计（2026-10-18 审计复核，口径修正）：
   - `--dsw-*` 变量声明：**403** 个**唯一名**是 ui-theme 单包 8 张 sheet 的合计（含字体 / 圆角 / 阴影；不是四个包的声明总数，按出现次数约 600+）；颜色类 **77 static + 107 alias + 11 specific = 195**，另有 **11** 个 shiki 变量（9 个 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background`）。
   - alias 107 的构成：101 条在 `design-platform.css`，2 条在 `base.css`（settings-card），4 条在 `onboarding.css`。
   - light 侧 alias/specific 声明 **112** 条（101 alias + 11 specific）：**74 条直接 `var(--dsw-static-*)` + 5 条含 static 的 `color-mix`** 可自动跟随；**28 条字面量 + 5 条 alias 间引用**必须显式处理。
   - `body[data-ds-dark-theme]` 重定义 **77 个 static + 101 个 alias**（旧文档写 105，属误记；onboarding 另有 3 条 dark 值）。
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
| 设置页导航项图标不可定制 | `settings.section` 注册项只有 `id` / `order` / `label`，没有 icon 字段；第三方页面在设置导航显示 DSH 默认齿轮（`dshmarket` 用 DOM 改写自行换图标） |
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
| 配色数据源 | **主参考 Everforest Enchanted**（默认配对 dark-soft / light-hard、`header-*` 色、UI 语义映射）；6 套背景色阶取自官方 `palette.md` | 默认观感与 Enchanted 一致；另外四档强度来自官方色阶。数据表、commit 快照与偏差记录见 [`reference/palette.md`](reference/palette.md) |
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
| shiki / diff 口径（2026-10-19） | 修正：shiki 只覆盖**代码块**三处（聊天气泡 / 工具输出 / 文件预览）；diff 走 `file-diff` / `code-diff` token | 文档与验收清单同步；不再按「diff 有语法高亮」验收 |
| 发布目标 | **npm 发布** | 需 display 元数据（`meta.title` / `meta.description` + 图标）、`engines.dsh`、`files`/`exports` 白名单、LICENSE + THIRD_PARTY_NOTICES、README 截图 |
| 包名 | `dsh-everforest`（2026-10-18 查询 npm registry 未占用，发布前复核） | — |

> 关于持久化的复核轨迹：2026-10-19 的结论是「链路存在但暂缓」——DSH 的设置/表单链路已确认（Host `settings.describe()` 只投影带 `.volatile()` 字段的活跃 profile 条目；客户端 `ctx.configForms.get(entryId)` 提供 `value/base/user/revision/writable` + `set/unset/mutate`；写入经 settings 服务落 profile `cordis.patch.yml` 并在所有已认证浏览器间广播），但当时本插件 Host 条目 `status: absent`、第三方条目是否被 serve 无先例、异步读取会让主题晚于首帧。**2026-10-22 复核结论：链路可用，已落地 0.3.0**——Host 半部声明 `Config` 后条目被 serve（`tests/integration.test.mjs` 用假 configForms 固化契约），首帧用 B 方案（缓存优先、Host 兜底）不再依赖 Host 读取时序；localStorage 降为缓存并用旧 key 播种 Host。Appearance 偏好仍由 `setTheme` 写入（见上表色卡交互）。

## 6. 覆盖矩阵

| 区域 | 覆盖方式 | 状态 |
|---|---|---|
| 主背景 / 分层表面 / 浮层 | `--dsw-alias-bg-*`、`--dsw-static-neutral-bluish-*` | ✅ 设计覆盖 |
| 文字三级 / 弱化 / 反色 | `--dsw-alias-label-*` | ✅ |
| 边框 / 分隔 / 焦点环 | `--dsw-alias-border-l*`、`--dsw-alias-state-business-primary` | ✅（含 7 条边框类字面量，含旧文档漏掉的 `border-inverted*`） |
| 品牌 / 主按钮 / 链接 | `--dsw-alias-brand-primary`（=`header-aqua`）、`--dsw-alias-link`（=`header-blue`） | ✅（另需显式覆盖 `label-primary-foreground` / `brand-text` / `button-primary-hover` / `-dimmed`） |
| 状态色（成功 / 警告 / 错误 / 进行中） | `--dsw-alias-state-*`（`green` / `yellow` / `red` / `blue`） | ✅ |
| 侧栏 / 气泡 / 输入框 / selector / settings 卡片 | `--dsw-specific-*`（侧栏 = `bg0` → `bg1` 80% 混合 + 对比度守卫，保留列边界；其余 Enchanted 平铺/层级风格）、`settings-card-*`（alias 引用，自动跟随） | ✅ |
| 菜单 / 浮层材质 | `--dsw-menu-surface-fill`、`--dsw-alias-menu-group-header-fill`、`--dsw-menu-backdrop-filter`（非颜色，保持默认）；`--dsw-specific-menu` 是 alias 引用自动跟随 | ✅（字面量，需显式） |
| 滚动条 | `--dsw-alias-scrollbar-*` 实际引用 `--dsw-static-neutral-200/300`（light）与 `700/600`（dark），随 static 映射自动跟随 | ✅ |
| diff（代码差异） | `--dsw-alias-file-diff-*`（字面 rgb）/ `code-diff-*`（static 引用，自动）；diff 是逐行底色 + marker，**不做语法高亮** | ✅ |
| 文档预览 | `--dsw-alias-bg-document-preview` / `label-document-preview`（alias 引用，自动） | ✅ 自动 |
| 代码块语法高亮 | 9 个 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background`（共 11 个，全部显式）；作用于聊天气泡 / 工具输出 / 右侧文件预览三处 `CodeBlock` | ✅ |
| 首帧 / loading 页 | Host 半部经 `webserver/index-inject` 追加 body script，在 Client 加载前把 boot 调色板写成 body 内联 token（scheme 读 ui-theme 已解析值；强度按 B 方案：本浏览器缓存优先 → Host 值兜底 → 默认，结果发布到 `window.__EVERFOREST_BOOT__`）；Web 首帧即 Everforest，Desktop 最多 1 帧原生色；loading spinner / 边框已由 boot token 覆盖（2026-10-21） | ✅ 0.2.0 覆盖（spinner/边框 0.2.1 补齐；强度 B 方案 0.3.0） |
| 逐级标题颜色 | Enchanted 的 h1–h6 各一色；DSH 无逐级颜色 token | ⚠️ 不覆盖（列入非目标） |
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
| `setTheme` 改写全局外观偏好 | 用户「跟随系统」被改成固定深浅色，且跨浏览器共享 | 已决策接受；设置页文案说明；恢复默认只重置强度、不改回 system |
| 版本判定文档互相矛盾 | 可能误判兼容策略 | 以 app-boot / plugin-manager 的行为为准（已实测代码路径：`semver.satisfies(..., { includePrerelease: true })`）；包内 `dsh-package-manifest` README 的「不强制」说法已过时 |
| 设置导航无图标 | 第三方页显示默认齿轮，观感不统一 | 已知限制；0.x 不做 DOM 改写（`dshmarket` 的做法），后续看 DSH 是否加 `icon` 字段 |
| Enchanted 的平铺背景 | DSH 部分表面依赖明度差，平铺后可能层次不清（**已发生**：Windows 下侧栏 / 标题栏 / 内容卡同色，列边界消失） | 已按 `design.md` 开放问题 5 落地修正：保持 `bg0` 主底，侧栏单独取 `bg0` → `bg1` 80% 混合 + 对比度守卫，并新增「侧栏边界 ≥ 1.02:1」硬门槛；其余层级仍用 `bg1`/`bg2` |
| `header-*` 色不随强度变化 | 硬/软档的背景亮度差较大时，Enchanted 的常量 header 色对比度可能不足 | 6 档逐页对比度检查；不达标则按背景亮度小幅修正并回写 `reference/palette.md` |

## 8. 工作量

| 阶段 | 内容 | 估算 |
|---|---|---|
| 0.1.0 | 包骨架 / 构建脚本 / 6 套调色板 / token 映射表 / 覆盖层应用 / 设置页 / 持久化 / 本地安装验证 | **2–2.5 天** |
| 0.2.0 | 全页面对比度走查与修正 / shiki 调色与口径修正 / 中英文案 / 图标 / README 截图 / **首帧 boot 注入** / 系统跟随收尾 / npm 发布 / 兼容范围实测 | **2.5–3 天**（首帧注入约 1 天，含测试与双端实测） |
| 0.3.0 | **Host 侧偏好持久化（`configForms`）**：Host `Config`（volatile light/dark）、Client 读写 / 采纳 / 迁移播种、首帧 B 方案、localStorage 降级为缓存、文案 / CI / 发布元数据 | **约 1 天**（不含跨浏览器 / 双端人工目检） |

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
| 8 | 首帧闪动 | **已实现并自动测试（0.2.0；0.3.0 改 B 方案）**：Host boot row 与 Client token 同值、缓存优先 / Host 兜底 / 非法值回退、`window.__EVERFOREST_BOOT__` 发布由 `tests/host-boot.test.mjs` 覆盖；Web 首帧截图、Desktop 冷启动录屏（原生色 ≤1 帧）仍待真机目检 |
| 9 | 覆盖 token 是否出现在 `Theme.listTokens` | **源码已证**（`exportInspectTokens` 并入 override 层 token 名）；待真机确认，作为安装后自检手段 |
| 10 | `client.js` 改动后的生效路径 | 待真机确认：Plugins 页停用→启用（Host 重新快照 bundle）或重启 Host；单纯刷新页面预计不会换 bundle 字节。**Host 半部（`index.js` / `src/host-config.js`）改动需要重启 Host 进程**才生效（`Config` 注册与首帧 row 在启动期装载）；运行中改强度走 settings 通道，不需要重启 |
| 11 | Host boot row 的 JSON / HTML 安全与顺序 | **已由测试覆盖**：row 是纯 JSON、无 `</script`、脚本幂等、无 `!important`；Host 值再按枚举校验并做 JSON / U+2028 / U+2029 转义；顺序依赖 ui-theme 的 `{ prepend: true }`（源码已证） |
| 12 | `settings` / `configForms` 对第三方 entry 可用性 | **已解决（2026-10-22，0.3.0）**：Host `Config` 的 volatile 字段被投影为表单、`ctx.configForms.get('everforest')` 提供读写与订阅（源码 + 集成测试契约）；`settings.configure({ auto: false })` 让 DSH 不再生成重复自动表单。剩真机「选强度 → patch 出现 config → 换浏览器 / 重启仍在」与写入被拒降级确认 |

## 10. 参考

- 配色数据：[sainnhe/everforest](https://github.com/sainnhe/everforest)（MIT）、[Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（MIT，主参考）、[在线调色板](https://everforest.vercel.app/palette)（校色）
- 本项目整理的数据表：[`reference/palette.md`](reference/palette.md)
- 本机插件先例：`dshmarket`（`settings.section` + `ctx.theme` 用法）、`dsh-cost-meter`（`dsh.compatibility` 写法）、`dsh-context`（`engines.dsh` + 双半部结构）
- DSH 实现：`@deepseek-ai/dsh-client-ui-theme`（`ThemeRuntime`、token 样式表、shiki）、`@deepseek-ai/dsh-client-ui-layout`（`ThemePresenter`）

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
| Client | 软注入 `ctx.inject(['configForms'])` → `formsCtx.configForms.get('everforest')` 订阅快照：就绪后 adopt（重建覆盖层 / 刷新设置页 / 回写缓存）；选择 = 一次 `mutate` 写两个字段，恢复默认 = 一次 `mutate` 里 `unset` 两个字段；`mutate` 被拒（`response.ok=false`）adopt 远端并 warn 一次；就绪前的选择排队补写；`writable:false` 守卫仅为防御（native provider 恒 true） |
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
- 自动化：`node --test` **143/143 通过**（Node 22；`host-boot.test.mjs` 的 Config / B 方案、`durable.test.mjs` 的纯函数、`integration.test.mjs` 的假 configForms 生命周期（采纳 / 播种 / 选择 / 恢复默认 / 写入被拒 / 旧宿主降级 / 延迟到达 / 广播 / 排队补写 / 卸载清理）、`state.test.mjs` 的 `readStoredState`）+ `npm run check` 全绿（palette / build / contrast，`client.js` 已重建为 v0.3.0 头）+ `npm pack --dry-run` 清单齐全（含 `src/host-config.js`）。
- 行为级证据（真实 DSH 投影逻辑 + schemastery 3.18.5 复现）：`volatileForm(Config)` 非空、`projectForm` 得 `{ light, dark }`、round-trip 校验通过、非法值被拒、空 profile 有效值 `{ light: 'hard', dark: 'soft' }`。
- 人工（发布前）：跨浏览器共享（两个浏览器 / 清 localStorage）、DSH 重启后保持、0.2.1 → 0.3.0 一次性播种、写入被拒回读、非法值两种表现、Web 与 Desktop 首帧三路径、Desktop 冷启动 ≤1 帧；发布注意（Host 重启、市场冷静期）见 [`releasing.md`](releasing.md)。

**残余与后续**

- 0.3.0 的真机目检与 npm 发布仍是发布前待办；发布后需按 [`releasing.md`](releasing.md) §8.2 的市场条目草稿更新描述（补 Host 配置 / 跨浏览器共享），并等 24h `minimumReleaseAge` 冷静期再验收市场安装。
- 已知取舍「一次性迁移与跨浏览器重置」（浏览器 B 的旧缓存会再播种一次）见 §7 风险表 / [design.md](design.md) §7 / §11 #12；0.3.0 接受，将来若消除需要 per-browser 一次性标记或版本 / 时间戳判定。
