# 实施方案

> 配套：[`assessment.md`](assessment.md)（为什么这样做）· [`reference/palette.md`](reference/palette.md)（配色数据与来源）· 目标环境：DSH 0.2.1-rc.2 · 状态：**已实现（v0.2.0，2026-10-19 增加首帧 Host boot 注入与系统跟随/文档收尾）**；实现实况见 [`reference/token-inventory.md`](reference/token-inventory.md) 与 [`reference/contrast.md`](reference/contrast.md)

## 1. 目标与非目标

**目标**

1. 6 套 Everforest 调色板：`dark-hard` / `dark-medium` / `dark-soft` / `light-hard` / `light-medium` / `light-soft`；**默认配对对齐 Everforest Enchanted**（深色 soft、浅色 hard）。
2. 全站改色：背景、文字、边框、品牌、状态、侧栏、菜单/浮层、diff、代码高亮。
3. 设置页可选强度，切换即时生效、重载后保持。
4. 可用 npm 安装。DSH 版本不匹配时给出可读结果：安装前被插件管理器拒绝（`engines.dsh`，可读错误）；已安装后升级 DSH 导致不兼容时，该 bundle 在装载 profile 时被跳过并在启动诊断里打印警告（不会白屏）。
5. 冷启动首帧使用当前配色：Host 半部经 `webserver/index-inject` 在 Client 加载前写入 boot 调色板（loading 页底色与文字）。Web 首帧即为 Everforest；Desktop 窗口在 load 后才显示、注入行由页面侧异步应用，最多残留 1 帧原生色（2026-10-19 决策接受）。

**非目标（0.x）**

- 不替换 DSH 的 Appearance 开关（light / dark / system 仍由 DSH 决定）；设置页只提供等价的快捷控制（见 §6），写入同一份全局偏好。
- 不接管终端 ANSI 16 色、brand mark、macOS 专用渐变。
- 不覆盖 loading 动效里的灰色 spinner / 边框：它们由 boot 页 `.boot` 的局部字面变量控制，覆盖需要脆弱的选择器改写，收益不值得（0.x 不做）。
- 不写 DSH 设置文档里的**强度偏好**：2026-10-19 决定 Host 侧持久化**暂缓**（localStorage 继续是唯一持久化；`configForms` 路线与 spike 条件见 assessment §11）。**Appearance 偏好例外**：点色卡或设置页外观控制会通过 `ctx.theme.setTheme` 写入（见 §2 / §6，已决策）。
- 不做 Enchanted 的逐级标题彩色（h1–h6 各一色）：DSH 没有逐级标题颜色 token，实现它需要改写组件选择器，违背「只走 token」的原则。

## 2. 总体架构

```
┌────────────────────────── Browser（Client 半部 client.js）──────────────────────────┐
│                                                                                     │
│  apply(ctx)                                                                         │
│   ├─ export const inject = ['theme']（slots / locale 用 ctx.get 读取，缺失时 ctx.inject 等待） │
│   ├─ readState() ── localStorage('dsh-everforest/v1') ──► { light, dark }            │
│   ├─ ctx.effect(() => ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state)))        │
│   ├─ ctx.effect(() => ctx.locale.register(NS, { zh, en }))（en/zh 是内置 locale id）  │
│   └─ ctx.slots.inject('settings.section', () => ctx.slots.register({ id: 'everforest', … })) │
│                                                                                     │
│  EverforestSection                                                                  │
│   ├─ 外观控制 3 按钮：跟随系统 / 深色 / 浅色 → store.setPreference → setTheme      │
│   ├─ 深色组 3 张卡 / 浅色组 3 张卡                                                   │
│   └─ onClick: writeState → 替换同 source 覆盖层 → ctx.theme.setTheme(scheme)（已决策）│
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                     DSH ThemeRuntime + ui-layout ThemePresenter
                     （body 内联变量；theme/change 广播；卸载自动还原）
                                        │
┌────────────────────────── Host（index.js）──────────────────────────────────────────┐
│  apply(ctx)                                                                         │
│   ├─ 承载 bundle 行与 Plugin Manager 显示信息（无 Host 服务依赖）                    │
│   └─ ctx.on('webserver/index-inject', table => table.push({                          │
│        kind: 'script', placement: 'body', text: bootScript() }))                    │
│       // 首帧调色板：读 ui-theme 已解析的 scheme + localStorage 强度，               │
│       // 在 Client 加载前写 body 内联 token（见 §5「首帧注入」）                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

> 首帧注入是 Host 半部唯一的运行时职责。ui-theme 也监听同一事件并 `prepend` 自己的 boot rows（`:root{color-scheme}` + body `background-color:#fff/#151517` + `data-ds-theme-source` / `data-ds-dark-theme`），所以本插件的 row 一定排在它之后，脚本里能读到已解析的 scheme。

生命周期要点：

- **覆盖层必须由插件自己的 effect 持有**：`overrideTokens` 返回的 disposer 不会随插件 fiber 自动调用（层存在 root 级 `ThemeRuntime` 里），所以必须 `ctx.effect(() => ctx.theme.overrideTokens(...))` 或把返回的 disposer 挂进 effect；否则插件停用后会残留到页面重载。`ctx.locale.register` 同理需要 `ctx.effect`；`ctx.slots.register` / `ctx.slots.inject` 由 slot service 代挂调用者 fiber，可省略。
- 选强度不重建插件，只替换同一 source 的覆盖层（`overrideTokens` 语义：同 source 整体替换并重新置顶，旧 disposer 变为 no-op）；替换后发 `theme/change`，presenter 同步重新应用。
- 深浅色切换不需要插件做任何事：覆盖层里每个 token 同时带 `light` 与 `dark`，presenter 按当前 `active.colorScheme` 取值。
- 首帧（Client 加载前）：Host 半部的 boot row 写入 6 个 token（`bg-base`、三级 label、代码块底、`sidebar-fill`），值来自同一份 `tokensFor()`；Client ThemePresenter 首次 apply 用同名 body 内联变量覆盖，因此不会残留。若 Client 半部加载失败，boot 调色板保留到本页结束（可接受的降级）。
- 设置页点另一深浅色组的色卡会调用 `ctx.theme.setTheme(scheme)` 立即预览；**这会真实写入 DSH 的全局 Appearance 偏好**（Host 设置文档，所有已认证浏览器共享），并把「跟随系统」改成固定深浅色。页面顶部的「跟随系统 / 深色 / 浅色」控制写同一份偏好，可随时恢复 `system`（已决策，2026-10-18；外观控制为后续补充）。

## 3. 数据模型

### 3.1 调色板（6 套）

完整数据表与来源见 [`reference/palette.md`](reference/palette.md)（官方 palette.md + Everforest Enchanted，均记录 commit 快照）。模型把「背景」与「前景」拆开：

```js
/** 每个变体 = 一套背景色阶（hard/medium/soft × dark/light，来自官方 palette.md） */
/** @typedef {{ bgDim,bg0,bg1,bg2,bg3,bg4,bg5,
 *  bgVisual,bgRed,bgYellow,bgGreen,bgBlue,bgPurple }} BackgroundRamp */
/** 前景 / 强调 / header 色按 scheme 共享（官方语义：强调色不随对比度变化） */
/** @typedef {{ fg, red,orange,yellow,green,aqua,blue,purple, grey0,grey1,grey2,
 *  headerRed,headerOrange,headerYellow,headerGreen,headerAqua,headerBlue,headerPurple }} Foreground */
```

- **变体只切换背景色阶**：`dark-hard / dark-medium / dark-soft / light-hard / light-medium / light-soft`，共 6 套；前景、强调、`header-*` 色在同一 scheme 内保持不变。这样选强度只改「底」，语义色（链接、状态、品牌）始终是同一套 Everforest 色。
- **默认配对对齐 Everforest Enchanted**：深色 = `soft`、浅色 = `hard`。Enchanted 的背景值严格等于官方这两套，所以默认观感与其一致；另外四套作为可选的强度档。
- **`header-*` 自定义色**也来自 Enchanted（比 `fg-*` 更沉稳，用于链接 / 交互强调 / 品牌）；light 的文档选中色采用 Enchanted 的 `#DED8DB` 修正——该修正上游只在 light · hard 上出现，本插件外推到 light · medium / soft（见 `reference/palette.md` §3 注）。
- 数据由 `scripts/palette.mjs` 生成 `src/palette.js`，单元测试固定期望值，避免手抄漂移。

### 3.2 用户状态

```js
/** 持久化结构（localStorage: 'dsh-everforest/v1'） */
{
  version: 1,
  light: 'hard' | 'medium' | 'soft',   // 默认 'hard'（对齐 Enchanted 的 Light 主题）
  dark:  'hard' | 'medium' | 'soft'    // 默认 'soft'（对齐 Enchanted 的 Dark 主题）
}
```

读取失败、字段非法、版本不认识 → 回退默认并尝试重写，不抛错。

### 3.3 覆盖层

```js
/** Record<cssVariableName, { light: string, dark: string }> */
tokensFor(state) → {
  '--dsw-alias-bg-base': { light: lightRamp.bg0, dark: darkRamp.bg0 },
  '--dsw-alias-brand-primary': { light: lightFg.headerAqua, dark: darkFg.headerAqua },
  '--dsw-static-neutral-bluish-1000': { light: lightFg.fg, dark: darkFg.fg },
  '--shiki-token-keyword': { light: lightFg.blue, dark: darkFg.blue },
  …
}
```

## 4. token 映射策略（三层）

> **2026-10-18 实现前审计修正**（证据：DSH 0.2.1-rc.2 的 `@deepseek-ai/dsh-client-ui-theme` 8 张样式表；与本机 asar 交叉）：
>
> - 统计口径：403 个 `--dsw-*` 是 **ui-theme 单包 8 张 sheet 的唯一名合计**（不是四个包）；颜色类 77 static + 107 alias + 11 specific = 195 ✔；107 alias = 101 design-platform + 2 settings-card + 4 onboarding；dark 侧 alias 重定义为 **101**（旧文档写 105 有误）；「11 个 `--shiki-token-*`」实为 **9 个 token 变量 + `--shiki-foreground` + `--shiki-background`**。
> - light 侧 112 条 alias/specific 声明（101 alias + 11 specific）：74 条直接 `var(--dsw-static-*)` + 5 条 color-mix（内含 static）可跟随；**28 条字面量 + 5 条 alias 间引用**需要显式处理。
> - **static 色阶不能「按明度顺序一一映射」**：DSH 的 blue 12 步、neutral-bluish 19 步，Everforest 同色相只有 3–5 档。实现时先写映射公式（分段线性插值 + 明度端点锚定，必要时 `color-mix`），再用对比度检查验证，不能逐条手抄。
> - **必须显式覆盖的新增项**（旧文档未提）：`border-inverted*`、`label-primary-foreground` / `brand-text`（品牌实底上的前景）、`button-primary-hover` / `-dimmed`、`markdown-inline-code`（默认引用中性 static，只改 static 会变中性；DSH 实际用作背景，映射见下文修正）、4 个带 alpha 的 static（`green-500-a08/a12`、`red-400-a12`、`red-600-a08`）、`menu-surface-fill` / `menu-group-header-fill` / `button-tool-bar-*`、遮罩族、`linear-gradient-think*`（Windows 可见）、onboarding 7 个 token、`tooltip-key-bg`。
> - **文档选中色保留 40% 透明语义**：`--dsw-alias-bg-document-selection` 给 `color-mix(in srgb, bg_visual 40%, transparent)`，不要直接给实色（否则文档预览选区会盖住底图）。
> - **shiki 必须显式**：`shiki.css` 在 `:root` 声明 light 值，且 `--shiki-background` / `--shiki-foreground` 在 `:root` 引用的是 body 级 alias（级联上属 guaranteed-invalid），不能靠 alias 继承。
> - **明确不覆盖**：字体 / 圆角 / 阴影 / `--dsw-focus-ring-color` / `--dsw-focus-ring-width` / `--dsw-menu-backdrop-filter` / 终端 ANSI 16 色 / brand mark 与文件图标 artwork / macOS darwin 渐变。boot 首帧色已改由 Host 半部的 `index-inject` row 覆盖（见 §5「首帧注入」与 §12），不再属于不覆盖项。未覆盖的 alias 保持 DSH 原值，并在 `src/tokens.js` 顶部登记清单。

> **2026-10-18 视觉走查修正（inline code 芯片）**（证据：`dsh-web-frontend/dist/assets/index-*.css`：`.markdown :not(pre) > code { background-color: var(--dsw-alias-markdown-inline-code); border: .5px solid var(--dsw-alias-border-l1) }`；native light = `static-neutral-50`、dark = `static-neutral-800`，两侧都是**背景**中性色）：
>
> - 旧方案把该 token 映射成 `p.fg.blue`，误把 Enchanted 的前景变量 `--code-inline`（蓝色**文字**）当成了 DSH 的背景语义。实际渲染是「饱和蓝色块 + 继承的 `label-primary` 深色字」：`label-primary` 对该底的对比度 light 仅 **1.65:1**、dark **1.29:1**，既抢眼又难读（浅色主题下最明显）。
> - 修正：映射为 Everforest 的 `bg_blue` 芯片表面（`inlineCodeSurface`，取调色板里「蓝色背景」角色：light 淡薄荷、dark 灰蓝），文案仍继承 `label-primary`；并把该 token 加入 `scripts/check-contrast.mjs` 的文本承载表面硬门槛，6 档 ≥ 4.5:1。
> - 结果：light-hard 芯片 `#ECF5ED`（5.01:1）、light-soft `#E6E8DA`（4.50:1）、dark-hard `#384B55`（5.39:1）、dark-soft `#3F5764`（4.51:1）；芯片比 `bg0` 略深（light）/ 略浅（dark），只是一个安静的代码底，不再是前景强调色。

> **2026-10-18 视觉走查修正（侧栏边界）**（证据：`@deepseek-ai/dsh-client-ui-layout` 的 `AppFrame.module.css`、`dsh-client-ui-sidebar` 的 `SidebarRoot.module.css`；用户截图对比）：
>
> - DSH 用 `--dsw-specific-sidebar-fill` 画三处：侧栏列（`.sidebarCol`）、Windows 标题栏条（`[data-windows-titlebar] .frame:before`）以及内容卡背后的 frame；内容卡本身是 `--dsw-alias-bg-base`（bg0）+ 16px 左上圆角（`[data-windows-titlebar] .centerCol`）。native 两侧本就不同（light 侧栏 `#f9fafb` / 内容 `#fff`，dark `#1b1b1c` / `#151517`），所以能看出边界。
> - 旧方案把两者都映射成 `bg0`（Enchanted 平铺风格），整条边界消失 —— 用户报告「Everforest 全部用的同一个颜色，没法区分边界线了」。
> - 修正：`--dsw-specific-sidebar-fill` = `mix(bg0, bg1, 80%)` 再经 `readableSurface` 守卫（light 更深、dark 更浅，方向与 native 侧栏一致）；6 档边界对比度 1.03–1.12（native 1.045 / 1.060，观感同级）。light·soft 受正文 4.5:1 上限约束，实际取 `#eee7ce`（守卫后的最大步长）。该 token 已加入 `scripts/check-contrast.mjs` 的文本承载表面，并新增「侧栏边界 ≥ 1.02:1」硬门槛（`contrast.md` §2c/§3）。
> - 连带：该 token 同时是桌面端 Windows 原生标题栏（DWM caption）的取色来源（`preload-app.cjs` 探针），标题栏会与自绘标题栏条同色；`settings-general` 的设置导航（`sidebar-nav-item-*`）位于内容区 `bg-base` 上，不受影响。

### 第 1 层：派生映射（覆盖 195 个颜色 token）

`src/tokens.js` 用「角色 / 表达式」描述，而不是逐条写死六份颜色：

```js
export const TOKEN_MAP = {
  // 背景 / 表面
  '--dsw-alias-bg-base':               r => r.bg0,
  '--dsw-alias-bg-layer-1':            r => r.bg1,
  '--dsw-alias-bg-layer-2':            r => r.bg2,
  '--dsw-alias-bg-layer-3':            r => r.bg3,
  '--dsw-alias-bg-overlay':            r => r.bg2,
  // 侧栏 = bg0 向 bg1 混 80% + 对比度守卫：与 bg-base 拉开可辨边界（见上方修正）
  '--dsw-specific-sidebar-fill':       r => sidebarSurface(r),
  // 气泡 = 浅色 sage tint（light·soft 因 4.5:1 文本上限改用近白抬起卡片）；深色 bg1（见 §12）
  '--dsw-specific-bubble':             r => bubbleSurface(r),
  '--dsw-alias-markdown-code-block':   r => r.bgDim,
  // 文字 / 边框
  '--dsw-alias-label-primary':         r => r.fg,
  '--dsw-alias-label-secondary':       r => r.grey1,
  '--dsw-alias-label-tertiary':        r => r.grey2,
  '--dsw-alias-border-l1':             r => alpha(r.bg5, 0.45),
  '--dsw-alias-border-l3':             r => alpha(r.bg5, 0.80),
  // 强调 / 状态（Enchanted 语义）
  '--dsw-alias-brand-primary':         r => r.headerAqua,
  '--dsw-alias-link':                  r => r.headerBlue,
  '--dsw-alias-state-success-primary': r => r.green,
  '--dsw-alias-state-warn-primary':    r => r.yellow,
  '--dsw-alias-state-error-primary':   r => r.red,
  '--dsw-alias-state-business-primary':r => r.blue,
  '--dsw-alias-state-idle-primary':    r => r.grey2,
  …
}
```

DSH 概念 → Everforest 角色的基线映射（细节在实现时展开）：

| DSH | Everforest | 依据 |
|---|---|---|
| `bg-base` | `bg0` | 主背景 |
| `bg-layer-1/2/3` | `bg1` / `bg2` / `bg3` | 输入框、行 hover、菜单、嵌套层 |
| `bg-overlay` | `bg2` | 浮层 / popover |
| `specific-sidebar-fill` | `bg0` → `bg1` 的 80% 混合（对比度守卫） | 侧栏列 / Windows 标题栏条与内容卡（`bg-base` + 16px 圆角）之间需要可辨边界；平铺 `bg0` 会让边界消失（见上方 2026-10-18 修正） |
| `specific-bubble` | 浅色：`bg0` → `header-aqua` 16% 的 sage 纸面（`readableToward` 向白守卫）；light·soft 因文本 4.5:1 上限改为近白冷调抬起卡片。深色：`bg1`（对比度守卫） | DSH 用户消息气泡；2026-10-19 修正：旧映射 `bg1` 与 `bg0` 仅 1.02–1.06，浅色下与画布融为一体（见 §12） |
| `specific-bubble-highlight` | 浅色 / 深色均 `surface(p, 2)` | 气泡高亮态（当前 chat 未使用，保留最近层级语义） |
| `markdown-code-block` | `bg_dim` | Enchanted 代码底 |
| `markdown-inline-code` | `bg_blue`（芯片表面） | DSH 用作 inline code 的**背景**（文字继承 `label-primary`）；Enchanted `--code-inline` 是前景色，不可复用 |
| `label-primary/secondary/tertiary` | `fg` / `grey1` / `grey2` | — |
| `border-l1..l4` | `bg5` 的 45/60/75/90% alpha | Enchanted 边框 = `bg5` |
| `brand-primary`（主按钮、选中） | `header-aqua` | Enchanted `interactive-accent` |
| `link` | `header-blue` | Enchanted 外部链接 / `text-accent` |
| `state-success / warn / error / business / idle` | `green` / `yellow` / `red` / `blue` / `grey2` | Enchanted 语义 + 状态可读性 |
| `bg-document-selection` | `bg_visual`（light 用 `#DED8DB`） | Enchanted 选区修正 |
| `file-diff-*` / `code-diff-*` | `bg_green` / `bg_red` 底 + `green` / `red` 标记 | Everforest diff 语义 |
| `bg-mask-1/2/3`、`bg-mask-photo`、`bg-mask-drop`、`bg-skeleton` | 保持黑白高透明，仅按变体微调 | 遮罩语义 |
| `menu-surface-fill`、`alias-menu-group-header-fill`、`button-tool-bar-*` | `bg2` + 原不透明度 alpha | 浮层 / 工具栏材质 |
| `border-inverted` / `border-inverted2` | `bg5` alpha（浅色低透明度、深色约白 6%） | 反向边框 |
| `label-primary-foreground` / `brand-text` | `bg0`（品牌 / 主按钮实色底上的前景） | 避免青绿底配白字对比不足 |
| `button-primary-hover` / `button-primary-dimmed` | `header-blue`（hover）/ `header-aqua` 降低饱和（dimmed） | 主按钮状态，默认引用中性 static |
| `interactive-bg-active` / `-hover` / `-hover-accent` / `-hover-danger` | `bg3` / `bg4` + `header-*` 半透明 | 交互反馈 |
| `linear-gradient-think`、`linear-think-select` | `bg0` → `bg1` 渐隐 | 思考过程渐隐（Windows 可见） |
| onboarding（accent + 3 渐变 stops + card/secondary/checkbox 边框） | `header-aqua` / `bg_*` 派生 | 首登页，7 个 token |
| `brand-primary-new-color` | `header-aqua` | 品牌强调（light 侧是字面量） |
| `tooltip-key-bg` | tooltip 深色底向亮端 `mix(…, 25%)`（实现修正，原写 `bg3`） | 键帽 |
| `focus-ring`（不覆盖） | 走 `state-business-primary` 派生 | 焦点环跟随状态色，不单独覆盖 |

- **static 色阶**（77）：把 DSH 的 `neutral-bluish-00…1000`、`neutral-*`、`deepseek-*`、`blue-*`、`green/red/amber-*` 各自映射到 Everforest 对应色相当量。**不能按明度顺序一一对应**（两边步数不同）：以「最暗 = bg5、最亮 = bg0」为端点做分段线性插值，中间按目标色相的明度分布取档；4 个带 alpha 的 static（`green-500-a08/a12`、`red-400-a12`、`red-600-a08`）单独给 rgba。使所有 `var(--dsw-static-*)` 引用自动跟随。
- **alias / specific**（118）：74 条直接 static var + 5 条含 static 的 color-mix 自动跟随；**28 条字面量 + 5 条 alias 间引用**必须显式给值（见第 2 层）。
- 保底规则：任何没有显式映射、且不引用被覆盖 static 的 `--dsw-alias-*` 不覆盖（保持 DSH 值），避免误伤；在 `src/tokens.js` 顶部列出「未覆盖清单」，便于逐版本核对。

### 第 2 层：33 个字面量 alias（必须显式给值）

| 分类 | 例子 | 处理 |
|---|---|---|
| 边框透明度 | `border-l1/l2/l3/l4`、`border-l2-darkmode-thin`、`interactive-bg-hover*` | 用 `bg5` 的 alpha 重算（`color-mix` 或 8 位 hex），保持「边框 = bg5、hover 边框 = bg3」的 Enchanted 语义 |
| 反向边框 | `border-inverted`、`border-inverted2`（旧文档漏） | `bg5` alpha：浅色低透明度、深色约白 6% |
| 遮罩 | `bg-mask-1/2/3`、`bg-mask-photo`、`bg-mask-drop`、`bg-skeleton` | 保持黑色/白色高透明，仅按变体微调 |
| 菜单 / 浮层材质 | `menu-surface-fill`、`alias-menu-group-header-fill`、`button-tool-bar-*` | `bg2` + 45%–94% alpha，保持原不透明度语义 |
| diff | `file-diff-added/deleted-{bg,gutter,marker}`、`code-diff-*` | `bg_green` / `bg_red` 底，`green` / `red` 作 gutter 与标记 |
| 选区 | `bg-document-selection`（原生是 blue-500 40%） | `color-mix(in srgb, bg_visual 40%, transparent)`；light 用 `#DED8DB` 的 40% |
| 品牌 / 主按钮 | `brand-primary-new-color`、`label-primary-foreground`、`brand-text`、`button-primary-hover` / `-dimmed` | `header-aqua` + `bg0` 前景；hover 用 `header-blue` |
| 思考渐隐 | `linear-gradient-think`、`linear-think-select` | `bg0` → `bg1` 渐变（Windows 可见） |
| 首登页 | `onboarding-accent`、`gradient-onboarding-{violet,blue,cyan}-stops`、`onboarding-card-fill` / `secondary-fill` / `checkbox-border` | `header-*` / `bg1` / `bg2` 派生（7 个 token） |
| 其它 | `label-deep-diving*`、`label-shimmer`、`tooltip-key-bg` | 按语义取 accent / 半透明叠加 |

### 第 3 层：代码高亮（11 个）

`--shiki-token-constant / string / comment / keyword / parameter / function / string-expression / punctuation / link` 以及 `--shiki-foreground` / `--shiki-background`。映射沿用 Enchanted 的代码语义：

| shiki token | 取值 | Enchanted 对应 |
|---|---|---|
| `foreground` | `fg` | `--code-normal` |
| `background` | `bg_dim` | `--code-background` |
| `comment` | `grey1` | `--code-comment` |
| `punctuation` | `grey1` | `--code-punctuation` |
| `function` | `green` | `--code-function` |
| `keyword` | `blue` | `--code-keyword` |
| `parameter` | `orange` | `--code-operator` |
| `string` / `string-expression` | `yellow` | `--code-string` |
| `constant` | `purple` | `--code-value` |
| `link` | `header-blue` | 链接色 |

两套 scheme 各一份值。**11 个全部显式覆盖**（9 个 `--shiki-token-*` + `--shiki-background` + `--shiki-foreground`）：`shiki.css` 在 `:root` 声明 light 值，且 foreground/background 在 `:root` 引用 body 级 alias（级联上 guaranteed-invalid），不能依赖 alias 继承。`--dsw-alias-markdown-inline-code`（不属 shiki 层）也必须显式：DSH 把它用作 inline code 的 `background-color`，映射为 `bg_blue` 芯片表面并受对比度守卫（见上文「视觉走查修正」），不沿用 Enchanted 的 `--code-inline` 前景蓝。

### 焦点环与派生变量

`--dsw-focus-ring-color` 走 `--dsw-alias-state-business-primary`（DSH 默认蓝），所以映射 `state-business-*` 即自动换色；**不要覆盖 `--dsw-focus-ring-color` 本身**（pointer 模态靠它置 transparent 来消隐焦点环），也不要覆盖 `--dsw-focus-ring-width`。

## 5. 应用流程（伪代码）

```js
export const inject = ['theme']   // 模块导出的 cordis 注入；slots / locale 用 ctx.get 可选读取，缺失时用 ctx.inject 等待

const PACKAGE_ID = 'dsh-everforest'
const NS = 'settings.everforest'

export function apply(ctx) {
  let state = readState()
  let layerDispose = ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state))

  // overrideTokens 的 disposer 不会自动挂 fiber，必须自己注册清理
  ctx.effect(() => () => { layerDispose?.(); layerDispose = null }, 'everforest: token layer cleanup')

  // slots/locale 是可选服务：先在 apply 时立即读取（正常路径），
  // 拿不到再用 ctx.inject 等待它们出现后再挂载（两者都没有才跳过设置页）
  let settingsUiMounted = false
  const setupSettingsUi = () => {
    const locale = ctx.get('locale')
    const slots = ctx.get('slots')
    if (!locale || !slots || settingsUiMounted) return
    settingsUiMounted = true
    ctx.effect(() => locale.register(NS, { zh: zhDict, en: enDict }), 'everforest: dictionaries')
    const t = locale.bind(NS)
    slots.inject('settings.section', () => slots.register({
      name: 'settings.section', id: 'everforest', order: 25,
      label: () => t('nav.title'), locale: NS, inject: () => ({ t, store }),
    }, EverforestSection))
  }
  setupSettingsUi()
  if (!settingsUiMounted && typeof ctx.inject === 'function') ctx.inject(['slots', 'locale'], setupSettingsUi)

  function applyLayer() {
    // 同 source 调用 = 整体替换并重新置顶；旧 disposer 自动变 no-op
    layerDispose = ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state))
  }

  function select(scheme, strength) {
    state = { ...state, [scheme]: strength }
    writeState(state)
    applyLayer()
    // 已决策：点另一深浅色卡立即预览；会持久写 DSH 全局 Appearance 偏好（system → 固定）
    if (ctx.theme.getTheme().active.colorScheme !== scheme) ctx.theme.setTheme(scheme)
  }

  function setPreference(preference) {
    // 设置页外观控制：只接受 system / light / dark；写 DSH 同一份全局偏好
    if (!['system', 'light', 'dark'].includes(preference)) return
    ctx.theme.setTheme(preference)
  }
}
```

- 覆盖层在 client 半部物化时同步建立，不等待网络；Client 加载前的 loading 页 / 首帧由 Host 半部的 `index-inject` row 着色（见下「首帧注入」）。
- 页面内「当前」指示从 `ctx.theme.getTheme()` + 本地 `state` 推导（`active.colorScheme` 是 system 解析后的实际深浅色；`preference === 'system'` 时不要把它当成用户选择）；`theme/change` 只用于刷新指示（字号/字体变化也会触发，监听者必须幂等），不重建覆盖层。
- `slots` / `locale` 缺失时只降级设置页/文案，主题仍生效（`theme` 是唯一硬依赖）。实现为「`ctx.get` 立即挂载 + `ctx.inject(['slots','locale'])` 延迟等待」的混合策略：正常 profile 走立即路径（真机 registrant = `dsh-everforest`）；服务晚到则挂载回调补上；两者都不可用才跳过设置页并 console.warn。
- 所有注册走 `ctx.effect` / slot 的注入回调，插件停用时回到原生主题。

### 首帧注入（Host 半部，v0.2.0）

- **入口**：Host 半部 `apply(ctx)` 监听 `webserver/index-inject`，向表格追加一条 `{ kind: 'script', placement: 'body', text }`。同一张 rows 表有两个消费端：Web 由 `dsh-host-frontend-static` 在每次 index 渲染时调用 `webServer.renderIndex()` 写进 HTML；Desktop 由 `dsh-desktop-host` 在 Host ready 时 `collectIndexInjections()`，经 IPC（`DESKTOP_IPC.boot`）交给主进程、再由页面侧 boot 内核在加载插件 roster 之前应用。`webServer.tapIndex` 只是 raw HTML escape hatch，不是这条路径。
- **顺序**：ui-theme 用 `{ prepend: true }` 注册自己的 listener，所以它的 style/script rows 永远在前；本插件的 row 排在其后，脚本里能读到 `data-ds-theme-source`（已解析偏好）与 `data-ds-dark-theme`（实际 scheme）。
- **读什么**：scheme 取自 ui-theme 的 boot 属性（**不要**用裸 `prefers-color-scheme`，否则「固定浅色 + OS 深色」首帧会错）；强度读本浏览器 `localStorage['dsh-everforest/v1']`，校验 `version` 与两个 strength，失败回退默认配对。
- **写什么**：`BOOT_TOKENS` = `--dsw-alias-bg-base`、`--dsw-alias-label-primary/secondary/tertiary`、`--dsw-alias-markdown-code-block`、`--dsw-specific-sidebar-fill`。全部是 `tokensFor()` 也会输出的 token，所以 presenter 首次 apply 会用同名的 body 内联变量覆盖它们；**不要**用 `<style>` + `!important`（那会压过 presenter 的内联值，把配色冻在启动态）。
- **值从哪来**：Host 半部 import `src/tokens.js` / `src/palette.js` / `src/state.js`（普通 ESM、零依赖），在启动时用 `tokensFor()` 生成 6 个变体的值表，再拼成脚本文本；`package.json#files` 必须包含这些 `src` 运行时模块（见 §8）。测试 `tests/host-boot.test.mjs` 断言脚本写入值与 Client token 层逐项相等，防止两边漂移。
- **安全/健壮**：row 是纯 JSON 字符串（要过 IPC 与 HTML 文本），脚本文本里不能出现 `</script`；脚本包 try/catch（storage 被禁、`document.body` 不存在都不报错）；脚本文本不含用户输入。
- **残余**：Desktop 上窗口在 `loadURL` resolve 后才 `show()`，rows 由页面侧在 IPC 之后应用 → 理论上最多 1 帧原生色（2026-10-19 决策接受，需冷启动录屏实测）；loading 动效的 spinner / 边框仍是原生灰；插件停用后 row 要等 Host 重启 / 下次 index 渲染才消失（运行中的本页会保留最后一次注入的底色）。

## 6. 设置页

- **插槽**：`settings.section`（list），在 `ctx.slots.inject(...)` 回调内注册 `{ name: 'settings.section', id: 'everforest', order: 25, label: thunk, locale: NS, inject: () => ({ t }) }`；owner props 提供 `close`（本页不使用）。`label` thunk 每次投影重读，locale 切换不必重注册；`locale` / `inject` 面与 `dshmarket` 的注册方式一致。
- **布局**：
  - 标题「Everforest」+ 说明（深浅色由 DSH 的「外观」决定；可在此跟随系统或固定深浅色；再分别选择深色与浅色强度）。
  - 外观控制：`跟随系统` / `深色` / `浅色` 三个按钮（`role="group"` + `aria-pressed`，选中态用 token）；下方说明当前实际状态（跟随系统时显示 OS 解析后的深浅色，固定时显示固定的是哪一侧）。
  - `深色` 分组：3 张卡（Hard / Medium / Soft，默认 Soft），每张含 5 段色带（`bg0`、`bg1`、`bg2`、`fg`、`header-aqua`）。
  - `浅色` 分组：同上（默认 Hard）。
  - 当前生效行：「深色 Soft · 浅色 Hard」+ 当前实际 scheme（`active.colorScheme`；偏好为 `system` 时注明「跟随系统」）；右侧「恢复默认」（只恢复 Enchanted 默认配对，不改外观偏好）。
- **交互**：点击卡片 → 立即保存并应用；若该卡属于另一个 scheme，同时调用 `ctx.theme.setTheme(scheme)` 让用户马上看到效果（**已决策**）。外观控制的三个按钮调用 `ctx.theme.setTheme(preference)`（`system` 恢复跟随 OS，`light` / `dark` 固定）；它与 DSH 自带 Appearance 写的是同一份全局偏好（所有已认证浏览器共享），页面说明文案写清楚「点色卡会固定外观，可用外观控制恢复跟随系统」。
- **i18n**：命名空间 `settings.everforest`，内置 locale id 是 **`zh` / `en`**（`{ zh: zhDict, en: enDict }`；`zh-CN` 只是 `<html lang>` 的映射，不是注册键）；键：`nav.title`、`intro`、`appearance.title/label/system/dark/light/systemActive/fixed`、`group.dark`、`group.light`、`strength.hard/medium/soft`、`current.*`、`reset`、`hint.scheme`、`hint.storage`、`aria.*`。
- **样式**：全部用 `--dsw-alias-*` token；类名前缀 `.everforest-*`。**不能用 `styles.insert`**（那是模型动态 Cordis 包的闭包内建，npm 安装的 client bundle 没有）；在 factory 内创建 `<style>`，打 `data-plugin="dsh-everforest"` / `data-plugin-css` 标记，并在 `ctx.effect` 的 cleanup 里移除（照抄 ui-theme `installThemeStyles` 的写法；module 系统只会在物化期自动认领无标记 style，停用清理仍靠自己）。卡片外观参照 DSH 设置卡片（圆角、边框、hover、selected 用 token，不抄写死颜色）。
- **无障碍**：`aria-pressed`、键盘可达、`:focus-visible` 用 DSH 焦点环；色卡附文本标签，不只靠颜色区分。
- **降级**：`ctx.get('slots'/'locale')` 立即不可用时用 `ctx.inject` 等待再挂载；等待也不可用时跳过页面注册（主题仍生效），并在控制台留一条带前缀的警告。
- **已知限制**：`settings.section` 没有 `icon` 字段，第三方页在设置导航里显示 DSH 默认齿轮图标（要换图标只能像 `dshmarket` 那样用 DOM 标记 + MutationObserver 改写，0.x 不做）。

## 7. 持久化

| 项 | 方案 |
|---|---|
| 存储 | `localStorage['dsh-everforest/v1']`（JSON） |
| 读 | `apply` 时同步读；解析/校验失败回退 **DeepSeek 默认配对 `{ light:'hard', dark:'soft' }`**（与 §3.2 一致） |
| 写 | 只在用户选择时写；写入失败（隐私模式/配额）静默降级为会话内生效 |
| 范围 | 逐 origin 生效。**Desktop（Electron 窗口）origin 固定为 `dsh-app://app`（标准、安全协议），跨重启保持**；用浏览器打开 Host URL 时端口每次启动随机，localStorage 不跨重启（不同 origin 之间也不共享）。设置页文案说明「按浏览器 / 窗口保存」。 |
| 迁移 | **暂缓（2026-10-19 决定：Host 侧强度偏好先不做）**。路线留档：`ctx.configForms.get('<本插件 Host entry id>')`（源码已确认 DSH 的 settings / configForms 契约存在；第三方条目是否被 serve 需半天 spike），写入落 profile 的 `cordis.patch.yml`、异步读取会让主题晚于首帧（首帧现由 Host boot 注入覆盖，但迁移仍要实测）。将来若做：localStorage 降级为同步缓存，用旧 key 播种 Host，并处理 revision 冲突与不可写。 |

## 8. 清单与构建

```jsonc
// package.json（草案；2026-10-19 首帧注入后更新）
{
  "name": "dsh-everforest",
  "version": "0.2.0",
  "description": "Everforest color themes (6 palettes) for DeepSeek Harness Web/Desktop.",
  "type": "module",
  "license": "MIT",
  "author": "FormalistBlue",
  "repository": { "type": "git", "url": "git+https://github.com/FormalistBlue/dsh-everforest.git" },
  "homepage": "https://github.com/FormalistBlue/dsh-everforest#readme",
  "bugs": { "url": "https://github.com/FormalistBlue/dsh-everforest/issues" },
  "keywords": ["deepseek", "harness", "dsh", "dsh-plugin", "theme", "everforest"],
  "icon": "icon.svg",
  "engines": { "node": ">=20", "dsh": ">=0.2.1-rc.2 <0.3.0-0" },
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg",
    "./package.json": "./package.json"
  },
  "files": [
    "index.js", "client.js",
    "src/palette.js", "src/color.js", "src/tokens.js", "src/state.js",
    "cordis.patch.yml", "locale/*.json", "icon.svg", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"
  ],
  "dsh": {
    "manifestVersion": 1,
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-ui-theme", "@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-settings"]
    }
  }
}
```

```yaml
# cordis.patch.yml
- insert:
    - id: everforest
      name: dsh-everforest
```

- **无运行时依赖、无 peerDependencies**；`dsh.client.inject` 只影响**浏览器 bundle 的到达顺序**，不是服务注入——真正的服务门是模块导出 `export const inject = ['theme']`。`<pkg>/client` 与裸包名归一化到同一模块。
- **Host 半部不打包**：`index.js` 直接从包目录 import `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js`（普通 ESM、零依赖），所以这四个文件必须进 `files`；`scripts/build.mjs` 只产出 `client.js`。`tests/integration.test.mjs` 会遍历 Host 半部的相对 import，核对 `files` 覆盖它们。
- `dsh.client.immediately`：本版本只用于 **prefetch** bundle（前端 `manifest.plugins.filter(p => p.immediately)` 预取），不改变 apply 时机，减不了首帧；`platform: 'web'` 是必需字段，package 必须导出 `./client`。
- `scripts/build.mjs`：零依赖 Node，把 `src/*.js` 合成 `client.js` 并包成
  `window.__ModuleLoader__.load({ id: 'dsh-everforest', factory(require) { … } })`（id 必须等于包名）；产物提交入库，安装/运行不执行构建脚本（`prepack` 只在发布前构建）。
- **客户端入口文件名是 `src/client-entry.js`，不要改回 `src/index.js`**：npm 11 的 packlist 在根 `main` 为 `index.js` 且 `files` 含嵌套文件时，会把嵌套的 `src/index.js` 误打进 tarball（2026-10-19 实测；改名后 `npm pack` 只含白名单）。
- `tests/host-boot.test.mjs` 用 `node:vm` 执行 boot 脚本文本，断言它与 Client token 层同值、scheme 解析与回退分支正确；不依赖真机即可守住首帧不漂移。
- 调色板提取脚本（开发期可重复）：按 [`reference/palette.md`](reference/palette.md) 的表格生成 `src/palette.js`（6 套背景色阶 + 两套前景/强调/header 色；light `bg_visual` 使用注记的生效值 `#DED8DB`）。

## 9. 验证计划

| 步骤 | 通过标准 |
|---|---|
| 安装 | `plugin_manager.install_bundle` 返回 `application: applied`；Plugin Manager 显示标题/描述/图标 |
| 覆盖生效 | Client `Theme.listTokens` 出现本插件注册的覆盖 token 名（内置 14 个推荐 token + 动态注册/覆盖 token 都会列出）；`document.body.style.getPropertyValue('--dsw-alias-bg-base')` 等于当前调色板；**不要用首帧阶段 body 的字面背景色校验**（首帧由 Host boot row 写内联 token，Client 生效后 presenter 覆盖同名变量） |
| 设置页 | `Slots.listSubTree` 根 `settings.section` 出现 `id: everforest, order: 25`；页面可见、切换即时生效、中英文案随 locale 切换 |
| 持久化 | Desktop：选择 Hard → **退出应用并重新启动** → 仍是 Hard；清除 localStorage → 回到默认（深色 Soft / 浅色 Hard）。浏览器打开 Host URL 时不要求跨重启保持（端口随机），文案已说明 |
| 深浅色 | 用 DSH 自带 Appearance 或设置页外观控制切到 light/dark/system，主题自动使用对应调色板；`system` 下改 OS 深浅色应实时跟随（聊天区、设置页「当前」行、Windows 标题栏都要变）；点另一 scheme 色卡后 Appearance 偏好被改写（设计如此），可用设置页「跟随系统」恢复；点同侧色卡不得改偏好 |
| 代码高亮 | 三处代码块（聊天气泡 fenced code / 工具输出 / 右侧文件预览）的 token 色与块底正确；diff 的 add/del 底色与 marker 来自 `--dsw-alias-file-diff-*` / `code-diff-*`（diff 没有语法高亮，**不要**按 shiki 验收） |
| 聊天气泡 | 浅色（hard / medium）为 sage tint、light·soft 为近白抬起卡片，与画布边界 ≥ 1.10:1；深色保持 `bg1`；气泡内文字 4.5:1（2026-10-19 修正，见 §12 / `reference/contrast.md` §2d） |
| 停用 | 关闭插件 → 回到 DSH 原生配色，`body` 内联 `--dsw-*` 消失（验证 disposer 挂在 effect 上的清理）；重启 Host 后 boot row 消失 |
| 首帧 | Web：首屏 / loading 页即为 Everforest（DevTools 首帧截图，无 `#fff` / `#151517` 帧）；Desktop：完全退出应用后冷启动录屏，原生色 ≤ 1 帧（2026-10-19 接受）；loading 动效的灰 spinner / 边框仍原生（已知、不修） |
| 视觉走查 | 聊天区 / 代码块 / diff / 菜单 / 设置 / 侧栏 / composer / hover / 选中态 / 状态色；侧栏与内容卡边界（`sidebar-fill` ≠ `bg-base`，Windows 标题栏条同色）；记录已知缺口 |
| 发布 | `npm pack --dry-run` 文件清单齐全（`files` 与 `exports` 对齐）；`engines.dsh` 校验生效；包名 `dsh-everforest` 仍可用 |

**改动生效方式（开发循环）**：`client.js` 内容改动 → Plugins 页停用/启用该插件（Host 重新快照 bundle，浏览器经 HMR 换模块）或重启 Host；`package.json` / `cordis.patch.yml` 改动 → HMR 即时重组合；单纯刷新页面不会换 bundle 字节。

无浏览器控制能力时：自动项按上表验证，视觉项请用户目检并回传截图。

## 10. 里程碑与验收

| 版本 | 交付 | 验收 |
|---|---|---|
| 0.1.0 | 6 套调色板、覆盖层、设置页、持久化、本机可安装 | 上表前 7 项通过（安装 / 覆盖 / 设置页 / 持久化 / 深浅色 / 停用 / 首帧记录） |
| 0.2.0 | 对比度与全页走查、shiki / diff 口径与目检、i18n、图标、README 截图、**首帧 Host boot 注入**、系统跟随收尾、npm 发布 | 走查无阻断问题；Web 首帧即 Everforest，Desktop 冷启动原生色 ≤ 1 帧；npm 包可安装并生效；中英文案与图标经检查 |
| 0.3.0（暂缓） | Host 侧持久化（`configForms` 路线，先做半天 spike） | 跨浏览器一致；2026-10-19 决定先不做，条件见 §7 与 §11 #9 |

> **0.2.0 验收证据**：构建 / 单测（含 `tests/host-boot.test.mjs` 的首帧调色板一致性断言）/ 集成 / 对比度 / 安装 / 停用清理为自动化项；首帧目检（Web 首帧截图、Desktop 冷启动录屏）、三处代码块与 diff、全站视觉走查、系统跟随仍为人工目检项。

> **0.1.0 验收证据**：构建 / 单测 / 集成 / 对比度 / 安装 / 停用清理为自动化项，证据见 [`reference/contrast.md`](reference/contrast.md)、[`reference/token-inventory.md`](reference/token-inventory.md) 与测试套件；持久化跨重启、深浅色与 system 切换、首帧记录、全站视觉走查仍为人工目检项（交付时如实标注）。

## 11. 开放问题

1. DSH 的 token 集合是否随版本扩展（新增 alias 未覆盖时会保留原生色）——以 `src/tokens.js` 的未覆盖清单跟踪。
2. 设置页文案只做 `zh` / `en`（内置 locale id），其余语言回退英文；是否要随 DSH 语言包扩展再议。
3. 是否需要在 Appearance 行旁增加「Everforest」快捷入口（`settings.general.item`），还是只保留独立页面。
4. 非默认的 4 个变体沿用 Enchanted 的 `header-*` 常量值：若硬/软档的对比度检查不通过，需要按背景亮度做小幅修正，并回写 `docs/reference/palette.md`。
5. ~~侧栏是否要保留 Enchanted 的「平铺背景」~~ **已决策（2026-10-18 视觉走查）**：不保留 —— 侧栏改为 `bg0` → `bg1` 的 80% 混合 + 对比度守卫；平铺时 Windows 下侧栏 / 标题栏 / 内容卡同色，边界完全消失（并新增边界 ≥ 1.02:1 硬门槛）。
6. ~~冷启动首帧（loading 页 / 首帧底色是 Host 字面 CSS）是否接受；若要消除，需要评估首帧注入在 Electron `dsh-app://` 窗口是否可用~~ **已解决（2026-10-19）**：官方 `webserver/index-inject` 结构化 rows 同时服务 Web（`renderIndex`）与 Desktop（Host ready 时 `collectIndexInjections()` → `DESKTOP_IPC.boot` → 页面侧 boot 内核在插件 roster 前应用），与 `tapIndex` 无关；Host 半部追加一条 body script row 即可。Desktop 上窗口在 load 后才 show、rows 在页面侧 IPC 后应用，因此接受「最多 1 帧原生色」；loading 动效的灰 spinner / 边框仍原生。
7. 是否值得为设置导航项做自定义图标（`settings.section` 无 icon 字段；`dshmarket` 用 DOM 改写实现，0.x 先沿用默认齿轮）。
8. `--dsw-token` 自检策略：启动时读取若干关键 token 的 computed 值判断是否缺失/改名；缺失时降级（保留原生值）并 console.warn，是否要暴露到设置页「诊断」区。
9. Host 侧强度持久化何时重启：先做 `configForms` spike——确认第三方 Host entry 是否会出现在 `settings.describe()` / `ctx.configForms.get(entryId)`、写入是否落 profile `cordis.patch.yml`、跨浏览器事件是否实时；确认可行后再迁移（localStorage 降级为缓存）。
10. 首帧注入的降级边界：插件停用 / Client 半部加载失败时 boot 调色板保留到本页结束；是否需要在设置页暴露「首帧注入是否生效」诊断（读取 index 里是否存在本插件 row）——0.x 不做。

## 12. 2026-10-19 首帧注入实现记录（v0.2.0）

**决策（用户确认）**

| 项 | 结论 |
|---|---|
| shiki / diff 文档口径 | 接受修正：shiki 只覆盖**代码块**三处（聊天气泡 / 工具输出 / 文件预览）；diff 走 `--dsw-alias-file-diff-*` / `code-diff-*`，没有语法高亮 |
| Desktop 首帧 | 接受「最多 1 帧原生色」，不追求绝对 0 帧 |
| Host 侧偏好持久化 | **暂缓**，先不做（路线与 spike 条件见 §7 / §11 #9） |
| 点另一组色卡固定全局外观 | 保留现有 UX（`ctx.theme.setTheme(scheme)`），「跟随系统」按钮可恢复 |

**机制证据**（DSH 0.2.1-rc.2，安装包源码；抽取副本仅用于只读分析）

- `dsh-host-webserver`：结构化 row 类型 `IndexInjection`（`global` / `script` / `script-src` / `script-preload` / `style` / `html`，script/html 带 `placement: head | body`）；`collectIndexInjections()` 每次 emit `webserver/index-inject`，`renderIndex()` 先渲染 rows 再跑 `tapIndex`。运行时 inspect 的 Host Event 契约与此一致。
- `dsh-host-frontend-static`：Web 的 index 响应调用 `ctx.webServer.renderIndex(...)`。
- `dsh-desktop-host`：Host ready 时把 `ctx.webServer.collectIndexInjections()` 随 `ready` IPC 发给 Electron 主进程；主进程经 `DESKTOP_IPC.boot` 交给页面。
- `dsh-web-frontend`：页面 boot 内核把 `style` rows append 到 `<head>`、`script` rows 作为 inline script 依次执行（`placement` 决定 head/body），全部在 `__DSH_BOOT_READY__` resolve、插件 roster 加载之前。主窗口在 `loadURL` resolve 后才 `show()`。
- `dsh-client-ui-theme`：Host 半部用 `{ prepend: true }` 推 boot rows——head style 写 `:root{color-scheme}` + `body{background-color:#fff/#151517;--dsh-boot-bg}`，body script 写 `data-ds-theme-source` / `data-ds-dark-theme`。boot 页 CSS 用 `var(--dsw-alias-bg-base, var(--dsh-boot-bg, Canvas))` 与 `var(--dsw-alias-label-*, var(--dsh-boot-label-*))`。
- `dsh-client-ui-layout` 的 `ThemePresenter` 与 Windows preload 的 caption 探针：presenter 用 body 内联变量落地 token；探针读 `--dsw-specific-sidebar-fill` / `--dsw-alias-label-primary`，并监听 body 属性/style 变化后通过 `windowsAppearance` IPC 更新原生标题栏（OS 翻转时也会重跑）。

**实现**

- `index.js`（Host 半部）：`ctx.on('webserver/index-inject', table => table.push({ kind: 'script', placement: 'body', text }))`；`createBootScript()` 从 `tokensFor()` 生成 6 变体的值表（`BOOT_TOKENS` 6 个 token），脚本文本读 ui-theme 解析后的 scheme + localStorage 强度并写 body 内联变量。
- `tests/host-boot.test.mjs`：row 形状 / JSON 安全 / 无 `!important` / 全部 6×6 组合与 `tokensFor()` 同值 / 默认与损坏存储回退 / 固定深浅色 + 相反 OS / ui-theme 缺失回退 / storage 抛错 / 幂等。
- `package.json`：版本 0.2.0；`files` 增加 Host 半部运行时 import 的 `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js`（集成测试遍历 import 核对）。
- README（中英）与 `assessment.md` 更新首帧/代码高亮口径；`src/tokens.js` 顶部注释同步。

### 2026-10-19 视觉修正（聊天气泡）

- **问题**：用户消息气泡 `--dsw-specific-bubble` 旧映射 `surface(p, 1)`，light 下 `#FDFAEE` 对画布 `#FFFBEF` 仅 1.02:1；用户报告「浅色模式下聊天气泡和背景融为一体，区分不出来」。DSH native light 气泡是 `static-deepseek-50` 冷色 tint（≈1.08），不是中性色阶。
- **做法**：light 改为 `mix(bg0, header-aqua, 16%)` 的 sage 纸面，经 **向白** 的 `readableToward` 守卫（不能向暖色 bg0 回退，否则 tint 消失）。light·hard / medium 边界 1.17 / 1.14、气泡文字 4.61 / 4.53；light·soft 的 `bg0` 已只有 4.66:1 文本余量，不能压暗，改用近白冷调「抬起卡片」（`#ffffff` + 4% `header-aqua`，边界 1.15、文字 5.37）；两个方向由代码按实际边界对比度自动择大。dark 保持 `bg1`（1.15–1.16）。
- **验收**：新增硬门槛「气泡 vs `bg-base` ≥ 1.10:1（6 档）」+ 既有文本承载表面 4.5:1；单测固定在 `tests/tokens.test.mjs`，报告见 [`reference/contrast.md`](reference/contrast.md) §2d / §6.8。
- **未动**：`--dsw-specific-bubble-highlight`（当前 chat 未使用，保持 `surface(p, 2)`）。

**残余与人工项**：Web 首帧截图、Desktop 冷启动录屏（≤1 帧）、三处代码块与 diff 目检、系统跟随全链路走查（OS 切换 / DSH Appearance / 插件按钮 / Windows 标题栏）、浅色气泡在 light·soft 下的目检，见 §9。Desktop 的欢迎 / 登录窗口是 shell 自己的文档（`dsh-app://shell/...`），只跟随 light/dark，不走 `index-inject`，0.x 不覆盖（可接受边界）。
