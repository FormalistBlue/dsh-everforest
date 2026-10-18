# 可行性评估与方案取舍

> 日期：2026-10-18 · 评估对象：DSH **0.2.1-rc.2**（Desktop，Windows）· 结论：**可行，采用路线 A**（见下）。

## 1. 结论

做一个 Everforest 主题插件是可行的，而且成本比最初 README 设想的「host-only + 注入 `<style>`」更低：

- **官方扩展点已经存在**：Client 的 `ctx.theme.overrideTokens(source, tokens)` 接受任意 CSS 变量名 → `{ light, dark }` 的映射，正好覆盖「6 套调色板 + 随深浅色切换」的需求。
- **不需要改 DSH 组件 CSS，也不需要构建工具链**：正文是一份普通 JS 的 Client 半部；Host 半部可以留空。
- **覆盖率高**：UI 主样式由 token 驱动，覆盖 195 个颜色 token 即可整站改色，另有 11 个 `--shiki-*` 接管代码高亮。已知硬编码例外：终端空态 SVG（`#17191d` / `#fff`）、Host 首帧/loading 页字面底色（`#fff` / `#151517`）、macOS darwin 渐变、品牌与文件类型图标 artwork、主题样式表自身的字面 token 值（可被覆盖）。
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
| 代码高亮是独立变量，可覆盖 | `ui-theme` 的 `shiki.css`：`:root{--shiki-token-constant:#1c7ed6; …}` + `body[data-ds-dark-theme]{…}`；`--shiki-foreground/background` 在 `:root` 引用 body 级 alias（级联上 guaranteed-invalid），必须显式给值 |
| 设置页插槽可用，且三方插件已在用 | `Slots.listSubTree` 根 `settings.section` 的 occupants 含 `dsh-market`、`cost-meter`；注册项 `{ id, order, label }`，owner props `{ close }` |
| 设置页导航项图标不可定制 | `settings.section` 注册项只有 `id` / `order` / `label`，没有 icon 字段；第三方页面在设置导航显示 DSH 默认齿轮（`dshmarket` 用 DOM 改写自行换图标） |
| 主题包由 Client 半部按包名加载 | `@deepseek-ai/dsh-client-modules`：`dsh.client.platform: 'web'` + `exports["./client"]`；入口格式唯一 `window.__ModuleLoader__.load({ id, factory(require) })`，id 必须等于包名；`dsh.client.inject` 只影响 bundle 到达顺序，不是服务注入 |
| `styles.insert` 不适用于已安装插件 | 它只是模型动态 Cordis 包 browser half 的闭包内建；npm 安装的 client bundle 需自己创建 `<style>`、打 `data-plugin` 标记，并在 `ctx.effect` cleanup 里移除 |
| 第三方 Client 半部可直接用 `ctx.theme` / `theme/change` | `dshmarket` 的 `src/client/index.ts`：`inject = ['slots','locale','theme']`、`themeStore.getSnapshot: () => ctx.theme.getTheme()` |

## 4. 路线对比与决策

| 路线 | 说明 | 结论 |
|---|---|---|
| **A. Client 半部 + `overrideTokens`** | 官方扩展点；任意 CSS 变量；自动双 scheme；卸载还原（disposer 挂 `ctx.effect`）；无构建依赖 | ✅ **采用** |
| B. Host-only + `webServer.tapIndex` 注入 `<style>` | 能做（token 样式表可被同优先级后置规则覆盖），但要自己写两套 `body` 规则、与内联变量博弈、卸载不干净、拿不到 `theme/change` | ❌ 放弃 |
| C. `register()` 注册主题 + Appearance 集成 | 设计上就不支持三方主题持久化，还要和内置 Appearance 行抢状态 | ❌ 放弃 |

补充：Host 半部仍保留（空 `apply`），因为 bundle 需要一个插件行来承载 `package.json` 的 `dsh.client` 声明与 Plugin Manager 中的显示信息（标题 / 描述 / 图标 / 启停）。

## 5. 决策记录

| 决策 | 结论 | 影响 |
|---|---|---|
| 变体数量 | **6 套**：Dark / Light × Hard / Medium / Soft | 深浅色两组各自保存强度；色卡分「深色 3 张 + 浅色 3 张」，点击即切到对应深浅色并应用该强度 |
| 配色数据源 | **主参考 Everforest Enchanted**（默认配对 dark-soft / light-hard、`header-*` 色、UI 语义映射）；6 套背景色阶取自官方 `palette.md` | 默认观感与 Enchanted 一致；另外四档强度来自官方色阶。数据表、commit 快照与偏差记录见 [`reference/palette.md`](reference/palette.md) |
| 配置入口 | **直接做设置页**（`settings.section`），不依赖 Appearance 改造 | 需要自建状态存储与组件；强度偏好不能写进 DSH 设置文档（见下） |
| 色卡交互（2026-10-18） | 点另一深浅色组的色卡时**同时调用 `ctx.theme.setTheme(scheme)`** 立即预览 | 会把用户 Appearance 偏好实打实写进 Host 设置（所有已认证浏览器共享，`system` → 固定深浅色）；设置页文案必须说明 |
| 偏好持久化 | **localStorage**（key 带版本号），设置页读写 | 逐 origin 生效：Desktop 窗口 origin 固定 `dsh-app://app`，跨重启保持；浏览器打开 Host URL 时端口每次随机、不跨重启；与 DSH「Host 偏好跨浏览器共享」不同，需在文档与设置页文案中说明 |
| 兼容范围（2026-10-18） | `engines.dsh = ">=0.2.1-rc.2 <0.3.0-0"` | DSH 安装前与装载 profile 时都会强制；排除 0.3 及其预发布，避免 token 改名后半残 |
| 首帧闪动 | 0.1.0 接受 loading/首帧为 DSH 原生色，0.3.0 再评估消除 | 首帧底色来自 Host boot 注入的字面 CSS；`dsh.client.immediately` 在本版本无观察作用，不能依赖 |
| 发布目标 | **npm 发布** | 需 display 元数据（`meta.title` / `meta.description` + 图标）、`engines.dsh`、`files`/`exports` 白名单、LICENSE + THIRD_PARTY_NOTICES、README 截图 |
| 包名 | `dsh-everforest`（2026-10-18 查询 npm registry 未占用，发布前复核） | — |

> 关于持久化（2026-10-18 审计修正）：DSH 的「设置文档」按插件 Config 条目服务。已安装 Client bundle 是否能通过 `ctx.configForms.get(<自己的 Host entry id>)` 读写自己的 Config 尚未实测（`configForms` 对 ui-theme 等官方包可用，第三方无先例）；即使可行，Host 读取是异步的，主题会晚于首帧生效（可能闪动）。因此视觉偏好先用**同步的 localStorage** 落地；Appearance 偏好本身可以通过 `setTheme` 写入（见 §5 色卡交互）。Host 侧持久化列入 0.3.0 并先做可行性 spike。

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
| diff（代码差异） | `--dsw-alias-file-diff-*`（字面 rgb）/ `code-diff-*`（static 引用，自动） | ✅ |
| 文档预览 | `--dsw-alias-bg-document-preview` / `label-document-preview`（alias 引用，自动） | ✅ 自动 |
| 代码块语法高亮 | 9 个 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background`（共 11 个，全部显式） | ✅ |
| 首帧 / loading 页 | Host boot 注入的字面 CSS（light `#fff` / dark `#151517`），早于插件生效 | ⚠️ 不覆盖（已知缺口，0.3.0 评估） |
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
| 持久化只在单 origin | 换浏览器 / 用浏览器打开 Host URL 后回到默认强度 | 设置页说明「按浏览器 / 窗口保存」；Desktop 窗口 origin 固定可持久；0.3.0 评估 Host 侧偏好 |
| 设置页插槽属内部契约 | DSH 改版可能调整 `settings.section` | 与 `dshmarket`/`cost-meter` 相同的用法；注册失败时降级为「无设置页、默认配对（深色 Soft / 浅色 Hard）」，不影响主题生效 |
| 覆盖层残留 | 插件停用后颜色不还原 | disposer 必须挂 `ctx.effect`（已写入 design §5）；验收项「停用后 body 内联变量消失」 |
| 首屏闪动 | 冷启动先看到 DSH 原生配色，再切 Everforest | 首帧来自 Host boot 字面 CSS，插件无法提前；`immediately` 本版本无作用；0.3.0 评估首帧注入（Electron `dsh-app://` 窗口是否可覆盖待实测） |
| `setTheme` 改写全局外观偏好 | 用户「跟随系统」被改成固定深浅色，且跨浏览器共享 | 已决策接受；设置页文案说明；恢复默认只重置强度、不改回 system |
| 版本判定文档互相矛盾 | 可能误判兼容策略 | 以 app-boot / plugin-manager 的行为为准（已实测代码路径：`semver.satisfies(..., { includePrerelease: true })`）；包内 `dsh-package-manifest` README 的「不强制」说法已过时 |
| 设置导航无图标 | 第三方页显示默认齿轮，观感不统一 | 已知限制；0.x 不做 DOM 改写（`dshmarket` 的做法），后续看 DSH 是否加 `icon` 字段 |
| Enchanted 的平铺背景 | DSH 部分表面依赖明度差，平铺后可能层次不清（**已发生**：Windows 下侧栏 / 标题栏 / 内容卡同色，列边界消失） | 已按 `design.md` 开放问题 5 落地修正：保持 `bg0` 主底，侧栏单独取 `bg0` → `bg1` 80% 混合 + 对比度守卫，并新增「侧栏边界 ≥ 1.02:1」硬门槛；其余层级仍用 `bg1`/`bg2` |
| `header-*` 色不随强度变化 | 硬/软档的背景亮度差较大时，Enchanted 的常量 header 色对比度可能不足 | 6 档逐页对比度检查；不达标则按背景亮度小幅修正并回写 `reference/palette.md` |

## 8. 工作量

| 阶段 | 内容 | 估算 |
|---|---|---|
| 0.1.0 | 包骨架 / 构建脚本 / 6 套调色板 / token 映射表 / 覆盖层应用 / 设置页 / 持久化 / 本地安装验证 | **2–2.5 天** |
| 0.2.0 | 全页面对比度走查与修正 / shiki 调色 / 中英文案 / 图标 / README 截图 / npm 发布 / 兼容范围实测 | **1.5–2 天** |
| 0.3.0（可选） | Host 侧偏好持久化、首屏注入、系统跟随细节 | 0.5–1 天 |

## 9. 实现前待验证清单（2026-10-18 审计后状态）

| # | 项 | 状态 |
|---|---|---|
| 1 | `settings.section` 注册后导航项与页面实际渲染 | **源码已证可用**（`dshmarket` 现网用法 + slot 契约含 ownerProps `{close}`）；剩真机确认导航出现、label 随中英文切换、停用后消失 |
| 2 | localStorage 在 Desktop / 浏览器的可用性 | **源码已证**：Desktop Electron 主窗口 origin 固定 `dsh-app://app`（标准安全协议 + 默认持久 session），跨重启应保持；浏览器打开 Host URL 时端口每次随机（`--port 0`），不跨重启。剩真机「选强度 → 退出 → 重启 → 仍在」确认 |
| 3 | `overrideTokens` 的 source 是否被钉为包名 | **假设不成立**：已安装 bundle 走普通 cordis ctx，`source` 由插件自己传（无强制、无校验）；façade 钉名只发生在模型动态 Cordis 包。同 source 替换 / 旧 disposer no-op / 校验规则源码已证；剩真机确认停用后内联变量消失 |
| 4 | `engines.dsh` 的安装 / 激活判定 | **已解决**：安装前（plugin-manager）与装载 profile 时（app-boot，`includePrerelease: true`）都强制；`>=0.2.1-rc.2 <0.3.0-0` 在本机通过。不兼容时安装被拒 / 已安装 bundle 被跳过并打印警告 |
| 5 | `--shiki-*` 是否在聊天气泡、diff、工具输出三处共同生效 | 待真机目检 |
| 6 | 默认配对与 Enchanted 一致（dark soft `bg0 #333C43` / light hard `bg0 #FFFBEF`） | 文档数据自洽；**不要用 body `background-color` 计算值校验**（首帧 CSS 字面色覆盖），改核对 body 内联 `--dsw-alias-bg-base` |
| 7 | 6 档强度 × 关键前景色的对比度检查记录 | 实现期工作项（`node` 脚本算 WCAG 对比度） |
| 8 | 首帧闪动观察 | 待真机记录（已知缺口） |
| 9 | 覆盖 token 是否出现在 `Theme.listTokens` | **源码已证**（`exportInspectTokens` 并入 override 层 token 名）；待真机确认，作为安装后自检手段 |
| 10 | `client.js` 改动后的生效路径 | 待真机确认：Plugins 页停用→启用（Host 重新快照 bundle）或重启 Host；单纯刷新页面预计不会换 bundle 字节 |

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
- 「除 mask 黑白外无硬编码」不成立：终端空态 SVG、首帧 CSS、darwin 渐变、artwork 等为例外；
- `static` 色阶不能「按明度一一对应」，需要插值 / 混合公式；
- 文档选中色要保留 40% 透明语义（`color-mix`），不能直接给实色；
- light 选中色 `#DED8DB` 上游只用于 light · hard，其余两档是本项目外推（已在 palette.md 标注）。

**环境**：本会话 sandbox 的 pwsh 曾因 Windows ACL 受限令牌 DLL 初始化失败（`0xC0000142`）完全不可用；切换 Full access 后恢复。本机 node 24.21.0 / pnpm 11.28.5 位于 Desktop 运行时目录（见 README「开发」）；`plugin_manager` 的读操作可正常调用。
